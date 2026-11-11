import { officeTopology, networkScenario } from "../js/lab-model.mjs";
import { protocols, protocolTrace, packetGroups } from "../js/network-protocols.mjs";

export function runProtocolTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const topology = officeTopology();
    const settings = { dhcpEnabled: true, dnsEnabled: true, blockWeb: false };
    const leases = new Map();
    assert(protocolTrace("invalid", topology, 1, leases, settings).error, "Unknown lessons fail explicitly");
    for (const kind of ["dns", "tcp", "http", "https"]) assert(protocolTrace(kind, topology, 1, leases, settings).error, "Lease required before traffic");
    const dhcp = protocolTrace("dhcp", topology, 1, leases, settings);
    assert(!leases.size, "Preparing DHCP never commits a lease");
    assert(packetGroups(dhcp.steps).length === 4, "DORA has four logical packets");
    leases.set(1, dhcp.lease);
    const counts = { dns: 2, tcp: 5, http: 7, https: 10 };
    for (const [kind, definition] of Object.entries(protocols)) {
        const result = protocolTrace(kind, topology, 1, leases, settings);
        assert(!result.error, `${kind} builds a trace`);
        assert(result.steps.every(step => definition.phases.includes(step.phase)), `${kind} phases exist in overview`);
        assert(result.steps.every(step => step.source && step.destination && step.summary && step.packetId), `${kind} has complete packet metadata`);
        assert(result.steps.every(step => topology.devices.some(d => d.id === step.node)), `${kind} only visits real devices`);
        assert(result.steps.every(step => !step.edge || topology.links.some(link => step.edge.every(id => link.includes(id)))), `${kind} uses connected edges`);
        assert(packetGroups(result.steps).length === (counts[kind] || 4), `${kind} packet count is exact`);
        assert(!result.steps.some(step => step.error), `${kind} succeeds on office topology`);
    }
    const dns = protocolTrace("dns", topology, 1, leases, settings);
    assert(!dns.steps.some(s => s.family === "TCP"), "DNS lesson does not start TCP");
    const noWan = structuredClone(topology);
    noWan.links = noWan.links.filter(link => !link.includes(6));
    assert(!protocolTrace("dns", noWan, 1, leases, settings).steps.some(s => s.error), "DNS works without a WAN route");
    for (const kind of ["tcp", "http", "https"]) {
        const blocked = protocolTrace(kind, topology, 1, leases, { ...settings, blockWeb: true });
        assert(blocked.steps.at(-1).error, `${kind} respects firewall`);
        assert(!blocked.steps.some(s => ["request", "response", "syn-ack", "client-hello"].includes(s.packetId)), `${kind} cannot send application data after denied SYN`);
        assert(!blocked.steps.some(s => s.node === 6), `${kind} denial never reaches external endpoint`);
        const noDns = protocolTrace(kind, topology, 1, leases, { ...settings, dnsEnabled: false });
        assert(noDns.steps.at(-1).error && !noDns.steps.some(s => s.family === "TCP"), `${kind} stops after DNS failure`);
        assert(protocolTrace(kind, noWan, 1, leases, settings).steps.at(-1).protocol === "NO ROUTE", `${kind} missing WAN route fails explicitly`);
    }
    const https = protocolTrace("https", topology, 1, leases, settings);
    assert(https.steps.filter(s => s.family !== "DNS").every(s => s.source.includes("443") || s.destination.includes("443")), "HTTPS uses port 443");
    assert(https.steps.findIndex(s => s.packetId === "client-finished") < https.steps.findIndex(s => s.packetId === "request"), "TLS handshake precedes encrypted HTTP");
    assert(https.steps.filter(s => s.packetId === "request").every(s => s.summary.includes("not visible on the wire")), "Encrypted content is explicitly a teaching annotation");
    const home = networkScenario("home").topology;
    const phoneLease = protocolTrace("dhcp", home, 8, leases, settings).lease;
    const phone = protocolTrace("http", home, 8, new Map([[8, phoneLease]]), settings);
    assert(phone.steps[0].node === 8 && phone.steps.at(-1).node === 8, "Phone source completes request/response");
    assert(protocolTrace("dhcp", topology, 1, leases, { ...settings, dhcpEnabled: false }).error, "Disabled DHCP returns an explicit error");
    return { passed, message: `${passed} protocol assertions passed.` };
}

if (typeof document === "undefined") console.log(runProtocolTests());
