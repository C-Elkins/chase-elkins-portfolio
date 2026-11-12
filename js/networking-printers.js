import { printerModules, troubleshootingCases, finalExam, FINAL_TARGET, gradeModule } from "./networking-printers.mjs?v=2026-11-14-printers";
import { initializeNetworkingCourse } from "./networking-course.js?v=2026-11-15-progress-checklist";
import { buildChapter } from "./networking-102.js?v=2026-11-14-printers";
import { assessmentGrade, openAssessment, recordOpenAttempt } from "./open-course-progress.mjs";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

// Builds a graded multiple-choice form with the same markup and styling as module quizzes.
function buildQuestionForm({ id, assessmentId, questions, submitLabel, resetLabel, onGrade, onClear = () => {}, store, adapter }) {
    const form = make("form");
    form.noValidate = true;
    const fields = questions.map((question, questionIndex) => {
        const name = `${id}-q${questionIndex}`;
        const field = make("fieldset", undefined, "learn-quiz-question");
        field.append(make("legend", `${questions.length > 1 ? `${questionIndex + 1}. ` : ""}${question.prompt}`));
        const feedback = make("p", undefined, "learn-quiz-feedback");
        feedback.id = `${name}-feedback`;
        feedback.hidden = true;
        const inputs = question.options.map((option, optionIndex) => {
            const label = make("label", undefined, "learn-quiz-option");
            const input = make("input");
            input.type = "radio";
            input.name = name;
            input.value = String(optionIndex);
            input.setAttribute("aria-describedby", feedback.id);
            label.append(input, make("span", option));
            field.append(label);
            return input;
        });
        field.append(feedback);
        form.append(field);
        return { field, feedback, inputs };
    });
    const controls = make("div", undefined, "toolbar");
    const check = make("button", submitLabel);
    check.type = "submit";
    const reset = make("button", resetLabel, "quiet");
    reset.type = "reset";
    controls.append(check, reset);
    const result = make("p", undefined, "learn-quiz-result");
    result.id = `${id}-result`;
    result.setAttribute("role", "status");
    form.setAttribute("aria-describedby", result.id);
    form.append(controls, result);

    const clear = () => {
        for (const { field, feedback, inputs } of fields) {
            field.removeAttribute("aria-invalid");
            field.removeAttribute("data-correct");
            feedback.hidden = true;
            feedback.textContent = "";
            inputs.forEach(input => input.removeAttribute("aria-invalid"));
        }
        onClear();
    };
    const answersFromForm = () => fields.map(({ inputs }) => {
        const selected = inputs.find(input => input.checked);
        return selected ? Number(selected.value) : null;
    });
    const renderFeedback = grade => {
        fields.forEach(({ field, feedback }, index) => {
            const correct = grade.results[index];
            const question = questions[index];
            field.dataset.correct = String(correct);
            feedback.textContent = `${correct ? "Correct." : "Not quite."} ${correct ? "" : `Correct answer: ${question.options[question.answer]}. `}${question.explanation}`;
            feedback.hidden = false;
        });
        const best = assessmentGrade(questions, openAssessment(store.load(), adapter, assessmentId).best);
        result.textContent = `${onGrade(grade)}${best ? ` Best result: ${best.correct}/${best.total}.` : ""}`;
    };
    const initial = openAssessment(store.load(), adapter, assessmentId);
    initial.answers.forEach((answer, index) => {
        if (answer !== null) fields[index].inputs[answer].checked = true;
    });
    if (initial.latest && JSON.stringify(initial.answers) === JSON.stringify(initial.latest)) renderFeedback(gradeModule({ questions }, initial.latest));
    else if (initial.answers.some(answer => answer !== null)) result.textContent = "Your unfinished answers were restored.";
    form.addEventListener("change", () => {
        clear();
        const progress = store.load();
        const saved = openAssessment(progress, adapter, assessmentId);
        progress.assessments[assessmentId] = { ...saved, answers: answersFromForm() };
        const savedLocally = store.save(progress);
        result.textContent = savedLocally ? "Draft saved. Earlier results are kept." : store.issue;
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        const answers = answersFromForm();
        const grade = gradeModule({ questions }, answers);
        clear();
        if (!grade.complete) {
            result.textContent = `Answer ${grade.missing.length} remaining ${grade.missing.length === 1 ? "question" : "questions"} before checking.`;
            for (const missing of grade.missing) {
                fields[missing].field.setAttribute("aria-invalid", "true");
                fields[missing].inputs.forEach(input => input.setAttribute("aria-invalid", "true"));
            }
            fields[grade.missing[0]].inputs[0].focus();
            return;
        }
        const progress = store.load();
        progress.assessments[assessmentId] = recordOpenAttempt(questions, openAssessment(progress, adapter, assessmentId), answers);
        store.save(progress);
        renderFeedback(grade);
    });
    form.addEventListener("reset", () => {
        clear();
        const progress = store.load();
        const saved = openAssessment(progress, adapter, assessmentId);
        progress.assessments[assessmentId] = { ...saved, answers: Array(questions.length).fill(null) };
        const savedLocally = store.save(progress);
        result.textContent = savedLocally ? "Cleared for a new attempt. Earlier results are kept." : store.issue;
        fields[0].inputs[0].focus();
    });
    return form;
}

function buildCases(store, adapter) {
    const list = document.getElementById("learnprint-case-list");
    troubleshootingCases.forEach((item, index) => {
        const card = make("article", undefined, "print-case");
        card.id = `learnprint-${item.id}`;
        card.append(make("p", `CASE ${String(index + 1).padStart(2, "0")}`, "learn-kicker"), make("h4", item.title), make("p", item.scenario));
        const evidence = make("ul", undefined, "print-case-evidence");
        evidence.setAttribute("aria-label", `Evidence for ${item.title}`);
        item.evidence.forEach(line => evidence.append(make("li", line)));
        card.append(make("p", "EVIDENCE", "print-case-label"), evidence);
        card.append(buildQuestionForm({
            id: `learnprint-${item.id}`, assessmentId: item.id, questions: [item.question], submitLabel: "Check my diagnosis", resetLabel: "Clear", store, adapter,
            onGrade: grade => grade.correct ? "Good diagnosis." : "Review the evidence and try another answer."
        }));
        list.append(card);
    });
}

function buildFinal(store, adapter) {
    const host = document.getElementById("learnprint-final-form");
    const summary = document.getElementById("learnprint-final-review");
    host.append(buildQuestionForm({
        id: "learnprint-final", assessmentId: "final", questions: finalExam, submitLabel: "Grade my final test", resetLabel: "Retake the test", store, adapter,
        onClear: () => { summary.hidden = true; summary.replaceChildren(); },
        onGrade: grade => {
            summary.replaceChildren();
            const missed = new Map();
            grade.results.forEach((correct, index) => {
                if (!correct) missed.set(finalExam[index].module, (missed.get(finalExam[index].module) || 0) + 1);
            });
            if (missed.size) {
                summary.append(make("p", "Review these modules:"));
                const links = make("ul");
                for (const [moduleId, count] of missed) {
                    const module = printerModules.find(item => item.id === moduleId);
                    const link = make("a", `${module.title} (${count} missed)`);
                    link.href = `#${module.chapters[0]}`;
                    const item = make("li");
                    item.append(link);
                    links.append(item);
                }
                summary.append(links);
            }
            summary.hidden = !missed.size;
            const passed = grade.correct >= FINAL_TARGET;
            return `${grade.correct} of ${grade.total} correct. ${passed ? `You reached the ${FINAL_TARGET}-answer final target.` : `The target is ${FINAL_TARGET}. Review the explanations, then retake the test whenever you like.`}`;
        }
    }));
}

export function initializePrinterNetworking({ store, adapter }) {
    const staging = document.getElementById("learnprint-chapters");
    staging.append(...printerModules.map(module => {
        const chapter = buildChapter(module);
        chapter.classList.add("course-print-chapter");
        return chapter;
    }));
    const route = initializeNetworkingCourse({ prefix: "learnprint", modules: printerModules, legacy: false, store, adapter });
    staging.remove();
    buildCases(store, adapter);
    buildFinal(store, adapter);
    return requested => {
        route(requested);
        const target = document.getElementById(requested);
        if (target?.closest("#learnprint-practice")) {
            const progress = store.load();
            progress.resume = target.closest(".print-case")?.id || target.closest("#learnprint-final, #learnprint-cases")?.id || "learnprint-cases";
            store.save(progress);
            const resume = document.getElementById("learnprint-resume");
            resume.hidden = false;
            resume.href = `#${progress.resume}`;
            resume.textContent = "Return to your last activity";
            target.scrollIntoView();
        }
    };
}
