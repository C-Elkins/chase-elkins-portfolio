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
        toggle.setAttribute("aria-label", "Open navigation");
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

function initializePortraitNetwork() {
    const stage = document.getElementById("portrait-stage");
    const traffic = document.getElementById("network-traffic");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const svgNamespace = "http://www.w3.org/2000/svg";
    const routes = [
        [[194, 58], [96, 114], [92, 250], [32, 338], [84, 434], [50, 532], [126, 606], [226, 654]],
        [[442, 50], [548, 118], [602, 216], [566, 310], [612, 404], [548, 506], [478, 652]],
        [[38, 182], [96, 114], [194, 58], [320, 74], [442, 50], [548, 118]],
        [[592, 596], [548, 506], [478, 652], [350, 680], [226, 654], [126, 606]]
    ];
    const createSvg = (tag, attributes) => {
        const element = document.createElementNS(svgNamespace, tag);
        Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
        return element;
    };
    const nodes = new Map();
    routes.flat().forEach(([x, y]) => {
        const key = `${x},${y}`;
        if (nodes.has(key)) return;
        const glow = createSvg("circle", { cx: x, cy: y, r: 29, opacity: 0, class: "node-processing" });
        traffic.appendChild(glow);
        nodes.set(key, { glow, intensity: 0 });
    });
    const packets = routes.map((route, index) => {
        const group = createSvg("g", { class: "network-packet", opacity: 0 });
        const tail = createSvg("line", { class: "packet-tail" });
        const core = createSvg("circle", { r: 2.6, class: "packet-core" });
        group.append(tail, core);
        traffic.appendChild(group);
        return { route, group, tail, core, hop: 0, phase: "hold", elapsed: -index * 0.9 };
    });
    let inView = false;
    let frameId = null;
    let lastTimestamp = null;
    const renderFrame = (timestamp) => {
        const delta = lastTimestamp === null ? 0 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
        lastTimestamp = timestamp;
        const receiving = new Set();
        packets.forEach((packet) => {
            packet.elapsed += delta;
            if (packet.elapsed < 0) return;
            const from = packet.route[packet.hop];
            const to = packet.route[(packet.hop + 1) % packet.route.length];
            if (packet.phase === "hold") {
                packet.group.setAttribute("opacity", "0");
                receiving.add(from.join(","));
                if (packet.elapsed >= 0.85 + packet.hop % 3 * 0.15) {
                    packet.phase = "travel";
                    packet.elapsed = 0;
                }
                return;
            }
            // Reverse at endpoints so packets always follow a visible connection.
            const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
            const duration = distance / 95;
            const progress = Math.min(packet.elapsed / duration, 1);
            const eased = progress * progress * (3 - 2 * progress);
            const x = from[0] + (to[0] - from[0]) * eased;
            const y = from[1] + (to[1] - from[1]) * eased;
            const trail = Math.min(eased, 12 / distance) * Math.min((1 - progress) * 5, 1);
            packet.core.setAttribute("cx", x);
            packet.core.setAttribute("cy", y);
            packet.tail.setAttribute("x1", x - (to[0] - from[0]) * trail);
            packet.tail.setAttribute("y1", y - (to[1] - from[1]) * trail);
            packet.tail.setAttribute("x2", x);
            packet.tail.setAttribute("y2", y);
            packet.group.setAttribute("opacity", String(Math.min(progress * 8, 1)));
            if (progress === 1) {
                packet.hop++;
                if (packet.hop === packet.route.length - 1) {
                    packet.route.reverse();
                    packet.hop = 0;
                }
                packet.phase = "hold";
                packet.elapsed = 0;
            }
        });
        nodes.forEach((node, key) => {
            const target = receiving.has(key) ? 1 : 0;
            const rate = target ? 3 : 1.6;
            node.intensity += (target - node.intensity) * (1 - Math.exp(-rate * delta));
            node.glow.setAttribute("opacity", node.intensity.toFixed(3));
        });
        frameId = requestAnimationFrame(renderFrame);
    };
    const updatePlayback = () => {
        const running = inView && !document.hidden && !motionPreference.matches;
        stage.classList.toggle("network-running", running);
        if (running && frameId === null) {
            lastTimestamp = null;
            frameId = requestAnimationFrame(renderFrame);
        } else if (!running && frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
            if (motionPreference.matches) {
                packets.forEach((packet) => packet.group.setAttribute("opacity", "0"));
                nodes.forEach((node) => node.glow.setAttribute("opacity", "0"));
            }
        }
    };
    const observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        updatePlayback();
    });
    observer.observe(stage);
    document.addEventListener("visibilitychange", updatePlayback);
    motionPreference.addEventListener("change", updatePlayback);
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
    window.initializeReveals();
    initializeContactForm();
    initializeEmailReveal();
    initializeMotionEffects();
    initializePortraitNetwork();
    document.getElementById("year").textContent = String(new Date().getFullYear());
});
