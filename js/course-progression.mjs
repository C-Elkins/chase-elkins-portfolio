export function newCourseProgress(course) {
    return {
        course: course.id, version: course.version, readiness: null, modules: {}, final: null,
        capstone: false, latest: {}, resume: `#${course.id}`, workbenches: {}, studied: [], drafts: {}, workbenchDrafts: {}
    };
}

export function moduleComplete(progress, id) {
    const result = progress.modules[id];
    return Boolean(result?.practical && result?.score && result.score.correct / result.score.total >= .8);
}

export function eligibility(course, progress, stage) {
    if (stage === "overview" || (stage === "readiness" && course.readiness)) return { allowed: true, reason: "" };
    if (course.readiness && (!progress.readiness || progress.readiness.correct / progress.readiness.total < .8)) {
        return { allowed: false, reason: "Pass the Networking 101 + 102 readiness test first.", prerequisite: "readiness" };
    }
    const index = course.modules.findIndex(module => module.id === stage);
    const isCapstone = stage === "capstone" && Boolean(course.capstone);
    const required = stage === "final" || isCapstone ? course.modules : course.modules.slice(0, index);
    if (index < 0 && stage !== "final" && !isCapstone) throw new RangeError("Unknown course stage.");
    const missing = required.find(module => !moduleComplete(progress, module.id));
    if (missing) return { allowed: false, reason: `Complete the practical challenge and pass the knowledge check for ${missing.title}.`, prerequisite: missing.id };
    if (stage === "final" && course.capstone && !progress.capstone) {
        return { allowed: false, reason: "Pass the separate capstone practical before the final.", prerequisite: "capstone" };
    }
    return { allowed: true, reason: "" };
}

function questionSignature(question) {
    const text = JSON.stringify([question.id, question.topic, question.prompt, question.options, question.answer, question.explanation, question.objective, question.study]);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
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
        return { ...question, options: order.map(index => question.options[index]), answer: order.indexOf(question.answer), optionOrder: order, contentSignature: questionSignature(question) };
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

export function saveAssessmentDraft(attempt, answers, submitted = false) {
    const grade = gradeAttempt(attempt, answers);
    if (submitted && !grade.complete) throw new TypeError("An incomplete assessment cannot be submitted.");
    if (attempt.some(question => typeof question.contentSignature !== "string" ||
        !Array.isArray(question.optionOrder) || question.optionOrder.length !== 4 ||
        new Set(question.optionOrder).size !== 4 || question.optionOrder.some(index => !Number.isInteger(index) || index < 0 || index > 3))) {
        throw new TypeError("Assessment question identity is invalid.");
    }
    return {
        questions: attempt.map(question => ({ id: question.id, order: [...question.optionOrder], signature: question.contentSignature })),
        answers: [...answers],
        submitted: Boolean(submitted)
    };
}

export function restoreAssessmentDraft(spec, saved) {
    if (!saved || typeof saved !== "object" || Array.isArray(saved) ||
        Object.keys(saved).some(key => !["questions", "answers", "submitted"].includes(key)) ||
        !Array.isArray(saved.questions) || saved.questions.length !== spec.count ||
        !Array.isArray(saved.answers) || typeof saved.submitted !== "boolean") {
        throw new TypeError("Saved assessment draft is invalid.");
    }
    const bank = new Map(spec.bank.map(question => [question.id, question]));
    const seen = new Set();
    const topics = new Map();
    const attempt = saved.questions.map(item => {
        if (!item || typeof item !== "object" || Array.isArray(item) ||
            Object.keys(item).some(key => !["id", "order", "signature"].includes(key)) ||
            typeof item.id !== "string" || seen.has(item.id) || !Array.isArray(item.order) ||
            item.order.length !== 4 || new Set(item.order).size !== 4 ||
            item.order.some(index => !Number.isInteger(index) || index < 0 || index > 3) ||
            typeof item.signature !== "string") {
            throw new TypeError("Saved assessment question order is invalid.");
        }
        const question = bank.get(item.id);
        if (!question || question.options.length !== 4 || item.signature !== questionSignature(question)) {
            throw new TypeError("A saved assessment no longer matches its questions. Your record has not been overwritten.");
        }
        seen.add(item.id);
        topics.set(question.topic, (topics.get(question.topic) || 0) + 1);
        return {
            ...question,
            options: item.order.map(index => question.options[index]),
            answer: item.order.indexOf(question.answer),
            optionOrder: [...item.order],
            contentSignature: item.signature
        };
    });
    const expected = new Map();
    spec.blueprint.forEach(({ topic, count }) => expected.set(topic, (expected.get(topic) || 0) + count));
    if (topics.size !== expected.size || [...expected].some(([topic, count]) => topics.get(topic) !== count)) {
        throw new TypeError("Saved assessment coverage is invalid.");
    }
    const grade = gradeAttempt(attempt, saved.answers);
    if (saved.submitted && !grade.complete) throw new TypeError("A submitted assessment must be complete.");
    return { attempt, answers: [...saved.answers], grade: saved.submitted ? grade : null };
}

export function recordAssessment(course, progress, stage, grade) {
    const spec = stage === "readiness" ? course.readiness : stage === "final" ? course.final : course.modules.find(module => module.id === stage)?.assessment;
    if (!spec || !eligibility(course, progress, stage).allowed) throw new RangeError("This assessment is not eligible.");
    if (!grade.complete || grade.total !== spec.count || !Number.isInteger(grade.correct) || grade.correct < 0 || grade.correct > grade.total) throw new TypeError("Invalid completed result.");
    const next = structuredClone(progress);
    const score = { correct: grade.correct, total: grade.total };
    next.latest ||= {};
    next.latest[stage] = score;
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

export function recordCapstone(course, progress, verification) {
    if (!course.capstone || !eligibility(course, progress, "capstone").allowed) throw new RangeError("The capstone is not eligible.");
    if (!verification?.passed || !verification.checks?.length || verification.checks.some(check => !check.ok)) throw new TypeError("A successful capstone verification is required.");
    const next = structuredClone(progress);
    next.capstone = true;
    return next;
}

export function courseComplete(course, progress) {
    return eligibility(course, progress, "final").allowed && Boolean(progress.final && progress.final.correct / progress.final.total >= .8);
}

export function validateCourseProgress(course, value) {
    if (!value || value.course !== course.id || value.version !== course.version) throw new TypeError("Saved course version is unsupported. Your saved record has not been overwritten.");
    if (Object.keys(value).some(key => !["course", "version", "readiness", "modules", "final", "capstone", "latest", "resume", "workbenches", "studied", "drafts", "workbenchDrafts"].includes(key))) throw new TypeError("Saved course progress contains an unknown field.");
    const next = newCourseProgress(course);
    const validScore = (score, total) => {
        if (score === null || score === undefined) return null;
        if (score.total !== total || !Number.isInteger(score.correct) || score.correct < 0 || score.correct > total) throw new TypeError("Saved score is invalid.");
        return { correct: score.correct, total };
    };
    if (!course.readiness && value.readiness != null) throw new TypeError("This course has no readiness assessment.");
    next.readiness = course.readiness ? validScore(value.readiness, course.readiness.count) : null;
    if (!value.modules || typeof value.modules !== "object" || Array.isArray(value.modules)) throw new TypeError("Saved module record is invalid.");
    for (const id of Object.keys(value.modules)) if (!course.modules.some(module => module.id === id)) throw new TypeError("Saved module is unknown.");
    for (const module of course.modules) {
        const saved = value.modules[module.id];
        if (saved === undefined) continue;
        if (!saved || typeof saved !== "object" || Array.isArray(saved) || Object.keys(saved).some(key => !["practical", "score"].includes(key))) throw new TypeError("Saved module result is invalid.");
        if (!eligibility(course, next, module.id).allowed) throw new TypeError("Saved progress has inconsistent prerequisites.");
        if (saved.practical !== undefined && typeof saved.practical !== "boolean") throw new TypeError("Saved practical result is invalid.");
        next.modules[module.id] = { practical: saved.practical === true, score: validScore(saved.score, module.assessment.count) };
    }
    if (value.capstone !== undefined && typeof value.capstone !== "boolean") throw new TypeError("Saved capstone result is invalid.");
    if (value.capstone && (!course.capstone || !eligibility(course, next, "capstone").allowed)) throw new TypeError("Saved capstone lacks its prerequisites.");
    next.capstone = value.capstone === true;
    next.final = validScore(value.final, course.final.count);
    if (next.final && !eligibility(course, next, "final").allowed) throw new TypeError("Saved final result lacks its prerequisites.");
    if (value.latest !== undefined && (!value.latest || typeof value.latest !== "object" || Array.isArray(value.latest))) throw new TypeError("Saved latest assessment results are invalid.");
    for (const [stage, score] of Object.entries(value.latest || {})) {
        const module = course.modules.find(item => item.id === stage);
        const spec = stage === "readiness" ? course.readiness : stage === "final" ? course.final : module?.assessment;
        const best = stage === "readiness" || stage === "final" ? next[stage] : next.modules[stage]?.score;
        if (!spec || !best || !eligibility(course, next, stage).allowed) throw new TypeError("Saved latest assessment lacks its prerequisites.");
        const result = validScore(score, spec.count);
        if (!result || result.correct > best.correct) throw new TypeError("Saved latest assessment exceeds the best result.");
        next.latest[stage] = result;
    }
    const prefix = course.routePrefix || "applied";
    const routes = new Set([`#${course.id}`, `#${prefix}-final`, `#${prefix}-review`,
        ...(course.readiness ? [`#${prefix}-readiness`] : []), ...(course.capstone ? [`#${prefix}-capstone`] : []),
        ...course.modules.flatMap(module => [`#${prefix}-${module.id}`, `#${prefix}-${module.id}-practical`, `#${prefix}-${module.id}-check`, ...module.lessons.map(lesson => `#${lesson.id}`)])]);
    if (value.resume !== undefined && !routes.has(value.resume)) throw new TypeError("Saved resume location is invalid.");
    next.resume = value.resume || next.resume;
    if (value.workbenches !== undefined && (!value.workbenches || typeof value.workbenches !== "object" || Array.isArray(value.workbenches))) throw new TypeError("Saved workbench record is invalid.");
    next.workbenches = value.workbenches || {};
    for (const id of Object.keys(next.workbenches)) {
        if ((!course.modules.some(module => module.id === id) && !(course.capstone && id === "capstone")) || !eligibility(course, next, id).allowed) throw new TypeError("Saved workbench lacks its prerequisites.");
    }
    const lessonIds = new Set(course.modules.flatMap(module => module.lessons.map(lesson => lesson.id)));
    if (value.studied !== undefined && (!Array.isArray(value.studied) || new Set(value.studied).size !== value.studied.length || value.studied.some(id => !lessonIds.has(id)))) {
        throw new TypeError("Saved lesson progress is invalid.");
    }
    next.studied = [...(value.studied || [])];
    if (value.drafts !== undefined && (!value.drafts || typeof value.drafts !== "object" || Array.isArray(value.drafts))) throw new TypeError("Saved assessment drafts are invalid.");
    next.drafts = {};
    for (const [stage, draft] of Object.entries(value.drafts || {})) {
        const spec = stage === "readiness" ? course.readiness : stage === "final" ? course.final : course.modules.find(module => module.id === stage)?.assessment;
        if (!spec || !eligibility(course, next, stage).allowed) throw new TypeError("Saved assessment draft lacks its prerequisites.");
        const restored = restoreAssessmentDraft(spec, draft);
        next.drafts[stage] = saveAssessmentDraft(restored.attempt, restored.answers, Boolean(restored.grade));
    }
    if (value.workbenchDrafts !== undefined && (!value.workbenchDrafts || typeof value.workbenchDrafts !== "object" || Array.isArray(value.workbenchDrafts))) {
        throw new TypeError("Saved workbench drafts are invalid.");
    }
    next.workbenchDrafts = value.workbenchDrafts || {};
    for (const id of Object.keys(next.workbenchDrafts)) {
        if ((!course.modules.some(module => module.id === id) && !(course.capstone && id === "capstone")) || !eligibility(course, next, id).allowed) throw new TypeError("Saved workbench draft lacks its prerequisites.");
    }
    return next;
}
