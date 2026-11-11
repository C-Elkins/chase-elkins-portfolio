import { createCourseStore } from "../js/course-progress.js";
import { newCourseProgress, recordAssessment, recordPractical } from "../js/course-progression.mjs";
import { fixtureCourse } from "./course-progression.test.mjs";
import { saveWorkbench, restoreWorkbench } from "../js/network-workbench-model.mjs";
import { solveWorkbench } from "./network-workbench-model.test.mjs";

export function runCourseProgressTests() {
    let passed = 0;
    const assert = (value, label) => { if (!value) throw new Error(label); passed++; };
    const records = new Map([["portfolio-theme", "dark"]]);
    const storage = {
        getItem: key => records.has(key) ? records.get(key) : null,
        setItem: (key, value) => records.set(key, value),
        removeItem: key => records.delete(key)
    };
    const options = { storage: () => storage, validateWorkbench: (id, value) => saveWorkbench(restoreWorkbench(id, value)) };
    const store = createCourseStore(fixtureCourse, options);
    let progress = store.load();
    assert(!store.issue && !progress.readiness, "Fresh browser starts empty");
    progress = recordAssessment(fixtureCourse, progress, "readiness", { complete: true, correct: 16, total: 20 });
    progress = recordPractical(fixtureCourse, progress, "baseline", { passed: true, checks: [{ ok: true }] });
    progress.workbenches.baseline = saveWorkbench(solveWorkbench("baseline"));
    assert(store.save(progress), "Earned progress saves");
    const reloaded = createCourseStore(fixtureCourse, options).load();
    assert(reloaded.modules.baseline.practical && reloaded.readiness.correct === 16, "Reload restores earned stage results");
    assert(restoreWorkbench("baseline", reloaded.workbenches.baseline).pinned.length === 2, "Reload restores validated structured evidence");
    const original = records.get(store.key);
    records.set(store.key, "{bad json");
    const broken = createCourseStore(fixtureCourse, options);
    assert(!broken.load().readiness && broken.blocked && broken.issue, "Corrupt save produces explicit visit-only fallback");
    assert(broken.issue.includes("could not be read") && !broken.issue.includes("{bad json"), "Unreadable progress gets an actionable message without reflecting its raw contents");
    assert(!broken.save(newCourseProgress(fixtureCourse)) && records.get(store.key) === "{bad json", "Fallback does not overwrite recoverable corrupt record");
    assert(broken.reset() && !broken.issue && !records.has(store.key), "Confirmed reset removes only course record");
    assert(records.get("portfolio-theme") === "dark", "Theme survives course reset");
    records.set(store.key, "");
    const empty = createCourseStore(fixtureCourse, options);
    empty.load();
    assert(empty.blocked && !empty.save(progress) && records.get(store.key) === "", "An empty stored record is corrupt, not a missing record that may be overwritten");
    records.set(store.key, original);
    const blocked = createCourseStore(fixtureCourse, { storage: () => { throw new Error("Storage access blocked."); } });
    assert(blocked.load().modules && blocked.issue.includes("Storage access blocked") && !blocked.save(progress), "Denied storage is clearly reported, not success-shaped");
    const quota = createCourseStore(fixtureCourse, { storage: () => ({ ...storage, setItem() { throw new Error("Quota exceeded."); } }) });
    quota.load();
    assert(!quota.save(progress) && quota.issue.includes("Quota exceeded"), "Failed write never claims save succeeded");
    const record = JSON.parse(original);
    record.workbenches.baseline.config.client.prefix = 99;
    records.set(store.key, JSON.stringify(record));
    const invalid = createCourseStore(fixtureCourse, options);
    invalid.load();
    assert(invalid.issue && invalid.blocked, "Invalid saved device configuration cannot silently restore");
    return `Course persistence tests passed: ${passed} assertions.`;
}
