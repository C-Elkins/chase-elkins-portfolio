export async function runNetworkDirectorTests() {
    let passed = 0;
    const $ = id => document.getElementById(id);
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const change = (id, value) => { $(id).value = value; $(id).dispatchEvent(new Event("change")); };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pick = lesson => document.querySelector(`#protocol-picker [data-protocol="${lesson}"]`).click();
    const waitFor = async predicate => {
        for (let count = 0; count < 800 && !predicate(); count++) await wait(40);
        assert(predicate(), "Directed playback reaches its expected boundary");
    };
    location.hash = "#network"; dispatchEvent(new HashChangeEvent("hashchange"));
    change("network-mode", "guided");
    $("protocol-search").value = ""; $("protocol-search").dispatchEvent(new Event("input"));
    document.querySelector('[data-category="all"]').click();
    if ($("network-fit").getAttribute("aria-pressed") !== "true") $("network-fit").click();
    if ($("network-follow-scene").getAttribute("aria-pressed") !== "true") $("network-follow-scene").click();
    pick("http"); change("network-speed", "600"); change("network-step-unit", "hop");
    const overview = new DOMMatrix($("topology-board").style.transform);
    $("network-step").click();
    assert($("network").dataset.shot === "prepare" && document.querySelectorAll(".device:not(.scene-outside)").length === 1,
        "Preparation isolates the real source instead of starting with a wide route");
    assert(new DOMMatrix($("topology-board").style.transform).a > overview.a * 1.5, "Preparation is a meaningful close-up, not a slight crop");
    assert(!$("scene-callout").hidden && $("scene-flight-label").hidden, "Preparation has a local command window and no fictitious moving packet label");
    assert(!document.querySelector(".network-packet"), "The local setup shot does not invent network traffic");
    if (!reduced) {
        const typing = $("scene-callout-detail").getAnimations()[0];
        assert(typing.effect.getTiming().delay > 0, "Typing waits for the opening camera move rather than competing with it");
    }
    if (innerWidth >= 1360 && innerHeight >= 850) {
        await Promise.all($("topology-board").getAnimations().map(animation => animation.finished));
        assert(document.querySelector(".device:not(.scene-outside) .scene-icon").getBoundingClientRect().width >= 240,
            "Desktop preparation artwork grows to at least 240 CSS pixels, rather than a barely changed thumbnail");
    }
    $("network-step").click();
    assert($("network").dataset.shot === "exchange" && $("scene-callout").hidden && !$("scene-flight-label").hidden,
        "The camera pulls back to the exchange and swaps the local window for a traveling label");
    assert(document.querySelector(".scene-message-route")?.getTotalLength() > 0, "The complete modeled message route is visually established");
    assert($("scene-flight-title").textContent === $("phase-live-name").textContent, "The traveling badge and live details identify the same message");
    assert(getComputedStyle($("scene-flight-tether")).display !== "none", "The packet-to-label tether is actually rendered, not just populated with coordinates");
    await wait(70);
    if (!reduced) {
        const before = $("scene-flight-label").style.transform;
        await wait(90);
        assert($("scene-flight-label").style.transform !== before, "The label follows actual packet and camera positions, not a fixed receiving node");
    }
    const labelBounds = $("scene-flight-label").getBoundingClientRect();
    const viewport = document.querySelector(".topology-scroll").getBoundingClientRect();
    assert(labelBounds.left >= viewport.left && labelBounds.right <= viewport.right
        && labelBounds.top >= viewport.top && labelBounds.bottom <= viewport.bottom, "The screen-space packet label stays inside the diagram");
    assert(Math.abs(labelBounds.width - $("scene-flight-label").offsetWidth) < 1,
        "Screen-space label remains readable at its real CSS width instead of shrinking with the camera");
    const packet = document.querySelector(".network-packet");
    $("network-follow-scene").click();
    assert(document.querySelector(".network-packet") === packet && $("network").dataset.shot === "overview",
        "Turning the director off preserves the current packet");
    $("network-follow-scene").click();
    assert(document.querySelector(".network-packet") === packet, "Turning the director back on also preserves the packet");
    $("network-fit").click();
    const scroll = document.querySelector(".topology-scroll");
    scroll.scrollLeft = 100;
    scroll.dispatchEvent(new Event("scroll"));
    const panned = $("scene-flight-label").getBoundingClientRect();
    const port = scroll.getBoundingClientRect();
    assert(panned.left >= port.left && panned.right <= port.right && panned.top >= port.top && panned.bottom <= port.bottom,
        "Panning actual-size mode keeps its screen-space label inside the visible scrollport");
    $("network-fit").click();
    $("network-replay").click();
    assert($("scene-callout").hidden && $("scene-flight-label").hidden && $("scene-result").hidden, "Reset clears every stage-specific overlay");
    change("network-speed", "1200");
    $("network-play").click(); await wait(900);
    assert($("network-progress").value === 1 && $("network").dataset.shot === "prepare", "Automatic playback gives local setup time to be read");
    $("network-play").click();
    const progress = $("network-progress").value;
    const camera = getComputedStyle($("topology-board")).transform;
    await wait(150);
    assert($("network-progress").value === progress && getComputedStyle($("topology-board")).transform === camera,
        "Pausing a preparation shot freezes its dwell and camera");
    change("network-speed", "300");
    $("network-play").click();
    await waitFor(() => $("network").dataset.traffic === "transit" || reduced && $("network-progress").value > 1);
    if (!reduced) {
        $("network-play").click();
        await wait(30);
        const label = $("scene-flight-label").style.transform;
        const tether = $("scene-flight-tether").outerHTML;
        await wait(130);
        assert($("scene-flight-label").style.transform === label && $("scene-flight-tether").outerHTML === tether,
            "Pause freezes the traveling annotation and its tether with the packet");
        assert($("scene-flight-state").textContent === "PAUSED", "The on-packet label explicitly reflects pause");
        $("network-play").click();
    }
    await waitFor(() => $("network").dataset.playback !== "playing");
    assert($("network").dataset.shot === "complete" && !$("scene-result").hidden, "Only actual final delivery opens the result shot");
    assert($("scene-flight-label").hidden && !$("scene-callout").hidden, "Completion replaces the moving badge with the received output");
    assert(document.querySelector(".device:not(.scene-outside)")?.dataset.deviceId === "1", "HTTP result returns to its actual receiving client");
    assert(document.querySelector(".scene-result-target .scene-screen-output"), "The receiving client has an original rendered-output illustration");
    assert($("scene-result-detail").textContent.includes("7 conceptual messages") && $("scene-result-detail").textContent.includes("21 local and forwarding steps"),
        "The result summarizes modeled counts without fabricated latency or sizes");
    $("protocol-overview-show").click();
    assert(document.querySelector(".overview-heading .eyebrow").textContent === "Protocol overview", "The overview remains available after completion");
    $("protocol-step-show").click();
    assert(document.querySelector(".overview-heading .eyebrow").textContent === "Lesson summary", "Returning to the completed step restores its summary heading");
    $("network-back").click();
    assert($("scene-result").hidden && !document.querySelector(".scene-result-target"), "Seeking back removes the result instead of leaving a stale rendered screen");
    assert(document.querySelector(".scene-message-route") && getComputedStyle(document.querySelector(".scene-message-route")).opacity !== "0",
        "Seeking back restores the message route after the result shot");
    pick("https");
    const local = [...$("message-flow").children].find(button => button.textContent.includes("certificate verification"));
    assert(!!local, "TLS includes a real local-verification event");
    local.click();
    assert($("network").dataset.shot === "local" && document.querySelectorAll(".device:not(.scene-outside)").length === 1,
        "Actual local TLS verification gets its own close-up, not a fictitious network hop");
    $("protocol-inspector").close();
    pick("dhcp");
    assert($("scene-flight-label").hidden && $("scene-result").hidden && $("scene-callout").hidden, "Changing lessons cancels stale scene overlays");
    change("network-speed", "600");
    return { passed, message: `${passed} directed scene assertions passed.` };
}
