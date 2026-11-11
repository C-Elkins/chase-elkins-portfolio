import { createWorkbench, applyWorkbenchChanges, runWorkbenchDiagnostic, pinWorkbenchEvidence, verifyWorkbench, restoreWorkbench, saveWorkbench, undoWorkbench, diagnoseWorkbench, workbenchDiff } from "../js/network-workbench-model.mjs";

export const repairs = {
    baseline: { "client.link": true },
    addressing: { "dhcp.reserved": "192.168.10.20", "dhcp.gateway": "192.168.10.1" },
    segmentation: { "client.vlan": 10, "network.trunk": true, "network.allowGuest": false },
    services: { "dhcp.dns": "192.168.10.53" },
    transport: { "service.port": 443, "service.hostname": "app.branch.example" },
    wireless: { "wifi.channel": 1, "wifi.width": 20 },
    vpn: { "vpn.route": true, "vpn.mtu": 1400, "vpn.mss": 1360 },
    capstone: { "dhcp.dns": "192.168.10.53", "network.route": true, "network.allowGuest": false }
};
export const serviceTest = { source: "client", test: "tcp", destination: "app.branch.example", port: 443 };

export function solveWorkbench(id) {
    let state = createWorkbench(id);
    state = pinWorkbenchEvidence(runWorkbenchDiagnostic(state, serviceTest));
    state = applyWorkbenchChanges(state, repairs[id]);
    if (["addressing", "services", "capstone"].includes(id)) state = runWorkbenchDiagnostic(state, { source: "client", test: "renew" });
    state = pinWorkbenchEvidence(runWorkbenchDiagnostic(state, serviceTest));
    return state;
}

export function runWorkbenchModelTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const rejects = (fn, label) => { let threw = false; try { fn(); } catch { threw = true; } assert(threw, label); };
    for (const id of Object.keys(repairs)) {
        const initial = createWorkbench(id);
        assert(!verifyWorkbench(initial).passed, `${id}: initial configuration cannot pass`);
        assert(!runWorkbenchDiagnostic(initial, serviceTest).results.at(-1).ok, `${id}: actual baseline service test fails`);
        if (id === "baseline") assert(runWorkbenchDiagnostic(initial, serviceTest).results.at(-1).events.every(event => event.from === "client" && event.to === "client"), "A down client link cannot animate a DNS query leaving the endpoint");
        const solved = solveWorkbench(id);
        const grade = verifyWorkbench(solved);
        assert(grade.passed && grade.checks.every(check => check.ok), `${id}: full practical repair succeeds`);
        assert(workbenchDiff(solved).length > 0, `${id}: actual changes are reported`);
        const restored = restoreWorkbench(id, saveWorkbench(solved));
        assert(verifyWorkbench(restored).passed, `${id}: saved configuration and recomputed evidence preserve practical`);
        assert(!solved.results.some(result => /[0-9]+ms/.test(result.output)), `${id}: no fabricated measured latency`);
        const noEvidence = { ...solved, pinned: [] };
        assert(!verifyWorkbench(noEvidence).passed, `${id}: answer copying without evidence is not a practical pass`);
        const stale = { ...solved, revision: solved.revision + 1 };
        assert(!verifyWorkbench(stale).passed, `${id}: stale evidence cannot pass current verification`);
        assert(!verifyWorkbench(undoWorkbench(solved)).passed, `${id}: undo requires a new successful verification`);
    }
    let lease = createWorkbench("services");
    lease = applyWorkbenchChanges(lease, repairs.services);
    assert(!runWorkbenchDiagnostic(lease, serviceTest).results.at(-1).ok, "Changing DHCP option does not silently rewrite held client lease");
    lease = runWorkbenchDiagnostic(lease, { test: "renew", source: "client" });
    assert(runWorkbenchDiagnostic(lease, serviceTest).results.at(-1).ok, "Renewal applies the repaired option to the client");
    const direct = diagnoseWorkbench(createWorkbench("services").config, { test: "dns", destination: "app.branch.example", resolver: "192.168.10.53" });
    assert(direct.ok, "Explicit resolver query can isolate the bad held resolver");
    const badGateway = createWorkbench("addressing").config;
    assert(diagnoseWorkbench(badGateway, { test: "dns", destination: "app.branch.example" }).ok, "Wrong default gateway does not prevent same-subnet DNS");
    assert(diagnoseWorkbench(badGateway, { test: "ping", destination: "192.168.10.1" }).ok, "Wrong default gateway does not prevent on-link reachability");
    assert(!diagnoseWorkbench(badGateway, serviceTest).ok, "Wrong default gateway does prevent off-link service access");
    let cache = solveWorkbench("services");
    cache = applyWorkbenchChanges(cache, { "dns.record": "192.168.20.99" });
    assert(runWorkbenchDiagnostic(cache, serviceTest).results.at(-1).ok, "Existing positive client cache persists through a record change");
    assert(runWorkbenchDiagnostic(cache, { test: "dns", destination: "app.branch.example" }).results.at(-1).output.includes("192.168.20.99"), "nslookup bypasses positive OS cache");
    cache = runWorkbenchDiagnostic(cache, { test: "flush" });
    assert(!runWorkbenchDiagnostic(cache, serviceTest).results.at(-1).ok, "Flushing cache reveals the changed invalid record");
    const vpn = solveWorkbench("vpn");
    assert(diagnoseWorkbench(vpn.config, { test: "ping", destination: "192.168.20.10", df: true, size: 1372 }).ok, "1372-byte payload plus 28-byte headers fits exact 1400 MTU");
    assert(!diagnoseWorkbench(vpn.config, { test: "ping", destination: "192.168.20.10", df: true, size: 1373 }).ok, "1373-byte payload exceeds 1400 budget");
    const clamped = applyWorkbenchChanges(vpn, { "vpn.mtu": 1500 });
    assert(verifyWorkbench(pinWorkbenchEvidence(runWorkbenchDiagnostic(clamped, serviceTest))).passed, "MSS clamp is an accepted alternative within published constraints");
    const noDiagnostics = applyWorkbenchChanges(vpn, { "vpn.icmp": false });
    assert(diagnoseWorkbench(noDiagnostics.config, serviceTest).ok && !verifyWorkbench(noDiagnostics).passed, "Correctly sized TCP can work while the required diagnostic policy still fails");
    const differentChannel = applyWorkbenchChanges(solveWorkbench("wireless"), { "wifi.channel": 11 });
    assert(verifyWorkbench(pinWorkbenchEvidence(runWorkbenchDiagnostic(differentChannel, serviceTest))).passed, "Either nonoverlapping supported channel can meet the objective");
    let alternativePool = pinWorkbenchEvidence(runWorkbenchDiagnostic(createWorkbench("addressing"), serviceTest));
    alternativePool = applyWorkbenchChanges(alternativePool, { "dhcp.start": "192.168.10.130", "dhcp.gateway": "192.168.10.1" });
    alternativePool = runWorkbenchDiagnostic(alternativePool, { test: "renew" });
    assert(verifyWorkbench(pinWorkbenchEvidence(runWorkbenchDiagnostic(alternativePool, serviceTest))).passed, "Moving the dynamic pool is an accepted alternative to moving the static host");
    const unsafe = applyWorkbenchChanges(solveWorkbench("segmentation"), { "network.allowGuest": true });
    assert(!verifyWorkbench(pinWorkbenchEvidence(runWorkbenchDiagnostic(unsafe, serviceTest))).passed, "Allow-all cannot bypass safety constraints");
    assert(diagnoseWorkbench(unsafe.config, { ...serviceTest, source: "guest", destination: "192.168.20.10" }).ok, "Guest testing reflects actual unsafe policy");
    assert(!diagnoseWorkbench(solveWorkbench("segmentation").config, { ...serviceTest, source: "guest", destination: "192.168.20.10" }).ok, "Guest service access is actually denied after the safe repair");
    rejects(() => applyWorkbenchChanges(createWorkbench("baseline"), { "client.ip": "bad" }), "Uneditable paths cannot mutate configuration");
    rejects(() => applyWorkbenchChanges(createWorkbench("addressing"), { "client.ip": "999.1.1.1" }), "Invalid addresses cannot mutate configuration");
    rejects(() => applyWorkbenchChanges(createWorkbench("addressing"), { "dhcp.start": "192.168.10.200" }), "Reversed scope rejected atomically");
    const corrupt = saveWorkbench(solveWorkbench("baseline"));
    corrupt.config.client.prefix = 99;
    rejects(() => restoreWorkbench("baseline", corrupt), "Corrupt saved field is rejected");
    rejects(() => pinWorkbenchEvidence(createWorkbench("baseline")), "No fabricated empty evidence");
    assert(!verifyWorkbench({ ...solveWorkbench("baseline"), pinned: [] }).passed, "No evidence cannot pass");
    return `Workbench model tests passed: ${passed} assertions.`;
}
