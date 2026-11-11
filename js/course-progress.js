import { newCourseProgress, validateCourseProgress } from "./course-progression.mjs";

export function createCourseStore(course, { storage = () => window.localStorage, validateWorkbench = value => value } = {}) {
    const key = `portfolio-course:${course.id}`;
    let blocked = false;
    let issue = "";
    const fail = error => {
        issue = `${error.message || "Browser storage is unavailable."} Progress is held only for this visit. Reset course to retry local storage; this clears only this course's progress, not the site theme.`;
        blocked = true;
    };
    const load = () => {
        try {
            const raw = storage().getItem(key);
            if (raw === null) return newCourseProgress(course);
            const progress = validateCourseProgress(course, JSON.parse(raw));
            for (const [id, value] of Object.entries(progress.workbenches)) progress.workbenches[id] = validateWorkbench(id, value);
            return progress;
        } catch (error) {
            fail(error instanceof SyntaxError ? new Error("Saved course progress could not be read. The existing record has not been overwritten.") : error);
            return newCourseProgress(course);
        }
    };
    const save = progress => {
        if (blocked) return false;
        try {
            storage().setItem(key, JSON.stringify(progress));
            issue = "";
            return true;
        } catch (error) { fail(error); return false; }
    };
    const reset = () => {
        try {
            storage().removeItem(key);
            blocked = false;
            issue = "";
            return true;
        } catch (error) { fail(error); return false; }
    };
    return { key, load, save, reset, get issue() { return issue; }, get blocked() { return blocked; } };
}
