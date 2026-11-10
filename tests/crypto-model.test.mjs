import { cryptoAvailable, messageBytes, hexBytes, compareHashes, generateStudioKey, encryptMessage, decryptMessage, tamperEnvelope, MAX_CRYPTO_CHARACTERS } from "../js/crypto-model.mjs";

export async function runCryptoTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    const rejects = async (operation, label, name) => {
        let error;
        try { await operation(); } catch (caught) { error = caught; }
        assert(!!error && (!name || error.name === name), label);
    };
    assert(cryptoAvailable(), "Tests require browser-native Web Crypto on HTTPS or localhost");
    const vector = await compareHashes("abc", "");
    assert(hexBytes(vector.hashA) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 matches published abc vector");
    assert(hexBytes(vector.hashB) === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "SHA-256 matches empty-input vector");
    assert(vector.hashA.length === 32 && vector.hashB.length === 32, "SHA-256 is fixed at 32 bytes");
    const identical = await compareHashes("same", "same");
    assert(identical.changedBits === 0, "Identical input has zero differing bits");
    const changed = await compareHashes("Hello, network!", "hello, network!");
    assert(changed.changedBits > 0 && changed.changedBits <= 256, "One-character edit changes digest");
    const bitCount = Array.from(changed.hashA, (byte, i) => (byte ^ changed.hashB[i]).toString(2).replaceAll("0", "").length).reduce((a, b) => a + b, 0);
    assert(changed.changedBits === bitCount, "Hamming distance counts differing bits exactly");
    assert(messageBytes("é🖥").length === 6, "Messages count encoded UTF-8 bytes, not visible characters");
    const unicode = await compareHashes("é", "e\u0301");
    assert(unicode.changedBits > 0, "Unicode is not silently normalized");
    for (const invalid of [null, 42, "a".repeat(MAX_CRYPTO_CHARACTERS + 1), "\ud800", "\udfff"]) {
        await rejects(() => compareHashes(invalid, ""), "Invalid hash input is explicitly rejected");
    }
    const key = await generateStudioKey();
    assert(key.algorithm.name === "AES-GCM" && key.algorithm.length === 256, "Generated key uses AES-256-GCM");
    assert(key.extractable === false && key.type === "secret", "Session key is secret and non-exportable");
    assert(key.usages.includes("encrypt") && key.usages.includes("decrypt"), "Key is scoped to encrypt/decrypt");
    await rejects(() => crypto.subtle.exportKey("raw", key), "Session key cannot be exported", "InvalidAccessError");
    const wrongKey = await generateStudioKey();
    for (const text of ["", "Hello, network!", "café / 🖥 / e\u0301", "\ufeffPreserve this BOM", "<script>literal & safe</script>", "\u0000binary-like\u0000", "x".repeat(4096)]) {
        const sealed = await encryptMessage(key, text);
        assert(sealed.iv.length === 12, "Nonce is exactly 96 bits");
        assert(sealed.ciphertext.length === messageBytes(text).length + 16, "Ciphertext includes exact 128-bit tag overhead");
        assert(sealed.originalSize === messageBytes(text).length, "Plaintext byte count is exact");
        assert(await decryptMessage(key, sealed) === text, "Authenticated UTF-8 round-trip is exact");
        const untouched = hexBytes(sealed.ciphertext);
        const altered = tamperEnvelope(sealed);
        assert(hexBytes(altered.ciphertext) !== untouched && hexBytes(sealed.ciphertext) === untouched, "Tampering changes a copy, not original");
        await rejects(() => decryptMessage(key, altered), "One-bit alteration fails authentication", "OperationError");
        await rejects(() => decryptMessage(wrongKey, sealed), "Different key fails authentication", "OperationError");
        assert(await decryptMessage(key, sealed) === text, "Failed experiments preserve original key and ciphertext");
    }
    const first = await encryptMessage(key, "same message");
    const second = await encryptMessage(key, "same message");
    assert(hexBytes(first.iv) !== hexBytes(second.iv), "Repeated encryption samples a fresh nonce");
    assert(hexBytes(first.ciphertext) !== hexBytes(second.ciphertext), "Same input/key produce different ciphertext with fresh nonces");
    const badNonce = { ...first, iv: first.iv.slice() };
    badNonce.iv[0] ^= 1;
    await rejects(() => decryptMessage(key, badNonce), "Modified nonce fails authentication", "OperationError");
    const badTag = { ...first, ciphertext: first.ciphertext.slice() };
    badTag.ciphertext[badTag.ciphertext.length - 1] ^= 1;
    await rejects(() => decryptMessage(key, badTag), "Modified tag fails authentication", "OperationError");
    for (const invalid of [null, {}, { iv: new Uint8Array(11), ciphertext: new Uint8Array(16) }, { iv: new Uint8Array(12), ciphertext: new Uint8Array(15) }, { iv: new Uint8Array(12), ciphertext: new Uint8Array(16401) }]) {
        await rejects(() => decryptMessage(key, invalid), "Invalid ciphertext envelope rejected before native decryption");
    }
    await rejects(() => encryptMessage(key, "x".repeat(4097)), "Encryption enforces message bounds");
    const zeroKey = await crypto.subtle.importKey("raw", new Uint8Array(32), { name: "AES-GCM" }, false, ["decrypt"]);
    const knownTag = Uint8Array.from("530f8afbc74536b9a963b4f1c4cb738b".match(/../g), pair => parseInt(pair, 16));
    assert(await decryptMessage(zeroKey, { iv: new Uint8Array(12), ciphertext: knownTag }) === "", "AES-256-GCM decrypts the standard zero-key empty-message test vector");
    return { passed, message: `${passed} cryptography assertions passed.` };
}

if (typeof document === "undefined") console.log(await runCryptoTests());
