import { advancedScenarios } from "./advanced-scenarios.mjs";

const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const hasOnly = (value, names) => Object.keys(value).every(key => names.includes(key));
const copy = value => structuredClone(value);
const tests = ["service", "safety", "control"];
const predictions = ["pass", "fail", "unsure"];

function scenarioFor(id) {
    if (!Object.hasOwn(advancedScenarios, id)) throw new RangeError("Unknown advanced scenario.");
    return advancedScenarios[id];
}

function validateConfig(id, config) {
    const scenario = scenarioFor(id);
    if (!isRecord(config) || Object.keys(config).length !== scenario.fields.length) throw new TypeError("Saved advanced configuration is invalid.");
    const result = {};
    for (const field of scenario.fields) {
        const value = config[field.id];
        if (typeof value !== "string" || !field.options.some(([option]) => option === value)) throw new TypeError(`Invalid value for ${field.label}.`);
        result[field.id] = value;
    }
    return result;
}

export function createAdvancedWorkbench(id) {
    const scenario = scenarioFor(id);
    return {
        id, version: 1, config: Object.fromEntries(scenario.fields.map(field => [field.id, field.initial])),
        revision: 0, sequence: 0, results: [], pinned: [], undo: []
    };
}

export function validateAdvancedDraft(id, value) {
    const scenario = scenarioFor(id);
    if (!isRecord(value) || !hasOnly(value, ["values", "test", "prediction"]) ||
        !isRecord(value.values) || !tests.includes(value.test) || !predictions.includes(value.prediction)) {
        throw new TypeError("Saved advanced workbench draft is invalid.");
    }
    const values = {};
    for (const [key, entry] of Object.entries(value.values)) {
        const field = scenario.fields.find(item => item.id === key);
        if (!field || typeof entry !== "string" || !field.options.some(([option]) => option === entry)) throw new TypeError("Saved advanced workbench draft contains an invalid setting.");
        values[key] = entry;
    }
    return { values, test: value.test, prediction: value.prediction };
}

export function applyAdvancedChanges(state, changes) {
    const scenario = scenarioFor(state.id);
    if (!isRecord(changes) || Object.keys(changes).some(key => !scenario.fields.some(field => field.id === key))) throw new TypeError("Unknown advanced configuration setting.");
    const config = validateConfig(state.id, { ...state.config, ...changes });
    if (state.id === "infrastructure" &&
        ["relay", "scope", "resolver", "record"].some(key => config[key] !== state.config[key]) && config.cache === "fresh") {
        throw new TypeError("Apply the changed service settings with the client state marked old, then renew the lease and refresh the answer in a separate change.");
    }
    if (state.id === "capstone" && config.dns !== state.config.dns && config.lease === "renewed") {
        throw new TypeError("Apply the resolver change with the old lease first, then renew the client lease in a separate change.");
    }
    if (JSON.stringify(config) === JSON.stringify(state.config)) return state;
    return { ...state, config, revision: state.revision + 1, undo: [...state.undo.slice(-19), copy(state.config)] };
}

export function undoAdvancedChange(state) {
    if (!state.undo.length) return state;
    return { ...state, config: copy(state.undo.at(-1)), revision: state.revision + 1, undo: state.undo.slice(0, -1) };
}

export function diagnoseAdvanced(id, config, test, prediction = "unsure") {
    const scenario = scenarioFor(id);
    const checked = validateConfig(id, config);
    if (!tests.includes(test) || !predictions.includes(prediction)) throw new TypeError("Unknown simulated diagnostic or prediction.");
    const checks = scenario.checks.filter(item => item.categories.includes(test)).map(item => ({ label: item.label, ok: Boolean(item.test(checked)) }));
    if (!checks.length) throw new TypeError("This scenario has no checks for that diagnostic.");
    const ok = checks.every(item => item.ok);
    const output = [
        `SIMULATED ${test.toUpperCase()} CHECK · ${ok ? "PASS" : "FAIL"}`,
        scenario.context(checked),
        ...checks.map(item => `${item.ok ? "MET" : "NOT MET"} · ${item.label}`),
        prediction === "unsure" ? "No outcome prediction selected." : `Prediction: ${prediction} · ${prediction === (ok ? "pass" : "fail") ? "matched" : "did not match"} the model.`,
        "These are modeled results, not real network measurements."
    ].join("\n");
    return { test, prediction, ok, output };
}

export function runAdvancedDiagnostic(state, test, prediction) {
    const result = diagnoseAdvanced(state.id, state.config, test, prediction);
    const record = { ...result, id: state.sequence + 1, revision: state.revision, config: copy(state.config) };
    return { ...state, sequence: record.id, results: [...state.results.slice(-19), record] };
}

export function pinAdvancedEvidence(state) {
    const result = state.results.at(-1);
    if (!result) throw new RangeError("Run a diagnostic before pinning evidence.");
    if (result.revision !== state.revision) throw new RangeError("That diagnostic is stale. Run it again for the current configuration.");
    if (state.pinned.some(item => item.id === result.id)) return state;
    return { ...state, pinned: [...state.pinned.slice(-5), copy(result)] };
}

export function verifyAdvancedWorkbench(state) {
    const scenario = scenarioFor(state.id);
    const checked = validateConfig(state.id, state.config);
    const checks = [
        { label: "Pin a failing service diagnostic from before the repair", ok: state.pinned.some(item => item.test === "service" && !item.ok && item.revision < state.revision) },
        { label: "Pin a successful service diagnostic for the current revision", ok: state.pinned.some(item => item.test === "service" && item.ok && item.revision === state.revision) },
        { label: "Pin a successful safety diagnostic for the current revision", ok: state.pinned.some(item => item.test === "safety" && item.ok && item.revision === state.revision) },
        ...scenario.checks.map(item => ({ label: item.label, ok: Boolean(item.test(checked)) }))
    ];
    return { passed: checks.every(item => item.ok), checks, revision: state.revision };
}

export function saveAdvancedWorkbench(state) {
    return {
        id: state.id, version: 1, config: copy(state.config), revision: state.revision,
        pinned: state.pinned.map(({ id, revision, config, test, prediction }) => ({ id, revision, config: copy(config), test, prediction }))
    };
}

export function restoreAdvancedWorkbench(id, value) {
    if (!isRecord(value) || !hasOnly(value, ["id", "version", "config", "revision", "pinned"]) ||
        value.id !== id || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        !Array.isArray(value.pinned) || value.pinned.length > 6) throw new TypeError("Saved advanced workbench is invalid or unsupported.");
    const state = createAdvancedWorkbench(id);
    state.config = validateConfig(id, value.config);
    state.revision = value.revision;
    const seen = new Set();
    state.pinned = value.pinned.map(item => {
        if (!isRecord(item) || !hasOnly(item, ["id", "revision", "config", "test", "prediction"]) ||
            !Number.isSafeInteger(item.id) || item.id < 1 || seen.has(item.id) ||
            !Number.isSafeInteger(item.revision) || item.revision < 0 || item.revision > state.revision) {
            throw new TypeError("Saved advanced evidence is invalid.");
        }
        seen.add(item.id);
        const config = validateConfig(id, item.config);
        if (item.revision === state.revision && JSON.stringify(config) !== JSON.stringify(state.config)) throw new TypeError("Current evidence does not match the saved configuration.");
        return { ...diagnoseAdvanced(id, config, item.test, item.prediction), id: item.id, revision: item.revision, config };
    });
    state.sequence = Math.max(0, ...seen);
    return state;
}
