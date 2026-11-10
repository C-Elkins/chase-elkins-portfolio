import { cryptoAvailable, hexBytes, compareHashes, generateStudioKey, encryptMessage, decryptMessage, tamperEnvelope } from "./crypto-model.mjs";

export function initializeCryptoStudio() {
    const $ = id => document.getElementById(id);
    const supported = cryptoAvailable();
    let hashVersion = 0;
    let cipherVersion = 0;
    let key = null;
    let envelope = null;
    let hashBusy = false;
    let cipherBusy = false;
    const setStatus = (id, message, error = false) => {
        $(id).textContent = message;
        $(id).classList.toggle("error", error);
    };
    const controls = () => {
        $("hash-compare").disabled = !supported || hashBusy;
        $("crypto-generate").disabled = !supported || cipherBusy;
        $("crypto-encrypt").disabled = !supported || cipherBusy || !key;
        for (const id of ["crypto-decrypt", "crypto-tamper", "crypto-wrong-key"]) $(id).disabled = !supported || cipherBusy || !envelope || !key;
        $("crypto-key-state").textContent = cipherBusy ? "Operation in progress" : key ? "AES-256 session key ready / non-exportable" : "No session key yet";
    };
    const pipeline = state => {
        document.querySelectorAll("[data-crypto-stage]").forEach(element => {
            const stage = element.dataset.cryptoStage;
            element.classList.toggle("crypto-stage-active", stage === state);
            if (stage === state) element.setAttribute("aria-current", "step");
            else element.removeAttribute("aria-current");
        });
    };
    const clearHashes = () => {
        hashVersion++; hashBusy = false;
        $("hash-a-output").textContent = "Not calculated";
        $("hash-b-output").textContent = "Not calculated";
        $("hash-bits").replaceChildren();
        $("hash-bits").setAttribute("aria-label", "No hash comparison calculated");
        $("hash-distance").textContent = "— / 256 bits";
        $("hash-percent").textContent = "—";
        $("hash-input-sizes").textContent = "Choose two messages and compare.";
        controls();
    };
    const clearCiphertext = () => {
        cipherVersion++; cipherBusy = false; envelope = null;
        $("crypto-nonce").textContent = "Created freshly for each encryption";
        $("crypto-ciphertext").textContent = "No ciphertext yet";
        $("crypto-tag").textContent = "No authentication tag yet";
        $("crypto-sizes").textContent = "No encrypted message yet";
        $("crypto-restored").textContent = "No message decrypted";
        pipeline(key ? "key" : "input");
        controls();
    };
    $("hash-compare").addEventListener("click", async () => {
        clearHashes();
        const version = hashVersion;
        hashBusy = true; controls();
        setStatus("hash-status", "Calculating two SHA-256 digests locally…");
        try {
            const result = await compareHashes($("hash-a").value, $("hash-b").value);
            if (version !== hashVersion) return;
            $("hash-a-output").textContent = hexBytes(result.hashA);
            $("hash-b-output").textContent = hexBytes(result.hashB);
            $("hash-distance").textContent = `${result.changedBits} / 256 bits`;
            $("hash-percent").textContent = `${(result.changedBits / 256 * 100).toFixed(1)}%`;
            $("hash-input-sizes").textContent = `A: ${result.bytesA} UTF-8 bytes / B: ${result.bytesB} UTF-8 bytes. Each SHA-256 output is 32 bytes (64 hex characters).`;
            const cells = [];
            for (let byte = 0; byte < 32; byte++) {
                for (let bit = 7; bit >= 0; bit--) {
                    const a = result.hashA[byte] >>> bit & 1;
                    const b = result.hashB[byte] >>> bit & 1;
                    const cell = document.createElement("span");
                    cell.className = a === b ? "hash-bit" : "hash-bit hash-bit-changed";
                    cell.textContent = b;
                    cell.title = `Bit ${byte * 8 + 7 - bit}: A=${a}, B=${b}`;
                    cells.push(cell);
                }
            }
            $("hash-bits").replaceChildren(...cells);
            $("hash-bits").setAttribute("aria-label", `${result.changedBits} of 256 hash bits differ. The visible bits belong to message B.`);
            setStatus("hash-status", result.changedBits === 0
                ? "The digests match. Identical encoded bytes always produce the same SHA-256 digest; a matching digest is not proof of who sent the message."
                : "Different digests. A small input change can alter many output bits—the avalanche effect. About half is typical across many comparisons, not a rule for every pair.");
        } catch (error) {
            if (version === hashVersion) setStatus("hash-status", `Hash comparison failed: ${error.message}`, true);
        } finally {
            if (version === hashVersion) { hashBusy = false; controls(); }
        }
    });
    for (const id of ["hash-a", "hash-b"]) {
        $(id).addEventListener("input", () => { clearHashes(); setStatus("hash-status", "Message changed. Compare again to see fresh results."); });
    }
    $("hash-identical").addEventListener("click", () => {
        $("hash-b").value = $("hash-a").value;
        clearHashes(); setStatus("hash-status", "B now matches A. Compare to see that hashing is deterministic.");
    });
    $("hash-example").addEventListener("click", () => {
        $("hash-a").value = "Hello, network!";
        $("hash-b").value = "hello, network!";
        clearHashes(); setStatus("hash-status", "Only the first character differs. Compare the hashes.");
    });
    $("crypto-message").addEventListener("input", () => {
        clearCiphertext();
        setStatus("crypto-status", "Message changed. Previous ciphertext discarded; generate a key if needed, then encrypt this message.");
    });
    $("crypto-generate").addEventListener("click", async () => {
        key = null; clearCiphertext();
        const version = cipherVersion;
        cipherBusy = true; controls();
        setStatus("crypto-status", "Generating an AES-256 key with the browser's cryptographic random generator…");
        try {
            const generated = await generateStudioKey();
            if (version !== cipherVersion) return;
            key = generated; pipeline("key");
            setStatus("crypto-status", "New non-exportable session key ready. The old key and ciphertext are no longer retained by this lab. Next: Encrypt.");
        } catch (error) {
            if (version === cipherVersion) setStatus("crypto-status", `Key generation failed: ${error.message}`, true);
        } finally {
            if (version === cipherVersion) { cipherBusy = false; controls(); }
        }
    });
    $("crypto-encrypt").addEventListener("click", async () => {
        clearCiphertext();
        const version = cipherVersion;
        cipherBusy = true; controls();
        setStatus("crypto-status", "Encrypting with AES-GCM and a fresh random 96-bit nonce…");
        try {
            const result = await encryptMessage(key, $("crypto-message").value);
            if (version !== cipherVersion) return;
            envelope = result;
            const payload = result.ciphertext.slice(0, -16);
            $("crypto-nonce").textContent = hexBytes(result.iv);
            $("crypto-ciphertext").textContent = payload.length
                ? `${hexBytes(payload.slice(0, 96))}${payload.length > 96 ? "… (first 96 ciphertext bytes shown)" : ""}`
                : "(empty plaintext: no encrypted payload bytes, but a valid authentication tag)";
            $("crypto-tag").textContent = hexBytes(result.ciphertext.slice(-16));
            $("crypto-sizes").textContent = `${result.originalSize} plaintext bytes → ${payload.length} ciphertext bytes + 16-byte authentication tag + 12-byte nonce = ${result.ciphertext.length + 12} bytes. Hex is a display encoding: two characters represent one byte.`;
            pipeline("sealed");
            setStatus("crypto-status", "Encrypted. Decrypt to recover the original, or test a changed byte and a different key. Encrypt again: a fresh nonce makes the result different even for the same message and key.");
        } catch (error) {
            if (version === cipherVersion) setStatus("crypto-status", `Encryption failed: ${error.message}`, true);
        } finally {
            if (version === cipherVersion) { cipherBusy = false; controls(); }
        }
    });
    const tryDecryption = async mode => {
        const version = ++cipherVersion;
        const currentEnvelope = envelope;
        const currentKey = key;
        cipherBusy = true; controls();
        $("crypto-restored").textContent = "No verified plaintext for this attempt";
        setStatus("crypto-status", mode === "original" ? "Verifying the authentication tag before releasing plaintext…"
            : mode === "tamper" ? "Flipping one bit in a copy of the ciphertext, then attempting decryption…" : "Generating a separate key and attempting decryption…");
        let attempted = false;
        try {
            const testKey = mode === "wrong-key" ? await generateStudioKey() : currentKey;
            if (version !== cipherVersion) return;
            const testEnvelope = mode === "tamper" ? tamperEnvelope(currentEnvelope) : currentEnvelope;
            attempted = true;
            const restored = await decryptMessage(testKey, testEnvelope);
            if (version !== cipherVersion) return;
            if (mode !== "original") {
                pipeline("rejected");
                setStatus("crypto-status", "Unexpected result: the altered-input test passed authentication. Clear the studio before trying again.", true);
                return;
            }
            $("crypto-restored").textContent = restored || "(empty message)";
            pipeline("verified");
            setStatus("crypto-status", "Authentication passed. The original UTF-8 message was recovered exactly. This verifies the key and data together—not a person's identity.");
        } catch (error) {
            if (version !== cipherVersion) return;
            pipeline("rejected");
            if (mode !== "original" && attempted && error.name === "OperationError") {
                setStatus("crypto-status", mode === "tamper"
                    ? "Rejected as expected: one altered bit makes authentication fail. No plaintext was released. The original ciphertext is unchanged; Decrypt original still works."
                    : "Rejected as expected: a different key cannot authenticate this message. No plaintext was released. Your original session key is unchanged.", true);
            } else setStatus("crypto-status", `Decryption failed: ${error.message || error.name}. No verified plaintext was released.`, true);
        } finally {
            if (version === cipherVersion) { cipherBusy = false; controls(); }
        }
    };
    $("crypto-decrypt").addEventListener("click", () => tryDecryption("original"));
    $("crypto-tamper").addEventListener("click", () => tryDecryption("tamper"));
    $("crypto-wrong-key").addEventListener("click", () => tryDecryption("wrong-key"));
    const clearStudio = () => {
        key = null;
        $("hash-a").value = ""; $("hash-b").value = ""; $("crypto-message").value = "";
        clearHashes(); clearCiphertext();
        setStatus("hash-status", "Inputs and results cleared.");
        setStatus("crypto-status", "Session key, inputs, and results discarded. A new key is required. This is not a guarantee of secure memory erasure.");
    };
    $("crypto-clear").addEventListener("click", clearStudio);
    window.addEventListener("pagehide", clearStudio);
    $("crypto-support").textContent = supported
        ? "Web Crypto available / SHA-256 + AES-256-GCM / no third-party cryptography"
        : "Web Crypto is unavailable. Open this page over HTTPS (or localhost) in a supported browser. The explanations remain readable; crypto actions are disabled.";
    $("crypto-support").classList.toggle("error", !supported);
    controls();
}
