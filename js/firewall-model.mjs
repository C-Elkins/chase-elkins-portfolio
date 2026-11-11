import { parseIPv4, formatIPv4, prefixToMask } from "./subnet-sprint-model.mjs";

export const MAX_RULES = 20;
export const ruleProtocols = ["any", "tcp", "udp", "icmp"];
export const packetProtocols = ["tcp", "udp", "icmp"];
export const ruleActions = ["allow", "deny"];
export const portNames = { 22: "SSH", 25: "SMTP", 53: "DNS", 80: "HTTP", 123: "NTP", 443: "HTTPS", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 8080: "HTTP alt" };

const ANY_ADDRESS = Object.freeze({ any: true, network: 0, prefix: 0, text: "any" });

export function parseAddressSpec(raw) {
    const text = String(raw ?? "").trim().toLowerCase();
    if (!text) return { ok: false, error: "Enter an IPv4 address, a CIDR block such as 10.0.1.0/24, or any." };
    if (text === "any" || text === "*" || text === "0.0.0.0/0") return { ok: true, value: ANY_ADDRESS };
    const [addressText, prefixText, extra] = text.split("/");
    if (extra !== undefined) return { ok: false, error: "Use one slash, such as 10.0.1.0/24." };
    const address = parseIPv4(addressText);
    if (address === null) return { ok: false, error: `“${addressText}” is not a valid IPv4 address.` };
    if (prefixText === undefined) return { ok: true, value: { any: false, network: address, prefix: 32, text: formatIPv4(address) } };
    if (!/^(\d|[12]\d|3[0-2])$/.test(prefixText)) return { ok: false, error: "The prefix after the slash must be 0 to 32." };
    const prefix = Number(prefixText);
    const network = (address & prefixToMask(prefix)) >>> 0;
    if (network !== address) return { ok: false, error: `Host bits are set. Did you mean ${formatIPv4(network)}/${prefix}?` };
    if (prefix === 0) return { ok: true, value: ANY_ADDRESS };
    return { ok: true, value: { any: false, network, prefix, text: `${formatIPv4(network)}/${prefix}` } };
}

export function parsePortSpec(raw, protocol) {
    const text = String(raw ?? "").trim().toLowerCase();
    if (!text || text === "any" || text === "*") return { ok: true, value: { any: true, ranges: [], text: "any" } };
    if (protocol !== "tcp" && protocol !== "udp") return { ok: false, error: "Ports exist only for TCP and UDP. Choose TCP or UDP, or set the port to any." };
    const parts = text.split(",").map(part => part.trim());
    if (parts.length > 8) return { ok: false, error: "Use at most 8 ports or ranges in one rule." };
    const ranges = [];
    for (const part of parts) {
        const match = /^(\d{1,5})(?:\s*-\s*(\d{1,5}))?$/.exec(part);
        if (!match) return { ok: false, error: `“${part}” is not a port. Use 443, 8000-8080 or 80,443.` };
        const from = Number(match[1]);
        const to = match[2] === undefined ? from : Number(match[2]);
        if (from < 1 || to > 65535 || from > 65535) return { ok: false, error: "Ports run from 1 to 65535." };
        if (from > to) return { ok: false, error: `Range ${part} is backwards; write the lower port first.` };
        ranges.push([from, to]);
    }
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const range of ranges) {
        const previous = merged.at(-1);
        if (previous && range[0] <= previous[1] + 1) previous[1] = Math.max(previous[1], range[1]);
        else merged.push([...range]);
    }
    return { ok: true, value: { any: false, ranges: merged, text: merged.map(([from, to]) => from === to ? String(from) : `${from}-${to}`).join(",") } };
}

export function compileRule(raw) {
    const errors = {};
    const action = ruleActions.includes(raw?.action) ? raw.action : null;
    const protocol = ruleProtocols.includes(raw?.protocol) ? raw.protocol : null;
    if (!action) errors.action = "Choose allow or deny.";
    if (!protocol) errors.protocol = "Choose a protocol.";
    const source = parseAddressSpec(raw?.source);
    const destination = parseAddressSpec(raw?.destination);
    const ports = parsePortSpec(raw?.port, protocol);
    if (!source.ok) errors.source = source.error;
    if (!destination.ok) errors.destination = destination.error;
    if (!ports.ok) errors.port = ports.error;
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true, errors, rule: { action, protocol, source: source.value, destination: destination.value, ports: ports.value } };
}

export const addressContains = (spec, address) => spec.any || ((address & prefixToMask(spec.prefix)) >>> 0) === spec.network;
const specCovers = (outer, inner) => outer.any || (!inner.any && outer.prefix <= inner.prefix && addressContains(outer, inner.network));
const portsContain = (spec, port) => spec.any || spec.ranges.some(([from, to]) => port >= from && port <= to);
const portsCover = (outer, inner) => outer.any || (!inner.any && inner.ranges.every(([from, to]) => outer.ranges.some(([a, b]) => from >= a && to <= b)));

export function parsePacket(raw) {
    const errors = {};
    const protocol = packetProtocols.includes(raw?.protocol) ? raw.protocol : null;
    if (!protocol) errors.protocol = "Choose TCP, UDP or ICMP.";
    const source = parseIPv4(raw?.source);
    const destination = parseIPv4(raw?.destination);
    if (source === null) errors.source = "Enter one source IPv4 address, such as 198.51.100.24.";
    if (destination === null) errors.destination = "Enter one destination IPv4 address, such as 10.0.1.10.";
    let port = null;
    if (protocol === "tcp" || protocol === "udp") {
        const text = String(raw?.port ?? "").trim();
        if (!/^\d{1,5}$/.test(text) || Number(text) < 1 || Number(text) > 65535) errors.port = "Enter one destination port from 1 to 65535.";
        else port = Number(text);
    }
    if (Object.keys(errors).length) return { ok: false, errors };
    return { ok: true, errors, packet: { protocol, source, destination, port } };
}

export function describePacket(packet) {
    const service = packet.port !== null && portNames[packet.port] ? ` (${portNames[packet.port]})` : "";
    const target = packet.port === null ? formatIPv4(packet.destination) : `${formatIPv4(packet.destination)}:${packet.port}`;
    return `${packet.protocol.toUpperCase()} ${formatIPv4(packet.source)} → ${target}${service}`;
}

export function describeRule(rule) {
    const protocol = rule.protocol === "any" ? "any protocol" : rule.protocol.toUpperCase();
    const ports = rule.ports.any ? "" : ` port ${rule.ports.text}`;
    return `${rule.action.toUpperCase()} ${protocol} from ${rule.source.text} to ${rule.destination.text}${ports}`;
}

function checkRule(rule, packet) {
    const checks = [
        { field: "protocol", ok: rule.protocol === "any" || rule.protocol === packet.protocol, detail: rule.protocol === "any" ? "any protocol matches" : `rule wants ${rule.protocol.toUpperCase()}, packet is ${packet.protocol.toUpperCase()}` },
        { field: "source", ok: addressContains(rule.source, packet.source), detail: `${formatIPv4(packet.source)} ${addressContains(rule.source, packet.source) ? "is inside" : "is outside"} ${rule.source.text}` },
        { field: "destination", ok: addressContains(rule.destination, packet.destination), detail: `${formatIPv4(packet.destination)} ${addressContains(rule.destination, packet.destination) ? "is inside" : "is outside"} ${rule.destination.text}` }
    ];
    if (!rule.ports.any) {
        const ok = packet.port !== null && portsContain(rule.ports, packet.port);
        checks.push({ field: "port", ok, detail: packet.port === null ? `ICMP has no port, so port ${rule.ports.text} cannot match` : `port ${packet.port} ${ok ? "is in" : "is not in"} ${rule.ports.text}` });
    }
    return checks;
}

export function evaluatePacket(rules, packet, defaultAction = "deny") {
    const trace = [];
    for (let index = 0; index < rules.length; index++) {
        const rule = rules[index];
        if (!rule) {
            trace.push({ index, status: "invalid", checks: [] });
            continue;
        }
        const checks = checkRule(rule, packet);
        const matched = checks.every(check => check.ok);
        trace.push({ index, status: matched ? "matched" : "skipped", checks });
        if (matched) {
            for (let later = index + 1; later < rules.length; later++) trace.push({ index: later, status: "not-reached", checks: [] });
            return { action: rule.action, matchedIndex: index, trace };
        }
    }
    return { action: defaultAction, matchedIndex: -1, trace };
}

export function analyzeRules(rules, defaultAction = "deny") {
    const warnings = [];
    rules.forEach((rule, index) => {
        if (!rule) return;
        if (rule.action === "allow" && rule.protocol === "any" && rule.source.any && rule.destination.any) warnings.push({ index, kind: "broad", message: `Rule ${index + 1} allows every packet. Everything below it is unreachable, and the policy is effectively open.` });
        for (let earlier = 0; earlier < index; earlier++) {
            const outer = rules[earlier];
            if (!outer) continue;
            if ((outer.protocol === "any" || outer.protocol === rule.protocol) && specCovers(outer.source, rule.source) && specCovers(outer.destination, rule.destination) && portsCover(outer.ports, rule.ports)) {
                warnings.push(outer.action === rule.action
                    ? { index, kind: "redundant", message: `Rule ${index + 1} can never match: rule ${earlier + 1} already ${outer.action === "allow" ? "allows" : "denies"} everything it covers. You can delete it.` }
                    : { index, kind: "shadowed", message: `Rule ${index + 1} is shadowed: rule ${earlier + 1} matches every packet it would, so its ${rule.action} never happens. Move it above rule ${earlier + 1} if it is an exception.` });
                break;
            }
        }
    });
    if (defaultAction === "allow") warnings.push({ index: -1, kind: "default", message: "Default allow lets through anything you forgot to block. Production firewalls usually default to deny and allow only what is needed." });
    return warnings;
}

const ip = parseIPv4;
const flow = (protocol, source, destination, port, expect, why) => ({ packet: { protocol, source: ip(source), destination: ip(destination), port: port ?? null }, expect, why });
const zones = {
    internet: ["Internet client", "198.51.100.24", "A normal visitor on the public internet."],
    attacker: ["Known attacker", "203.0.113.66", "Has been scanning your servers."],
    web: ["Web server", "10.0.1.10", "Public website in the DMZ."],
    dns: ["DNS resolver", "10.0.1.53", "Answers name lookups for staff."],
    dmz: ["DMZ servers", "10.0.1.0/24", "Internet-facing services."],
    apps: ["App servers", "10.0.2.0/28", "10.0.2.0 to 10.0.2.15."],
    db: ["Database", "10.0.3.5", "PostgreSQL on TCP 5432."],
    office: ["Office LAN", "10.0.10.0/24", "Staff laptops and printers."],
    admin: ["Admin subnet", "10.0.50.0/24", "IT workstations."],
    monitor: ["Monitoring", "10.0.60.4", "Checks every server is up."],
    internal: ["All internal", "10.0.0.0/16", "Every company subnet."]
};
const zoneList = keys => keys.map(key => ({ name: zones[key][0], address: zones[key][1], note: zones[key][2] }));
const rule = (action, protocol, source, destination, port = "any") => ({ action, protocol, source, destination, port });

export const missions = [
    {
        id: "publish-web", title: "Publish the website", level: "Starter",
        brief: "The web server must accept HTTP and HTTPS from anyone on the internet. Nothing else should reach it, and no other server should be exposed.",
        teach: "Start with default deny, then open only the exact destination and ports the service needs. One rule can list several ports, such as 80,443.",
        zones: zoneList(["internet", "web", "dmz"]),
        defaultAction: "deny", starter: [],
        tests: [
            flow("tcp", "198.51.100.24", "10.0.1.10", 443, "allow", "HTTPS to the website"),
            flow("tcp", "198.51.100.24", "10.0.1.10", 80, "allow", "HTTP, usually redirected to HTTPS"),
            flow("tcp", "198.51.100.24", "10.0.1.10", 22, "deny", "SSH must not be exposed to the internet"),
            flow("tcp", "198.51.100.24", "10.0.1.10", 3306, "deny", "Database ports stay private"),
            flow("tcp", "198.51.100.24", "10.0.1.11", 443, "deny", "Another DMZ host is not the website"),
            flow("icmp", "198.51.100.24", "10.0.1.10", null, "deny", "Internet ping is not part of the brief")
        ],
        solution: "One rule: ALLOW TCP from any to 10.0.1.10 port 80,443. Default deny handles everything else."
    },
    {
        id: "admin-ssh", title: "SSH from admins only", level: "Starter",
        brief: "The starter rule lets anyone SSH into the DMZ. Narrow it so only the admin subnet can SSH to DMZ servers. Other admin traffic should not get a free pass.",
        teach: "Least privilege means narrowing the source as well as the destination and port. A CIDR block like 10.0.50.0/24 matches the whole admin subnet.",
        zones: zoneList(["admin", "office", "dmz", "attacker", "db"]),
        defaultAction: "deny", starter: [rule("allow", "tcp", "any", "10.0.1.0/24", "22")],
        tests: [
            flow("tcp", "10.0.50.12", "10.0.1.10", 22, "allow", "An admin SSH session to the web server"),
            flow("tcp", "10.0.50.200", "10.0.1.53", 22, "allow", "Another admin SSH session to the DNS server"),
            flow("tcp", "10.0.10.25", "10.0.1.10", 22, "deny", "Office laptops are not administrators"),
            flow("tcp", "203.0.113.66", "10.0.1.10", 22, "deny", "Internet SSH is the main brute-force target"),
            flow("tcp", "10.0.50.12", "10.0.1.10", 3389, "deny", "Only SSH was requested, not Remote Desktop"),
            flow("tcp", "10.0.50.12", "10.0.3.5", 22, "deny", "The database is outside the DMZ scope")
        ],
        solution: "Change the source to 10.0.50.0/24: ALLOW TCP from 10.0.50.0/24 to 10.0.1.0/24 port 22."
    },
    {
        id: "order-matters", title: "Order matters", level: "Core",
        brief: "Someone added a block for the known attacker, but the attacker can still reach the website. Fix it without blocking normal visitors or the attacker's neighbors.",
        teach: "Rules are read top to bottom and the first match wins. A specific exception, such as blocking one host, must sit above the broader rule it overrides.",
        zones: zoneList(["attacker", "internet", "web"]),
        defaultAction: "deny", starter: [rule("allow", "tcp", "any", "10.0.1.10", "443"), rule("deny", "any", "203.0.113.66", "any")],
        tests: [
            flow("tcp", "203.0.113.66", "10.0.1.10", 443, "deny", "The attacker must be blocked"),
            flow("tcp", "198.51.100.24", "10.0.1.10", 443, "allow", "Normal visitors still reach HTTPS"),
            flow("tcp", "203.0.113.67", "10.0.1.10", 443, "allow", "The next address belongs to someone else"),
            flow("icmp", "203.0.113.66", "10.0.1.10", null, "deny", "The attacker cannot ping either"),
            flow("tcp", "198.51.100.24", "10.0.1.10", 22, "deny", "Fixing the order must not open SSH")
        ],
        solution: "Move DENY any from 203.0.113.66 above the HTTPS allow. Keep the source as one /32 host so neighbors are not blocked."
    },
    {
        id: "dns-internal", title: "Internal DNS only", level: "Core",
        brief: "The resolver at 10.0.1.53 should answer DNS for every internal subnet over UDP and TCP port 53. The internet must not use it.",
        teach: "DNS normally uses UDP 53, but falls back to TCP 53 for large answers and zone transfers. An open resolver can be abused for DDoS amplification, so restrict the source.",
        zones: zoneList(["internal", "office", "admin", "dns", "web", "internet"]),
        defaultAction: "deny", starter: [],
        tests: [
            flow("udp", "10.0.10.25", "10.0.1.53", 53, "allow", "A laptop looks up a name"),
            flow("tcp", "10.0.10.25", "10.0.1.53", 53, "allow", "A large answer retries over TCP"),
            flow("udp", "10.0.50.12", "10.0.1.53", 53, "allow", "Admins use the same resolver"),
            flow("udp", "198.51.100.24", "10.0.1.53", 53, "deny", "No open resolver for the internet"),
            flow("udp", "10.0.10.25", "10.0.1.53", 123, "deny", "NTP was not requested"),
            flow("udp", "10.0.10.25", "10.0.1.10", 53, "deny", "The web server is not a resolver")
        ],
        solution: "Two rules: ALLOW UDP from 10.0.0.0/16 to 10.0.1.53 port 53, and ALLOW TCP from 10.0.0.0/16 to 10.0.1.53 port 53."
    },
    {
        id: "database", title: "Least-privilege database", level: "Core",
        brief: "The starter rule lets every internal device reach every port on the database subnet. Only the app servers may reach PostgreSQL on 10.0.3.5.",
        teach: "A /28 holds 16 addresses. Check your subnet math: 10.0.2.0/28 covers 10.0.2.0 to 10.0.2.15, so 10.0.2.16 is outside.",
        zones: zoneList(["apps", "db", "office", "internal"]),
        defaultAction: "deny", starter: [rule("allow", "tcp", "10.0.0.0/16", "10.0.3.0/24")],
        tests: [
            flow("tcp", "10.0.2.4", "10.0.3.5", 5432, "allow", "The app queries the database"),
            flow("tcp", "10.0.2.14", "10.0.3.5", 5432, "allow", "The last app server in the /28 also connects"),
            flow("tcp", "10.0.2.16", "10.0.3.5", 5432, "deny", "Just outside the app range"),
            flow("tcp", "10.0.10.25", "10.0.3.5", 5432, "deny", "Office laptops never query the database directly"),
            flow("tcp", "10.0.2.4", "10.0.3.5", 22, "deny", "Apps do not need SSH to the database"),
            flow("tcp", "10.0.2.4", "10.0.3.6", 5432, "deny", "Another host in the database subnet")
        ],
        solution: "ALLOW TCP from 10.0.2.0/28 to 10.0.3.5 port 5432, and nothing else."
    },
    {
        id: "monitoring", title: "Ping for monitoring", level: "Core",
        brief: "The monitoring host must be able to ping every internal server. Nobody else, inside or outside, should be able to ping, and monitoring gets no other access.",
        teach: "ICMP has types, not ports, so a port must be any for ICMP rules. Real firewalls can also match specific ICMP types, such as echo request.",
        zones: zoneList(["monitor", "internal", "web", "db", "internet"]),
        defaultAction: "deny", starter: [],
        tests: [
            flow("icmp", "10.0.60.4", "10.0.1.10", null, "allow", "Monitoring pings the web server"),
            flow("icmp", "10.0.60.4", "10.0.3.5", null, "allow", "Monitoring pings the database"),
            flow("icmp", "10.0.60.5", "10.0.1.10", null, "deny", "A different host is not the monitor"),
            flow("icmp", "198.51.100.24", "10.0.1.10", null, "deny", "The internet cannot map your network with ping"),
            flow("tcp", "10.0.60.4", "10.0.1.10", 22, "deny", "Ping access is not SSH access")
        ],
        solution: "ALLOW ICMP from 10.0.60.4 to 10.0.0.0/16."
    },
    {
        id: "capstone", title: "Put it all together", level: "Challenge",
        brief: "A new firewall shipped with default allow and no rules. Lock it down: publish the website, allow admin SSH to the DMZ, keep DNS internal and block the attacker everywhere.",
        teach: "Flip the default to deny first, then add the exceptions. Put the attacker block at the top so it overrides every allow.",
        zones: zoneList(["attacker", "internet", "web", "dns", "dmz", "admin", "office", "internal"]),
        defaultAction: "allow", starter: [],
        tests: [
            flow("tcp", "198.51.100.24", "10.0.1.10", 443, "allow", "Public HTTPS"),
            flow("tcp", "198.51.100.24", "10.0.1.10", 80, "allow", "Public HTTP"),
            flow("tcp", "203.0.113.66", "10.0.1.10", 443, "deny", "The attacker is blocked from the website"),
            flow("tcp", "10.0.50.12", "10.0.1.53", 22, "allow", "Admin SSH to the DMZ"),
            flow("tcp", "10.0.10.25", "10.0.1.10", 22, "deny", "Office laptops cannot SSH"),
            flow("udp", "10.0.10.25", "10.0.1.53", 53, "allow", "Internal DNS over UDP"),
            flow("tcp", "10.0.10.25", "10.0.1.53", 53, "allow", "Internal DNS over TCP"),
            flow("udp", "198.51.100.24", "10.0.1.53", 53, "deny", "No open resolver"),
            flow("tcp", "198.51.100.24", "10.0.3.5", 5432, "deny", "Everything unlisted is denied")
        ],
        solution: "Default deny. 1: DENY any from 203.0.113.66 to any. 2: ALLOW TCP any to 10.0.1.10 port 80,443. 3: ALLOW TCP 10.0.50.0/24 to 10.0.1.0/24 port 22. 4 and 5: ALLOW UDP and TCP 10.0.0.0/16 to 10.0.1.53 port 53."
    }
];

export function gradeMission(mission, rawRules, defaultAction) {
    const compiled = rawRules.map(compileRule);
    const rules = compiled.map(result => result.ok ? result.rule : null);
    const invalid = compiled.filter(result => !result.ok).length;
    const results = mission.tests.map(test => {
        const outcome = evaluatePacket(rules, test.packet, defaultAction);
        return { ...test, outcome, passed: outcome.action === test.expect };
    });
    const passed = results.filter(result => result.passed).length;
    return { compiled, rules, invalid, results, passed, total: results.length, complete: !invalid && passed === results.length, warnings: analyzeRules(rules, defaultAction) };
}
