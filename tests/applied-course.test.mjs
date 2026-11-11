import { appliedCourse } from "../js/networking-applied.mjs";
import { initializeGuidedCourse } from "../js/guided-course.js";
import { createCourseStore } from "../js/course-progress.js";
import { newCourseProgress, recordAssessment, recordPractical } from "../js/course-progression.mjs";
import { solveWorkbench } from "./network-workbench-model.test.mjs";
import { saveWorkbench, verifyWorkbench } from "../js/network-workbench-model.mjs";

export async function runAppliedCourseUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const store = createCourseStore(appliedCourse);
    const previous = localStorage.getItem(store.key);
    const host = document.createElement("section");
    document.body.append(host);
    let route;
    try {
        localStorage.removeItem(store.key);
        route = initializeGuidedCourse({ course: appliedCourse, root: host });
        route("applied-final");
        await settle();
        assert(!host.querySelector('[data-assessment-stage="final"]'), "Fresh deep-link cannot start final");
        route("applied-baseline-1");
        await settle();
        assert(!host.querySelector("[data-workbench]"), "Deep lesson link cannot bypass readiness");
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
        assert(!createCourseStore(appliedCourse).load().readiness, "Incomplete assessment never records readiness");
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
        assert(createCourseStore(appliedCourse).load().readiness?.correct === 20, "Complete actual readiness form saves a passing score");
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
        route = initializeGuidedCourse({ course: appliedCourse, root: host });
        route("applied-final");
        await settle();
        let final = host.querySelector('[data-assessment-stage="final"]');
        if (!final) {
            [...host.querySelectorAll("button")].find(button => /^(start|begin)\b/i.test(button.textContent.trim()))?.click();
            await settle();
            final = host.querySelector('[data-assessment-stage="final"]');
        }
        assert(Boolean(final), "Saved combined module passes unlock actual final");
        assert(!createCourseStore(appliedCourse).load().final, "Merely viewing final never completes course");
        await answer("final", appliedCourse.final.bank, 6);
        assert(createCourseStore(appliedCourse).load().final?.correct === 24, "Actual shuffled final submission records the exact 24/30 pass boundary");
        route("applied-services-2");
        await settle();
        assert(host.textContent.includes(appliedCourse.modules.find(module => module.id === "services").lessons[1].title), "Saved passes permit targeted lesson study links");
        assert(!host.textContent.includes("certified network engineer"), "No professional certification claim");
    } finally {
        route?.pause();
        host.remove();
        if (previous === null) localStorage.removeItem(store.key);
        else localStorage.setItem(store.key, previous);
    }
    return `Applied course UI tests passed: ${passed} assertions.`;
}
