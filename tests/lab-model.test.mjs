import { officeTopology, networkScenario, isClient, validateLink, findPath, dhcpTrace, webTrace, sortFrames } from "../js/lab-model.mjs";

export function runLabTests() {
    let passed = 0;
    const assert = (condition, description) => {
        if (!condition) throw new Error(description);
        passed++;
    };
    const office = officeTopology();
    const leases = new Map();
    assert(validateLink(office, 1, 1).includes("itself"), "Self-links rejected");
    assert(validateLink(office, 2, 1).includes("already"), "Reversed duplicate links rejected");
    assert(validateLink(office, 1, 6).includes("internet"), "Client cannot directly connect to internet");
    assert(validateLink(office, 1, 99).includes("existing"), "Missing device rejected");
    assert(validateLink(office, 1, 3) === "", "Valid client-switch connection accepted");
    const dhcp = dhcpTrace(office, 1, true, leases);
    assert(!dhcp.error && dhcp.lease.ip === "192.168.10.100", "DHCP allocates address");
    assert(dhcp.steps.filter(s => s.protocol === "DISCOVER").length === 4, "Discover traverses client, AP, switch, router");
    assert(["DISCOVER", "OFFER", "REQUEST", "ACK"].every(protocol => dhcp.steps.some(s => s.protocol === protocol)), "All DORA phases emitted");
    assert(dhcp.lease.gateway === "192.168.10.1" && dhcp.lease.dns === "192.168.10.53", "DHCP supplies gateway and DNS");
    assert(dhcpTrace(office, 1, false, leases).error.includes("disabled"), "Disabled DHCP fails explicitly");
    assert(dhcpTrace(office, 2, true, leases).error.includes("client"), "DHCP requires client");
    assert(webTrace(office, 1, leases, { dnsEnabled: true, blockWeb: false }).error.includes("lease"), "Web requires committed lease");
    leases.set(1, dhcp.lease);
    const web = webTrace(office, 1, leases, { dnsEnabled: true, blockWeb: false });
    assert(web.steps.some(s => s.protocol === "DNS ANSWER" && s.message.includes("203.0.113.10")), "DNS returns simulated A record");
    assert(web.steps.some(s => s.protocol === "WEB" && s.node === 6), "Web reaches internet via gateway and firewall");
    assert(web.steps.at(-1).protocol === "RESPONSE" && web.steps.at(-1).node === 1, "Response returns to client");
    const blocked = webTrace(office, 1, leases, { dnsEnabled: true, blockWeb: true });
    assert(blocked.steps.at(-1).protocol === "DENY", "Firewall denies blocked web request");
    assert(!blocked.steps.some(s => s.protocol === "WEB" && s.node === 6), "Denied traffic never reaches internet");
    const noDns = webTrace(office, 1, leases, { dnsEnabled: false, blockWeb: false });
    assert(noDns.steps.at(-1).protocol === "TIMEOUT" && !noDns.steps.some(s => s.protocol === "WEB"), "DNS failure prevents web request");
    const disconnected = officeTopology();
    disconnected.links = disconnected.links.filter(link => !link.includes(2));
    assert(dhcpTrace(disconnected, 1, true, leases).error.includes("Layer-2"), "Disconnected client cannot receive DHCP");
    assert(findPath({ devices: office.devices, links: [[1, 5], [5, 4]] }, 1, 4, { lanOnly: true }) === null, "DHCP broadcast cannot cross firewall");
    const secondClient = officeTopology();
    secondClient.devices.push({ id: 8, type: "client", name: "Laptop 2" });
    secondClient.links.push([8, 3]);
    assert(dhcpTrace(secondClient, 8, true, leases).lease.ip === "192.168.10.101", "Second client has a distinct lease");
    const noRouter = officeTopology();
    noRouter.devices = noRouter.devices.filter(d => d.type !== "router");
    assert(dhcpTrace(noRouter, 1, true, leases).error.includes("router"), "Missing DHCP router fails");
    const noInternet = officeTopology();
    noInternet.links = noInternet.links.filter(link => !link.includes(6));
    assert(webTrace(noInternet, 1, leases, { dnsEnabled: true, blockWeb: false }).steps.at(-1).protocol === "NO ROUTE", "Disconnected WAN fails after DNS");
    const alternateWan = officeTopology();
    alternateWan.devices.push({ id: 8, type: "switch", name: "WAN switch" });
    alternateWan.links = alternateWan.links.filter(([a, b]) => !(a === 4 && b === 5));
    alternateWan.links.push([3, 5], [4, 8], [8, 5]);
    const alternateWeb = webTrace(alternateWan, 1, leases, { dnsEnabled: true, blockWeb: false });
    assert(alternateWeb.steps.at(-1).protocol === "RESPONSE", "Valid WAN path is chosen instead of doubling back through the client LAN");
    assert(alternateWeb.steps.some(s => s.node === 8 && s.protocol === "WEB"), "Alternative WAN switch forwards traffic");
    const bypass = officeTopology();
    bypass.links.push([4, 6]);
    assert(webTrace(bypass, 1, leases, { dnsEnabled: true, blockWeb: true }).steps.at(-1).protocol === "RESPONSE", "A firewall cannot block a route that bypasses it");
    const noDnsServer = officeTopology();
    noDnsServer.devices = noDnsServer.devices.filter(d => d.type !== "server");
    const noDnsLease = dhcpTrace(noDnsServer, 1, true, new Map()).lease;
    assert(noDnsLease.dns === null, "DHCP can succeed without a DNS server");
    assert(webTrace(noDnsServer, 1, new Map([[1, noDnsLease]]), { dnsEnabled: true, blockWeb: false }).error.includes("no DNS server"), "Missing DNS configuration fails explicitly");
    for (const algorithm of ["bubble", "insertion"]) {
        for (const input of [[3, 1, 2], [1, 2, 3], [3, 2, 1], [4, 4, 2, 2], [1], Array.from({ length: 40 }, (_, i) => 40 - i)]) {
            const copy = [...input];
            const frames = sortFrames(input, algorithm);
            assert(JSON.stringify(frames.at(-1).values) === JSON.stringify([...input].sort((a, b) => a - b)), `${algorithm} sorts ${input.length} items`);
            assert(JSON.stringify(input) === JSON.stringify(copy), `${algorithm} does not mutate input`);
            assert(frames.at(-1).action === "complete", `${algorithm} finishes`);
            assert(frames.every((frame, i) => !i || frame.comparisons >= frames[i - 1].comparisons && frame.writes >= frames[i - 1].writes), `${algorithm} counters increase monotonically`);
        }
    }
    const bubbleCounts = sortFrames([3, 2, 1], "bubble").at(-1);
    assert(bubbleCounts.comparisons === 3 && bubbleCounts.writes === 6, "Bubble reverse-input counters are exact");
    const insertionCounts = sortFrames([3, 2, 1], "insertion").at(-1);
    assert(insertionCounts.comparisons === 3 && insertionCounts.writes === 5, "Insertion reverse-input counters are exact");
    const earlyExit = sortFrames([1, 2, 3], "bubble").at(-1);
    assert(earlyExit.comparisons === 2 && earlyExit.writes === 0, "Bubble early exit avoids unnecessary passes");
    for (const name of ["office", "home", "firewall", "dns", "cable"]) {
        const scenario = networkScenario(name);
        assert(scenario.topology.devices.length <= 16 && scenario.lesson.length > 10, "Scenario is bounded and has a lesson");
        const result = dhcpTrace(scenario.topology, 1, scenario.settings.dhcpEnabled, new Map());
        assert(name === "cable" ? !!result.error : !!result.lease, "Only broken cable scenario initially fails DHCP");
    }
    const home = networkScenario("home").topology;
    assert(home.devices.filter(isClient).length === 2, "Phone is a source client");
    assert(dhcpTrace(home, 8, true, new Map()).lease.ip === "192.168.10.101", "Phone gets unique lease");
    home.devices.push({ id: 9, type: "printer", name: "Printer" });
    home.links.push([9, 3]);
    assert(dhcpTrace(home, 9, true, new Map()).lease.ip === "192.168.10.102", "Printer gets unique lease");
    assert(!!validateLink(home, 8, 9), "Endpoint-to-endpoint link is rejected");
    assert(findPath({ devices: home.devices, links: [[3, 8], [8, 4]] }, 3, 4) === null, "Phone cannot act as a forwarding device");
    for (const [input, algorithm] of [[[0], "bubble"], [[101], "insertion"], [Array(41).fill(1), "bubble"], [[1], "eval"], [[NaN], "bubble"]]) {
        let threw = false;
        try { sortFrames(input, algorithm); } catch { threw = true; }
        assert(threw, "Invalid sorting inputs rejected");
    }
    return { passed, message: `${passed} model assertions passed.` };
}

if (typeof document === "undefined") console.log(runLabTests().message);
