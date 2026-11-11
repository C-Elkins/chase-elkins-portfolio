import { parseIPv4, compareSubnet } from "./networking-basics-model.mjs";

const copy = value => structuredClone(value);
const APP = "app.branch.example";
const SERVER = "192.168.20.10";
const DNS = "192.168.10.53";
const baseConfig = () => ({
    client: { ip: "192.168.10.25", prefix: 24, gateway: "192.168.10.1", dns: DNS, link: true, vlan: 10, wireless: false, remote: false },
    dhcp: { start: "192.168.10.100", end: "192.168.10.150", reserved: "192.168.10.20", gateway: "192.168.10.1", dns: DNS },
    network: { trunk: true, route: true, returnRoute: true, allowStaff: true, allowGuest: false, allowManagement: false },
    dns: { record: SERVER },
    service: { port: 443, hostname: APP },
    wifi: { channel: 6, width: 20 },
    vpn: { route: true, mtu: 1400, mss: 1360, icmp: true }
});

export const workbenchDevices = [
    { id: "client", label: "Staff PC", type: "client", x: 90, y: 145 },
    { id: "guest", label: "Guest PC", type: "phone", x: 90, y: 350 },
    { id: "switch", label: "Access switch", type: "switch", x: 285, y: 240 },
    { id: "router", label: "Branch router", type: "router", x: 490, y: 240 },
    { id: "dhcp", label: "DHCP service", type: "server", x: 285, y: 65 },
    { id: "dns", label: "DNS resolver", type: "server", x: 680, y: 65 },
    { id: "server", label: "Application", type: "server", x: 850, y: 180 },
    { id: "printer", label: "Printer", type: "printer", x: 850, y: 350 },
    { id: "ap", label: "Access point", type: "router", x: 285, y: 425 },
    { id: "vpn", label: "VPN gateway", type: "router", x: 650, y: 425 }
];
export const workbenchLinks = [["client", "switch"], ["guest", "switch"], ["switch", "router"], ["dhcp", "switch"], ["router", "dns"], ["router", "server"], ["router", "printer"], ["ap", "switch"], ["router", "vpn"]];

const field = (path, label, device, type, extra = {}) => ({ path, label, device, type, ...extra });
export const workbenchFields = [
    field("client.link", "Access link enabled", "client", "boolean"),
    field("client.ip", "Client IPv4 address", "client", "ip"),
    field("client.prefix", "Client prefix length", "client", "number", { min: 16, max: 30 }),
    field("client.gateway", "Client default gateway", "client", "ip"),
    field("client.dns", "Client DNS resolver", "client", "ip"),
    field("client.vlan", "Access VLAN", "client", "number", { min: 1, max: 4094 }),
    field("dhcp.start", "Dynamic pool start", "dhcp", "ip"),
    field("dhcp.end", "Dynamic pool end", "dhcp", "ip"),
    field("dhcp.reserved", "Static infrastructure address (exclude from pool)", "dhcp", "ip"),
    field("dhcp.gateway", "Offered default gateway", "dhcp", "ip"),
    field("dhcp.dns", "Offered DNS resolver", "dhcp", "ip"),
    field("network.trunk", "Trunk carries staff VLAN 10", "switch", "boolean"),
    field("network.route", "Route to service subnet", "router", "boolean"),
    field("network.returnRoute", "Return route to staff subnet", "router", "boolean"),
    field("network.allowStaff", "Allow staff to application and print services", "router", "boolean"),
    field("network.allowGuest", "Allow guest to internal services", "router", "boolean"),
    field("network.allowManagement", "Allow guest to router management", "router", "boolean"),
    field("dns.record", "app.branch.example A record", "dns", "ip"),
    field("service.port", "Application listening TCP port", "server", "number", { min: 1, max: 65535 }),
    field("service.hostname", "Certificate DNS identity (teaching setting)", "server", "hostname"),
    field("wifi.channel", "2.4 GHz channel (neighbor uses 6)", "ap", "number", { min: 1, max: 11 }),
    field("wifi.width", "Channel width / MHz", "ap", "select", { options: [20, 40] }),
    field("vpn.route", "Tunnel route to branch services", "vpn", "boolean"),
    field("vpn.mtu", "Tunnel IP MTU / bytes (path budget 1400)", "vpn", "number", { min: 576, max: 1500 }),
    field("vpn.mss", "IPv4 TCP MSS / bytes", "vpn", "number", { min: 536, max: 1460 }),
    field("vpn.icmp", "Allow necessary path-MTU diagnostic messages", "vpn", "boolean")
];
const allowed = {
    baseline: ["client.link"],
    addressing: ["client.ip", "client.prefix", "client.gateway", "client.dns", "dhcp.start", "dhcp.end", "dhcp.reserved", "dhcp.gateway", "dhcp.dns"],
    segmentation: ["client.vlan", "network.trunk", "network.route", "network.returnRoute", "network.allowStaff", "network.allowGuest", "network.allowManagement"],
    services: ["dhcp.dns", "dns.record"],
    transport: ["service.port", "service.hostname"],
    wireless: ["wifi.channel", "wifi.width"],
    vpn: ["vpn.route", "vpn.mtu", "vpn.mss", "vpn.icmp"],
    capstone: ["client.link", "dhcp.dns", "dns.record", "network.route", "network.returnRoute", "network.allowStaff", "network.allowGuest", "network.allowManagement", "service.port"]
};
export const workbenchScenarios = Object.freeze({
    baseline: { title: "An isolated staff endpoint", initial: config => { config.client.link = false; } },
    addressing: { title: "Commission a new staff segment", initial: config => { config.dhcp.reserved = "192.168.10.120"; config.dhcp.gateway = config.client.gateway = "192.168.10.254"; } },
    segmentation: { title: "Restore access without opening the guest network", initial: config => { config.client.vlan = 30; config.network.trunk = false; config.network.allowGuest = true; } },
    services: { title: "The application works by address, not by name", initial: config => { config.dhcp.dns = config.client.dns = "192.168.10.99"; } },
    transport: { title: "A service refuses the intended connection", initial: config => { config.service.port = 8443; config.service.hostname = "wrong.branch.example"; } },
    wireless: { title: "Clients associate, but capacity is unusable", initial: config => { config.client.wireless = true; config.wifi.width = 40; } },
    vpn: { title: "Remote users cannot finish large transfers", initial: config => { config.client.remote = true; config.vpn.route = false; config.vpn.mtu = 1500; config.vpn.mss = 1460; } },
    capstone: { title: "A branch-office incident with multiple causes", initial: config => { config.dhcp.dns = config.client.dns = "192.168.10.99"; config.network.route = false; config.network.allowGuest = true; } }
});

export function configValue(config, path) {
    const [group, key] = path.split(".");
    return config[group][key];
}

export function fieldsForScenario(id, device) {
    if (!allowed[id]) throw new RangeError("Unknown workbench scenario.");
    return workbenchFields.filter(item => allowed[id].includes(item.path) && (!device || item.device === device));
}

function validateValue(spec, value) {
    if (spec.type === "boolean" && typeof value === "boolean") return;
    if (spec.type === "ip" && typeof value === "string" && parseIPv4(value) !== null) return;
    if (spec.type === "hostname" && typeof value === "string" && value.length <= 100 && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(value)) return;
    if (spec.type === "number" && Number.isInteger(value) && value >= spec.min && value <= spec.max) return;
    if (spec.type === "select" && spec.options.includes(value)) return;
    throw new TypeError(`Enter a valid value for ${spec.label}.`);
}

function validateConfig(config) {
    if (!config || typeof config !== "object") throw new TypeError("Invalid saved device configuration.");
    const template = baseConfig();
    for (const group of Object.keys(template)) {
        if (!config[group] || Object.keys(config[group]).some(key => !(key in template[group]))) throw new TypeError("Unknown saved configuration setting.");
    }
    if (Object.keys(config).some(key => !(key in template))) throw new TypeError("Unknown saved configuration group.");
    workbenchFields.forEach(spec => validateValue(spec, configValue(config, spec.path)));
    if (typeof config.client.wireless !== "boolean" || typeof config.client.remote !== "boolean") throw new TypeError("Invalid client attachment.");
    if (parseIPv4(config.dhcp.start) > parseIPv4(config.dhcp.end)) throw new TypeError("Dynamic pool start must not exceed its end.");
    return copy(config);
}

export function createWorkbench(id) {
    if (!workbenchScenarios[id]) throw new RangeError("Unknown workbench scenario.");
    const config = baseConfig();
    workbenchScenarios[id].initial(config);
    return { id, version: 1, config, revision: 0, sequence: 0, cache: {}, results: [], pinned: [], undo: [] };
}

export function applyWorkbenchChanges(state, changes) {
    const config = copy(state.config);
    const available = fieldsForScenario(state.id);
    for (const [path, value] of Object.entries(changes)) {
        const spec = available.find(item => item.path === path);
        if (!spec) throw new RangeError("That setting is not editable in this scenario.");
        validateValue(spec, value);
        const [group, key] = path.split(".");
        config[group][key] = value;
    }
    validateConfig(config);
    if (JSON.stringify(config) === JSON.stringify(state.config)) return state;
    return { ...state, config, revision: state.revision + 1, undo: [...state.undo.slice(-19), { config: copy(state.config), cache: copy(state.cache) }] };
}

export function undoWorkbench(state) {
    if (!state.undo.length) return state;
    const previous = state.undo.at(-1);
    return { ...state, config: copy(previous.config), cache: copy(previous.cache), revision: state.revision + 1, undo: state.undo.slice(0, -1) };
}

const wirelessGood = config => [1, 11].includes(config.wifi.channel) && config.wifi.width === 20;
const subnetGood = config => {
    const result = compareSubnet(config.client.ip, "192.168.10.1", config.client.prefix);
    return result.ok && result.same && config.client.prefix === 24
        && !["192.168.10.0", "192.168.10.255", "192.168.10.1", DNS].includes(config.client.ip);
};
const remoteTransferGood = config => config.vpn.route && (config.vpn.mtu <= 1400 || config.vpn.mss <= 1360) && config.vpn.mss + 40 <= config.vpn.mtu;

function pathProblem(config, source, target) {
    if (source === "guest") {
        if (target === "192.168.10.1") return config.network.allowManagement ? null : ["router", "Guest management access is denied by policy."];
        if (!config.network.allowGuest) return ["router", "Guest access to internal services is denied by policy."];
        return config.network.route ? null : ["router", "No route to the service subnet."];
    }
    if (!config.client.link) return ["client", "The client access link is down. No frame reaches the switch."];
    if (config.client.vlan !== 10 || !config.network.trunk) return ["switch", "Staff VLAN 10 is not carried end to end."];
    if (!subnetGood(config)) return ["client", "The client address or /24 prefix does not match the staff segment."];
    const local = compareSubnet(config.client.ip, target, config.client.prefix).same;
    if (!local && config.client.gateway !== "192.168.10.1") return ["client", "The held default gateway is not the branch router. On-link traffic can still work."];
    if (config.client.wireless && !wirelessGood(config)) return ["ap", "This simplified model has overlapping channel use or excessive channel width. Association alone does not meet the capacity objective."];
    if (config.client.remote && !config.vpn.route) return ["vpn", "The tunnel has no route to the branch services."];
    if (!local && !config.network.allowStaff) return ["router", "Staff service traffic is denied by policy."];
    if (!local && !config.network.route) return ["router", "No route to the service subnet."];
    if (!local && !config.network.returnRoute) return ["router", "The return path to the staff subnet is missing."];
    return null;
}

function event(from, to, protocol, detail, ok = true) {
    return { from, to, protocol, detail, ok };
}

export function diagnoseWorkbench(config, action, cache = {}) {
    const source = action.source || "client";
    if (!["client", "guest", "router", "switch", "ap", "vpn", "dhcp", "dns", "server", "printer"].includes(source)) throw new RangeError("Unknown virtual device.");
    const test = action.test;
    const supported = ["config", "ping", "dns", "trace", "tcp", "renew", "flush", "routes", "vlans", "trunks", "acl", "wireless"];
    if (!supported.includes(test)) throw new RangeError("Unsupported diagnostic.");
    if (!["client", "guest"].includes(source) && ["ping", "dns", "trace", "tcp", "renew", "flush", "config"].includes(test)) throw new RangeError("Select Staff PC or Guest PC for this client diagnostic.");
    const result = (ok, output, events = []) => ({ ok, output, events, action: { ...action, source } });
    if (test === "config") {
        const client = source === "guest" ? { ip: "192.168.30.25", prefix: 24, gateway: "192.168.30.1", dns: DNS, vlan: 30, link: true } : config.client;
        return result(true, `SIMULATED Windows client configuration\nIPv4: ${client.ip}/${client.prefix}\nGateway: ${client.gateway}\nDNS resolver: ${client.dns}\nVLAN: ${client.vlan}\nLink: ${client.link ? "up" : "down"}`);
    }
    if (test === "routes" && ["client", "guest"].includes(source)) return result(true, `SIMULATED Windows endpoint route table\nConnected: ${source === "guest" ? "192.168.30.0/24" : compareSubnet(config.client.ip, config.client.ip, config.client.prefix).networkA}\n0.0.0.0/0 via ${source === "guest" ? "192.168.30.1" : config.client.gateway}\nAn endpoint's route print does not expose downstream router tables. Select the router to inspect those.`);
    if (test === "routes") return result(true, `SIMULATED teaching-device route table\n192.168.20.0/24 ${config.network.route ? "via branch service interface" : "MISSING"}\nReturn to 192.168.10.0/24 ${config.network.returnRoute ? "present" : "MISSING"}\nTunnel service route ${config.vpn.route ? "present" : "MISSING"}`);
    if (test === "vlans") return result(true, `SIMULATED VLAN table\nStaff access VLAN: ${config.client.vlan} (required: 10)\nGuest access VLAN: 30`);
    if (test === "trunks") return result(true, `SIMULATED trunk table\nStaff VLAN 10: ${config.network.trunk ? "allowed" : "not allowed"}\nGuest VLAN 30: allowed`);
    if (test === "acl") return result(true, `SIMULATED policy table\nStaff -> services: ${config.network.allowStaff ? "ALLOW" : "DENY"}\nGuest -> internal services: ${config.network.allowGuest ? "ALLOW" : "DENY"}\nGuest -> router management: ${config.network.allowManagement ? "ALLOW" : "DENY"}`);
    if (test === "wireless") return result(wirelessGood(config), `ILLUSTRATIVE 2.4 GHz model\nSelected channel ${config.wifi.channel}, width ${config.wifi.width} MHz\nNeighbor: channel 6\nNonoverlap/width objective: ${wirelessGood(config) ? "met" : "not met"}\nThis is not an RF survey or a throughput prediction.`, [event("client", "ap", "Wi-Fi", wirelessGood(config) ? "Model capacity constraints satisfied." : "Modeled interference/width constraint failed.", wirelessGood(config))]);
    if (test === "flush") return result(true, "SIMULATED resolver cache cleared. Run a fresh lookup.", [event(source, source, "Cache", "Local resolver cache cleared.")]);
    if (test === "renew") {
        if (source !== "client") throw new RangeError("Lease renewal is available for the staff client in this workbench.");
        if (!config.client.link || config.client.vlan !== 10 || !config.network.trunk) return result(false, "SIMULATED DHCP renewal failed: client cannot reach its DHCP service.", [event(source, "switch", "DHCP", "Lease request cannot reach the service.", false)]);
        return result(true, `SIMULATED DHCP renewal\nAddress: ${config.dhcp.start}/24\nGateway: ${config.dhcp.gateway}\nDNS: ${config.dhcp.dns}\nThese options are copied into the client's held lease.`, [event(source, "dhcp", "DHCP", "Client requests configuration."), event("dhcp", source, "DHCP", "Server acknowledges lease and current options.")]);
    }
    const destination = action.destination || APP;
    if (typeof destination !== "string" || destination.length > 100 || !/^[a-z0-9.-]+$/i.test(destination)) throw new TypeError("Enter a supported virtual address or name.");
    const port = action.port ?? 443;
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError("Enter a TCP port from 1 to 65535.");
    if (action.size !== undefined && (!Number.isInteger(action.size) || action.size < 0 || action.size > 1472)) throw new RangeError("Payload size must be from 0 to 1472 bytes.");
    const events = [];
    let target = destination;
    if (test === "dns" || parseIPv4(destination) === null) {
        const resolver = action.resolver || (source === "guest" ? DNS : config.client.dns);
        const held = test !== "dns" && source === "client" ? cache[destination] : null;
        const resolverProblem = held ? null : pathProblem(config, source, DNS);
        if (resolverProblem || (!held && resolver !== DNS)) {
            if (resolverProblem) events.push(event(resolverProblem[0], resolverProblem[0], "Local decision", resolverProblem[1], false));
            else events.push(event(source, "switch", "Resolver reachability", `Attempt to reach configured resolver ${resolver}; no endpoint is present at this address in the simulation.`), event("switch", source, "Timeout", "No response from the configured resolver.", false));
            return result(false, `SIMULATED lookup failed\nResolver: ${resolver}\n${resolverProblem?.[1] || "No response from this virtual DNS server. Inspect the held client lease and DHCP options."}`, events);
        }
        events.push(event(source, held ? source : "dns", held ? "Cache" : "DNS", held ? `Use held ${destination} -> ${held}.` : `Query ${destination} using ${resolver}.`));
        if (destination !== APP && destination !== "printer.branch.example") return result(false, `SIMULATED NXDOMAIN: ${destination} is not in this teaching zone.`, [...events, event("dns", source, "DNS", "Name does not exist in this zone.", false)]);
        target = held || (destination === APP ? config.dns.record : "192.168.20.40");
        events.push(event(held ? source : "dns", source, held ? "Cache" : "DNS", `${destination} -> ${target}`));
        if (test === "dns") return result(true, `SIMULATED direct DNS answer\nServer: ${resolver}\nName: ${destination}\nAddress: ${target}\nLike nslookup, this query bypasses the modeled operating-system cache.`, events);
    }
    const known = [SERVER, DNS, "192.168.10.1", "192.168.20.40"];
    if (!known.includes(target)) return result(false, `SIMULATED: no responding endpoint at ${target}.`, [...events, event("router", "server", "IP", `No modeled endpoint for ${target}.`, false)]);
    const problem = pathProblem(config, source, target);
    events.push(event(source, "switch", "Ethernet", `Source ${source === "guest" ? "192.168.30.25" : config.client.ip}; VLAN ${source === "guest" ? 30 : config.client.vlan}.`, problem?.[0] !== "client"));
    if (problem) return result(false, `SIMULATED ${test.toUpperCase()} failed\n${problem[1]}`, [...events, event(problem[0], problem[0], "Decision", problem[1], false)]);
    const endpoint = target === "192.168.20.40" ? "printer" : target === DNS ? "dns" : target === "192.168.10.1" ? "router" : "server";
    const localTarget = compareSubnet(source === "guest" ? "192.168.30.25" : config.client.ip, target, source === "guest" ? 24 : config.client.prefix).same;
    events.push(localTarget
        ? event("switch", endpoint, "Ethernet / ARP", `On-link destination ${target}: resolve its MAC directly, without using the default gateway.`)
        : event("switch", "router", "IP", `Next hop ${source === "guest" ? "192.168.30.1" : config.client.gateway}; destination ${target}.`));
    if (action.df && (action.size ?? 32) + 28 > (config.client.remote ? Math.min(config.vpn.mtu, 1400) : 1500)) {
        return result(false, `SIMULATED packet too large: ${(action.size ?? 32) + 28} IP bytes exceeds ${config.client.remote ? Math.min(config.vpn.mtu, 1400) : 1500}-byte path budget. IPv4 header 20 + ICMP header 8 + payload.${config.client.remote && !config.vpn.icmp ? "\nThe necessary ICMP diagnostic is blocked; the sender sees a black hole." : ""}`, [...events, event(config.client.remote ? "vpn" : "router", source, "ICMP", config.client.remote && !config.vpn.icmp ? "Oversized DF packet dropped; diagnostic reply suppressed by policy." : "Fragmentation needed; DF prevents fragmentation.", false)]);
    }
    if (test === "tcp") {
        const wantedPort = endpoint === "printer" ? 631 : endpoint === "dns" ? 53 : endpoint === "router" ? 443 : config.service.port;
        if (port !== wantedPort) return result(false, `SIMULATED TCP refused at ${target}:${port}. A route is not proof of a listening service.`, [...events, event("router", endpoint, "TCP", `SYN to port ${port}.`), event(endpoint, source, "TCP", "RST: no modeled listener on this port.", false)]);
        if (config.client.remote && !remoteTransferGood(config)) return result(false, "SIMULATED transfer stalls: tunnel route or MTU/MSS constraints are not satisfied.", [...events, event("vpn", source, "MTU", "Large modeled TCP transfer cannot complete.", false)]);
        events.push(event(localTarget ? "switch" : "router", endpoint, "TCP", `SYN -> SYN-ACK -> ACK, port ${port}.`));
        if (endpoint === "server" && destination === APP && config.service.hostname !== APP) return result(false, `SIMULATED TCP connection: succeeded.\nSeparate teaching follow-up: TLS identity mismatch. Requested ${APP}, certificate identity ${config.service.hostname}. Do not bypass identity validation.\nReal Test-NetConnection alone does not validate TLS.`, [...events, event(endpoint, source, "TLS", "Certificate-name validation failed.", false)]);
        events.push(event(endpoint, source, endpoint === "server" ? "TLS / application" : "IPP", "Requested service completed; return path verified."));
        return result(true, `SIMULATED connection success\nRemote address: ${target}\nTCP port: ${port}\nTCP connection: succeeded\n${destination === APP ? "Separate teaching follow-up: TLS DNS identity matched; application exchange completed.\nReal Test-NetConnection alone does not validate TLS or the application.\n" : "Address-based test does not validate the requested TLS DNS identity.\n"}Timing is illustrative, not measured.`, events);
    }
    events.push(event(localTarget ? "switch" : "router", endpoint, "ICMP", "Diagnostic request delivered."), event(endpoint, source, "ICMP", "Reply returns to the selected source."));
    return result(true, `SIMULATED ${test === "trace" ? `topology walk: ${source} -> switch -> ${localTarget ? "" : "router -> "}${endpoint}\nThe Layer 2 switch is shown for context; a real tracert does not list ordinary switches as TTL hops.` : "reply from " + target}\nReachability is not proof of application or TLS health.\nNo measured latency is available.`, events);
}

export function runWorkbenchDiagnostic(state, action) {
    const result = diagnoseWorkbench(state.config, action, state.cache);
    let next = { ...state, sequence: state.sequence + 1 };
    if (action.test === "renew" && result.ok) {
        next = { ...next, revision: state.revision + 1, config: copy(state.config), cache: {}, undo: [...state.undo.slice(-19), { config: copy(state.config), cache: copy(state.cache) }] };
        Object.assign(next.config.client, { ip: next.config.dhcp.start, prefix: 24, gateway: next.config.dhcp.gateway, dns: next.config.dhcp.dns });
    } else if (action.test === "flush" && (action.source || "client") === "client") next = { ...next, revision: state.revision + 1, cache: {} };
    else if (["tcp", "ping", "trace"].includes(action.test) && (action.source || "client") === "client" && result.ok && action.destination && parseIPv4(action.destination) === null) {
        next.cache = { ...state.cache, [action.destination || APP]: (action.destination || APP) === APP ? state.config.dns.record : "192.168.20.40" };
    }
    const record = { ...result, id: next.sequence, revision: next.revision, config: copy(next.config), cache: copy(next.cache) };
    next.results = [...state.results.slice(-39), record];
    return next;
}

export function pinWorkbenchEvidence(state) {
    const last = state.results.at(-1);
    if (!last) throw new RangeError("Run a diagnostic before pinning evidence.");
    if (last.revision !== state.revision) throw new RangeError("That output is stale. Run a fresh diagnostic.");
    if (state.pinned.some(item => item.id === last.id)) return state;
    return { ...state, pinned: [...state.pinned.slice(-5), copy(last)] };
}

export function verifyWorkbench(state) {
    const config = state.config;
    const checks = [];
    const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });
    const relevant = result => ["tcp", "ping", "dns", "trace", "wireless"].includes(result.action.test)
        && (result.action.source || "client") === "client"
        && [undefined, APP, SERVER, DNS, "192.168.10.1", "192.168.20.40"].includes(result.action.destination);
    check("Pin a relevant failing baseline observation", state.pinned.some(result => !result.ok && relevant(result)));
    check("Pin a successful diagnostic from the current configuration", state.pinned.some(result => result.ok && relevant(result) && result.revision === state.revision));
    check("Required named application succeeds on TCP 443", diagnoseWorkbench(config, { test: "tcp", destination: APP, port: 443 }, state.cache).ok);
    check("Guest access to internal services remains denied", !config.network.allowGuest);
    check("Guest router management access remains denied", !config.network.allowManagement);
    if (state.id === "addressing") {
        const start = parseIPv4(config.dhcp.start), end = parseIPv4(config.dhcp.end), reserved = parseIPv4(config.dhcp.reserved);
        const inStaff = value => value > parseIPv4("192.168.10.0") && value < parseIPv4("192.168.10.255");
        check("Dynamic pool fits the staff /24 and excludes distinct static infrastructure addresses", inStaff(start) && inStaff(end) && inStaff(reserved) && !["192.168.10.1", DNS].includes(config.dhcp.reserved) && start <= end && (reserved < start || reserved > end) && (parseIPv4("192.168.10.1") < start || parseIPv4("192.168.10.1") > end) && (parseIPv4(DNS) < start || parseIPv4(DNS) > end));
        check("Renewed client receives the intended DHCP options", config.client.ip === config.dhcp.start && config.client.dns === DNS && config.client.gateway === "192.168.10.1" && config.dhcp.dns === DNS && config.dhcp.gateway === "192.168.10.1");
    }
    if (["services", "capstone"].includes(state.id)) check("Held client lease and offered resolver agree on the intended DNS service", config.client.dns === DNS && config.dhcp.dns === DNS && config.dns.record === SERVER);
    if (state.id === "wireless") check("Channel avoids neighboring 6 and width is 20 MHz in this model", wirelessGood(config));
    if (state.id === "vpn") check("Tunnel route, MTU/MSS and diagnostic policy satisfy the path budget", remoteTransferGood(config) && config.vpn.icmp);
    if (state.id === "capstone") check("Staff printer service works over IPP", diagnoseWorkbench(config, { test: "tcp", destination: "192.168.20.40", port: 631 }).ok);
    return { passed: checks.every(item => item.ok), checks, revision: state.revision };
}

export function workbenchDiff(state) {
    const initial = createWorkbench(state.id).config;
    return workbenchFields.filter(spec => configValue(initial, spec.path) !== configValue(state.config, spec.path))
        .map(spec => ({ label: spec.label, before: configValue(initial, spec.path), after: configValue(state.config, spec.path) }));
}

export function saveWorkbench(state) {
    return { id: state.id, version: 1, config: copy(state.config), revision: state.revision, cache: copy(state.cache), pinned: state.pinned.map(({ action, revision, config, cache, id }) => ({ action, revision, config, cache, id })) };
}

function validateCache(cache) {
    if (!cache || typeof cache !== "object" || Array.isArray(cache) || Object.entries(cache).some(([name, value]) => ![APP, "printer.branch.example"].includes(name) || typeof value !== "string" || parseIPv4(value) === null)) throw new TypeError("Saved resolver cache is invalid.");
    return copy(cache);
}

export function restoreWorkbench(id, value) {
    if (!value || value.id !== id || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 || !Array.isArray(value.pinned) || value.pinned.length > 6) throw new TypeError("Saved workbench is invalid or unsupported.");
    const state = createWorkbench(id);
    state.config = validateConfig(value.config);
    if (state.config.client.wireless !== (id === "wireless") || state.config.client.remote !== (id === "vpn")) throw new TypeError("Saved client attachment conflicts with the scenario.");
    state.revision = value.revision;
    state.cache = validateCache(value.cache);
    state.pinned = value.pinned.map(item => {
        if (!Number.isSafeInteger(item.id) || item.id < 1 || !Number.isSafeInteger(item.revision) || item.revision < 0 || item.revision > state.revision) throw new TypeError("Saved evidence revision is invalid.");
        const config = validateConfig(item.config), cache = validateCache(item.cache);
        return { ...diagnoseWorkbench(config, item.action, cache), config, cache, revision: item.revision, id: item.id };
    });
    state.sequence = Math.max(0, ...state.pinned.map(item => item.id));
    return state;
}
