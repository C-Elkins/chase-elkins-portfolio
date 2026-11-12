import { makeRecoveryCode, readRecoveryCode, MAX_BACKUP_TEXT } from "../js/learning-backup.mjs";
import { createLearningStore, newLearningSnapshot, LEARNING_STORAGE_KEY, LEGACY_APPLIED_KEY } from "../js/learning-progress.mjs";
import { createLearningAdapters, foundationRequirements, appliedRequirements, guidedEntryRequirement } from "../js/learning-courses.mjs";
import { recordOpenAttempt, emptyAssessment } from "../js/open-course-progress.mjs";
import { newCourseProgress, recordAssessment, recordPractical } from "../js/course-progression.mjs";
import { appliedCourse } from "../js/networking-applied.mjs";
import { createWorkbench, saveWorkbench } from "../js/network-workbench-model.mjs";

export async function runLearningBackupTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const rejects = async (fn, label) => { let threw = false; try { await fn(); } catch { threw = true; } assert(threw, label); };
    const adapters = createLearningAdapters();
    const records = new Map([["portfolio-theme", "dark"]]);
    const storage = {
        getItem: key => records.has(key) ? records.get(key) : null,
        setItem: (key, value) => records.set(key, String(value))
    };
    let token = 0;
    const store = createLearningStore({ adapters, storage: () => storage, token: () => `revision-${++token}`, now: () => 100 });
    const foundations = store.course("learn").load();
    foundations.studied.push(adapters.learn.modules[0].chapters[0]);
    foundations.exercises.subnet = { a: "192.168.", b: "10.0.0.1", prefix: "/2" };
    const first = adapters.learn.modules[0];
    foundations.assessments[first.id] = emptyAssessment(first.questions);
    foundations.assessments[first.id].answers[0] = 1;
    assert(store.course("learn").save(foundations), "Unfinished answers and partial exercise inputs save");
    const snapshot = store.snapshot();
    const code = await makeRecoveryCode(store.validate(snapshot));
    const imported = await readRecoveryCode(`\n${code}\n`, value => store.validate(value));
    assert(JSON.stringify(imported) === JSON.stringify(snapshot), "Recovery code round-trips the complete validated snapshot");
    assert(imported.courses.learn.exercises.subnet.a === "192.168." && imported.courses.learn.assessments[first.id].answers[0] === 1, "Recovery preserves unfinished input");
    await rejects(() => readRecoveryCode("", value => store.validate(value)), "Empty code rejected");
    await rejects(() => readRecoveryCode("PL1.!!", value => store.validate(value)), "Invalid encoding rejected");
    await rejects(() => readRecoveryCode(code.slice(0, -8), value => store.validate(value)), "Truncated backup rejected");
    await rejects(() => readRecoveryCode("x".repeat(MAX_BACKUP_TEXT + 1), value => store.validate(value)), "Oversized backup rejected");
    const decode = text => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.slice(4).replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0))));
    const encode = value => `PL1.${btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    const damaged = decode(code);
    damaged.snapshot.savedAt++;
    await rejects(() => readRecoveryCode(encode(damaged), value => store.validate(value)), "Checksum detects accidental content changes");
    const future = decode(code); future.version = 2;
    await rejects(() => readRecoveryCode(encode(future), value => store.validate(value)), "Unsupported backup version rejected");
    const unknown = structuredClone(snapshot); unknown.courses.unknown = {};
    await rejects(async () => readRecoveryCode(await makeRecoveryCode(unknown), value => store.validate(value)), "Unknown course rejected even with a matching checksum");
    const badAnswer = structuredClone(snapshot); badAnswer.courses.learn.assessments[first.id].answers[0] = 9;
    await rejects(async () => readRecoveryCode(await makeRecoveryCode(badAnswer), value => store.validate(value)), "Out-of-range answers rejected");
    const badExercise = structuredClone(snapshot); badExercise.courses.learn.exercises.printerTrail = [false, true];
    await rejects(async () => readRecoveryCode(await makeRecoveryCode(badExercise), value => store.validate(value)), "Impossible troubleshooting paths rejected");
    const revision = store.revision;
    const next = store.course("learn").load(); next.studied = [];
    store.course("learn").save(next);
    await rejects(() => Promise.resolve(store.replace(imported, revision)), "A stale comparison cannot replace progress");
    assert(records.get("portfolio-theme") === "dark", "Backup and preview leave unrelated storage alone");

    const prerequisites = newLearningSnapshot();
    assert(foundationRequirements(prerequisites).every(group => group.missing.length === 14), "All 28 foundational quizzes are initially missing");
    assert(!guidedEntryRequirement("applied-networking", prerequisites).allowed, "Applied readiness requires the foundation quizzes");
    for (const id of ["learn", "learn102"]) {
        const progress = adapters[id].empty();
        adapters[id].modules.forEach(module => {
            const answers = module.questions.map(question => question.answer);
            answers[0] = (answers[0] + 1) % 4;
            progress.assessments[module.id] = recordOpenAttempt(module.questions, emptyAssessment(module.questions), answers);
        });
        prerequisites.courses[id] = adapters[id].validate(progress);
    }
    assert(guidedEntryRequirement("applied-networking", prerequisites).allowed, "Exactly 4/5 in all 28 modules unlocks Applied readiness");
    let applied = newCourseProgress(appliedCourse);
    applied = recordAssessment(appliedCourse, applied, "readiness", { complete: true, correct: 16, total: 20 });
    for (const module of appliedCourse.modules) {
        applied = recordAssessment(appliedCourse, applied, module.id, { complete: true, correct: 4, total: 5 });
        applied = recordPractical(appliedCourse, applied, module.id, { passed: true, checks: [{ ok: true }] });
    }
    applied = recordAssessment(appliedCourse, applied, "final", { complete: true, correct: 24, total: 30 });
    prerequisites.courses[appliedCourse.id] = adapters[appliedCourse.id].validate(applied);
    assert(appliedRequirements(prerequisites).complete && guidedEntryRequirement("advanced-networking", prerequisites).allowed, "Advanced requires and recognizes complete Applied work");
    delete prerequisites.courses.learn102.assessments[adapters.learn102.modules[0].id];
    assert(!guidedEntryRequirement("advanced-networking", prerequisites).allowed && prerequisites.courses[appliedCourse.id].final.correct === 24, "Missing foundations relock Advanced without erasing Applied results");

    const legacy = newCourseProgress(appliedCourse);
    const withReadiness = recordAssessment(appliedCourse, legacy, "readiness", { complete: true, correct: 16, total: 20 });
    withReadiness.workbenches.baseline = saveWorkbench(createWorkbench("baseline"));
    const legacyRaw = JSON.stringify(withReadiness);
    const migrationRecords = new Map([[LEGACY_APPLIED_KEY, legacyRaw]]);
    const legacyStorage = { getItem: key => migrationRecords.get(key) ?? null, setItem: (key, value) => migrationRecords.set(key, String(value)) };
    const migrated = createLearningStore({ adapters, storage: () => legacyStorage, token: () => "migrated", now: () => 100 });
    assert(migrated.course(appliedCourse.id).load().readiness.correct === 16 && migrated.course(appliedCourse.id).load().workbenches.baseline, "Actual Applied score and workbench migrate");
    assert(migrationRecords.get(LEGACY_APPLIED_KEY) === legacyRaw && migrationRecords.has(LEARNING_STORAGE_KEY), "Migration retains the original legacy record");
    const unsafeDraft = structuredClone(withReadiness); unsafeDraft.workbenchDrafts.baseline = { selected: "client", values: { "network.allowGuest": true } };
    await rejects(() => Promise.resolve(adapters[appliedCourse.id].validate(unsafeDraft)), "A draft cannot edit fields outside its scenario");
    return `Learning backup tests passed: ${passed} assertions.`;
}
