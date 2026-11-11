import { appliedCourse } from "../js/networking-applied.mjs";
import { networkingModules } from "../js/networking-course.mjs";
import { networkingModules102 } from "../js/networking-course-102.mjs";
import { guidedLessons } from "../js/network-guided.mjs";

export function runAppliedContentTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const same = (actual, expected, label) => assert(JSON.stringify(actual) === JSON.stringify(expected), label);
    const substantial = (text, minimum) => typeof text === "string" && text.trim().length >= minimum;
    const normalize = text => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const course = appliedCourse;
    const moduleIds = ["baseline", "addressing", "segmentation", "services", "transport", "wireless", "vpn", "capstone"];
    const readinessTopics = ["addressing", "routing", "switching", "services", "transport", "wireless", "security", "ipv6", "performance", "troubleshooting"];
    const referenceCourses = [...networkingModules, ...networkingModules102];
    const referenceAnchors = new Set(referenceCourses.flatMap(module => module.chapters.map(chapter => `#${chapter}`)));
    const oldPrompts = new Set(referenceCourses.flatMap(module => module.questions.map(item => normalize(item.prompt))));
    const oldTeaching = new Set(referenceCourses.flatMap(module => [
        module.intro, ...(module.lessons ?? []).flat(), ...(module.concepts ?? []).flat(), ...(module.practice ?? [])
    ]).filter(text => typeof text === "string").map(normalize));
    const lessons = course.modules.flatMap(module => module.lessons);
    const appliedAnchors = new Set(lessons.map(item => `#${item.id}`));
    const questionIds = new Set(), prompts = new Set(), explanations = new Set();
    const answerPositions = [0, 0, 0, 0];
    const questionKeys = ["answer", "explanation", "id", "objective", "options", "prompt", "study", "topic"].sort();

    same(course.id, "applied-networking", "Stable course identifier");
    same(course.version, 1, "Versioned original course");
    same(course.title, "Applied Networking: From Theory to Troubleshooting", "Approved title");
    assert(substantial(course.description, 250), "Overview states scope and course rules");
    same(course.modules.map(module => module.id), moduleIds, "Eight modules in approved prerequisite order");
    same(lessons.length, 24, "Twenty-four hosted lessons");
    same(appliedAnchors.size, 24, "Lesson anchors are unique");

    const validateFigure = (spec, label) => {
        assert(["bars", "graph", "line", "stack"].includes(spec.type), `${label}: supported buildFigure renderer`);
        assert(substantial(spec.title, 15) && substantial(spec.desc, 100) && substantial(spec.caption, 80), `${label}: accessible title, nonvisual description and explanatory caption`);
        if (spec.type === "bars") {
            assert(Array.isArray(spec.items) && spec.items.length >= 3, `${label}: meaningful bar comparison`);
            assert(spec.items.every(item => substantial(item.label, 3) && Number.isFinite(item.value) && item.value >= 0 && substantial(item.display, 3)), `${label}: labeled finite bar data and units`);
            assert(Number.isFinite(spec.max) && spec.max > 0 && spec.items.every(item => item.value <= spec.max), `${label}: valid bar scale`);
        }
        if (spec.type === "graph") {
            const ids = new Set(spec.nodes.map(node => node.id));
            assert(ids.size === spec.nodes.length && ids.size >= 3, `${label}: unique graph nodes`);
            assert(spec.nodes.every(node => substantial(node.label, 2) && Number.isFinite(node.x) && Number.isFinite(node.y)), `${label}: labeled positioned graph nodes`);
            assert(spec.edges.length >= 2 && spec.edges.every(edge => ids.has(edge.from) && ids.has(edge.to) && edge.from !== edge.to && substantial(edge.label, 3)), `${label}: meaningful graph edges reference real nodes`);
        }
        if (spec.type === "line") {
            for (const axis of [spec.x, spec.y]) {
                assert(Number.isFinite(axis.max) && axis.max > (axis.min ?? 0) && axis.ticks.length >= 2 && substantial(axis.label, 3), `${label}: valid labeled line scale`);
            }
            assert(spec.series.length > 0 && spec.series.every(series => series.points.length >= 2 && series.points.every(point => point.length === 2 && point.every(Number.isFinite))), `${label}: finite line samples`);
        }
        if (spec.type === "stack") {
            assert(spec.rows.length > 0 && spec.rows.every(row => row.segments.length > 0 && row.segments.every(segment => substantial(segment.label, 3) && Number.isFinite(segment.value) && segment.value > 0)), `${label}: labeled positive stack data`);
        }
    };

    const validateAssessment = (assessment, expectedTopics, bankCounts, attemptCounts, expectedCount, allowedAnchors, label) => {
        same(assessment.count, expectedCount, `${label}: attempt count`);
        same(assessment.blueprint.map(item => item.topic), expectedTopics, `${label}: blueprint topics and order`);
        same(assessment.blueprint.map(item => item.count), attemptCounts, `${label}: exact topic allocation per attempt`);
        same(assessment.blueprint.reduce((sum, item) => sum + item.count, 0), expectedCount, `${label}: blueprint sums to attempt count`);
        same(assessment.bank.length, bankCounts.reduce((sum, count) => sum + count, 0), `${label}: bank size`);
        same(expectedTopics.map(topic => assessment.bank.filter(item => item.topic === topic).length), bankCounts, `${label}: exact topic allocation in bank`);
        const localAnswers = [0, 0, 0, 0];
        for (const item of assessment.bank) {
            same(Object.keys(item).sort(), questionKeys, `${item.id}: exact question schema`);
            assert(typeof item.id === "string" && !questionIds.has(item.id), `${item.id}: globally unique question ID`);
            questionIds.add(item.id);
            assert(substantial(item.prompt, 50) && !prompts.has(normalize(item.prompt)), `${item.id}: substantive globally unique prompt`);
            assert(!oldPrompts.has(normalize(item.prompt)), `${item.id}: does not copy a 101/102 question`);
            prompts.add(normalize(item.prompt));
            assert(substantial(item.explanation, 90) && !explanations.has(normalize(item.explanation)), `${item.id}: unique worked explanation`);
            explanations.add(normalize(item.explanation));
            assert(!/\b(?:TODO|TBD|placeholder|lorem ipsum)\b/i.test(`${item.prompt} ${item.explanation}`), `${item.id}: no unfinished assessment prose`);
            assert(Array.isArray(item.options) && item.options.length === 4 && item.options.every(option => substantial(option, 2)), `${item.id}: four authored options`);
            assert(new Set(item.options.map(normalize)).size === 4, `${item.id}: four distinct options`);
            assert(Number.isInteger(item.answer) && item.answer >= 0 && item.answer <= 3, `${item.id}: valid correct-option index`);
            assert(substantial(item.objective, 25), `${item.id}: explicit learning objective`);
            assert(expectedTopics.includes(item.topic), `${item.id}: known assessment topic`);
            assert(allowedAnchors.has(item.study), `${item.id}: exact hosted study anchor`);
            if (label === "Final") assert(item.study.startsWith(`#applied-${item.topic}-`), `${item.id}: transfer item studies the corresponding module`);
            if (label.startsWith("Module")) same(item.study, `#${item.topic}`, `${item.id}: module item studies its exact lesson topic`);
            answerPositions[item.answer]++;
            localAnswers[item.answer]++;
        }
        assert(Math.max(...localAnswers) - Math.min(...localAnswers) <= 1, `${label}: balanced correct-answer positions`);
        for (const item of assessment.blueprint) {
            assert(assessment.bank.filter(question => question.topic === item.topic).length >= item.count, `${label}: topic can supply its complete attempt allocation`);
        }
    };

    for (const module of course.modules) {
        assert(substantial(module.title, 10) && substantial(module.summary, 75), `${module.id}: substantive module framing`);
        assert(module.goals.length === 3 && module.goals.every(goal => substantial(goal, 40)), `${module.id}: three assessable goals`);
        same(module.lessons.map(item => item.id), [1, 2, 3].map(number => `applied-${module.id}-${number}`), `${module.id}: exact lesson anchor contract`);
        assert(substantial(module.challenge.brief, 150), `${module.id}: realistic practical brief`);
        assert(module.challenge.hints.length === 3 && module.challenge.hints.every(hint => substantial(hint, 65)), `${module.id}: three progressive concrete hints`);
        assert(module.lessons.some(item => item.figures.length > 0), `${module.id}: at least one original accessible figure`);
        for (const item of module.lessons) {
            assert(substantial(item.title, 12) && substantial(item.intro, 120), `${item.id}: lesson framing`);
            assert(item.sections.length >= 2 && item.sections.every(part => substantial(part.heading, 12) && substantial(part.text, 350)), `${item.id}: two substantive worked teaching sections`);
            assert(item.sections.every(part => !oldTeaching.has(normalize(part.text))), `${item.id}: original applied teaching, not copied reference prose`);
            const teachingWords = [item.intro, ...item.sections.map(part => part.text), item.example.text, item.misconception, item.reflection.answer].join(" ").split(/\s+/).length;
            assert(teachingWords >= 220, `${item.id}: useful study depth (${teachingWords} words)`);
            assert(substantial(item.example.title, 10) && substantial(item.example.text, 180), `${item.id}: realistic worked example`);
            assert(substantial(item.misconception, 65), `${item.id}: important limitation or misconception`);
            assert(substantial(item.reflection.prompt, 30) && substantial(item.reflection.answer, 100), `${item.id}: check-your-reasoning with worked answer`);
            assert(item.studio.length >= 1 && item.studio.every(link => guidedLessons[link.id] && substantial(link.label, 15) && substantial(link.instruction, 130)), `${item.id}: concrete assignments name valid guided Studio lessons`);
            assert(item.review.length >= 1 && item.review.every(link => referenceAnchors.has(link.href) && substantial(link.label, 15)), `${item.id}: exact existing 101/102 review links`);
            item.figures.forEach((figure, index) => validateFigure(figure, `${item.id} figure ${index + 1}`));
        }
        validateAssessment(module.assessment, module.lessons.map(item => item.id), [4, 3, 3], [2, 2, 1], 5, appliedAnchors, `Module ${module.id}`);
    }

    validateAssessment(course.readiness, readinessTopics, readinessTopics.map(() => 4), readinessTopics.map(() => 2), 20, referenceAnchors, "Readiness");
    validateAssessment(course.final, moduleIds, [8, 8, 8, 8, 7, 7, 7, 7], [4, 4, 4, 4, 4, 4, 3, 3], 30, appliedAnchors, "Final");
    same(questionIds.size, 180, "Exactly 180 original questions: 40 readiness, 80 module, 60 final");
    same(prompts.size, 180, "All 180 prompts are unique across assessment types");
    same(explanations.size, 180, "All 180 explanations are unique");
    same(answerPositions, [45, 45, 45, 45], "Correct answers exactly balanced across the complete course");

    const prose = lessons.map(item => [item.intro, ...item.sections.map(part => part.text), item.example.text, item.misconception, item.reflection.answer].join(" ")).join(" ");
    for (const command of ["ipconfig /all", "ipconfig /renew", "ipconfig /flushdns", "route print", "ping", "nslookup", "tracert", "Test-NetConnection", "show ip route", "show vlan brief", "show interfaces trunk", "show access-lists", "ping -f -l"]) {
        assert(prose.includes(command), `Supported command is taught: ${command}`);
    }
    assert(prose.includes("teaching-device dialect") && prose.includes("not Windows"), "Device and Windows command contexts distinguished");
    assert(prose.includes("bypassing the operating-system answer cache") && prose.includes("Named ping and Test-NetConnection use the modeled"), "Direct DNS queries distinguished from OS-cached application resolution");
    assert(prose.includes("Test-NetConnection itself checks TCP only") && prose.includes("separately labels a teaching TLS/application follow-up"), "Command behavior distinguished from the teaching TLS/application follow-up");
    assert(prose.includes("cache flushing is not required") && prose.includes("lease renewal"), "DNS-option repair teaches renewal without unnecessary cache flush");
    assert(prose.includes("initial pool .100–.150 includes .120") && prose.includes("such as .160"), "Addressing teaches static conflict and equivalent alternatives");
    assert(prose.includes("MTU minus 40") && prose.includes("1372 + 28 = 1400") && prose.includes("1373 creates 1401"), "Exact MTU/MSS/ICMP boundary arithmetic is hosted");
    assert(prose.includes("channel 1 or 11 and 20 MHz") && prose.includes("simplified"), "Equivalent wireless repairs and model limitations taught");
    assert(prose.includes("192.168.10.25/24") && prose.includes("192.168.20.40") && prose.includes("192.168.30.25"), "Recurring scenario addresses are hosted");

    const plainData = value => {
        if (value === null || typeof value !== "object") return ["string", "number", "boolean"].includes(typeof value) || value === null;
        if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) return false;
        return Object.values(value).every(plainData);
    };
    assert(plainData(course), "Export contains serializable plain data only, no functions or DOM nodes");
    const roundTrip = JSON.parse(JSON.stringify(course));
    same(roundTrip, course, "Course survives JSON persistence without dropping content");
    return `Applied content tests passed: ${passed} assertions; 8 modules, 24 lessons, 180 unique questions, 8 accessible figures.`;
}
