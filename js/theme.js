(() => {
    "use strict";
    const key = "portfolio-theme";
    const valid = value => value === "dark" || value === "light";
    let theme = "light";
    try {
        const saved = localStorage.getItem(key);
        if (valid(saved)) theme = saved;
    } catch (error) {
        console.warn("Theme preference storage is unavailable; using light mode for this visit.", error);
    }

    const apply = value => {
        theme = value;
        document.documentElement.dataset.theme = theme;
        document.querySelectorAll("[data-theme-toggle], #theme-toggle").forEach(button => {
            button.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} theme`);
            button.setAttribute("aria-pressed", String(theme === "dark"));
            const label = button.querySelector("[data-theme-label]");
            if (label) label.textContent = theme === "light" ? "Dark mode" : "Light mode";
        });
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === "light" ? "#eef3ef" : "#05080d";
        document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
    };
    apply(theme);
    document.addEventListener("DOMContentLoaded", () => {
        apply(theme);
        document.querySelectorAll("[data-theme-toggle], #theme-toggle").forEach(button => {
            button.addEventListener("click", () => {
                const next = theme === "light" ? "dark" : "light";
                const update = () => {
                    apply(next);
                    try { localStorage.setItem(key, next); }
                    catch (error) { console.warn("Theme changed, but the browser could not save the preference.", error); }
                };
                if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    document.startViewTransition(update);
                } else update();
            });
        });
    });
    window.addEventListener("storage", event => {
        if (event.key === key || event.key === null) apply(valid(event.newValue) ? event.newValue : "light");
    });
    window.addEventListener("pageshow", () => {
        try {
            const saved = localStorage.getItem(key);
            apply(valid(saved) ? saved : "light");
        } catch (error) { console.warn("Could not refresh the stored theme; keeping the current theme.", error); }
    });
})();
