export const MAX_ZIP_BYTES = 10 * 1024 * 1024;
export const MAX_ZIP_FILES = 20;

export function byteRuns(text) {
    if (typeof text !== "string" || text.length > 512) throw new Error("Use up to 512 characters for the visual lesson.");
    const bytes = new TextEncoder().encode(text);
    const runs = [];
    for (let i = 0; i < bytes.length;) {
        let count = 1;
        while (count < 255 && i + count < bytes.length && bytes[i + count] === bytes[i]) count++;
        runs.push({ value: bytes[i], count, start: i });
        i += count;
    }
    return { bytes, runs };
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    return crc >>> 0;
});

export function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    return (crc ^ 0xffffffff) >>> 0;
}

export function archiveNames(names) {
    const used = new Set();
    return names.map(name => {
        const base = Array.from(name.normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "_")
            .replace(/^[. ]+|[. ]+$/g, "")).slice(0, 120).join("").replace(/[. ]+$/g, "") || "file";
        const safe = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(base) ? `_${base}` : base;
        const dot = safe.lastIndexOf(".");
        const stem = dot > 0 ? safe.slice(0, dot) : safe;
        const extension = dot > 0 ? safe.slice(dot) : "";
        let result = safe;
        let count = 2;
        while (used.has(result.toLowerCase())) result = `${stem} (${count++})${extension}`;
        used.add(result.toLowerCase());
        return result;
    });
}

export function supportsDeflateRaw() {
    if (typeof CompressionStream === "undefined") return false;
    try { new CompressionStream("deflate-raw"); return true; }
    catch (error) {
        if (error instanceof TypeError) return false;
        throw error;
    }
}

export function validateArchiveFiles(files) {
    if (!files.length || files.length > MAX_ZIP_FILES) throw new Error(`Choose between 1 and ${MAX_ZIP_FILES} files.`);
    if (files.some(file => !Number.isSafeInteger(file.size) || file.size < 0) || files.reduce((total, file) => total + file.size, 0) > MAX_ZIP_BYTES) {
        throw new Error("The combined file size must be no more than 10 MB.");
    }
}

// ZIP method 8 expects raw DEFLATE, not the zlib wrapper produced by "deflate".
export async function buildZip(files, { compress = true, onProgress = () => {}, signal } = {}) {
    validateArchiveFiles(files);
    const names = archiveNames(files.map(file => file.name));
    const useDeflate = compress && supportsDeflateRaw();
    const localParts = [];
    const directoryParts = [];
    const entries = [];
    let offset = 0;
    for (let index = 0; index < files.length; index++) {
        signal?.throwIfAborted();
        const file = files[index];
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes.length !== file.size) throw new Error("A file changed while being read. Select the files again.");
        signal?.throwIfAborted();
        let payload = bytes;
        let method = 0;
        if (useDeflate && bytes.length) {
            const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
            const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
            signal?.throwIfAborted();
            if (compressed.length < bytes.length) { payload = compressed; method = 8; }
        }
        const name = new TextEncoder().encode(names[index]);
        const checksum = crc32(bytes);
        const local = new Uint8Array(30 + name.length);
        const header = new DataView(local.buffer);
        header.setUint32(0, 0x04034b50, true);
        header.setUint16(4, 20, true);
        header.setUint16(6, 0x0800, true);
        header.setUint16(8, method, true);
        header.setUint16(12, 0x0021, true);
        header.setUint32(14, checksum, true);
        header.setUint32(18, payload.length, true);
        header.setUint32(22, bytes.length, true);
        header.setUint16(26, name.length, true);
        local.set(name, 30);
        const central = new Uint8Array(46 + name.length);
        const directory = new DataView(central.buffer);
        directory.setUint32(0, 0x02014b50, true);
        directory.setUint16(4, 20, true);
        directory.setUint16(6, 20, true);
        directory.setUint16(8, 0x0800, true);
        directory.setUint16(10, method, true);
        directory.setUint16(14, 0x0021, true);
        directory.setUint32(16, checksum, true);
        directory.setUint32(20, payload.length, true);
        directory.setUint32(24, bytes.length, true);
        directory.setUint16(28, name.length, true);
        directory.setUint32(42, offset, true);
        central.set(name, 46);
        localParts.push(local, payload);
        directoryParts.push(central);
        offset += local.length + payload.length;
        entries.push({ name: names[index], originalSize: bytes.length, storedSize: payload.length, method });
        onProgress(index + 1, files.length);
    }
    signal?.throwIfAborted();
    const directorySize = directoryParts.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    const footer = new DataView(end.buffer);
    footer.setUint32(0, 0x06054b50, true);
    footer.setUint16(8, files.length, true);
    footer.setUint16(10, files.length, true);
    footer.setUint32(12, directorySize, true);
    footer.setUint32(16, offset, true);
    return { blob: new Blob([...localParts, ...directoryParts, end], { type: "application/zip" }), entries, deflateAvailable: supportsDeflateRaw() };
}
