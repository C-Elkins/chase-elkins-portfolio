"use strict";

const projects = [
    {
        title: "NetVHunter",
        description: "A private production attack-suite concept for authorized red teams and MSPs, bringing security assessment workflows into one focused product.",
        tech: ["Security", "Red Team", "Automation", "Product Design"],
        image: "images/netvhunter-badge.jpg",
        glyph: "NV",
        details: "projects/netvhunter.html",
        github: "",
        demo: "",
        status: "in-progress"
    },
    {
        title: "Professional Portfolio",
        description: "A performance-focused, accessible portfolio with a secure static architecture and responsive interface.",
        tech: ["HTML", "CSS", "JavaScript", "GitHub Pages"],
        glyph: ">_",
        github: "https://github.com/C-Elkins/chase-elkins-portfolio",
        demo: "https://c-elkins.github.io/chase-elkins-portfolio/",
        status: "completed"
    },
    {
        title: "RetroWave Visualizer",
        description: "An interactive audio experience using real-time frequency analysis, custom effects, and the Web Audio API.",
        tech: ["JavaScript", "Web Audio", "Canvas", "CSS"],
        glyph: "≈",
        github: "https://github.com/C-Elkins/Retrowave-music-visualizer",
        demo: "https://c-elkins.github.io/Retrowave-music-visualizer/",
        status: "completed"
    },
    {
        title: "Asset Management",
        description: "A role-aware platform for tracking equipment, software licenses, ownership, and maintenance schedules.",
        tech: ["Java", "Spring Boot", "React", "PostgreSQL"],
        glyph: "▦",
        github: "https://github.com/C-Elkins/Asset-Management",
        demo: "",
        status: "in-progress"
    },
    {
        title: "Code Intelligence",
        description: "A smarter snippet library concept built around fast search, organization, and collaborative workflows.",
        tech: ["TypeScript", "Next.js", "Supabase", "AI"],
        glyph: "{ }",
        github: "",
        demo: "",
        status: "in-progress"
    }
];

const statusLabels = {
    completed: "Live",
    "in-progress": "Building"
};

function appendTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
}

function createProjectCard(project, index) {
    const article = document.createElement("article");
    article.className = "project-card reveal";

    const meta = document.createElement("div");
    meta.className = "project-meta";
    appendTextElement(meta, "span", "", `PROJECT_${String(index + 1).padStart(2, "0")}`);
    appendTextElement(meta, "span", "project-status", statusLabels[project.status]);
    article.appendChild(meta);

    const visual = appendTextElement(article, "div", "project-glyph", project.image ? "" : project.glyph);
    if (project.image) {
        visual.classList.add("project-logo");
        const image = document.createElement("img");
        image.src = project.image;
        image.alt = "";
        image.width = 720;
        image.height = 720;
        image.loading = "lazy";
        image.decoding = "async";
        visual.appendChild(image);
    }
    appendTextElement(article, "h3", "", project.title);
    appendTextElement(article, "p", "", project.description);

    const techList = document.createElement("div");
    techList.className = "project-tech";
    project.tech.forEach((technology) => appendTextElement(techList, "span", "", technology));
    article.appendChild(techList);

    const links = document.createElement("div");
    links.className = "project-links";
    if (project.details) links.appendChild(createDetailsLink(project.details, "View case study →"));
    if (project.github) links.appendChild(createProjectLink(project.github, "Source ↗"));
    if (project.demo) links.appendChild(createProjectLink(project.demo, "Live demo ↗"));
    article.appendChild(links);

    return article;
}

function createDetailsLink(url, label) {
    const link = document.createElement("a");
    link.href = url;
    link.textContent = label;
    return link;
}

function createProjectLink(url, label) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
}

function renderProjects(filter = "all") {
    const container = document.getElementById("projects-container");
    if (!container) return;

    const visibleProjects = filter === "all"
        ? projects
        : projects.filter((project) => project.status === filter);

    container.replaceChildren(...visibleProjects.map(createProjectCard));
    window.initializeReveals?.(container);
}

function initializeProjectFilters() {
    const buttons = [...document.querySelectorAll(".filter-button")];
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            buttons.forEach((item) => {
                const active = item === button;
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });
            renderProjects(button.dataset.filter);
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderProjects();
    initializeProjectFilters();
});
