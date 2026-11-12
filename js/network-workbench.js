import {
    workbenchDevices, workbenchLinks, fieldsForScenario, configValue,
    createWorkbench, applyWorkbenchChanges, undoWorkbench, runWorkbenchDiagnostic,
    pinWorkbenchEvidence, verifyWorkbench, workbenchDiff, saveWorkbench, restoreWorkbench, validateWorkbenchDraft
} from "./network-workbench-model.mjs";
import { parseWorkbenchCommand, workbenchHelp } from "./network-workbench-console.mjs";
import { networkIcon } from "./network-icons.mjs";
import { buildTable } from "./course-charts.js";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};
const button = (text, run, className) => {
    const node = make("button", text, className);
    node.type = "button";
    node.addEventListener("click", run);
    return node;
};
const svgNode = (tag, attrs = {}, text) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
};
const option = (value, label) => {
    const node = make("option", label);
    node.value = value;
    return node;
};
const labelled = (label, input) => {
    const node = make("label", undefined, "wb-field");
    if (!input.hasAttribute("aria-label")) input.setAttribute("aria-label", label);
    node.append(make("span", label), input);
    return node;
};
const readable = value => typeof value === "boolean" ? value ? "Enabled" : "Disabled" : String(value);

export function mountWorkbench({ container, module, onPass, onSave, saved, savedDraft, onDraftSave }) {
    return mountNetworkWorkbench({
        root: container, id: typeof module === "string" ? module : module.id,
        challenge: typeof module === "string" ? {} : module.challenge,
        onPass, onSave, saved, savedDraft, onDraftSave
    });
}

/**
 * Mount once per module. The controller may detach/reinsert root to retain
 * unapplied controls, command input and visit-only output during course navigation.
 */
export function mountNetworkWorkbench({ root, id, challenge = {}, saved, savedDraft, onSave = () => {}, onDraftSave = () => {}, onPass = () => {} }) {
    let state = saved ? restoreWorkbench(id, saved) : createWorkbench(id);
    let editor = savedDraft ? validateWorkbenchDraft(id, savedDraft) : { selected: "client", values: {} };
    let selected = editor.selected;
    const desktop = window.matchMedia("(min-width: 1000px)");
    let currentView = desktop.matches ? "configure" : "topology";
    let timer = null;
    let eventIndex = -1;
    let hintsShown = 0;
    let history = [];
    let historyIndex = 0;
    let historyDraft = "";
    let disposed = false;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const uid = `wb-${id}`;
    root.classList.add("network-workbench");
    root.dataset.workbench = id;
    root.replaceChildren();

    const announce = make("p", "", "wb-announcement");
    announce.setAttribute("role", "status");
    announce.setAttribute("aria-live", "polite");
    const error = make("p", "", "gc-error");
    error.id = `${uid}-error`;
    error.setAttribute("role", "alert");
    error.hidden = true;
    const reportError = (exception, after) => {
        if (after) after.insertAdjacentElement("afterend", error);
        error.hidden = false;
        error.textContent = exception.message || String(exception);
    };
    const clearError = () => { error.hidden = true; error.textContent = ""; };
    const pause = () => {
        if (timer !== null) window.clearInterval(timer);
        timer = null;
        play.textContent = "Play trace";
        play.setAttribute("aria-pressed", "false");
    };
    const persist = () => {
        try { onSave(saveWorkbench(state), validateWorkbenchDraft(id, editor)); } catch (exception) { reportError(exception); }
    };
    const persistDraft = () => {
        try { onDraftSave(validateWorkbenchDraft(id, editor)); } catch (exception) { reportError(exception); }
    };

    const intro = make("header", undefined, "wb-intro");
    intro.append(make("p", "BRANCH OFFICE / INTERACTIVE WORKBENCH", "gc-eyebrow"), make("h3", "Investigate. Change. Verify."), make("p", challenge.brief || "Restore the required staff services while preserving guest and management isolation."));
    const orientation = make("details", undefined, "wb-orientation");
    orientation.open = false;
    orientation.append(make("summary", "How this workbench works"), make("p", "1. Run a failing application, name, reachability or wireless test and pin that baseline before changing anything. 2. Select a device and apply a justified repair. DHCP changes require Renew lease; changed DNS records may require Clear DNS cache. 3. Run and pin a successful diagnostic from the current revision, then verify every objective. Read-only configuration output is useful, but is not evidence that a service works."));
    orientation.append(make("p", "All devices, commands, packet events and timings are simulated locally. No commands run on your computer and no network traffic is sent. The supported settings are a teaching subset, not a complete operating system or RF prediction."));

    const toolbar = make("div", undefined, "wb-toolbar");
    const devicePicker = make("select");
    devicePicker.dataset.workbenchDevice = "";
    devicePicker.id = `${uid}-device`;
    workbenchDevices.forEach(device => devicePicker.append(option(device.id, device.label)));
    devicePicker.value = selected;
    devicePicker.addEventListener("change", () => selectDevice(devicePicker.value));
    const revision = make("span", "", "wb-revision");
    toolbar.append(labelled("Inspect device", devicePicker), revision);

    const viewNav = make("div", undefined, "wb-view-nav");
    viewNav.setAttribute("role", "group");
    viewNav.setAttribute("aria-label", "Workbench views");
    const panels = {};
    const viewButtons = {};
    const selectView = view => {
        if (desktop.matches && view === "topology") view = "configure";
        currentView = view;
        Object.entries(panels).forEach(([name, panel]) => {
            panel.classList.toggle("wb-mobile-active", name === view);
            panel.dataset.active = name === view ? "true" : "false";
        });
        Object.entries(viewButtons).forEach(([name, control]) => control.setAttribute("aria-pressed", String(name === view)));
    };
    const workspace = make("div", undefined, "wb-workspace");
    for (const [view, title] of [["topology", "Topology"], ["configure", "Configure"], ["test", "Test"], ["trace", "Trace"], ["objectives", "Objectives"]]) {
        const panel = make("section", undefined, `wb-panel wb-view-${view}`);
        panel.id = `${uid}-${view}`;
        panel.setAttribute("aria-label", title);
        panels[view] = panel;
        const control = button(title, () => selectView(view));
        control.dataset.workbenchView = view;
        control.setAttribute("aria-controls", panel.id);
        viewButtons[view] = control;
        viewNav.append(control);
        workspace.append(panel);
    }

    const topologyHead = make("div", undefined, "wb-panel-heading");
    const fit = button("Fit topology", () => {
        topologyCanvas.classList.toggle("wb-fit");
        fit.textContent = topologyCanvas.classList.contains("wb-fit") ? "Readable detail" : "Fit topology";
    }, "quiet");
    topologyHead.append(make("h4", "Live topology"), fit);
    const topologyCanvas = make("div", undefined, "wb-topology-canvas");
    topologyCanvas.classList.toggle("wb-fit", desktop.matches);
    fit.textContent = desktop.matches ? "Readable detail" : "Fit topology";
    topologyCanvas.tabIndex = 0;
    topologyCanvas.setAttribute("role", "region");
    topologyCanvas.setAttribute("aria-label", "Scrollable network topology");
    const svg = svgNode("svg", { viewBox: "0 0 960 510", class: "wb-topology", role: "group", "aria-label": "Virtual branch network. Select a device to inspect it; the Inspect device list is an equivalent control." });
    const defs = svgNode("defs");
    for (const [name, className] of [["flow", "wb-arrow"], ["stop", "wb-arrow-stop"]]) {
        const marker = svgNode("marker", { id: `${uid}-${name}`, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "strokeWidth" });
        marker.append(svgNode("path", { d: "M0 0 10 5 0 10Z", class: className }));
        defs.append(marker);
    }
    svg.append(defs);
    const links = svgNode("g", { class: "wb-links" });
    const findDevice = deviceId => workbenchDevices.find(device => device.id === deviceId);
    workbenchLinks.forEach(([from, to]) => {
        const a = findDevice(from), b = findDevice(to);
        links.append(svgNode("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y }));
    });
    svg.append(links);
    const tracePath = svgNode("path", { class: "wb-trace-path", hidden: "" });
    svg.append(tracePath);
    const nodes = new Map();
    workbenchDevices.forEach(device => {
        const group = svgNode("g", { transform: `translate(${device.x} ${device.y})`, role: "button", tabindex: "0", "aria-label": `Inspect ${device.label}`, "aria-pressed": String(device.id === selected), class: "wb-device" });
        group.append(svgNode("rect", { x: -40, y: -35, width: 80, height: 70, rx: 15 }));
        const icon = networkIcon(device.type, true);
        icon.setAttribute("x", -39);
        icon.setAttribute("y", -36);
        icon.setAttribute("width", 78);
        icon.setAttribute("height", 70);
        group.append(icon, svgNode("text", { y: 58, "text-anchor": "middle", class: "wb-device-label" }, device.label));
        const detail = svgNode("text", { y: 77, "text-anchor": "middle", class: "wb-device-detail" });
        group.append(detail);
        group.addEventListener("click", () => selectDevice(device.id));
        group.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectDevice(device.id); }
        });
        nodes.set(device.id, { group, detail });
        svg.append(group);
    });
    const topologyCaption = make("p", "Lines show modeled connections, not captured traffic. Scroll for readable detail or fit the complete network. The device list is an equivalent selection control. Run a diagnostic to inspect its directional request and return events.", "gc-muted");
    topologyCanvas.append(svg);
    const mapEvent = make("p", "Run a diagnostic, then use Trace to inspect its request and return path.", "wb-map-event");
    panels.topology.append(topologyHead, topologyCanvas, mapEvent, topologyCaption);

    const inspectorHeading = make("h4");
    const facts = make("dl", undefined, "wb-facts");
    const configForm = make("form", undefined, "wb-config-form");
    const configFields = make("div", undefined, "wb-config-fields");
    const apply = make("button", "Apply configuration", "gc-primary");
    apply.dataset.workbenchApply = "";
    apply.type = "submit";
    configForm.append(configFields, apply);
    const fieldInputs = new Map();
    configForm.addEventListener("submit", event => {
        event.preventDefault();
        clearError();
        const changes = {};
        fieldInputs.forEach(({ input, spec }, path) => {
            changes[path] = spec.type === "boolean" ? input.checked : ["number", "select"].includes(spec.type) ? Number(input.value) : input.value.trim();
        });
        try {
            const next = applyWorkbenchChanges(state, changes);
            fieldInputs.forEach((value, path) => { delete editor.values[path]; });
            if (next === state) { persistDraft(); refresh(true); announce.textContent = "No configuration changes to apply."; return; }
            state = next;
            pause();
            persist();
            refresh(true);
            announce.textContent = `Configuration applied at revision ${state.revision}. Previous diagnostic output is now stale; run a fresh test.`;
        } catch (exception) {
            reportError(exception, configForm);
            const invalid = [...fieldInputs.values()].find(({ input }) => !input.checkValidity());
            (invalid?.input || error).focus();
        }
    });
    const editActions = make("div", undefined, "wb-actions");
    const undo = button("Undo last change", () => {
        clearError();
        pause();
        state = undoWorkbench(state);
        persist();
        refresh(true);
        announce.textContent = "Rolled back one change. Retest the current revision.";
    });
    const reset = button("Reset scenario", () => {
        if (!window.confirm("Reset this scenario's configuration and evidence? Earned course passes are kept.")) return;
        pause();
        clearError();
        state = createWorkbench(id);
        editor.values = {};
        eventIndex = -1;
        output.replaceChildren();
        persist();
        refresh(true);
        announce.textContent = "Scenario reset. Earned practical passes are unchanged.";
    }, "quiet");
    editActions.append(undo, reset);
    const diffDetails = make("details", undefined, "wb-diff");
    diffDetails.append(make("summary", "Show changes / handoff"));
    const diffBody = make("div");
    diffDetails.append(diffBody);
    panels.configure.append(inspectorHeading, facts, configForm, editActions, diffDetails);

    const tools = make("form", undefined, "wb-tools");
    tools.setAttribute("aria-label", "Equivalent diagnostic controls");
    const source = make("select");
    source.append(option("client", "Staff PC"), option("guest", "Guest PC"), ...workbenchDevices.filter(device => !["client", "guest"].includes(device.id)).map(device => option(device.id, device.label)));
    source.value = selected;
    const test = make("select");
    for (const [value, label] of [["tcp", "Connect to service"], ["ping", "Ping / IP reachability"], ["dns", "Resolve name"], ["trace", "Trace path"], ["config", "Inspect held configuration"], ["renew", "Renew lease"], ["flush", "Clear DNS cache"], ["routes", "Route table"], ["vlans", "VLAN table"], ["trunks", "Trunk table"], ["acl", "Access policies"], ["wireless", "Wireless constraints"]]) test.append(option(value, label));
    const destination = make("input");
    destination.value = "app.branch.example";
    destination.maxLength = 100;
    destination.setAttribute("list", `${uid}-targets`);
    const targets = make("datalist");
    targets.id = `${uid}-targets`;
    ["app.branch.example", "printer.branch.example", "192.168.10.1", "192.168.10.53", "192.168.20.10", "192.168.20.40"].forEach(target => targets.append(option(target, target)));
    const port = make("input");
    port.type = "number"; port.min = "1"; port.max = "65535"; port.value = "443";
    const payload = make("input");
    payload.type = "number"; payload.min = "0"; payload.max = "1472"; payload.value = "1372";
    const df = make("input"); df.type = "checkbox";
    const destinationField = labelled("Destination / name", destination);
    const portField = labelled("TCP port", port);
    const payloadField = labelled("ICMP payload bytes", payload);
    const dfField = labelled("Do not fragment (DF)", df);
    const syncTools = () => {
        destinationField.hidden = !["tcp", "ping", "dns", "trace"].includes(test.value);
        portField.hidden = test.value !== "tcp";
        payloadField.hidden = dfField.hidden = test.value !== "ping";
    };
    test.addEventListener("change", syncTools);
    const run = make("button", "Run diagnostic", "gc-primary"); run.type = "submit";
    tools.append(labelled("Test source", source), labelled("Diagnostic", test), destinationField, targets, portField, payloadField, dfField, run);
    tools.addEventListener("submit", event => {
        event.preventDefault();
        const action = { test: test.value, source: source.value };
        if (!destinationField.hidden) action.destination = destination.value.trim();
        if (!portField.hidden) action.port = Number(port.value);
        if (test.value === "ping") { action.size = Number(payload.value); action.df = df.checked; }
        execute(action);
    });

    const consoleHeading = make("h4", "Diagnostic console");
    const consoleLabel = make("p", "", "wb-console-context");
    const output = make("div", undefined, "wb-console-output");
    output.setAttribute("role", "log");
    output.setAttribute("aria-label", "Simulated diagnostic output");
    output.setAttribute("aria-live", "off");
    output.tabIndex = 0;
    const consoleForm = make("form", undefined, "wb-console-form");
    const command = make("input");
    command.id = `${uid}-command`;
    command.dataset.workbenchCommand = "";
    command.type = "text";
    command.maxLength = 160;
    command.autocomplete = "off";
    command.spellcheck = false;
    command.setAttribute("aria-describedby", `${uid}-command-help ${uid}-error`);
    command.setAttribute("list", `${uid}-commands`);
    const commands = make("datalist");
    commands.id = `${uid}-commands`;
    ["help", "ipconfig /all", "ipconfig /renew", "ipconfig /flushdns", "ping 192.168.10.1", "nslookup app.branch.example", "Test-NetConnection app.branch.example -Port 443", "tracert app.branch.example", "route print", "show ip route", "show vlan brief", "show interfaces trunk", "show access-lists", "ping -f -l 1372 192.168.20.10"].forEach(value => commands.append(option(value, value)));
    const submitCommand = make("button", "Run command"); submitCommand.type = "submit";
    consoleForm.append(labelled("Supported command", command), commands, submitCommand);
    const commandHelp = make("p", "Use help for supported commands and limitations. Up/Down in this field recalls this visit's last 30 commands. Output and command history are not saved across reloads.", "gc-muted");
    commandHelp.id = `${uid}-command-help`;
    const help = make("details", undefined, "wb-command-help");
    help.append(make("summary", "Supported commands and examples"));
    const helpText = make("pre");
    help.append(helpText);
    consoleForm.addEventListener("submit", event => {
        event.preventDefault();
        clearError();
        const text = command.value.trim();
        if (!text) { reportError(new Error("Enter a supported command, or type help."), consoleForm); command.focus(); return; }
        try {
            const parsed = parseWorkbenchCommand(text, selected);
            if (parsed.error) throw new Error(parsed.error);
            history = [...history.slice(-29), text];
            historyIndex = history.length;
            historyDraft = "";
            if (parsed.clear) output.replaceChildren();
            else if (parsed.help) appendOutput(text, typeof parsed.help === "string" ? parsed.help : workbenchHelp(selected));
            else if (parsed.action) execute(parsed.action, text, consoleForm);
            else throw new Error("Unsupported command. Type help to see the simulated command set.");
            command.value = "";
        } catch (exception) { reportError(exception, consoleForm); }
    });
    command.addEventListener("keydown", event => {
        if (!["ArrowUp", "ArrowDown"].includes(event.key) || !history.length || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (historyIndex === history.length) historyDraft = command.value;
        historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
        command.value = historyIndex === history.length ? historyDraft : history[historyIndex];
    });

    const traceHeading = make("div", undefined, "wb-panel-heading");
    const freshness = make("span", "", "wb-badge");
    traceHeading.append(make("h4", "Packet-path evidence"), freshness);
    const traceControls = make("div", undefined, "wb-actions");
    const play = button("Play trace", () => {
        if (timer !== null) { pause(); return; }
        const events = state.results.at(-1)?.events || [];
        if (!events.length) return;
        if (eventIndex >= events.length - 1) eventIndex = -1;
        if (reducedMotion?.matches) {
            eventIndex = events.length - 1;
            renderTrace();
            announce.textContent = "Reduced motion: complete trace available; use the event selector or step controls.";
            return;
        }
        play.textContent = "Pause trace";
        play.setAttribute("aria-pressed", "true");
        timer = window.setInterval(() => {
            eventIndex++;
            renderTrace();
            if (eventIndex >= events.length - 1) pause();
        }, 1050);
    });
    play.setAttribute("aria-pressed", "false");
    const previous = button("Previous event", () => { pause(); eventIndex = Math.max(0, eventIndex - 1); renderTrace(); });
    const next = button("Next event", () => { pause(); eventIndex = Math.min((state.results.at(-1)?.events.length || 1) - 1, eventIndex + 1); renderTrace(); });
    const eventPicker = make("select");
    eventPicker.setAttribute("aria-label", "Inspect trace event");
    eventPicker.addEventListener("change", () => { pause(); eventIndex = Number(eventPicker.value); renderTrace(); });
    traceControls.append(play, previous, next);
    const eventInspector = make("p", "Run a diagnostic to create an inspectable trace.", "wb-event-inspector");
    const eventDetails = make("details", undefined, "wb-event-details");
    eventDetails.append(make("summary", "Read the complete event path"));
    const eventList = make("ol"); eventDetails.append(eventList);
    const pin = button("Pin last output", () => {
        clearError();
        try { state = pinWorkbenchEvidence(state); persist(); refresh(); announce.textContent = "Diagnostic pinned to the evidence tray."; } catch (exception) { reportError(exception, pin); }
    });
    pin.dataset.workbenchPin = "";
    const visibleTools = make("details", undefined, "wb-visible-tools");
    visibleTools.append(make("summary", "Equivalent diagnostic controls"), tools);
    const testActions = make("div", undefined, "wb-actions wb-test-actions");
    testActions.append(pin, button("Inspect trace →", () => selectView("trace"), "quiet"));
    help.insertBefore(commandHelp, helpText);
    panels.test.append(consoleHeading, consoleLabel, output, consoleForm, testActions, visibleTools, help);
    panels.trace.append(traceHeading, traceControls, labelled("Trace event", eventPicker), eventInspector, eventDetails, make("p", "Trace playback changes only presentation. Every event comes from the same diagnostic as the console output. Timings are illustrative, not measured.", "gc-muted"));

    const objectiveList = make("ul", undefined, "wb-objectives");
    const verify = button("Verify my fix", () => {
        clearError();
        const verification = verifyWorkbench(state);
        renderObjectives(verification);
        if (verification.passed) {
            onPass(verification);
            announce.textContent = "Practical challenge passed. All modeled service, safety and evidence objectives are satisfied. Pass the module knowledge check to continue.";
        } else {
            announce.textContent = `Not yet verified: ${verification.checks.filter(check => !check.ok).length} objectives remain. Review the checklist and current evidence.`;
        }
    }, "gc-primary");
    verify.dataset.workbenchVerify = "";
    const hintBody = make("div", undefined, "wb-hints");
    const hint = button("Reveal a hint", () => {
        const hints = challenge.hints || ["Compare a working and failing test before changing settings.", "Inspect the held client configuration and the service or path it depends on.", "Apply only the changes supported by the evidence; renew leases when server options change, then pin a fresh successful test."];
        if (hintsShown < hints.length) hintBody.append(make("p", `${hintsShown + 1}. ${hints[hintsShown++]}`));
        hint.disabled = hintsShown >= hints.length;
    });
    const evidenceDetails = make("details", undefined, "wb-evidence-details");
    const pinnedHeading = make("summary", "Evidence tray");
    const pinned = make("div", undefined, "wb-evidence");
    evidenceDetails.append(pinnedHeading, pinned);
    const objectiveActions = make("div", undefined, "wb-actions");
    objectiveActions.append(verify, hint);
    panels.objectives.append(make("h4", "Acceptance & safety checks"), make("p", "Pin a failing baseline before repair and a fresh successful diagnostic afterward. Verify all service and isolation requirements.", "gc-muted"), objectiveActions, hintBody, objectiveList, evidenceDetails);

    toolbar.append(viewNav);
    root.append(intro, orientation, toolbar, error, announce, workspace);
    error.tabIndex = -1;
    syncTools();
    selectView(currentView);
    refresh(true);

    function selectDevice(deviceId) {
        selected = deviceId;
        editor.selected = deviceId;
        persistDraft();
        devicePicker.value = deviceId;
        source.value = deviceId;
        renderInspector(true);
        renderTopology();
        consoleLabel.textContent = `${findDevice(selected).label} / SIMULATED · SUPPORTED COMMANDS ONLY`;
        helpText.textContent = workbenchHelp(selected);
    }

    function renderInspector(rebuild = false) {
        inspectorHeading.textContent = `${findDevice(selected).label} / inspector`;
        facts.replaceChildren();
        let entries;
        const config = state.config;
        if (selected === "client") entries = Object.entries(config.client);
        else if (selected === "guest") entries = [["IPv4", "192.168.30.25/24"], ["Gateway", "192.168.30.1"], ["DNS", "192.168.10.53"], ["VLAN", 30]];
        else if (selected === "dhcp") entries = Object.entries(config.dhcp);
        else if (selected === "router" || selected === "switch") entries = Object.entries(config.network);
        else if (selected === "server") entries = [["Address", "192.168.20.10"], ...Object.entries(config.service)];
        else if (selected === "dns") entries = [["Resolver address", "192.168.10.53"], ["A record", config.dns.record]];
        else if (selected === "ap") entries = Object.entries(config.wifi);
        else if (selected === "vpn") entries = Object.entries(config.vpn);
        else entries = [["Address", "192.168.20.40"], ["IPP port", 631]];
        if (!["client", "guest", "dhcp"].includes(selected)) entries.push(["Staff held gateway", config.client.gateway], ["Staff held DNS", config.client.dns]);
        entries.forEach(([key, value]) => facts.append(make("dt", key.replace(/([a-z])([A-Z])/g, "$1 $2")), make("dd", readable(value))));
        if (!rebuild) return;
        configFields.replaceChildren();
        fieldInputs.clear();
        const fields = fieldsForScenario(id, selected);
        fields.forEach(spec => {
            const input = make(spec.type === "select" ? "select" : "input");
            input.name = spec.path;
            input.dataset.configPath = spec.path;
            input.id = `${uid}-${spec.path.replace(".", "-")}`;
            if (spec.type === "select") spec.options.forEach(value => input.append(option(value, `${value}`)));
            else input.type = spec.type === "boolean" ? "checkbox" : spec.type === "number" ? "number" : "text";
            const value = Object.hasOwn(editor.values, spec.path) ? editor.values[spec.path] : configValue(config, spec.path);
            if (spec.type === "boolean") input.checked = value;
            else { input.value = value; input.required = true; }
            if (spec.min !== undefined) input.min = spec.min;
            if (spec.max !== undefined) input.max = spec.max;
            if (["ip", "hostname"].includes(spec.type)) { input.maxLength = 100; input.spellcheck = false; }
            input.setAttribute("aria-describedby", error.id);
            input.addEventListener(["boolean", "select"].includes(spec.type) ? "change" : "input", () => {
                editor.values[spec.path] = spec.type === "boolean" ? input.checked : input.value;
                persistDraft();
            });
            fieldInputs.set(spec.path, { spec, input });
            configFields.append(labelled(spec.label, input));
        });
        apply.hidden = !fields.length;
        if (!fields.length) configFields.append(make("p", "Read-only in this scenario. Select another device to inspect its permitted configuration controls.", "gc-muted"));
    }

    function renderTopology() {
        const config = state.config;
        const details = {
            client: `${config.client.ip} · VLAN ${config.client.vlan}`,
            guest: "192.168.30.25 · VLAN 30", switch: "Access / trunk",
            router: "192.168.10.1", dhcp: "Lease options",
            dns: "192.168.10.53", server: "192.168.20.10",
            printer: "192.168.20.40 · IPP", ap: `Ch ${config.wifi.channel} · ${config.wifi.width} MHz`,
            vpn: `MTU ${config.vpn.mtu} · MSS ${config.vpn.mss}`
        };
        nodes.forEach(({ group, detail }, deviceId) => {
            group.setAttribute("aria-pressed", String(deviceId === selected));
            detail.textContent = details[deviceId];
        });
    }

    function renderObjectives(verification) {
        objectiveList.replaceChildren(...verification.checks.map(check => {
            const item = make("li", undefined, check.ok ? "wb-check-ok" : "wb-check-pending");
            item.append(make("span", check.ok ? "Met" : "Needed", "wb-check-label"), document.createTextNode(check.label));
            return item;
        }));
    }

    function renderTrace() {
        const result = state.results.at(-1);
        const events = result?.events || [];
        const current = result?.revision === state.revision;
        freshness.textContent = !result ? "No diagnostic yet" : current ? `Current · r${result.revision}` : `Stale · r${result.revision} / now r${state.revision}`;
        freshness.classList.toggle("wb-stale", Boolean(result && !current));
        [play, previous, next, eventPicker].forEach(control => { control.disabled = !events.length; });
        pin.disabled = !result || !current;
        eventPicker.replaceChildren(...events.map((event, index) => option(index, `${index + 1}. ${event.protocol}: ${event.from} → ${event.to}`)));
        if (events.length) {
            eventIndex = Math.max(0, Math.min(eventIndex, events.length - 1));
            eventPicker.value = String(eventIndex);
            const event = events[eventIndex];
            const a = findDevice(event.from), b = findDevice(event.to);
            eventInspector.textContent = `${current ? "" : "STALE EVIDENCE — "}${eventIndex + 1}/${events.length} · ${event.protocol} · ${event.from} → ${event.to}: ${event.detail}`;
            mapEvent.textContent = eventInspector.textContent;
            if (a && b) {
                tracePath.removeAttribute("hidden");
                if (a === b) tracePath.setAttribute("d", `M ${a.x - 45} ${a.y - 20} C ${a.x - 95} ${a.y - 90}, ${a.x + 95} ${a.y - 90}, ${a.x + 45} ${a.y - 20}`);
                else {
                    const distance = Math.hypot(b.x - a.x, b.y - a.y);
                    const dx = (b.x - a.x) / distance, dy = (b.y - a.y) / distance;
                    tracePath.setAttribute("d", `M ${a.x + dx * 45} ${a.y + dy * 45} L ${b.x - dx * 50} ${b.y - dy * 50}`);
                }
                tracePath.setAttribute("marker-end", `url(#${uid}-${event.ok ? "flow" : "stop"})`);
                tracePath.classList.toggle("wb-trace-failed", !event.ok);
                tracePath.classList.toggle("wb-trace-stale", !current);
            } else tracePath.setAttribute("hidden", "");
        } else {
            tracePath.setAttribute("hidden", "");
            eventInspector.textContent = result ? "This diagnostic has text output only. Inspect it in the console." : "Run a diagnostic to create an inspectable trace.";
            mapEvent.textContent = eventInspector.textContent;
        }
        eventList.replaceChildren(...events.map(event => make("li", `${event.protocol} · ${event.from} → ${event.to}: ${event.detail}`)));
    }

    function appendOutput(input, text, result) {
        const entry = make("section", undefined, "wb-output-entry");
        entry.append(make("p", `${findDevice(result?.action.source || selected).label} > ${input}`, "wb-prompt"));
        if (result) {
            const badge = make("p", "", "wb-output-revision");
            badge.dataset.revision = result.revision;
            entry.append(badge);
        }
        entry.append(make("pre", text));
        output.append(entry);
        while (output.children.length > 12) output.firstElementChild.remove();
        output.scrollTop = output.scrollHeight;
    }

    function execute(action, text = `${action.test} ${action.destination || ""}`.trim(), errorTarget = tools) {
        clearError();
        pause();
        try {
            state = runWorkbenchDiagnostic(state, action);
            const result = state.results.at(-1);
            eventIndex = result.events.length ? 0 : -1;
            appendOutput(text, result.output, result);
            persist();
            // Renewal can update the held client configuration; do not rebuild controls
            // or command fields for a read-only diagnostic.
            refresh(action.test === "renew");
            announce.textContent = `${result.ok ? "Diagnostic completed" : "Diagnostic did not meet its outcome"} at revision ${result.revision}. ${result.events.length} modeled trace events. Inspect and pin the output if it supports your investigation.`;
        } catch (exception) { reportError(exception, errorTarget); }
    }

    function refresh(rebuild = false) {
        revision.textContent = `Configuration revision ${state.revision} · local simulation`;
        undo.disabled = !state.undo.length;
        renderInspector(rebuild);
        renderTopology();
        renderTrace();
        renderObjectives(verifyWorkbench(state));
        consoleLabel.textContent = `${findDevice(selected).label} / SIMULATED · SUPPORTED COMMANDS ONLY`;
        helpText.textContent = workbenchHelp(selected);
        output.querySelectorAll("[data-revision]").forEach(badge => {
            const revision = Number(badge.dataset.revision);
            badge.textContent = revision === state.revision ? `Current output · revision ${revision}` : `Stale output · revision ${revision}; configuration is now ${state.revision}`;
            badge.classList.toggle("wb-stale", revision !== state.revision);
        });
        const diff = workbenchDiff(state);
        diffBody.replaceChildren(diff.length ? buildTable({ caption: "Changes from the incident baseline", columns: ["Setting", "Before", "Current"], rows: diff.map(item => [item.label, readable(item.before), readable(item.after)]) }) : make("p", "No configuration changes from the initial incident."));
        diffBody.append(make("p", `${state.pinned.length} pinned observations support this handoff. Timings are illustrative; this is not a real packet capture.`, "gc-muted"));
        pinned.replaceChildren(...state.pinned.map(result => {
            const card = make("article", undefined, "wb-evidence-card");
            card.append(make("h5", `${result.ok ? "Successful" : "Failing"} ${result.action.test} · ${result.action.source || "client"}`), make("p", `Revision ${result.revision} · ${result.revision === state.revision ? "current configuration" : "previous configuration / baseline"}`, "wb-badge"), make("pre", result.output));
            return card;
        }));
        if (!state.pinned.length) pinned.append(make("p", "No evidence pinned yet. Run a failing relevant diagnostic before changing the incident configuration.", "gc-muted"));
        pinnedHeading.textContent = `Evidence tray · ${state.pinned.length} of 6 observations`;
    }

    const motionChange = () => { if (reducedMotion.matches) pause(); };
    const layoutChange = () => {
        topologyCanvas.classList.toggle("wb-fit", desktop.matches);
        fit.textContent = desktop.matches ? "Readable detail" : "Fit topology";
        selectView(currentView);
    };
    reducedMotion?.addEventListener?.("change", motionChange);
    desktop.addEventListener("change", layoutChange);
    return {
        pause,
        getState: () => structuredClone(state),
        save: () => saveWorkbench(state),
        destroy() {
            if (disposed) return;
            pause();
            disposed = true;
            reducedMotion?.removeEventListener?.("change", motionChange);
            desktop.removeEventListener("change", layoutChange);
            root.replaceChildren();
        }
    };
}
