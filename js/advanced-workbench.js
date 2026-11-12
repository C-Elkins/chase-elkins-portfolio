import { advancedScenarios } from "./advanced-scenarios.mjs";
import {
    createAdvancedWorkbench, applyAdvancedChanges, undoAdvancedChange, runAdvancedDiagnostic,
    pinAdvancedEvidence, verifyAdvancedWorkbench, saveAdvancedWorkbench, restoreAdvancedWorkbench, validateAdvancedDraft
} from "./advanced-workbench-model.mjs";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};
const button = (text, action, className) => {
    const node = make("button", text, className);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
};
const option = (value, label) => {
    const node = make("option", label);
    node.value = value;
    return node;
};
const labelled = (text, control) => {
    const label = make("label", undefined, "advanced-workbench-field");
    label.append(make("span", text), control);
    return label;
};

export function mountAdvancedWorkbench({ root, id, challenge, saved, savedDraft, onSave = () => {}, onDraftSave = () => {}, onPass = () => {} }) {
    const scenario = advancedScenarios[id];
    if (!scenario) throw new RangeError("Unknown advanced scenario.");
    let state = saved ? restoreAdvancedWorkbench(id, saved) : createAdvancedWorkbench(id);
    let draft = savedDraft ? validateAdvancedDraft(id, savedDraft) : { values: {}, test: "service", prediction: "unsure" };
    let disposed = false;
    root.classList.add("advanced-workbench");
    root.dataset.advancedWorkbench = id;
    root.replaceChildren();

    const header = make("header");
    header.append(make("p", "LOCAL SIMULATION / NO NETWORK TRAFFIC", "gc-eyebrow"), make("h3", scenario.title), make("p", scenario.brief));
    const help = make("details");
    help.append(make("summary", "How to investigate and verify"), make("p", "Predict and run the required service diagnostic. Pin a failing baseline before changing anything. Apply a justified repair, then run and pin fresh successful service and safety checks. Verify every objective, including operational requirements. A diagnostic from an earlier revision is stale."));
    help.append(make("p", scenario.limit));
    if (challenge?.hints?.length) {
        const hints = make("details");
        hints.append(make("summary", "Optional investigation hints"));
        const list = make("ol");
        challenge.hints.forEach(hint => list.append(make("li", hint)));
        hints.append(list);
        help.append(hints);
    }
    const error = make("p", "", "gc-error");
    error.setAttribute("role", "alert");
    error.hidden = true;
    const status = make("p", "", "advanced-workbench-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const report = exception => {
        error.hidden = false;
        error.textContent = exception.message || String(exception);
    };
    const clearError = () => { error.hidden = true; error.textContent = ""; };
    const persist = () => {
        try { onSave(saveAdvancedWorkbench(state), validateAdvancedDraft(id, draft)); }
        catch (exception) { report(exception); }
    };
    const persistDraft = () => {
        try { onDraftSave(validateAdvancedDraft(id, draft)); }
        catch (exception) { report(exception); }
    };

    const settings = make("section", undefined, "gc-card advanced-workbench-settings");
    settings.append(make("h4", "Configuration draft"), make("p", "Selections are saved as unapplied drafts. Diagnostics use only the last applied configuration.", "gc-muted"));
    const form = make("form");
    const fields = make("div", undefined, "advanced-workbench-fields");
    const controls = new Map();
    scenario.fields.forEach(field => {
        const select = make("select");
        select.dataset.advancedField = field.id;
        select.append(...field.options.map(([value, label]) => option(value, label)));
        select.addEventListener("change", () => {
            draft.values[field.id] = select.value;
            persistDraft();
            status.textContent = "Draft changed; apply it before using it as evidence.";
        });
        controls.set(field.id, select);
        fields.append(labelled(field.label, select));
    });
    const apply = make("button", "Apply configuration", "gc-primary");
    apply.type = "submit";
    apply.dataset.advancedApply = "";
    form.append(fields, apply);
    const actions = make("div", undefined, "wb-actions");
    const undo = button("Undo last applied change", () => {
        clearError();
        const previous = state;
        state = undoAdvancedChange(state);
        if (state !== previous) {
            persist();
            status.textContent = "Configuration rolled back. Earlier diagnostics are stale; retest.";
            refresh();
        }
    }, "quiet");
    const reset = button("Reset scenario", () => {
        if (!window.confirm("Reset this scenario's configuration and evidence? Earned course passes are kept.")) return;
        clearError();
        state = createAdvancedWorkbench(id);
        draft.values = {};
        persist();
        output.textContent = "No diagnostic run in this visit.";
        status.textContent = "Scenario reset. Earned practical passes are unchanged.";
        refresh();
    }, "quiet");
    actions.append(undo, reset);
    form.addEventListener("submit", event => {
        event.preventDefault();
        clearError();
        try {
            const previous = state;
            state = applyAdvancedChanges(state, draft.values);
            draft.values = {};
            if (state === previous) {
                persistDraft();
                status.textContent = "No configuration changes to apply.";
            } else {
                persist();
                status.textContent = `Applied revision ${state.revision}. Earlier diagnostics are stale; run fresh checks.`;
            }
            refresh();
        } catch (exception) { report(exception); error.focus(); }
    });
    settings.append(form, actions);

    const testing = make("section", undefined, "gc-card advanced-workbench-testing");
    testing.append(make("h4", "Predict and run a diagnostic"), make("p", "Service and safety checks inspect only the modeled values. The control view lists every objective.", "gc-muted"));
    const diagnostic = make("form");
    const test = make("select");
    test.dataset.advancedTest = "";
    test.append(option("service", "Required service"), option("safety", "Safety boundaries"), option("control", "Full control / dependency view"));
    test.value = draft.test;
    const prediction = make("select");
    prediction.dataset.advancedPrediction = "";
    prediction.append(option("unsure", "Not sure"), option("pass", "I predict pass"), option("fail", "I predict fail"));
    prediction.value = draft.prediction;
    test.addEventListener("change", () => { draft.test = test.value; persistDraft(); });
    prediction.addEventListener("change", () => { draft.prediction = prediction.value; persistDraft(); });
    const run = make("button", "Run simulated diagnostic", "gc-primary");
    run.type = "submit";
    run.dataset.advancedRun = "";
    diagnostic.append(labelled("Diagnostic", test), labelled("Your prediction", prediction), run);
    const output = make("pre", "No diagnostic run in this visit.", "advanced-workbench-output");
    output.setAttribute("aria-label", "Simulated diagnostic output");
    output.tabIndex = 0;
    const pin = button("Pin last diagnostic", () => {
        clearError();
        try {
            state = pinAdvancedEvidence(state);
            persist();
            status.textContent = "Diagnostic pinned to the evidence tray.";
            refresh();
        } catch (exception) { report(exception); }
    });
    pin.dataset.advancedPin = "";
    diagnostic.addEventListener("submit", event => {
        event.preventDefault();
        clearError();
        try {
            state = runAdvancedDiagnostic(state, test.value, prediction.value);
            const result = state.results.at(-1);
            output.textContent = `${result.output}\nConfiguration revision ${result.revision}.`;
            status.textContent = `Diagnostic ${result.ok ? "passed" : "failed"} at revision ${result.revision}. Pin it if it supports the investigation.`;
            refresh();
        } catch (exception) { report(exception); }
    });
    testing.append(diagnostic, output, pin);

    const objectives = make("section", undefined, "gc-card advanced-workbench-objectives");
    objectives.append(make("h4", "Acceptance and safety objectives"));
    const revision = make("p", "", "gc-muted");
    const checklist = make("ul", undefined, "wb-objectives");
    const verify = button("Verify my repair", () => {
        clearError();
        const verification = verifyAdvancedWorkbench(state);
        renderChecks(verification);
        if (verification.passed) {
            onPass(verification);
            status.textContent = "Practical passed: the modeled service, safety and current-evidence objectives are met.";
        } else {
            status.textContent = `${verification.checks.filter(item => !item.ok).length} objectives remain. Review the current configuration and evidence.`;
        }
    }, "gc-primary");
    verify.dataset.advancedVerify = "";
    const evidenceDetails = make("details");
    const evidenceTitle = make("summary");
    const evidence = make("div", undefined, "wb-evidence");
    evidenceDetails.append(evidenceTitle, evidence);
    objectives.append(revision, verify, checklist, evidenceDetails);
    error.tabIndex = -1;
    root.append(header, help, error, status, settings, testing, objectives);

    function renderChecks(verification) {
        checklist.replaceChildren(...verification.checks.map(item => {
            const row = make("li", undefined, item.ok ? "wb-check-ok" : "wb-check-pending");
            row.append(make("span", item.ok ? "Met" : "Needed", "wb-check-label"), document.createTextNode(item.label));
            return row;
        }));
    }
    function refresh() {
        controls.forEach((select, key) => { select.value = Object.hasOwn(draft.values, key) ? draft.values[key] : state.config[key]; });
        revision.textContent = `Applied configuration revision ${state.revision}. Unpinned output is not saved across reloads.`;
        undo.disabled = !state.undo.length;
        const last = state.results.at(-1);
        pin.disabled = !last || last.revision !== state.revision;
        renderChecks(verifyAdvancedWorkbench(state));
        evidenceTitle.textContent = `Evidence tray · ${state.pinned.length} of 6 observations`;
        evidence.replaceChildren(...state.pinned.map(item => {
            const card = make("article", undefined, "wb-evidence-card");
            card.append(make("h5", `${item.ok ? "Passing" : "Failing"} ${item.test} · revision ${item.revision}`), make("p", item.revision === state.revision ? "Current configuration" : "Previous configuration / baseline", "wb-badge"), make("pre", item.output));
            return card;
        }));
        if (!state.pinned.length) evidence.append(make("p", "No evidence pinned yet.", "gc-muted"));
    }
    refresh();
    return {
        pause() {},
        getState: () => structuredClone(state),
        save: () => saveAdvancedWorkbench(state),
        destroy() {
            if (disposed) return;
            disposed = true;
            root.replaceChildren();
        }
    };
}
