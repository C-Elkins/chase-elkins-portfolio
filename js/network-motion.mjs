export function studioTiming(pace) {
    return {
        opening: pace * (35 / 3),
        local: pace * (11 / 3),
        preparation: pace * (10 / 3),
        hop: pace * 2.5,
        travel: pace * (5 / 3),
        receive: pace * (5 / 6),
        camera: pace * 1.5,
        typing: pace * 1.5,
        route: pace * .7
    };
}

export function createStudioMotion(preference, initialPace = 1200) {
    const animations = new Map();
    // Panel entrances are readability chrome, not scene motion; pausing must never strand text at opacity 0.
    const entrances = new WeakSet();
    let pace = initialPace;
    let paused = false;
    const cancel = key => {
        animations.get(key)?.cancel();
        animations.delete(key);
    };
    const animate = (key, element, frames, options = {}) => {
        cancel(key);
        if (preference.matches || paused || document.hidden || !element || element.hidden || !element.getClientRects().length) return null;
        const animation = element.animate(frames, {
            duration: options.duration ?? pace * .4,
            easing: "cubic-bezier(.2,.8,.2,1)",
            ...options
        });
        animations.set(key, animation);
        animation.addEventListener("finish", () => {
            if (animations.get(key) === animation) animations.delete(key);
        }, { once: true });
        return animation;
    };
    const enter = (key, element, distance = 10, delay = 0) => {
        const animation = animate(key, element, [
            { opacity: 0, transform: `translateY(${distance}px)` },
            { opacity: 1, transform: "translateY(0)" }
        ], { delay, fill: "backwards" });
        if (animation) entrances.add(animation);
        return animation;
    };
    const type = (element, caret, text, delay = 0) => {
        // Reveal glyphs without changing readable text or the caption's layout.
        element.textContent = text;
        caret.hidden = true;
        const duration = studioTiming(pace).typing;
        const animation = animate("command-type", element, [
            { clipPath: "inset(0 100% 0 0)" },
            { clipPath: "inset(0 0% 0 0)" }
        ], { duration, delay, fill: "backwards", easing: `steps(${Math.max(1, [...text].length)}, end)` });
        cancel("command-caret");
        if (!animation) return;
        caret.hidden = false;
        animate("command-caret", caret, [
            { transform: "translateX(0)", opacity: 0, offset: 0 },
            { transform: "translateX(0)", opacity: 1, offset: .01 },
            { transform: `translateX(${element.offsetWidth}px)`, opacity: 1, offset: 1 }
        ], { duration, delay, fill: "backwards", easing: `steps(${Math.max(1, [...text].length)}, end)` });
        animation.addEventListener("finish", () => {
            if (!animations.has("command-type")) caret.hidden = true;
        }, { once: true });
    };
    const pause = () => {
        paused = true;
        for (const animation of [...animations.values()]) if (entrances.has(animation)) animation.finish();
        for (const animation of animations.values()) if (animation.playState === "running") {
            const time = animation.currentTime;
            animation.pause();
            animation.currentTime = time;
        }
    };
    const resume = () => {
        paused = false;
        for (const animation of animations.values()) if (animation.playState === "paused") animation.play();
    };
    const reset = () => {
        for (const animation of animations.values()) animation.cancel();
        animations.clear();
        paused = false;
    };
    const setPace = value => {
        const ratio = pace / value;
        for (const animation of animations.values()) animation.updatePlaybackRate(animation.playbackRate * ratio);
        pace = value;
    };
    preference.addEventListener("change", () => {
        if (preference.matches) for (const animation of [...animations.values()]) animation.finish();
    });
    return { animate, enter, type, pause, resume, reset, setPace };
}

export function sceneCommand(step) {
    const title = step.protocol.toUpperCase();
    const summary = step.summary;
    const name = summary.match(/\b(?:studio|demo)\.test\b/)?.[0];
    if (step.family === "DNS" && name) {
        if (/query|record.*\?/i.test(`${title} ${summary}`)) return `A? ${name}`;
        const address = summary.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/)?.[0];
        if (address) return `${name} = ${address}`;
    }
    if (/HTTP GET|HTTPS REQUEST/.test(title)) return /GET \/guide/.test(summary) ? "GET /guide" : "GET /";
    if (/HTTP 200|HTTPS RESPONSE/.test(title)) return "HTTP 200 OK";
    if (/\bSYN-ACK\b/.test(title)) return "TCP [SYN, ACK]";
    if (/\bSYN\b/.test(title)) return "TCP [SYN]";
    if (/\bACK\b/.test(title) && step.family === "TCP") return "TCP [ACK]";
    if (/CLIENTHELLO/.test(title)) return "TLS 1.3 / ClientHello";
    if (/SERVERHELLO/.test(title)) return "TLS 1.3 / ServerHello";
    if (/ENCRYPTED/.test(title) && step.family === "TLS") return "Protected TLS record";
    if (/DHCP/.test(title)) return title.replace(/^DHCP /, "");
    return step.protocol.length > 28 ? `${step.protocol.slice(0, 25)}...` : step.protocol;
}
