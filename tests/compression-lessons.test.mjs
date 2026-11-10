import { dataSample, runLengthSize, huffmanLesson, dictionaryTokens, restoreDictionary, compareData } from "../js/compression-lessons.mjs";

export async function runCompressionLessonTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    for (const kind of ["pixels", "pcm", "logs", "pattern", "noise"]) {
        const { bytes, description } = dataSample(kind);
        assert(bytes.length > 0 && bytes.length <= 4096 && description.length > 30, "Data samples are bounded and explained");
        assert(dataSample(kind).bytes.join() === bytes.join(), "Data samples are reproducible");
        const input = bytes.slice(0, 256);
        const tokens = dictionaryTokens(input);
        assert(restoreDictionary(tokens).join() === input.join(), "Dictionary restores exact binary sample bytes");
        assert(tokens.reduce((sum, token) => sum + token.length, 0) === input.length, "Tokens cover the complete sample prefix");
        assert(tokens.every(token => token.type === "literal" ? token.bits === 9 : token.bits === 12 && token.distance <= 64 && token.length <= 34), "Dictionary costs and bounds match displayed teaching format");
        const huffman = huffmanLesson(bytes);
        assert(huffman.rows.reduce((sum, row) => sum + row.count, 0) === bytes.length, "Histogram counts every input byte");
        assert(huffman.bits === huffman.rows.reduce((sum, row) => sum + row.count * row.code.length, 0), "Huffman payload bit cost is exact");
        assert(huffman.bits <= bytes.length * 8, "Byte Huffman payload never exceeds fixed-width optimum (metadata excluded)");
        for (const row of huffman.rows) {
            assert(huffman.rows.every(other => other === row || !other.code.startsWith(row.code)), "Huffman codes are prefix-free");
        }
        const codes = new Map(huffman.rows.map(row => [row.value, row.code]));
        const reverse = new Map(huffman.rows.map(row => [row.code, row.value]));
        const stream = Array.from(bytes, byte => codes.get(byte)).join("");
        const decoded = [];
        let code = "";
        for (const bit of stream) {
            code += bit;
            if (reverse.has(code)) { decoded.push(reverse.get(code)); code = ""; }
        }
        assert(!code.length && decoded.join() === bytes.join(), "Huffman stream decodes to exact original bytes without separators");
        const sizes = await compareData(bytes);
        assert(sizes.originalSize === bytes.length && sizes.rleSize === runLengthSize(bytes), "Comparison reports actual input and RLE byte counts");
        if (sizes.deflateSize !== null) {
            assert(sizes.deflateSize > 0, "Native DEFLATE returns a real byte count");
            if (kind === "pattern" || kind === "pixels") assert(sizes.deflateSize < sizes.originalSize, "Structured binary samples shrink under real DEFLATE");
        }
    }
    const pattern = dataSample("pattern").bytes;
    assert(runLengthSize(pattern) === pattern.length * 2, "RLE cannot exploit non-adjacent binary repetition");
    const tokens = dictionaryTokens(pattern.slice(0, 256));
    assert(tokens.some(token => token.type === "reference" && token.distance === 4), "Dictionary finds a four-byte back-reference");
    assert(tokens.reduce((sum, token) => sum + token.bits, 0) < 256 * 8, "Teaching dictionary shrinks repeated patterns even where RLE expands");
    const one = huffmanLesson(new Uint8Array(100).fill(42));
    assert(one.bits === 100 && one.rows[0].code === "0", "Single-symbol Huffman lesson uses at least one bit");
    assert(!huffmanLesson(new Uint8Array()).rows.length, "Empty Huffman input produces no codes");
    assert(restoreDictionary(dictionaryTokens(new Uint8Array())).length === 0, "Empty dictionary round-trip succeeds");
    assert(runLengthSize(new Uint8Array(512).fill(10)) === 6, "Binary RLE splits counts at 255");
    for (const invalid of [[{ type: "reference", distance: 1, length: 3 }], [{ type: "literal", value: 300 }]]) {
        let threw = false;
        try { restoreDictionary(invalid); } catch { threw = true; }
        assert(threw, "Invalid dictionary tokens fail explicitly");
    }
    let oversized = false;
    try { dictionaryTokens(new Uint8Array(257)); } catch { oversized = true; }
    assert(oversized, "Dictionary lesson enforces bounded work");
    return { passed, message: `${passed} compression lesson assertions passed.` };
}

if (typeof document === "undefined") console.log(await runCompressionLessonTests());
