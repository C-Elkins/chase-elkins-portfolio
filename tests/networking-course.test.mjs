import { networkingModules, gradeModule } from "../js/networking-course.mjs";

export function runNetworkingCourseModelTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const ids = new Set();
    const chapters = new Set();
    assert(networkingModules.length === 14, "Course contains 14 open modules");
    assert(networkingModules.reduce((count, module) => count + module.questions.length, 0) === 70, "Course contains exactly 70 questions");
    for (const module of networkingModules) {
        assert(!ids.has(module.id), `${module.id}: unique module ID`);
        ids.add(module.id);
        assert(module.minutes > 0 && module.goals.length >= 2 && module.lessons.length >= 2, `${module.id}: time estimate, goals and deeper lessons`);
        assert(module.practice.length === 2 && module.practice.every(text => text.length > 50), `${module.id}: worked practice and reasoning`);
        for (const chapter of module.chapters) {
            assert(!chapters.has(chapter), `${chapter}: belongs to only one module`);
            chapters.add(chapter);
        }
        for (const item of module.questions) {
            assert(item.prompt.length > 20 && item.explanation.length > 40, `${module.id}: substantive question and explanation`);
            assert(item.options.length === 4 && new Set(item.options).size === 4, `${module.id}: four distinct options`);
            assert(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < item.options.length, `${module.id}: answer identifies an option`);
        }
        const correct = module.questions.map(item => item.answer);
        const allCorrect = gradeModule(module, correct);
        assert(module.questions.length === 5 && allCorrect.complete && allCorrect.correct === 5 && allCorrect.results.every(Boolean), `${module.id}: all correct scores 5/5`);
        const allWrong = gradeModule(module, module.questions.map(item => (item.answer + 1) % item.options.length));
        assert(allWrong.complete && allWrong.correct === 0 && allWrong.results.every(value => !value), `${module.id}: all wrong scores 0/5`);
        for (let index = 0; index < module.questions.length; index++) {
            const answers = [...correct];
            answers[index] = null;
            const partial = gradeModule(module, answers);
            assert(!partial.complete && partial.missing.length === 1 && partial.missing[0] === index, `${module.id}: missing answer ${index} is not graded complete`);
            for (let selected = 0; selected < module.questions[index].options.length; selected++) {
                answers[index] = selected;
                const result = gradeModule(module, answers);
                assert(result.correct === (selected === correct[index] ? 5 : 4), `${module.id}: question ${index}, option ${selected} scored exactly`);
            }
        }
    }
    for (const answers of [[], [0, 0, 4, 0, 0], [0, -1, 0, 0, 0], ["0", 0, 0, 0, 0], [NaN, 0, 0, 0, 0]]) {
        let rejected = false;
        try { gradeModule(networkingModules[0], answers); }
        catch (error) { rejected = error instanceof TypeError || error instanceof RangeError; }
        assert(rejected, "Invalid answer shapes and indexes are explicitly rejected");
    }
    return `Networking course model tests passed: ${passed} assertions.`;
}

export async function runNetworkingCourseUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await new Promise(resolve => requestAnimationFrame(resolve));
    };
    await go("#learn");
    const quizzes = [...document.querySelectorAll("#learn .learn-quiz")];
    quizzes.forEach(quiz => quiz.querySelector("form").reset());
    const checklist = document.querySelector("#learn .learn-progress-summary");
    const links = [...$("learn-module-map").children];
    assert(links.length === 14 && quizzes.length === 14, "Every module has a map card and end check");
    assert(checklist?.textContent.includes("0/18 lessons marked studied") && checklist.textContent.includes("0/14 quizzes passed"), "Overview separates studied lessons from prerequisite quiz passes");
    assert(checklist.querySelector("summary").textContent.startsWith("Completed") && [...checklist.querySelectorAll("details summary")].some(summary => summary.textContent.startsWith("Not completed")), "Overview labels completed and remaining work");
    assert(checklist.querySelector("details:last-child a")?.hash === `#quiz-${networkingModules[0].id}`, "Outstanding work links directly to the first missing quiz");
    assert($("learn-course-progress").value === 0, "Unchecked quizzes do not count as progress");
    assert(document.querySelectorAll("#learn [data-module]").length === 18, "All 18 lesson articles belong to modules");
    assert(!document.getElementById("learn-overview").hidden && document.getElementById("learn-workspace").hidden, "Course opens on an overview, not all lessons");
    assert(!document.querySelector("#learn input:disabled, #learn a[aria-disabled='true']"), "No learning controls are locked");
    const ids = [...document.querySelectorAll("[id]")].map(node => node.id);
    assert(new Set(ids).size === ids.length, "Generated controls and feedback IDs are unique");

    for (const [moduleIndex, module] of networkingModules.entries()) {
        await go(`#${module.chapters[0]}`);
        const first = $(module.chapters[0]);
        const last = $(module.chapters.at(-1));
        const quiz = $(`quiz-${module.id}`);
        const form = quiz.querySelector("form");
        const fields = [...form.querySelectorAll("fieldset")];
        const result = quiz.querySelector(".learn-quiz-result");
        const setAnswer = (questionIndex, optionIndex) => {
            const input = fields[questionIndex].querySelectorAll("input")[optionIndex];
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        assert(document.querySelectorAll("#learn .learn-module-view:not([hidden])").length === 1 && !first.parentElement.hidden, `${module.id}: only the selected module is shown`);
        assert([...document.querySelectorAll("#learn .learn-chapter")].filter(chapter => chapter.getClientRects().length).length === module.chapters.length, `${module.id}: other modules do not lengthen the page`);
        assert(document.querySelector("#learn-sidebar-nav [aria-current]").hash === `#${first.id}`, `${module.id}: navigator marks the selected module`);
        assert(links[moduleIndex].hash === `#${first.id}`, `${module.id}: map targets the module start`);
        assert(first.querySelector(".learn-module-goals li") && quiz.parentElement === last, `${module.id}: goals at start and test at end`);
        assert(quiz.previousElementSibling.classList.contains("learn-deeper"), `${module.id}: extra teaching and practice precede the quiz`);
        const navigation = last.querySelector(".learn-module-footer");
        assert(navigation.querySelector('a[href="#learn-module-map"]'), `${module.id}: can return to the open module map`);
        if (moduleIndex + 1 < networkingModules.length) {
            assert(navigation.lastElementChild.hash === `#${networkingModules[moduleIndex + 1].chapters[0]}`, `${module.id}: next-module link points to a real lesson`);
        }
        const practice = last.querySelector(".learn-practice details");
        practice.open = true;
        assert(practice.querySelector("p").textContent === module.practice[1], `${module.id}: reveals worked reasoning`);
        practice.open = false;
        quiz.open = true;
        form.requestSubmit();
        assert(result.textContent.includes("5 remaining") && document.activeElement === fields[0].querySelector("input"), `${module.id}: unanswered submission focuses the first missing question`);
        assert(fields.every(field => field.getAttribute("aria-invalid") === "true"), `${module.id}: unanswered questions are identified`);
        assert($("learn-course-progress").value === moduleIndex, `${module.id}: incomplete attempt does not advance progress`);
        assert(fields.every(field => field.querySelector("legend") && [...field.querySelectorAll("input")].every(input => $(input.getAttribute("aria-describedby")))), `${module.id}: questions and feedback have accessible labels`);
        module.questions.forEach((question, index) => setAnswer(index, (question.answer + 1) % question.options.length));
        form.requestSubmit();
        assert(result.textContent.startsWith("0 of 5"), `${module.id}: wrong attempt scores 0/5`);
        assert(fields.every(field => field.dataset.correct === "false" && !field.querySelector(".learn-quiz-feedback").hidden), `${module.id}: every wrong answer gets feedback`);
        assert(module.questions.every((question, index) => fields[index].querySelector(".learn-quiz-feedback").textContent.includes(question.options[question.answer])), `${module.id}: corrections name the actual right answer`);
        assert($("learn-course-progress").value === moduleIndex, `${module.id}: a failed attempt does not count as a prerequisite pass`);
        setAnswer(0, module.questions[0].answer);
        assert($("learn-course-progress").value === moduleIndex && fields.every(field => field.querySelector(".learn-quiz-feedback").hidden), `${module.id}: answer changes clear feedback without inventing a pass`);
        module.questions.forEach((question, index) => setAnswer(index, index < 2 ? (question.answer + 1) % 4 : question.answer));
        form.requestSubmit();
        assert(result.textContent.startsWith("3 of 5") && $("learn-course-progress").value === moduleIndex, `${module.id}: 3/5 does not pass`);
        module.questions.forEach((question, index) => setAnswer(index, index === 1 ? (question.answer + 1) % 4 : question.answer));
        form.requestSubmit();
        assert(result.textContent.startsWith("4 of 5") && $("learn-course-progress").value === moduleIndex + 1, `${module.id}: 4/5 passes`);
        module.questions.forEach((question, index) => setAnswer(index, question.answer));
        form.requestSubmit();
        assert(result.textContent.startsWith("5 of 5") && fields.every(field => field.dataset.correct === "true"), `${module.id}: retry can reach 5/5`);
        assert(links[moduleIndex].querySelector(".learn-module-status").textContent.includes("best 5/5 · latest 5/5"), `${module.id}: best and latest scores are shown in the map`);
        form.reset();
        assert(form.querySelectorAll("input:checked").length === 0 && result.textContent.includes("reset"), `${module.id}: restart clears answers`);
        assert(document.activeElement === fields[0].querySelector("input") && $("learn-course-progress").value === moduleIndex + 1, `${module.id}: restart restores focus and keeps the earned pass`);
        module.questions.forEach((question, index) => setAnswer(index, question.answer));
        form.requestSubmit();
        quiz.open = false;
    }
    assert($("learn-course-count").textContent === "14 of 14", "All checked modules yield 14 of 14");
    assert(checklist.textContent.includes("14/14 quizzes passed") && checklist.querySelector("details").textContent.includes("quiz passed"), "Checklist reflects earned course passes");
    assert(checklist.querySelector("details:last-child summary").textContent.includes("18 activities"), "Checklist still distinguishes unmarked lessons from quiz passes");
    await go("#algorithms");
    await go("#learn");
    assert($("learn-course-progress").value === 14, "Switching tabs preserves saved results");
    quizzes.forEach(quiz => quiz.querySelector("form").reset());
    assert($("learn-course-progress").value === 14, "Starting new attempts keeps earned passes");
    assert(document.documentElement.scrollWidth <= innerWidth, "Course does not cause page-wide horizontal overflow");
    scrollTo(0, 0);
    return `Networking course UI tests passed: ${passed} assertions.`;
}

export async function runNetworkingCourseNavigationTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 40));
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await settle();
    };
    await go("#learn");
    $("learn-module-map").firstElementChild.click();
    await settle();
    assert(location.hash === "#learn-what" && !$("learn-workspace").hidden && $("learn-overview").hidden, "Module card opens a dedicated learning view");
    assert($("learn-module-position").textContent.includes("01 OF 14"), "Module view shows a clear position");
    assert($("learn-module-prev").hidden && !$("learn-module-next").hidden, "First module has only a next link");
    assert(document.activeElement === $("learn-module-title"), "Module navigation moves keyboard focus to the heading");
    const radio = $("quiz-foundations").querySelector("input");
    $("quiz-foundations").open = true;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
    $("learn-module-next").click();
    await settle();
    assert(location.hash === "#learn-hardware", "Next control opens the actual next module");
    const back = new Promise(resolve => window.addEventListener("hashchange", resolve, { once: true }));
    history.back();
    await back;
    assert(location.hash === "#learn-what" && $("learn-module-select").value === "foundations", "Browser Back restores selected module and picker");
    assert(radio.checked && $("quiz-foundations").open, "Back preserves answers and the expanded quiz");
    const forward = new Promise(resolve => window.addEventListener("hashchange", resolve, { once: true }));
    history.forward();
    await forward;
    assert(location.hash === "#learn-hardware" && $("learn-module-select").value === "hardware", "Browser Forward restores the next module");

    await go("#printer-address");
    assert($("learn-module-select").value === "printer-setup" && !$("printer-address").parentElement.hidden, "Old printer chapter links still select their module");
    assert($("printer-address").getBoundingClientRect().top >= document.querySelector(".lab-header").getBoundingClientRect().bottom, "A linked second lesson clears the sticky header");
    await go("#quiz-security");
    assert($("quiz-security").open && $("learn-module-select").value === "security", "Direct quiz links open the right module and quiz");
    assert(document.activeElement === $("quiz-security").querySelector("summary"), "Direct quiz link has useful keyboard focus");
    await go("#learn-printers");
    assert($("learn-module-select").value === "printer-setup", "Legacy printer subsection link opens the first printer module");
    await go("#printer-fix");
    assert($("learn-module-next").hidden && !$("learn-module-prev").hidden, "Last module has only a previous link");
    document.querySelector("#learn-module-toolbar .learn-all-modules").click();
    await settle();
    assert(!$("learn-overview").hidden && $("learn-workspace").hidden, "All modules returns to the short overview");
    assert(!$("learn-resume").hidden && $("learn-resume").hash === "#printer-fix", "Overview offers a return link to the last module");
    $("learn-resume").click();
    await settle();
    assert($("learn-module-select").value === "shared-devices", "Return link restores the last module");
    $("learn-module-select").value = "addressing";
    $("learn-module-select").dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    assert(location.hash === "#learn-addresses" && document.querySelectorAll("#learn .learn-module-view:not([hidden])").length === 1, "Compact module picker changes the visible module");
    assert(document.documentElement.scrollWidth <= innerWidth, "Module workspace has no horizontal page overflow");
    await go("#learn-what");
    $("quiz-foundations").querySelector("form").reset();
    $("quiz-foundations").open = false;
    await go("#learn");
    return `Networking course navigation tests passed: ${passed} assertions.`;
}
