const field = (id, label, initial, options) => ({ id, label, initial, options });
const check = (label, categories, test) => ({ label, categories, test });
const service = (label, test) => check(label, ["service", "control"], test);
const safety = (label, test) => check(label, ["safety", "control"], test);
const operation = (label, test) => check(label, ["control"], test);

export const advancedScenarios = {
    architecture: {
        title: "Keep a branch service available",
        brief: "The primary uplink has failed. Restore the modeled branch-to-service path without exposing management or choosing a link too small for the stated load.",
        limit: "The diagram models one failed primary path, one healthy backup and a fixed 200 Mbit/s demand. It does not measure real traffic, model oversubscription, or predict failure probability.",
        fields: [
            field("path", "Forwarding choice", "primary", [["primary", "Primary only (failed)"], ["backup", "Use backup"], ["auto", "Automatic failover"]]),
            field("backup", "Backup path", "up", [["up", "Available"], ["down", "Disabled"]]),
            field("capacity", "Backup capacity / Mbit/s", "300", [["100", "100"], ["300", "300"], ["500", "500"]]),
            field("management", "Management access", "restricted", [["restricted", "Authorized admins only"], ["open", "Open to all clients"]])
        ],
        checks: [
            service("A healthy backup path carries the required service", c => ["backup", "auto"].includes(c.path) && c.backup === "up"),
            service("Backup capacity covers the modeled 200 Mbit/s demand", c => Number(c.capacity) >= 200),
            safety("Management remains restricted to authorized administrators", c => c.management === "restricted")
        ],
        context: c => `Primary is failed; the configured backup is ${c.backup} with ${c.capacity} Mbit/s capacity.`,
        solutions: [{ path: "backup" }, { path: "auto", capacity: "500" }]
    },
    switching: {
        title: "Repair a campus switch fabric",
        brief: "A branch access switch has the wrong root placement, missing staff trunk membership and an inconsistent aggregation. Restore forwarding while keeping guests isolated.",
        limit: "This model checks configured roles and compatibility; it does not implement every STP state, timer, LACP negotiation or vendor-specific behavior.",
        fields: [
            field("root", "Spanning-tree root", "edge", [["edge", "Edge switch"], ["core-a", "Core A"], ["core-b", "Core B"]]),
            field("trunk", "VLANs carried on the uplink", "none", [["none", "Neither staff nor guest"], ["staff", "Staff VLAN"], ["both", "Staff and guest VLANs, separated"]]),
            field("aggregation", "Link aggregation configuration", "mismatch", [["mismatch", "Mismatched members"], ["lacp", "LACP on both ends"], ["static", "Matching static bundle on both ends"]]),
            field("guest", "Guest-to-staff access", "blocked", [["blocked", "Blocked"], ["open", "Allowed"]])
        ],
        checks: [
            service("The intended root is a core switch rather than an edge device", c => ["core-a", "core-b"].includes(c.root)),
            service("The staff VLAN is present on the uplink", c => ["staff", "both"].includes(c.trunk)),
            service("Both ends agree on the modeled link aggregation", c => ["lacp", "static"].includes(c.aggregation)),
            safety("Guests cannot reach the staff network", c => c.guest === "blocked")
        ],
        context: c => `Root: ${c.root}; trunk: ${c.trunk}; aggregation: ${c.aggregation}. An allowed guest VLAN remains a separate VLAN in this model.`,
        solutions: [{ root: "core-a", trunk: "staff", aggregation: "lacp" }, { root: "core-b", trunk: "both", aggregation: "static" }]
    },
    ospf: {
        title: "Restore interior routing",
        brief: "Two routers disagree about their shared-link area and the return route is missing. Restore adjacency and bidirectional reachability without advertising an unintended default.",
        limit: "This is a two-router teaching model. It compares area IDs and two fixed path costs; it does not simulate full OSPF LSDBs, authentication, timers, or convergence.",
        fields: [
            field("areaA", "Router A shared-link area", "0", [["0", "Area 0"], ["10", "Area 10"]]),
            field("areaB", "Router B shared-link area", "10", [["0", "Area 0"], ["10", "Area 10"]]),
            field("advertisement", "Service prefix advertisement", "present", [["present", "Present"], ["missing", "Missing"]]),
            field("returnRoute", "Return route to branch", "missing", [["present", "Present"], ["missing", "Missing"]]),
            field("cost", "Primary path cost (backup is 20)", "10", [["10", "10"], ["30", "30"]]),
            field("defaultLeak", "Unintended default advertisement", "blocked", [["blocked", "Blocked"], ["allowed", "Allowed"]])
        ],
        checks: [
            service("Neighbors use the same area on the shared link", c => c.areaA === c.areaB),
            service("The service prefix is advertised", c => c.advertisement === "present"),
            service("The service has a return route to the branch", c => c.returnRoute === "present"),
            safety("An unintended default route is not originated", c => c.defaultLeak === "blocked")
        ],
        context: c => `The simplified best path is ${Number(c.cost) < 20 ? "primary" : "backup"}: primary cost ${c.cost}, backup cost 20. A route choice alone does not establish a return path.`,
        solutions: [{ areaB: "0", returnRoute: "present" }, { areaA: "10", returnRoute: "present", cost: "30" }]
    },
    bgp: {
        title: "Apply safe external routing policy",
        brief: "Provider A is unavailable, provider B is up, and the import/export policy is unsafe. Restore the documented destination while preventing accidental transit announcements.",
        limit: "The model uses a deliberately small policy: accept the documented destination, choose an available preferred peer, and export only owned prefixes. It is not the full BGP decision process.",
        fields: [
            field("import", "Import filter", "none", [["none", "Reject the documented destination"], ["target", "Accept only the documented destination"], ["all", "Accept all routes"]]),
            field("export", "Export filter", "all", [["all", "Export every learned route"], ["owned", "Export owned prefixes only"]]),
            field("preference", "Preferred available provider", "a", [["a", "Provider A"], ["b", "Provider B"]]),
            field("peerB", "Provider B session", "up", [["up", "Up"], ["down", "Down"]])
        ],
        checks: [
            service("The documented destination is accepted from an available peer", c => ["target", "all"].includes(c.import) && c.peerB === "up"),
            safety("Imports are limited to the intended destination", c => c.import === "target"),
            safety("Only owned prefixes are exported; learned routes are not leaked", c => c.export === "owned")
        ],
        context: c => `Provider A is down and provider B is ${c.peerB}. Preference ${c.preference.toUpperCase()} applies only among available routes; the model does not invent an unavailable path.`,
        solutions: [{ import: "target", export: "owned", preference: "a" }, { import: "target", export: "owned", preference: "b" }]
    },
    availability: {
        title: "Make gateway failover useful",
        brief: "The active gateway's local link is up but its upstream service path is down. Restore the required service and an appropriate return/session plan without opening management.",
        limit: "This model distinguishes a link-only check from a service-path check and represents session synchronization or draining as high-level choices. Real gateways and applications have different failover semantics.",
        fields: [
            field("detection", "Failure detection", "link", [["link", "Local link only"], ["service", "Upstream service-path health"]]),
            field("active", "Gateway selection", "auto", [["auto", "Automatic"], ["standby", "Manually select healthy standby"]]),
            field("returnPath", "Return path", "primary", [["primary", "Primary gateway only"], ["both", "Valid through either gateway"]]),
            field("sessions", "Existing-session plan", "none", [["none", "No plan"], ["sync", "Synchronize supported state"], ["drain", "Drain and reconnect sessions"]]),
            field("management", "Management access", "restricted", [["restricted", "Authorized admins only"], ["open", "Open to clients"]])
        ],
        checks: [
            service("Traffic selects the healthy standby when the upstream path fails", c => c.active === "standby" || (c.active === "auto" && c.detection === "service")),
            service("Return traffic can reach the active gateway", c => c.returnPath === "both"),
            operation("The change has a session synchronization or drain plan", c => ["sync", "drain"].includes(c.sessions)),
            safety("Management stays restricted", c => c.management === "restricted")
        ],
        context: c => `The primary link remains up but its upstream service path is failed; ${c.detection} monitoring ${c.detection === "link" ? "does not detect that failure" : "detects that failure"}.`,
        solutions: [{ detection: "service", returnPath: "both", sessions: "sync" }, { active: "standby", returnPath: "both", sessions: "drain" }]
    },
    ipv6: {
        title: "Repair a dual-stack service",
        brief: "IPv4 still works, but IPv6 clients have no default router, the AAAA answer is wrong and required ICMPv6 is blocked. Restore the modeled IPv6 path without granting guest access.",
        limit: "The model uses a 1400-byte path and a fixed DNS answer. It illustrates router advertisements, necessary ICMPv6 and a conservative interface MTU; it does not implement SLAAC or a complete firewall.",
        fields: [
            field("router", "Router advertisement default route", "off", [["off", "Not advertised"], ["on", "Advertised"]]),
            field("dns", "AAAA record", "wrong", [["wrong", "Wrong IPv6 destination"], ["correct", "Intended service address"]]),
            field("icmp", "Essential ICMPv6", "blocked", [["blocked", "Blocked"], ["allowed", "Required messages allowed"]]),
            field("mtu", "Modeled IPv6 MTU", "1500", [["1280", "1280 bytes"], ["1400", "1400 bytes"], ["1500", "1500 bytes"]]),
            field("guest", "Guest-to-service policy", "blocked", [["blocked", "Blocked"], ["open", "Allowed"]])
        ],
        checks: [
            service("Clients receive a usable default-router advertisement", c => c.router === "on"),
            service("The AAAA answer identifies the intended service", c => c.dns === "correct"),
            service("Essential ICMPv6 is allowed and the modeled MTU fits the path", c => c.icmp === "allowed" && Number(c.mtu) <= 1400),
            safety("Guests remain blocked from the internal service", c => c.guest === "blocked")
        ],
        context: c => `IPv4 is independently healthy. IPv6 uses the configured advertisement, AAAA answer and ${c.mtu}-byte MTU in this bounded model.`,
        solutions: [{ router: "on", dns: "correct", icmp: "allowed", mtu: "1280" }, { router: "on", dns: "correct", icmp: "allowed", mtu: "1400" }]
    },
    segmentation: {
        title: "Restore service without widening trust",
        brief: "Staff cannot reach the remote service. Repair the permitted flow, stateful return and translation while enforcing ordered guest and management restrictions.",
        limit: "Rules are represented by predefined orderings rather than a full firewall language. The NAT mapping and return state are conceptual, not real packet inspection.",
        fields: [
            field("order", "Rule ordering", "allow-any", [["allow-any", "Allow-any before restrictions"], ["specific", "Specific staff allow and guest deny"], ["deny-first", "Guest deny before staff allow"]]),
            field("staff", "Staff service rule", "deny", [["deny", "Deny"], ["allow", "Allow required service"]]),
            field("returnState", "Established return traffic", "blocked", [["blocked", "Blocked"], ["stateful", "Allowed by state"]]),
            field("nat", "Required translation", "missing", [["missing", "Missing"], ["valid", "Valid scoped mapping"]]),
            field("management", "Management access", "restricted", [["restricted", "Authorized admins only"], ["open", "Open to clients"]])
        ],
        checks: [
            service("The required staff service flow is allowed", c => c.staff === "allow"),
            service("Matching return traffic is allowed by state", c => c.returnState === "stateful"),
            service("The required scoped translation exists", c => c.nat === "valid"),
            safety("Rule order does not let a broad allow bypass guest restrictions", c => ["specific", "deny-first"].includes(c.order)),
            safety("Management is not exposed to clients", c => c.management === "restricted")
        ],
        context: c => `Staff rule: ${c.staff}; return: ${c.returnState}; translation: ${c.nat}; ordering: ${c.order}. Translation is not itself a firewall.`,
        solutions: [{ order: "specific", staff: "allow", returnState: "stateful", nat: "valid" }, { order: "deny-first", staff: "allow", returnState: "stateful", nat: "valid" }]
    },
    infrastructure: {
        title: "Repair site DHCP and DNS",
        brief: "The primary DHCP server is down, the branch receives the wrong options and the internal name is stale. Restore the required site settings and internal resolution while keeping guest access blocked.",
        limit: "The relay, lease, resolver and cache are fixed-state abstractions. Anycast and failover are represented as available alternatives, not modeled protocol implementations.",
        fields: [
            field("relay", "DHCP relay target", "primary", [["primary", "Failed primary only"], ["secondary", "Healthy secondary"], ["anycast", "Available service address"]]),
            field("scope", "Offered site scope", "guest", [["guest", "Guest scope"], ["staff", "Staff scope and gateway"]]),
            field("resolver", "Offered DNS resolver", "external", [["external", "External resolver"], ["internal", "Internal resolver"]]),
            field("record", "Internal DNS record", "wrong", [["wrong", "Wrong service address"], ["correct", "Intended internal address"]]),
            field("cache", "Client lease and cached answer", "stale", [["stale", "Old lease/cache"], ["fresh", "Renewed lease and refreshed answer"]]),
            field("guest", "Guest access to internal service", "blocked", [["blocked", "Blocked"], ["open", "Allowed"]])
        ],
        checks: [
            service("The relay reaches an available DHCP service", c => ["secondary", "anycast"].includes(c.relay)),
            service("The staff scope, gateway and internal resolver are offered", c => c.scope === "staff" && c.resolver === "internal"),
            service("The intended internal record and refreshed client state agree", c => c.record === "correct" && c.cache === "fresh"),
            safety("Guest access remains blocked", c => c.guest === "blocked")
        ],
        context: c => `The primary is down; relay ${c.relay}, scope ${c.scope}, resolver ${c.resolver}, and client state ${c.cache} are modeled separately.`,
        solutions: [{ relay: "secondary", scope: "staff", resolver: "internal", record: "correct", cache: "fresh" }, { relay: "anycast", scope: "staff", resolver: "internal", record: "correct", cache: "fresh" }]
    },
    performance: {
        title: "Control a congested path",
        brief: "A 100 Mbit/s bottleneck carries bulk and interactive traffic through a 1400-byte tunnel path. Improve the modeled queue and transfer behavior without starving other traffic or blocking diagnostics.",
        limit: "Rates and path budgets are teaching inputs, not measured throughput or latency. The queue choices summarize broad behaviors rather than implementing a scheduler.",
        fields: [
            field("shape", "Egress shaping / Mbit/s", "120", [["90", "90"], ["95", "95"], ["120", "120"]]),
            field("queue", "Queue policy", "unbounded", [["unbounded", "Unbounded strict priority"], ["limited", "Rate-limited priority"], ["fair", "Fair queueing"]]),
            field("mtu", "Inner IPv4 MTU", "1500", [["1400", "1400"], ["1500", "1500"]]),
            field("mss", "TCP MSS ceiling", "1460", [["auto", "Automatic from the inner MTU"], ["1360", "1360"], ["1460", "1460"]]),
            field("icmp", "Necessary path diagnostics", "allowed", [["allowed", "Allowed"], ["blocked", "Blocked"]])
        ],
        checks: [
            service("Shaping is below the modeled 100 Mbit/s bottleneck", c => Number(c.shape) < 100),
            service("The chosen queue can serve interactive and bulk traffic", c => ["limited", "fair"].includes(c.queue)),
            service("The tunnel MTU or TCP MSS fits the 1400-byte path budget", c => c.mss === "1360" || (c.mss === "auto" && Number(c.mtu) <= 1400)),
            safety("Strict priority cannot run unbounded", c => c.queue !== "unbounded"),
            safety("Necessary path diagnostics remain allowed", c => c.icmp === "allowed")
        ],
        context: c => `The bottleneck is fixed at 100 Mbit/s; shaping ${c.shape}, queue ${c.queue}, inner MTU ${c.mtu}, and MSS ${c.mss} are configured choices.`,
        solutions: [{ shape: "90", queue: "fair", mtu: "1400", mss: "auto" }, { shape: "95", queue: "limited", mss: "1360" }]
    },
    operations: {
        title: "Correlate an incident and hand it off",
        brief: "A named service fails because both DNS and routing are wrong. Repair the independent causes, preserve guest isolation, and prepare evidence and an honest handoff.",
        limit: "Events and clocks are synthetic. A successful modeled check is not a real packet capture, real production measurement or independent validation of a handoff.",
        fields: [
            field("dns", "Service DNS record", "wrong", [["wrong", "Wrong address"], ["correct", "Intended address"]]),
            field("route", "Route to service network", "missing", [["missing", "Missing"], ["present", "Present"]]),
            field("clock", "Event timestamps", "unsynced", [["unsynced", "Uncorrelated clocks"], ["synced", "Synchronized reference"]]),
            field("logs", "Incident evidence", "off", [["off", "No useful evidence"], ["on", "Relevant synthetic logs retained"], ["capture", "Relevant synthetic capture retained"]]),
            field("guest", "Guest access", "blocked", [["blocked", "Blocked"], ["open", "Allowed"]]),
            field("handoff", "Handoff claim", "overclaim", [["overclaim", "Claim production was verified"], ["truthful", "State the model result and untested limits"]])
        ],
        checks: [
            service("DNS points to the intended service", c => c.dns === "correct"),
            service("A route to that service is present", c => c.route === "present"),
            operation("Timestamps and relevant evidence support correlation", c => c.clock === "synced" && ["on", "capture"].includes(c.logs)),
            safety("Guest access remains blocked", c => c.guest === "blocked"),
            safety("The handoff does not claim unperformed production checks", c => c.handoff === "truthful")
        ],
        context: c => `Synthetic observations: DNS ${c.dns}, route ${c.route}, clocks ${c.clock}, logs ${c.logs}. The handoff choice is ${c.handoff}.`,
        solutions: [{ dns: "correct", route: "present", clock: "synced", logs: "on", handoff: "truthful" }, { dns: "correct", route: "present", clock: "synced", logs: "capture", handoff: "truthful" }]
    },
    capstone: {
        title: "Multi-fault enterprise recovery",
        brief: "A failed primary path, missing staff trunk, stale DNS lease and tunnel sizing fault affect an application and printer. Guest access is also unsafe. Restore the required modeled services and prove the boundaries.",
        limit: "This capstone combines bounded state from earlier modules. It does not contact devices, execute commands, send print jobs, or verify a production network.",
        fields: [
            field("path", "Branch path (primary has failed)", "primary", [["primary", "Failed primary only"], ["backup", "Healthy backup"], ["auto", "Automatic failover to backup"]]),
            field("trunk", "Staff VLAN on trunk", "missing", [["missing", "Missing"], ["present", "Present"]]),
            field("dns", "Internal DNS option", "wrong", [["wrong", "Wrong resolver"], ["correct", "Intended resolver"]]),
            field("lease", "Client lease", "old", [["old", "Old settings held"], ["renewed", "Renewed after option change"]]),
            field("mss", "Tunnel TCP MSS", "1460", [["1360", "1360 bytes"], ["1460", "1460 bytes"]]),
            field("printer", "Staff IPP service", "blocked", [["blocked", "Blocked"], ["allowed", "Allowed to the printer"]]),
            field("guest", "Guest-to-internal access", "open", [["open", "Allowed"], ["blocked", "Blocked"]]),
            field("management", "Management access", "restricted", [["restricted", "Authorized admins only"], ["open", "Open to clients"]]),
            field("rollback", "Change plan", "missing", [["missing", "No rollback plan"], ["ready", "Rollback and retest plan ready"]])
        ],
        checks: [
            service("The healthy branch backup path is selected", c => ["backup", "auto"].includes(c.path)),
            service("The staff VLAN is carried end to end", c => c.trunk === "present"),
            service("The intended resolver is offered and the client lease has been renewed", c => c.dns === "correct" && c.lease === "renewed"),
            service("TCP fits the modeled 1400-byte tunnel budget", c => c.mss === "1360"),
            service("The required staff printer IPP path is allowed", c => c.printer === "allowed"),
            safety("Guest access to internal services is blocked", c => c.guest === "blocked"),
            safety("Management remains restricted", c => c.management === "restricted"),
            operation("A rollback and retest plan is recorded", c => c.rollback === "ready")
        ],
        context: c => `Synthetic multi-fault state: path ${c.path}, trunk ${c.trunk}, resolver ${c.dns}, lease ${c.lease}, MSS ${c.mss}, printer ${c.printer}, guest ${c.guest}.`,
        solutions: [
            { path: "backup", trunk: "present", dns: "correct", lease: "renewed", mss: "1360", printer: "allowed", guest: "blocked", rollback: "ready" },
            { path: "auto", trunk: "present", dns: "correct", lease: "renewed", mss: "1360", printer: "allowed", guest: "blocked", rollback: "ready" }
        ]
    }
};
