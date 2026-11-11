import { guidedLessons } from "../js/network-guided.mjs";
import { deviceArtwork } from "../js/network-icons.mjs";

export async function runNetworkSceneUITests() {
    let passed = 0;
    const $ = id => document.getElementById(id);
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const wait = delay => new Promise(resolve => setTimeout(resolve, delay));
    const intersects = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    location.hash = "#network"; window.dispatchEvent(new HashChangeEvent("hashchange"));
    $("network-mode").value = "guided"; $("network-mode").dispatchEvent(new Event("change"));
    $("network-step-unit").value = "hop"; $("network-speed").value = "600";
    $("protocol-search").value = ""; $("protocol-search").dispatchEvent(new Event("input"));
    document.querySelector('[data-category="all"]').click();
    if ($("network-fit").getAttribute("aria-pressed") !== "true") $("network-fit").click();
    await document.fonts.ready;
    assert(document.fonts.check('16px "Studio Mono"'), "Technical typeface is locally available");
    for (const id of Object.keys(guidedLessons)) {
        document.querySelector(`#protocol-picker [data-protocol="${id}"]`).click();
        const devices = [...document.querySelectorAll(".device")];
        assert($("topology-board").style.width === "1120px" && $("topology-board").style.height === "640px", `${id} uses a real spacious scene, not enlarged overlapping cards`);
        assert($("topology-lines").querySelectorAll(".network-link").length === Number($("topology-count").textContent.match(/(\d+) LINKS/)[1]) * 2, `${id} has a forward and return lane for every modeled connection`);
        for (const device of devices) {
            assert(device.querySelector(".scene-icon").viewBox.baseVal.width === 120, `${id} has detailed large SVG artwork`);
            assert(device.querySelector(".scene-icon").querySelectorAll("path").length >= 5, `${id} includes polygon faces, detail and ground shadow`);
            const name = device.querySelector(".device-name");
            const address = device.querySelector(".device-ip");
            assert(name.scrollHeight <= name.clientHeight + 1 && name.scrollWidth <= name.clientWidth + 1, `${id}/${name.textContent} name is not clipped`);
            assert(address.scrollWidth <= address.clientWidth + 1, `${id}/${name.textContent} address is contained`);
            for (const other of devices.filter(item => item !== device)) assert(!intersects(device.getBoundingClientRect(), other.getBoundingClientRect()), `${id} device artwork and caption do not overlap`);
            if (/proxy/i.test(name.textContent)) assert(device.querySelector("svg").dataset.artwork === "proxy", `${id} proxy never masquerades as a firewall appliance`);
        }
        $("network-step").click();
        const callout = $("scene-callout");
        assert(!callout.hidden && $("scene-callout-title").textContent.length > 0, `${id} exposes the active protocol in the scene`);
        for (const device of devices.filter(device => !device.classList.contains("scene-outside"))) assert(!intersects(callout.getBoundingClientRect(), device.getBoundingClientRect()), `${id} active packet annotation does not obscure visible labels`);
        assert($("scene-callout-title").textContent.startsWith(guidedLessons[id].name) && $("scene-packet-detail").textContent.length > 10, `${id} opening identifies the lesson while the real packet explanation remains readable outside the drawing`);
    }
    assert(deviceArtwork({ type: "router", name: "SIP proxy" }) === "proxy", "SIP proxy artwork reflects its service role");
    assert(deviceArtwork({ type: "ap", name: "WPA3 access point" }) === "ap", "Wireless access uses an AP, not a router");
    assert(deviceArtwork({ type: "internet", name: "Internet" }) === "internet", "WAN endpoints retain their cloud/globe illustration");
    document.querySelector('#protocol-picker [data-protocol="http"]').click();
    const first = document.querySelector(".device");
    const before = first.style.left;
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    assert(first.style.left !== before, "Guided artwork remains keyboard-positionable");
    $("scene-reset-layout").click();
    assert(document.querySelector(".device").style.left === before, "Reset layout restores safe illustration positions without changing lesson");
    $("network-step").click(); $("network-step").click();
    const packet = document.querySelector(".network-packet");
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        assert(packet.getAnimations().length === 1, "Packet travel uses one bounded animation, not an idle loop");
        await wait(70);
        const from = getComputedStyle(packet).transform;
        await wait(150);
        assert(getComputedStyle(packet).transform !== from, "Packet actually travels smoothly along its directional path");
        for (let count = 0; count < 60 && $("scene-packet-state").textContent === "IN TRANSIT"; count++) await wait(50);
        assert(document.querySelector(".device.processing") && $("scene-packet-state").textContent === "PROCESSING", "Arrival glows and holds at the receiving actor");
    } else assert(packet.getAnimations().length === 0, "Reduced-motion mode keeps the same protocol state without travel");
    const current = $("network-progress").value;
    $("scene-reset-layout").click();
    assert($("network-progress").value === current, "Layout reset preserves inspected hop and teaching state");
    const menu = document.querySelector(".studio-settings");
    menu.open = true;
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    assert($("network-progress").value === current, "Open settings do not accidentally step the trace");
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    assert(!menu.open, "Escape dismisses the view-settings dropdown");
    menu.open = true;
    $("network-focus").focus();
    $("network-focus").click();
    assert(!menu.open && document.activeElement === menu.querySelector("summary"), "Choosing a view closes settings and restores visible keyboard focus");
    $("network-focus").click();
    $("network-replay").click();
    assert($("scene-callout").hidden, "Replay removes stale on-scene packet annotations");
    return { passed, message: `${passed} illustrated scene UI assertions passed.` };
}
