export async function runNetworkWorkspaceTests() {
    let passed = 0;
    const $ = id => document.getElementById(id);
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const pick = id => document.querySelector(`#protocol-picker [data-protocol="${id}"]`).click();
    location.hash = "#network"; dispatchEvent(new HashChangeEvent("hashchange"));
    $("network-mode").value = "guided"; $("network-mode").dispatchEvent(new Event("change"));
    $("protocol-search").value = ""; $("protocol-search").dispatchEvent(new Event("input"));
    document.querySelector('[data-category="all"]').click();
    if ($("network-fit").getAttribute("aria-pressed") !== "true") $("network-fit").click();
    if ($("network-follow-scene").getAttribute("aria-pressed") !== "true") $("network-follow-scene").click();
    $("network-view").click(); pick("dns"); $("network-step").click(); $("network-step").click();
    const packet = document.querySelector(".network-packet");
    const firstRoute = $("topology-board").style.transform;
    $("network-fit").click();
    assert($("network-fit").textContent === "Fit diagram" && $("network-fit").getAttribute("aria-pressed") === "false",
        "Fit has a stable label and accurately reports actual-size mode");
    assert($("network-follow-scene").getAttribute("aria-pressed") === "false", "Actual-size mode does not falsely advertise an active follow camera");
    $("network-follow-scene").click();
    assert($("network-fit").getAttribute("aria-pressed") === "true" && $("network-follow-scene").getAttribute("aria-pressed") === "true",
        "Enabling Follow from actual-size mode restores Fit");
    assert(document.querySelector(".network-packet") === packet, "Fit and Follow preserve the same packet instead of restarting delivery");
    $("message-flow").children[1].click(); $("protocol-inspector").close();
    const visible = [...document.querySelectorAll(".device:not(.scene-outside)")].map(device => device.querySelector(".device-name").textContent);
    assert(visible.includes("Root") && visible.includes("Resolver") && !visible.includes("Laptop"),
        "DNS follow frames the current referral route, not unrelated actors elsewhere in the phase");
    assert($("topology-board").style.transform !== firstRoute, "The camera moves to the next message's actual route");
    pick("http"); $("sequence-view").click();
    assert($("sequence-actors").children.length === 3 && $("sequence-actors").textContent.includes("192.168.10.53"),
        "Sequence shows full names and addresses for the real message endpoints");
    $("message-flow").lastElementChild.click(); $("protocol-inspector").close();
    await wait(50);
    const port = $("network-sequence-view");
    const current = $("network-sequence").querySelector(".sequence-row.current");
    const bounds = port.getBoundingClientRect(), row = current.getBoundingClientRect();
    const header = $("sequence-actors").getBoundingClientRect();
    assert(port.scrollTop > 0 && row.top >= header.bottom - 1 && row.bottom <= bounds.bottom + 1,
        "Sequence follows the active message inside its own scrollport");
    assert(Math.abs(header.top - bounds.top) < 2, "Participant names stay pinned while messages scroll");
    assert(window.scrollY === 0, "Following sequence never scrolls the page");
    assert($("network-sequence").querySelectorAll(".sequence-label").length === 7,
        "Each logical message has a separate readable timeline band");
    assert($("network-fit").hidden && $("scene-reset-layout").hidden, "Sequence hides irrelevant diagram-only controls");
    $("network-follow-scene").click();
    port.scrollTop = 0;
    $("message-flow").children[5].click(); $("protocol-inspector").close();
    await wait(50);
    assert(port.scrollTop === 0, "Turning Follow off lets the user keep their place in Sequence");
    $("network-follow-scene").click();
    assert(port.scrollTop > 0, "Turning Follow back on brings the active message into view");
    if (innerWidth >= 1000 && innerHeight >= 600) {
        const table = $("packet-table-scroll").getBoundingClientRect();
        const toolbar = document.querySelector(".packet-toolbar").getBoundingClientRect();
        const panels = document.querySelector(".simulation").getBoundingClientRect();
        assert(toolbar.top >= 0 && panels.bottom <= innerHeight && table.height >= 65,
            "Packet controls and a readable table body remain in the viewport");
        assert($("packet-table-scroll").scrollWidth <= $("packet-table-scroll").clientWidth + 1,
            "Desktop Packet Flow needs no horizontal scrolling to find Info");
    }
    $("network-view").click(); pick("http");
    return { passed, message: `${passed} workspace framing and sequence assertions passed.` };
}
