export const deviceTypes = Object.freeze({
    client: { label: "Client", icon: "PC" },
    phone: { label: "Phone", icon: "PHONE" },
    printer: { label: "Printer", icon: "PRINT" },
    switch: { label: "Switch", icon: "SW" },
    ap: { label: "Access point", icon: "AP" },
    router: { label: "Router", icon: "RT" },
    firewall: { label: "Firewall", icon: "FW" },
    server: { label: "DNS server", icon: "DNS" },
    internet: { label: "Internet", icon: "WAN" }
});

export const isClient = device => ["client", "phone", "printer"].includes(device.type);

export function networkScenario(name) {
    const topology = officeTopology();
    const settings = { dhcpEnabled: true, dnsEnabled: true, blockWeb: false };
    const lessons = {
        office: "Office / Follow DHCP, then DNS and web traffic. Drag devices to rearrange the workspace.",
        home: "Home Wi-Fi / A phone and laptop share an AP. Request a lease for each client before visiting demo.test.",
        firewall: "Firewall investigation / DNS works, but web traffic is denied. Find the blocking rule and try again.",
        dns: "DNS outage / The client can obtain an IP, but cannot resolve demo.test. Restore the DNS service.",
        cable: "Broken cable / DHCP cannot reach the gateway. Reconnect the switch to the router."
    };
    if (!Object.hasOwn(lessons, name)) throw new Error("Unknown network scenario.");
    if (name === "home") {
        topology.devices.push({ id: 8, type: "phone", name: "Phone", x: 95, y: 272 });
        topology.links.push([8, 2]);
    }
    if (name === "firewall") settings.blockWeb = true;
    if (name === "dns") settings.dnsEnabled = false;
    if (name === "cable") topology.links = topology.links.filter(([a, b]) => !(a === 3 && b === 4));
    return { topology, settings, lesson: lessons[name] };
}

export function officeTopology() {
    return {
        devices: [
            { id: 1, type: "client", name: "Laptop 1", x: 95, y: 62 },
            { id: 2, type: "ap", name: "Access point", x: 285, y: 62 },
            { id: 3, type: "switch", name: "Switch", x: 475, y: 62 },
            { id: 4, type: "router", name: "Router", x: 475, y: 167 },
            { id: 5, type: "firewall", name: "Firewall", x: 665, y: 167 },
            { id: 6, type: "internet", name: "Internet", x: 665, y: 272 },
            { id: 7, type: "server", name: "DNS server", x: 285, y: 167 }
        ],
        links: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7]]
    };
}

export function validateLink(topology, from, to) {
    if (from === to) return "A device cannot connect to itself.";
    const a = topology.devices.find(d => d.id === from);
    const b = topology.devices.find(d => d.id === to);
    if (!a || !b) return "Choose two existing devices.";
    if (topology.links.some(([x, y]) => (x === from && y === to) || (x === to && y === from))) return "That connection already exists.";
    const types = [a.type, b.type];
    if (types.includes("internet") && !types.includes("router") && !types.includes("firewall")) return "Connect the internet endpoint to a router or firewall.";
    if ([a, b].some(isClient) && !types.some(t => ["switch", "ap", "router", "firewall"].includes(t))) return "Connect a client to an AP, switch, router, or firewall.";
    return "";
}

export function findPath(topology, from, to, { lanOnly = false } = {}) {
    const byId = new Map(topology.devices.map(d => [d.id, d]));
    if (!byId.has(from) || !byId.has(to)) return null;
    const queue = [[from]];
    const visited = new Set([from]);
    while (queue.length) {
        const path = queue.shift();
        const current = path.at(-1);
        if (current === to) return path;
        if (current !== from) {
            const type = byId.get(current).type;
            if (isClient(byId.get(current)) || ["server", "internet"].includes(type)) continue;
            if (lanOnly && ["router", "firewall"].includes(type)) continue;
        }
        for (const [a, b] of topology.links) {
            const next = a === current ? b : b === current ? a : null;
            if (next === null || visited.has(next) || !byId.has(next)) continue;
            if (lanOnly && byId.get(next).type === "internet") continue;
            visited.add(next);
            queue.push([...path, next]);
        }
    }
    return null;
}

function traceHops(topology, path, protocol, message) {
    const names = new Map(topology.devices.map(d => [d.id, d.name]));
    return path.map((id, index) => ({
        protocol, node: id, edge: index ? [path[index - 1], id] : null,
        message: `${protocol} / ${names.get(id)}: ${message}`
    }));
}

export function dhcpTrace(topology, clientId, enabled, leases) {
    const client = topology.devices.find(d => d.id === clientId && isClient(d));
    if (!client) return { error: "Add and select a client first." };
    const router = topology.devices.find(d => d.type === "router");
    if (!router) return { error: "No router / DHCP server exists. Add one and connect it to the LAN." };
    const path = findPath(topology, clientId, router.id, { lanOnly: true });
    if (!path) return { error: "DHCP Discover has no Layer-2 path to the router. Check cables; broadcasts cannot cross a router or firewall in this lesson." };
    if (!enabled) return { error: "DHCP is disabled. Discover receives no Offer, so no new lease is issued. An existing lease remains valid in this lesson." };
    const index = topology.devices.filter(isClient).findIndex(d => d.id === clientId);
    const dns = topology.devices.find(d => d.type === "server");
    const lease = leases.get(clientId) || {
        ip: `192.168.10.${100 + index}`, gateway: "192.168.10.1",
        dns: dns ? "192.168.10.53" : null, routerId: router.id, dnsId: dns?.id ?? null
    };
    return {
        lease,
        steps: [
            ...traceHops(topology, path, "DISCOVER", "Client broadcasts a request for network configuration (UDP 68 → 67)."),
            ...traceHops(topology, [...path].reverse(), "OFFER", `DHCP server offers ${lease.ip}/24; not yet committed.`),
            ...traceHops(topology, path, "REQUEST", "Client broadcasts acceptance of the offered address."),
            ...traceHops(topology, [...path].reverse(), "ACK", `Lease acknowledged: ${lease.ip}/24, gateway ${lease.gateway}, DNS ${lease.dns || "not configured"}.`)
        ]
    };
}

export function webTrace(topology, clientId, leases, { dnsEnabled, blockWeb }) {
    const lease = leases.get(clientId);
    if (!lease) return { error: "This client has no IP lease. Run Request IP / DHCP and finish the trace first." };
    if (!lease.dnsId) return { error: "The lease has no DNS server. Add a DNS server, reconnect the topology, and request a new lease." };
    const dnsPath = findPath(topology, clientId, lease.dnsId, { lanOnly: true });
    if (!dnsPath) return { error: "The configured DNS server is unreachable. Check the LAN connections." };
    const steps = traceHops(topology, dnsPath, "DNS QUERY", "Who has an A record for demo.test?");
    if (!dnsEnabled) {
        steps.push({ node: lease.dnsId, protocol: "TIMEOUT", error: true, message: "DNS TIMEOUT / Server is disabled. No address is resolved; no web request can start." });
        return { steps };
    }
    steps.push(...traceHops(topology, [...dnsPath].reverse(), "DNS ANSWER", "demo.test → 203.0.113.10 (simulated documentation address)."));
    const internet = topology.devices.find(d => d.type === "internet");
    const gatewayPath = findPath(topology, clientId, lease.routerId, { lanOnly: true });
    if (!gatewayPath || !internet) {
        steps.push({ node: clientId, protocol: "NO ROUTE", error: true, message: "NO ROUTE / The gateway or internet endpoint is missing or unreachable. DNS resolution alone does not provide internet access." });
        return { steps };
    }
    const externalTopology = {
        devices: topology.devices,
        links: topology.links.filter(link => !link.some(id => gatewayPath.slice(0, -1).includes(id)))
    };
    const externalPath = findPath(externalTopology, lease.routerId, internet.id);
    if (!externalPath) {
        steps.push({ node: lease.routerId, protocol: "NO ROUTE", error: true, message: "NO ROUTE / Gateway has no distinct path to the internet endpoint." });
        return { steps };
    }
    const fullPath = [...gatewayPath, ...externalPath.slice(1)];
    for (let i = 0; i < fullPath.length; i++) {
        const id = fullPath[i];
        const device = topology.devices.find(d => d.id === id);
        steps.push({
            node: id, edge: i ? [fullPath[i - 1], id] : null, protocol: "WEB",
            message: `WEB / ${device.name}: ${device.type === "router" ? "Routes off-subnet traffic toward the internet." : "Forwards the simulated request to 203.0.113.10."}`
        });
        if (device.type === "firewall" && blockWeb) {
            steps.push({ node: id, protocol: "DENY", error: true, message: "FIREWALL DENY / Web traffic matches the block rule. The request never reaches the internet endpoint." });
            return { steps };
        }
    }
    steps.push(...traceHops(topology, [...fullPath].reverse(), "RESPONSE", "Simulated page response returns along the established path."));
    return { steps };
}

export function sortFrames(input, algorithm) {
    if (!["bubble", "insertion"].includes(algorithm)) throw new Error("Unsupported algorithm.");
    if (!Array.isArray(input) || input.length < 1 || input.length > 40 || input.some(n => !Number.isInteger(n) || n < 1 || n > 100)) throw new Error("Provide 1–40 integers between 1 and 100.");
    const values = [...input];
    let comparisons = 0;
    let writes = 0;
    const frames = [{ values: [...values], indices: [], action: "ready", comparisons, writes }];
    const record = (indices, action) => frames.push({ values: [...values], indices, action, comparisons, writes });
    if (algorithm === "bubble") {
        for (let end = values.length - 1; end > 0; end--) {
            let swapped = false;
            for (let i = 0; i < end; i++) {
                comparisons++;
                record([i, i + 1], "compare");
                if (values[i] > values[i + 1]) {
                    [values[i], values[i + 1]] = [values[i + 1], values[i]];
                    writes += 2;
                    swapped = true;
                    record([i, i + 1], "write");
                }
            }
            if (!swapped) break;
        }
    } else {
        for (let i = 1; i < values.length; i++) {
            const key = values[i];
            let j = i - 1;
            while (j >= 0) {
                comparisons++;
                record([j, i], "compare");
                if (values[j] <= key) break;
                values[j + 1] = values[j];
                writes++;
                record([j + 1], "write");
                j--;
            }
            values[j + 1] = key;
            writes++;
            record([j + 1], "write");
        }
    }
    record([], "complete");
    return frames;
}
