import { networkIcon } from "./network-icons.mjs?v=2026-11-10-directed-2";
import { osiLayers, compareSubnet, printerTroubleshooter, troubleshootStep, troubleshootAnswer } from "./networking-basics-model.mjs";
import { initializeNetworkingCourse } from "./networking-course.js?v=2026-11-11-module-view-1";

const $ = id => document.getElementById(id);
const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

export function initializeNetworkingBasics() {
    document.querySelectorAll("#learn .learn-art[data-art]").forEach(slot => slot.replaceChildren(networkIcon(slot.dataset.art, true)));

    $("learn-layer-list").replaceChildren(...osiLayers.map((layer, index) => {
        const item = make("li");
        item.append(make("span", String(index + 1), "learn-layer-number"), make("strong", layer.name), make("span", layer.summary), make("small", layer.examples));
        return item;
    }).reverse());

    const renderSubnet = () => {
        const result = compareSubnet($("subnet-a").value, $("subnet-b").value, $("subnet-prefix").value);
        const box = $("subnet-result");
        box.dataset.state = !result.ok ? "error" : result.same ? "same" : "different";
        if (!result.ok) { box.replaceChildren(make("strong", "Check the input"), make("span", result.error)); return; }
        const verdict = result.same
            ? "They can talk directly: A finds B's MAC address with ARP and sends the frame through the switch or access point. No router needed."
            : "A must send the traffic to its default gateway (the router), which forwards it, if routing and firewall rules allow. Automatic discovery such as mDNS usually won't cross.";
        const facts = make("dl", undefined, "learn-subnet-facts");
        [["Mask", `${result.mask} (/${result.prefix})`], ["A's network", result.networkA], ["B's network", result.networkB], ["Usable hosts", result.usable.toLocaleString("en-US")], ["Broadcast", result.broadcast || "n/a for /31 and /32"]]
            .forEach(([label, value]) => { const row = make("div"); row.append(make("dt", label), make("dd", value)); facts.append(row); });
        box.replaceChildren(make("strong", result.same ? "✓ Same subnet" : "↔ Different subnets"), make("span", verdict), facts);
    };
    ["subnet-a", "subnet-b", "subnet-prefix"].forEach(id => $(id).addEventListener("input", renderSubnet));
    const example = (a, b, prefix) => () => { $("subnet-a").value = a; $("subnet-b").value = b; $("subnet-prefix").value = prefix; renderSubnet(); };
    $("subnet-printer").addEventListener("click", example("192.168.1.20", "192.168.1.45", "/24"));
    $("subnet-guest").addEventListener("click", example("192.168.1.20", "192.168.50.12", "255.255.255.0"));
    renderSubnet();

    let current = printerTroubleshooter.start;
    const renderPrinter = () => {
        const step = troubleshootStep(current);
        $("printer-question").textContent = step ? step.question : "";
        $("printer-question").hidden = !step;
        $("printer-yes").hidden = $("printer-no").hidden = !step;
    };
    const answer = yes => {
        const step = troubleshootStep(current);
        const result = troubleshootAnswer(current, yes);
        if (!step || !result) return;
        const trail = make("li");
        trail.append(make("span", step.question), make("strong", yes ? "Yes" : "No"));
        $("printer-trail").append(trail);
        if (result.next) { current = result.next; $("printer-fix-result").textContent = ""; }
        else { current = null; $("printer-fix-result").textContent = `Try this: ${result.fix}`; }
        renderPrinter();
        (current ? $("printer-yes") : $("printer-restart")).focus({ preventScroll: true });
    };
    $("printer-yes").addEventListener("click", () => answer(true));
    $("printer-no").addEventListener("click", () => answer(false));
    $("printer-restart").addEventListener("click", () => {
        current = printerTroubleshooter.start;
        $("printer-trail").replaceChildren();
        $("printer-fix-result").textContent = "";
        renderPrinter();
        $("printer-yes").focus({ preventScroll: true });
    });
    renderPrinter();
    return initializeNetworkingCourse();
}
