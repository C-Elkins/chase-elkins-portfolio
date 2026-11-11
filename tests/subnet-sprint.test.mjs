import { parseIPv4, formatIPv4, prefixToMask, maskToPrefix, usableHosts, subnetFacts, sameChoices } from "../js/subnet-sprint-model.mjs";

export async function runSubnetSprintTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const board = $("sprint-board");
    const answer = $("sprint-answer");
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        await settle();
    };
    const choose = async (name, value) => {
        const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
        input.click();
        await settle();
    };
    const given = () => Object.fromEntries([...$("sprint-given").querySelectorAll(".sprint-chip")].map(chip => [chip.querySelector("small").textContent, chip.querySelector("code").textContent]));
    const prefixOf = text => Number(text.replace("/", ""));
    const solve = () => {
        const facts = given();
        const type = board.dataset.type;
        if (type === "mask") return formatIPv4(prefixToMask(prefixOf(facts.Prefix)));
        if (type === "prefix") return `/${maskToPrefix(parseIPv4(facts.Mask))}`;
        if (type === "hosts") return String(usableHosts(prefixOf(facts.Prefix)));
        if (type === "wildcard") return formatIPv4(subnetFacts(0, prefixOf(facts.Prefix)).wildcard);
        if (type === "fit") {
            const needed = Number(facts["Hosts needed"].replace(/,/g, ""));
            let hostBits = 2;
            while (2 ** hostBits < needed + 2) hostBits++;
            return `/${32 - hostBits}`;
        }
        if (type === "same") {
            const prefix = prefixOf(facts.Prefix);
            return subnetFacts(parseIPv4(facts["Device A"]), prefix).network === subnetFacts(parseIPv4(facts["Device B"]), prefix).network ? sameChoices[0] : sameChoices[1];
        }
        const [ip, prefix] = facts.Host.split("/");
        return formatIPv4(subnetFacts(parseIPv4(ip), Number(prefix))[type]);
    };
    const wrongFor = correct => correct === sameChoices[0] ? sameChoices[1] : correct === sameChoices[1] ? sameChoices[0] : correct.startsWith("/") ? `/${prefixOf(correct) === 30 ? 29 : prefixOf(correct) + 1}` : /^\d+$/.test(correct) ? String(Number(correct) + 1) : correct === "0.0.0.0" ? "0.0.0.1" : "0.0.0.0";
    const submit = async value => {
        if (board.dataset.type === "same") $("sprint-choices").querySelector(`[data-choice="${value}"]`).click();
        else {
            answer.value = value;
            $("sprint-form").requestSubmit();
        }
        await settle();
    };
    const number = id => Number($(id).textContent);
    const visible = element => getComputedStyle(element).display !== "none" && !element.closest("[hidden]");
    const originalHash = location.hash;
    try {
        await go("#subnet");
        assert(!$("subnet").hidden && $("lab-current-title").textContent === "Subnet sprint", "Subnet sprint opens from the lab menu route");
        if ($("sprint-start").textContent.includes("End")) $("sprint-start").click();
        await choose("sprint-mode", "practice");
        await choose("sprint-difficulty", "expert");
        assert(answer.disabled && $("sprint-check").disabled, "Answer stays locked until a puzzle starts");
        $("sprint-start").click();
        await settle();
        assert(board.dataset.state === "practice" && board.dataset.type, "Practice starts with a typed puzzle");
        assert($("sprint-prompt").textContent.length > 20 && $("sprint-count").textContent === "Puzzle 1", "Prompt and counter render");
        assert($("sprint-clock").hidden, "Practice mode has no clock");
        assert($("sprint-start").textContent === "Restart practice", "Start becomes restart in practice");

        while (board.dataset.type === "same") { $("sprint-next").click(); await settle(); }
        answer.value = "not an answer";
        $("sprint-form").requestSubmit();
        await settle();
        assert(answer.getAttribute("aria-invalid") === "true" && $("sprint-feedback").classList.contains("error"), "Invalid input is flagged");
        assert($("sprint-accuracy").textContent === "—", "Invalid input is not counted as an attempt");
        const correct = solve();
        await submit(wrongFor(correct));
        assert($("sprint-feedback").textContent.includes("is not it") && number("sprint-streak") === 0, "Wrong answers explain and reset the streak");
        assert($("sprint-accuracy").textContent === "0%", "Wrong answers count toward accuracy");
        $("sprint-hint").click();
        await settle();
        assert(visible($("sprint-hint-text")) && $("sprint-hint-text").textContent.startsWith("Hint:") && $("sprint-hint").disabled, "Hint reveals once");
        await submit(correct);
        assert($("sprint-feedback").classList.contains("success") && number("sprint-solved") === 1, "Correct answer on retry solves the puzzle");
        assert(number("sprint-streak") === 0 && $("sprint-accuracy").textContent === "50%", "Retry does not extend the streak");
        assert(!$("sprint-solution").hidden && $("sprint-steps").children.length >= 2, "Worked solution appears after solving");
        assert(answer.disabled && $("sprint-check").disabled && !$("sprint-next").disabled, "Solved puzzle locks input and offers next");
        assert(document.activeElement === $("sprint-next"), "Focus moves to Next after solving");

        const seen = new Set();
        let bitPuzzles = 0;
        for (let round = 0; round < 40; round++) {
            $("sprint-next").click();
            await settle();
            seen.add(board.dataset.type);
            assert($("sprint-solution").hidden && $("sprint-hint-text").hidden && $("sprint-feedback").textContent === "", `Puzzle ${round + 2} starts clean`);
            if (board.dataset.type === "same") assert(!$("sprint-choices").hidden && $("sprint-choices").children.length === 2 && answer.closest(".sprint-entry").hidden, "Same-subnet puzzles use choice buttons");
            else assert($("sprint-choices").hidden && !answer.disabled && document.activeElement === answer, "Typed puzzles focus the answer field");
            await submit(solve());
            assert($("sprint-feedback").classList.contains("success"), `Solver agrees with ${board.dataset.type} puzzle ${round + 2}: ${$("sprint-prompt").textContent}`);
            const rows = $("sprint-bits").querySelectorAll(".bit-row");
            if (rows.length) {
                bitPuzzles++;
                rows.forEach(row => {
                    const bits = row.querySelectorAll(".bit");
                    assert(bits.length === 32 && row.querySelectorAll(".bit-octet").length === 4, "Every bit row shows 32 bits in four octets");
                    assert(row.querySelector('[role="img"]').getAttribute("aria-label").includes("in binary"), "Bit grids have a text alternative");
                });
            }
        }
        assert(number("sprint-solved") === 41 && number("sprint-streak") === 40 && number("sprint-best") === 40, "Streak and best streak track consecutive solves");
        assert(seen.size >= 6 && bitPuzzles > 10, `Expert mode mixes puzzle types (${[...seen].join(", ")})`);

        $("sprint-next").click();
        await settle();
        const before = number("sprint-solved");
        $("sprint-reveal").click();
        await settle();
        assert($("sprint-feedback").textContent.startsWith("Answer:") && number("sprint-solved") === before && number("sprint-streak") === 0, "Revealing shows the answer without scoring it");
        assert(!$("sprint-solution").hidden && $("sprint-reveal").disabled && $("sprint-check").disabled, "Revealed puzzle locks");
        assert(number("sprint-best") === 40, "Best streak survives a reveal");

        await choose("sprint-mode", "sprint");
        assert(board.dataset.state === "idle" && !board.dataset.type && $("sprint-start").textContent === "Start 90-second sprint", "Switching mode returns to a ready state");
        $("sprint-start").click();
        await settle();
        assert(board.dataset.state === "running" && !$("sprint-clock").hidden && $("sprint-time").textContent === "1:30", "Sprint starts a 90-second clock");
        assert(number("sprint-solved") === 0 && $("sprint-accuracy").textContent === "—", "Each sprint starts a fresh score");
        assert([...document.querySelectorAll("#sprint-mode input, #sprint-difficulty input")].every(input => input.disabled), "Settings lock during a sprint");
        assert($("sprint-start").textContent === "End sprint", "Start becomes End sprint");
        await submit(solve());
        assert(number("sprint-solved") === 1, "Sprint answers score");

        $("sprint-pause").click();
        await settle();
        assert(board.dataset.state === "paused" && $("sprint-pause").textContent === "Resume", "Pause holds the sprint");
        assert(!visible($("sprint-prompt")) && !visible($("sprint-given")) && !visible($("sprint-form")), "Paused sprint hides the puzzle");
        const frozen = $("sprint-time").textContent;
        await wait(1200);
        assert($("sprint-time").textContent === frozen, "Clock does not run while paused");
        $("sprint-pause").click();
        await settle();
        assert(board.dataset.state === "running" && visible($("sprint-prompt")), "Resume shows the puzzle again");

        await go("#firewall");
        await go("#subnet");
        assert(board.dataset.state === "paused" && $("sprint-feedback").textContent.includes("when you left"), "Leaving the lab pauses the sprint");
        $("sprint-pause").click();
        await settle();

        const base = Performance.prototype.now;
        let offset = 76000;
        performance.now = () => base.call(performance) + offset;
        await wait(450);
        assert($("sprint-clock").classList.contains("is-low"), "Final 15 seconds are highlighted");
        offset = 100000;
        await wait(450);
        assert(board.dataset.state === "finished" && !$("sprint-summary").hidden && $("sprint-summary").textContent.includes("Sprint complete"), "Sprint ends when time runs out");
        assert($("sprint-time").textContent === "0:00" && $("sprint-check").disabled && $("sprint-pause").disabled, "Finished sprint locks the board");
        assert([...document.querySelectorAll("#sprint-mode input")].every(input => !input.disabled), "Settings unlock after the sprint");
        assert($("sprint-start").textContent === "Start another sprint", "Offer another sprint");
        delete performance.now;

        $("sprint-start").click();
        await settle();
        $("sprint-start").click();
        await settle();
        assert(board.dataset.state === "finished", "End sprint finishes early");

        assert(document.documentElement.scrollWidth <= innerWidth, `No horizontal overflow at ${innerWidth}px`);
        [...$("subnet").querySelectorAll("button, input, label")].filter(visible).forEach(element => {
            const box = element.getBoundingClientRect();
            assert(box.right <= innerWidth + 1, `${element.id || element.textContent.trim().slice(0, 20)} stays on screen`);
        });
        assert([...$("subnet").querySelectorAll("button")].filter(visible).every(button => button.getBoundingClientRect().height >= 40), "Buttons keep touch-friendly height");
        await choose("sprint-mode", "practice");
        await choose("sprint-difficulty", "core");
    }
    finally {
        if (Object.prototype.hasOwnProperty.call(performance, "now")) delete performance.now;
        history.replaceState(null, "", originalHash || "#network");
        dispatchEvent(new HashChangeEvent("hashchange"));
    }
    return `Subnet sprint UI tests passed: ${passed} assertions.`;
}
