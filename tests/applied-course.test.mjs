import { appliedCourse } from "../js/networking-applied.mjs";
import { initializeGuidedCourse } from "../js/guided-course.js";
import { newCourseProgress, recordAssessment, recordPractical } from "../js/course-progression.mjs";
import { solveWorkbench } from "./network-workbench-model.test.mjs";
import { saveWorkbench, verifyWorkbench } from "../js/network-workbench-model.mjs";
import { createLearningStore, LEARNING_STORAGE_KEY, LEGACY_APPLIED_KEY } from "../js/learning-progress.mjs";
import { createLearningAdapters } from "../js/learning-courses.mjs";
import { emptyAssessment, recordOpenAttempt } from "../js/open-course-progress.mjs";

export async function runAppliedCourseUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const previous = localStorage.getItem(LEARNING_STORAGE_KEY);
    const previousLegacy = localStorage.getItem(LEGACY_APPLIED_KEY);
    localStorage.removeItem(LEARNING_STORAGE_KEY);
    localStorage.removeItem(LEGACY_APPLIED_KEY);
    const adapters = createLearningAdapters();
    const learningStore = createLearningStore({ adapters });
    const store = learningStore.course(appliedCourse.id);
    const host = document.createElement("section");
    document.body.append(host);
    let route;
    try {
        route = initializeGuidedCourse({ course: appliedCourse, root: host, store, learningStore });
        route("applied-final");
        await settle();
        assert(!host.querySelector('[data-assessment-stage="final"]'), "Fresh deep-link cannot start final");
        assert(host.textContent.includes("Pass every Networking 101 and 102"), "Applied lock explains its missing foundation quizzes");
        route("applied-baseline-1");
        await settle();
        assert(!host.querySelector("[data-workbench]"), "Deep lesson link cannot bypass readiness");
        const completeFoundation = id => {
            const adapter = adapters[id];
            const progress = adapter.empty();
            adapter.modules.forEach(module => {
                const answers = module.questions.map(question => question.answer);
                answers[0] = (answers[0] + 1) % 4;
                progress.assessments[module.id] = recordOpenAttempt(module.questions, emptyAssessment(module.questions), answers);
            });
            learningStore.course(id).save(progress);
        };
        completeFoundation("learn");
        completeFoundation("learn102");
        route("applied-readiness");
        await settle();
        let form = host.querySelector('[data-assessment-stage="readiness"]');
        if (!form) {
            const start = [...host.querySelectorAll("button")].find(button => /^(start|begin)\b/i.test(button.textContent.trim()));
            start?.click();
            await settle();
            form = host.querySelector('[data-assessment-stage="readiness"]');
        }
        assert(Boolean(form), "Readiness can be started without prerequisites");
        form.requestSubmit();
        await settle();
        assert(!store.load().readiness, "Incomplete assessment never records readiness");
        const answer = async (stage, bank, wrong = 0) => {
            const currentForm = host.querySelector(`[data-assessment-stage="${stage}"]`);
            const questions = new Map(bank.map(question => [question.id, question]));
            let index = 0;
            for (const field of currentForm.querySelectorAll("[data-question-id]")) {
                const question = questions.get(field.dataset.questionId);
                assert(Boolean(question), "Attempt question comes from its approved bank");
                const text = question.options[index++ < wrong ? (question.answer + 1) % 4 : question.answer];
                const option = [...field.querySelectorAll("label")].find(label => {
                    const span = label.querySelector("span");
                    return (span || label).textContent.trim() === text;
                });
                assert(Boolean(option), "Shuffled correct option retains its taught text");
                const input = option.querySelector("input");
                input.checked = true;
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
            currentForm.requestSubmit();
            await settle();
        };
        await answer("readiness", appliedCourse.readiness.bank);
        assert(store.load().readiness?.correct === 20, "Complete actual readiness form saves a passing score");
        route("applied-baseline");
        await settle();
        assert(host.textContent.includes(appliedCourse.modules[0].lessons[0].title) && [...host.querySelectorAll("button")].some(button => button.textContent === "Practical workbench"), "Passing readiness opens first module and its practical navigation");
        route("applied-addressing");
        await settle();
        assert(!host.textContent.includes(appliedCourse.modules[1].lessons[0].intro), "Readiness does not unlock second module's teaching content");
        let progress = recordAssessment(appliedCourse, newCourseProgress(appliedCourse), "readiness", { complete: true, correct: 16, total: 20 });
        for (const module of appliedCourse.modules) {
            progress = recordPractical(appliedCourse, progress, module.id, verifyWorkbench(solveWorkbench(module.id)));
            progress = recordAssessment(appliedCourse, progress, module.id, { complete: true, correct: 4, total: 5 });
            progress.workbenches[module.id] = saveWorkbench(solveWorkbench(module.id));
        }
        store.save(progress);
        route.pause();
        host.replaceChildren();
        route = initializeGuidedCourse({ course: appliedCourse, root: host, store, learningStore });
        route("applied-final");
        await settle();
        let final = host.querySelector('[data-assessment-stage="final"]');
        if (!final) {
            [...host.querySelectorAll("button")].find(button => /^(start|begin)\b/i.test(button.textContent.trim()))?.click();
            await settle();
            final = host.querySelector('[data-assessment-stage="final"]');
        }
        assert(Boolean(final), "Saved combined module passes unlock actual final");
        assert(!store.load().final, "Merely viewing final never completes course");
        await answer("final", appliedCourse.final.bank, 6);
        assert(store.load().final?.correct === 24, "Actual shuffled final submission records the exact 24/30 pass boundary");
        route("applied-services-2");
        await settle();
        assert(host.textContent.includes(appliedCourse.modules.find(module => module.id === "services").lessons[1].title), "Saved passes permit targeted lesson study links");
        assert(!host.textContent.includes("certified network engineer"), "No professional certification claim");
        route("applied-networking");
        await settle();
        const completion = host.querySelector(".gc-completion");
        assert(completion?.querySelector("h3")?.textContent.includes("completed") && completion.textContent.includes(appliedCourse.title), "Applied completion is clearly marked after every requirement passes");
        assert(host.querySelector(".gc-progress-checklist")?.textContent.includes("18/18 required activities complete"), "Applied checklist separates completed requirements from remaining work");
    } finally {
        route?.pause();
        host.remove();
        if (previous === null) localStorage.removeItem(LEARNING_STORAGE_KEY);
        else localStorage.setItem(LEARNING_STORAGE_KEY, previous);
        if (previousLegacy === null) localStorage.removeItem(LEGACY_APPLIED_KEY);
        else localStorage.setItem(LEGACY_APPLIED_KEY, previousLegacy);
    }
    return `Applied course UI tests passed: ${passed} assertions.`;
}
