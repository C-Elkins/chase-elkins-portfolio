import {
    newCourseProgress, eligibility, moduleComplete, makeAttempt, gradeAttempt,
    saveAssessmentDraft, restoreAssessmentDraft, recordAssessment, recordPractical, recordCapstone, courseComplete
} from "./course-progression.mjs";
import { foundationRequirements, appliedRequirements, guidedEntryRequirement } from "./learning-courses.mjs";
import { mountNetworkWorkbench } from "./network-workbench.js";
import { buildFigure, buildTable } from "./course-charts.js";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};
const link = (href, label, className) => {
    const node = make("a", label, className);
    node.href = href.startsWith("#") || !href.startsWith("applied-") ? href : `#${href}`;
    return node;
};
const button = (label, action, className) => {
    const node = make("button", label, className);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
};
const hash = value => value.startsWith("#") ? value : `#${value}`;
const passed = score => Boolean(score && score.correct / score.total >= .8);
const scoreLabel = score => score ? `${score.correct}/${score.total}${passed(score) ? " · passed" : " · not yet passed"}` : "Not yet submitted";
export function initializeGuidedCourse({ course, root, store, learningStore, mountWorkbench = mountNetworkWorkbench }) {
    if (!store || !learningStore) throw new TypeError("Guided course progress storage is required.");
    const prefix = course.routePrefix || "applied";
    const overviewHash = `#${course.id}`;
    const stageHash = stage => `#${prefix}-${stage}`;
    let progress = store.load();
    let currentHash = overviewHash;
    let activeWorkbench = null;
    const drafts = new Map();
    const workbenches = new Map();
    const moduleViews = new Map();
    root.classList.add("guided-course");
    root.setAttribute("aria-label", course.title);
    root.replaceChildren();

    const chrome = make("header", undefined, "gc-chrome");
    const brand = link(overviewHash, (course.shortTitle || course.title).toUpperCase(), "gc-course-brand");
    const pickerLabel = make("label", undefined, "gc-picker");
    const picker = make("select");
    picker.setAttribute("aria-label", "Course destination");
    picker.addEventListener("change", () => { window.location.hash = picker.value; });
    pickerLabel.append(make("span", "Course navigator"), picker);
    const saveStatus = make("p", "", "gc-save-status");
    saveStatus.setAttribute("role", "status");
    saveStatus.setAttribute("aria-live", "polite");
    const reset = button("Reset course progress", () => {
        const downstream = course.id === "applied-networking" ? " Advanced Networking will lock again, but its saved work will be kept." : "";
        if (!window.confirm(`Delete only this course's saved progress, assessment drafts and workbenches? Other courses and your theme are not erased.${downstream}`)) return;
        if (!store.reset()) { updateSaveStatus(false); return; }
        workbenches.forEach(item => item.controller.destroy());
        workbenches.clear();
        drafts.clear();
        moduleViews.clear();
        activeWorkbench = null;
        progress = newCourseProgress(course);
        persist();
        window.location.hash = overviewHash;
        route(overviewHash);
        saveStatus.textContent = store.blocked ? store.issue : "Course reset. Only this course's browser record was cleared.";
    }, "quiet");
    const saveRow = make("div", undefined, "gc-save-row");
    saveRow.append(saveStatus, reset);
    chrome.append(brand, pickerLabel, saveRow);
    const content = make("div", undefined, "gc-content");
    root.append(chrome, content);
    updateSaveStatus();
    updatePicker();
    const unsubscribe = learningStore.subscribe(() => updateSaveStatus());

    function entryAccess() {
        return guidedEntryRequirement(course.id, learningStore.snapshot());
    }

    function accessFor(stage) {
        const entry = entryAccess();
        return entry.allowed ? eligibility(course, progress, stage) : entry;
    }

    function completed() {
        return entryAccess().allowed && courseComplete(course, progress);
    }

    function updateSaveStatus(saved) {
        saveStatus.classList.toggle("gc-save-failed", store.blocked);
        saveStatus.textContent = store.blocked ? store.issue : saved ? "Progress and unfinished work saved in this browser." : "Local browser progress · no account or server record. Export a backup to keep a portable copy.";
    }

    function persist() {
        const saved = store.save(progress);
        updateSaveStatus(saved);
        updatePicker();
        return saved;
    }

    function updatePicker() {
        const entries = [[overviewHash, "Overview & syllabus"]];
        if (course.readiness) entries.push([stageHash("readiness"), `Readiness · ${scoreLabel(progress.readiness)}`]);
        course.modules.forEach((module, index) => {
            const access = accessFor(module.id);
            entries.push([stageHash(module.id), `${index + 1}. ${module.title}${!access.allowed ? " · locked" : moduleComplete(progress, module.id) ? " · complete" : ""}`]);
        });
        if (course.capstone) entries.push([stageHash("capstone"), `Capstone · ${progress.capstone ? "passed" : accessFor("capstone").allowed ? "available" : "locked"}`]);
        const finalAllowed = accessFor("final").allowed;
        entries.push([stageHash("review"), `Cumulative review${finalAllowed ? "" : " · locked"}`], [stageHash("final"), `Final exam${finalAllowed ? "" : " · locked"}`]);
        picker.replaceChildren(...entries.map(([value, title]) => {
            const option = make("option", title); option.value = value; return option;
        }));
        const module = moduleForHash(currentHash);
        picker.value = module ? stageHash(module.id) : currentHash;
    }

    function moduleForHash(value) {
        return course.modules.find(module => [stageHash(module.id), stageHash(`${module.id}-practical`), stageHash(`${module.id}-check`)].includes(value) || module.lessons.some(lesson => value === `#${lesson.id}`));
    }

    function heading(title, kicker, description) {
        const header = make("header", undefined, "gc-heading");
        const titleNode = make("h2", title);
        titleNode.tabIndex = -1;
        header.append(make("p", kicker, "gc-eyebrow"), titleNode);
        if (description) header.append(make("p", description, "gc-intro"));
        content.append(header);
        return header;
    }

    function ruleNotice() {
        const notice = make("details", undefined, "gc-privacy");
        notice.append(make("summary", "Local progress, learning locks & assessment rules"), make("p", `${course.readiness ? "Pass readiness with 16/20, " : ""}pass each module check with 4/5${course.capstone ? ", pass the separate capstone" : ""}, and pass the final with 24/30. Every module also needs its practical pass. Attempts are untimed with unlimited retries and hints. An earned pass survives a failed retry. A balanced retry may repeat some questions.`));
        notice.append(make("p", "Progress, assessment drafts, and supported workbench settings are stored only in this browser. Unpinned console history is not saved. Private browsing, clearing site data, or switching devices can remove local work; export a fresh backup after changes. Storage errors are shown above."));
        notice.append(make("p", "These client-side learning locks are not secure access control: source, answers and browser storage are inspectable. Passing means completing this portfolio's simplified learning model, not an independently verified qualification or professional certification. No account, identity collection or network probes are involved."));
        return notice;
    }

    function buildCompletion() {
        const complete = make("section", undefined, "gc-completion");
        complete.setAttribute("aria-label", "Course completion");
        complete.append(make("p", "COURSE PASSED / LOCAL RECORD", "gc-eyebrow"), make("h3", `${course.title} completed`), make("p", `${course.readiness ? "Readiness, " : ""}all ${course.modules.length} practical challenges and knowledge checks${course.capstone ? ", the separate capstone" : ""}, and the final are passed. Best final result: ${scoreLabel(progress.final)}.`), make("p", "This browser-local record is not independently verified and is not a professional certificate.", "gc-muted"));
        const goals = make("ul");
        course.modules.forEach(module => goals.append(make("li", module.title)));
        complete.append(goals, link(stageHash("review"), "Revisit the cumulative study guide", "gc-action"));
        return complete;
    }

    function overview() {
        progress = store.load();
        heading(course.title, `GUIDED COURSE / ${course.modules.length} MODULES / ${course.modules.reduce((count, module) => count + module.lessons.length, 0)} LESSONS`, course.description);
        if (entryAccess().allowed && courseComplete(course, progress)) content.append(buildCompletion());
        const introduction = make("div", undefined, "gc-overview-intro");
        const pathway = make("section", undefined, "gc-card gc-pathway");
        pathway.append(make("h3", course.pathwayTitle || "A repair is more than a green ping."), make("p", course.pathwayDescription || "Work a branch-office incident from baseline evidence to safe configuration change and verified handoff. Study each module's three lessons, investigate its live workbench, then pass the knowledge check."));
        const completedCount = course.modules.filter(module => moduleComplete(progress, module.id)).length;
        const meter = make("progress");
        meter.max = course.modules.length;
        meter.value = completedCount;
        meter.setAttribute("aria-label", "Modules with practical and knowledge passes");
        pathway.append(meter, make("p", `${completedCount} of ${course.modules.length} modules complete · both practical + knowledge required`, "gc-muted"));
        const actions = make("div", undefined, "gc-actions");
        const entry = entryAccess();
        actions.append(link(!entry.allowed ? entry.target : course.readiness ? stageHash("readiness") : stageHash(course.modules[0].id),
            !entry.allowed ? "Go to next missing prerequisite" : course.readiness ? passed(progress.readiness) ? "Review readiness result / retake" : "Start readiness · 20 questions" : "Start module 1",
            "gc-action gc-primary"));
        if (progress.resume !== overviewHash) actions.append(link(progress.resume, "Resume your last course page", "gc-action"));
        introduction.append(pathway);
        const requirements = make("aside", undefined, "gc-card");
        requirements.append(make("p", "THE LEARNING PATH", "gc-eyebrow"), make("ol"));
        const steps = course.readiness
            ? ["Pass all Networking 101 and 102 module quizzes (4/5 each).", "Pass readiness (16/20) to enter module 1."]
            : ["Complete Applied Networking, including the current 101 and 102 prerequisites."];
        steps.push("Pass each practical AND knowledge check (4/5) to unlock the next module.",
            course.capstone ? "Pass the separate capstone after all modules, then pass the final (24/30)." : `Complete all ${course.modules.length} modules, then pass the final (24/30).`);
        requirements.lastElementChild.append(...steps.map(text => make("li", text)));
        introduction.append(requirements);
        content.append(actions, introduction, prerequisiteChecklist());
        content.append(make("h3", "Course syllabus", "gc-section-title"));
        const grid = make("div", undefined, "gc-module-grid");
        course.modules.forEach((module, index) => {
            const access = accessFor(module.id);
            const card = make("article", undefined, `gc-module-card${access.allowed ? "" : " gc-locked-card"}`);
            card.append(make("p", `MODULE ${String(index + 1).padStart(2, "0")} / ${!access.allowed ? "LOCKED" : moduleComplete(progress, module.id) ? "COMPLETE" : "AVAILABLE"}`, "gc-eyebrow"), make("h4", module.title), make("p", module.summary));
            const lessons = make("ol", undefined, "gc-syllabus-lessons");
            module.lessons.forEach(lesson => lessons.append(make("li", lesson.title)));
            card.append(lessons, moduleStatus(module), make("p", access.allowed ? "Three lessons, one practical incident, one five-question check." : access.reason, "gc-muted"), link(stageHash(module.id), access.allowed ? "Open module →" : "View prerequisite →", "gc-action"));
            grid.append(card);
        });
        content.append(grid, progressChecklist());
        if (course.readiness) content.append(publicStudyGuide());
        content.append(ruleNotice());
    }

    function prerequisiteChecklist() {
        const snapshot = learningStore.snapshot();
        const section = make("section", undefined, "gc-prerequisite-checklist");
        const entry = guidedEntryRequirement(course.id, snapshot);
        section.append(make("h3", "Prerequisite checklist"), make("p", entry.allowed ? "All entry prerequisites are met. Studied marks are self-reported and do not replace quiz passes." : `${entry.reason} Existing later-course work is preserved while access is locked.`));
        if (!entry.allowed) section.append(link(entry.target, "Go to the next missing activity →", "gc-action gc-primary"));
        foundationRequirements(snapshot).forEach(group => {
            const details = make("details");
            details.append(make("summary", `${group.title} · ${group.passed}/${group.total} quizzes passed · 4/5 each`));
            const list = make("ul");
            group.modules.forEach(item => {
                const row = make("li");
                row.append(make("span", item.passed ? "Passed · " : "Remaining · "), link(item.href, item.title));
                list.append(row);
            });
            details.append(list);
            section.append(details);
        });
        if (course.id === "advanced-networking") {
            const applied = appliedRequirements(snapshot);
            const details = make("details");
            details.append(make("summary", `Applied Networking · ${applied.modules.filter(item => item.complete).length}/${applied.modules.length} modules complete${applied.complete ? " · passed" : " · remaining requirements"}`));
            const list = make("ul");
            const item = (label, ok, href) => {
                const row = make("li");
                row.append(make("span", ok ? "Passed · " : "Remaining · "), link(href, label));
                list.append(row);
            };
            item(applied.readiness.label, applied.readiness.passed, applied.readiness.href);
            applied.modules.forEach(module => {
                item(`${module.title} · practical`, module.practical, module.practicalHref);
                item(`${module.title} · knowledge check (4/5)`, module.quiz, module.quizHref);
            });
            item(applied.final.label, applied.final.passed, applied.final.href);
            details.append(list);
            section.append(details);
        }
        return section;
    }

    function progressChecklist() {
        const section = make("section", undefined, "gc-progress-checklist");
        const completedItems = [];
        const remainingItems = [];
        const add = (label, done, href) => (done ? completedItems : remainingItems).push({ label, href });
        const finalScore = scoreLabel(progress.final);
        const latestFinalScore = scoreLabel(progress.latest.final);
        const studiedCount = progress.studied.length;
        const lessonCount = course.modules.reduce((count, module) => count + module.lessons.length, 0);

        if (course.readiness) {
            const score = progress.readiness;
            const latest = progress.latest.readiness;
            add(`Readiness assessment · best ${scoreLabel(score)} · latest ${scoreLabel(latest)} · 16/20 required`,
                passed(score) && score.correct >= 16, stageHash("readiness"));
        }
        course.modules.forEach(module => {
            const saved = progress.modules[module.id];
            const score = saved?.score;
            const latest = progress.latest[module.id];
            const index = course.modules.indexOf(module) + 1;
            add(`Module ${index} practical · ${saved?.practical ? "passed" : "not yet passed"} · ${module.title}`,
                Boolean(saved?.practical), stageHash(`${module.id}-practical`));
            add(`Module ${index} knowledge check · best ${scoreLabel(score)} · latest ${scoreLabel(latest)} · 4/5 required`,
                passed(score), stageHash(`${module.id}-check`));
        });
        if (course.capstone) {
            add(`Separate capstone practical · ${progress.capstone ? "passed" : "not yet passed"}`,
                progress.capstone, stageHash("capstone"));
        }
        add(`Final exam · best ${finalScore} · latest ${latestFinalScore} · 24/30 required`,
            passed(progress.final) && progress.final.correct >= 24, stageHash("final"));

        const activityList = (items, emptyText) => {
            const list = make("ul");
            if (!items.length) list.append(make("li", emptyText));
            items.forEach(item => {
                const row = make("li");
                const destination = link(item.href, item.label);
                row.append(destination);
                list.append(row);
            });
            return list;
        };
        const completed = make("details");
        completed.append(make("summary", `Completed · ${completedItems.length} required activities`),
            activityList(completedItems, "No required activities completed yet."));
        const remaining = make("details");
        remaining.append(make("summary", `Not completed · ${remainingItems.length} required activities`),
            activityList(remainingItems, "All required course activities are complete."));
        const total = completedItems.length + remainingItems.length;
        section.append(
            make("p", "COURSE PROGRESS", "gc-eyebrow"),
            make("h3", "Completed and remaining"),
            make("p", `${completedItems.length}/${total} required activities complete · ${studiedCount}/${lessonCount} lessons marked studied. Studied marks are self-reported and do not replace a quiz, practical, or final pass.`, "gc-muted"),
            completed,
            remaining
        );
        return section;
    }

    function publicStudyGuide() {
        const section = make("section", undefined, "gc-study-guide");
        section.id = "applied-readiness-study";
        section.append(make("p", "OPEN PREPARATION / NO ENROLLMENT NEEDED", "gc-eyebrow"), make("h3", "Readiness study guide"), make("p", "Networking 101 and 102 remain open references. Prepare to interpret addresses, forwarding, service dependencies, transport evidence, wireless constraints and safe troubleshooting. Use the linked lessons and worked examples before attempting the readiness check."));
        const refs = [
            ["#learn-what", "101 · Networks, packet paths & measurements"],
            ["#learn-hardware", "101 · Devices and forwarding"],
            ["#learn-addresses", "101 · IPv4 addresses and subnets"],
            ["#learn-join", "101 · Joining a network"],
            ["#learn-ports", "101 · Ports and services"],
            ["#learn-fix", "101 · A structured troubleshooting method"]
        ];
        const bankRefs = new Map();
        course.readiness.bank.forEach(question => {
            if (question.study && !question.study.replace(/^#/, "").startsWith("applied-")) {
                const key = hash(question.study);
                if (!bankRefs.has(key)) bankRefs.set(key, question.objective || question.topic);
            }
        });
        const list = make("ul", undefined, "gc-study-links");
        const combined = new Map(refs);
        bankRefs.forEach((label, href) => { if (!combined.has(href)) combined.set(href, `Study · ${label}`); });
        combined.forEach((label, href) => { const item = make("li"); item.append(link(href, label)); list.append(item); });
        const objectives = make("ul", undefined, "gc-objective-topics");
        course.readiness.blueprint.forEach(item => objectives.append(make("li", `${item.topic.replace(/[-_]/g, " ")} · ${item.count} questions per attempt`)));
        section.append(list, make("h4", "What each attempt covers"), objectives);
        const studio = make("p", "Use Network Studio to observe protocol behavior after reading the references.", "gc-muted");
        const studioLink = link("#network", "Observe the DNS exchange");
        studioLink.dataset.studioLesson = "dns";
        studio.append(" ", studioLink);
        section.append(studio);
        return section;
    }

    function moduleStatus(module) {
        const saved = progress.modules[module.id];
        const status = make("div", undefined, "gc-module-status");
        const studied = module.lessons.filter(lesson => progress.studied.includes(lesson.id)).length;
        status.append(make("span", `Lessons studied: ${studied}/${module.lessons.length} · self-reported`),
            make("span", `Practical challenge: ${saved?.practical ? "passed" : "not yet passed"}`, saved?.practical ? "gc-passed" : ""),
            make("span", `Knowledge check best: ${scoreLabel(saved?.score)}${progress.latest[module.id] ? ` · latest ${scoreLabel(progress.latest[module.id])}` : ""}`, passed(saved?.score) ? "gc-passed" : ""));
        return status;
    }

    function locked(access) {
        heading("This stage is not unlocked yet", "PREREQUISITE REQUIRED");
        const box = make("section", undefined, "gc-lock-notice");
        box.append(make("h3", "Complete the required step first"), make("p", access.reason));
        const missing = progress.modules[access.prerequisite];
        const target = access.target || (access.prerequisite === "readiness" || access.prerequisite === "capstone"
            ? stageHash(access.prerequisite)
            : stageHash(`${access.prerequisite}-${missing?.practical ? "check" : "practical"}`));
        box.append(link(target, "Go to the missing prerequisite", "gc-action gc-primary"), link(overviewHash, "View the full syllabus", "gc-action"));
        box.append(prerequisiteChecklist());
        if (access.prerequisite === "readiness" && course.readiness) box.append(publicStudyGuide());
        content.append(box);
    }

    function getWorkbench(id, challenge, isCapstone = false) {
        let item = workbenches.get(id);
        if (!item) {
            const node = make("div");
            const controller = mountWorkbench({
                root: node, id, challenge, saved: progress.workbenches[id], savedDraft: progress.workbenchDrafts[id],
                onSave(saved, draft) {
                    progress.workbenches[id] = saved;
                    if (draft) progress.workbenchDrafts[id] = draft;
                    persist();
                },
                onDraftSave(draft) {
                    progress.workbenchDrafts[id] = draft;
                    persist();
                },
                onPass(verification) {
                    if (!accessFor(id).allowed) {
                        saveStatus.textContent = "The prerequisites changed. Return to the course overview before recording this practical.";
                        return;
                    }
                    progress = isCapstone ? recordCapstone(course, progress, verification) : recordPractical(course, progress, id, verification);
                    persist();
                    if (isCapstone) {
                        const status = content.querySelector("[data-capstone-status]");
                        if (status) status.textContent = "Capstone practical: passed. The final is now available.";
                    } else refreshModuleStatuses(course.modules.find(module => module.id === id));
                }
            });
            item = { node, controller };
            workbenches.set(id, item);
        }
        activeWorkbench = item.controller;
        return item.node;
    }

    function modulePage(module, lesson, viewHint) {
        const index = course.modules.indexOf(module);
        heading(module.title, `MODULE ${index + 1} OF ${course.modules.length}`, module.summary);
        const statuses = moduleStatus(module);
        statuses.setAttribute("aria-live", "polite");
        statuses.dataset.moduleStatus = module.id;
        content.append(statuses);
        const nav = make("nav", undefined, "gc-local-nav");
        nav.setAttribute("aria-label", "Module lessons and activities");
        const view = lesson ? lesson.id : viewHint || moduleViews.get(module.id) || module.lessons[0].id;
        moduleViews.set(module.id, view);
        module.lessons.forEach((item, position) => {
            const itemLink = link(`#${item.id}`, `${position + 1}. ${item.title}${progress.studied.includes(item.id) ? " · studied" : ""}`);
            if (view === item.id) itemLink.setAttribute("aria-current", "page");
            nav.append(itemLink);
        });
        for (const [key, title] of [["workbench", "Practical workbench"], ["check", "Knowledge check"]]) {
            const control = button(title, () => {
                moduleViews.set(module.id, key);
                const target = stageHash(`${module.id}-${key === "workbench" ? "practical" : "check"}`);
                if (window.location.hash === target) route(target);
                else window.location.hash = target;
            });
            control.setAttribute("aria-pressed", String(view === key));
            nav.append(control);
        }
        content.append(nav);
        if (view === "workbench") {
            const node = getWorkbench(module.id, module.challenge);
            content.append(node);
            if (window.matchMedia("(min-width: 1000px)").matches) {
                window.requestAnimationFrame(() => {
                    if (!root.hidden && content.contains(node)) node.scrollIntoView({ block: "start", behavior: "auto" });
                });
            }
            const onward = make("p", undefined, "gc-next");
            onward.append(button("Continue to knowledge check →", () => {
                window.location.hash = stageHash(`${module.id}-check`);
            }));
            content.append(onward);
        } else if (view === "check") {
            content.append(buildAssessment(module.id, module.assessment, `${module.title} · knowledge check`));
        } else {
            const active = module.lessons.find(item => item.id === view) || module.lessons[0];
            content.append(buildLesson(active, module));
        }
        const footer = make("nav", undefined, "gc-module-paging");
        footer.setAttribute("aria-label", "Course progression");
        footer.append(link(index > 0 ? stageHash(course.modules[index - 1].id) : overviewHash, index > 0 ? "← Previous module" : "← Course overview"));
        const next = course.modules[index + 1];
        const nextStage = next?.id || (course.capstone ? "capstone" : "final");
        const access = accessFor(nextStage);
        const nextLink = link(next ? stageHash(next.id) : stageHash(course.capstone ? "capstone" : "review"), access.allowed ? next ? "Next module →" : course.capstone ? "Capstone →" : "Cumulative review →" : "Next step · view prerequisite →");
        nextLink.dataset.nextStage = module.id;
        footer.append(nextLink);
        content.append(footer);
    }

    function refreshModuleStatuses(module) {
        content.querySelectorAll(`[data-module-status="${module.id}"]`).forEach(node => {
            node.replaceChildren(...moduleStatus(module).childNodes);
        });
        const next = course.modules[course.modules.indexOf(module) + 1];
        const access = accessFor(next?.id || (course.capstone ? "capstone" : "final"));
        const nextLink = content.querySelector(`[data-next-stage="${module.id}"]`);
        if (nextLink) nextLink.textContent = access.allowed ? next ? "Next module →" : course.capstone ? "Capstone →" : "Cumulative review →" : "Next step · view prerequisite →";
    }

    function buildLesson(lesson, module) {
        const article = make("article", undefined, "gc-lesson");
        article.id = `${lesson.id}-content`;
        article.append(make("h3", lesson.title), make("p", lesson.intro, "gc-intro"));
        const studied = button("", () => {
            progress.studied = progress.studied.includes(lesson.id) ? progress.studied.filter(id => id !== lesson.id) : [...progress.studied, lesson.id];
            persist();
            updateStudied();
            refreshModuleStatuses(module);
        }, "quiet gc-studied");
        const updateStudied = () => {
            const marked = progress.studied.includes(lesson.id);
            studied.textContent = marked ? "Studied ✓ · mark unread" : "Mark lesson as studied";
            studied.setAttribute("aria-pressed", String(marked));
        };
        studied.title = "Self-reported reading progress; this does not pass a practical or quiz.";
        updateStudied();
        article.append(studied, make("p", "Studied is self-reported and does not replace a practical or quiz pass.", "gc-muted"));
        if (module.goals?.length) {
            const goals = make("details", undefined, "gc-goals");
            goals.append(make("summary", "Module learning objectives"));
            const list = make("ul"); module.goals.forEach(goal => list.append(make("li", goal))); goals.append(list); article.append(goals);
        }
        lesson.sections.forEach(section => {
            const block = make("section");
            block.append(make("h4", section.heading), make("p", section.text));
            article.append(block);
        });
        lesson.figures?.forEach((spec, index) => article.append(buildFigure(spec, `${lesson.id}-figure-${index + 1}`)));
        if (lesson.table) article.append(buildTable(lesson.table));
        if (lesson.example) {
            const example = make("section", undefined, "gc-worked-example");
            example.append(make("p", "WORKED EXAMPLE", "gc-eyebrow"), make("h4", lesson.example.title), make("p", lesson.example.text));
            article.append(example);
        }
        if (lesson.misconception) {
            const misconception = make("aside", undefined, "gc-misconception");
            misconception.append(make("h4", "A useful distinction"), make("p", lesson.misconception));
            article.append(misconception);
        }
        if (lesson.reflection) {
            const reflection = make("section", undefined, "gc-reflection");
            reflection.append(make("h4", "Check your reasoning"), make("p", lesson.reflection.prompt));
            const answer = make("details");
            answer.append(make("summary", "Compare with the worked answer"), make("p", lesson.reflection.answer));
            reflection.append(answer);
            article.append(reflection);
        }
        if (lesson.studio?.length) {
            const assignments = make("section", undefined, "gc-studio-assignments");
            assignments.append(make("h4", "Observe the exchange in Network Studio"), make("p", "Your saved workbench settings and assessment drafts remain in this browser while you visit Studio.", "gc-muted"));
            lesson.studio.forEach(item => {
                const assignment = make("p");
                const target = link("#network", item.label);
                target.dataset.studioLesson = item.id;
                target.dataset.courseReturn = `#${lesson.id}`;
                assignment.append(target, document.createTextNode(` — ${item.instruction}`));
                assignments.append(assignment);
            });
            article.append(assignments);
        }
        if (lesson.review?.length) {
            const review = make("div", undefined, "gc-recall");
            review.append(make("h4", "Revisit the foundations"));
            lesson.review.forEach(item => review.append(link(item.href, item.label)));
            article.append(review);
        }
        const position = module.lessons.indexOf(lesson);
        const next = module.lessons[position + 1];
        const onward = make("div", undefined, "gc-actions");
        if (next) onward.append(link(`#${next.id}`, `Next lesson: ${next.title}`, "gc-action gc-primary"));
        onward.append(button("Open practical workbench", () => {
            moduleViews.set(module.id, "workbench");
            const target = stageHash(`${module.id}-practical`);
            if (window.location.hash === target) route(target);
            else window.location.hash = target;
        }));
        article.append(onward);
        return article;
    }

    function assessmentScore(stage) {
        return stage === "readiness" || stage === "final" ? progress[stage] : progress.modules[stage]?.score;
    }

    function buildAssessment(stage, spec, title) {
        const section = make("section", undefined, "gc-assessment");
        section.append(make("p", "UNTIMED / UNLIMITED RETAKES", "gc-eyebrow"), make("h3", title), make("p", `${spec.count} questions · ${Math.ceil(spec.count * .8)} correct to pass. Best result: ${scoreLabel(assessmentScore(stage))}. Latest completed: ${scoreLabel(progress.latest[stage])}.`), make("p", "Unfinished answers and question order are saved locally as you work. Feedback appears after every question is answered and submitted. Export an updated backup to move this work to another browser.", "gc-draft-notice"));
        let draft = drafts.get(stage);
        if (!draft && progress.drafts[stage]) {
            draft = restoreAssessmentDraft(spec, progress.drafts[stage]);
            drafts.set(stage, draft);
        }
        const saveDraft = value => {
            progress.drafts[stage] = saveAssessmentDraft(value.attempt, value.answers, Boolean(value.grade));
            persist();
        };
        if (!draft) {
            section.append(button(`Start ${spec.count}-question attempt`, () => {
                try {
                    const started = { attempt: makeAttempt(spec), answers: Array(spec.count).fill(null), grade: null };
                    drafts.set(stage, started);
                    saveDraft(started);
                    section.replaceWith(buildAssessment(stage, spec, title));
                    content.querySelector(".gc-question input")?.focus();
                } catch (exception) {
                    const error = make("p", exception.message, "gc-error");
                    error.setAttribute("role", "alert");
                    section.append(error);
                }
            }, "gc-primary"));
            return section;
        }
        const form = make("form");
        form.dataset.assessmentStage = stage;
        form.noValidate = true;
        const validation = make("p", "", "gc-error");
        validation.setAttribute("role", "alert");
        validation.hidden = true;
        const count = make("p", "", "gc-answer-count");
        const updateCount = () => { count.textContent = `${draft.answers.filter(value => value !== null).length} of ${draft.attempt.length} answered`; };
        updateCount();
        form.append(validation, count);
        draft.attempt.forEach((question, index) => {
            const fieldset = make("fieldset", undefined, "gc-question");
            fieldset.id = `${prefix}-question-${stage}-${index}`;
            fieldset.dataset.questionId = question.id;
            const legend = make("legend", `${index + 1}. ${question.prompt}`);
            fieldset.append(legend);
            question.options.forEach((text, optionIndex) => {
                const label = make("label", undefined, "gc-answer");
                const input = make("input");
                input.type = "radio";
                input.name = `${prefix}-${stage}-q-${index}`;
                input.value = optionIndex;
                input.checked = draft.answers[index] === optionIndex;
                input.disabled = Boolean(draft.grade);
                input.required = true;
                input.addEventListener("change", () => {
                    draft.answers[index] = optionIndex;
                    fieldset.classList.remove("gc-unanswered");
                    fieldset.removeAttribute("aria-invalid");
                    updateCount();
                    saveDraft(draft);
                });
                label.append(input, make("span", text));
                fieldset.append(label);
            });
            if (draft.grade) {
                const feedback = make("div", undefined, draft.grade.results[index] ? "gc-feedback gc-correct" : "gc-feedback gc-incorrect");
                feedback.append(make("p", draft.grade.results[index] ? "Correct" : `Not yet · correct answer: ${question.options[question.answer]}`, "gc-feedback-label"), make("p", question.explanation), make("p", `Objective: ${question.objective}`, "gc-muted"), link(hash(question.study), "Study the explanation and worked example →"));
                fieldset.append(feedback);
            }
            form.append(fieldset);
        });
        if (!draft.grade) {
            const submit = make("button", "Submit complete attempt", "gc-primary");
            submit.type = "submit";
            form.append(submit);
            form.addEventListener("submit", event => {
                event.preventDefault();
                try {
                    const grade = gradeAttempt(draft.attempt, draft.answers);
                    if (!grade.complete) {
                        validation.hidden = false;
                        validation.textContent = `Answer all questions before submitting. ${grade.missing.length} ${grade.missing.length === 1 ? "question is" : "questions are"} unanswered. No score has been recorded.`;
                        grade.missing.forEach(index => {
                            const fieldset = form.querySelector(`#${prefix}-question-${stage}-${index}`);
                            fieldset.classList.add("gc-unanswered");
                            fieldset.setAttribute("aria-invalid", "true");
                        });
                        form.querySelector(`#${prefix}-question-${stage}-${grade.missing[0]} input`)?.focus();
                        return;
                    }
                    progress = recordAssessment(course, progress, stage, grade);
                    draft.grade = grade;
                    saveDraft(draft);
                    const replacement = buildAssessment(stage, spec, title);
                    section.replaceWith(replacement);
                    replacement.querySelector(".gc-result")?.focus();
                    const module = course.modules.find(item => item.id === stage);
                    if (module) refreshModuleStatuses(module);
                } catch (exception) {
                    validation.hidden = false;
                    validation.textContent = exception.message;
                }
            });
        } else {
            const grade = draft.grade;
            const result = make("section", undefined, `gc-result${grade.passed ? " gc-result-passed" : ""}`);
            result.tabIndex = -1;
            result.setAttribute("aria-label", "Assessment result");
            result.append(make("h4", `${grade.passed ? "Passed" : "Keep investigating"} · ${grade.correct}/${grade.total}`), make("p", grade.passed ? "This attempt meets the 80% knowledge threshold. An earned pass is preserved even if a later retake scores lower." : "This attempt did not reach 80%. Review the objectives below and try another balanced attempt. Any previously earned pass is preserved."));
            if (stage !== "readiness" && stage !== "final" && !progress.modules[stage]?.practical) result.append(make("p", "Your practical challenge is still required. A quiz pass alone does not unlock the next module."));
            const missed = new Map();
            draft.attempt.forEach((question, index) => {
                if (!grade.results[index] && !missed.has(question.objective)) missed.set(question.objective, question.study);
            });
            if (missed.size) {
                result.append(make("h5", "Targeted review"));
                const list = make("ul");
                missed.forEach((href, objective) => { const item = make("li"); item.append(link(hash(href), objective)); list.append(item); });
                result.append(list);
            }
            const actions = make("div", undefined, "gc-actions");
            actions.append(button("Start a new balanced attempt", () => {
                const nextDraft = { attempt: makeAttempt(spec), answers: Array(spec.count).fill(null), grade: null };
                drafts.set(stage, nextDraft);
                saveDraft(nextDraft);
                const replacement = buildAssessment(stage, spec, title);
                section.replaceWith(replacement);
                replacement.querySelector(".gc-question input")?.focus();
            }));
            if (stage === "readiness" && passed(progress.readiness)) actions.append(link(stageHash(course.modules[0].id), "Continue to module 1 →", "gc-action gc-primary"));
            if (stage !== "readiness" && stage !== "final") {
                const index = course.modules.findIndex(module => module.id === stage);
                const module = course.modules[index];
                if (moduleComplete(progress, stage)) actions.append(link(course.modules[index + 1] ? stageHash(course.modules[index + 1].id) : stageHash(course.capstone ? "capstone" : "review"), "Continue to the next stage →", "gc-action gc-primary"));
                else actions.append(button("Return to the practical challenge", () => { window.location.hash = stageHash(`${module.id}-practical`); }));
            }
            if (stage === "final" && completed()) result.append(buildCompletion());
            result.append(actions);
            section.append(result);
        }
        section.append(form);
        return section;
    }

    function review() {
        heading("Cumulative study guide", "ALL MODULE PREREQUISITES SATISFIED", `Prepare to transfer the same reasoning to new incidents. The 30-question final draws from all ${course.modules.length} modules; at least 24 correct answers are required.`);
        const list = make("div", undefined, "gc-review-grid");
        course.modules.forEach(module => {
            const item = make("section", undefined, "gc-card");
            item.append(make("h3", module.title));
            const goals = make("ul"); module.goals.forEach(goal => goals.append(make("li", goal))); item.append(goals);
            module.lessons.forEach(lesson => item.append(link(`#${lesson.id}`, lesson.title, "gc-review-link")));
            list.append(item);
        });
        content.append(list, link(stageHash("final"), "Start / resume the final exam →", "gc-action gc-primary"), ruleNotice());
    }

    function route(requestedHashWithoutPound = course.id) {
        const requested = hash(requestedHashWithoutPound || course.id);
        if (!requested.startsWith(`#${prefix}-`)) return false;
        progress = store.load();
        activeWorkbench?.pause();
        activeWorkbench = null;
        currentHash = requested;
        // Resolve eligibility before inserting any lesson, assessment or workbench.
        const module = moduleForHash(requested);
        const stage = requested === stageHash("readiness") && course.readiness ? "readiness"
            : requested === stageHash("capstone") && course.capstone ? "capstone"
                : requested === stageHash("review") || requested === stageHash("final") ? "final" : module?.id;
        const access = stage ? accessFor(stage) : { allowed: true };
        content.replaceChildren();
        if (!access.allowed) locked(access);
        else if (requested === overviewHash) overview();
        else if (requested === stageHash("readiness") && course.readiness) {
            heading("Readiness: apply Networking 101 + 102", "ENTRY CHECK / OPEN PREPARATION", "Use the open study guide, then show that you can interpret the foundations before beginning the practical course.");
            content.append(prerequisiteChecklist(), publicStudyGuide(), buildAssessment("readiness", course.readiness, "Course readiness"), ruleNotice());
        } else if (requested === stageHash("capstone") && course.capstone) {
            heading(course.capstone.title, "SEPARATE CAPSTONE / ALL MODULES REQUIRED", course.capstone.description);
            const status = make("p", progress.capstone ? "Capstone practical: passed." : "Capstone practical: not yet passed.", "gc-module-status");
            status.dataset.capstoneStatus = "";
            content.append(status, getWorkbench("capstone", course.capstone.challenge, true), link(stageHash("final"), "Continue to the final →", "gc-action"));
        } else if (requested === stageHash("review")) review();
        else if (requested === stageHash("final")) {
            heading("Final: investigate a new incident", "CUMULATIVE KNOWLEDGE ASSESSMENT", `All ${course.modules.length} practical challenges and module checks${course.capstone ? ", plus the separate capstone," : ""} are required. The final knowledge assessment is a separate requirement.`);
            content.append(link(stageHash("review"), "Review the cumulative study guide", "gc-action"), buildAssessment("final", course.final, `${course.shortTitle || course.title} final`), ruleNotice());
        } else if (module) {
            const view = requested === stageHash(`${module.id}-practical`) ? "workbench" : requested === stageHash(`${module.id}-check`) ? "check" : null;
            modulePage(module, module.lessons.find(lesson => requested === `#${lesson.id}`), view);
        } else {
            heading("Course page not found", "UNKNOWN COURSE DESTINATION");
            content.append(make("p", "This course link does not match an available stage."), link(overviewHash, "Return to the course overview", "gc-action"));
        }
        if (access.allowed && (requested === overviewHash || stage)) {
            progress.resume = requested;
            persist();
        } else updatePicker();
        if (!root.hidden) content.querySelector(".gc-heading h2")?.focus({ preventScroll: true });
        return true;
    }
    route.pause = () => { activeWorkbench?.pause(); };
    route.destroy = () => { unsubscribe(); workbenches.forEach(item => item.controller.destroy()); root.replaceChildren(); };
    return route;
}
