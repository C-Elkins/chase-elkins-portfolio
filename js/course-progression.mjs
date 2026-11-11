export function newCourseProgress(course) {
    return { course: course.id, version: course.version, readiness: null, modules: {}, final: null, resume: `#${course.id}`, workbenches: {} };
}

export function moduleComplete(progress, id) {
    const result = progress.modules[id];
    return Boolean(result?.practical && result?.score && result.score.correct / result.score.total >= .8);
}

export function eligibility(course, progress, stage) {
    if (stage === "readiness" || stage === "overview") return { allowed: true, reason: "" };
    if (!progress.readiness || progress.readiness.correct / progress.readiness.total < .8) {
        return { allowed: false, reason: "Pass the Networking 101 + 102 readiness test first.", prerequisite: "readiness" };
    }
    const index = course.modules.findIndex(module => module.id === stage);
    const required = stage === "final" ? course.modules : course.modules.slice(0, index);
    if (index < 0 && stage !== "final") throw new RangeError("Unknown course stage.");
    const missing = required.find(module => !moduleComplete(progress, module.id));
    if (missing) return { allowed: false, reason: `Complete the practical challenge and pass the knowledge check for ${missing.title}.`, prerequisite: missing.id };
    return { allowed: true, reason: "" };
}

export function makeAttempt(spec, random = Math.random) {
    const shuffle = values => {
        const result = [...values];
        for (let index = result.length - 1; index > 0; index--) {
            const value = random();
            if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError("Invalid random sample.");
            const swap = Math.floor(value * (index + 1));
            [result[index], result[swap]] = [result[swap], result[index]];
        }
        return result;
    };
    if (!spec || !Array.isArray(spec.bank) || !Array.isArray(spec.blueprint)) throw new TypeError("Invalid assessment specification.");
    if (new Set(spec.bank.map(question => question.id)).size !== spec.bank.length) throw new TypeError("Question IDs must be unique.");
    const selected = spec.blueprint.flatMap(({ topic, count }) => {
        const pool = spec.bank.filter(question => question.topic === topic);
        if (!Number.isInteger(count) || count < 1 || pool.length < count) throw new RangeError(`Insufficient questions for ${topic}.`);
        return shuffle(pool).slice(0, count);
    });
    if (selected.length !== spec.count || new Set(selected.map(question => question.id)).size !== selected.length) throw new RangeError("Invalid assessment blueprint.");
    return shuffle(selected).map(question => {
        if (question.options.length !== 4 || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) throw new TypeError("Invalid question.");
        const order = shuffle([0, 1, 2, 3]);
        return { ...question, options: order.map(index => question.options[index]), answer: order.indexOf(question.answer) };
    });
}

export function gradeAttempt(attempt, answers) {
    if (!Array.isArray(attempt) || !attempt.length || !Array.isArray(answers) || answers.length !== attempt.length) throw new TypeError("Provide one answer slot per question.");
    if (new Set(attempt.map(question => question.id)).size !== attempt.length) throw new TypeError("An attempt cannot contain duplicate question IDs.");
    const missing = [];
    const results = attempt.map((question, index) => {
        const value = answers[index];
        if (value === null || value === undefined) { missing.push(index); return false; }
        if (!Number.isInteger(value) || value < 0 || value >= question.options.length) throw new RangeError("Invalid answer.");
        return value === question.answer;
    });
    const correct = results.filter(Boolean).length;
    return { correct, total: attempt.length, missing, results, complete: !missing.length, passed: !missing.length && correct / attempt.length >= .8 };
}

export function recordAssessment(course, progress, stage, grade) {
    const spec = stage === "readiness" ? course.readiness : stage === "final" ? course.final : course.modules.find(module => module.id === stage)?.assessment;
    if (!spec || !eligibility(course, progress, stage).allowed) throw new RangeError("This assessment is not eligible.");
    if (!grade.complete || grade.total !== spec.count || !Number.isInteger(grade.correct) || grade.correct < 0 || grade.correct > grade.total) throw new TypeError("Invalid completed result.");
    const next = structuredClone(progress);
    const score = { correct: grade.correct, total: grade.total };
    if (stage === "readiness" || stage === "final") {
        if (!next[stage] || score.correct > next[stage].correct) next[stage] = score;
    } else {
        next.modules[stage] ||= {};
        if (!next.modules[stage].score || score.correct > next.modules[stage].score.correct) next.modules[stage].score = score;
    }
    return next;
}

export function recordPractical(course, progress, id, verification) {
    if (!course.modules.some(module => module.id === id) || !eligibility(course, progress, id).allowed) throw new RangeError("This practical is not eligible.");
    if (!verification?.passed || !verification.checks?.length || verification.checks.some(check => !check.ok)) throw new TypeError("A successful practical verification is required.");
    const next = structuredClone(progress);
    next.modules[id] ||= {};
    next.modules[id].practical = true;
    return next;
}

export function courseComplete(course, progress) {
    return eligibility(course, progress, "final").allowed && Boolean(progress.final && progress.final.correct / progress.final.total >= .8);
}

export function validateCourseProgress(course, value) {
    if (!value || value.course !== course.id || value.version !== course.version) throw new TypeError("Saved course version is unsupported. Your saved record has not been overwritten.");
    const next = newCourseProgress(course);
    const validScore = (score, total) => {
        if (score === null || score === undefined) return null;
        if (score.total !== total || !Number.isInteger(score.correct) || score.correct < 0 || score.correct > total) throw new TypeError("Saved score is invalid.");
        return { correct: score.correct, total };
    };
    next.readiness = validScore(value.readiness, course.readiness.count);
    if (!value.modules || typeof value.modules !== "object" || Array.isArray(value.modules)) throw new TypeError("Saved module record is invalid.");
    for (const id of Object.keys(value.modules)) if (!course.modules.some(module => module.id === id)) throw new TypeError("Saved module is unknown.");
    for (const module of course.modules) {
        const saved = value.modules[module.id];
        if (!saved) continue;
        if (!eligibility(course, next, module.id).allowed) throw new TypeError("Saved progress has inconsistent prerequisites.");
        if (saved.practical !== undefined && typeof saved.practical !== "boolean") throw new TypeError("Saved practical result is invalid.");
        next.modules[module.id] = { practical: saved.practical === true, score: validScore(saved.score, module.assessment.count) };
    }
    next.final = validScore(value.final, course.final.count);
    if (next.final && !eligibility(course, next, "final").allowed) throw new TypeError("Saved final result lacks its prerequisites.");
    const routes = new Set([`#${course.id}`, "#applied-readiness", "#applied-final", "#applied-review", ...course.modules.flatMap(module => [`#applied-${module.id}`, ...module.lessons.map(lesson => `#${lesson.id}`)])]);
    if (value.resume !== undefined && !routes.has(value.resume)) throw new TypeError("Saved resume location is invalid.");
    next.resume = value.resume || next.resume;
    if (value.workbenches !== undefined && (!value.workbenches || typeof value.workbenches !== "object" || Array.isArray(value.workbenches))) throw new TypeError("Saved workbench record is invalid.");
    next.workbenches = value.workbenches || {};
    for (const id of Object.keys(next.workbenches)) {
        if (!course.modules.some(module => module.id === id) || !eligibility(course, next, id).allowed) throw new TypeError("Saved workbench lacks its prerequisites.");
    }
    return next;
}
