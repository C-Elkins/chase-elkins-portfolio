import { networkingModules102, gradeModule } from "../js/networking-course-102.mjs";
import { networkingModules } from "../js/networking-course.mjs";
import { guidedLessons } from "../js/network-guided.mjs";

export function runNetworking102ModelTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const ids = new Set(), chapters = new Set();
    const chapters101 = new Set(networkingModules.flatMap(module => module.chapters));
    const chapters102 = new Set(networkingModules102.flatMap(module => module.chapters));
    const text101 = new Set(networkingModules.flatMap(module => [...module.goals, ...module.lessons.flat(), ...module.practice, ...module.questions.map(item => item.prompt)]));
    const answers = [0, 0, 0, 0];
    assert(networkingModules102.length === 14, "Networking 102 contains 14 modules");
    assert(networkingModules102.reduce((count, module) => count + module.questions.length, 0) === 56, "Networking 102 contains 56 questions");
    for (const module of networkingModules102) {
        assert(module.id.startsWith("n102-") && !ids.has(module.id), `${module.id}: unique 102 module ID`);
        ids.add(module.id);
        assert(module.chapters.length === 1 && module.chapters[0].startsWith("learn102-") && !chapters.has(module.chapters[0]), `${module.id}: one unique chapter`);
        chapters.add(module.chapters[0]);
        assert(module.minutes >= 10 && module.goals.length === 3 && module.lessons.length === 2, `${module.id}: deeper time, goals and lessons`);
        assert(module.concepts.length === 4 && module.concepts.every(([heading, text]) => heading.length > 4 && text.length > 180), `${module.id}: four substantive concepts`);
        assert(module.figures.length >= 1 && module.figures.every(figure => ["line", "bars", "stack", "graph"].includes(figure.type) && figure.title && figure.desc.length > 40 && figure.caption.length > 40), `${module.id}: graphs have titles, descriptions and captions`);
        assert(module.intro.length > 120 && module.takeaway.length > 60, `${module.id}: introduction and key idea`);
        assert(module.builds.length >= 1 && module.builds.every(([href]) => chapters101.has(href.slice(1)) || chapters102.has(href.slice(1))), `${module.id}: recall links point to real 101 or 102 lessons`);
        assert(module.studio.every(([lesson]) => guidedLessons[lesson]), `${module.id}: studio links name real lessons`);
        assert(![...module.goals, ...module.lessons.flat(), ...module.practice].some(text => text101.has(text)), `${module.id}: does not copy 101 teaching text`);
        assert(module.practice.length === 2 && module.practice.every(text => text.length > 80), `${module.id}: worked practice and reasoning`);
        if (module.table) assert(module.table.rows.every(row => row.length === module.table.columns.length), `${module.id}: table rows match columns`);
        for (const item of module.questions) {
            assert(!text101.has(item.prompt) && item.prompt.length > 30 && item.explanation.length > 60, `${module.id}: original, substantive question`);
            assert(item.options.length === 4 && new Set(item.options).size === 4, `${module.id}: four distinct options`);
            assert(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4, `${module.id}: answer identifies an option`);
            answers[item.answer]++;
        }
        const correct = module.questions.map(item => item.answer);
        assert(gradeModule(module, correct).correct === 4, `${module.id}: all correct scores 4/4`);
        assert(gradeModule(module, correct.map(answer => (answer + 1) % 4)).correct === 0, `${module.id}: all wrong scores 0/4`);
        assert(!gradeModule(module, [correct[0], null, correct[2], correct[3]]).complete, `${module.id}: missing answer is incomplete`);
    }
    assert(answers.every(count => count >= 10), "Correct answers are spread across every option position");
    const prompts = networkingModules102.flatMap(module => module.questions.map(item => item.prompt));
    assert(new Set(prompts).size === prompts.length, "Every 102 question is unique");
    return `Networking 102 model tests passed: ${passed} assertions.`;
}

export async function runNetworking102UITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 40));
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await settle();
    };
    await go("#learn102");
    assert(!$("learn102").hidden && $("learn").hidden, "Networking 102 has its own Lab section");
    assert(!$("learn102-chapters"), "Generated chapters leave no empty staging container");
    const links = [...$("learn102-module-map").children];
    const quizzes = [...document.querySelectorAll("#learn102 .learn-quiz")];
    assert(links.length === 14 && quizzes.length === 14 && $("learn102-sidebar-nav").children.length === 14, "Every 102 module has a card, navigator link and test");
    assert(!$("learn102-overview").hidden && $("learn102-workspace").hidden, "102 opens on its overview");
    assert($("learn102-course-count").textContent === "0 of 14", "102 progress starts empty");
    assert([...document.querySelectorAll("#learn102 .course-prereqs a")].every(link => $(link.hash.slice(1))), "Prerequisite links point to real 101 lessons");
    const ids = [...document.querySelectorAll("[id]")].map(node => node.id);
    assert(new Set(ids).size === ids.length, "101, 102 and generated chart IDs are unique");
    const figures = [...document.querySelectorAll("#learn102 .course-figure")];
    assert(figures.length === networkingModules102.reduce((count, module) => count + module.figures.length, 0), "Every figure in the data is rendered");
    assert(figures.every(figure => {
        const svg = figure.querySelector("svg[role='img']");
        return svg && svg.getAttribute("aria-labelledby").split(" ").every(id => $(id)?.textContent.length) && figure.querySelector("figcaption").textContent;
    }), "Every graph is an accessible image with a caption");

    for (const [moduleIndex, module] of networkingModules102.entries()) {
        await go(`#${module.chapters[0]}`);
        const chapter = $(module.chapters[0]);
        const quiz = $(`quiz-${module.id}`);
        const form = quiz.querySelector("form");
        const fields = [...form.querySelectorAll("fieldset")];
        assert(!$("learn102").hidden && document.querySelectorAll("#learn102 .learn-module-view:not([hidden])").length === 1 && !chapter.parentElement.hidden, `${module.id}: route opens only this module`);
        assert(document.querySelector("#learn102-sidebar-nav [aria-current]").hash === `#${chapter.id}`, `${module.id}: navigator marks the module`);
        assert(chapter.querySelector(".learn-kicker").textContent === `MODULE ${String(moduleIndex + 1).padStart(2, "0")}`, `${module.id}: numbered kicker`);
        assert(chapter.querySelectorAll(".course-recall a").length === module.builds.length && chapter.querySelectorAll(".course-concept").length === 4, `${module.id}: recall links and concepts render`);
        assert(chapter.querySelectorAll("svg").length === module.figures.length && [...chapter.querySelectorAll("svg")].every(svg => svg.getBoundingClientRect().width > 200), `${module.id}: graphs render at a readable size`);
        assert(!module.table || chapter.querySelector(".course-table tbody").children.length === module.table.rows.length, `${module.id}: comparison table renders`);
        assert(chapter.querySelectorAll('.learn-try a[href="#network"]').length === module.studio.length, `${module.id}: studio links render`);
        assert(quiz.parentElement === chapter && quiz.previousElementSibling.classList.contains("learn-deeper"), `${module.id}: test closes the module`);
        quiz.open = true;
        module.questions.forEach((question, index) => {
            const input = fields[index].querySelectorAll("input")[question.answer];
            input.checked = true;
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });
        form.requestSubmit();
        assert(quiz.querySelector(".learn-quiz-result").textContent.startsWith("4 of 4"), `${module.id}: test scores 4/4`);
        assert($("learn102-course-progress").value === moduleIndex + 1, `${module.id}: 102 progress advances`);
        assert(document.documentElement.scrollWidth <= innerWidth, `${module.id}: no horizontal overflow`);
    }
    assert($("learn-course-progress").value === 0, "102 progress never changes 101 progress");
    $("learn102-module-select").value = "n102-routing";
    $("learn102-module-select").dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    assert(location.hash === "#learn102-routing", "Compact picker opens a 102 module");
    $("learn102-module-next").click();
    await settle();
    assert(location.hash === "#learn102-dynamic", "Next control moves through 102");
    document.querySelector("#learn102-module-toolbar .learn-all-modules").click();
    await settle();
    assert(!$("learn102-overview").hidden && !$("learn102-resume").hidden && $("learn102-resume").hash === "#learn102-dynamic", "Overview offers a 102 return link");
    quizzes.forEach(quiz => { quiz.querySelector("form").reset(); quiz.open = false; });
    assert($("learn102-course-progress").value === 0, "Resetting 102 tests clears progress");
    await go("#learn-what");
    assert(!$("learn").hidden && $("learn102").hidden, "101 links still route to Networking 101");
    await go("#learn102");
    scrollTo(0, 0);
    return `Networking 102 UI tests passed: ${passed} assertions.`;
}
