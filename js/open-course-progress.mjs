import { gradeModule } from "./networking-course.mjs";

const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const hasOnly = (value, names) => Object.keys(value).every(key => names.includes(key));

export function questionSetSignature(questions) {
    const text = JSON.stringify(questions.map(({ prompt, options, answer }) => [prompt, options, answer]));
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

export function emptyAssessment(questions) {
    return {
        signature: questionSetSignature(questions),
        answers: Array(questions.length).fill(null),
        latest: null,
        best: null
    };
}

export function assessmentGrade(questions, answers) {
    return answers ? gradeModule({ questions }, answers) : null;
}

export function recordOpenAttempt(questions, previous, answers) {
    const grade = gradeModule({ questions }, answers);
    if (!grade.complete) throw new TypeError("Answer every question before recording an attempt.");
    const best = assessmentGrade(questions, previous.best);
    return {
        signature: questionSetSignature(questions),
        answers: [...answers],
        latest: [...answers],
        best: !best || grade.correct > best.correct ? [...answers] : [...previous.best]
    };
}

export function createOpenCourseAdapter({ id, modules, extraAssessments = [], extraLocations = [], validateExercises = value => {
    if (Object.keys(value).length) throw new TypeError("Saved exercise state is invalid.");
    return {};
} }) {
    const chapters = new Set(modules.flatMap(module => module.chapters));
    const locations = new Set([...chapters, ...modules.flatMap(module => [`module-${module.id}`, `quiz-${module.id}`]), ...extraLocations]);
    const assessments = new Map([
        ...modules.map(module => [module.id, module.questions]),
        ...extraAssessments.map(item => [item.id, item.questions])
    ]);
    if (assessments.size !== modules.length + extraAssessments.length) throw new TypeError(`Duplicate assessment in ${id}.`);

    const empty = () => ({ version: 1, resume: null, studied: [], assessments: {}, exercises: {} });
    const validate = value => {
        if (!isRecord(value) || value.version !== 1 || !hasOnly(value, ["version", "resume", "studied", "assessments", "exercises"])) {
            throw new TypeError(`Saved ${id} progress has an unsupported format.`);
        }
        if (value.resume !== null && !locations.has(value.resume)) throw new TypeError(`Saved ${id} location is invalid.`);
        if (!Array.isArray(value.studied) || new Set(value.studied).size !== value.studied.length || value.studied.some(chapter => !chapters.has(chapter))) {
            throw new TypeError(`Saved ${id} lesson progress is invalid.`);
        }
        if (!isRecord(value.assessments) || !isRecord(value.exercises)) throw new TypeError(`Saved ${id} course work is invalid.`);
        const checked = {};
        for (const [assessmentId, saved] of Object.entries(value.assessments)) {
            const questions = assessments.get(assessmentId);
            if (!questions || !isRecord(saved) || !hasOnly(saved, ["signature", "answers", "latest", "best"]) ||
                !["signature", "answers", "latest", "best"].every(key => Object.hasOwn(saved, key))) {
                throw new TypeError(`Saved ${id} assessment is invalid.`);
            }
            if (saved.signature !== questionSetSignature(questions)) {
                throw new TypeError(`A saved ${id} assessment no longer matches its questions. Your record has not been overwritten.`);
            }
            const answers = gradeModule({ questions }, saved.answers);
            const latest = saved.latest === null ? null : assessmentGrade(questions, saved.latest);
            const best = saved.best === null ? null : assessmentGrade(questions, saved.best);
            if ((latest && !latest.complete) || (best && !best.complete) || Boolean(latest) !== Boolean(best) || (latest && best.correct < latest.correct)) {
                throw new TypeError(`Saved ${id} assessment results are invalid.`);
            }
            checked[assessmentId] = {
                signature: saved.signature,
                answers: [...saved.answers],
                latest: saved.latest && [...saved.latest],
                best: saved.best && [...saved.best]
            };
            if (!answers || answers.total !== questions.length) throw new TypeError(`Saved ${id} answers are invalid.`);
        }
        const exercises = validateExercises(value.exercises);
        if (!isRecord(exercises)) throw new TypeError(`Saved ${id} exercise state is invalid.`);
        return { version: 1, resume: value.resume, studied: [...value.studied], assessments: checked, exercises };
    };
    return { id, modules, assessments, empty, validate };
}

export function openAssessment(progress, adapter, id) {
    const questions = adapter.assessments.get(id);
    if (!questions) throw new RangeError("Unknown course assessment.");
    return progress.assessments[id] || emptyAssessment(questions);
}

export function openModulePassed(progress, module) {
    const result = progress.assessments[module.id];
    const grade = result && assessmentGrade(module.questions, result.best);
    return Boolean(grade?.complete && grade.correct / grade.total >= .8);
}
