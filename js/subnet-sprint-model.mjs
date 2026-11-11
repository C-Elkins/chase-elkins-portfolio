export const difficulties = {
    warmup: { label: "Warm-up", summary: "Octet-aligned networks, mask conversions and host counts for /24 to /30." },
    core: { label: "Core", summary: "Any prefix from /17 to /30: network, broadcast, usable range and same-subnet checks." },
    expert: { label: "Expert", summary: "Prefixes from /8 to /32, wildcard masks, VLSM sizing and the /31 and /32 edge cases." }
};

const typesByDifficulty = {
    warmup: ["mask", "prefix", "hosts", "network"],
    core: ["network", "broadcast", "first", "last", "hosts", "mask", "prefix", "same"],
    expert: ["network", "broadcast", "first", "last", "hosts", "same", "fit", "wildcard", "prefix"]
};

export const typeLabels = {
    mask: "Prefix → mask",
    prefix: "Mask → prefix",
    hosts: "Usable hosts",
    network: "Network address",
    broadcast: "Broadcast address",
    first: "First usable host",
    last: "Last usable host",
    same: "Same subnet?",
    fit: "VLSM sizing",
    wildcard: "Wildcard mask"
};

export const sameChoices = ["Same subnet", "Different subnets"];

export function createRng(seed) {
    let state = (Number(seed) >>> 0) || 0x9e3779b9;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));

export function parseIPv4(text) {
    const value = String(text ?? "").trim();
    const parts = value.split(".");
    if (parts.length !== 4) return null;
    let result = 0;
    for (const part of parts) {
        if (!/^(0|[1-9]\d{0,2})$/.test(part)) return null;
        const octet = Number(part);
        if (octet > 255) return null;
        result = result * 256 + octet;
    }
    return result >>> 0;
}

export function formatIPv4(value) {
    const number = value >>> 0;
    return [24, 16, 8, 0].map(shift => (number >>> shift) & 255).join(".");
}

export function prefixToMask(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new RangeError("Prefix must be 0 to 32");
    return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export function maskToPrefix(mask) {
    const value = mask >>> 0;
    const inverted = (~value) >>> 0;
    if ((inverted & (inverted + 1)) !== 0) return null;
    let prefix = 0;
    for (let bit = 31; bit >= 0 && (value >>> bit) & 1; bit--) prefix++;
    return prefix;
}

export function parsePrefix(text) {
    const value = String(text ?? "").trim();
    const match = /^\/?(\d{1,2})$/.exec(value);
    if (match) {
        const prefix = Number(match[1]);
        return prefix <= 32 ? prefix : null;
    }
    const mask = parseIPv4(value);
    return mask === null ? null : maskToPrefix(mask);
}

export function usableHosts(prefix) {
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    return 2 ** (32 - prefix) - 2;
}

export function subnetFacts(address, prefix) {
    const mask = prefixToMask(prefix);
    const network = (address & mask) >>> 0;
    const size = 2 ** (32 - prefix);
    const last = (network + size - 1) >>> 0;
    const pointToPoint = prefix >= 31;
    return {
        prefix,
        mask,
        wildcard: (~mask) >>> 0,
        network,
        broadcast: pointToPoint ? null : last,
        first: pointToPoint ? network : (network + 1) >>> 0,
        last: pointToPoint ? last : (last - 1) >>> 0,
        size,
        usable: usableHosts(prefix)
    };
}

export const toBits = value => (value >>> 0).toString(2).padStart(32, "0");
export const toOctetBits = value => toBits(value).match(/.{8}/g);

function interestingOctet(prefix) {
    return Math.min(3, Math.floor(prefix / 8));
}

function blockSize(prefix) {
    const hostBitsInOctet = 8 - (prefix % 8 || 8);
    return prefix % 8 === 0 ? 256 : 2 ** hostBitsInOctet;
}

function randomAddress(rng) {
    const family = pick(rng, ["10", "172", "192"]);
    if (family === "10") return ((10 << 24) | (between(rng, 0, 255) << 16) | (between(rng, 0, 255) << 8) | between(rng, 1, 254)) >>> 0;
    if (family === "172") return ((172 << 24) | (between(rng, 16, 31) << 16) | (between(rng, 0, 255) << 8) | between(rng, 1, 254)) >>> 0;
    return ((192 << 24) | (168 << 16) | (between(rng, 0, 255) << 8) | between(rng, 1, 254)) >>> 0;
}

function prefixFor(rng, difficulty, type) {
    if (difficulty === "warmup") return type === "network" ? pick(rng, [8, 16, 24]) : between(rng, 24, 30);
    if (difficulty === "core") return between(rng, 17, 30);
    if (["broadcast", "same", "wildcard"].includes(type)) return between(rng, 8, 30);
    return between(rng, 8, 32);
}

function bitRows(address, prefix) {
    const facts = subnetFacts(address, prefix);
    return [
        { label: "Address", value: formatIPv4(address), bits: toBits(address) },
        { label: "Mask", value: formatIPv4(facts.mask), bits: toBits(facts.mask) },
        { label: "AND → network", value: formatIPv4(facts.network), bits: toBits(facts.network) },
        { label: "Host bits all 1", value: formatIPv4((facts.network + facts.size - 1) >>> 0), bits: toBits((facts.network + facts.size - 1) >>> 0) }
    ];
}

function maskSteps(prefix) {
    const mask = prefixToMask(prefix);
    const full = Math.floor(prefix / 8);
    const remainder = prefix % 8;
    const steps = [`/${prefix} means ${prefix} network bits set to 1, followed by ${32 - prefix} host bits set to 0.`];
    if (full) steps.push(`${full} full ${full === 1 ? "octet" : "octets"} of eight 1s ${full === 1 ? "is" : "are"} 255.`);
    if (remainder) steps.push(`The next octet has ${remainder} leading 1 ${remainder === 1 ? "bit" : "bits"}: ${"1".repeat(remainder)}${"0".repeat(8 - remainder)} = ${256 - 2 ** (8 - remainder)}.`);
    steps.push(`Mask: ${formatIPv4(mask)}.`);
    return steps;
}

function networkSteps(address, prefix) {
    const facts = subnetFacts(address, prefix);
    const octet = interestingOctet(prefix);
    if (prefix % 8 === 0) {
        return [
            `/${prefix} ends on an octet boundary, so the first ${prefix / 8} ${prefix === 8 ? "octet stays" : "octets stay"} and the rest become 0.`,
            `Network: ${formatIPv4(facts.network)}.`
        ];
    }
    const block = blockSize(prefix);
    const value = (address >>> (24 - octet * 8)) & 255;
    const start = Math.floor(value / block) * block;
    return [
        `The mask is ${formatIPv4(facts.mask)}, so octet ${octet + 1} is the interesting one.`,
        `Block size in that octet: 256 − ${256 - block} = ${block}. Networks start at multiples of ${block}.`,
        `${value} falls in the block ${start}–${start + block - 1}, so that octet becomes ${start}${octet < 3 ? " and every later octet becomes 0" : ""}.`,
        `Network: ${formatIPv4(facts.network)}. In binary this is the address AND the mask.`
    ];
}

function rangeSteps(address, prefix) {
    const facts = subnetFacts(address, prefix);
    const steps = networkSteps(address, prefix).slice(0, -1);
    steps.push(`Network ${formatIPv4(facts.network)} holds ${facts.size.toLocaleString("en-US")} addresses, ending at ${formatIPv4((facts.network + facts.size - 1) >>> 0)} (all host bits set to 1).`);
    if (prefix === 32) steps.push("A /32 is a single host route: the only address is the host itself.");
    else if (prefix === 31) steps.push("A /31 point-to-point link (RFC 3021) has no network or broadcast reservation, so both addresses are usable.");
    else steps.push(`First usable is network + 1: ${formatIPv4(facts.first)}. Broadcast is the last address: ${formatIPv4(facts.broadcast)}. Last usable is broadcast − 1: ${formatIPv4(facts.last)}.`);
    return steps;
}

function hostSteps(prefix) {
    const hostBits = 32 - prefix;
    if (prefix === 32) return ["A /32 has 0 host bits: 2⁰ = 1 address. It identifies exactly one host, often a loopback or host route."];
    if (prefix === 31) return ["A /31 has 1 host bit: 2¹ = 2 addresses.", "On point-to-point links (RFC 3021), both are usable because there is no broadcast on a two-device link."];
    return [
        `Host bits: 32 − ${prefix} = ${hostBits}.`,
        `Total addresses: 2^${hostBits} = ${(2 ** hostBits).toLocaleString("en-US")}.`,
        `Subtract 2 for the network and broadcast addresses: ${usableHosts(prefix).toLocaleString("en-US")} usable hosts.`
    ];
}

function build(type, difficulty, prompt, given, answer, answerKind, hint, steps, extra = {}) {
    return { type, difficulty, label: typeLabels[type], prompt, given, answer, answerKind, hint, steps, ...extra };
}

export function generateProblem(rng, difficulty = "core", forcedType) {
    if (!typesByDifficulty[difficulty]) throw new RangeError(`Unknown difficulty ${difficulty}`);
    const type = forcedType || pick(rng, typesByDifficulty[difficulty]);
    const prefix = prefixFor(rng, difficulty, type);
    const address = randomAddress(rng);
    const facts = subnetFacts(address, prefix);
    const ip = formatIPv4(address);
    const host = `${ip}/${prefix}`;
    switch (type) {
        case "mask":
            return build(type, difficulty, `Convert /${prefix} to a dotted-decimal subnet mask.`, [["Prefix", `/${prefix}`]], formatIPv4(facts.mask), "ipv4",
                "Write the prefix as 1 bits from the left. Each full octet of 1s is 255; a partial octet adds 128, 64, 32, 16, 8, 4, 2, 1 in order.",
                maskSteps(prefix), { bits: [{ label: "Mask", value: formatIPv4(facts.mask), bits: toBits(facts.mask) }], prefix });
        case "prefix":
            return build(type, difficulty, `What prefix length matches the mask ${formatIPv4(facts.mask)}?`, [["Mask", formatIPv4(facts.mask)]], `/${prefix}`, "prefix",
                "Count the 1 bits from the left. 255 is eight 1s; 128 = 1, 192 = 2, 224 = 3, 240 = 4, 248 = 5, 252 = 6, 254 = 7.",
                [...maskSteps(prefix).slice(1, -1), `Total 1 bits: ${prefix}, so the prefix is /${prefix}.`], { bits: [{ label: "Mask", value: formatIPv4(facts.mask), bits: toBits(facts.mask) }], prefix });
        case "hosts":
            return build(type, difficulty, `How many usable host addresses does a /${prefix} subnet provide?`, [["Prefix", `/${prefix}`]], String(facts.usable), "number",
                prefix >= 31 ? "Edge case! Think about what a point-to-point link or a single host route needs." : "Find the host bits (32 − prefix), raise 2 to that power, then remove the network and broadcast addresses.",
                hostSteps(prefix), { prefix });
        case "network":
            return build(type, difficulty, `What is the network address for ${host}?`, [["Host", host]], formatIPv4(facts.network), "ipv4",
                prefix % 8 === 0 ? "On an octet boundary, keep the network octets and zero the rest." : `Find the block size in octet ${interestingOctet(prefix) + 1} and round down to a multiple of it.`,
                networkSteps(address, prefix), { bits: bitRows(address, prefix).slice(0, 3), prefix });
        case "broadcast":
            return build(type, difficulty, `What is the broadcast address for ${host}?`, [["Host", host]], formatIPv4(facts.broadcast), "ipv4",
                "Find the network address, then set every host bit to 1. That is the network plus the block size, minus 1.",
                rangeSteps(address, prefix), { bits: bitRows(address, prefix), prefix });
        case "first":
            return build(type, difficulty, `What is the first usable host address in ${host}?`, [["Host", host]], formatIPv4(facts.first), "ipv4",
                prefix >= 31 ? "Edge case: /31 and /32 do not reserve a network address." : "Find the network address, then add 1.",
                rangeSteps(address, prefix), { bits: bitRows(address, prefix), prefix });
        case "last":
            return build(type, difficulty, `What is the last usable host address in ${host}?`, [["Host", host]], formatIPv4(facts.last), "ipv4",
                prefix >= 31 ? "Edge case: /31 and /32 do not reserve a broadcast address." : "Find the broadcast address (all host bits 1), then subtract 1.",
                rangeSteps(address, prefix), { bits: bitRows(address, prefix), prefix });
        case "wildcard":
            return build(type, difficulty, `What wildcard mask (used by ACLs and OSPF) matches /${prefix}?`, [["Prefix", `/${prefix}`], ["Mask", formatIPv4(facts.mask)]], formatIPv4(facts.wildcard), "ipv4",
                "A wildcard mask is the subnet mask inverted: subtract each mask octet from 255.",
                [`Mask: ${formatIPv4(facts.mask)}.`, `255.255.255.255 − mask = ${formatIPv4(facts.wildcard)}.`, "0 bits mean 'must match'; 1 bits mean 'any value'."],
                { bits: [{ label: "Mask", value: formatIPv4(facts.mask), bits: toBits(facts.mask) }, { label: "Wildcard", value: formatIPv4(facts.wildcard), bits: toBits(facts.wildcard) }], prefix });
        case "same": {
            const size = facts.size;
            const sameSide = rng() < 0.5;
            const neighbor = (facts.network + (rng() < 0.5 && facts.network + size * 2 <= 0xffffffff ? size : -size)) >>> 0;
            const base = sameSide ? facts.network : neighbor;
            const offset = size > 2 ? between(rng, 1, Math.min(size - 2, 65533)) : 0;
            let other = (base + offset) >>> 0;
            if (other === address) other = (base + (offset === 1 ? Math.min(2, size - 1) : 1)) >>> 0;
            const otherFacts = subnetFacts(other, prefix);
            const same = otherFacts.network === facts.network;
            const otherIp = formatIPv4(other);
            return build(type, difficulty, `With a /${prefix} mask, are ${ip} and ${otherIp} on the same subnet?`, [["Device A", ip], ["Device B", otherIp], ["Prefix", `/${prefix}`]],
                same ? sameChoices[0] : sameChoices[1], "choice",
                "Calculate the network address for each device. If the two network addresses match, they share a subnet and can talk without a router.",
                [`Network of A: ${formatIPv4(facts.network)}.`, `Network of B: ${formatIPv4(otherFacts.network)}.`, same ? "The networks match, so traffic stays on the local segment." : "The networks differ, so the traffic must go through a router (the default gateway)."],
                { bits: [{ label: "A", value: ip, bits: toBits(address) }, { label: "B", value: otherIp, bits: toBits(other) }, { label: "Mask", value: formatIPv4(facts.mask), bits: toBits(facts.mask) }], prefix, choices: sameChoices });
        }
        case "fit": {
            const needed = pick(rng, [between(rng, 3, 30), between(rng, 31, 250), between(rng, 251, 2000), between(rng, 2001, 16000)]);
            let hostBits = 2;
            while (2 ** hostBits < needed + 2) hostBits++;
            const answerPrefix = 32 - hostBits;
            return build(type, difficulty, `A segment needs ${needed.toLocaleString("en-US")} usable host addresses. What is the longest prefix (smallest subnet) that fits?`, [["Hosts needed", needed.toLocaleString("en-US")]], `/${answerPrefix}`, "prefix",
                "Add 2 for the network and broadcast addresses, then find the smallest power of 2 that is large enough.",
                [`Needed addresses: ${needed.toLocaleString("en-US")} hosts + 2 reserved = ${(needed + 2).toLocaleString("en-US")}.`, `Smallest power of 2 that fits: 2^${hostBits} = ${(2 ** hostBits).toLocaleString("en-US")}.`, `/${answerPrefix + 1} would give only ${usableHosts(answerPrefix + 1).toLocaleString("en-US")} usable hosts, which is too few.`, `${hostBits} host bits → prefix 32 − ${hostBits} = /${answerPrefix} (${usableHosts(answerPrefix).toLocaleString("en-US")} usable).`],
                { prefix: answerPrefix, needed });
        }
        default:
            throw new RangeError(`Unknown problem type ${type}`);
    }
}

export function checkAnswer(problem, raw) {
    const text = String(raw ?? "").trim();
    if (!text) return { status: "invalid", message: "Enter an answer first." };
    if (problem.answerKind === "ipv4") {
        const value = parseIPv4(text);
        if (value === null) return { status: "invalid", message: "Use dotted-decimal IPv4 format, such as 192.168.1.64: four numbers from 0 to 255 without leading zeros." };
        return formatIPv4(value) === problem.answer ? { status: "correct" } : { status: "incorrect", given: formatIPv4(value) };
    }
    if (problem.answerKind === "prefix") {
        const match = /^\/?(\d{1,2})$/.exec(text);
        if (!match || Number(match[1]) > 32) return { status: "invalid", message: "Enter a prefix length from /0 to /32, such as /26." };
        return `/${Number(match[1])}` === problem.answer ? { status: "correct" } : { status: "incorrect", given: `/${Number(match[1])}` };
    }
    if (problem.answerKind === "number") {
        if (!/^(\d{1,3}(,\d{3})+|\d+)$/.test(text)) return { status: "invalid", message: "Enter a whole number, such as 62." };
        const value = String(Number(text.replaceAll(",", "")));
        return value === problem.answer ? { status: "correct" } : { status: "incorrect", given: value };
    }
    if (!problem.choices.includes(text)) return { status: "invalid", message: "Choose one of the answers." };
    return text === problem.answer ? { status: "correct" } : { status: "incorrect", given: text };
}
