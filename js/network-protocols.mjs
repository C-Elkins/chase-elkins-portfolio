import { dhcpTrace, webTrace } from "./lab-model.mjs";

export const protocols = Object.freeze({
    dhcp: {
        name: "DHCP", title: "Get onto the network", layer: "7 / Application", transport: "UDP 68 → 67 / 67 → 68",
        description: "A new client asks for configuration. The router offers an address, the client requests it, and an acknowledgment commits the lease.",
        phases: ["Discover", "Offer", "Request", "Acknowledge"],
        note: "This single-LAN model follows the relevant path, not every broadcast recipient. Relay agents, lease timers, and address-conflict detection are omitted."
    },
    dns: {
        name: "DNS", title: "Find the destination", layer: "7 / Application", transport: "UDP / destination port 53",
        description: "The client asks its configured resolver for the A record of demo.test. A successful answer supplies an address, not a connection.",
        phases: ["Query", "Answer"],
        note: "The configured resolver answers directly. Recursive root/TLD lookups, caching, retries, DNSSEC, and TCP fallback are outside this lesson."
    },
    tcp: {
        name: "TCP", title: "Establish a connection", layer: "4 / Transport", transport: "TCP / destination port 80",
        description: "After resolving demo.test, a SYN, SYN-ACK, and ACK establish a reliable connection. The return route matters just as much as the outgoing route.",
        phases: ["Resolve", "SYN", "SYN-ACK", "ACK"],
        note: "Handshake flags are illustrative. This is not a TCP stack: sequence numbers, congestion control, retransmissions, segmentation, and connection teardown are omitted."
    },
    http: {
        name: "HTTP", title: "Request a resource", layer: "7 / Application", transport: "HTTP/1.1 over TCP / port 80",
        description: "Resolve a name, establish TCP, send a readable HTTP request, then receive a response. Plain HTTP does not keep application content secret.",
        phases: ["Resolve", "Connect", "Request", "Response"],
        note: "One simplified request and response are shown. TCP data acknowledgments, real headers, body segmentation, redirects, and browser rendering are omitted."
    },
    https: {
        name: "HTTPS / TLS", title: "Protect the exchange", layer: "Application security over transport", transport: "HTTP/1.1 + TLS 1.3 over TCP / port 443",
        description: "TCP connects the endpoints; a simplified TLS 1.3 handshake authenticates the server and establishes traffic keys before encrypted HTTP is exchanged.",
        phases: ["Resolve", "Connect", "TLS", "Encrypted request", "Encrypted response"],
        note: "TLS flights are conceptual, not real crypto or a packet capture. Full handshake records, certificate-chain validation, key derivation, and HTTP/2 or HTTP/3 are omitted. DNS and network addresses remain visible in this lesson."
    }
});

function annotate(steps, phase, family, source, destination, summary, packetId) {
    return steps.map(step => ({ ...step, phase, family, source, destination, summary, packetId }));
}

function packet(path, phase, family, source, destination, summary, packetId) {
    return path.map((node, index) => ({
        node, edge: index ? [path[index - 1], node] : null,
        protocol: family, phase, family, source, destination, summary, packetId,
        message: `${family} / ${summary}`
    }));
}

export function protocolTrace(kind, topology, clientId, leases, settings) {
    if (!Object.hasOwn(protocols, kind)) return { error: "Choose a supported protocol lesson." };
    if (kind === "dhcp") {
        const result = dhcpTrace(topology, clientId, settings.dhcpEnabled, leases);
        if (result.error) return result;
        const phases = { DISCOVER: "Discover", OFFER: "Offer", REQUEST: "Request", ACK: "Acknowledge" };
        return {
            ...result,
            steps: result.steps.map(step => {
                const outbound = ["DISCOVER", "REQUEST"].includes(step.protocol);
                return {
                    ...step, phase: phases[step.protocol], family: "DHCP",
                    source: outbound ? "0.0.0.0 : 68" : "192.168.10.1 : 67",
                    destination: outbound ? "255.255.255.255 : 67" : "client : 68",
                    summary: step.message.slice(step.message.indexOf(": ") + 2), packetId: step.protocol
                };
            })
        };
    }
    const result = webTrace(topology, clientId, leases, settings);
    if (result.error) return result;
    const client = leases.get(clientId).ip;
    const dnsSteps = result.steps.filter(step => ["DNS QUERY", "DNS ANSWER", "TIMEOUT"].includes(step.protocol));
    const steps = dnsSteps.flatMap(step => {
        const query = step.protocol === "DNS QUERY";
        const phase = kind === "dns" ? query ? "Query" : "Answer" : "Resolve";
        return annotate([step], phase, step.error ? "ERROR" : "DNS",
            query ? client : "192.168.10.53", query ? "192.168.10.53" : client,
            step.error ? "Resolver unavailable; no answer." : query ? "A record for demo.test?" : "demo.test = 203.0.113.10",
            step.protocol);
    });
    if (kind === "dns" || steps.at(-1)?.error) return { steps };
    const outgoing = result.steps.filter(step => step.protocol === "WEB");
    const failure = result.steps.find(step => step.error);
    const forward = outgoing.map(step => step.node);
    const reverse = [...forward].reverse();
    const port = kind === "https" ? 443 : 80;
    const target = `203.0.113.10 : ${port}`;
    if (failure?.protocol === "NO ROUTE") {
        steps.push(...annotate([failure], kind === "tcp" ? "SYN" : "Connect", "ERROR", client, target, failure.message, "route-error"));
        return { steps };
    }
    const connectPhase = name => kind === "tcp" ? name : "Connect";
    steps.push(...packet(forward, connectPhase("SYN"), "TCP", client, target, `SYN / request a connection on port ${port}`, "syn"));
    if (failure) {
        steps.push(...annotate([failure], connectPhase("SYN"), "ERROR", client, target, "Firewall blocks the TCP connection. No application request is sent.", "denied"));
        return { steps };
    }
    steps.push(...packet(reverse, connectPhase("SYN-ACK"), "TCP", target, client, "SYN + ACK / server accepts the connection", "syn-ack"));
    steps.push(...packet(forward, connectPhase("ACK"), "TCP", client, target, "ACK / connection established", "ack"));
    if (kind === "tcp") return { steps };
    if (kind === "https") {
        steps.push(...packet(forward, "TLS", "TLS", client, target, "ClientHello / supported parameters and key share (visible)", "client-hello"));
        steps.push(...packet(reverse, "TLS", "TLS", target, client, "Server flight / ServerHello, encrypted handshake, certificate, CertificateVerify, Finished", "server-flight"));
        steps.push(...packet(forward, "TLS", "TLS", client, target, "Client checks server certificate and proof; verifies Finished; sends encrypted Finished", "client-finished"));
    }
    steps.push(...packet(forward, kind === "https" ? "Encrypted request" : "Request", kind === "https" ? "TLS" : "HTTP", client, target,
        kind === "https" ? "Encrypted application data / contains HTTP GET / (teaching annotation; not visible on the wire)" : "GET / HTTP/1.1 / Host: demo.test (readable)", "request"));
    steps.push(...packet(reverse, kind === "https" ? "Encrypted response" : "Response", kind === "https" ? "TLS" : "HTTP", target, client,
        kind === "https" ? "Encrypted application data / contains HTTP 200 OK (teaching annotation; not visible on the wire)" : "HTTP/1.1 200 OK / simulated page (readable)", "response"));
    return { steps };
}

export function packetGroups(steps) {
    const groups = [];
    for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        const last = groups.at(-1);
        if (last?.id === step.packetId) last.end = index + 1;
        else groups.push({ id: step.packetId, start: index, end: index + 1, step });
    }
    return groups;
}
