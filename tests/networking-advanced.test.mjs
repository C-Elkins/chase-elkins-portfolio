import { advancedCourse } from "../js/networking-advanced.mjs";
import { advancedScenarios } from "../js/advanced-scenarios.mjs";
import { networkingModules } from "../js/networking-course.mjs";
import { networkingModules102 } from "../js/networking-course-102.mjs";
import { appliedCourse } from "../js/networking-applied.mjs";
import { guidedLessons } from "../js/network-guided.mjs";
import {
    newCourseProgress, eligibility, moduleComplete, makeAttempt, gradeAttempt,
    saveAssessmentDraft, restoreAssessmentDraft, recordAssessment, recordPractical,
    recordCapstone, courseComplete, validateCourseProgress
} from "../js/course-progression.mjs";

export function runNetworkingAdvancedTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const rejects = (fn, label) => { let threw = false; try { fn(); } catch { threw = true; } assert(threw, label); };
    const course = advancedCourse;
    const references = new Set([
        ...networkingModules.flatMap(module => module.chapters.map(chapter => `#${chapter.id || chapter}`)),
        ...networkingModules102.flatMap(module => module.chapters.map(chapter => `#${chapter.id || chapter}`)),
        ...appliedCourse.modules.flatMap(module => module.lessons.map(lesson => `#${lesson.id}`))
    ]);
    assert(course.modules.length === 10 && course.modules.every(module => module.lessons.length === 3), "Ten modules contain thirty lessons");
    assert(course.final.count === 30 && course.final.bank.length >= 60 && course.capstone, "Separate capstone and balanced 30-question final exist");
    assert(new Set(course.final.bank.map(question => question.id)).size === course.final.bank.length, "Final question IDs are unique");
    let progress = newCourseProgress(course);
    for (const [moduleIndex, module] of course.modules.entries()) {
        assert(Boolean(advancedScenarios[module.id]), `${module.id}: practical model exists`);
        assert(module.goals.length >= 3 && module.assessment.bank.length >= 10, `${module.id}: learning objectives and question bank`);
        assert(module.assessment.blueprint.map(item => item.count).join(",") === "2,2,1", `${module.id}: all lessons represented`);
        assert(module.challenge.hints.length >= 2 && advancedScenarios[module.id].limit, `${module.id}: hints and model limits`);
        assert(eligibility(course, progress, module.id).allowed, `${module.id}: preceding practical and check unlock it`);
        if (moduleIndex + 1 < course.modules.length) {
            assert(!eligibility(course, progress, course.modules[moduleIndex + 1].id).allowed, `${module.id}: next stage is locked`);
        }
        module.lessons.forEach(lesson => {
            assert(lesson.intro.length > 100 && lesson.sections.length >= 2 && lesson.sections.every(section => section.text.length > 200), `${lesson.id}: substantive hosted lesson`);
            assert(lesson.example?.text && lesson.misconception && lesson.reflection?.answer, `${lesson.id}: example and reasoning`);
            lesson.review.forEach(item => assert(references.has(item.href), `${lesson.id}: real review target ${item.href}`));
            lesson.studio.forEach(item => assert(Object.hasOwn(guidedLessons, item.id), `${lesson.id}: real Studio target`));
            lesson.figures.forEach(figure => {
                assert(figure.title && figure.desc && figure.caption && figure.nodes.length >= 3, `${lesson.id}: accessible diagram`);
                assert(figure.edges.every(edge => figure.nodes.some(node => node.id === edge.from) && figure.nodes.some(node => node.id === edge.to)), `${lesson.id}: valid diagram edges`);
            });
        });
        assert(module.lessons.some(lesson => lesson.figures.length), `${module.id}: diagram supplied`);
        const allQuestions = [...module.assessment.bank, ...course.final.bank.filter(question => question.topic === module.id)];
        assert(course.final.bank.filter(question => question.topic === module.id).length >= 6, `${module.id}: distinct final pool`);
        assert(new Set(allQuestions.map(question => question.prompt)).size === allQuestions.length, `${module.id}: check and final prompts are distinct`);
        allQuestions.forEach(question => {
            assert(question.prompt && question.explanation && question.objective && module.lessons.some(lesson => question.study === `#${lesson.id}`), `${question.id}: lesson-specific feedback`);
            assert(question.options.length === 4 && new Set(question.options).size === 4 && question.answer >= 0 && question.answer < 4, `${question.id}: valid distinct choices`);
        });
        for (let iteration = 0; iteration < 10; iteration++) {
            const attempt = makeAttempt(module.assessment);
            assert(module.assessment.blueprint.every(({ topic, count }) => attempt.filter(question => question.topic === topic).length === count), `${module.id}: balanced check`);
            const answers = attempt.map(question => question.answer);
            assert(gradeAttempt(attempt, answers).passed, `${module.id}: correct shuffled choices pass`);
            answers[0] = (answers[0] + 1) % 4;
            assert(gradeAttempt(attempt, answers).passed, `${module.id}: 4/5 passes`);
            answers[1] = (answers[1] + 1) % 4;
            assert(!gradeAttempt(attempt, answers).passed, `${module.id}: 3/5 fails`);
            const saved = saveAssessmentDraft(attempt, [answers[0], null, null, null, null]);
            const restored = restoreAssessmentDraft(module.assessment, saved);
            assert(JSON.stringify(restored.attempt.map(question => [question.id, question.options])) === JSON.stringify(attempt.map(question => [question.id, question.options])) && restored.answers[0] === answers[0], `${module.id}: draft preserves question order and answer`);
        }
        progress = recordAssessment(course, progress, module.id, { complete: true, correct: 4, total: 5 });
        assert(!moduleComplete(progress, module.id), `${module.id}: a quiz alone cannot complete a module`);
        progress = recordPractical(course, progress, module.id, { passed: true, checks: [{ ok: true }] });
        progress = recordAssessment(course, progress, module.id, { complete: true, correct: 3, total: 5 });
        assert(moduleComplete(progress, module.id) && progress.latest[module.id].correct === 3, `${module.id}: earned pass survives a failed retry`);
    }
    assert(eligibility(course, progress, "capstone").allowed && !eligibility(course, progress, "final").allowed, "Separate capstone gates the final");
    rejects(() => recordAssessment(course, progress, "final", { complete: true, correct: 30, total: 30 }), "Final cannot bypass capstone");
    progress = recordCapstone(course, progress, { passed: true, checks: [{ ok: true }] });
    for (let iteration = 0; iteration < 20; iteration++) {
        const attempt = makeAttempt(course.final);
        assert(course.modules.every(module => attempt.filter(question => question.topic === module.id).length === 3), "Final contains three questions from each module");
        const answers = attempt.map(question => question.answer);
        for (let index = 0; index < 6; index++) answers[index] = (answers[index] + 1) % 4;
        assert(gradeAttempt(attempt, answers).passed && gradeAttempt(attempt, answers).correct === 24, "24/30 passes");
        answers[6] = (answers[6] + 1) % 4;
        assert(!gradeAttempt(attempt, answers).passed && gradeAttempt(attempt, answers).correct === 23, "23/30 does not pass");
    }
    progress = recordAssessment(course, progress, "final", { complete: true, correct: 24, total: 30 });
    assert(courseComplete(course, validateCourseProgress(course, JSON.parse(JSON.stringify(progress)))), "Full course completion validates and restores");
    const invalid = structuredClone(progress);
    invalid.capstone = false;
    rejects(() => validateCourseProgress(course, invalid), "A saved final cannot bypass the capstone");
    return `Advanced curriculum tests passed: ${passed} assertions.`;
}

export async function runNetworkingAdvancedUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 50));
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await settle();
    };

    await go("#applied-networking");
    const appliedChecklist = document.querySelector("#applied-networking .gc-prerequisite-checklist");
    assert(!$("applied-networking").hidden && appliedChecklist?.textContent.includes("Networking 101 · 0/14 quizzes passed"), "Applied overview shows the missing 101 prerequisite count");
    assert(appliedChecklist.textContent.includes("Networking 102 · 0/14 quizzes passed") && appliedChecklist.textContent.includes("Pass every Networking 101 and 102"), "Applied overview explains both prerequisite sets and the 4/5 rule");
    const missing = appliedChecklist.querySelector("a.gc-primary");
    assert(missing?.hash === "#quiz-foundations", "Applied directs the learner to the first missing quiz");
    await go("#applied-readiness");
    assert(document.querySelector("#applied-networking .gc-lock-notice")?.textContent.includes("Go to the next missing activity"), "Direct readiness route cannot bypass the 101/102 requirements");

    await go("#advanced-networking");
    const advancedPrereqs = document.querySelector("#advanced-networking .gc-prerequisite-checklist");
    assert(!$("advanced-networking").hidden && advancedPrereqs?.textContent.includes("Applied Networking · 0/8 modules complete"), "Advanced checklist shows Applied module progress");
    assert(advancedPrereqs.textContent.includes("Readiness test · 16/20 required") && advancedPrereqs.textContent.includes("Final exam · 24/30 required"), "Advanced lists exact Applied readiness and final thresholds");
    const status = document.querySelector("#advanced-networking .gc-progress-checklist");
    assert(status?.textContent.includes("0/22 required activities complete") && status.textContent.includes("Completed · 0 required activities") && status.textContent.includes("Not completed · 22 required activities"), "Advanced clearly separates its completed and outstanding work");
    await go("#advanced-architecture");
    assert(document.querySelector("#advanced-networking .gc-lock-notice")?.textContent.includes("Pass every Networking 101 and 102"), "Direct Advanced module route cannot bypass foundations or Applied");
    assert(document.querySelector("#advanced-networking .gc-lock-notice a.gc-primary")?.hash === "#quiz-foundations", "Advanced lock offers a direct path to the missing prerequisite");
    return `Advanced course UI tests passed: ${passed} assertions.`;
}
