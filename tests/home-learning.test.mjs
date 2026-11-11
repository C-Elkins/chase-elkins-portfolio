import { guidedLessons } from "../js/network-guided.mjs";
import { networkingModules } from "../js/networking-course.mjs";
import { networkingModules102 } from "../js/networking-course-102.mjs";
import { appliedCourse } from "../js/networking-applied.mjs";

export async function runHomepageLearningTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    const section = document.getElementById("learning");
    const studio = document.getElementById("learning-studio");
    const course = document.getElementById("learning-course");
    const course102 = document.getElementById("learning-course-102");
    const applied = document.getElementById("learning-applied");
    assert(section && studio && course && course102 && applied, "Homepage has a distinct learning spotlight and all four available paths");
    assert(section.getAttribute("aria-labelledby") === "learning-heading", "Spotlight has an accessible heading");
    assert(document.querySelector('.nav-links a[href="#learning"]') && document.querySelector('.hero-learning-link[href="#learning"]'), "Navigation and hero link to the spotlight");

    const studioCount = Number(studio.querySelector("li strong")?.textContent);
    const courseCounts = [...course.querySelectorAll("li strong")].map(node => Number(node.textContent));
    const questionCount = networkingModules.reduce((count, module) => count + module.questions.length, 0);
    assert(studioCount === Object.keys(guidedLessons).length, "Studio lesson count matches the guided catalog");
    assert(courseCounts[0] === networkingModules.length && courseCounts[1] === questionCount, "Course module and quiz counts match the course data");
    const counts102 = [...course102.querySelectorAll("li strong")].map(node => Number(node.textContent));
    assert(counts102[0] === networkingModules102.length && counts102[1] === networkingModules102.reduce((count, module) => count + module.questions.length, 0), "Networking 102 module and test counts match the course data");
    assert(/optional quiz questions/i.test(course.textContent) && /optional test questions/i.test(course102.textContent), "Quizzes and tests are described as optional");
    const appliedCounts = [...applied.querySelectorAll("li strong")].map(node => Number(node.textContent));
    assert(appliedCounts[0] === appliedCourse.modules.length && appliedCounts[1] === appliedCourse.modules.reduce((count, module) => count + module.lessons.length, 0), "Applied course module and lesson counts match its data");
    for (const [path, hash] of [[studio, "#network"], [course, "#learn"], [course102, "#learn102"], [applied, "#applied-networking"]]) {
        const link = path.querySelector("a");
        const destination = new URL(link.getAttribute("href"), location.href);
        assert(destination.origin === location.origin && destination.pathname.endsWith("/lab.html") && destination.hash === hash, `${hash} links to the correct local Lab view`);
        assert(path.querySelector(".learning-available")?.textContent.trim() === "AVAILABLE NOW", `${hash} is labeled available`);
    }
    const lab = section.querySelector(".learning-showcase-copy a");
    assert(new URL(lab.getAttribute("href"), location.href).pathname.endsWith("/lab.html"), "Spotlight links to the Engineering Lab");
    assert(/simulated network traffic/i.test(section.textContent), "Network traffic is described as simulated");

    const roadmap = section.querySelector(".learning-roadmap");
    const planned = [...roadmap.querySelectorAll(".learning-roadmap-list li")];
    assert(/aren’t available yet/i.test(roadmap.textContent), "Roadmap says future material is not available yet");
    assert(planned.length === 2 && planned.every(item => item.querySelector(".learning-planned")?.textContent.trim() === "PLANNED"), "Every future topic is labeled planned");
    assert(["Deeper printer networking", "Cybersecurity learning"].every(title => planned.some(item => item.querySelector("h4")?.textContent === title)), "Roadmap covers the planned learning topics");
    assert(!planned.some(item => /Networking 102/.test(item.textContent)), "Released Networking 102 is no longer listed as planned");
    assert(!roadmap.querySelector("a, button"), "Planned topics do not link to unavailable material");

    const artwork = section.querySelector(".learning-display");
    const gridPath = artwork.querySelector("pattern path");
    assert(artwork.getAttribute("aria-hidden") === "true", "Decorative artwork is hidden from assistive technology");
    assert(getComputedStyle(gridPath).fill === "none" && getComputedStyle(gridPath).stroke !== "none", "Illustration grid renders as lines, not filled triangles");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        assert(getComputedStyle(artwork.querySelector(".learning-route-packet")).animationName === "none", "Decorative packet motion respects reduced-motion preference");
    } else {
        assert(getComputedStyle(artwork.querySelector(".learning-route-packet")).animationName === "learning-packet", "Decorative packet motion runs when motion is allowed");
    }

    const luminance = color => {
        const components = color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const linear = components.map(component => {
            const value = component / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    };
    const contrast = (foreground, background) => {
        const values = [luminance(getComputedStyle(foreground).color), luminance(getComputedStyle(background).backgroundColor)].sort((a, b) => b - a);
        return (values[0] + .05) / (values[1] + .05);
    };
    for (const selector of [".learning-path > p", ".learning-available", ".learning-path-link"]) {
        assert(contrast(studio.querySelector(selector), studio) >= 4.5, `${selector} has readable contrast in the current theme`);
    }
    assert(contrast(section.querySelector(".learning-showcase-copy h2 span"), section.querySelector(".learning-showcase")) >= 4.5, "Spotlight heading has readable contrast in the current theme");
    assert(contrast(roadmap.querySelector(".learning-planned"), roadmap) >= 4.5, "Planned labels have readable contrast in the current theme");

    assert(section.scrollWidth <= section.clientWidth, "Spotlight fits the viewport without horizontal scrolling");
    assert([...section.querySelectorAll("h2, h3, h4, p, a")].every(element => element.scrollWidth <= element.clientWidth + 1), "Spotlight text and links fit their containers");
    const heroLink = document.querySelector(".hero-learning-link");
    assert(heroLink.scrollWidth <= heroLink.clientWidth + 1, "Hero learning link fits its container");
    if (innerWidth >= 375 && innerHeight >= 800) {
        assert(heroLink.getBoundingClientRect().top + scrollY < innerHeight, "Learning announcement appears in the initial viewport on common screens");
    }
    for (const element of section.querySelectorAll(".learning-showcase, .learning-display, .learning-path, .learning-roadmap")) {
        const bounds = element.getBoundingClientRect();
        assert(bounds.left >= -1 && bounds.right <= innerWidth + 1, `${element.className} stays inside the viewport`);
    }
    if (innerWidth > 680) {
        const brand = document.querySelector(".brand").getBoundingClientRect();
        const menu = document.getElementById("nav-menu").getBoundingClientRect();
        const actions = document.querySelector(".nav-actions").getBoundingClientRect();
        assert(brand.right <= menu.left + 1 && menu.right <= actions.left + 1, "Desktop navigation does not overlap its brand or theme control");
        const links = [...document.querySelectorAll("#nav-menu a")].map(link => link.getBoundingClientRect());
        assert(links.every((link, index) => !index || links[index - 1].right <= link.left + 1), "Desktop navigation links do not overlap");
    } else {
        const toggle = document.getElementById("menu-toggle");
        const menu = document.getElementById("nav-menu");
        const wasOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.click();
        assert(toggle.getAttribute("aria-expanded") === String(!wasOpen), "Mobile menu toggle updates its expanded state");
        assert(menu.clientHeight + document.querySelector(".nav").clientHeight <= innerHeight + 1, "Mobile menu fits even short viewports");
        assert(menu.scrollHeight <= menu.clientHeight || ["auto", "scroll"].includes(getComputedStyle(menu).overflowY), "Long mobile menus remain scrollable");
        toggle.click();
        assert(toggle.getAttribute("aria-expanded") === String(wasOpen), "Mobile menu toggle restores its original state");
    }
    return { passed, message: `${passed} homepage learning assertions passed.` };
}
