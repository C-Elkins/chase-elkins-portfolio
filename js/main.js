"use strict";

function initializeNavigation() {
    const header = document.getElementById("site-header");
    const menu = document.getElementById("nav-menu");
    const toggle = document.getElementById("menu-toggle");
    const links = [...menu.querySelectorAll("a")];

    const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 20);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    toggle.addEventListener("click", () => {
        const open = menu.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });

    links.forEach((link) => link.addEventListener("click", () => {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
    }));

    const sections = [...document.querySelectorAll("main section[id]")];
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
        });
    }, { rootMargin: "-30% 0px -65%" });
    sections.forEach((section) => observer.observe(section));
}

function initializeTheme() {
    const button = document.getElementById("theme-toggle");
    const savedTheme = localStorage.getItem("portfolio-theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const initialTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : preferredTheme;

    const applyTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
    };

    applyTheme(initialTheme);
    button.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        const updateTheme = () => {
            applyTheme(nextTheme);
            localStorage.setItem("portfolio-theme", nextTheme);
        };
        if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            document.startViewTransition(updateTheme);
        } else {
            updateTheme();
        }
    });
}

window.initializeReveals = function initializeReveals(root = document) {
    const elements = root.querySelectorAll(".reveal:not([data-observed])");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        elements.forEach((element) => element.classList.add("visible"));
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            currentObserver.unobserve(entry.target);
        });
    }, { threshold: 0.12 });

    elements.forEach((element, index) => {
        element.dataset.observed = "true";
        element.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
        observer.observe(element);
    });
};

function initializeContactForm() {
    const form = document.getElementById("contact-form");
    const status = document.getElementById("form-status");
    if (!form || !status) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.elements["bot-field"].value) return;

        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;
        status.className = "form-status";
        status.textContent = "Transmitting message…";

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });
            if (!response.ok) throw new Error(`Form service returned ${response.status}`);

            form.reset();
            status.classList.add("success");
            status.textContent = "Message received. I’ll be in touch soon.";
        } catch {
            status.classList.add("error");
            status.textContent = "Message could not be sent. Please email me directly.";
        } finally {
            submitButton.disabled = false;
        }
    });
}

function initializeEmailReveal() {
    const button = document.getElementById("email-reveal");
    if (!button) return;

    button.addEventListener("click", () => {
        const address = String.fromCharCode(
            99, 104, 97, 115, 101, 46, 101, 46, 101, 108, 107, 105, 110, 115,
            49, 64, 103, 109, 97, 105, 108, 46, 99, 111, 109
        );
        const link = document.createElement("a");
        link.href = `mailto:${address}`;
        link.textContent = address;
        link.setAttribute("aria-label", `Email ${address}`);
        const arrow = document.createElement("span");
        arrow.textContent = "Email now ↗";
        link.appendChild(arrow);
        button.replaceWith(link);
        link.focus();
    }, { once: true });
}

function initializeMotionEffects() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.body;
    const progress = document.getElementById("scroll-progress");
    const portrait = document.getElementById("portrait-frame");
    let frameRequested = false;
    let pointerX = 0;
    let pointerY = 0;

    document.addEventListener("pointermove", (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        const card = event.target.closest?.(".project-card");
        if (card) {
            const bounds = card.getBoundingClientRect();
            card.style.setProperty("--card-x", `${event.clientX - bounds.left}px`);
            card.style.setProperty("--card-y", `${event.clientY - bounds.top}px`);
        }
        if (frameRequested) return;
        frameRequested = true;
        requestAnimationFrame(() => {
            root.style.setProperty("--pointer-x", `${pointerX}px`);
            root.style.setProperty("--pointer-y", `${pointerY}px`);
            frameRequested = false;
        });
    }, { passive: true });

    const updateProgress = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
        progress.style.transform = `scaleX(${ratio})`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });

    portrait.addEventListener("pointermove", (event) => {
        const bounds = portrait.getBoundingClientRect();
        const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
        const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
        portrait.style.setProperty("--tilt-x", `${vertical * -8}deg`);
        portrait.style.setProperty("--tilt-y", `${horizontal * 8}deg`);
    });
    portrait.addEventListener("pointerleave", () => {
        portrait.style.removeProperty("--tilt-x");
        portrait.style.removeProperty("--tilt-y");
    });

    document.querySelectorAll(".button").forEach((button) => {
        button.addEventListener("pointermove", (event) => {
            const bounds = button.getBoundingClientRect();
            const x = (event.clientX - bounds.left - bounds.width / 2) * 0.12;
            const y = (event.clientY - bounds.top - bounds.height / 2) * 0.18;
            button.style.setProperty("--magnetic-x", `${x}px`);
            button.style.setProperty("--magnetic-y", `${y}px`);
        });
        button.addEventListener("pointerleave", () => {
            button.style.removeProperty("--magnetic-x");
            button.style.removeProperty("--magnetic-y");
        });
    });
}

function initializeBootSequence() {
    const screen = document.getElementById("boot-screen");
    const counter = document.getElementById("boot-counter");
    const status = document.getElementById("boot-status");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!screen || reducedMotion || sessionStorage.getItem("portfolio-booted")) {
        screen?.remove();
        return;
    }

    const startedAt = performance.now();
    const duration = 1150;
    const counterTimer = window.setInterval(() => {
        const progress = Math.min((performance.now() - startedAt) / duration, 1);
        counter.textContent = String(Math.round(progress * 100)).padStart(3, "0");
    }, 40);
    window.setTimeout(() => {
        window.clearInterval(counterTimer);
        counter.textContent = "100";
        status.textContent = "SYSTEM READY";
        screen.classList.add("complete");
        sessionStorage.setItem("portfolio-booted", "true");
        window.setTimeout(() => screen.remove(), 600);
    }, duration);
}

document.addEventListener("DOMContentLoaded", () => {
    initializeBootSequence();
    initializeNavigation();
    initializeTheme();
    window.initializeReveals();
    initializeContactForm();
    initializeEmailReveal();
    initializeMotionEffects();
    document.getElementById("year").textContent = String(new Date().getFullYear());
});
