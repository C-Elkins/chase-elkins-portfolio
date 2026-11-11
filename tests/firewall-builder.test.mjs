import { missions, MAX_RULES } from "../js/firewall-model.mjs";
import { missionSolutions } from "./firewall-model.test.mjs";

export async function runFirewallBuilderTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await settle();
    };
    const rows = () => [...$("fw-rule-list").children];
    const control = (index, field) => rows()[index].querySelector(`[data-field="${field}"]`);
    const setField = async (index, field, value) => {
        const element = control(index, field);
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
        await settle();
    };
    const missionButton = id => $("fw-missions").querySelector(`[data-mission="${id}"]`);
    const pick = async id => { missionButton(id).click(); await settle(); };
    const clear = async () => {
        while (rows().length) { rows()[0].querySelector("[data-remove]").click(); await settle(); }
    };
    const enter = async rules => {
        await clear();
        for (const [index, rule] of rules.entries()) {
            $("fw-add").click();
            await settle();
            await setField(index, "action", rule[0]);
            await setField(index, "protocol", rule[1]);
            await setField(index, "source", rule[2]);
            await setField(index, "destination", rule[3]);
            await setField(index, "port", rule[4]);
        }
    };
    const score = () => $("fw-score").textContent;
    const visible = element => getComputedStyle(element).display !== "none" && !element.closest("[hidden]");
    const originalHash = location.hash;
    try {
        await go("#firewall");
        assert(!$("firewall").hidden && $("lab-current-title").textContent === "Firewall rule builder", "Firewall builder opens from the lab menu route");
        assert($("fw-missions").children.length === missions.length + 1, "Every mission plus the sandbox is listed");
        assert(missionButton("publish-web").getAttribute("aria-pressed") === "true", "First mission is selected");
        assert($("fw-title").textContent === missions[0].title && $("fw-zones").children.length === missions[0].zones.length, "Mission brief and address book render");
        assert($("fw-empty").hidden === false && rows().length === 0, "Empty rule table explains the default policy");
        assert($("fw-results").children.length === missions[0].tests.length, "Every mission check is listed");
        assert(!$("fw-status").classList.contains("success"), "Mission starts incomplete");

        $("fw-add").click();
        await settle();
        assert(rows().length === 1 && document.activeElement === control(0, "action"), "Add rule focuses the new row");
        assert(control(0, "source").getAttribute("aria-label") === "Rule 1 source", "Rule fields have row-specific labels");
        await setField(0, "destination", "10.0.1.10/24");
        assert(control(0, "destination").getAttribute("aria-invalid") === "true" && rows()[0].classList.contains("is-invalid"), "Invalid fields are marked");
        const error = rows()[0].querySelector(".fw-row-error");
        assert(!error.hidden && error.textContent.includes("10.0.1.0/24") && control(0, "destination").getAttribute("aria-describedby") === error.id, "Field error suggests a fix and is linked");
        assert($("fw-warnings").textContent.includes("errors and will be skipped"), "Invalid rules are summarised");
        await setField(0, "destination", "10.0.1.10");
        await setField(0, "port", "80,443");
        assert(error.hidden && !control(0, "destination").hasAttribute("aria-invalid"), "Fixing the field clears the error");
        assert($("fw-status").classList.contains("success") && score() === `${missions[0].tests.length} / ${missions[0].tests.length} passing`, "Correct rule completes the first mission");
        assert(missionButton("publish-web").classList.contains("is-complete") && $("fw-progress-label").textContent.startsWith("1 of"), "Completion is shown in the mission picker");
        assert(document.activeElement === control(0, "port"), "Live grading keeps focus in the field being edited");

        await setField(0, "protocol", "icmp");
        assert(control(0, "port").value === "any", "Switching to ICMP clears ports it cannot use");
        await setField(0, "protocol", "tcp");
        await setField(0, "port", "80,443");

        await pick("order-matters");
        assert(rows().length === 2 && control(0, "action").value === "allow" && !$("fw-status").classList.contains("success"), "Order mission starts with the allow above the block");
        const failing = [...$("fw-results").children].find(item => item.classList.contains("fail"));
        failing.querySelector("button").click();
        await settle();
        assert($("fw-verdict").dataset.action === "allow" && rows()[0].classList.contains("is-hit") && document.activeElement === $("fw-verdict"), "Trace replays a failing check and highlights the deciding rule");
        assert($("fw-trace").children.length === 3 && $("fw-trace").children[1].classList.contains("not-reached"), "Trace shows later rules are never checked");
        rows()[1].querySelector('[data-move="up"]').click();
        await settle();
        assert(control(0, "action").value === "deny" && document.activeElement === rows()[0].querySelector('[data-move="down"]'), "Moving a rule keeps keyboard focus on it");
        assert($("fw-status").classList.contains("success"), "Reordering fixes the mission");
        assert($("fw-verdict").dataset.action === "deny" && rows()[0].classList.contains("is-hit"), "Open trace updates live after reordering");

        await pick("publish-web");
        assert(rows().length === 1 && control(0, "port").value === "80,443" && $("fw-status").classList.contains("success"), "Each mission keeps its own draft");

        await pick("capstone");
        assert($("fw-default").value === "allow" && $("fw-warnings").textContent.includes("Default allow"), "Capstone starts with a risky default allow");
        await enter(missionSolutions.capstone.rules);
        assert(!$("fw-status").classList.contains("success"), "Rules alone are not enough with default allow");
        $("fw-default").value = "deny";
        $("fw-default").dispatchEvent(new Event("change", { bubbles: true }));
        await settle();
        assert($("fw-status").classList.contains("success") && $("fw-score-bar").value === $("fw-score-bar").max, "Default deny completes the capstone");

        for (const mission of missions) {
            await pick(mission.id);
            const solution = missionSolutions[mission.id];
            if (!missionButton(mission.id).classList.contains("is-complete")) {
                await enter(solution.rules);
                $("fw-default").value = solution.defaultAction;
                $("fw-default").dispatchEvent(new Event("change", { bubbles: true }));
                await settle();
            }
            assert($("fw-status").classList.contains("success"), `${mission.title} can be solved in the UI`);
        }
        assert($("fw-progress-label").textContent === `${missions.length} of ${missions.length} missions complete` && $("fw-status").textContent.includes("finished every mission"), "Finishing all missions is celebrated");

        await pick("monitoring");
        $("fw-reset").click();
        await settle();
        assert(rows().length === 0 && !$("fw-status").classList.contains("success") && document.activeElement === $("fw-reset"), "Reset restores the starter rules");
        assert(missionButton("monitoring").classList.contains("is-complete"), "Reset keeps earned completion");

        await pick("sandbox");
        assert($("fw-results").children.length === 0 && $("fw-score").textContent.includes("Sandbox") && $("fw-solution-box").hidden, "Sandbox has no checks");
        $("fw-packet-protocol").value = "icmp";
        $("fw-packet-protocol").dispatchEvent(new Event("change", { bubbles: true }));
        assert($("fw-packet-port").disabled, "ICMP packets have no port");
        $("fw-packet-protocol").value = "tcp";
        $("fw-packet-protocol").dispatchEvent(new Event("change", { bubbles: true }));
        $("fw-packet-source").value = "999.1.1.1";
        $("fw-packet-port").value = "70000";
        $("fw-packet-form").requestSubmit();
        await settle();
        assert($("fw-packet-source").getAttribute("aria-invalid") === "true" && $("fw-packet-port").getAttribute("aria-invalid") === "true" && $("fw-packet-error").textContent.length > 20, "Packet tester validates input");
        $("fw-packet-source").value = "198.51.100.24";
        $("fw-packet-destination").value = "10.0.1.10";
        $("fw-packet-port").value = "22";
        $("fw-packet-form").requestSubmit();
        await settle();
        assert(!$("fw-packet-source").hasAttribute("aria-invalid") && $("fw-verdict").dataset.action === "deny" && $("fw-trace").lastElementChild.classList.contains("matched"), "Empty sandbox falls through to default deny");
        await enter([["allow", "any", "any", "any", "any"], ["deny", "tcp", "any", "any", "22"]]);
        assert($("fw-warnings").textContent.includes("allows every packet") && $("fw-warnings").textContent.includes("shadowed") && rows()[1].classList.contains("is-warning"), "Sandbox warns about allow-all and shadowed rules");
        $("fw-packet-form").requestSubmit();
        await settle();
        assert($("fw-verdict").dataset.action === "allow" && $("fw-trace").children[0].classList.contains("matched"), "First match wins in the sandbox trace");
        const marker = "<img src=x>";
        await setField(1, "source", marker);
        assert(!$("firewall").querySelector("img") && rows()[1].querySelector(".fw-row-error").textContent.includes(marker), "Rule text is rendered literally");
        await clear();
        for (let index = 0; index < MAX_RULES; index++) $("fw-add").click();
        await settle();
        assert(rows().length === MAX_RULES && $("fw-add").disabled && $("fw-rule-count").textContent === `${MAX_RULES} / ${MAX_RULES} rules`, "Rule table caps at the maximum");
        await clear();
        assert(document.activeElement === $("fw-add") && !$("fw-empty").hidden, "Deleting the last rule returns focus to Add");

        await pick("capstone");
        assert(document.documentElement.scrollWidth <= innerWidth, `No horizontal overflow at ${innerWidth}px`);
        [...$("firewall").querySelectorAll("button, input, select")].filter(visible).forEach(element => {
            const box = element.getBoundingClientRect();
            assert(box.right <= innerWidth + 1 && box.left >= -1, `${element.getAttribute("aria-label") || element.id || element.textContent.trim().slice(0, 20)} stays on screen`);
            assert(box.height >= 38, `${element.getAttribute("aria-label") || element.id || element.textContent.trim().slice(0, 20)} is tall enough to tap`);
        });
        await pick("publish-web");
    }
    finally {
        history.replaceState(null, "", originalHash || "#network");
        dispatchEvent(new HashChangeEvent("hashchange"));
    }
    return `Firewall builder UI tests passed: ${passed} assertions.`;
}
