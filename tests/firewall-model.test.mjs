import { MAX_RULES, parseAddressSpec, parsePortSpec, compileRule, parsePacket, describePacket, describeRule, evaluatePacket, analyzeRules, missions, gradeMission, addressContains } from "../js/firewall-model.mjs";
import { parseIPv4 } from "../js/subnet-sprint-model.mjs";

export const missionSolutions = {
    "publish-web": { defaultAction: "deny", rules: [["allow", "tcp", "any", "10.0.1.10", "80,443"]] },
    "admin-ssh": { defaultAction: "deny", rules: [["allow", "tcp", "10.0.50.0/24", "10.0.1.0/24", "22"]] },
    "order-matters": { defaultAction: "deny", rules: [["deny", "any", "203.0.113.66", "any", "any"], ["allow", "tcp", "any", "10.0.1.10", "443"]] },
    "dns-internal": { defaultAction: "deny", rules: [["allow", "udp", "10.0.0.0/16", "10.0.1.53", "53"], ["allow", "tcp", "10.0.0.0/16", "10.0.1.53", "53"]] },
    database: { defaultAction: "deny", rules: [["allow", "tcp", "10.0.2.0/28", "10.0.3.5", "5432"]] },
    monitoring: { defaultAction: "deny", rules: [["allow", "icmp", "10.0.60.4", "10.0.0.0/16", "any"]] },
    capstone: { defaultAction: "deny", rules: [["deny", "any", "203.0.113.66", "any", "any"], ["allow", "tcp", "any", "10.0.1.10", "80,443"], ["allow", "tcp", "10.0.50.0/24", "10.0.1.0/24", "22"], ["allow", "udp", "10.0.0.0/16", "10.0.1.53", "53"], ["allow", "tcp", "10.0.0.0/16", "10.0.1.53", "53"]] }
};
export const toRaw = ([action, protocol, source, destination, port]) => ({ action, protocol, source, destination, port });

export function runFirewallModelTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(label);
        passed++;
    };

    assert(parseAddressSpec("any").value.any && parseAddressSpec(" * ").value.any && parseAddressSpec("0.0.0.0/0").value.any, "any, * and /0 mean every address");
    const host = parseAddressSpec("10.0.1.10");
    assert(host.ok && host.value.prefix === 32 && host.value.text === "10.0.1.10", "A bare address is a /32 host");
    const block = parseAddressSpec("10.0.2.0/28");
    assert(block.ok && block.value.prefix === 28 && block.value.text === "10.0.2.0/28", "CIDR blocks parse");
    assert(addressContains(block.value, parseIPv4("10.0.2.15")) && !addressContains(block.value, parseIPv4("10.0.2.16")), "CIDR containment uses subnet math");
    const hostBits = parseAddressSpec("10.0.1.10/24");
    assert(!hostBits.ok && hostBits.error.includes("10.0.1.0/24"), "Host bits are rejected with a suggested network");
    for (const bad of ["", "10.0.1", "10.0.1.0/33", "10.0.1.0/2/4", "10.0.1.0/", "256.0.0.1", "10.0.1.0/024", "<img>"]) assert(!parseAddressSpec(bad).ok, `Rejects address ${bad}`);
    assert(parsePortSpec("any", "tcp").value.any && parsePortSpec("", "udp").value.any, "Blank or any port means every port");
    const list = parsePortSpec("443, 80,8000-8080,8079", "tcp");
    assert(list.ok && list.value.text === "80,443,8000-8080", "Port lists sort and merge overlapping ranges");
    assert(!parsePortSpec("22", "icmp").ok && !parsePortSpec("22", "any").ok && parsePortSpec("any", "icmp").ok, "Ports require TCP or UDP");
    for (const bad of ["0", "65536", "80-22", "http", "1,2,3,4,5,6,7,8,9", "22-", "-5"]) assert(!parsePortSpec(bad, "tcp").ok, `Rejects port ${bad}`);
    const invalid = compileRule({ action: "maybe", protocol: "gre", source: "x", destination: "10.0.0.0/8", port: "22" });
    assert(!invalid.ok && invalid.errors.action && invalid.errors.protocol && invalid.errors.source && invalid.errors.port && !invalid.errors.destination, "Each invalid field reports its own error");

    const packet = parsePacket({ protocol: "tcp", source: "198.51.100.24", destination: "10.0.1.10", port: "443" });
    assert(packet.ok && describePacket(packet.packet) === "TCP 198.51.100.24 → 10.0.1.10:443 (HTTPS)", "Packets parse and describe with service names");
    const ping = parsePacket({ protocol: "icmp", source: "10.0.60.4", destination: "10.0.1.10", port: "999" });
    assert(ping.ok && ping.packet.port === null && describePacket(ping.packet) === "ICMP 10.0.60.4 → 10.0.1.10", "ICMP ignores ports");
    assert(!parsePacket({ protocol: "tcp", source: "10.0.0.0/24", destination: "10.0.1.10", port: "0" }).ok, "Packet tester requires single addresses and a real port");

    const rules = [compileRule(toRaw(["deny", "any", "203.0.113.66", "any", "any"])).rule, compileRule(toRaw(["allow", "tcp", "any", "10.0.1.10", "443"])).rule];
    assert(describeRule(rules[1]) === "ALLOW TCP from any to 10.0.1.10 port 443", "Rules describe themselves");
    const blocked = evaluatePacket(rules, { protocol: "tcp", source: parseIPv4("203.0.113.66"), destination: parseIPv4("10.0.1.10"), port: 443 }, "deny");
    assert(blocked.action === "deny" && blocked.matchedIndex === 0 && blocked.trace.map(step => step.status).join() === "matched,not-reached", "First match wins and later rules are not reached");
    const allowed = evaluatePacket(rules, { protocol: "tcp", source: parseIPv4("198.51.100.24"), destination: parseIPv4("10.0.1.10"), port: 443 }, "deny");
    assert(allowed.action === "allow" && allowed.matchedIndex === 1 && allowed.trace[0].checks.find(check => check.field === "source").ok === false, "Trace explains the failed source check");
    const fallthrough = evaluatePacket(rules, { protocol: "icmp", source: parseIPv4("198.51.100.24"), destination: parseIPv4("10.0.1.10"), port: null }, "allow");
    assert(fallthrough.action === "allow" && fallthrough.matchedIndex === -1, "Default policy applies when nothing matches");
    const icmpPort = evaluatePacket([compileRule(toRaw(["allow", "tcp", "any", "any", "22"])).rule], { protocol: "icmp", source: 1, destination: 2, port: null });
    assert(icmpPort.action === "deny" && icmpPort.trace[0].checks.some(check => check.field === "port" && !check.ok), "Port rules never match portless packets");
    assert(evaluatePacket([null], { protocol: "tcp", source: 1, destination: 2, port: 80 }).trace[0].status === "invalid", "Invalid rules are skipped and marked");

    const shadow = analyzeRules([compileRule(toRaw(["allow", "tcp", "any", "10.0.1.10", "443"])).rule, compileRule(toRaw(["deny", "tcp", "203.0.113.66", "10.0.1.10", "443"])).rule]);
    assert(shadow.some(warning => warning.kind === "shadowed" && warning.index === 1), "Detects an exception placed below a broader rule");
    const redundant = analyzeRules([compileRule(toRaw(["allow", "tcp", "10.0.0.0/16", "any", "1-1024"])).rule, compileRule(toRaw(["allow", "tcp", "10.0.2.0/28", "10.0.3.5", "22,80"])).rule]);
    assert(redundant.some(warning => warning.kind === "redundant" && warning.index === 1), "Detects redundant rules with nested ranges");
    const partial = analyzeRules([compileRule(toRaw(["allow", "tcp", "10.0.2.0/28", "any", "22"])).rule, compileRule(toRaw(["deny", "tcp", "10.0.0.0/16", "any", "22"])).rule]);
    assert(!partial.length, "Partial overlap is not reported as shadowing");
    assert(analyzeRules([compileRule(toRaw(["allow", "any", "any", "any", "any"])).rule]).some(warning => warning.kind === "broad"), "Warns about allow-everything rules");
    assert(analyzeRules([], "allow").some(warning => warning.kind === "default") && !analyzeRules([], "deny").length, "Warns about default allow");

    assert(missions.length === 7 && new Set(missions.map(mission => mission.id)).size === 7, "Seven uniquely identified missions");
    for (const mission of missions) {
        assert(mission.title && mission.brief && mission.teach && mission.solution && mission.zones.length >= 2 && mission.tests.length >= 4, `${mission.id} is complete`);
        assert(mission.tests.some(test => test.expect === "allow") && mission.tests.some(test => test.expect === "deny"), `${mission.id} tests both outcomes`);
        assert(mission.tests.every(test => test.why && Number.isInteger(test.packet.source) && Number.isInteger(test.packet.destination)), `${mission.id} tests are well formed`);
        assert(mission.starter.length <= MAX_RULES && mission.starter.every(raw => compileRule(raw).ok), `${mission.id} starter rules compile`);
        assert(!gradeMission(mission, mission.starter, mission.defaultAction).complete, `${mission.id} starter does not already pass`);
        const solution = missionSolutions[mission.id];
        const graded = gradeMission(mission, solution.rules.map(toRaw), solution.defaultAction);
        assert(graded.complete && graded.passed === mission.tests.length && !graded.warnings.length, `${mission.id} reference solution passes cleanly`);
        assert(!gradeMission(mission, solution.rules.map(toRaw), "allow").complete || mission.tests.every(test => test.expect === "allow"), `${mission.id} relies on default deny`);
        const wideOpen = gradeMission(mission, [toRaw(["allow", "any", "any", "any", "any"])], "deny");
        assert(!wideOpen.complete && wideOpen.warnings.some(warning => warning.kind === "broad"), `${mission.id} cannot be solved with allow-everything`);
        const broken = gradeMission(mission, [...solution.rules.map(toRaw), toRaw(["allow", "tcp", "bad", "any", "any"])], solution.defaultAction);
        assert(!broken.complete && broken.invalid === 1, `${mission.id} cannot complete with an invalid rule`);
    }
    const order = missions.find(mission => mission.id === "order-matters");
    const reversed = gradeMission(order, [...missionSolutions["order-matters"].rules].reverse().map(toRaw), "deny");
    assert(!reversed.complete && reversed.results[0].outcome.matchedIndex === 0, "Order-matters fails with the starter order");
    const tooWide = gradeMission(missions.find(mission => mission.id === "database"), [toRaw(["allow", "tcp", "10.0.2.0/27", "10.0.3.5", "5432"])], "deny");
    assert(!tooWide.complete && !tooWide.results.find(result => result.packet.source === parseIPv4("10.0.2.16")).passed, "Database mission catches a /27 subnet mistake");

    return { passed, message: `${passed} firewall model assertions passed.` };
}

if (typeof document === "undefined") console.log(runFirewallModelTests());
