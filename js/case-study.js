"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const progress = document.getElementById("scroll-progress");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updates = [...document.querySelectorAll('.update-archive details[name="development-journal"]')];
    updates.forEach((entry) => {
        const summary = entry.querySelector("summary");
        summary.addEventListener("click", (event) => {
            event.preventDefault();
            const previousTop = summary.getBoundingClientRect().top;
            const opening = !entry.open;
            updates.forEach((other) => {
                if (other !== entry) other.open = false;
            });
            entry.open = opening;

            // Closing an entry above must not move the selected heading offscreen.
            requestAnimationFrame(() => {
                window.scrollBy({
                    top: summary.getBoundingClientRect().top - previousTop,
                    behavior: "instant"
                });
                updateProgress();
            });
        });
    });

    const updateProgress = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const ratio = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
        progress.style.transform = `scaleX(${ratio})`;
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });

    if (reducedMotion) {
        document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
    } else {
        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("visible");
                currentObserver.unobserve(entry.target);
            });
        }, { threshold: 0.14 });
        document.querySelectorAll(".reveal").forEach((element, index) => {
            element.style.setProperty("--reveal-delay", `${(index % 3) * 70}ms`);
            observer.observe(element);
        });

        let scheduled = false;
        document.addEventListener("pointermove", (event) => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                document.body.style.setProperty("--pointer-x", `${event.clientX}px`);
                document.body.style.setProperty("--pointer-y", `${event.clientY}px`);
                scheduled = false;
            });
        }, { passive: true });
    }

    document.getElementById("year").textContent = String(new Date().getFullYear());
});
