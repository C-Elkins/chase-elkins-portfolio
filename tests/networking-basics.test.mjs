import { osiLayers, parseIPv4, parsePrefix, compareSubnet, printerTroubleshooter, troubleshootStep, troubleshootAnswer } from "../js/networking-basics-model.mjs";
import { guidedLessons } from "../js/network-guided.mjs";

export function runNetworkingBasicsModelTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    assert(osiLayers.length === 7 && osiLayers[0].name === "Physical" && osiLayers[6].name === "Application", "Seven ordered OSI layers");
    assert(osiLayers.every(layer => layer.summary.length > 20 && layer.examples.length > 3), "Every layer has a summary and examples");
    assert(parseIPv4("192.168.1.20") === 3232235796, "Parses dotted IPv4");
    for (const bad of ["256.1.1.1", "1.2.3", "01.2.3.4", "a.b.c.d", "1.2.3.4.5", ""]) assert(parseIPv4(bad) === null, `Rejects ${bad || "empty"}`);
    assert(parsePrefix("/24") === 24 && parsePrefix("24") === 24 && parsePrefix("255.255.255.0") === 24, "Prefix and mask forms agree");
    assert(parsePrefix("255.255.255.255") === 32 && parsePrefix("0.0.0.0") === 0 && parsePrefix("/0") === 0, "Edge prefixes");
    assert(parsePrefix("255.0.255.0") === null && parsePrefix("/33") === null, "Rejects non-contiguous masks and out-of-range prefixes");
    const same = compareSubnet("192.168.1.20", "192.168.1.45", "/24");
    assert(same.ok && same.same && same.networkA === "192.168.1.0/24" && same.usable === 254 && same.broadcast === "192.168.1.255" && same.mask === "255.255.255.0", "Same /24 subnet");
    const different = compareSubnet("192.168.1.20", "192.168.50.12", "255.255.255.0");
    assert(different.ok && !different.same && different.networkB === "192.168.50.0/24", "Guest network is different");
    const wide = compareSubnet("10.0.3.7", "10.0.200.9", "/16");
    assert(wide.ok && wide.same && wide.usable === 65534, "Larger /16 subnet");
    const small = compareSubnet("192.168.1.130", "192.168.1.100", "/25");
    assert(small.ok && !small.same && small.networkA === "192.168.1.128/25", "/25 splits a /24");
    assert(compareSubnet("10.0.0.1", "10.0.0.2", "/31").broadcast === null, "/31 has no broadcast");
    assert(!compareSubnet("1.2.3", "1.2.3.4", "/24").ok && !compareSubnet("1.2.3.4", "1.2.3.5", "/40").ok, "Invalid input reports errors");
    const visited = new Set();
    const walk = (id, depth) => {
        assert(depth < 20 && troubleshootStep(id), `Step ${id} exists`);
        visited.add(id);
        for (const answer of [true, false]) {
            const result = troubleshootAnswer(id, answer);
            assert(result && (result.next || result.fix.length > 30), `${id} ${answer} leads somewhere useful`);
            if (result.next) walk(result.next, depth + 1);
        }
    };
    walk(printerTroubleshooter.start, 0);
    assert(visited.size === Object.keys(printerTroubleshooter.steps).length, "Every troubleshooting step is reachable");
    return `Networking basics model tests passed: ${passed} assertions.`;
}

export async function runNetworkingBasicsUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const tick = () => new Promise(resolve => setTimeout(resolve, 30));
    const go = async hash => { history.pushState(null, "", hash); dispatchEvent(new HashChangeEvent("hashchange")); await tick(); };

    await go("#network");
    const chips = [...$("network-layers").querySelectorAll("button.osi-chip")];
    assert(chips.length === 7 && chips.map(chip => chip.textContent).join("") === "1234567", "Seven focusable OSI chips");
    assert($("network-layers").getAttribute("role") === "group", "OSI chips are an accessible group, not a flattened image");
    assert(chips.every((chip, index) => chip.getAttribute("aria-label").includes(osiLayers[index].name) && chip.getAttribute("aria-describedby") === "osi-tooltip"), "Each chip names its layer");
    const tooltip = $("osi-tooltip");
    assert(tooltip.parentElement === document.body && tooltip.hidden, "Tooltip lives outside clipped containers and starts hidden");
    for (const [index, chip] of chips.entries()) {
        chip.focus();
        await new Promise(requestAnimationFrame);
        assert(!tooltip.hidden && tooltip.querySelector(".osi-tooltip-name").textContent === osiLayers[index].name, `Focus shows layer ${index + 1}`);
        assert(tooltip.querySelector(".osi-tooltip-summary").textContent === osiLayers[index].summary, `Layer ${index + 1} summary`);
        assert(tooltip.querySelector(".osi-tooltip-focus").hidden === !chip.classList.contains("layer-current"), `Layer ${index + 1} marks lesson focus correctly`);
        const box = tooltip.getBoundingClientRect();
        const chipBox = chip.getBoundingClientRect();
        assert(box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, `Layer ${index + 1} tooltip stays on screen`);
        assert(box.top >= chipBox.bottom || box.bottom <= chipBox.top, `Layer ${index + 1} tooltip does not cover its chip`);
    }
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert(tooltip.hidden, "Escape dismisses the tooltip");
    chips[2].click();
    await tick();
    assert($("protocol-osi").open, "Clicking a chip opens the OSI guide");
    const guide = [...$("osi-guide-list").children];
    assert(guide[2].classList.contains("osi-guide-active") && guide.filter(item => item.classList.contains("osi-guide-active")).length === 1, "Guide highlights the chosen layer");
    $("protocol-osi").close();
    document.activeElement.blur();
    assert(tooltip.hidden, "Blur hides the tooltip");

    await go("#learn");
    assert(!$("learn").hidden && $("network").hidden, "Networking 101 is its own Lab section");
    assert(document.querySelector('.lab-tabs a[href="#learn"]').getAttribute("aria-current") === "location", "Networking 101 tab is current");
    const navTargets = [...document.querySelectorAll("#learn .lesson-nav a, #learn-module-map a")].map(link => link.hash.slice(1));
    assert(navTargets.length >= 16 && navTargets.every(id => $(id) && $("learn").contains($(id))), "Every chapter link has a target");
    assert($("learn-printers") && $("printer-protocols").textContent.includes("631") && $("printer-protocols").textContent.includes("9100"), "Printer subsection covers printing ports");
    const arts = [...document.querySelectorAll("#learn .learn-art")];
    assert(arts.length >= 13 && arts.every(slot => slot.querySelector("svg.scene-icon path")), "Polygon artwork renders in every device card");
    assert($("learn-layer-list").children.length === 7 && $("learn-layer-list").firstElementChild.textContent.includes("Application"), "Layer stack renders top-down");
    const studioLinks = [...document.querySelectorAll("#learn [data-studio-lesson]")];
    assert(studioLinks.length >= 15 && studioLinks.every(link => guidedLessons[link.dataset.studioLesson]), "Studio links target real lessons");

    await go("#learn-addresses");
    assert($("subnet-result").dataset.state === "same" && $("subnet-result").textContent.includes("192.168.1.0/24"), "Subnet checker starts with a worked example");
    $("subnet-guest").click();
    assert($("subnet-result").dataset.state === "different" && $("subnet-result").textContent.includes("gateway"), "Guest example explains routing");
    $("subnet-b").value = "300.1.1.1";
    $("subnet-b").dispatchEvent(new Event("input"));
    assert($("subnet-result").dataset.state === "error", "Invalid address is explained");
    $("subnet-printer").click();
    assert($("subnet-result").dataset.state === "same", "Printer example restores same subnet");

    await go("#printer-fix");
    assert($("printer-question").textContent.length > 20 && $("printer-trail").children.length === 0, "Troubleshooter starts at the first question");
    $("printer-yes").click(); $("printer-yes").click(); $("printer-no").click();
    assert($("printer-trail").children.length === 3 && $("printer-fix-result").textContent.startsWith("Try this:"), "Answers lead to a fix");
    assert($("printer-yes").hidden && document.activeElement === $("printer-restart"), "Finished troubleshooter moves focus to restart");
    $("printer-restart").click();
    assert($("printer-trail").children.length === 0 && !$("printer-yes").hidden && $("printer-fix-result").textContent === "", "Restart resets");

    studioLinks.find(link => link.dataset.studioLesson === "dns").click();
    await tick();
    assert(!$("network").hidden && location.hash === "#network", "Studio link opens the Network Studio");
    assert($("network-now").textContent.includes("DNS"), "Studio link loads the matching lesson");
    return `Networking basics UI tests passed: ${passed} assertions.`;
}
