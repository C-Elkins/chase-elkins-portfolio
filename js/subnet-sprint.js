import { difficulties, createRng, generateProblem, checkAnswer } from "./subnet-sprint-model.mjs";

const SPRINT_SECONDS = 90;

export function initializeSubnetSprint() {
    const $ = id => document.getElementById(id);
    const make = (tag, text, className) => {
        const element = document.createElement(tag);
        if (text !== undefined) element.textContent = text;
        if (className) element.className = className;
        return element;
    };
    const board = $("sprint-board");
    const answer = $("sprint-answer");
    const seed = () => {
        const values = new Uint32Array(1);
        globalThis.crypto?.getRandomValues ? crypto.getRandomValues(values) : values.fill(Date.now() >>> 0);
        return values[0];
    };
    let rng = createRng(seed());
    let problem = null;
    let puzzle = 0;
    let revealed = false;
    let solved = false;
    let missed = false;
    let score = { solved: 0, checks: 0, correct: 0, streak: 0, best: 0 };
    let session = "idle";
    let remaining = SPRINT_SECONDS * 1000;
    let deadline = 0;
    let timer = 0;

    const selected = name => document.querySelector(`input[name="${name}"]:checked`).value;
    const mode = () => selected("sprint-mode");
    const difficulty = () => selected("sprint-difficulty");
    const formatTime = ms => {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    };
    const feedback = (text, tone = "") => {
        $("sprint-feedback").textContent = text;
        $("sprint-feedback").className = `status sprint-feedback ${tone}`.trim();
    };

    function renderScore() {
        $("sprint-solved").textContent = String(score.solved);
        $("sprint-streak").textContent = String(score.streak);
        $("sprint-best").textContent = String(score.best);
        $("sprint-accuracy").textContent = score.checks ? `${Math.round((score.correct / score.checks) * 100)}%` : "—";
    }

    function renderClock() {
        const showClock = mode() === "sprint" && session !== "idle";
        $("sprint-clock").hidden = !showClock;
        $("sprint-time").textContent = formatTime(remaining);
        $("sprint-progress").value = Math.max(0, remaining / 1000);
        $("sprint-progress").textContent = `${Math.ceil(remaining / 1000)} seconds`;
        $("sprint-pause").textContent = session === "paused" ? "Resume" : "Pause";
        $("sprint-pause").disabled = session !== "running" && session !== "paused";
        $("sprint-clock").classList.toggle("is-low", session === "running" && remaining <= 15000);
    }

    function syncControls() {
        const live = session === "practice" || session === "running";
        const open = live && problem && !solved && !revealed;
        answer.disabled = !open || problem?.answerKind === "choice";
        $("sprint-check").disabled = !open;
        $("sprint-choices").querySelectorAll("button").forEach(button => { button.disabled = !open; });
        $("sprint-hint").disabled = !open || !$("sprint-hint-text").hidden;
        $("sprint-reveal").disabled = !live || !problem || revealed || solved;
        $("sprint-next").disabled = !live || !problem;
        const timed = session === "running" || session === "paused";
        document.querySelectorAll("#sprint-difficulty input, #sprint-mode input").forEach(input => { input.disabled = timed; });
        $("sprint-start").textContent = timed ? "End sprint" : session === "idle" || session === "finished"
            ? (mode() === "sprint" ? (session === "finished" ? "Start another sprint" : "Start 90-second sprint") : "Start practice")
            : "Restart practice";
        board.dataset.state = session;
        renderClock();
    }

    function renderGiven() {
        $("sprint-given").replaceChildren(...problem.given.map(([label, value]) => {
            const chip = make("span", undefined, "sprint-chip");
            chip.append(make("small", label), make("code", value));
            return chip;
        }));
    }

    function renderChoices() {
        const choices = $("sprint-choices");
        choices.hidden = problem.answerKind !== "choice";
        $("sprint-answer-label").hidden = problem.answerKind === "choice";
        answer.closest(".sprint-entry").hidden = problem.answerKind === "choice";
        choices.replaceChildren(...(problem.choices || []).map(choice => {
            const button = make("button", choice);
            button.type = "button";
            button.dataset.choice = choice;
            button.addEventListener("click", () => submit(choice));
            return button;
        }));
    }

    function renderSolution() {
        const bits = $("sprint-bits");
        bits.replaceChildren(...(problem.bits || []).map(row => {
            const line = make("div", undefined, "bit-row");
            const octets = row.bits.match(/.{8}/g);
            const label = make("span", row.label, "bit-label");
            const value = make("code", row.value, "bit-value");
            const grid = make("span", undefined, "bit-octets");
            grid.setAttribute("role", "img");
            grid.setAttribute("aria-label", `${row.label} ${row.value} in binary: ${octets.join(".")}`);
            octets.forEach((octet, octetIndex) => {
                const group = make("span", undefined, "bit-octet");
                [...octet].forEach((bit, bitIndex) => {
                    const position = octetIndex * 8 + bitIndex;
                    group.append(make("span", bit, `bit ${position < problem.prefix ? "net" : "host"}${bit === "1" ? " on" : ""}`));
                });
                grid.append(group);
            });
            line.append(label, value, grid);
            return line;
        }));
        $("sprint-bit-legend").hidden = !problem.bits?.length;
        $("sprint-steps").replaceChildren(...problem.steps.map(step => make("li", step)));
        $("sprint-solution").hidden = false;
    }

    function nextPuzzle(focus = true) {
        problem = generateProblem(rng, difficulty());
        puzzle++;
        revealed = false;
        solved = false;
        missed = false;
        $("sprint-type").textContent = `${difficulties[problem.difficulty].label} / ${problem.label}`;
        board.dataset.type = problem.type;
        $("sprint-count").textContent = `Puzzle ${puzzle}`;
        $("sprint-prompt").textContent = problem.prompt;
        renderGiven();
        renderChoices();
        answer.value = "";
        answer.removeAttribute("aria-invalid");
        answer.inputMode = problem.answerKind === "number" || problem.answerKind === "prefix" ? "numeric" : "decimal";
        answer.placeholder = { ipv4: "e.g. 192.168.1.64", prefix: "e.g. /26", number: "e.g. 62" }[problem.answerKind] || "";
        $("sprint-answer-label").textContent = { ipv4: "Your answer / dotted-decimal IPv4", prefix: "Your answer / prefix length", number: "Your answer / whole number" }[problem.answerKind] || "Your answer";
        $("sprint-hint-text").hidden = true;
        $("sprint-solution").hidden = true;
        feedback("");
        syncControls();
        if (focus) (problem.answerKind === "choice" ? $("sprint-choices").querySelector("button") : answer).focus({ preventScroll: true });
    }

    function submit(raw) {
        if (!problem || solved || revealed || !(session === "practice" || session === "running")) return;
        const result = checkAnswer(problem, raw);
        if (result.status === "invalid") {
            answer.setAttribute("aria-invalid", "true");
            feedback(result.message, "error");
            return;
        }
        answer.removeAttribute("aria-invalid");
        score.checks++;
        if (result.status === "correct") {
            score.correct++;
            score.solved++;
            solved = true;
            score.streak = missed ? 0 : score.streak + 1;
            if (!missed) score.best = Math.max(score.best, score.streak);
            feedback(missed ? `✓ Correct: ${problem.answer}. Fixed on a retry, so the streak restarts next puzzle.` : `✓ Correct: ${problem.answer}. Streak ${score.streak}.`, "success");
            renderSolution();
            renderScore();
            syncControls();
            $("sprint-next").focus({ preventScroll: true });
            return;
        }
        missed = true;
        score.streak = 0;
        feedback(`✗ ${result.given} is not it. Try again, take a hint or show the solution.`, "error");
        renderScore();
        syncControls();
        if (problem.answerKind !== "choice") answer.select();
    }

    function tick() {
        remaining = Math.max(0, deadline - performance.now());
        renderClock();
        if (remaining <= 0) finishSprint();
    }

    function startTimer() {
        clearInterval(timer);
        deadline = performance.now() + remaining;
        timer = setInterval(tick, 200);
    }

    function stopTimer() {
        if (session === "running") remaining = Math.max(0, deadline - performance.now());
        clearInterval(timer);
        timer = 0;
    }

    function finishSprint() {
        stopTimer();
        remaining = 0;
        session = "finished";
        const accuracy = score.checks ? Math.round((score.correct / score.checks) * 100) : 0;
        const summary = $("sprint-summary");
        summary.replaceChildren(
            make("strong", `Sprint complete: ${score.solved} solved`),
            make("span", `${accuracy}% accuracy · best streak ${score.best} · ${difficulties[difficulty()].label} difficulty`),
            make("span", score.solved >= 10 ? "Excellent pace. Try the next difficulty up." : score.solved >= 5 ? "Solid. Review any revealed solutions, then go again." : "Use Practice mode and the worked solutions to build speed, then sprint again.")
        );
        summary.hidden = false;
        feedback("Time is up.", "");
        syncControls();
        $("sprint-start").focus({ preventScroll: true });
    }

    function start() {
        if (session === "running" || session === "paused") {
            finishSprint();
            return;
        }
        stopTimer();
        rng = createRng(seed());
        puzzle = 0;
        score = { solved: 0, checks: 0, correct: 0, streak: 0, best: 0 };
        $("sprint-summary").hidden = true;
        remaining = SPRINT_SECONDS * 1000;
        session = mode() === "sprint" ? "running" : "practice";
        renderScore();
        nextPuzzle();
        if (session === "running") startTimer();
        syncControls();
    }

    function pause(reason = "Sprint paused.") {
        if (session !== "running") return;
        stopTimer();
        session = "paused";
        feedback(`${reason} The puzzle is hidden until you resume.`);
        syncControls();
    }

    function resume() {
        if (session !== "paused") return;
        session = "running";
        feedback("");
        startTimer();
        syncControls();
        if (problem && !solved && !revealed) (problem.answerKind === "choice" ? $("sprint-choices").querySelector("button") : answer).focus({ preventScroll: true });
    }

    $("sprint-form").addEventListener("submit", event => {
        event.preventDefault();
        submit(answer.value);
    });
    answer.addEventListener("input", () => answer.removeAttribute("aria-invalid"));
    $("sprint-start").addEventListener("click", start);
    $("sprint-pause").addEventListener("click", () => session === "paused" ? resume() : pause());
    $("sprint-next").addEventListener("click", () => {
        if (problem && !solved) {
            score.streak = 0;
            renderScore();
        }
        nextPuzzle();
    });
    $("sprint-hint").addEventListener("click", () => {
        $("sprint-hint-text").textContent = `Hint: ${problem.hint}`;
        $("sprint-hint-text").hidden = false;
        syncControls();
        (problem.answerKind === "choice" ? $("sprint-choices").querySelector("button") : answer).focus({ preventScroll: true });
    });
    $("sprint-reveal").addEventListener("click", () => {
        revealed = true;
        score.streak = 0;
        feedback(`Answer: ${problem.answer}. Revealed puzzles don't count as solved.`);
        renderSolution();
        renderScore();
        syncControls();
        $("sprint-next").focus({ preventScroll: true });
    });
    document.querySelectorAll('#sprint-mode input, #sprint-difficulty input').forEach(input => input.addEventListener("change", () => {
        if (input.name === "sprint-mode" && session !== "idle") {
            session = "idle";
            problem = null;
            $("sprint-summary").hidden = true;
            delete board.dataset.type;
            $("sprint-type").textContent = "Ready";
            $("sprint-count").textContent = "No puzzle yet";
            $("sprint-prompt").textContent = mode() === "sprint" ? "Ready for a 90-second sprint? Press Start." : "Practice at your own pace. Press Start.";
            $("sprint-given").replaceChildren();
            $("sprint-choices").replaceChildren();
            $("sprint-hint-text").hidden = true;
            $("sprint-solution").hidden = true;
            feedback("");
        }
        else if (input.name === "sprint-difficulty" && session === "practice") feedback(`Next puzzle uses ${difficulties[difficulty()].label} difficulty.`);
        syncControls();
    }));
    renderScore();
    syncControls();
    return () => pause("Sprint paused when you left.");
}
