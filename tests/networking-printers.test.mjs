import { printerModules, troubleshootingCases, finalExam, FINAL_TARGET, gradeModule } from "../js/networking-printers.mjs";
import { networkingModules } from "../js/networking-course.mjs";
import { networkingModules102 } from "../js/networking-course-102.mjs";
import { guidedLessons } from "../js/network-guided.mjs";

const labDestinations = new Set(["firewall", "subnet", "network"]);

export function runPrinterModelTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const known = new Set([...networkingModules, ...networkingModules102].flatMap(module => module.chapters));
    const text101 = new Set(networkingModules.flatMap(module => [...module.goals, ...module.lessons.flat(), ...module.practice, ...module.questions.map(item => item.prompt)]));
    const ids = new Set(), chapters = new Set();
    const answers = [0, 0, 0, 0];
    const checkQuestion = (item, label) => {
        assert(item.prompt.length > 15 && item.explanation.length > 25, `${label}: substantive question`);
        assert(item.options.length === 4 && new Set(item.options).size === 4, `${label}: four distinct options`);
        assert(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4, `${label}: answer identifies an option`);
        answers[item.answer]++;
    };
    assert(printerModules.length === 10, "Printer course contains 10 modules");
    for (const module of printerModules) {
        assert(module.id.startsWith("print-") && !ids.has(module.id), `${module.id}: unique module ID`);
        ids.add(module.id);
        assert(module.chapters.length === 1 && module.chapters[0].startsWith("learnprint-") && !chapters.has(module.chapters[0]), `${module.id}: one unique chapter`);
        chapters.add(module.chapters[0]);
        assert(module.minutes >= 10 && module.goals.length === 3 && module.lessons.length === 2, `${module.id}: time, goals and lessons`);
        assert(module.concepts.length === 4 && module.concepts.every(([heading, text]) => heading.length > 4 && text.length > 180), `${module.id}: four substantive concepts`);
        assert(module.figures.length >= 1 && module.figures.every(figure => ["line", "bars", "stack", "graph"].includes(figure.type) && figure.title && figure.desc.length > 40 && figure.caption.length > 40), `${module.id}: diagrams have titles, descriptions and captions`);
        assert(module.figures.filter(figure => figure.type === "graph").every(figure => figure.edges.every(edge => figure.nodes.some(node => node.id === edge.from) && figure.nodes.some(node => node.id === edge.to))), `${module.id}: diagram edges join real nodes`);
        assert(module.table.rows.every(row => row.length === module.table.columns.length), `${module.id}: table rows match columns`);
        assert(module.builds.length >= 1 && module.builds.every(([href]) => known.has(href.slice(1)) || labDestinations.has(href.slice(1))), `${module.id}: recall links point to real lessons`);
        assert(module.studio.length >= 1 && module.studio.every(([lesson]) => guidedLessons[lesson]), `${module.id}: studio links name real lessons`);
        assert(![...module.goals, ...module.lessons.flat(), ...module.practice].some(text => text101.has(text)), `${module.id}: does not copy 101 teaching text`);
        assert(module.practice.length === 2 && module.practice.every(text => text.length > 80), `${module.id}: practice scenario and reasoning`);
        assert(module.questions.length === 4, `${module.id}: four check questions`);
        module.questions.forEach((item, index) => checkQuestion(item, `${module.id} q${index + 1}`));
        const correct = module.questions.map(item => item.answer);
        assert(gradeModule(module, correct).correct === 4 && gradeModule(module, correct.map(answer => (answer + 1) % 4)).correct === 0, `${module.id}: grading`);
    }
    assert(answers.every(count => count >= 8), "Module answers are spread across every option position");
    assert(troubleshootingCases.length === 5 && new Set(troubleshootingCases.map(item => item.id)).size === 5, "Five unique troubleshooting cases");
    troubleshootingCases.forEach(item => {
        assert(item.scenario.length > 60 && item.evidence.length >= 2, `${item.id}: scenario with evidence`);
        checkQuestion(item.question, item.id);
    });
    assert(finalExam.length === 20, "Final test has 20 questions");
    assert(printerModules.every(module => finalExam.filter(item => item.module === module.id).length === 2), "Final test covers every module twice");
    finalExam.forEach((item, index) => checkQuestion(item, `final q${index + 1}`));
    assert(FINAL_TARGET === 16 && FINAL_TARGET < finalExam.length, "Final target is 16 of 20");
    const prompts = [...printerModules.flatMap(module => module.questions), ...troubleshootingCases.map(item => item.question), ...finalExam].map(item => item.prompt);
    assert(new Set(prompts).size === prompts.length, "Every printer question is unique");
    const finalKey = finalExam.map(item => item.answer);
    assert(gradeModule({ questions: finalExam }, finalKey).correct === 20, "Final test grades a perfect paper");
    return `Printer networking model tests passed: ${passed} assertions.`;
}

export async function runPrinterUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 40));
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await settle();
    };
    const answer = (form, key) => {
        [...form.querySelectorAll("fieldset")].forEach((field, index) => {
            const input = field.querySelectorAll("input")[key[index]];
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        form.requestSubmit();
    };
    await go("#learnprint");
    assert(!$("learnprint").hidden && $("learn").hidden && $("learn102").hidden, "Printer course has its own Lab section");
    assert($("lab-current-title").textContent === "Printer networking", "Header names the printer course");
    assert(!$("learnprint-chapters"), "Generated chapters leave no staging container");
    assert($("learnprint-module-map").children.length === 10 && $("learnprint-sidebar-nav").children.length === 10, "Every module has a card and navigator link");
    assert($("learnprint-course-count").textContent === "0 of 10", "Progress starts empty");
    const checklist = document.querySelector("#learnprint .learn-progress-summary");
    assert(checklist?.textContent.includes("0/10 lessons marked studied") && checklist.textContent.includes("0/10 module checks completed"), "Printer overview separates study marks from completed checks");
    assert(checklist.textContent.includes("case") && checklist.textContent.includes("Final test"), "Printer overview includes cases and the final target");
    assert([...checklist.querySelectorAll("details summary")].some(summary => summary.textContent.startsWith("Not completed")), "Printer overview names remaining work");
    assert([...document.querySelectorAll("#learnprint .course-prereqs a, #learnprint .course-recall a")].every(link => $(link.hash.slice(1))), "Prerequisite and recall links resolve");
    const ids = [...document.querySelectorAll("[id]")].map(node => node.id);
    assert(new Set(ids).size === ids.length, "All Lab IDs are unique");
    assert(document.querySelectorAll("#learnprint .course-figure").length === printerModules.reduce((count, module) => count + module.figures.length, 0), "Every diagram renders");
    assert([...document.querySelectorAll("#learnprint .learn-quiz-option input")].every(input => input.labels.length === 1), "Every answer has a label");

    for (const [index, module] of printerModules.entries()) {
        await go(`#${module.chapters[0]}`);
        const chapter = $(module.chapters[0]);
        assert(!$("learnprint-workspace").hidden && $("learnprint-overview").hidden && document.querySelectorAll("#learnprint .learn-module-view:not([hidden])").length === 1, `${module.id}: route opens only this module`);
        assert(chapter.classList.contains("course-print-chapter") && chapter.querySelector(".learn-kicker").textContent === `MODULE ${String(index + 1).padStart(2, "0")}`, `${module.id}: numbered printer chapter`);
        assert([...chapter.querySelectorAll("svg")].every(svg => svg.getBoundingClientRect().width > 200), `${module.id}: diagrams are readable`);
        const quiz = $(`quiz-${module.id}`);
        quiz.open = true;
        answer(quiz.querySelector("form"), module.questions.map(item => item.answer));
        assert(quiz.querySelector(".learn-quiz-result").textContent.startsWith("4 of 4"), `${module.id}: check scores 4/4`);
        assert($("learnprint-course-progress").value === index + 1, `${module.id}: progress advances`);
        assert(document.documentElement.scrollWidth <= innerWidth, `${module.id}: no horizontal overflow`);
    }
    assert($("learn-course-progress").value === 0 && $("learn102-course-progress").value === 0, "Printer progress is separate from other courses");

    await go("#learnprint-cases");
    assert(!$("learnprint-overview").hidden && $("learnprint-workspace").hidden, "Cases route opens the overview");
    assert(Math.abs($("learnprint-cases").getBoundingClientRect().top) < innerHeight / 2, "Cases route scrolls to the cases");
    const cases = [...document.querySelectorAll(".print-case")];
    assert(cases.length === troubleshootingCases.length, "Every case renders");
    const firstCase = cases[0].querySelector("form");
    firstCase.requestSubmit();
    assert(firstCase.querySelector(".learn-quiz-result").textContent.startsWith("Answer 1 remaining"), "Unanswered case asks for an answer");
    troubleshootingCases.forEach((item, caseIndex) => {
        const form = cases[caseIndex].querySelector("form");
        answer(form, [(item.question.answer + 1) % 4]);
        assert(form.querySelector("[data-correct='false'] .learn-quiz-feedback").textContent.includes(item.question.options[item.question.answer]), `${item.id}: wrong answer explains the correct one`);
        answer(form, [item.question.answer]);
        assert(form.querySelector(".learn-quiz-result").textContent.startsWith("Good diagnosis."), `${item.id}: correct diagnosis`);
        form.reset();
    });

    await go("#learnprint-final");
    const final = $("learnprint-final-form").querySelector("form");
    assert(final.querySelectorAll("fieldset").length === 20, "Final test renders 20 questions");
    const key = finalExam.map(item => item.answer);
    answer(final, key.map((value, index) => index < 5 ? (value + 1) % 4 : value));
    assert($("learnprint-final-result").textContent.startsWith("15 of 20") && /target is 16/.test($("learnprint-final-result").textContent), "15/20 misses the target");
    const review = [...$("learnprint-final-review").querySelectorAll("a")];
    assert(!$("learnprint-final-review").hidden && review.length === new Set(finalExam.slice(0, 5).map(item => item.module)).size && review.every(link => $(link.hash.slice(1))), "Missed questions link to modules to review");
    answer(final, key);
    assert($("learnprint-final-result").textContent.startsWith("20 of 20") && /final target/.test($("learnprint-final-result").textContent) && $("learnprint-final-review").hidden, "Perfect score meets the final target");
    assert(checklist.textContent.includes("Final test · 20/20 · 16/20 target"), "Final result is reflected in the course checklist");
    assert(checklist.querySelector("details").textContent.includes("Completed · 16 course activities") && checklist.querySelector("details:last-child summary").textContent.includes("10 activities"), "Printer checklist clearly separates complete work from unstudied lessons");
    final.reset();
    assert($("learnprint-final-review").hidden && !final.querySelector("[data-correct]"), "Retake clears results");
    review[0]?.click();
    await settle();
    assert(!$("learnprint-workspace").hidden, "Review link opens its module");

    document.querySelectorAll("#learnprint .learn-quiz form").forEach(form => form.reset());
    document.querySelectorAll("#learnprint details.learn-quiz").forEach(quiz => { quiz.open = false; });
    assert($("learnprint-course-progress").value === 10, "Starting new checks retains completed results");
    await go("#printer-connect");
    assert(!$("learn").hidden && $("learnprint").hidden, "101 printer lessons still route to Networking 101");
    await go("#learnprint");
    scrollTo(0, 0);
    return `Printer networking UI tests passed: ${passed} assertions.`;
}
