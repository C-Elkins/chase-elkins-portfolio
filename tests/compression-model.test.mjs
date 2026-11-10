import { byteRuns, crc32, archiveNames, validateArchiveFiles, buildZip, supportsDeflateRaw } from "../js/compression-model.mjs";

export async function runCompressionTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    const encoder = new TextEncoder();
    assert(crc32(encoder.encode("123456789")) === 0xcbf43926, "CRC-32 matches standard reference vector");
    assert(crc32(new Uint8Array()) === 0, "Empty CRC is zero");
    for (const text of ["", "AAABBC", "ABCABCABC", "A".repeat(512), "éé 🖥️"]) {
        const { bytes, runs } = byteRuns(text);
        const decoded = runs.flatMap(run => Array(run.count).fill(run.value));
        assert(decoded.join() === Array.from(bytes).join(), "RLE reproduces exact UTF-8 bytes");
        assert(runs.every(run => run.count > 0 && run.count <= 255), "Run counts fit one byte");
    }
    assert(byteRuns("A".repeat(512)).runs.length === 3, "Long runs split at 255");
    assert(byteRuns("ABCABC").runs.length * 2 > 6, "Varied text expands with RLE");
    for (const invalid of [null, 1, "x".repeat(513)]) {
        let threw = false;
        try { byteRuns(invalid); } catch { threw = true; }
        assert(threw, "Invalid lesson input rejected");
    }
    const names = archiveNames(["../../bad.txt", "a.txt", "A.txt", "a (2).txt", "\u202Eevil.exe", "CON", "nul.txt", "...", "a\\b.txt", "a.txt"]);
    assert(names.every(name => !/[\\/\u202E]/.test(name) && name !== "." && name !== ".."), "Archive names cannot create paths or hide text with bidi controls");
    assert(new Set(names.map(name => name.toLowerCase())).size === names.length, "Filename collisions are resolved");
    assert(names[5] === "_CON" && names[6] === "_nul.txt", "Reserved Windows names are neutralized");
    assert(!archiveNames(["x".repeat(119) + ". file.txt"])[0].endsWith("."), "Filename truncation cannot leave a trailing dot");
    for (const files of [[], Array(21).fill({ size: 1 }), [{ size: 10 * 1024 * 1024 + 1 }], [{ size: -1 }]]) {
        let threw = false;
        try { validateArchiveFiles(files); } catch { threw = true; }
        assert(threw, "File count and byte limits enforced");
    }
    const file = (name, data) => Object.assign(new Blob([data]), { name });
    const files = [
        file("repeated.txt", "abcde".repeat(2000)),
        file("empty.txt", ""),
        file("résumé.txt", "Unicode text: café"),
        file("empty.txt", new Uint8Array([0, 255, 1, 200, 17, 0, 0, 3]))
    ];
    let sample;
    for (const compress of [false, true]) {
        const progress = [];
        const result = await buildZip(files, { compress, onProgress: done => progress.push(done) });
        const bytes = new Uint8Array(await result.blob.arrayBuffer());
        const view = new DataView(bytes.buffer);
        const end = bytes.length - 22;
        assert(view.getUint32(end, true) === 0x06054b50, "ZIP end signature is correct");
        assert(view.getUint16(end + 10, true) === files.length, "ZIP end entry count is correct");
        const centralStart = view.getUint32(end + 16, true);
        let cursor = centralStart;
        let payloadSize = 0;
        for (let i = 0; i < files.length; i++) {
            assert(view.getUint32(cursor, true) === 0x02014b50, "Central directory signature is correct");
            const nameLength = view.getUint16(cursor + 28, true);
            const localOffset = view.getUint32(cursor + 42, true);
            const method = view.getUint16(cursor + 10, true);
            const compressedSize = view.getUint32(cursor + 20, true);
            const originalSize = view.getUint32(cursor + 24, true);
            const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
            assert(name === result.entries[i].name, "UTF-8 central filename matches entry");
            assert(view.getUint16(cursor + 8, true) === 0x800, "UTF-8 name flag is set");
            assert(view.getUint32(localOffset, true) === 0x04034b50, "Central offset points at local header");
            const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true);
            const payload = bytes.slice(dataStart, dataStart + compressedSize);
            const restored = method === 8
                ? new Uint8Array(await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer())
                : payload;
            const original = new Uint8Array(await files[i].arrayBuffer());
            assert(restored.length === originalSize && restored.join() === original.join(), "ZIP payload restores exact original bytes");
            assert(view.getUint32(cursor + 16, true) === crc32(restored), "Central CRC matches restored content");
            assert(view.getUint32(localOffset + 14, true) === crc32(restored), "Local CRC matches restored content");
            if (!compress) assert(method === 0, "Store mode never compresses");
            payloadSize += compressedSize;
            cursor += 46 + nameLength;
        }
        assert(cursor === end && cursor - centralStart === view.getUint32(end + 12, true), "Directory length and bounds are exact");
        assert(bytes.length > payloadSize, "Container overhead is counted separately");
        if (compress && supportsDeflateRaw()) {
            assert(result.entries[0].method === 8 && result.entries[0].storedSize < result.entries[0].originalSize, "DEFLATE compresses repeated patterns that RLE misses");
            assert(result.entries[1].method === 0 && result.entries[3].method === 0, "Empty and incompressible entries are stored");
        }
        if (compress) sample = bytes;
    }
    const abort = new AbortController();
    abort.abort();
    let cancelled = false;
    try { await buildZip(files, { signal: abort.signal }); } catch (error) { cancelled = error.name === "AbortError"; }
    assert(cancelled, "Cancelled ZIP creation produces no archive");
    const nativeCompression = globalThis.CompressionStream;
    try {
        globalThis.CompressionStream = class {
            constructor() { throw new TypeError("Unsupported format"); }
        };
        assert(!supportsDeflateRaw(), "Unavailable raw DEFLATE is detected");
        const fallback = await buildZip([files[0]], { compress: true });
        assert(fallback.entries[0].method === 0 && !fallback.deflateAvailable, "Unsupported browsers produce explicitly stored ZIP entries");
    } finally { globalThis.CompressionStream = nativeCompression; }
    return { passed, deflateAvailable: supportsDeflateRaw(), sampleBase64: btoa(String.fromCharCode(...sample)) };
}

if (typeof document === "undefined") console.log(await runCompressionTests());
