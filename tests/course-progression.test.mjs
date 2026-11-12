import { newCourseProgress, eligibility, moduleComplete, makeAttempt, gradeAttempt, saveAssessmentDraft, restoreAssessmentDraft, recordAssessment, recordPractical, recordCapstone, courseComplete, validateCourseProgress } from "../js/course-progression.mjs";

const bank = (count, topic) => Array.from({ length: count }, (_, index) => ({ id: `${topic}-${index}`, topic, options: ["a", "b", "c", "d"], answer: index % 4 }));
const spec = (count, topic) => ({ count, bank: bank(count * 2, topic), blueprint: [{ topic, count }] });
export const fixtureCourse = {
    id: "applied-networking", version: 1, readiness: spec(20, "entry"), final: spec(30, "final"),
    modules: ["baseline", "addressing", "segmentation", "services", "transport", "wireless", "vpn", "capstone"].map(id => ({ id, title: id, lessons: [{ id: `applied-${id}-1` }], assessment: spec(5, id) }))
};
const grade = (correct, total) => ({ correct, total, complete: true });

export function runCourseProgressionTests() {
    let passed = 0;
    const assert = (value, label) => { if (!value) throw new Error(label); passed++; };
    const rejects = (fn, label) => { let threw = false; try { fn(); } catch { threw = true; } assert(threw, label); };
    const course = fixtureCourse;
    let progress = newCourseProgress(course);
    for (const stage of [...course.modules.map(module => module.id), "final"]) assert(!eligibility(course, progress, stage).allowed, `${stage}: readiness required`);
    progress = recordAssessment(course, progress, "readiness", grade(15, 20));
    assert(!eligibility(course, progress, "baseline").allowed, "15/20 readiness does not pass");
    progress = recordAssessment(course, progress, "readiness", grade(16, 20));
    assert(eligibility(course, progress, "baseline").allowed, "16/20 readiness passes");
    assert(!eligibility(course, progress, "addressing").allowed, "Readiness never skips module 1");
    for (const module of course.modules) {
        assert(eligibility(course, progress, module.id).allowed, `${module.id}: prior combined passes unlock`);
        progress = recordAssessment(course, progress, module.id, grade(3, 5));
        assert(!moduleComplete(progress, module.id), `${module.id}: 3/5 fails`);
        progress = recordAssessment(course, progress, module.id, grade(4, 5));
        assert(!moduleComplete(progress, module.id), `${module.id}: passing quiz alone is insufficient`);
        progress = recordPractical(course, progress, module.id, { passed: true, checks: [{ ok: true }] });
        assert(moduleComplete(progress, module.id), `${module.id}: practical and 4/5 pass`);
        progress = recordAssessment(course, progress, module.id, grade(0, 5));
        assert(moduleComplete(progress, module.id), `${module.id}: failed retry does not remove earned pass`);
        assert(progress.latest[module.id].correct === 0 && progress.modules[module.id].score.correct === 4, `${module.id}: latest and best remain distinct`);
    }
    assert(eligibility(course, progress, "final").allowed, "Final requires every combined module pass");
    progress = recordAssessment(course, progress, "final", grade(23, 30));
    assert(!courseComplete(course, progress), "23/30 final fails");
    progress = recordAssessment(course, progress, "final", grade(24, 30));
    assert(courseComplete(course, progress), "24/30 final passes");
    assert(courseComplete(course, validateCourseProgress(course, JSON.parse(JSON.stringify(progress)))), "Valid saved completion restores");
    const early = newCourseProgress(course);
    rejects(() => recordAssessment(course, early, "final", grade(30, 30)), "Final cannot bypass prerequisites");
    rejects(() => recordAssessment(course, progress, "final", grade(31, 30)), "Invalid scores rejected");
    rejects(() => recordPractical(course, progress, "baseline", { passed: true, checks: [{ ok: false }] }), "Unsuccessful practical cannot be recorded");
    rejects(() => validateCourseProgress(course, { ...progress, version: 99 }), "Unknown version rejected explicitly");
    const corrupt = structuredClone(progress);
    corrupt.modules.baseline.practical = false;
    rejects(() => validateCourseProgress(course, corrupt), "Inconsistent saved chain cannot unlock stages");
    for (let index = 0; index < 30; index++) {
        const attempt = makeAttempt(course.final);
        assert(new Set(attempt.map(item => item.id)).size === 30, "No repeated questions in an attempt");
        const perfect = gradeAttempt(attempt, attempt.map(item => item.answer));
        assert(perfect.passed && perfect.correct === 30, "Option shuffling preserves answer mappings");
        const missing = gradeAttempt(attempt, attempt.map((item, i) => i ? item.answer : null));
        assert(!missing.complete && !missing.passed && missing.missing[0] === 0, "Missing answer never passes");
    }
    rejects(() => gradeAttempt(makeAttempt(course.final), [1]), "Missing answer slots rejected");
    const duplicated = makeAttempt(course.final);
    duplicated[1] = duplicated[0];
    rejects(() => gradeAttempt(duplicated, duplicated.map(item => item.answer)), "Duplicate question attempts rejected");
    rejects(() => makeAttempt({ ...course.final, count: 29 }), "Invalid blueprint total rejected");
    rejects(() => makeAttempt(course.final, () => 1), "Out-of-bounds random source rejected");
    const attempt = makeAttempt(course.readiness);
    const answers = attempt.map((item, index) => index % 2 ? item.answer : null);
    const draft = saveAssessmentDraft(attempt, answers);
    const restored = restoreAssessmentDraft(course.readiness, JSON.parse(JSON.stringify(draft)));
    assert(JSON.stringify(restored.attempt.map(item => [item.id, item.options, item.answer])) === JSON.stringify(attempt.map(item => [item.id, item.options, item.answer])), "A shuffled question and option order restores exactly");
    assert(JSON.stringify(restored.answers) === JSON.stringify(answers) && restored.grade === null, "An unfinished draft keeps its selections");
    rejects(() => saveAssessmentDraft(attempt, answers, true), "Incomplete attempts cannot be marked submitted");
    const submitted = saveAssessmentDraft(attempt, attempt.map(item => item.answer), true);
    assert(restoreAssessmentDraft(course.readiness, submitted).grade.passed, "Submitted draft is regraded from canonical questions");
    const duplicate = structuredClone(draft); duplicate.questions[1].id = duplicate.questions[0].id;
    rejects(() => restoreAssessmentDraft(course.readiness, duplicate), "Duplicate saved question IDs are rejected");
    const badOrder = structuredClone(draft); badOrder.questions[0].order[0] = badOrder.questions[0].order[1];
    rejects(() => restoreAssessmentDraft(course.readiness, badOrder), "Invalid option permutations are rejected");
    const badAnswer = structuredClone(draft); badAnswer.answers[0] = 4;
    rejects(() => restoreAssessmentDraft(course.readiness, badAnswer), "Invalid saved answers are rejected");
    const changed = structuredClone(course.readiness);
    changed.bank.find(item => item.id === draft.questions[0].id).options[0] = "A changed option";
    rejects(() => restoreAssessmentDraft(changed, draft), "Changed question content cannot silently reuse answers");
    const advanced = { ...course, id: "advanced-networking", routePrefix: "advanced", readiness: null, modules: course.modules.slice(0, 2), capstone: {} };
    let advancedProgress = newCourseProgress(advanced);
    assert(eligibility(advanced, advancedProgress, "baseline").allowed, "A course without readiness starts at module one");
    assert(!eligibility(advanced, advancedProgress, "capstone").allowed, "The capstone requires every module");
    for (const module of advanced.modules) {
        advancedProgress = recordAssessment(advanced, advancedProgress, module.id, grade(4, 5));
        advancedProgress = recordPractical(advanced, advancedProgress, module.id, { passed: true, checks: [{ ok: true }] });
    }
    assert(!eligibility(advanced, advancedProgress, "final").allowed, "A separate capstone gates the final");
    rejects(() => recordCapstone(advanced, advancedProgress, { passed: true, checks: [{ ok: false }] }), "Unsuccessful capstone evidence cannot pass");
    advancedProgress = recordCapstone(advanced, advancedProgress, { passed: true, checks: [{ ok: true }] });
    advancedProgress = recordAssessment(advanced, advancedProgress, "final", grade(24, 30));
    assert(courseComplete(advanced, validateCourseProgress(advanced, advancedProgress)), "Advanced completion survives validation without an internal readiness test");
    return `Course progression tests passed: ${passed} assertions.`;
}
