import { networkingModules, gradeModule } from "./networking-course.mjs";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

export function initializeNetworkingCourse() {
    const scores = new Map();
    const statuses = new Map();
    const map = document.getElementById("learn-module-map");
    const sidebar = document.getElementById("learn-sidebar-nav");
    const picker = document.getElementById("learn-module-select");
    const content = document.getElementById("learn-module-content");
    const views = new Map();
    const sidebarLinks = new Map();
    let activeModule = null;
    const updateProgress = () => {
        document.getElementById("learn-course-progress").value = scores.size;
        document.getElementById("learn-course-count").textContent = `${scores.size} of ${networkingModules.length}`;
        for (const [id, labels] of statuses) {
            const score = scores.get(id);
            labels.forEach(status => {
                status.textContent = score ? `Latest check: ${score.correct} / ${score.total}` : "Quiz not checked";
                status.dataset.checked = String(Boolean(score));
            });
        }
    };

    networkingModules.forEach((module, index) => {
        const number = String(index + 1).padStart(2, "0");
        const first = document.getElementById(module.chapters[0]);
        const last = document.getElementById(module.chapters.at(-1));
        const link = make("a", undefined, "learn-module-link");
        link.href = `#${first.id}`;
        link.append(make("span", `MODULE ${number} / ~${module.minutes} MIN`, "learn-module-meta"), make("strong", module.title));
        const status = make("span", "Quiz not checked", "learn-module-status");
        const sidebarLink = make("a", undefined, "learn-sidebar-link");
        sidebarLink.href = link.href;
        sidebarLink.append(make("span", number, "learn-sidebar-number"), make("strong", module.title));
        const sidebarStatus = make("span", "Quiz not checked", "learn-module-status");
        sidebarLink.append(sidebarStatus);
        sidebar.append(sidebarLink);
        sidebarLinks.set(module.id, sidebarLink);
        const option = make("option", `${number} / ${module.title}`);
        option.value = module.id;
        picker.append(option);
        statuses.set(module.id, [status, sidebarStatus]);
        link.append(status);
        map.append(link);

        const view = make("div", undefined, "learn-module-view");
        view.id = `module-${module.id}`;
        view.hidden = true;
        content.append(view);
        views.set(module.id, view);
        module.chapters.forEach((id, chapterIndex) => {
            const chapter = document.getElementById(id);
            chapter.dataset.module = module.id;
            chapter.querySelector(".learn-kicker").textContent = `MODULE ${number}${module.chapters.length > 1 ? ` / LESSON ${chapterIndex + 1} OF ${module.chapters.length}` : ""}`;
            view.append(chapter);
        });
        const goals = make("div", undefined, "learn-module-goals");
        goals.append(make("strong", "By the end, you can:"));
        const list = make("ul");
        list.append(...module.goals.map(goal => make("li", goal)));
        goals.append(list);
        first.querySelector("h3").after(goals);

        const deeper = make("div", undefined, "learn-deeper");
        for (const [heading, text] of module.lessons) {
            deeper.append(make("h4", heading), make("p", text));
        }
        const practice = make("div", undefined, "learn-practice");
        practice.append(make("h4", "Put it into practice"), make("p", module.practice[0]));
        const solution = make("details");
        solution.append(make("summary", "Reveal the reasoning"), make("p", module.practice[1]));
        practice.append(solution);
        deeper.append(practice);
        last.append(deeper);

        const quiz = make("details", undefined, "learn-quiz");
        quiz.id = `quiz-${module.id}`;
        const summary = make("summary", `Module ${number} check / ${module.questions.length} questions`);
        quiz.append(summary, make("p", "Optional: choose one answer per question, then check your understanding. Your score never locks another module."));
        const form = make("form");
        form.noValidate = true;
        const fields = module.questions.map((question, questionIndex) => {
            const prefix = `${module.id}-q${questionIndex}`;
            const field = make("fieldset", undefined, "learn-quiz-question");
            field.append(make("legend", `${questionIndex + 1}. ${question.prompt}`));
            const feedback = make("p", undefined, "learn-quiz-feedback");
            feedback.id = `${prefix}-feedback`;
            feedback.hidden = true;
            const inputs = question.options.map((option, optionIndex) => {
                const label = make("label", undefined, "learn-quiz-option");
                const input = make("input");
                input.type = "radio";
                input.name = prefix;
                input.value = String(optionIndex);
                input.required = true;
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
        const check = make("button", "Check my answers");
        check.type = "submit";
        const retry = make("button", "Start quiz again", "quiet");
        retry.type = "reset";
        controls.append(check, retry);
        const result = make("p", undefined, "learn-quiz-result");
        result.id = `quiz-${module.id}-result`;
        result.setAttribute("role", "status");
        form.setAttribute("aria-describedby", result.id);
        form.append(controls, result);
        quiz.append(form);
        last.append(quiz);

        const clearFeedback = () => {
            for (const { field, feedback, inputs } of fields) {
                field.removeAttribute("aria-invalid");
                field.removeAttribute("data-correct");
                feedback.hidden = true;
                feedback.textContent = "";
                inputs.forEach(input => input.removeAttribute("aria-invalid"));
            }
            scores.delete(module.id);
            updateProgress();
        };
        form.addEventListener("change", () => {
            clearFeedback();
            result.textContent = "Answers updated. Check them when you are ready.";
        });
        form.addEventListener("submit", event => {
            event.preventDefault();
            const answers = fields.map(({ inputs }) => {
                const selected = inputs.find(input => input.checked);
                return selected ? Number(selected.value) : null;
            });
            const grade = gradeModule(module, answers);
            clearFeedback();
            if (!grade.complete) {
                result.textContent = `Answer ${grade.missing.length} remaining ${grade.missing.length === 1 ? "question" : "questions"} before checking.`;
                for (const missing of grade.missing) {
                    fields[missing].field.setAttribute("aria-invalid", "true");
                    fields[missing].inputs.forEach(input => input.setAttribute("aria-invalid", "true"));
                }
                fields[grade.missing[0]].inputs[0].focus();
                return;
            }
            fields.forEach(({ field, feedback }, questionIndex) => {
                const correct = grade.results[questionIndex];
                const question = module.questions[questionIndex];
                field.dataset.correct = String(correct);
                feedback.textContent = `${correct ? "Correct." : "Not quite."} ${correct ? "" : `Correct answer: ${question.options[question.answer]}. `}${question.explanation}`;
                feedback.hidden = false;
            });
            scores.set(module.id, { correct: grade.correct, total: grade.total });
            result.textContent = `${grade.correct} of ${grade.total} correct. ${grade.correct === grade.total ? "All correct. You can explore any module next." : "Review the explanations above, then change an answer or start again. Every module is still open."}`;
            updateProgress();
        });
        form.addEventListener("reset", () => {
            clearFeedback();
            result.textContent = "Quiz reset. Try again whenever you like.";
            fields[0].inputs[0].focus();
        });
        const navigation = make("nav", undefined, "learn-module-footer");
        navigation.setAttribute("aria-label", `Module ${number} navigation`);
        const back = make("a", "Back to all modules", "learn-next-module");
        back.href = "#learn-module-map";
        navigation.append(back);
        if (index + 1 < networkingModules.length) {
            const next = make("a", `Next suggested module: ${networkingModules[index + 1].title}`, "learn-next-module");
            next.href = `#${networkingModules[index + 1].chapters[0]}`;
            navigation.append(next);
        }
        last.append(navigation);
    });
    document.getElementById("learn-printers").hidden = true;
    picker.addEventListener("change", () => {
        const selected = networkingModules.find(module => module.id === picker.value);
        window.location.hash = selected.chapters[0];
    });
    updateProgress();
    return requested => {
        const target = document.getElementById(requested);
        const chapter = target?.closest(".learn-chapter");
        const module = networkingModules.find(item => item.chapters.includes(chapter?.id) || `module-${item.id}` === requested)
            || (requested === "learn-printers" ? networkingModules.find(item => item.id === "printer-setup") : null);
        document.getElementById("learn-overview").hidden = Boolean(module);
        document.getElementById("learn-workspace").hidden = !module;
        for (const [id, view] of views) {
            view.hidden = id !== module?.id;
            const link = sidebarLinks.get(id);
            if (id === module?.id) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        }
        if (!module) {
            if (requested === "learn-module-map" || requested === "learn-course-title") map.scrollIntoView();
            else window.scrollTo({ top: 0 });
            if (activeModule) {
                const heading = document.getElementById("learn-course-title");
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
            activeModule = null;
            return;
        }
        const index = networkingModules.indexOf(module);
        document.getElementById("learn-module-position").textContent = `MODULE ${String(index + 1).padStart(2, "0")} OF ${networkingModules.length} / ~${module.minutes} MIN / ${module.chapters.length} ${module.chapters.length === 1 ? "LESSON" : "LESSONS"}`;
        const title = document.getElementById("learn-module-title");
        title.textContent = module.title;
        picker.value = module.id;
        const selectedLink = sidebarLinks.get(module.id);
        sidebar.scrollTop = selectedLink.offsetTop - sidebar.clientHeight / 2;
        const previous = document.getElementById("learn-module-prev");
        const next = document.getElementById("learn-module-next");
        previous.hidden = index === 0;
        next.hidden = index === networkingModules.length - 1;
        if (index > 0) {
            previous.href = `#${networkingModules[index - 1].chapters[0]}`;
            previous.textContent = `Previous: ${networkingModules[index - 1].title}`;
        }
        if (index + 1 < networkingModules.length) {
            next.href = `#${networkingModules[index + 1].chapters[0]}`;
            next.textContent = `Next: ${networkingModules[index + 1].title}`;
        }
        const resume = document.getElementById("learn-resume");
        resume.hidden = false;
        resume.href = `#${module.chapters[0]}`;
        resume.textContent = `Return to module ${index + 1}: ${module.title}`;
        const quiz = target?.closest(".learn-quiz");
        if (quiz) quiz.open = true;
        if (chapter && requested !== module.chapters[0]) {
            target.scrollIntoView();
            const focus = quiz?.querySelector("summary") || chapter.querySelector("h3");
            if (!quiz) focus.tabIndex = -1;
            focus.focus({ preventScroll: true });
        } else {
            document.getElementById("learn-module-toolbar").scrollIntoView();
            title.focus({ preventScroll: true });
        }
        activeModule = module.id;
    };
}
