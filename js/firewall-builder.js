import { MAX_RULES, ruleProtocols, ruleActions, missions, gradeMission, compileRule, parsePacket, evaluatePacket, describePacket, describeRule } from "./firewall-model.mjs";
import { formatIPv4 } from "./subnet-sprint-model.mjs";

const sandbox = {
    id: "sandbox", title: "Sandbox", level: "Free build",
    brief: "No checks, no wrong answers. Build any policy you like, then send packets through it with the tester to see exactly which rule decides each one.",
    teach: "Try putting a broad allow above a narrow deny, then watch the warnings explain why the deny can never fire.",
    zones: [...new Map(missions.flatMap(mission => mission.zones).map(zone => [zone.name, zone])).values()],
    defaultAction: "deny", starter: [], tests: [], solution: "There is no single answer here. Use the missions for guided practice."
};
const protocolLabels = { any: "Any", tcp: "TCP", udp: "UDP", icmp: "ICMP" };
const actionLabels = { allow: "Allow", deny: "Deny" };

export function initializeFirewallBuilder() {
    const $ = id => document.getElementById(id);
    const make = (tag, text, className) => {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    };
    const all = [...missions, sandbox];
    const drafts = new Map();
    const completed = new Set();
    let mission = missions[0];
    let draft = null;
    let lastGrade = null;
    let lastTrace = null;
    let rowSerial = 0;
    const clone = rules => rules.map(rule => ({ ...rule, key: ++rowSerial }));
    const draftFor = item => {
        if (!drafts.has(item.id)) drafts.set(item.id, { rules: clone(item.starter), defaultAction: item.defaultAction });
        return drafts.get(item.id);
    };

    function renderMissionPicker() {
        $("fw-missions").replaceChildren(...all.map((item, index) => {
            const button = make("button", undefined, "fw-mission");
            button.type = "button";
            button.dataset.mission = item.id;
            button.setAttribute("aria-pressed", String(item === mission));
            const done = completed.has(item.id);
            button.append(make("span", item.id === "sandbox" ? "∞" : done ? "✓" : String(index + 1).padStart(2, "0"), "fw-mission-mark"), make("span", item.title, "fw-mission-title"), make("small", done ? "Complete" : item.level));
            button.classList.toggle("is-complete", done);
            button.setAttribute("aria-label", `${item.title}, ${item.level}${done ? ", complete" : ""}`);
            button.addEventListener("click", () => selectMission(item.id, true));
            return button;
        }));
        $("fw-progress-label").textContent = `${completed.size} of ${missions.length} missions complete`;
    }

    function renderBrief() {
        $("fw-level").textContent = mission.level;
        $("fw-title").textContent = mission.title;
        $("fw-brief").textContent = mission.brief;
        $("fw-teach").textContent = mission.teach;
        $("fw-solution").textContent = mission.solution;
        $("fw-solution-box").open = false;
        $("fw-solution-box").hidden = mission === sandbox;
        $("fw-zones").replaceChildren(...mission.zones.map(zone => {
            const row = make("div");
            const term = make("dt", zone.name);
            const value = make("dd");
            value.append(make("code", zone.address), make("span", zone.note));
            row.append(term, value);
            return row;
        }));
    }

    function field(rule, index, name, label) {
        const id = `fw-rule-${rule.key}-${name}`;
        let control;
        if (name === "action" || name === "protocol") {
            control = document.createElement("select");
            (name === "action" ? ruleActions : ruleProtocols).forEach(value => {
                const option = make("option", name === "action" ? actionLabels[value] : protocolLabels[value]);
                option.value = value;
                control.append(option);
            });
        }
        else {
            control = document.createElement("input");
            control.autocomplete = "off";
            control.spellcheck = false;
            control.maxLength = name === "port" ? 48 : 18;
            control.placeholder = name === "port" ? "any, 443, 80,443" : "any or 10.0.1.0/24";
        }
        control.id = id;
        control.value = rule[name];
        control.dataset.field = name;
        control.setAttribute("aria-label", `Rule ${index + 1} ${label}`);
        control.setAttribute("aria-describedby", `fw-rule-${rule.key}-error`);
        control.addEventListener(name === "action" || name === "protocol" ? "change" : "input", () => {
            rule[name] = control.value;
            if (name === "protocol" && (control.value === "icmp" || control.value === "any") && rule.port.trim() && rule.port.trim().toLowerCase() !== "any") {
                rule.port = "any";
                control.closest("li").querySelector('[data-field="port"]').value = "any";
            }
            if (name === "action") control.closest("li").dataset.action = control.value;
            evaluate();
        });
        const wrapper = make("span", undefined, `fw-cell fw-cell-${name}`);
        wrapper.append(make("span", label, "fw-cell-label"), control);
        return wrapper;
    }

    function moveRule(index, offset) {
        const target = index + offset;
        if (target < 0 || target >= draft.rules.length) return;
        [draft.rules[index], draft.rules[target]] = [draft.rules[target], draft.rules[index]];
        renderRules();
        evaluate();
        const row = $("fw-rule-list").children[target];
        const button = row.querySelector(offset < 0 ? '[data-move="up"]' : '[data-move="down"]');
        (button.disabled ? row.querySelector("[data-move]:not(:disabled)") : button)?.focus({ preventScroll: true });
    }

    function renderRules() {
        const list = $("fw-rule-list");
        list.replaceChildren(...draft.rules.map((rule, index) => {
            const row = make("li", undefined, "fw-rule");
            row.dataset.key = String(rule.key);
            row.dataset.action = rule.action;
            row.append(make("span", String(index + 1), "fw-index"));
            row.append(field(rule, index, "action", "action"), field(rule, index, "protocol", "protocol"), field(rule, index, "source", "source"), field(rule, index, "destination", "destination"), field(rule, index, "port", "port"));
            const tools = make("span", undefined, "fw-row-tools");
            const button = (text, label, handler, move) => {
                const control = make("button", text, "quiet");
                control.type = "button";
                control.setAttribute("aria-label", label);
                if (move) control.dataset.move = move;
                control.addEventListener("click", handler);
                return control;
            };
            const up = button("↑", `Move rule ${index + 1} up`, () => moveRule(index, -1), "up");
            const down = button("↓", `Move rule ${index + 1} down`, () => moveRule(index, 1), "down");
            up.disabled = index === 0;
            down.disabled = index === draft.rules.length - 1;
            const remove = button("✕", `Delete rule ${index + 1}`, () => {
                draft.rules.splice(index, 1);
                renderRules();
                evaluate();
                const rows = $("fw-rule-list").children;
                (rows[Math.min(index, rows.length - 1)]?.querySelector("select") || $("fw-add")).focus({ preventScroll: true });
            });
            remove.dataset.remove = "";
            tools.append(up, down, remove);
            row.append(tools);
            const error = make("p", "", "fw-row-error");
            error.id = `fw-rule-${rule.key}-error`;
            error.hidden = true;
            row.append(error);
            return row;
        }));
        $("fw-empty").hidden = draft.rules.length > 0;
        $("fw-add").disabled = draft.rules.length >= MAX_RULES;
        $("fw-rule-count").textContent = `${draft.rules.length} / ${MAX_RULES} rules`;
        $("fw-default").value = draft.defaultAction;
    }

    function renderRowState(grade) {
        [...$("fw-rule-list").children].forEach((row, index) => {
            const result = grade.compiled[index];
            const messages = Object.values(result.errors);
            row.querySelectorAll("[data-field]").forEach(control => {
                if (result.errors[control.dataset.field]) control.setAttribute("aria-invalid", "true");
                else control.removeAttribute("aria-invalid");
            });
            const error = row.querySelector(".fw-row-error");
            error.textContent = messages.length ? `Rule ${index + 1}: ${messages.join(" ")}` : "";
            error.hidden = !messages.length;
            row.classList.toggle("is-invalid", messages.length > 0);
            const warning = grade.warnings.find(item => item.index === index);
            row.classList.toggle("is-warning", Boolean(warning));
            const trace = lastTrace?.trace[index];
            row.classList.toggle("is-hit", trace?.status === "matched");
            row.classList.toggle("is-skipped", trace?.status === "skipped");
        });
    }

    function renderResults(grade) {
        const total = grade.total;
        $("fw-score").textContent = mission === sandbox ? "Sandbox / no checks" : `${grade.passed} / ${total} passing`;
        $("fw-score-bar").max = Math.max(1, total);
        $("fw-score-bar").value = grade.passed;
        $("fw-score-bar").textContent = `${grade.passed} of ${total}`;
        $("fw-score-bar").hidden = mission === sandbox;
        $("fw-results").replaceChildren(...grade.results.map((result, index) => {
            const item = make("li", undefined, `fw-result ${result.passed ? "pass" : "fail"}`);
            const decided = result.outcome.matchedIndex < 0 ? `default ${result.outcome.action}` : `rule ${result.outcome.matchedIndex + 1}`;
            const head = make("div", undefined, "fw-result-head");
            head.append(make("span", result.passed ? "✓ PASS" : "✗ FAIL", "fw-result-mark"), make("strong", result.why));
            const detail = make("p", undefined, "fw-result-detail");
            detail.append(make("code", describePacket(result.packet)), make("span", `Expected ${result.expect.toUpperCase()} · got ${result.outcome.action.toUpperCase()} by ${decided}`));
            const trace = make("button", "Trace", "quiet");
            trace.type = "button";
            trace.setAttribute("aria-label", `Trace check ${index + 1}: ${result.why}`);
            trace.addEventListener("click", () => {
                loadPacket(result.packet);
                testPacket();
                $("fw-verdict").focus({ preventScroll: true });
                $("fw-verdict").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
            });
            item.append(head, detail, trace);
            return item;
        }));
    }

    function renderWarnings(grade) {
        const items = grade.warnings.map(warning => make("li", warning.message, `fw-warning fw-warning-${warning.kind}`));
        if (grade.invalid) items.unshift(make("li", `${grade.invalid} ${grade.invalid === 1 ? "rule has" : "rules have"} errors and will be skipped until fixed.`, "fw-warning fw-warning-invalid"));
        $("fw-warnings").replaceChildren(...items);
    }

    function evaluate() {
        const grade = gradeMission(mission, draft.rules, draft.defaultAction);
        const wasComplete = completed.has(mission.id);
        if (lastTrace) lastTrace = { ...lastTrace, ...evaluatePacket(grade.rules, lastTrace.packet, draft.defaultAction) };
        renderRowState(grade);
        renderResults(grade);
        renderWarnings(grade);
        if (lastTrace) renderTrace(grade.rules);
        const status = $("fw-status");
        if (mission === sandbox) {
            status.textContent = "Sandbox: use the packet tester to explore your policy.";
            status.className = "status";
        }
        else if (grade.complete) {
            if (!wasComplete) {
                completed.add(mission.id);
                renderMissionPicker();
            }
            const next = missions.find(item => !completed.has(item.id));
            status.textContent = `✓ Mission complete! Every check passes.${grade.warnings.length ? " Review the warnings to tidy the policy." : ""}${next ? ` Next up: ${next.title}.` : " You finished every mission. Try the sandbox."}`;
            status.className = "status success";
        }
        else {
            status.textContent = grade.invalid ? "Fix the highlighted rule errors, then the checks will update." : `${grade.total - grade.passed} ${grade.total - grade.passed === 1 ? "check is" : "checks are"} failing. Use Trace to see which rule decided.`;
            status.className = "status";
        }
        lastGrade = grade;
    }

    function loadPacket(packet) {
        $("fw-packet-protocol").value = packet.protocol;
        $("fw-packet-source").value = formatIPv4(packet.source);
        $("fw-packet-destination").value = formatIPv4(packet.destination);
        $("fw-packet-port").value = packet.port === null ? "" : String(packet.port);
        syncPortField();
    }

    function syncPortField() {
        const icmp = $("fw-packet-protocol").value === "icmp";
        $("fw-packet-port").disabled = icmp;
        $("fw-packet-port").placeholder = icmp ? "ICMP has no port" : "443";
    }

    function renderTrace(rules) {
        const { packet, action, matchedIndex, trace } = lastTrace;
        const verdict = $("fw-verdict");
        verdict.replaceChildren(make("strong", action.toUpperCase(), `fw-verdict-action ${action}`), make("span", `${describePacket(packet)} · ${matchedIndex < 0 ? "no rule matched, so the default policy decides" : `decided by rule ${matchedIndex + 1}`}`));
        verdict.dataset.action = action;
        const steps = trace.map(step => {
            const item = make("li", undefined, `fw-step ${step.status}`);
            const title = make("div", undefined, "fw-step-head");
            title.append(make("span", `Rule ${step.index + 1}`, "fw-step-rule"), make("span", rules[step.index] ? describeRule(rules[step.index]) : "Rule has errors", "fw-step-text"), make("span", { matched: `MATCH → ${rules[step.index]?.action.toUpperCase()}`, skipped: "no match", "not-reached": "not checked", invalid: "skipped" }[step.status], "fw-step-status"));
            item.append(title);
            const failed = step.checks.filter(check => !check.ok);
            if (step.status === "skipped" && failed.length) item.append(make("p", `Failed: ${failed.map(check => check.detail).join("; ")}.`, "fw-step-detail"));
            if (step.status === "matched") item.append(make("p", `All fields match: ${step.checks.map(check => check.detail).join("; ")}.`, "fw-step-detail"));
            return item;
        });
        const fallback = make("li", undefined, `fw-step default ${matchedIndex < 0 ? "matched" : "not-reached"}`);
        const head = make("div", undefined, "fw-step-head");
        head.append(make("span", "Default", "fw-step-rule"), make("span", `${draft.defaultAction.toUpperCase()} everything else`, "fw-step-text"), make("span", matchedIndex < 0 ? `APPLIES → ${action.toUpperCase()}` : "not checked", "fw-step-status"));
        fallback.append(head);
        $("fw-trace").replaceChildren(...steps, fallback);
    }

    function testPacket() {
        const parsed = parsePacket({ protocol: $("fw-packet-protocol").value, source: $("fw-packet-source").value, destination: $("fw-packet-destination").value, port: $("fw-packet-port").value });
        ["source", "destination", "port"].forEach(name => {
            const input = $(`fw-packet-${name}`);
            if (parsed.errors[name]) input.setAttribute("aria-invalid", "true");
            else input.removeAttribute("aria-invalid");
        });
        if (!parsed.ok) {
            $("fw-packet-error").textContent = Object.values(parsed.errors).join(" ");
            return;
        }
        $("fw-packet-error").textContent = "";
        const rules = draft.rules.map(raw => compileRule(raw)).map(result => result.ok ? result.rule : null);
        lastTrace = { packet: parsed.packet, ...evaluatePacket(rules, parsed.packet, draft.defaultAction) };
        renderTrace(rules);
        renderRowState(lastGrade || gradeMission(mission, draft.rules, draft.defaultAction));
    }

    function selectMission(id, focus = false) {
        mission = all.find(item => item.id === id) || missions[0];
        draft = draftFor(mission);
        lastTrace = null;
        $("fw-trace").replaceChildren();
        $("fw-verdict").textContent = "Send a packet to see which rule decides it.";
        delete $("fw-verdict").dataset.action;
        $("fw-packet-error").textContent = "";
        renderMissionPicker();
        renderBrief();
        renderRules();
        if (mission.tests[0]) loadPacket(mission.tests[0].packet);
        evaluate();
        if (focus) $("fw-missions").querySelector(`[data-mission="${id}"]`).focus({ preventScroll: true });
    }

    $("fw-add").addEventListener("click", () => {
        if (draft.rules.length >= MAX_RULES) return;
        draft.rules.push(...clone([{ action: "allow", protocol: "tcp", source: "any", destination: "any", port: "any" }]));
        renderRules();
        evaluate();
        $("fw-rule-list").lastElementChild.querySelector("select").focus();
    });
    $("fw-default").addEventListener("change", () => {
        draft.defaultAction = $("fw-default").value;
        evaluate();
    });
    $("fw-reset").addEventListener("click", () => {
        drafts.delete(mission.id);
        selectMission(mission.id);
        $("fw-status").textContent = `Reset ${mission.title} to its starting rules.`;
        $("fw-reset").focus({ preventScroll: true });
    });
    $("fw-packet-protocol").addEventListener("change", syncPortField);
    $("fw-packet-form").addEventListener("submit", event => {
        event.preventDefault();
        testPacket();
    });
    selectMission(missions[0].id);
    return () => {};
}
