export async function runCryptoEnvironmentTests(base = "/") {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    const waitFor = async (condition, label) => {
        for (let i = 0; i < 300; i++) {
            if (condition()) return;
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        throw new Error(`Timed out: ${label}`);
    };
    let frame = document.createElement("iframe");
    frame.title = "Cryptography environment verification";
    frame.width = "1280";
    frame.height = "800";
    document.body.append(frame);
    try {
        frame.src = `${base}lab.html?crypto-environment=${Date.now()}#crypto`;
        await waitFor(() => frame.contentDocument?.getElementById("crypto-support")?.textContent.includes("Web Crypto available"), "supported studio");
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        doc.getElementById("hash-compare").click();
        await waitFor(() => !doc.getElementById("hash-compare").disabled, "comparison");
        doc.getElementById("crypto-generate").click();
        await waitFor(() => !doc.getElementById("crypto-generate").disabled, "key generation");
        doc.getElementById("crypto-message").value = "x".repeat(4096);
        doc.getElementById("crypto-encrypt").click();
        await waitFor(() => !doc.getElementById("crypto-encrypt").disabled, "maximum message");
        assert(doc.getElementById("crypto-ciphertext").textContent.includes("first 96 ciphertext bytes shown"), "Large ciphertext has an explicit bounded preview");
        assert(doc.getElementById("crypto-sizes").textContent.includes("= 4124 bytes"), "Size accounting includes ciphertext, nonce, and tag exactly");
        for (const width of [320, 375, 1280]) {
            frame.width = String(width);
            for (const theme of ["light", "dark"]) {
                doc.documentElement.dataset.theme = theme;
                await new Promise(resolve => setTimeout(resolve, 50));
                assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `Crypto fits ${width}px in ${theme} mode`);
                assert(win.getComputedStyle(doc.getElementById("hash-bits")).gridTemplateColumns.split(" ").length === (width < 600 ? 16 : 32), `Bit map adapts to ${width}px`);
            }
        }
        for (const chapter of ["hash-chapter", "cipher-chapter", "crypto-concepts"]) {
            win.location.hash = `#${chapter}`;
            win.dispatchEvent(new win.HashChangeEvent("hashchange"));
            assert(!doc.getElementById("crypto").hidden && doc.querySelector(".lab-tabs a[aria-current]").hash === "#crypto", "Chapter links preserve the fifth experiment");
        }
        win.dispatchEvent(new win.PageTransitionEvent("pagehide"));
        assert(doc.getElementById("crypto-encrypt").disabled && doc.getElementById("crypto-key-state").textContent === "No session key yet", "Leaving the page discards session key");
        assert(!doc.getElementById("hash-a").value && !doc.getElementById("crypto-message").value, "Leaving the page clears messages");
        const markup = doc.documentElement.outerHTML;
        frame.remove();
        frame = document.createElement("iframe");
        frame.title = "Unsupported cryptography context verification";
        document.body.append(frame);
        const unsupportedDoc = frame.contentDocument;
        unsupportedDoc.open();
        Object.defineProperty(frame.contentWindow, "isSecureContext", { configurable: true, value: false });
        unsupportedDoc.write(markup);
        unsupportedDoc.close();
        await waitFor(() => unsupportedDoc.getElementById("crypto-support")?.textContent.includes("Web Crypto is unavailable"), "unsupported context");
        for (const id of ["hash-compare", "crypto-generate", "crypto-encrypt", "crypto-decrypt", "crypto-tamper", "crypto-wrong-key"]) {
            assert(unsupportedDoc.getElementById(id).disabled, `${id} is disabled without a secure crypto context`);
        }
        frame.contentWindow.location.hash = "#algorithms";
        frame.contentWindow.dispatchEvent(new frame.contentWindow.HashChangeEvent("hashchange"));
        assert(!unsupportedDoc.getElementById("algorithms").hidden, "Other experiments remain available without Web Crypto");
        return { passed, message: `${passed} cryptography environment assertions passed.` };
    } finally { frame.remove(); }
}
