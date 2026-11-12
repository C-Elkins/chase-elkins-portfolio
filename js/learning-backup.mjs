export const MAX_BACKUP_TEXT = 2_800_000;
const MAX_SNAPSHOT_BYTES = 2_000_000;
const PREFIX = "PL1.";
const FORMAT = "portfolio-learning-backup";
const VERSION = 1;
const encoder = new TextEncoder();

function bytesToBase64(bytes) {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 16384) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 16384));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(value) {
    if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new TypeError("The recovery code contains invalid characters or is truncated.");
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    let binary;
    try { binary = atob(padded); } catch { throw new TypeError("The recovery code could not be decoded."); }
    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function checksum(text) {
    if (!globalThis.crypto?.subtle) throw new Error("Backup checksums require Web Crypto in a secure context (HTTPS or localhost).");
    const digest = await globalThis.crypto.subtle.digest("SHA-256", encoder.encode(text));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function makeRecoveryCode(snapshot) {
    const payload = JSON.stringify(snapshot);
    if (encoder.encode(payload).length > MAX_SNAPSHOT_BYTES) throw new RangeError("This progress snapshot is too large to export.");
    const envelope = { format: FORMAT, version: VERSION, checksum: await checksum(payload), snapshot };
    const code = PREFIX + bytesToBase64(encoder.encode(JSON.stringify(envelope)));
    if (code.length > MAX_BACKUP_TEXT) throw new RangeError("This progress snapshot is too large to export.");
    return code;
}

export async function readRecoveryCode(input, validateSnapshot) {
    if (typeof input !== "string" || input.length > MAX_BACKUP_TEXT) throw new RangeError("The backup is empty or exceeds the size limit.");
    const code = input.trim();
    if (!code.startsWith(PREFIX) || code.length === PREFIX.length) throw new TypeError("This is not a supported recovery code.");
    let envelope;
    try {
        const bytes = base64ToBytes(code.slice(PREFIX.length));
        if (bytes.length > MAX_SNAPSHOT_BYTES + 1024) throw new RangeError("The backup exceeds the size limit.");
        envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch (error) {
        if (error instanceof RangeError || /recovery code/i.test(error.message)) throw error;
        throw new TypeError("The backup is damaged or is not valid UTF-8/JSON.");
    }
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
        Object.keys(envelope).some(key => !["format", "version", "checksum", "snapshot"].includes(key)) ||
        envelope.format !== FORMAT || envelope.version !== VERSION ||
        typeof envelope.checksum !== "string" || !/^[0-9a-f]{64}$/.test(envelope.checksum) ||
        !Object.hasOwn(envelope, "snapshot")) {
        throw new TypeError("The backup format or version is unsupported.");
    }
    const payload = JSON.stringify(envelope.snapshot);
    if (encoder.encode(payload).length > MAX_SNAPSHOT_BYTES) throw new RangeError("The backup exceeds the size limit.");
    if (await checksum(payload) !== envelope.checksum) throw new TypeError("The backup checksum does not match. The code or file may be damaged.");
    return validateSnapshot(envelope.snapshot);
}
