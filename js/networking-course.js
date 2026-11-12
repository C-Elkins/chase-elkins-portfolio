import { networkingModules as defaultModules, gradeModule } from "./networking-course.mjs";
import { assessmentGrade, openAssessment, openModulePassed, recordOpenAttempt } from "./open-course-progress.mjs";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

export function initializeNetworkingCourse({ prefix = "learn", modules = defaultModules, legacy = true, store, adapter } = {}) {
    if (!store || !adapter) throw new TypeError("Course progress storage is required.");
    const networkingModules = modules;
    const part = suffix => document.getElementById(`${prefix}-${suffix}`);
    const statuses = new Map();
    const studiedControls = new Map();
    const requiredForApplied = prefix === "learn" || prefix === "learn102";
    const map = part("module-map");
    const sidebar = part("sidebar-nav");
    const picker = part("module-select");
    const content = part("module-content");
    const views = new Map();
    const sidebarLinks = new Map();
    let activeModule = null;
    const progressSummary = make("section", undefined, "learn-progress-summary");
    progressSummary.setAttribute("aria-label", `${prefix === "learn" ? "Networking 101" : prefix === "learn102" ? "Networking 102" : "Printer Networking"} completion summary`);
    map.before(progressSummary);
    const caseDefinitions = prefix === "learnprint"
        ? [...adapter.assessments.keys()]
            .filter(id => id !== "final" && !networkingModules.some(module => module.id === id))
            .map(id => ({ id, title: id.replaceAll("-", " "), href: `#learnprint-${id}`, questions: adapter.assessments.get(id) }))
        : [];
    const finalQuestions = prefix === "learnprint" ? adapter.assessments.get("final") : null;
    const renderProgressSummary = progress => {
        const completed = [];
        const remaining = [];
        const addActivity = (label, done, href) => (done ? completed : remaining).push({ label, href });
        const totalLessons = networkingModules.reduce((count, module) => count + module.chapters.length, 0);
        const studiedLessons = networkingModules.flatMap(module => module.chapters)
            .filter(chapter => progress.studied.includes(chapter));
        networkingModules.forEach(module => {
            const result = progress.assessments[module.id];
            const grade = result && assessmentGrade(module.questions, result.best);
            const passed = openModulePassed(progress, module);
            const checked = Boolean(result?.latest);
            const requiredLabel = requiredForApplied ? "quiz passed (4/5)" : "module check completed";
            addActivity(`${requiredLabel} · ${module.title}${grade ? ` · best ${grade.correct}/${grade.total}` : ""}`, requiredForApplied ? passed : checked, `#quiz-${module.id}`);
        });
        studiedLessons.forEach(chapter => {
            const title = document.getElementById(chapter)?.querySelector("h3")?.textContent || chapter;
            addActivity(`Lesson studied · ${title}`, true, `#${chapter}`);
        });
        const unstudied = networkingModules.flatMap(module => module.chapters).filter(chapter => !progress.studied.includes(chapter));
        unstudied.forEach(chapter => {
            const title = document.getElementById(chapter)?.querySelector("h3")?.textContent || chapter;
            addActivity(`Lesson not yet marked studied · ${title}`, false, `#${chapter}`);
        });
        caseDefinitions.forEach(item => {
            const result = progress.assessments[item.id];
            const grade = result && assessmentGrade(item.questions, result.latest);
            addActivity(`Troubleshooting case · ${item.title}${grade ? ` · ${grade.correct}/${grade.total}` : ""}`, Boolean(grade), item.href);
        });
        if (finalQuestions) {
            const result = progress.assessments.final;
            const best = result && assessmentGrade(finalQuestions, result.best);
            const reached = Boolean(best && best.correct >= 16);
            addActivity(`Final test · ${best ? `${best.correct}/${best.total}` : "not submitted"} · 16/20 target`, reached, "#learnprint-final");
        }
        const completionCount = completed.length;
        const list = (items, emptyText) => {
            const ul = make("ul");
            if (!items.length) ul.append(make("li", emptyText));
            items.forEach(item => {
                const li = make("li");
                const action = make("a", item.label);
                action.href = item.href;
                li.append(action);
                ul.append(li);
            });
            return ul;
        };
        const completedDetails = make("details");
        completedDetails.append(make("summary", `Completed · ${completionCount} course activities`), list(completed, "No course activities completed yet."));
        const remainingDetails = make("details");
        remainingDetails.append(make("summary", `Not completed · ${remaining.length} activities${requiredForApplied ? " · all 14 quiz passes required for Applied" : ""}`), list(remaining, "No outstanding course activities."));
        const summary = make("div", undefined, "learn-progress-summary-body");
        summary.append(
            make("h3", "Progress checklist"),
            make("p", `${studiedLessons.length}/${totalLessons} lessons marked studied · self-reported, separate from quiz results. ${requiredForApplied ? `${networkingModules.filter(module => openModulePassed(progress, module)).length}/${networkingModules.length} quizzes passed; 4/5 is required for Applied readiness.` : `${networkingModules.filter(module => progress.assessments[module.id]?.latest).length}/${networkingModules.length} module checks completed.`}`),
            completedDetails,
            remainingDetails
        );
        progressSummary.replaceChildren(summary);
    };
    const updateProgress = () => {
        const progress = store.load();
        const completed = networkingModules.filter(module => requiredForApplied ? openModulePassed(progress, module) : Boolean(progress.assessments[module.id]?.latest)).length;
        part("course-progress").value = completed;
        part("course-count").textContent = `${completed} of ${networkingModules.length}`;
        for (const [id, labels] of statuses) {
            const module = networkingModules.find(item => item.id === id);
            const saved = progress.assessments[id];
            const latest = saved && assessmentGrade(module.questions, saved.latest);
            const best = saved && assessmentGrade(module.questions, saved.best);
            const studied = module.chapters.filter(chapter => progress.studied.includes(chapter)).length;
            const quizStatus = best
                ? `${requiredForApplied && openModulePassed(progress, module) ? "Quiz passed" : "Check completed"} · best ${best.correct}/${best.total}${latest ? ` · latest ${latest.correct}/${latest.total}` : ""}`
                : saved?.answers.some(answer => answer !== null) ? "Quiz in progress" : "Quiz not started";
            labels.forEach(status => {
                status.textContent = `${quizStatus} · ${studied}/${module.chapters.length} studied`;
                status.dataset.checked = String(Boolean(best));
            });
        }
        studiedControls.forEach((control, id) => {
            const studied = progress.studied.includes(id);
            control.textContent = studied ? "Studied ✓ · mark unread" : "Mark lesson as studied";
            control.setAttribute("aria-pressed", String(studied));
        });
        const resume = part("resume");
        if (progress.resume) {
            const module = networkingModules.find(item => item.chapters.includes(progress.resume) || [`module-${item.id}`, `quiz-${item.id}`].includes(progress.resume));
            resume.hidden = false;
            resume.href = `#${progress.resume}`;
            resume.textContent = module ? `Return to module ${networkingModules.indexOf(module) + 1}: ${module.title}` : "Return to your last activity";
        } else resume.hidden = true;
        renderProgressSummary(progress);
    };
    const resetStatus = make("p", "", "learn-reset-status");
    resetStatus.setAttribute("role", "status");
    const resetCourse = make("button", "Reset this course's progress", "quiet");
    resetCourse.type = "button";
    resetCourse.addEventListener("click", () => {
        const downstream = requiredForApplied ? " Applied and Advanced will lock again until these quizzes are passed; their saved work will be kept." : "";
        if (!window.confirm(`Reset this course's saved lessons, answers, and scores? Other courses and your theme are not erased.${downstream}`)) return;
        if (!store.reset()) { resetStatus.textContent = store.issue; return; }
        window.location.reload();
    });
    part("course-progress").closest(".learn-course-progress").after(resetCourse, resetStatus);

    networkingModules.forEach((module, index) => {
        const number = String(index + 1).padStart(2, "0");
        const first = document.getElementById(module.chapters[0]);
        const last = document.getElementById(module.chapters.at(-1));
        const link = make("a", undefined, "learn-module-link");
        link.href = `#${first.id}`;
        link.append(make("span", `MODULE ${number} / ~${module.minutes} MIN`, "learn-module-meta"), make("strong", module.title));
        const status = make("span", "Quiz not started", "learn-module-status");
        const sidebarLink = make("a", undefined, "learn-sidebar-link");
        sidebarLink.href = link.href;
        sidebarLink.append(make("span", number, "learn-sidebar-number"), make("strong", module.title));
        const sidebarStatus = make("span", "Quiz not started", "learn-module-status");
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
            const studied = make("button", "Mark lesson as studied", "quiet learn-studied");
            studied.type = "button";
            studied.title = "Self-reported reading progress; this does not pass a quiz.";
            studied.addEventListener("click", () => {
                const progress = store.load();
                progress.studied = progress.studied.includes(id) ? progress.studied.filter(item => item !== id) : [...progress.studied, id];
                store.save(progress);
                updateProgress();
            });
            studiedControls.set(id, studied);
            chapter.querySelector("h3").after(studied);
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
        quiz.append(summary, make("p", requiredForApplied
            ? "All modules remain open. A score of 4/5 is required for the Applied Networking prerequisite; studied marks do not replace a quiz pass."
            : "Optional: choose one answer per question, then check your understanding. Module checks do not lock another lesson."));
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
        };
        const answersFromForm = () => fields.map(({ inputs }) => {
            const selected = inputs.find(input => input.checked);
            return selected ? Number(selected.value) : null;
        });
        const renderFeedback = grade => {
            fields.forEach(({ field, feedback }, questionIndex) => {
                const correct = grade.results[questionIndex];
                const question = module.questions[questionIndex];
                field.dataset.correct = String(correct);
                feedback.textContent = `${correct ? "Correct." : "Not quite."} ${correct ? "" : `Correct answer: ${question.options[question.answer]}. `}${question.explanation}`;
                feedback.hidden = false;
            });
            const passed = grade.correct / grade.total >= .8;
            result.textContent = `${grade.correct} of ${grade.total} correct. ${requiredForApplied ? passed ? "Quiz passed. The best pass is kept after retries." : "4/5 is required for the Applied prerequisite. Review the explanations and retry." : "Review the explanations; this optional check does not lock the course."}`;
        };
        const initial = openAssessment(store.load(), adapter, module.id);
        initial.answers.forEach((answer, index) => {
            if (answer !== null) fields[index].inputs[answer].checked = true;
        });
        if (initial.latest && JSON.stringify(initial.answers) === JSON.stringify(initial.latest)) renderFeedback(gradeModule(module, initial.latest));
        else if (initial.answers.some(answer => answer !== null)) result.textContent = "Your unfinished answers were restored. Check them when you are ready.";
        form.addEventListener("change", () => {
            clearFeedback();
            const progress = store.load();
            const saved = openAssessment(progress, adapter, module.id);
            progress.assessments[module.id] = { ...saved, answers: answersFromForm() };
            const savedLocally = store.save(progress);
            updateProgress();
            result.textContent = savedLocally ? "Draft saved. Your latest completed result and best score remain available in the module status." : store.issue;
        });
        form.addEventListener("submit", event => {
            event.preventDefault();
            const answers = answersFromForm();
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
            const progress = store.load();
            progress.assessments[module.id] = recordOpenAttempt(module.questions, openAssessment(progress, adapter, module.id), answers);
            store.save(progress);
            renderFeedback(grade);
            updateProgress();
        });
        form.addEventListener("reset", () => {
            clearFeedback();
            const progress = store.load();
            const saved = openAssessment(progress, adapter, module.id);
            progress.assessments[module.id] = { ...saved, answers: Array(module.questions.length).fill(null) };
            store.save(progress);
            updateProgress();
            result.textContent = "Quiz reset for a new attempt. Earlier results and earned passes are kept.";
            fields[0].inputs[0].focus();
        });
        const navigation = make("nav", undefined, "learn-module-footer");
        navigation.setAttribute("aria-label", `Module ${number} navigation`);
        const back = make("a", "Back to all modules", "learn-next-module");
        back.href = `#${prefix}-module-map`;
        navigation.append(back);
        if (index + 1 < networkingModules.length) {
            const next = make("a", `Next suggested module: ${networkingModules[index + 1].title}`, "learn-next-module");
            next.href = `#${networkingModules[index + 1].chapters[0]}`;
            navigation.append(next);
        }
        last.append(navigation);
    });
    if (legacy) document.getElementById("learn-printers").hidden = true;
    picker.addEventListener("change", () => {
        const selected = networkingModules.find(module => module.id === picker.value);
        window.location.hash = selected.chapters[0];
    });
    store.subscribe(updateProgress);
    updateProgress();
    return requested => {
        const target = document.getElementById(requested);
        const chapter = target?.closest(".learn-chapter");
        const module = networkingModules.find(item => item.chapters.includes(chapter?.id) || `module-${item.id}` === requested)
            || (legacy && requested === "learn-printers" ? networkingModules.find(item => item.id === "printer-setup") : null);
        part("overview").hidden = Boolean(module);
        part("workspace").hidden = !module;
        for (const [id, view] of views) {
            view.hidden = id !== module?.id;
            const link = sidebarLinks.get(id);
            if (id === module?.id) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        }
        if (!module) {
            if (requested === `${prefix}-module-map` || requested === `${prefix}-course-title`) map.scrollIntoView();
            else window.scrollTo({ top: 0 });
            if (activeModule) {
                const heading = part("course-title");
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
            activeModule = null;
            return;
        }
        const index = networkingModules.indexOf(module);
        part("module-position").textContent = `MODULE ${String(index + 1).padStart(2, "0")} OF ${networkingModules.length} / ~${module.minutes} MIN / ${module.chapters.length} ${module.chapters.length === 1 ? "LESSON" : "LESSONS"}`;
        const title = part("module-title");
        title.textContent = module.title;
        picker.value = module.id;
        const selectedLink = sidebarLinks.get(module.id);
        sidebar.scrollTop = selectedLink.offsetTop - sidebar.clientHeight / 2;
        const previous = part("module-prev");
        const next = part("module-next");
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
        const quiz = target?.closest(".learn-quiz");
        const progress = store.load();
        progress.resume = quiz?.id || chapter?.id || `module-${module.id}`;
        store.save(progress);
        updateProgress();
        if (quiz) quiz.open = true;
        if (chapter && requested !== module.chapters[0]) {
            target.scrollIntoView();
            const focus = quiz?.querySelector("summary") || chapter.querySelector("h3");
            if (!quiz) focus.tabIndex = -1;
            focus.focus({ preventScroll: true });
        } else {
            part("module-toolbar").scrollIntoView();
            title.focus({ preventScroll: true });
        }
        activeModule = module.id;
    };
}
