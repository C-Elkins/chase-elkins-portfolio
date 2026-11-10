import { supportsDeflateRaw } from "./compression-model.mjs";

function checkBytes(bytes, limit = 4096) {
    if (!(bytes instanceof Uint8Array) || bytes.length > limit) throw new Error(`Use up to ${limit} bytes for this lesson.`);
}

export function dataSample(kind) {
    let bytes;
    let description;
    let image = false;
    if (kind === "pixels") {
        image = true;
        bytes = Uint8Array.from({ length: 1024 }, (_, i) => (Math.floor(i / 32 / 8) + Math.floor(i % 32 / 8)) % 2 ? 220 : 40);
        description = "A 32 × 32 grayscale image: one byte per pixel (0 = black, 255 = white). This is raw pixel data, not a PNG or JPEG file. Large same-color areas and repeated rows are predictable.";
    } else if (kind === "pcm") {
        bytes = new Uint8Array(1024);
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < 512; i++) view.setInt16(i * 2, Math.round(Math.sin(i * 2 * Math.PI / 32) * 12000), true);
        description = "512 raw mono audio samples, 16 bits each, little-endian: 1,024 bytes. A repeating sine wave is predictable; realistic recordings contain noise. This is PCM data, not an MP3, and nothing is played.";
    } else if (kind === "logs") {
        bytes = new TextEncoder().encode(Array.from({ length: 24 }, (_, i) => `09:${String(i).padStart(2, "0")} INFO device=router event=connected status=ok\n`).join(""));
        description = "UTF-8 log records contain repeated field names and values. Their bytes encode characters, but the compressor only sees byte sequences, not words or their meaning.";
    } else if (kind === "pattern") {
        bytes = Uint8Array.from({ length: 1024 }, (_, i) => [0, 64, 128, 255][i % 4]);
        description = "A four-byte binary pattern repeated 256 times. There are no adjacent duplicate bytes, so RLE grows, but a dictionary compressor can reference earlier sequences.";
    } else if (kind === "noise") {
        let seed = 0x12345678;
        bytes = Uint8Array.from({ length: 1024 }, () => {
            seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
            return seed >>> 24;
        });
        description = "1,024 deterministic pseudorandom bytes for a repeatable comparison, not cryptographic random data. Few useful patterns exist. Compressed or encrypted files often also look irregular, but appearance alone cannot identify encryption.";
    } else throw new Error("Choose a supported data sample.");
    return { kind, bytes, description, image };
}

export function runLengthSize(bytes) {
    checkBytes(bytes);
    let pairs = 0;
    for (let i = 0; i < bytes.length;) {
        let count = 1;
        while (count < 255 && i + count < bytes.length && bytes[i + count] === bytes[i]) count++;
        pairs++; i += count;
    }
    return pairs * 2;
}

export function huffmanLesson(bytes) {
    checkBytes(bytes);
    const counts = new Map();
    for (const byte of bytes) counts.set(byte, (counts.get(byte) || 0) + 1);
    const queue = [...counts].map(([value, count]) => ({ value, count, order: value }));
    let order = 256;
    while (queue.length > 1) {
        queue.sort((a, b) => a.count - b.count || a.order - b.order);
        const left = queue.shift();
        const right = queue.shift();
        queue.push({ count: left.count + right.count, left, right, order: order++ });
    }
    const codes = new Map();
    const visit = (node, prefix) => {
        if (node.value !== undefined) codes.set(node.value, prefix || "0");
        else { visit(node.left, prefix + "0"); visit(node.right, prefix + "1"); }
    };
    if (queue.length) visit(queue[0], "");
    const rows = [...counts].map(([value, count]) => ({ value, count, code: codes.get(value) }))
        .sort((a, b) => b.count - a.count || a.value - b.value);
    return {
        rows,
        bits: rows.reduce((total, row) => total + row.count * row.code.length, 0),
        bitstream: Array.from(bytes.slice(0, 16), byte => codes.get(byte)).join(" ")
    };
}

// A small LZ-style lesson, not a DEFLATE encoder: 64-byte history, 3–34-byte matches.
export function dictionaryTokens(bytes) {
    checkBytes(bytes, 256);
    const tokens = [];
    for (let cursor = 0; cursor < bytes.length;) {
        let distance = 0;
        let length = 0;
        for (let back = 1; back <= Math.min(cursor, 64); back++) {
            let matched = 0;
            while (matched < 34 && cursor + matched < bytes.length && bytes[cursor + matched] === bytes[cursor - back + matched]) matched++;
            if (matched >= 3 && matched > length) { distance = back; length = matched; }
        }
        if (length >= 3) {
            tokens.push({ type: "reference", start: cursor, length, distance, bits: 12 });
            cursor += length;
        } else {
            tokens.push({ type: "literal", start: cursor, length: 1, value: bytes[cursor], bits: 9 });
            cursor++;
        }
    }
    return tokens;
}

export function restoreDictionary(tokens) {
    if (!Array.isArray(tokens) || tokens.length > 256) throw new Error("Invalid dictionary lesson.");
    const bytes = [];
    for (const token of tokens) {
        if (token.type === "literal" && Number.isInteger(token.value) && token.value >= 0 && token.value <= 255) bytes.push(token.value);
        else if (token.type === "reference" && Number.isInteger(token.distance) && token.distance > 0 && token.distance <= Math.min(bytes.length, 64)
            && Number.isInteger(token.length) && token.length >= 3 && token.length <= 34) {
            for (let i = 0; i < token.length; i++) bytes.push(bytes[bytes.length - token.distance]);
        } else throw new Error("Invalid dictionary token.");
        if (bytes.length > 256) throw new Error("Dictionary lesson exceeds 256 bytes.");
    }

    return new Uint8Array(bytes);
}

export async function compareData(bytes) {
    checkBytes(bytes);
    let deflateSize = null;
    if (supportsDeflateRaw()) {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
        deflateSize = (await new Response(stream).arrayBuffer()).byteLength;
    }
    return { originalSize: bytes.length, rleSize: runLengthSize(bytes), deflateSize };
}
