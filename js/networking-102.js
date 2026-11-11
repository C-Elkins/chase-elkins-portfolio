import { networkingModules102 } from "./networking-course-102.mjs";
import { initializeNetworkingCourse } from "./networking-course.js?v=2026-11-12-course-102-2";
import { buildFigure, buildTable } from "./course-charts.js?v=2026-11-12-course-102-2";

const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

function buildChapter(module) {
    const id = module.chapters[0];
    const article = make("article", undefined, "panel learn-chapter course-102-chapter");
    article.id = id;
    article.append(make("p", "", "learn-kicker"), make("h3", module.heading), make("p", module.intro, "course-intro"));
    const recall = make("p", undefined, "course-recall");
    recall.append(make("span", "BUILDS ON"));
    module.builds.forEach(([href, label, reminder]) => {
        const item = make("span", undefined, "course-recall-item");
        const link = make("a", label);
        link.href = href;
        item.append(link, document.createTextNode(`: ${reminder}`));
        recall.append(item);
    });
    article.append(recall);
    const figures = module.figures.map((spec, index) => buildFigure(spec, `${id}-figure-${index + 1}`));
    const blocks = module.concepts.map(([heading, text]) => {
        const block = make("section", undefined, "course-concept");
        block.append(make("h4", heading), make("p", text));
        return block;
    });
    article.append(...blocks.slice(0, 2));
    if (figures[0]) article.append(figures[0]);
    article.append(...blocks.slice(2));
    if (module.table) article.append(buildTable(module.table));
    article.append(...figures.slice(1));
    const takeaway = make("p", undefined, "learn-takeaway");
    takeaway.append(make("span", "KEY IDEA"), document.createTextNode(module.takeaway));
    const studio = make("p", "Watch it:", "learn-try");
    module.studio.forEach(([lesson, label]) => {
        const link = make("a", label);
        link.href = "#network";
        link.dataset.studioLesson = lesson;
        studio.append(" ", link);
    });
    article.append(takeaway, studio);
    return article;
}

export function initializeNetworking102() {
    const staging = document.getElementById("learn102-chapters");
    staging.append(...networkingModules102.map(buildChapter));
    const route = initializeNetworkingCourse({ prefix: "learn102", modules: networkingModules102, legacy: false });
    staging.remove();
    return route;
}
