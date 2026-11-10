export async function runThemeTests(base = "/") {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    const original = localStorage.getItem("portfolio-theme");
    const frame = document.createElement("iframe");
    frame.width = "1280";
    frame.height = "800";
    frame.style.position = "fixed";
    frame.style.left = "-20000px";
    frame.title = "Shared theme verification";
    document.body.append(frame);
    const load = path => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Timed out loading ${path}`)), 8000);
        frame.onload = () => {
            clearTimeout(timeout);
            try {
                const doc = frame.contentDocument;
                if (!doc?.querySelector("[data-theme-toggle], #theme-toggle")) throw new Error(`Missing theme control on ${path}`);
                doc.startViewTransition = undefined;
                resolve(doc);
            } catch (error) { reject(error); }
        };
        frame.src = `${base}${path}?theme-test=${Date.now()}`;
    });
    const paths = ["index.html", "projects/netvhunter.html", "lab.html", "success.html", "404.html"];
    try {
        localStorage.removeItem("portfolio-theme");
        for (const path of paths) {
            const doc = await load(path);
            const button = doc.querySelector("[data-theme-toggle], #theme-toggle");
            assert(doc.documentElement.dataset.theme === "light", `${path} defaults to light`);
            assert(doc.querySelector('meta[name="theme-color"]').content === "#eef3ef", `${path} sets light browser chrome`);
            assert(button.getAttribute("aria-label") === "Switch to dark theme", `${path} announces the correct action`);
            assert(frame.contentWindow.getComputedStyle(doc.body).backgroundColor === "rgb(238, 243, 239)", `${path} paints the light palette`);
            button.click();
            assert(doc.documentElement.dataset.theme === "dark", `${path} toggles dark`);
            assert(localStorage.getItem("portfolio-theme") === "dark", `${path} persists dark choice`);
            assert(frame.contentWindow.getComputedStyle(doc.body).backgroundColor === "rgb(5, 8, 13)", `${path} paints the dark palette`);
            assert(button.getAttribute("aria-pressed") === "true", `${path} exposes dark mode state`);
            frame.width = "375";
            await new Promise(resolve => setTimeout(resolve, 40));
            assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `${path} fits a mobile viewport in dark mode`);
            button.click();
            assert(doc.documentElement.dataset.theme === "light", `${path} toggles back to light`);
            assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `${path} fits a mobile viewport in light mode`);
            frame.width = "320";
            await new Promise(resolve => setTimeout(resolve, 40));
            const bounds = button.getBoundingClientRect();
            assert(bounds.left >= 0 && bounds.right <= doc.documentElement.clientWidth, `${path} keeps its theme control visible at 320px`);
            frame.width = "1280";
            localStorage.removeItem("portfolio-theme");
        }
        localStorage.setItem("portfolio-theme", "dark");
        for (const path of paths) {
            const doc = await load(path);
            assert(doc.documentElement.dataset.theme === "dark", `${path} honors a saved dark choice`);
        }
        localStorage.setItem("portfolio-theme", "invalid");
        const invalidDoc = await load("lab.html");
        assert(invalidDoc.documentElement.dataset.theme === "light", "Invalid saved theme uses light");
        localStorage.setItem("portfolio-theme", "dark");
        await new Promise(resolve => setTimeout(resolve, 80));
        assert(invalidDoc.documentElement.dataset.theme === "dark", "Storage changes synchronize across open pages");
        localStorage.removeItem("portfolio-theme");
        await new Promise(resolve => setTimeout(resolve, 80));
        assert(invalidDoc.documentElement.dataset.theme === "light", "Clearing saved choice synchronizes to light");
        const button = invalidDoc.querySelector("[data-theme-toggle]");
        const storage = frame.contentWindow.Storage.prototype;
        const nativeSet = storage.setItem;
        try {
            storage.setItem = function(key, value) {
                if (key === "portfolio-theme") throw new DOMException("Test blocked storage", "SecurityError");
                return nativeSet.call(this, key, value);
            };
            button.click();
            assert(invalidDoc.documentElement.dataset.theme === "dark", "Toggle still works when saving preference is blocked");
        } finally { storage.setItem = nativeSet; }
        return { passed, message: `${passed} shared theme assertions passed.` };
    } finally {
        frame.remove();
        if (original === null) localStorage.removeItem("portfolio-theme");
        else localStorage.setItem("portfolio-theme", original);
        window.dispatchEvent(new StorageEvent("storage", { key: "portfolio-theme", newValue: original }));
    }
}
