import { byteRuns, buildZip, supportsDeflateRaw, validateArchiveFiles } from "./compression-model.mjs";
import { dataSample, dictionaryTokens, restoreDictionary, huffmanLesson, compareData } from "./compression-lessons.mjs";

export function initializeCompression() {
    const $ = id => document.getElementById(id);
    let lesson = byteRuns($("compression-input").value);
    let index = 0;
    let timer = null;
    let downloadUrl = null;
    let controller = null;
    let sample = dataSample($("data-sample").value);
    let dictionary = [];
    let dictionaryIndex = 0;
    let dictionaryTimer = null;
    let comparisonVersion = 0;
    const status = (text, error = false) => {
        $("zip-status").textContent = text;
        $("zip-status").classList.toggle("error", error);
    };
    const pause = () => {
        clearTimeout(timer); timer = null;
        clearTimeout(dictionaryTimer); dictionaryTimer = null;
        $("compression-play").textContent = "Play";
        $("dictionary-play").textContent = "Play";
    };
    const hex = byte => byte.toString(16).padStart(2, "0").toUpperCase();
    const renderDictionary = () => {
        const visible = dictionary.slice(0, dictionaryIndex);
        const restored = restoreDictionary(visible);
        const bitCost = visible.reduce((total, token) => total + token.bits, 0);
        $("dictionary-state").textContent = `${restored.length}/${Math.min(sample.bytes.length, 256)} bytes reconstructed / ${dictionaryIndex}/${dictionary.length} tokens / ${bitCost} teaching-format bits so far`;
        const last = visible.at(-1);
        $("dictionary-explanation").textContent = !last ? "Nothing decoded yet. The first occurrence of a byte is usually a literal."
            : last.type === "literal" ? `Literal 0x${hex(last.value)}: store the byte itself. Cost: 9 bits including the teaching tag.`
                : `At input offset ${last.start}, copy ${last.length} bytes from ${last.distance} byte(s) back. The decoder reconstructs the bytes instead of storing them again. Cost: 12 teaching-format bits.`;
        $("dictionary-tokens").replaceChildren(...visible.slice(-64).map(token => {
            const element = document.createElement("span");
            element.className = `run-token${token.type === "reference" ? " reference-token" : ""}`;
            element.textContent = token.type === "literal" ? `0x${hex(token.value)}` : `← ${token.distance} / copy ${token.length}`;
            return element;
        }));
        $("dictionary-restored").textContent = Array.from(restored, hex).join(" ") || "No bytes reconstructed yet.";
        $("dictionary-play").disabled = dictionaryIndex === dictionary.length;
        $("dictionary-step").disabled = dictionaryIndex === dictionary.length;
    };
    const resetDictionary = () => {
        pause(); dictionaryIndex = 0;
        dictionary = dictionaryTokens(sample.bytes.slice(0, 256));
        renderDictionary();
    };
    const dictionaryStep = () => {
        if (dictionaryIndex < dictionary.length) dictionaryIndex++;
        renderDictionary();
        if (dictionaryIndex === dictionary.length) {
            clearTimeout(dictionaryTimer); dictionaryTimer = null;
            $("dictionary-play").textContent = "Play";
        }
    };
    const dictionaryTick = () => {
        dictionaryStep();
        if (dictionaryIndex < dictionary.length) dictionaryTimer = setTimeout(dictionaryTick, Number($("compression-speed").value));
    };
    $("dictionary-play").addEventListener("click", () => {
        if (dictionaryTimer !== null) { pause(); return; }
        pause(); $("dictionary-play").textContent = "Pause"; dictionaryTick();
    });
    $("dictionary-step").addEventListener("click", () => { pause(); dictionaryStep(); });
    $("dictionary-reset").addEventListener("click", resetDictionary);
    const inspectByte = offset => {
        const value = sample.bytes[offset];
        $("byte-detail").textContent = `Offset ${offset} / decimal ${value} / hex 0x${hex(value)} / binary ${value.toString(2).padStart(8, "0")} / 8 bits in every notation`;
        $("byte-grid").querySelectorAll("button").forEach((button, index) => button.setAttribute("aria-pressed", String(index === offset)));
    };
    const renderSample = () => {
        comparisonVersion++;
        $("data-compare").disabled = false;
        $("data-comparison").replaceChildren();
        $("data-compare-status").classList.remove("error");
        $("data-compare-status").textContent = "Choose Compare to measure this sample.";
        $("data-description").textContent = sample.description;
        $("data-size").textContent = `${sample.bytes.length.toLocaleString()} bytes`;
        $("data-unique").textContent = new Set(sample.bytes).size;
        $("byte-grid").replaceChildren(...Array.from(sample.bytes.slice(0, 64), (byte, offset) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = hex(byte);
            button.setAttribute("aria-label", `Byte ${offset}, hex ${hex(byte)}, decimal ${byte}`);
            button.addEventListener("click", () => inspectByte(offset));
            return button;
        }));
        if (sample.bytes.length) inspectByte(0);
        else $("byte-detail").textContent = "Empty input has no bytes to inspect.";
        const canvas = $("data-canvas");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < Math.min(sample.bytes.length, 1024); i++) {
            const shade = sample.bytes[i];
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
            ctx.fillRect(i % 32 * 8, Math.floor(i / 32) * 8, 8, 8);
        }
        const caption = sample.image ? "Raw image enlarged 8×: each square represents one pixel byte."
            : "Byte map of the first 1,024 bytes (32 per row): brightness represents byte value, not decoded picture or audio content.";
        $("data-preview-caption").textContent = caption;
        canvas.setAttribute("aria-label", caption);
        const huffman = huffmanLesson(sample.bytes);
        $("huffman-original").textContent = `${sample.bytes.length * 8} bits`;
        $("huffman-bits").textContent = `${huffman.bits} bits / ${Math.ceil(huffman.bits / 8)} whole bytes`;
        $("huffman-note").textContent = "Codebook + header overhead excluded";
        $("huffman-table").replaceChildren(...huffman.rows.slice(0, 16).map(row => {
            const tr = document.createElement("tr");
            for (const value of [`0x${hex(row.value)}`, row.count, row.code, row.count * row.code.length]) {
                const td = document.createElement("td");
                td.textContent = value; tr.append(td);
            }
            return tr;
        }));
        $("huffman-stream").textContent = huffman.bitstream || "No input bytes.";
        resetDictionary();
    };
    $("data-sample").addEventListener("change", () => {
        fileVersion++;
        $("data-file").value = "";
        $("data-file-status").classList.remove("error");
        $("data-file-status").textContent = "Showing a built-in sample. No local file is retained.";
        sample = dataSample($("data-sample").value); renderSample();
    });
    let fileVersion = 0;
    $("data-file").addEventListener("change", async () => {
        const version = ++fileVersion;
        const file = $("data-file").files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            $("data-file").value = "";
            $("data-file-status").textContent = "Choose a file up to 10 MB. No file was read.";
            $("data-file-status").classList.add("error");
            return;
        }
        try {
            const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
            if (version !== fileVersion) return;
            sample = { bytes, image: false, description: `Local file: ${file.name}. Inspecting ${bytes.length.toLocaleString()} of ${file.size.toLocaleString()} bytes. ${file.size > 4096 ? "This is only a prefix, not a whole-file compression estimate." : "This sample includes the entire file."} No contents are executed or uploaded.` };
            $("data-file-status").classList.remove("error");
            $("data-file-status").textContent = "Local sample loaded. Choose a built-in sample or Clear file to discard it.";
            renderSample();
        } catch (error) {
            if (version !== fileVersion) return;
            $("data-file-status").textContent = `Could not read the file: ${error.message}`;
            $("data-file-status").classList.add("error");
        }
    });
    const clearDataFile = () => {
        fileVersion++; $("data-file").value = "";
        $("data-file-status").classList.remove("error");
        $("data-file-status").textContent = "File cleared. Showing a built-in sample.";
        sample = dataSample($("data-sample").value); renderSample();
    };
    $("data-file-clear").addEventListener("click", clearDataFile);
    $("data-compare").addEventListener("click", async () => {
        const version = ++comparisonVersion;
        $("data-compare").disabled = true;
        $("data-compare-status").classList.remove("error");
        $("data-compare-status").textContent = "Measuring this byte sample locally…";
        try {
            const sizes = await compareData(sample.bytes);
            if (version !== comparisonVersion) return;
            const rows = [["Original bytes", sizes.originalSize], ["RLE / count + value pairs", sizes.rleSize], ["Raw DEFLATE / actual browser output", sizes.deflateSize]];
            $("data-comparison").replaceChildren(...rows.map(([name, size]) => {
                const tr = document.createElement("tr");
                const difference = size === null ? "Unavailable"
                    : size === sizes.originalSize ? "Same size" : size < sizes.originalSize ? `${sizes.originalSize - size} bytes smaller` : `${size - sizes.originalSize} bytes larger`;
                for (const value of [name, size === null ? "Not supported" : size.toLocaleString(), difference]) {
                    const td = document.createElement("td"); td.textContent = value; tr.append(td);
                }
                return tr;
            }));
            $("data-compare-status").textContent = sizes.deflateSize === null
                ? "This browser does not support raw DEFLATE; RLE measurements are still available. No estimated DEFLATE value is substituted."
                : "Measured from actual encoded bytes. Raw DEFLATE may grow; ZIP creation separately chooses Store if an entry would be larger. A prefix from a local file does not predict the whole-file result.";
        } catch (error) {
            if (version !== comparisonVersion) return;
            $("data-compare-status").textContent = `Comparison failed: ${error.message}`;
            $("data-compare-status").classList.add("error");
        } finally { if (version === comparisonVersion) $("data-compare").disabled = false; }
    });
    const render = () => {
        const complete = index === lesson.runs.length;
        const consumed = index ? lesson.runs[index - 1].start + lesson.runs[index - 1].count : 0;
        $("compression-original").textContent = `${lesson.bytes.length} bytes`;
        $("compression-encoded").textContent = `${index * 2} bytes`;
        const projected = lesson.runs.length * 2;
        $("compression-result").textContent = !lesson.bytes.length ? "Enter text to begin"
            : `${projected} bytes when complete / ${projected < lesson.bytes.length ? `${Math.round((1 - projected / lesson.bytes.length) * 100)}% smaller` : projected > lesson.bytes.length ? `${projected - lesson.bytes.length} bytes larger` : "same size"}`;
        $("compression-state").textContent = `${consumed}/${lesson.bytes.length} input bytes read · ${complete ? "Complete" : `Run ${index}/${lesson.runs.length}`}`;
        $("compression-step").disabled = complete;
        $("compression-play").disabled = complete;
        const tokens = lesson.runs.slice(Math.max(0, index - 80), index).map(run => {
            const token = document.createElement("span");
            token.className = "run-token";
            const label = run.value === 32 ? "space" : run.value >= 33 && run.value <= 126 ? String.fromCharCode(run.value) : "byte";
            token.textContent = `${run.count} × ${label} / 0x${run.value.toString(16).padStart(2, "0").toUpperCase()}`;
            return token;
        });
        $("compression-runs").replaceChildren(...tokens);
        $("compression-output").textContent = lesson.runs.slice(0, index).map(run => `${run.count},${run.value}`).join(" | ") || "No pairs yet.";
        $("compression-window").textContent = index ? `Just encoded ${lesson.runs[index - 1].count} consecutive byte(s) as one count + byte pair. Each pair takes 2 bytes.` : "A run groups identical consecutive UTF-8 bytes. Step to encode the first run.";
    };
    const reset = () => {
        pause();
        lesson = byteRuns($("compression-input").value);
        index = 0; render();
    };
    const step = () => {
        if (index < lesson.runs.length) index++;
        render();
        if (index === lesson.runs.length) pause();
    };
    const tick = () => {
        step();
        if (index < lesson.runs.length) timer = setTimeout(tick, Number($("compression-speed").value));
    };
    $("compression-play").addEventListener("click", () => {
        if (timer !== null) { pause(); return; }
        pause(); $("compression-play").textContent = "Pause"; tick();
    });
    $("compression-step").addEventListener("click", () => { pause(); step(); });
    $("compression-reset").addEventListener("click", reset);
    $("compression-input").addEventListener("input", reset);
    $("compression-example").addEventListener("change", () => {
        const examples = {
            repeated: "AAAAAAAAAAAAAAAABBBBBBBBBBBBBBBBCCCCCCCCCCCCCCCC",
            varied: "The quick brown fox jumps over the lazy dog.",
            pattern: "ABCABCABCABCABCABCABCABCABCABCABCABCABCABC"
        };
        $("compression-input").value = examples[$("compression-example").value];
        reset();
    });
    const clearDownload = () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = null;
        $("zip-download").hidden = true;
        $("zip-download").removeAttribute("href");
        $("zip-report").replaceChildren();
    };
    const cancelZip = () => {
        if (controller) {
            controller.abort(); controller = null;
            $("zip-build").disabled = false;
            status("ZIP creation cancelled. Files remain on your device.");
        }
    };
    $("zip-files").addEventListener("change", () => {
        cancelZip(); clearDownload();
        const files = Array.from($("zip-files").files);
        try {
            validateArchiveFiles(files);
            status(`${files.length} file(s) selected / ${files.reduce((sum, file) => sum + file.size, 0).toLocaleString()} bytes. Press Create ZIP to begin.`);
        } catch (error) {
            $("zip-files").value = "";
            status(error.message, true);
        }
    });
    $("zip-method").addEventListener("change", () => { cancelZip(); clearDownload(); status("Method changed. Create a new ZIP to compare."); });
    $("zip-build").addEventListener("click", async () => {
        cancelZip(); clearDownload();
        const operation = new AbortController();
        controller = operation;
        $("zip-build").disabled = true;
        status("Reading files locally. Nothing is uploaded.");
        try {
            const result = await buildZip(Array.from($("zip-files").files), {
                compress: $("zip-method").value === "deflate", signal: operation.signal,
                onProgress: (done, total) => {
                    if (controller === operation) status(`Processed ${done}/${total} files locally.`);
                }
            });
            if (controller !== operation) return;
            downloadUrl = URL.createObjectURL(result.blob);
            $("zip-download").href = downloadUrl;
            $("zip-download").hidden = false;
            const originalSize = result.entries.reduce((sum, entry) => sum + entry.originalSize, 0);
            const payloadSize = result.entries.reduce((sum, entry) => sum + entry.storedSize, 0);
            for (const entry of result.entries) {
                const row = document.createElement("li");
                row.textContent = `${entry.name} / ${entry.originalSize.toLocaleString()} → ${entry.storedSize.toLocaleString()} bytes / ${entry.method === 8 ? "DEFLATE" : "stored without compression"}`;
                $("zip-report").append(row);
            }
            status(`Ready: ${originalSize.toLocaleString()} input bytes → ${result.blob.size.toLocaleString()} ZIP bytes. Payload: ${payloadSize.toLocaleString()} bytes; headers and filenames: ${(result.blob.size - payloadSize).toLocaleString()} bytes. ${result.blob.size > originalSize ? "This archive is larger than its input; compression cannot shrink every file." : "The archive includes filenames, sizes, and CRC-32 integrity checks."}${$("zip-method").value === "deflate" && !result.deflateAvailable ? " This browser does not support raw DEFLATE; entries were stored without compression." : ""}`);
        } catch (error) {
            if (controller !== operation) return;
            status(`ZIP creation failed: ${error.message}`, true);
        } finally {
            if (controller === operation) { controller = null; $("zip-build").disabled = false; }
        }
    });
    $("zip-clear").addEventListener("click", () => {
        cancelZip(); clearDownload(); $("zip-files").value = "";
        status("Files and download cleared from this lab session.");
    });
    $("zip-support").textContent = supportsDeflateRaw()
        ? "Raw DEFLATE is available. If compression would enlarge an entry, ZIP stores that entry unchanged."
        : "Raw DEFLATE is unavailable in this browser. You can still create an uncompressed ZIP; use a current browser for compression.";
    reset();
    renderSample();
    window.addEventListener("pagehide", () => {
        pause(); cancelZip(); clearDownload(); $("zip-files").value = "";
        clearDataFile();
    });
    return () => { pause(); cancelZip(); };
}
