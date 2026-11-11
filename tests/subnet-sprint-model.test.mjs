import { difficulties, typeLabels, sameChoices, createRng, parseIPv4, formatIPv4, prefixToMask, maskToPrefix, parsePrefix, usableHosts, subnetFacts, toBits, toOctetBits, generateProblem, checkAnswer } from "../js/subnet-sprint-model.mjs";

export function runSubnetSprintModelTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };
    const ip = text => {
        const parts = text.split(".").map(Number);
        return ((parts[0] * 16777216) + (parts[1] * 65536) + (parts[2] * 256) + parts[3]);
    };
    const reference = (address, prefix) => {
        const size = 2 ** (32 - prefix);
        const network = Math.floor(address / size) * size;
        return { network, last: network + size - 1, size };
    };

    assert(parseIPv4("192.168.1.64") === ip("192.168.1.64"), "Parses dotted decimal");
    assert(parseIPv4(" 10.0.0.1 ") === ip("10.0.0.1"), "Trims surrounding spaces");
    assert(parseIPv4("255.255.255.255") === 0xffffffff && parseIPv4("0.0.0.0") === 0, "Parses unsigned extremes");
    for (const bad of ["", "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "1.2.3.-4", "1..3.4", "1.2.3.4 ", "a.b.c.d", "1.2.3.4/24", "0x1.2.3.4", "1e2.1.1.1", "１.2.3.4", null, undefined]) {
        if (bad === "1.2.3.4 ") continue;
        assert(parseIPv4(bad) === null, `Rejects ${String(bad)}`);
    }
    assert(formatIPv4(ip("172.31.255.254")) === "172.31.255.254" && formatIPv4(-1) === "255.255.255.255", "Formats unsigned values");
    for (let prefix = 0; prefix <= 32; prefix++) {
        const mask = prefixToMask(prefix);
        assert(toBits(mask) === "1".repeat(prefix) + "0".repeat(32 - prefix), `/${prefix} mask bits`);
        assert(maskToPrefix(mask) === prefix, `/${prefix} round-trips mask`);
        assert(parsePrefix(`/${prefix}`) === prefix && parsePrefix(String(prefix)) === prefix && parsePrefix(formatIPv4(mask)) === prefix, `/${prefix} parses all notations`);
    }
    assert(formatIPv4(prefixToMask(26)) === "255.255.255.192" && formatIPv4(prefixToMask(19)) === "255.255.224.0", "Known masks");
    assert(maskToPrefix(ip("255.0.255.0")) === null && maskToPrefix(ip("255.255.255.1")) === null, "Rejects non-contiguous masks");
    assert(parsePrefix("/33") === null && parsePrefix("255.0.255.0") === null && parsePrefix("abc") === null, "Rejects invalid prefixes");
    let threw = false;
    try { prefixToMask(33); } catch { threw = true; }
    assert(threw, "Out-of-range prefix throws");
    assert(usableHosts(24) === 254 && usableHosts(30) === 2 && usableHosts(31) === 2 && usableHosts(32) === 1 && usableHosts(8) === 16777214, "Usable host counts include /31 and /32 edge cases");
    assert(toOctetBits(ip("192.168.1.64")).join(".") === "11000000.10101000.00000001.01000000", "Binary octets");

    const facts = subnetFacts(ip("192.168.10.77"), 26);
    assert(formatIPv4(facts.network) === "192.168.10.64" && formatIPv4(facts.broadcast) === "192.168.10.127", "/26 network and broadcast");
    assert(formatIPv4(facts.first) === "192.168.10.65" && formatIPv4(facts.last) === "192.168.10.126" && facts.usable === 62, "/26 usable range");
    assert(formatIPv4(facts.wildcard) === "0.0.0.63", "/26 wildcard");
    const p2p = subnetFacts(ip("10.0.0.7"), 31);
    assert(p2p.broadcast === null && formatIPv4(p2p.first) === "10.0.0.6" && formatIPv4(p2p.last) === "10.0.0.7" && p2p.usable === 2, "/31 uses both addresses with no broadcast");
    const host = subnetFacts(ip("10.0.0.7"), 32);
    assert(host.broadcast === null && host.first === host.last && formatIPv4(host.first) === "10.0.0.7" && host.usable === 1, "/32 is one host");
    const high = subnetFacts(ip("255.255.255.255"), 24);
    assert(formatIPv4(high.network) === "255.255.255.0" && formatIPv4(high.broadcast) === "255.255.255.255", "Top of address space stays unsigned");

    const first = createRng(42);
    const second = createRng(42);
    assert(Array.from({ length: 20 }, first).join() === Array.from({ length: 20 }, second).join(), "Seeded RNG is deterministic");
    assert(Array.from({ length: 1000 }, createRng(7)).every(value => value >= 0 && value < 1), "RNG stays within [0, 1)");
    assert(JSON.stringify(generateProblem(createRng(9), "core")) === JSON.stringify(generateProblem(createRng(9), "core")), "Same seed builds the same puzzle");

    const seen = {};
    for (const difficulty of Object.keys(difficulties)) {
        seen[difficulty] = new Set();
        const rng = createRng(difficulty.length * 1013);
        for (let index = 0; index < 1500; index++) {
            const problem = generateProblem(rng, difficulty);
            seen[difficulty].add(problem.type);
            const label = `${difficulty} #${index} ${problem.type}: ${problem.prompt}`;
            if (!(problem.type in typeLabels) || problem.label !== typeLabels[problem.type] || !problem.prompt || !problem.hint || problem.steps.length < 1 || problem.steps.some(step => typeof step !== "string" || !step)) throw new Error(`${label} is incomplete`);
            if (problem.steps.some(step => /undefined|NaN|null/.test(step)) || /undefined|NaN|null/.test(problem.prompt + problem.hint)) throw new Error(`${label} has an unformatted value`);
            if (checkAnswer(problem, problem.answer).status !== "correct") throw new Error(`${label} rejects its own answer`);
            if (problem.bits?.some(row => row.bits.length !== 32 || parseIPv4(row.value) === null || toBits(parseIPv4(row.value)) !== row.bits)) throw new Error(`${label} has inconsistent bit rows`);
            const [address, prefix] = /(\d+\.\d+\.\d+\.\d+)\/(\d+)/.exec(problem.prompt)?.slice(1) || [];
            if (address) {
                const truth = reference(ip(address), Number(prefix));
                const p = Number(prefix);
                const expected = {
                    network: truth.network,
                    broadcast: truth.last,
                    first: p >= 31 ? truth.network : truth.network + 1,
                    last: p >= 31 ? truth.last : truth.last - 1
                }[problem.type];
                if (ip(problem.answer) !== expected) throw new Error(`${label} expected ${formatIPv4(expected)} got ${problem.answer}`);
                if (problem.type === "broadcast" && p >= 31) throw new Error(`${label} asks for a broadcast on a point-to-point prefix`);
            }
            if (problem.type === "mask" && maskToPrefix(ip(problem.answer)) !== problem.prefix) throw new Error(`${label} wrong mask`);
            if (problem.type === "prefix" && problem.answer !== `/${maskToPrefix(ip(problem.given[0][1]))}`) throw new Error(`${label} wrong prefix`);
            if (problem.type === "hosts" && Number(problem.answer) !== (problem.prefix >= 31 ? 33 - problem.prefix : 2 ** (32 - problem.prefix) - 2)) throw new Error(`${label} wrong host count`);
            if (problem.type === "wildcard" && (ip(problem.answer) + ip(problem.given[1][1])) !== 0xffffffff) throw new Error(`${label} wrong wildcard`);
            if (problem.type === "same") {
                const [a, b, prefixText] = problem.given.map(entry => entry[1]);
                const size = 2 ** (32 - Number(prefixText.slice(1)));
                const same = Math.floor(ip(a) / size) === Math.floor(ip(b) / size);
                if (a === b || problem.answer !== (same ? sameChoices[0] : sameChoices[1]) || checkAnswer(problem, problem.answer === sameChoices[0] ? sameChoices[1] : sameChoices[0]).status !== "incorrect") throw new Error(`${label} wrong same-subnet verdict`);
            }
            if (problem.type === "fit") {
                const p = Number(problem.answer.slice(1));
                if (!(usableHosts(p) >= problem.needed && usableHosts(p + 1) < problem.needed && p <= 29)) throw new Error(`${label} is not the tightest fit`);
            }
            if (difficulty === "warmup" && ["network"].includes(problem.type) && problem.prefix % 8) throw new Error(`${label} warm-up network should be octet aligned`);
            if (difficulty === "core" && problem.prefix !== undefined && (problem.prefix < 17 || problem.prefix > 30)) throw new Error(`${label} core prefix out of range`);
        }
        passed += 1500;
    }
    assert(["mask", "prefix", "hosts", "network"].every(type => seen.warmup.has(type)) && seen.warmup.size === 4, "Warm-up covers its four puzzle types");
    assert(seen.core.size === 8 && seen.expert.size === 9, "Core and expert cover every assigned puzzle type");
    const edge = Array.from({ length: 4000 }, (_, index) => generateProblem(createRng(index + 1), "expert", "hosts"));
    assert(edge.some(problem => problem.prefix === 31 && problem.answer === "2") && edge.some(problem => problem.prefix === 32 && problem.answer === "1"), "Expert generates /31 and /32 edge cases");
    const sameMix = Array.from({ length: 400 }, (_, index) => generateProblem(createRng(index + 99), "core", "same").answer);
    assert(sameMix.includes(sameChoices[0]) && sameMix.includes(sameChoices[1]), "Same-subnet puzzles include both verdicts");

    const network = generateProblem(createRng(5), "core", "network");
    assert(checkAnswer(network, ` ${network.answer} `).status === "correct", "Answer comparison trims input");
    assert(checkAnswer(network, "").status === "invalid" && checkAnswer(network, "192.168.1").status === "invalid" && checkAnswer(network, "192.168.001.0").status === "invalid", "Malformed IPv4 answers are invalid, not wrong");
    assert(checkAnswer(network, "1.1.1.1").status === "incorrect" && checkAnswer(network, "1.1.1.1").given === "1.1.1.1", "Wrong valid IPv4 is incorrect");
    const prefix = generateProblem(createRng(5), "core", "prefix");
    assert(checkAnswer(prefix, prefix.answer.slice(1)).status === "correct", "Prefix accepts a bare number");
    assert(checkAnswer(prefix, "/33").status === "invalid" && checkAnswer(prefix, "255.255.255.0").status === "invalid", "Prefix rejects out of range and masks");
    const hosts = generateProblem(createRng(5), "warmup", "hosts");
    assert(checkAnswer(hosts, hosts.answer).status === "correct" && checkAnswer(hosts, "1.5").status === "invalid" && checkAnswer(hosts, "-2").status === "invalid", "Number answers require whole numbers");
    const big = generateProblem(createRng(3), "expert", "hosts");
    const withCommas = Number(big.answer).toLocaleString("en-US");
    assert(checkAnswer(big, withCommas).status === "correct", "Thousands separators are accepted");
    assert(checkAnswer(generateProblem(createRng(1), "core", "same"), "Maybe").status === "invalid", "Choices must match an option");
    threw = false;
    try { generateProblem(createRng(1), "legendary"); } catch { threw = true; }
    assert(threw, "Unknown difficulty throws");

    return { passed, message: `${passed} Subnet Sprint model assertions passed.` };
}

if (typeof document === "undefined") console.log(runSubnetSprintModelTests());
