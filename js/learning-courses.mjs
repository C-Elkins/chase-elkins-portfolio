import { networkingModules } from "./networking-course.mjs";
import { networkingModules102 } from "./networking-course-102.mjs";
import { printerModules, troubleshootingCases, finalExam } from "./networking-printers.mjs";
import { printerTroubleshooter, troubleshootAnswer } from "./networking-basics-model.mjs";
import { appliedCourse } from "./networking-applied.mjs";
import { advancedCourse } from "./networking-advanced.mjs";
import { createOpenCourseAdapter, openModulePassed } from "./open-course-progress.mjs";
import { newCourseProgress, validateCourseProgress, moduleComplete, courseComplete } from "./course-progression.mjs";
import { restoreWorkbench, saveWorkbench, validateWorkbenchDraft } from "./network-workbench-model.mjs";
import { restoreAdvancedWorkbench, saveAdvancedWorkbench, validateAdvancedDraft } from "./advanced-workbench-model.mjs";

const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const hasOnly = (value, names) => Object.keys(value).every(key => names.includes(key));

function validateBasicsExercises(value) {
    if (!isRecord(value) || !hasOnly(value, ["subnet", "printerTrail"])) throw new TypeError("Saved Networking 101 exercises are invalid.");
    const result = {};
    if (value.subnet !== undefined) {
        const subnet = value.subnet;
        if (!isRecord(subnet) || !hasOnly(subnet, ["a", "b", "prefix"]) ||
            !["a", "b", "prefix"].every(key => typeof subnet[key] === "string" && subnet[key].length <= 15)) {
            throw new TypeError("Saved subnet checker inputs are invalid.");
        }
        result.subnet = { a: subnet.a, b: subnet.b, prefix: subnet.prefix };
    }
    if (value.printerTrail !== undefined) {
        if (!Array.isArray(value.printerTrail) || value.printerTrail.length > 6 || value.printerTrail.some(answer => typeof answer !== "boolean")) {
            throw new TypeError("Saved printer troubleshooting answers are invalid.");
        }
        let current = printerTroubleshooter.start;
        for (const answer of value.printerTrail) {
            const step = current && troubleshootAnswer(current, answer);
            if (!step) throw new TypeError("Saved printer troubleshooting path is invalid.");
            current = step.next || null;
        }
        result.printerTrail = [...value.printerTrail];
    }
    return result;
}

export function createGuidedCourseAdapter(course, { validateWorkbench, validateDraft }) {
    return {
        id: course.id,
        empty: () => newCourseProgress(course),
        validate(value) {
            const progress = validateCourseProgress(course, value);
            for (const [id, saved] of Object.entries(progress.workbenches)) progress.workbenches[id] = validateWorkbench(id, saved);
            for (const [id, saved] of Object.entries(progress.workbenchDrafts)) progress.workbenchDrafts[id] = validateDraft(id, saved);
            return progress;
        }
    };
}

export function createLearningAdapters() {
    const adapters = {
        learn: createOpenCourseAdapter({ id: "learn", modules: networkingModules, validateExercises: validateBasicsExercises }),
        learn102: createOpenCourseAdapter({ id: "learn102", modules: networkingModules102 }),
        learnprint: createOpenCourseAdapter({
            id: "learnprint", modules: printerModules,
            extraAssessments: [
                ...troubleshootingCases.map(item => ({ id: item.id, questions: [item.question] })),
                { id: "final", questions: finalExam }
            ],
            extraLocations: ["learnprint-cases", "learnprint-final", ...troubleshootingCases.map(item => `learnprint-${item.id}`)]
        }),
        "applied-networking": createGuidedCourseAdapter(appliedCourse, {
            validateWorkbench: (id, value) => saveWorkbench(restoreWorkbench(id, value)),
            validateDraft: validateWorkbenchDraft
        }),
        "advanced-networking": createGuidedCourseAdapter(advancedCourse, {
            validateWorkbench: (id, value) => saveAdvancedWorkbench(restoreAdvancedWorkbench(id, value)),
            validateDraft: validateAdvancedDraft
        })
    };
    return adapters;
}

export function foundationRequirements(snapshot) {
    return [
        { id: "learn", title: "Networking 101", modules: networkingModules },
        { id: "learn102", title: "Networking 102", modules: networkingModules102 }
    ].map(group => {
        const progress = snapshot.courses[group.id] || { assessments: {} };
        const modules = group.modules.map(module => ({
            id: module.id, title: module.title, href: `#quiz-${module.id}`, passed: openModulePassed(progress, module)
        }));
        const missing = modules.filter(module => !module.passed);
        return { id: group.id, title: group.title, total: modules.length, passed: modules.length - missing.length, modules, missing };
    });
}

export function appliedRequirements(snapshot) {
    const foundation = foundationRequirements(snapshot);
    const progress = snapshot.courses[appliedCourse.id] || newCourseProgress(appliedCourse);
    const passed = score => Boolean(score && score.correct / score.total >= .8);
    const readiness = { passed: passed(progress.readiness), href: "#applied-readiness", label: "Readiness test · 16/20 required" };
    const modules = appliedCourse.modules.map(module => ({
        id: module.id, title: module.title, complete: moduleComplete(progress, module.id),
        practical: Boolean(progress.modules[module.id]?.practical),
        quiz: passed(progress.modules[module.id]?.score),
        practicalHref: `#applied-${module.id}-practical`, quizHref: `#applied-${module.id}-check`
    }));
    const final = { passed: passed(progress.final), href: "#applied-final", label: "Final exam · 24/30 required" };
    return {
        foundation, readiness, modules, final,
        complete: foundation.every(group => !group.missing.length) && courseComplete(appliedCourse, progress)
    };
}

export function guidedEntryRequirement(courseId, snapshot) {
    if (!["applied-networking", "advanced-networking"].includes(courseId)) throw new RangeError("Unknown guided course.");
    const groups = foundationRequirements(snapshot);
    const missing = groups.find(group => group.missing.length);
    if (missing) return {
        allowed: false,
        reason: `Pass every Networking 101 and 102 module quiz (4/5 each). ${missing.title} has ${missing.missing.length} remaining.`,
        target: missing.missing[0].href
    };
    if (courseId === "applied-networking") return { allowed: true, reason: "" };
    const applied = appliedRequirements(snapshot);
    if (!applied.readiness.passed) return { allowed: false, reason: "Pass the Applied Networking readiness test with 16/20.", target: applied.readiness.href };
    const module = applied.modules.find(item => !item.complete);
    if (module) return {
        allowed: false,
        reason: `Finish ${module.title}: ${!module.practical ? "pass the practical" : "pass the knowledge check with 4/5"}.`,
        target: !module.practical ? module.practicalHref : module.quizHref
    };
    if (!applied.final.passed) return { allowed: false, reason: "Pass the Applied Networking final with 24/30.", target: applied.final.href };
    return { allowed: true, reason: "" };
}
