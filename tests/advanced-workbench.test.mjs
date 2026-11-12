import { advancedScenarios } from "../js/advanced-scenarios.mjs";
import {
    createAdvancedWorkbench, applyAdvancedChanges, undoAdvancedChange, diagnoseAdvanced, runAdvancedDiagnostic,
    pinAdvancedEvidence, verifyAdvancedWorkbench, saveAdvancedWorkbench, restoreAdvancedWorkbench, validateAdvancedDraft
} from "../js/advanced-workbench-model.mjs";

const unsafe = {
    architecture: { management: "open" }, switching: { guest: "open" }, ospf: { defaultLeak: "allowed" },
    bgp: { export: "all" }, availability: { management: "open" }, ipv6: { guest: "open" },
    segmentation: { order: "allow-any" }, infrastructure: { guest: "open" },
    performance: { icmp: "blocked" }, operations: { handoff: "overclaim" }, capstone: { guest: "open" }
};

function applySolution(state, solution) {
    const changes = { ...solution };
    const deferred = state.id === "infrastructure" ? "cache" : state.id === "capstone" ? "lease" : null;
    if (deferred && Object.hasOwn(changes, deferred)) {
        const value = changes[deferred];
        delete changes[deferred];
        state = applyAdvancedChanges(state, changes);
        return applyAdvancedChanges(state, { [deferred]: value });
    }
    return applyAdvancedChanges(state, changes);
}

export function solveAdvancedWorkbench(id, solution = advancedScenarios[id].solutions[0]) {
    let state = createAdvancedWorkbench(id);
    state = pinAdvancedEvidence(runAdvancedDiagnostic(state, "service", "fail"));
    state = applySolution(state, solution);
    state = pinAdvancedEvidence(runAdvancedDiagnostic(state, "service", "pass"));
    state = pinAdvancedEvidence(runAdvancedDiagnostic(state, "safety", "pass"));
    return state;
}

export function runAdvancedWorkbenchTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const rejects = (fn, label) => { let threw = false; try { fn(); } catch { threw = true; } assert(threw, label); };
    assert(Object.keys(advancedScenarios).length === 11, "Ten module scenarios and one separate capstone exist");
    for (const [id, scenario] of Object.entries(advancedScenarios)) {
        assert(scenario.solutions.length >= 2 && scenario.limit.length > 100, `${id}: alternate solutions and model limits`);
        let initial = createAdvancedWorkbench(id);
        assert(!diagnoseAdvanced(id, initial.config, "service", "fail").ok, `${id}: baseline service starts failing`);
        assert(!verifyAdvancedWorkbench(initial).passed, `${id}: no evidence cannot pass`);
        rejects(() => pinAdvancedEvidence(initial), `${id}: evidence requires a diagnostic`);
        for (const solution of scenario.solutions) {
            const solved = solveAdvancedWorkbench(id, solution);
            assert(verifyAdvancedWorkbench(solved).passed, `${id}: valid alternative meets service, safety and evidence objectives`);
            const restored = restoreAdvancedWorkbench(id, saveAdvancedWorkbench(solved));
            assert(verifyAdvancedWorkbench(restored).passed && restored.pinned.length === 3, `${id}: validated pinned evidence survives restoration`);
            const unsafeState = applyAdvancedChanges(solved, unsafe[id]);
            assert(!verifyAdvancedWorkbench(unsafeState).passed, `${id}: unsafe change cannot pass with stale evidence`);
            let tested = pinAdvancedEvidence(runAdvancedDiagnostic(unsafeState, "service", "unsure"));
            tested = pinAdvancedEvidence(runAdvancedDiagnostic(tested, "safety", "unsure"));
            assert(!verifyAdvancedWorkbench(tested).passed, `${id}: fresh evidence cannot excuse unsafe configuration`);
        }
        initial = runAdvancedDiagnostic(initial, "service", "fail");
        const changed = applySolution(initial, scenario.solutions[0]);
        rejects(() => pinAdvancedEvidence(changed), `${id}: stale diagnostic cannot be pinned`);
        assert(!verifyAdvancedWorkbench(changed).passed, `${id}: repair without pinned baseline and fresh safety evidence does not pass`);
        assert(undoAdvancedChange(changed).revision === changed.revision + 1, `${id}: undo creates a new revision`);
        rejects(() => applyAdvancedChanges(initial, { unknown: "on" }), `${id}: unknown setting rejected`);
        rejects(() => validateAdvancedDraft(id, { values: { unknown: "on" }, test: "service", prediction: "pass" }), `${id}: unknown draft field rejected`);
        const saved = saveAdvancedWorkbench(solveAdvancedWorkbench(id));
        saved.pinned.at(-1).config[scenario.fields[0].id] = scenario.fields[0].initial;
        if (saved.pinned.at(-1).config[scenario.fields[0].id] !== saved.config[scenario.fields[0].id]) {
            rejects(() => restoreAdvancedWorkbench(id, saved), `${id}: current evidence must match the applied configuration`);
        }
    }
    let infrastructure = createAdvancedWorkbench("infrastructure");
    rejects(() => applyAdvancedChanges(infrastructure, advancedScenarios.infrastructure.solutions[0]), "Lease/cache refresh cannot precede applying changed DHCP/DNS settings");
    let capstone = createAdvancedWorkbench("capstone");
    rejects(() => applyAdvancedChanges(capstone, advancedScenarios.capstone.solutions[0]), "Capstone lease renewal follows the resolver change");
    return `Advanced workbench tests passed: ${passed} assertions.`;
}
