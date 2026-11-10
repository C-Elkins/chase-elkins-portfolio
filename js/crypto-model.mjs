export const MAX_CRYPTO_CHARACTERS = 4096;
export const MAX_CRYPTO_BYTES = 16384;

export function cryptoAvailable() {
    return globalThis.isSecureContext !== false && !!globalThis.crypto?.subtle && typeof globalThis.crypto?.getRandomValues === "function";
}

function subtle() {
    if (!cryptoAvailable()) throw new Error("Web Crypto needs a supported browser and HTTPS (or localhost).");
    return globalThis.crypto.subtle;
}

export function messageBytes(text) {
    if (typeof text !== "string" || text.length > MAX_CRYPTO_CHARACTERS) throw new Error("Use at most 4,096 UTF-16 code units in each message.");
    const bytes = new TextEncoder().encode(text);
    if (bytes.length > MAX_CRYPTO_BYTES) throw new Error("Messages must be no larger than 16,384 UTF-8 bytes.");
    if (new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes) !== text) throw new Error("The message contains an incomplete Unicode character. Remove it before continuing.");
    return bytes;
}

export function hexBytes(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function compareHashes(first, second) {
    const a = messageBytes(first);
    const b = messageBytes(second);
    const api = subtle();
    const [digestA, digestB] = await Promise.all([
        api.digest("SHA-256", a), api.digest("SHA-256", b)
    ]);
    const hashA = new Uint8Array(digestA);
    const hashB = new Uint8Array(digestB);
    let changedBits = 0;
    for (let i = 0; i < hashA.length; i++) {
        let difference = hashA[i] ^ hashB[i];
        while (difference) { changedBits += difference & 1; difference >>>= 1; }
    }
    return { hashA, hashB, changedBits, bytesA: a.length, bytesB: b.length };
}

export async function generateStudioKey() {
    return subtle().generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptMessage(key, text) {
    const bytes = messageBytes(text);
    const api = subtle();
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(await api.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, bytes));
    return { iv, ciphertext, originalSize: bytes.length };
}

export async function decryptMessage(key, envelope) {
    if (!(envelope?.iv instanceof Uint8Array) || envelope.iv.length !== 12
        || !(envelope.ciphertext instanceof Uint8Array) || envelope.ciphertext.length < 16
        || envelope.ciphertext.length > MAX_CRYPTO_BYTES + 16) {
        throw new Error("The encrypted message needs a 12-byte nonce and a bounded ciphertext with its 16-byte tag.");
    }
    const plaintext = await subtle().decrypt({ name: "AES-GCM", iv: envelope.iv, tagLength: 128 }, key, envelope.ciphertext);
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(plaintext);
}

export function tamperEnvelope(envelope) {
    const ciphertext = envelope.ciphertext.slice();
    ciphertext[0] ^= 1;
    return { ...envelope, iv: envelope.iv.slice(), ciphertext };
}
