import { createStudioMotion, sceneCommand, studioTiming } from "../js/network-motion.mjs";
import { guidedLessons, guidedLesson } from "../js/network-guided.mjs";
import { packetGroups } from "../js/network-protocols.mjs";

export async function runNetworkMotionTests() {
    let passed = 0;
    const $ = id => document.getElementById(id);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const change = (id, value) => { $(id).value = value; $(id).dispatchEvent(new Event("change")); };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pick = id => document.querySelector(`#protocol-picker [data-protocol="${id}"]`).click();
    assert($("network-speed").value === "1200", "Initial playback speed is the slower 0.5x setting");
    const speeds = [...$("network-speed").options].map(option => [Number(option.value), Number.parseFloat(option.textContent)]);
    assert(speeds.length === 4 && speeds.some(([, speed]) => speed === 1.5), "Playback includes the intermediate 1.5x speed");
    for (const [pace, speed] of speeds) {
        for (const [stage, duration] of Object.entries(studioTiming(pace))) {
            assert(Math.abs(duration * speed - studioTiming(600)[stage]) < .001, `${speed}x scales ${stage} by the exact speed ratio`);
        }
    }
    assert(studioTiming(600).opening === 7000 && studioTiming(1200).opening === 14000, "Opening reading time is seven seconds at 1x and fourteen at 0.5x");
    const fixture = document.createElement("div");
    const text = document.createElement("span"), caret = document.createElement("span");
    fixture.append(text, caret);
    document.body.append(fixture);
    const preference = new EventTarget();
    preference.matches = reduced;
    const effects = createStudioMotion(preference);
    try {
        effects.type(text, caret, "<script>not executable</script>");
        assert(text.textContent === "<script>not executable</script>" && !text.querySelector("script"), "Typing renders only text, never markup");
        if (!reduced) {
            assert(text.getAnimations().length === 1 && !caret.hidden, "Typewriter has one bounded character reveal and a visible caret");
            preference.matches = true; preference.dispatchEvent(new Event("change"));
            await wait(40);
            assert(text.getAnimations().length === 0 && caret.hidden, "Switching reduced motion on immediately reveals text and removes the caret");
        }
        preference.matches = true;
        effects.type(text, caret, "Always readable");
        assert(text.textContent === "Always readable" && !text.getAnimations().length && caret.hidden, "Reduced-motion preference shows complete text without typing");
    } finally { effects.reset(); fixture.remove(); }
    for (const id of Object.keys(guidedLessons)) {
        for (const { step } of packetGroups(guidedLesson(id).steps)) {
            const command = sceneCommand(step);
            assert(typeof command === "string" && command.length > 0 && command.length <= 34, `${id} has a bounded, nonempty command caption`);
        }
    }
    assert(sceneCommand({ protocol: "WPA3 encrypted data", family: "DATA", summary: "Protected Wi-Fi frame." }) !== "Protected TLS record", "Non-TLS encryption is not mislabeled as TLS");
    location.hash = "#network"; dispatchEvent(new HashChangeEvent("hashchange"));
    change("network-mode", "guided");
    $("protocol-search").value = ""; $("protocol-search").dispatchEvent(new Event("input"));
    document.querySelector('[data-category="all"]').click();
    for (const [id, { entry }] of Object.entries(guidedLessons)) {
        pick(id);
        assert($("scene-callout").hidden && !$("scene-callout-detail").getAnimations().length, `${id} clears the prior lesson's entry and typing`);
        $("network-step").click();
        assert($("scene-callout-detail").textContent === entry.text && $("scene-shot-label").textContent === entry.heading, `${id} presents its own opening text and heading`);
        assert($("scene-callout").dataset.kind === entry.kind && $("scene-command-context").textContent === entry.context, `${id} uses its own opening style and context`);
        assert($("phase-live-detail").textContent.includes(entry.text), `${id} opening is available outside decorative artwork`);
    }
    pick("http"); change("network-speed", "1200"); change("network-step-unit", "hop");
    $("network-play").click();
    const command = $("scene-callout-detail");
    assert(command.textContent === "http://studio.test/guide", "HTTP opens with a web address even though its first modeled packet is DNS");
    assert($("scene-callout").getAttribute("aria-hidden") === "true" && $("phase-live-detail").textContent.includes("studio.test"), "Decorative typing does not replace the accessible complete explanation");
    const rows = $("packet-rows").children.length;
    if (!reduced) {
        let typing = command.getAnimations()[0];
        assert(typing.effect.getTiming().duration === studioTiming(1200).typing, "Typewriter uses the same scaled stage timing as playback");
        assert(typing?.effect.getTiming().easing.startsWith("steps("), "Caption uses discrete character reveal rather than a continuous wipe");
        assert($("scene-callout").getAnimations().length === 1, "The command window pops into its safe placement");
        assert($("phase-live-card").getAnimations().length === 1 && $("protocol-phase-title").getAnimations().length === 1, "Message card and phase heading have coordinated entrance effects");
        await wait(110);
        $("network-play").click();
        await typing.ready;
        const time = typing.currentTime;
        const camera = getComputedStyle($("topology-board")).transform;
        await wait(200);
        assert(typing.currentTime === time && typing.playState === "paused", "Pause freezes character reveal at the current character");
        assert(getComputedStyle($("topology-board")).transform === camera, "Pause freezes the camera rather than letting it finish moving");
        assert($("network").dataset.motionPaused === "true", "Receiving pulses share the explicit paused state");
        change("network-speed", "600");
        await typing.ready;
        assert(typing.playbackRate > 1, "Speed changes retime the paused presentation, without restarting it");
        $("network-play").click();
        await wait(100);
        assert(typing.currentTime > time && $("network").dataset.motionPaused === "false", "Resume continues typing and presentation from the paused position");
        $("network-play").click(); $("network-replay").click();
        assert(!command.getAnimations().length && $("scene-callout").hidden && $("scene-command-caret").hidden, "Replay cancels stale popups, typing and caret");
        change("network-speed", "1200");
        $("network-step").click(); await wait(80);
        typing = command.getAnimations()[0];
        const before = typing.currentTime;
        $("network-step").click();
        assert(command.getAnimations()[0] === typing && typing.currentTime >= before, "Forwarding the same message does not restart its typing");
        const packet = document.querySelector(".network-packet");
        document.querySelector('.device:not(.scene-outside)').click();
        assert(document.querySelector(".network-packet") === packet && $("network").dataset.traffic === "transit", "Inspecting an actor preserves packet and caption travel");
        assert($("packet-rows").children.length === rows, "Presentation effects never add synthetic packets");
        $("network-replay").click();
        for (let count = 0; count < 10; count++) { $("network-step").click(); $("network-back").click(); }
        assert($("scene-callout").hidden && !command.getAnimations().length, "Rapid forward/back input leaves no stale text animation");
        pick("https"); $("network-step").click(); pick("dhcp");
        assert($("scene-callout").hidden && !command.getAnimations().length && $("phase-live-card").hidden, "Changing lessons cancels the previous lesson's presentation");
        await wait(300);
        assert($("scene-callout").hidden && $("protocol-name").textContent === "DHCP", "No delayed callback can resurrect an old lesson's popup");
        pick("http"); $("network-play").click(); await wait(80);
        dispatchEvent(new PageTransitionEvent("pagehide"));
        assert($("network").dataset.playback === "paused" && command.getAnimations().every(animation => animation.playState === "paused"), "Page lifecycle pause also freezes presentation effects");
    } else {
        assert(!command.getAnimations().length && !$("scene-command-caret").getAnimations().length, "Reduced-motion Studio has no typewriter or caret animation");
        assert(!$("scene-callout").getAnimations().length && !$("phase-live-card").getAnimations().length, "Reduced-motion Studio skips popup and detail entrance motion");
    }
    $("network-replay").click(); change("network-speed", "600"); change("network-step-unit", "hop");
    return { passed, message: `${passed} Studio motion assertions passed.` };
}
