import { studioTiming } from "../js/network-motion.mjs";

export async function runNetworkPacingTests() {
    let passed = 0;
    const $ = id => document.getElementById(id);
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const change = (id, value) => { $(id).value = value; $(id).dispatchEvent(new Event("change")); };
    location.hash = "#network"; dispatchEvent(new HashChangeEvent("hashchange"));
    change("network-mode", "guided");
    $("protocol-search").value = ""; $("protocol-search").dispatchEvent(new Event("input"));
    document.querySelector('[data-category="all"]').click();
    const measurements = [];
    for (const pace of [1200, 600, 400, 300]) {
        document.querySelector('#protocol-picker [data-protocol="http"]').click();
        change("network-speed", String(pace));
        const expected = studioTiming(pace);
        const start = performance.now();
        $("network-play").click();
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const typing = $("scene-callout-detail").getAnimations()[0].effect.getTiming();
            assert(typing.duration === expected.typing && typing.delay === expected.camera * .75,
                `${pace}: typing and camera yield use the selected speed`);
        }
        await wait(expected.opening - 150);
        assert($("network-progress").value === 1, `${pace}: the opening is not cut short`);
        while ($("network-progress").value === 1 && performance.now() - start < expected.opening + 1000) await wait(20);
        const elapsed = performance.now() - start;
        assert($("network-progress").value === 2 && elapsed >= expected.opening - 30 && elapsed <= expected.opening + 600,
            `${pace}: real opening dwell matches the selected speed (${Math.round(elapsed)}ms / ${expected.opening}ms)`);
        const packet = document.querySelector(".network-packet");
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            assert(packet.getAnimations()[0].effect.getTiming().duration === expected.travel,
                `${pace}: packet travel uses the selected speed`);
        }
        measurements.push({ speed: 600 / pace, openingMs: Math.round(elapsed) });
        $("network-play").click();
        $("network-replay").click();
    }
    change("network-speed", "1200");
    return { passed, measurements, message: `${passed} real-time playback pacing assertions passed.` };
}
