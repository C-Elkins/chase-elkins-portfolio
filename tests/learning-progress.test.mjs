import { createLearningStore, LEARNING_STORAGE_KEY, LEGACY_APPLIED_KEY, newLearningSnapshot, validateLearningSnapshot } from "../js/learning-progress.mjs";
import { createOpenCourseAdapter, emptyAssessment, recordOpenAttempt, openModulePassed } from "../js/open-course-progress.mjs";

const question = index => ({ prompt: `Question ${index}`, options: ["a", "b", "c", "d"], answer: index % 4 });
const modules = [
    { id: "first", chapters: ["first-lesson"], questions: Array.from({ length: 5 }, (_, index) => question(index)) },
    { id: "second", chapters: ["second-lesson"], questions: Array.from({ length: 5 }, (_, index) => question(index + 5)) }
];
const open = createOpenCourseAdapter({ id: "learn", modules });
const applied = {
    empty: () => ({ version: 1, score: 0 }),
    validate(value) {
        if (!value || value.version !== 1 || !Number.isInteger(value.score) || value.score < 0 || value.score > 30) throw new TypeError("Invalid applied record.");
        return { version: 1, score: value.score };
    }
};
const adapters = { learn: open, "applied-networking": applied };
const memoryStorage = records => ({
    getItem: key => records.has(key) ? records.get(key) : null,
    setItem: (key, value) => records.set(key, String(value)),
    removeItem: key => records.delete(key)
});

export function runLearningProgressTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const rejects = (fn, label) => { let threw = false; try { fn(); } catch { threw = true; } assert(threw, label); };
    let sequence = 0;
    const token = () => `test-${++sequence}`;
    const records = new Map([["portfolio-theme", "dark"], [LEGACY_APPLIED_KEY, JSON.stringify({ version: 1, score: 24 })]]);
    const storage = memoryStorage(records);
    const store = createLearningStore({ adapters, storage: () => storage, token, now: () => 100 });
    assert(store.course("applied-networking").load().score === 24, "Existing Applied progress migrates.");
    assert(records.get(LEGACY_APPLIED_KEY) === '{"version":1,"score":24}', "Migration retains the original record.");
    assert(JSON.parse(records.get(LEARNING_STORAGE_KEY)).legacyAppliedHandled, "Migration is marked durably.");

    let progress = open.empty();
    const quiz = emptyAssessment(modules[0].questions);
    quiz.answers[0] = 0;
    progress.assessments.first = quiz;
    progress.studied.push("first-lesson");
    progress.resume = "first-lesson";
    assert(store.course("learn").save(progress), "Draft and studied lesson save.");
    const restored = createLearningStore({ adapters, storage: () => storage, token, now: () => 101 });
    const reloaded = restored.course("learn").load();
    assert(reloaded.assessments.first.answers[0] === 0 && reloaded.studied[0] === "first-lesson", "Draft and lesson restore.");
    assert(reloaded.resume === "first-lesson", "Resume location restores.");

    const correct = modules[0].questions.map(item => item.answer);
    const four = [...correct]; four[0] = 1;
    progress.assessments.first = recordOpenAttempt(modules[0].questions, quiz, four);
    assert(openModulePassed(progress, modules[0]), "4/5 passes.");
    const three = [...four]; three[1] = 2;
    progress.assessments.first = recordOpenAttempt(modules[0].questions, progress.assessments.first, three);
    assert(openModulePassed(progress, modules[0]), "A failed retry preserves the earlier pass.");
    assert(progress.assessments.first.latest[1] === 2 && progress.assessments.first.best[1] === correct[1], "Latest and best attempts are separate.");
    assert(store.course("learn").save(progress), "Best and latest attempts save.");
    const stale = restored.course("learn").load();
    stale.resume = "second-lesson";
    assert(!restored.course("learn").save(stale) && restored.blocked && /another tab/i.test(restored.issue), "A stale tab does not overwrite newer progress.");
    assert(JSON.parse(records.get(LEARNING_STORAGE_KEY)).courses.learn.assessments.first.best[1] === correct[1], "Newer saved pass survives a stale write.");

    const snapshot = store.snapshot();
    const before = records.get(LEARNING_STORAGE_KEY);
    const invalid = structuredClone(snapshot);
    invalid.courses.learn.assessments.first.answers[0] = 9;
    rejects(() => store.validate(invalid), "Invalid answers are rejected.");
    assert(records.get(LEARNING_STORAGE_KEY) === before, "Validation never writes.");
    const changed = structuredClone(progress);
    changed.assessments.first.signature = "changed";
    rejects(() => open.validate(changed), "Changed question sets cannot reuse old answers.");
    rejects(() => recordOpenAttempt(modules[0].questions, quiz, [null, 1, 2, 3, 0]), "Incomplete attempts cannot pass.");
    rejects(() => validateLearningSnapshot({ ...snapshot, version: 99 }, adapters), "Future snapshot versions are rejected.");
    rejects(() => validateLearningSnapshot({ ...snapshot, courses: { unknown: {} } }, adapters), "Unknown courses are rejected.");

    const imported = structuredClone(snapshot);
    imported.courses.learn.resume = "second-lesson";
    assert(store.replace(imported, store.revision), "Validated snapshot replaces progress.");
    assert(store.course("learn").load().resume === "second-lesson", "Replacement restores the chosen snapshot.");
    assert(records.get("portfolio-theme") === "dark", "Restoring leaves the theme untouched.");
    rejects(() => store.replace(imported, "stale"), "A stale preview cannot replace newer work.");
    assert(store.course("applied-networking").reset(), "A course can be reset independently.");
    const afterReset = createLearningStore({ adapters, storage: () => storage, token, now: () => 102 });
    assert(afterReset.course("applied-networking").load().score === 0, "Reset does not resurrect legacy Applied progress.");
    assert(afterReset.course("learn").load().resume === "second-lesson", "Reset does not remove another course.");

    const corruptRecords = new Map([[LEARNING_STORAGE_KEY, "{invalid"]]);
    const corrupt = createLearningStore({ adapters, storage: () => memoryStorage(corruptRecords), token, now: () => 103 });
    assert(corrupt.blocked && /could not be read/i.test(corrupt.issue), "Corrupt storage is reported.");
    assert(!corrupt.course("learn").save(open.empty()) && corruptRecords.get(LEARNING_STORAGE_KEY) === "{invalid", "Corrupt storage is not silently overwritten.");
    const recovery = newLearningSnapshot();
    recovery.legacyAppliedHandled = true;
    recovery.courses.learn = progress;
    assert(corrupt.replace(recovery, corrupt.revision), "A confirmed valid recovery can replace corrupt data.");
    assert([...corruptRecords.entries()].some(([key, value]) => key.startsWith(`${LEARNING_STORAGE_KEY}:preserved:`) && value === "{invalid"), "The unreadable record is preserved during recovery.");

    const denied = createLearningStore({ adapters, storage: () => { throw new Error("blocked"); }, token, now: () => 104 });
    const draft = open.empty(); draft.studied.push("first-lesson");
    assert(!denied.course("learn").save(draft) && denied.course("learn").load().studied.length === 1, "Unavailable storage keeps current work in memory and reports failure.");
    const quotaRecords = new Map();
    const quota = createLearningStore({ adapters, storage: () => ({ ...memoryStorage(quotaRecords), setItem() { throw new Error("quota"); } }), token, now: () => 105 });
    assert(!quota.course("learn").save(draft) && quota.blocked && quotaRecords.size === 0, "A quota failure is explicit and writes nothing.");
    return `Learning progress tests passed: ${passed} assertions.`;
}
