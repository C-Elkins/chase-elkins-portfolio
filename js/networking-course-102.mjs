// Networking 102: deeper follow-up to Networking 101. 101 topics are referenced by link, not repeated.
export { gradeModule } from "./networking-course.mjs";

const question = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });
const range = (start, end, step = 1) => Array.from({ length: Math.floor((end - start) / step) + 1 }, (_, index) => start + index * step);
const channel = number => {
    const center = 2407 + 5 * number;
    return [[center - 11, 0], [center - 9, .55], [center - 7, .95], [center + 7, .95], [center + 9, .55], [center + 11, 0]];
};

export const networkingModules102 = [
    {
        id: "n102-subnetting", chapters: ["learn102-subnetting"], title: "Subnet math & VLSM", minutes: 14,
        heading: "Carve address space on purpose",
        intro: "In 101 you used a prefix to decide whether a destination is local. Now you will design the subnets yourself: size each one for its job, place it on a clean boundary and summarize groups of networks so routers carry fewer entries.",
        builds: [["#learn-addresses", "Addresses & subnets", "a prefix splits an address into network and host parts"]],
        goals: ["Calculate network, broadcast and usable host range for any IPv4 prefix.", "Plan a variable-length (VLSM) addressing scheme without overlaps.", "Summarize contiguous networks into one shorter prefix."],
        concepts: [
            ["Every prefix is a power of two", "A /26 leaves 32 − 26 = 6 host bits, so it spans 2⁶ = 64 addresses. In a conventional subnet the first is the network address and the last is the broadcast, leaving 62 usable hosts. Each bit you move from host to network halves the block and doubles the number of subnets."],
            ["The block-size shortcut", "Find the octet where the mask stops being 255 and subtract that octet from 256. For /27 the mask is 255.255.255.224, so the block size is 32 and subnets begin at .0, .32, .64, .96 and so on. For 10.20.30.77/27, 77 falls in the block that starts at 64: network 10.20.30.64, broadcast .95, hosts .65 through .94."],
            ["VLSM: largest first", "Variable-length subnet masking gives each segment only what it needs. Sort the requirements from largest to smallest and allocate in that order. Every block then starts on a boundary that matches its own size, so blocks cannot overlap and the leftover space stays contiguous for future use."],
            ["Summarize to shrink routing tables", "Four networks 10.1.0.0/24 through 10.1.3.0/24 share their first 22 bits, so one route, 10.1.0.0/22, can represent all four. Summaries only work when the networks are contiguous and aligned; otherwise the summary would also claim addresses you do not own."]
        ],
        figures: [
            { type: "bars", log: true, labelWidth: 120, title: "Usable hosts per prefix (log scale)", desc: "Horizontal bars on a logarithmic scale: /24 has 254 usable hosts, /25 126, /26 62, /27 30, /28 14, /29 6 and /30 2.", caption: "Each extra prefix bit halves the block. Logarithmic bars make the halving visible from /24 down to a /30 point-to-point link.",
                items: [["/24", 254], ["/25", 126], ["/26", 62], ["/27", 30], ["/28", 14], ["/29", 6], ["/30", 2]].map(([label, value], index) => ({ label: `${label}  ${["255.255.255.0", ".128", ".192", ".224", ".240", ".248", ".252"][index]}`, value, display: `${value} hosts`, tone: index < 3 ? 1 : 0 })) },
            { type: "stack", labelWidth: 0, total: 256, title: "VLSM plan for 192.168.50.0/24", desc: "A 256-address block divided largest first: staff /25 uses 128 addresses (.0 to .127), guests /26 uses 64 (.128 to .191), printers /27 uses 32 (.192 to .223), a router link /30 uses 4 (.224 to .227) and 28 addresses remain free.", caption: "Staff needs 100 hosts, guests 50, printers 20 and a router link 2. Allocating largest first keeps every block aligned and leaves one contiguous free range.",
                rows: [{ label: "", segments: [
                    { label: "Staff 192.168.50.0/25", short: "Staff /25", value: 128, display: ".0–.127, 126 hosts", tone: 1 },
                    { label: "Guests 192.168.50.128/26", short: "Guests /26", value: 64, display: ".128–.191, 62 hosts", tone: 0 },
                    { label: "Printers 192.168.50.192/27", short: "Print /27", value: 32, display: ".192–.223, 30 hosts", tone: 2 },
                    { label: "Router link 192.168.50.224/30", short: "", value: 4, display: ".224–.227, 2 hosts", tone: 4 },
                    { label: "Free for growth", short: "Free", value: 28, display: ".228–.255", tone: 3 }
                ] }] }
        ],
        takeaway: "Block size = 256 − the interesting mask octet. Allocate largest first, and every subnet lands on a clean boundary.",
        studio: [["ip", "IPv4 forwarding"]],
        lessons: [
            ["Why /31 and /32 exist", "A /32 identifies exactly one address, often a router loopback or a host route. RFC 3021 allows /31 on point-to-point links: with only two devices, neither a network nor a broadcast address is needed, so both addresses are usable. Many networks still use /30 for compatibility."],
            ["Leave room on purpose", "Subnets are hard to resize once devices, firewall rules and documentation depend on them. A common practice is to reserve the adjacent block when a segment is likely to grow, so it can later be summarized or expanded to the next shorter prefix."]
        ],
        practice: ["You own 10.0.0.0/24 and need three departments with at least 50 hosts each. Which prefix fits each department, and what is left over?",
            "50 hosts need 6 host bits (62 usable), so each department gets a /26: 10.0.0.0/26, 10.0.0.64/26 and 10.0.0.128/26. 10.0.0.192/26 remains free and aligned, ready for a fourth department or several smaller subnets."],
        questions: [
            question("How many usable host addresses does a conventional /27 subnet provide?", ["32", "30", "62", "14"], 1, "A /27 has 5 host bits: 2⁵ = 32 addresses, minus the network and broadcast addresses leaves 30 usable hosts."),
            question("What is the network address of 172.16.5.200/26?", ["172.16.5.128", "172.16.5.0", "172.16.5.192", "172.16.5.200"], 2, "/26 has a block size of 64, so blocks start at .0, .64, .128 and .192. 200 falls in the block starting at .192."),
            question("Why does VLSM allocate the largest subnets first?", ["Large subnets are always more important", "So each block lands on a boundary aligned to its own size, avoiding overlaps and fragmentation", "Routers reject small subnets that come first", "It makes broadcast addresses disappear"], 1, "Placing big blocks first keeps every allocation aligned. Small blocks placed first can split the space so a large block no longer fits on a valid boundary."),
            question("Which single route summarizes 192.168.8.0/24 through 192.168.11.0/24?", ["192.168.8.0/22", "192.168.8.0/23", "192.168.0.0/16", "192.168.8.0/21"], 0, "8 through 11 differ only in the last two bits of the third octet, so the first 22 bits are shared. 192.168.8.0/22 covers exactly those four /24 networks.")
        ]
    },
    {
        id: "n102-routing", chapters: ["learn102-routing"], title: "Routing tables & longest match", minutes: 12,
        heading: "How a router picks one path from many",
        intro: "A router does not plan the whole journey. For each packet it reads the destination address, consults its routing table and hands the packet to one next hop. Understanding that single decision explains most routing behavior, including the surprising cases.",
        builds: [["#learn-addresses", "Addresses & subnets", "off-link traffic goes to a gateway"], ["#learn-journey", "A website, end to end", "packets cross several routers"]],
        goals: ["Read a routing table entry: prefix, next hop, interface and source.", "Apply longest-prefix match to choose a route.", "Explain administrative distance, metrics and TTL."],
        concepts: [
            ["Anatomy of a route", "Each entry pairs a destination prefix with where to send matching traffic: a next-hop address, an outgoing interface or both. The table also records how the route was learned (connected, static or a routing protocol) and a metric that compares routes learned from the same source."],
            ["Longest prefix wins", "Several entries can match one destination. The router chooses the most specific match, the one with the longest prefix, regardless of the order entries were added. The default route 0.0.0.0/0 matches everything with zero bits, so it is used only when nothing more specific matches."],
            ["When two sources disagree", "If a static route and a dynamic protocol both offer the same prefix, the router needs a tie-breaker. Administrative distance ranks how much each source is trusted; lower wins. Common Cisco defaults are connected 0, static 1, eBGP 20, OSPF 110 and RIP 120. Other vendors use different names and values, but the idea is the same."],
            ["Hop by hop, and sometimes asymmetric", "Every router repeats the lookup independently, and each one decrements the IP TTL. If TTL reaches zero, the packet is dropped and an ICMP Time Exceeded message may be returned. Traceroute uses that behavior. Return traffic is routed by other tables, so the path back can differ from the path out."]
        ],
        table: { caption: "Example routing table. Destination 10.1.2.50 matches four entries; the /24 is longest, so it wins.", columns: ["Prefix", "Next hop", "Interface", "Learned from"], highlight: 3, rows: [
            ["0.0.0.0/0", "203.0.113.1", "wan0", "Static default"],
            ["10.0.0.0/8", "10.255.0.2", "core0", "OSPF"],
            ["10.1.0.0/16", "10.255.0.6", "core1", "OSPF"],
            ["10.1.2.0/24", "Directly connected", "lan2", "Connected"],
            ["10.1.2.128/25", "10.1.2.254", "lan2", "Static"]
        ] },
        figures: [
            { type: "bars", max: 32, labelWidth: 130, title: "Which entries match 10.1.2.50?", desc: "Prefix lengths compared: /0 matches, /8 matches, /16 matches, /24 matches and is the longest match, /25 (10.1.2.128/25) does not match because .50 is in the lower half.", caption: "Longer bars are more specific. The router uses the longest bar that still matches. 10.1.2.128/25 is longer, but .50 sits outside it.",
                items: [
                    { label: "0.0.0.0/0", value: 0.4, display: "/0 match", tone: 3 },
                    { label: "10.0.0.0/8", value: 8, display: "/8 match", tone: 1 },
                    { label: "10.1.0.0/16", value: 16, display: "/16 match", tone: 1 },
                    { label: "10.1.2.0/24", value: 24, display: "/24 WINNER", tone: 0 },
                    { label: "10.1.2.128/25", value: 25, display: "/25 no match", tone: 2 }
                ] }
        ],
        takeaway: "Most specific match first, administrative distance second, metric third. Each router decides only the next hop.",
        studio: [["ip", "IPv4 forwarding"], ["icmp", "ICMP"]],
        lessons: [
            ["Recursive lookups", "A static route may name a next hop that is not directly connected. The router must then look up the next hop itself to find an outgoing interface. If that second lookup fails, the first route is unusable even though it appears in the configuration."],
            ["Equal-cost multipath", "When several best routes have the same prefix, source and metric, many routers spread flows across them (ECMP). They usually hash fields such as addresses and ports so one connection stays on one path and its packets are not reordered."]
        ],
        practice: ["Using the example table, where does the router send a packet for 10.1.2.200, and for 10.9.9.9?",
            "10.1.2.200 is inside 10.1.2.128/25, which is longer than the /24, so it goes to next hop 10.1.2.254. 10.9.9.9 does not match 10.1.0.0/16 or anything longer, but it does match 10.0.0.0/8, so it goes to 10.255.0.2 via core0. The default route is not used for either."],
        questions: [
            question("Using the example table, which entry forwards a packet to 10.1.2.200?", ["0.0.0.0/0", "10.1.0.0/16", "10.1.2.0/24", "10.1.2.128/25"], 3, "10.1.2.200 is in 10.1.2.128/25 (.128 to .255). That /25 is the longest matching prefix, so it wins over the /24."),
            question("When is a default route (0.0.0.0/0) used?", ["Only when no more specific route matches", "Before every other route", "Only for DNS traffic", "Only when TTL reaches zero"], 0, "A /0 matches every destination with zero bits, making it the least specific possible route. Any longer match takes priority."),
            question("A router learns the same prefix from a static route and from OSPF. With common default settings, which is installed?", ["OSPF, because dynamic routes are newer", "Both, alternating per packet", "The static route, because its administrative distance is lower", "Neither, because they conflict"], 2, "Administrative distance compares sources. Static routes (1 by Cisco default) are trusted more than OSPF (110), unless an administrator changes the values."),
            question("What is the main purpose of the IP TTL field?", ["Encrypting the header", "Choosing the shortest path", "Measuring bandwidth", "Preventing packets from looping forever"], 3, "Each router decrements TTL. At zero, the packet is discarded, so a routing loop cannot circulate it indefinitely. Traceroute deliberately uses small TTL values to reveal hops.")
        ]
    },
    {
        id: "n102-dynamic", chapters: ["learn102-dynamic"], title: "Dynamic routing: OSPF & BGP", minutes: 13,
        heading: "Let routers discover the map themselves",
        intro: "Static routes work until a link fails. Dynamic routing protocols let routers share what they know, react to failures and recompute paths. Different protocol families make very different trade-offs.",
        builds: [["#learn102-routing", "Routing tables & longest match", "the table each protocol fills in"]],
        goals: ["Compare distance-vector, link-state and path-vector routing.", "Compute an OSPF-style shortest path from link costs.", "Explain why BGP is about policy between networks."],
        concepts: [
            ["Distance vector: routing by rumor", "Protocols such as RIP share their route lists with neighbors: \"I can reach network X in 3 hops.\" Each router trusts its neighbors' summaries without seeing the whole topology. It is simple, but it converges slowly and can count to infinity after failures; RIP limits paths to 15 hops for that reason."],
            ["Link state: everyone gets the map", "OSPF routers flood link-state advertisements describing their links and costs. Every router in an area builds the same topology database and runs Dijkstra's shortest-path-first algorithm from its own position. The lowest total cost wins, not the fewest hops. Large networks use areas, all connected to backbone area 0."],
            ["Path vector: the internet's policy engine", "BGP connects autonomous systems (independently run networks, each with an AS number). Routes carry an AS_PATH listing the networks they crossed, which prevents loops and informs choices. BGP selects routes according to policy, contracts and preferences, not just speed. It runs over TCP port 179."],
            ["Interior versus exterior", "Interior gateway protocols such as OSPF, IS-IS and EIGRP find good paths inside one organization. BGP exchanges reachability between organizations. Large networks often run both: an IGP for internal paths, BGP at the edge and sometimes internally (iBGP)."]
        ],
        figures: [
            { type: "graph", width: 640, height: 300, title: "OSPF shortest path from A to E", desc: "Five routers. A to B costs 10 and B to E costs 10, a two-hop path costing 20. A to C, C to D and D to E each cost 1, a three-hop path costing 3. The three-hop path through C and D is highlighted as the shortest.", caption: "Fewer hops is not always cheaper. OSPF adds link costs, so A–C–D–E (cost 3) beats A–B–E (cost 20). Default cost is often reference bandwidth ÷ interface bandwidth.",
                nodes: [{ id: "A", label: "Router A", x: 70, y: 150, tone: 0 }, { id: "B", label: "Router B", x: 320, y: 55 }, { id: "C", label: "Router C", x: 220, y: 248 }, { id: "D", label: "Router D", x: 430, y: 248 }, { id: "E", label: "Router E", x: 570, y: 150, tone: 0 }],
                edges: [{ from: "A", to: "B", label: "cost 10" }, { from: "B", to: "E", label: "cost 10" }, { from: "A", to: "C", label: "cost 1", state: "path", arrow: true }, { from: "C", to: "D", label: "cost 1", state: "path", arrow: true, dy: 18 }, { from: "D", to: "E", label: "cost 1", state: "path", arrow: true }, { from: "B", to: "D", label: "cost 5", dx: 22 }] }
        ],
        takeaway: "IGPs optimize paths inside your network; BGP applies policy between networks. Convergence time is how long the map is wrong after a change.",
        studio: [["bgp", "BGP session"], ["ip", "IPv4 forwarding"]],
        lessons: [
            ["Convergence is the real metric", "After a link fails, routers briefly disagree about the topology. Packets may be dropped or loop until every router has recomputed. Faster failure detection, for example with BFD, and smaller flooding domains reduce that window."],
            ["Why one BGP mistake can be global", "BGP largely trusts what peers announce. A network that mistakenly announces someone else's prefix, or a more specific part of it, can attract that traffic (a route leak or hijack). RPKI route-origin validation lets networks check whether an AS is authorized to originate a prefix."]
        ],
        practice: ["In the figure, the C–D link fails. Which path does Router A choose to reach E now, and at what cost?",
            "Without C–D, the candidates are A–B–E (10 + 10 = 20) and A–B–D–E (10 + 5 + 1 = 16). A–B–D–E is cheaper, so OSPF installs it with cost 16 once the routers have flooded the change and rerun SPF."],
        questions: [
            question("How does OSPF choose between paths?", ["Fewest routers", "Lowest total link cost", "Highest AS number", "Most recently learned"], 1, "OSPF sums interface costs along each path and installs the lowest total. A longer path with cheaper links can win."),
            question("Which protocol exchanges routes between autonomous systems on the internet?", ["RIP", "OSPF", "BGP", "ARP"], 2, "BGP is the path-vector exterior protocol that connects independently operated networks. OSPF and RIP are interior protocols."),
            question("What does \"link state\" mean in OSPF?", ["Routers share only their best routes", "Routers ask a central server for paths", "Each link stores its own copy of the table", "Every router learns the same topology and computes its own shortest paths"], 3, "Link-state routers flood descriptions of links. Each builds an identical database and runs SPF from its own point of view."),
            question("Count-to-infinity is a classic weakness of which family?", ["Distance-vector protocols", "Link-state protocols", "Path-vector protocols", "Static routing"], 0, "Distance-vector routers rely on neighbors' summaries. After a failure, two routers can keep advertising a dead route to each other with increasing metrics. Hop limits and split horizon reduce this.")
        ]
    },
    {
        id: "n102-nat", chapters: ["learn102-nat"], title: "NAT, PAT & stateful firewalls", minutes: 13,
        heading: "Share one public address and control what comes in",
        intro: "Most homes and offices put many private devices behind one public IPv4 address. Network address translation makes that work, and a stateful firewall decides which traffic may pass. They often live in the same box, but they solve different problems.",
        builds: [["#learn-addresses", "Addresses & subnets", "private address ranges"], ["#learn-security", "Safer network habits", "access control versus encryption"]],
        goals: ["Trace a connection through a PAT translation table.", "Explain why NAT is not a firewall, and what a stateful firewall adds.", "Recognize CGNAT and double NAT symptoms."],
        concepts: [
            ["Port address translation", "When a laptop at 192.168.1.20 opens a connection, the router replaces the private source address and port with its public address and a port it chooses, then records the mapping. Replies arrive at that public port and are translated back. Because the port distinguishes conversations, thousands of inside connections can share one public IPv4 address."],
            ["Inbound needs an explicit mapping", "An unsolicited packet arriving from the internet matches no translation entry, so the router has nowhere to send it. Port forwarding (destination NAT) creates a permanent mapping such as public TCP 8443 to 192.168.1.50:443. Only forward what you intend to publish, and keep that service patched."],
            ["NAT is not the policy", "NAT hides addresses as a side effect, but the protection comes from the stateful firewall. It tracks each connection's state and allows replies to established flows while dropping new inbound flows unless a rule permits them. IPv6 networks usually skip NAT entirely, so they rely on that firewall policy directly."],
            ["Rules are read top-down", "Firewall and ACL rules are typically evaluated in order, and the first match wins. A broad allow placed above a specific deny makes the deny unreachable. Most policies end with an implicit deny for anything not explicitly allowed."]
        ],
        table: { caption: "PAT translation table on a router with public address 198.51.100.7", columns: ["Inside (private)", "Translated (public)", "Remote", "Protocol"], rows: [
            ["192.168.1.20:51514", "198.51.100.7:40001", "203.0.113.10:443", "TCP"],
            ["192.168.1.33:51514", "198.51.100.7:40002", "203.0.113.10:443", "TCP"],
            ["192.168.1.20:53001", "198.51.100.7:40003", "192.0.2.53:53", "UDP"]
        ] },
        figures: [
            { type: "graph", width: 640, height: 220, title: "One outbound connection through PAT", desc: "A laptop at 192.168.1.20 sends to a router; the router rewrites the source to 198.51.100.7 port 40001 and forwards to a server at 203.0.113.10. The reply follows the same mapping back.", caption: "The server only sees the router's public address and port. The translation entry is how the reply finds its way back to the right laptop.",
                nodes: [{ id: "L", label: "Laptop", sub: "192.168.1.20", x: 80, y: 110, tone: 1 }, { id: "R", label: "Router + NAT", sub: "198.51.100.7", x: 320, y: 110, tone: 0 }, { id: "S", label: "Server", sub: "203.0.113.10", x: 560, y: 110, tone: 3 }],
                edges: [{ from: "L", to: "R", label: "src :51514", state: "path", arrow: "both", dy: -14 }, { from: "R", to: "S", label: "src 198.51.100.7:40001", state: "path", arrow: "both", dy: -14 }] }
        ],
        takeaway: "NAT rewrites addresses; the stateful firewall enforces policy. Inbound connections need a deliberate rule or mapping.",
        studio: [["ip", "IPv4 forwarding"], ["tcp", "TCP handshake"]],
        lessons: [
            ["Carrier-grade NAT and double NAT", "Some ISPs place customers behind their own NAT, using shared space 100.64.0.0/10. If your router's WAN address is in that range, or is private, port forwarding on your router cannot work because another NAT sits upstream. Double NAT inside a home (two routers both translating) causes similar trouble; bridge mode on one device usually fixes it."],
            ["Timeouts break idle connections", "Translation and firewall state entries expire after inactivity. UDP mappings may last only tens of seconds; TCP mappings last longer. Applications send keep-alives so long-lived but quiet connections, such as messaging or VPN tunnels, are not silently forgotten."]
        ],
        practice: ["Your router's WAN address is 100.72.14.9. You forwarded TCP 25565 to a game server, but friends cannot connect. What is the likely cause?",
            "100.72.14.9 is inside 100.64.0.0/10, the shared CGNAT range. Your ISP is translating again upstream, so inbound connections never reach your router. Options include asking the ISP for a public IPv4 address, using IPv6 with a firewall rule, or using a relay or tunnel service."],
        questions: [
            question("Two laptops connect from the same source port to the same server. How does PAT keep them apart?", ["It rejects the second laptop", "It assigns a different public source port to each connection", "It changes the server's address", "It sends both replies to both laptops"], 1, "Each connection gets its own public port in the translation table, so replies map back to the correct inside host and port."),
            question("An unsolicited inbound packet reaches a NAT router with no matching mapping or forwarding rule. What normally happens?", ["It is dropped", "It is delivered to every inside host", "It is sent to the DHCP server", "It is converted to IPv6"], 0, "Without a translation entry or permitting rule, the router has no inside destination, and a stateful firewall would drop it anyway."),
            question("A firewall lists \"allow any any\" above \"deny TCP 23\". What is the effect on Telnet?", ["Telnet is blocked", "Telnet is encrypted", "Telnet is allowed, because the first matching rule wins", "The firewall merges both rules"], 2, "With top-down, first-match evaluation, the broad allow matches first. Place specific denies above broader allows."),
            question("Your router's WAN address is 100.64.12.3. Why might port forwarding fail?", ["The address is IPv6", "Port forwarding needs DNSSEC", "The router's firewall is disabled", "The ISP is using carrier-grade NAT upstream"], 3, "100.64.0.0/10 is shared address space for CGNAT. Another translation happens before traffic reaches your router.")
        ]
    },
    {
        id: "n102-vlans", chapters: ["learn102-vlans"], title: "VLANs & trunking", minutes: 12,
        heading: "Many networks on one set of switches",
        intro: "A VLAN turns one physical switch into several logical ones. Each VLAN is its own broadcast domain, usually with its own subnet, so staff, guests and devices can share cabling without sharing a network.",
        builds: [["#learn-hardware", "Follow the hardware", "switches learn MAC addresses and flood within a VLAN"]],
        goals: ["Distinguish access ports, trunk ports and the native VLAN.", "Read the fields of an 802.1Q tag.", "Explain why traffic between VLANs needs routing."],
        concepts: [
            ["Access ports and trunk ports", "An access port belongs to one VLAN and sends ordinary untagged frames, so the attached computer does not know VLANs exist. A trunk carries several VLANs between switches, routers or access points, marking each frame with an 802.1Q tag so the receiver knows which VLAN it belongs to."],
            ["Inside the 802.1Q tag", "The switch inserts 4 bytes after the source MAC address: a 16-bit TPID value 0x8100 that announces the tag, 3 priority bits (PCP), 1 drop-eligible bit (DEI) and a 12-bit VLAN ID. Twelve bits give 4,096 values; 0 and 4095 are reserved, leaving 1 through 4094."],
            ["The native VLAN", "On a trunk, one VLAN may be sent untagged: the native VLAN. Both ends must agree, or frames leak into the wrong VLAN. A common hardening step is to set the native VLAN to an unused ID and allow only the VLANs each trunk actually needs."],
            ["Crossing VLANs requires a router", "Two devices in different VLANs are in different broadcast domains, and usually different subnets, even on the same switch. Traffic between them must be routed, by a router with one subinterface per VLAN (router-on-a-stick) or by a Layer 3 switch with a virtual interface per VLAN. That routing point is also where you apply firewall policy."]
        ],
        figures: [
            { type: "stack", labelWidth: 110, total: 34, title: "Ethernet header with and without an 802.1Q tag (bytes)", desc: "Untagged frame header: destination MAC 6 bytes, source MAC 6, EtherType 2, then payload and a 4-byte FCS. Tagged frame inserts a 4-byte 802.1Q tag between the source MAC and EtherType.", caption: "Only the header and trailer are to scale; the payload (46–1500 bytes) is shortened. The tag adds 4 bytes, which is why trunk links accept 1522-byte frames.",
                rows: [
                    { label: "Untagged", segments: [{ label: "Destination MAC", short: "Dst MAC 6", value: 6, display: "6 bytes", tone: 1 }, { label: "Source MAC", short: "Src MAC 6", value: 6, display: "6 bytes", tone: 1 }, { label: "EtherType", short: "Type 2", value: 2, display: "2 bytes", tone: 3 }, { label: "Payload", short: "Payload…", value: 12, display: "46–1500 bytes (shortened)", tone: 4 }, { label: "FCS checksum", short: "FCS 4", value: 4, display: "4 bytes", tone: 3 }] },
                    { label: "802.1Q", segments: [{ label: "Destination MAC", short: "Dst MAC 6", value: 6, display: "6 bytes", tone: 1 }, { label: "Source MAC", short: "Src MAC 6", value: 6, display: "6 bytes", tone: 1 }, { label: "802.1Q tag", short: "Tag 4", value: 4, display: "4 bytes", tone: 0 }, { label: "EtherType", short: "Type 2", value: 2, display: "2 bytes", tone: 3 }, { label: "Payload", short: "Payload…", value: 12, display: "46–1500 bytes (shortened)", tone: 4 }, { label: "FCS checksum", short: "FCS 4", value: 4, display: "4 bytes", tone: 3 }] }
                ] },
            { type: "stack", labelWidth: 110, total: 32, title: "Inside the 4-byte tag (bits)", desc: "The 32-bit 802.1Q tag: TPID 16 bits, PCP priority 3 bits, DEI 1 bit and VLAN ID 12 bits.", caption: "The 12-bit VLAN ID limits a network to 4094 usable VLANs. PCP carries the Layer 2 priority used by some QoS designs.",
                rows: [{ label: "802.1Q tag", segments: [{ label: "TPID 0x8100", short: "TPID 0x8100", value: 16, display: "16 bits", tone: 0 }, { label: "PCP priority", short: "PCP", value: 3, display: "3 bits", tone: 2 }, { label: "DEI", short: "", value: 1, display: "1 bit", tone: 3 }, { label: "VLAN ID", short: "VID 12 bits", value: 12, display: "12 bits", tone: 1 }] }] }
        ],
        takeaway: "One VLAN = one broadcast domain = usually one subnet. Trunks tag; access ports do not; routing joins VLANs.",
        studio: [["ethernet", "Ethernet switching"]],
        lessons: [
            ["VLAN hopping and how to prevent it", "If a switch port negotiates a trunk automatically, an attacker might send tagged frames into other VLANs. Disable automatic trunk negotiation on user ports, make them access-only, and avoid using the native VLAN for real traffic."],
            ["Wireless SSIDs map to VLANs", "An enterprise access point often connects with a trunk and maps each SSID to a VLAN: Staff to VLAN 10, Guest to 20, IoT to 30. The wireless name is only a label; the VLAN and the policy at the routing point decide what each group can reach."]
        ],
        practice: ["Two PCs plug into the same switch. One is in VLAN 10 (10.10.0.0/24), the other in VLAN 20 (10.20.0.0/24). They cannot ping each other. Is the switch broken?",
            "No. That is VLAN isolation working. Each VLAN is a separate broadcast domain and subnet. To communicate, traffic must be routed via a router or Layer 3 switch with an interface in each VLAN, and any firewall rules there must allow it."],
        questions: [
            question("What is a trunk port mainly used for?", ["Powering access points", "Carrying several VLANs over one link using tags", "Blocking all broadcasts", "Assigning IP addresses"], 1, "A trunk carries frames for multiple VLANs and tags each frame (except the native VLAN) so the far end can separate them."),
            question("How many usable VLAN IDs does the 12-bit 802.1Q field provide?", ["4094", "256", "1024", "65,535"], 0, "12 bits give 4096 values; IDs 0 and 4095 are reserved, leaving 1 through 4094."),
            question("A broadcast is sent by a host in VLAN 20. Where can it be delivered?", ["Every port on the switch", "Only to the default gateway", "Only ports and trunks carrying VLAN 20", "Every VLAN that shares a trunk"], 2, "A VLAN is a broadcast domain. The switch floods the broadcast only to access ports in VLAN 20 and trunks that allow VLAN 20."),
            question("Why should both ends of a trunk agree on the native VLAN?", ["Otherwise tags become encrypted", "Otherwise the link speed halves", "Otherwise DHCP stops working everywhere", "Otherwise untagged frames land in the wrong VLAN"], 3, "Untagged frames are assigned to each side's native VLAN. A mismatch silently moves traffic between VLANs, which is both a fault and a security risk.")
        ]
    },
    {
        id: "n102-stp", chapters: ["learn102-stp"], title: "Loops & Spanning Tree", minutes: 11,
        heading: "Redundant links without a meltdown",
        intro: "Extra links between switches add resilience, but an Ethernet loop can take a whole network down in seconds. Spanning Tree Protocol keeps the redundancy while blocking just enough to remove loops.",
        builds: [["#learn-hardware", "Follow the hardware", "switches flood broadcasts and unknown destinations"], ["#learn102-vlans", "VLANs & trunking", "trunks between switches"]],
        goals: ["Explain why Layer 2 loops cause broadcast storms.", "Follow root bridge election and port roles.", "Choose edge-port and guard features for user ports."],
        concepts: [
            ["Why loops are so destructive", "IP packets carry a TTL, but Ethernet frames do not. In a loop, a broadcast is flooded out of every port, comes back around and is flooded again. Copies multiply, links saturate, MAC tables flap between ports and the network may stop responding."],
            ["Electing a root", "Switches exchange BPDUs. The switch with the lowest bridge ID, priority first and then MAC address, becomes the root bridge. Set the priority deliberately on a central core switch rather than letting the oldest switch with the lowest MAC win by accident."],
            ["Port roles", "Every non-root switch chooses one root port: its lowest-cost path to the root. Each link chooses a designated port that forwards toward that segment. Remaining ports become alternate or blocked. If an active link fails, a blocked port can move to forwarding."],
            ["From STP to RSTP", "Original 802.1D STP could take 30 to 50 seconds to converge. Rapid Spanning Tree (802.1w) usually converges in seconds or less by negotiating directly between neighbors. Many networks also run a separate tree per VLAN or VLAN group."]
        ],
        figures: [
            { type: "graph", width: 640, height: 280, title: "Spanning tree on a three-switch triangle", desc: "Switch 1 is the root bridge. Links from Switch 2 and Switch 3 to the root are forwarding through their root ports. The link between Switch 2 and Switch 3 is blocked on Switch 3's side, breaking the loop.", caption: "All three links stay cabled. STP blocks one port so there is exactly one active path between any two switches; if a root link fails, the blocked port can take over.",
                nodes: [{ id: "S1", label: "Switch 1", sub: "ROOT / prio 4096", x: 320, y: 50, tone: 0 }, { id: "S2", label: "Switch 2", sub: "prio 32768", x: 140, y: 225 }, { id: "S3", label: "Switch 3", sub: "prio 32768", x: 500, y: 225 }],
                edges: [{ from: "S2", to: "S1", label: "root port → forwarding", state: "path", arrow: true, dx: -50 }, { from: "S3", to: "S1", label: "root port → forwarding", state: "path", arrow: true, dx: 50 }, { from: "S2", to: "S3", label: "blocked on Switch 3", state: "blocked", dy: 22 }] },
            { type: "line", title: "One broadcast in a loop (illustrative model)", desc: "With no loop protection, copies of one broadcast double on each pass through a two-path loop: 1, 2, 4, 8, 16, 32, 64. With spanning tree, the count stays at one.", caption: "A simplified model, not a measurement. Real storms are limited only by link capacity, which they quickly consume.",
                x: { label: "Passes around the loop", max: 6, ticks: range(0, 6) }, y: { label: "Copies in flight", max: 70, ticks: [0, 16, 32, 48, 64] },
                series: [{ label: "No STP", points: range(0, 6).map(pass => [pass, 2 ** pass]), tone: 2, area: true, tag: { at: [4.4, 40], text: "No STP" } }, { label: "With STP", points: [[0, 1], [6, 1]], tone: 0, tag: { at: [5.2, 7], text: "With STP" } }] }
        ],
        takeaway: "Ethernet frames have no TTL. Spanning Tree turns a meshed topology into a loop-free tree and keeps blocked links ready for failover.",
        studio: [["ethernet", "Ethernet switching"]],
        lessons: [
            ["Edge ports and guards", "Ports connected to computers and printers should be edge ports (PortFast), so they forward immediately instead of waiting for STP timers. Pair them with BPDU guard: if a switch is ever plugged into an edge port, the port shuts down instead of joining the topology."],
            ["Aggregation adds bandwidth without blocking", "Link aggregation, often negotiated with LACP, bundles several physical links into one logical link. STP sees one link, so nothing is blocked, and traffic is spread across members by flow."]
        ],
        practice: ["A user plugs both ends of a patch cable into two wall ports on the same switch. Moments later, the floor's network becomes unusable. What happened, and which features would have contained it?",
            "The cable created a Layer 2 loop and a broadcast storm. With STP or RSTP running, one port would have been blocked. BPDU guard on edge ports would shut a port that receives BPDUs, and storm control can rate-limit broadcast floods."],
        questions: [
            question("Why can a Layer 2 loop circulate frames forever?", ["Ethernet frames have no TTL field", "Switches encrypt broadcasts", "MAC addresses expire too quickly", "Routers forward broadcasts"], 0, "Without a hop limit, flooded frames keep circulating and multiplying until the loop is broken."),
            question("How is the STP root bridge chosen?", ["The switch with the most ports", "The newest switch", "The lowest bridge ID: priority, then MAC address", "The switch with the highest IP address"], 2, "Lowest bridge ID wins. Administrators set a lower priority on the intended core switch so the election is predictable."),
            question("What is the purpose of a blocked STP port?", ["To permanently disable a faulty cable", "To break the loop while keeping a backup path ready", "To double bandwidth", "To filter one VLAN"], 1, "The redundant link stays connected but does not forward. If an active path fails, STP can move the blocked port to forwarding."),
            question("Which ports should be configured as edge ports (PortFast)?", ["Trunks between core switches", "Every port on every switch", "Links to the root bridge", "Ports connected to end devices such as PCs and printers"], 3, "End devices do not create loops, so edge ports can forward immediately. Use BPDU guard in case someone connects a switch there.")
        ]
    },
    {
        id: "n102-ipv6", chapters: ["learn102-ipv6"], title: "IPv6 in depth", minutes: 14,
        heading: "IPv6: more than longer addresses",
        intro: "IPv6 changes how hosts find routers, configure themselves and resolve neighbors. Once you know its address structure and the role of ICMPv6, it can be simpler than IPv4 because there is so much space.",
        builds: [["#learn-addresses", "Addresses & subnets", "prefixes and ARP"], ["#learn102-nat", "NAT, PAT & stateful firewalls", "why IPv4 needs translation"]],
        goals: ["Write and compress IPv6 addresses correctly.", "Explain the /64 boundary, address types and SLAAC.", "Describe NDP and why ICMPv6 must not be blocked wholesale."],
        concepts: [
            ["Reading and shortening addresses", "An IPv6 address is 128 bits written as eight groups of four hex digits. Drop leading zeros in any group, and replace one run of all-zero groups with ::. So 2001:0db8:0000:0000:0000:0000:0000:0001 becomes 2001:db8::1. Use :: only once, or the address becomes ambiguous."],
            ["The /64 boundary", "A typical LAN uses a /64: 64 bits identify the network and 64 bits identify the interface. Sites are often given a /48 or /56 and number their LANs with the bits in between, the subnet ID. Many automatic features, including SLAAC, assume /64 LANs."],
            ["Address types you will see", "Every IPv6 interface has a link-local address in fe80::/10, used to talk to neighbors and routers on that link. Global unicast addresses (currently from 2000::/3) are routable. Unique local addresses (fd00::/8 in practice) are private. There is no broadcast; multicast groups such as ff02::1 (all nodes) do that job selectively."],
            ["Neighbor Discovery replaces ARP", "NDP uses ICMPv6. Hosts send Router Solicitations, routers reply with Router Advertisements containing prefixes and flags. Neighbor Solicitation and Advertisement map addresses to MAC addresses, and Duplicate Address Detection checks that a new address is unused. Block ICMPv6 indiscriminately and IPv6 stops working."]
        ],
        figures: [
            { type: "stack", labelWidth: 0, total: 128, title: "Anatomy of 2001:db8:acad:12::1/64", desc: "The 128-bit address split into a 48-bit global routing prefix 2001:db8:acad, a 16-bit subnet ID 0012 and a 64-bit interface ID 0000:0000:0000:0001.", caption: "A site assigned 2001:db8:acad::/48 controls 16 bits of subnet ID: 65,536 separate /64 LANs, each with a 64-bit interface space.",
                rows: [{ label: "", segments: [{ label: "Global routing prefix 2001:db8:acad", short: "Routing prefix /48", value: 48, display: "48 bits, from the provider", tone: 1 }, { label: "Subnet ID 0012", short: "Subnet 16", value: 16, display: "16 bits, chosen by the site", tone: 2 }, { label: "Interface ID ::1", short: "Interface ID 64 bits", value: 64, display: "64 bits, per device", tone: 0 }] }] },
            { type: "bars", log: true, labelWidth: 150, title: "/64 LANs available per site allocation (log scale)", desc: "A /48 provides 65,536 /64 subnets, a /56 provides 256, and a /60 provides 16.", caption: "Plan subnets by function and location; with a /48 or /56 you rarely need to squeeze.",
                items: [{ label: "/48 site", value: 65536, display: "65,536 LANs", tone: 0 }, { label: "/56 site", value: 256, display: "256 LANs", tone: 1 }, { label: "/60 site", value: 16, display: "16 LANs", tone: 2 }] }
        ],
        takeaway: "Think in /64 LANs, expect several addresses per interface and treat ICMPv6 as essential. A firewall, not NAT, provides IPv6 policy.",
        studio: [["ipv6", "IPv6 router discovery"], ["icmp", "ICMP"]],
        lessons: [
            ["SLAAC, DHCPv6 and privacy addresses", "With SLAAC, a host combines the advertised /64 prefix with an interface ID it generates. Modern systems use stable random or temporary interface IDs, not the MAC address, for privacy. DHCPv6 can assign addresses or just provide options such as DNS servers; the Router Advertisement flags tell hosts which to use. Hosts learn their default gateway from Router Advertisements, not DHCPv6."],
            ["Dual stack and happy eyeballs", "Most networks run IPv4 and IPv6 side by side. Clients look up both AAAA and A records and race connections, preferring IPv6 but quickly falling back if it fails. A broken IPv6 path can therefore show up only as small delays, which makes it easy to miss."]
        ],
        practice: ["A host's only IPv6 address is fe80::1c2a:3bff:fe4d:12/64, and it can reach the router but not any website over IPv6. What is missing?",
            "fe80:: addresses are link-local and cannot be routed beyond the link. The host has no global address, usually because it did not receive a Router Advertisement with a prefix or DHCPv6 failed. Check that the router sends RAs and that ICMPv6 is not blocked."],
        questions: [
            question("What is the correct compressed form of 2001:0db8:0000:0000:0000:0000:0000:0001?", ["2001:db8:0:1", "2001:db8::1", "2001::db8::1", "2001:db8:1::"], 1, "Remove leading zeros and replace the single longest run of zero groups with :: once."),
            question("Which mechanism replaces ARP in IPv6?", ["DHCPv6", "Router Advertisement only", "Neighbor Discovery using ICMPv6", "Broadcast address resolution"], 2, "NDP's Neighbor Solicitation and Advertisement messages map IPv6 addresses to link-layer addresses. IPv6 has no broadcast."),
            question("Why does blocking all ICMPv6 break IPv6 networks?", ["Router discovery, neighbor discovery and path MTU discovery depend on it", "ICMPv6 carries all web traffic", "It disables DNS", "It forces fallback to IPv4 encryption"], 0, "IPv6 relies on ICMPv6 for core functions. Filter specific types carefully instead of dropping the whole protocol."),
            question("How many /64 subnets fit inside a /56?", ["64", "128", "65,536", "256"], 3, "Going from /56 to /64 leaves 8 bits of subnet ID, and 2⁸ = 256. That is why a /56 home delegation gives you 256 separate /64 LANs to hand out.")
        ]
    },
    {
        id: "n102-tcp", chapters: ["learn102-tcp"], title: "TCP reliability & congestion", minutes: 15,
        heading: "How TCP stays reliable without flooding the network",
        intro: "In 101 you met TCP as the reliable, ordered transport. Here you will see the machinery: byte-numbered sequences, cumulative acknowledgments, a receive window that protects the receiver and a congestion window that protects the network.",
        builds: [["#learn-ports", "Ports & transport", "TCP versus UDP and the handshake"]],
        goals: ["Read sequence and acknowledgment numbers.", "Separate flow control (rwnd) from congestion control (cwnd).", "Trace slow start, congestion avoidance and loss recovery on a graph."],
        concepts: [
            ["Every byte has a number", "TCP numbers bytes, not packets. If a segment carries bytes 1001 through 2000, the receiver replies with ACK 2001, meaning \"I have everything before 2001; send 2001 next.\" ACKs are cumulative, so one ACK can confirm several segments, and a gap causes repeated, duplicate ACKs for the missing byte."],
            ["Two windows, two jobs", "The receive window (rwnd) is advertised by the receiver and says how much buffer space it has: flow control. The congestion window (cwnd) is the sender's private estimate of what the network can carry: congestion control. The sender may have at most the smaller of the two in flight without acknowledgment."],
            ["Slow start, then careful growth", "A new connection starts with a small cwnd (commonly 10 segments today) and roughly doubles it every round trip while ACKs return. That is slow start: slow to begin, exponential in practice. After reaching the slow-start threshold, classic TCP enters congestion avoidance and adds about one segment per round trip."],
            ["Loss is a signal", "Three duplicate ACKs suggest one segment was lost while later ones arrived. TCP retransmits it at once (fast retransmit) and, in classic Reno, halves cwnd. A retransmission timeout is more serious: cwnd collapses to a minimum and slow start begins again. Modern algorithms such as CUBIC and BBR shape this curve differently, but the feedback loop remains."]
        ],
        figures: [
            { type: "line", title: "Congestion window over time (simplified TCP Reno)", desc: "cwnd doubles each round trip from 1 to 32 segments during slow start, then grows by one per round trip to 40. Three duplicate ACKs at round 13 halve it to 20. Linear growth continues to 26, then a timeout at round 20 drops it to 1 and slow start resumes up to the new threshold of 13.", caption: "Exponential growth during slow start, a straight-line climb during congestion avoidance, a halving after duplicate ACKs and a full restart after a timeout. The dashed line is the slow-start threshold.",
                x: { label: "Round trips (RTT)", max: 28, ticks: range(0, 28, 4) }, y: { label: "cwnd (segments)", max: 45, ticks: [0, 10, 20, 30, 40] },
                marks: [{ x: 13, label: "3 dup ACKs: halve" }, { x: 20, label: "Timeout: restart", row: 1 }],
                series: [
                    { label: "cwnd", tone: 1, area: true, points: [[0, 1], [1, 2], [2, 4], [3, 8], [4, 16], [5, 32], ...range(6, 13).map(round => [round, 27 + round]), [14, 20], ...range(15, 20).map(round => [round, round + 6]), [21, 1], [22, 2], [23, 4], [24, 8], [25, 13], [26, 14], [27, 15], [28, 16]] },
                    { label: "ssthresh", tone: 2, dashed: true, points: [[0, 32], [13, 32], [13.01, 20], [20, 20], [20.01, 13], [28, 13]] }
                ] }
        ],
        takeaway: "Sender limit = min(rwnd, cwnd). Duplicate ACKs mean \"something is missing\"; timeouts mean \"start again carefully.\"",
        studio: [["tcp", "TCP handshake"], ["quic", "QUIC"]],
        lessons: [
            ["Head-of-line blocking", "Because TCP delivers one ordered byte stream, a single lost segment holds back every later byte until it is retransmitted, even bytes belonging to unrelated requests multiplexed over the same connection. QUIC, used by HTTP/3, runs independent streams over UDP so a loss stalls only the affected stream."],
            ["Zero window and slow receivers", "If the receiving application stops reading, its buffer fills and it advertises a window of zero. The sender pauses and periodically probes. In a packet capture, \"TCP Zero Window\" points at the receiving host or application, not the network."]
        ],
        practice: ["A sender has cwnd = 40 segments but the receiver advertises rwnd = 12 segments. How many unacknowledged segments may be in flight, and which side is the bottleneck?",
            "At most 12, the minimum of the two windows. The receiver's buffer is the limit here, so improving the network will not help; the receiving application or its buffer settings need attention."],
        questions: [
            question("A receiver sends ACK 5001. What does it mean?", ["It received exactly one segment", "It has received all bytes through 5000 and expects byte 5001 next", "It wants the connection closed", "Byte 5001 was corrupted"], 1, "TCP ACKs are cumulative and name the next byte expected, so ACK 5001 confirms every byte up to 5000 regardless of how many segments carried them."),
            question("What is the difference between rwnd and cwnd?", ["They are the same value on both ends", "rwnd encrypts data and cwnd compresses it", "rwnd protects the receiver's buffer; cwnd protects the network from overload", "cwnd is set by the receiver"], 2, "The receive window is flow control advertised by the receiver. The congestion window is the sender's estimate of network capacity."),
            question("In classic Reno, what follows three duplicate ACKs?", ["Fast retransmit and a reduced, not reset, congestion window", "An immediate connection reset", "cwnd doubles", "The receiver window becomes zero"], 0, "Duplicate ACKs show that later data is still arriving, so TCP retransmits the missing segment and backs off moderately instead of restarting."),
            question("How does cwnd grow during slow start?", ["By one byte per minute", "It stays fixed", "Linearly, one segment per round trip", "Roughly doubling every round trip"], 3, "Each acknowledged segment increases cwnd, so it roughly doubles per RTT until the threshold or a loss.")
        ]
    },
    {
        id: "n102-performance", chapters: ["learn102-performance"], title: "Latency, bandwidth & BDP", minutes: 14,
        heading: "Why a faster plan does not always feel faster",
        intro: "101 separated bandwidth from latency. Now you can calculate them: where delay comes from, how much data must be in flight to fill a link and why one connection can be slow on a fast network.",
        builds: [["#learn-what", "Networks & packets", "bandwidth, latency and loss"], ["#learn102-tcp", "TCP reliability & congestion", "windows limit data in flight"]],
        goals: ["Break latency into propagation, serialization, queuing and processing.", "Calculate a bandwidth-delay product.", "Estimate single-connection throughput from window and RTT."],
        concepts: [
            ["Four parts of delay", "Propagation is distance divided by signal speed, about 5 µs per kilometer in fiber, so 1,000 km costs about 5 ms one way. Serialization is the time to put the bits on the wire: 1,500 bytes at 10 Mbit/s takes 1.2 ms but only 12 µs at 1 Gbit/s. Queuing is time waiting behind other packets. Processing is usually small. Faster links shrink serialization, never propagation."],
            ["Bandwidth-delay product", "To keep a link busy, a sender needs enough data in flight to cover one round trip. Multiply bandwidth by RTT: 100 Mbit/s × 50 ms = 5 Mbit, about 625 KB. If the window is smaller than the BDP, the link sits idle while the sender waits for ACKs."],
            ["One flow's ceiling: window ÷ RTT", "A connection can send at most one window per round trip. A 64 KiB window over a 100 ms RTT tops out near 5.2 Mbit/s, even on a gigabit link. TCP window scaling allows much larger windows, which is why long-distance transfers depend on modern buffer tuning."],
            ["Averages hide pain", "Jitter is variation in delay, and percentiles such as the 99th describe the slow tail that users actually notice. Packet loss also lowers throughput sharply: TCP backs off on each loss, so 1% loss on a long path can matter more than doubling bandwidth."]
        ],
        figures: [
            { type: "line", title: "Maximum single-flow throughput vs round-trip time", desc: "On a 1 Gbit/s link, a 1 MiB window fills the link up to about 8 ms RTT, then falls to about 84 Mbit/s at 100 ms. A 64 KiB window reaches about 524 Mbit/s at 1 ms, 52 Mbit/s at 10 ms and only about 5 Mbit/s at 100 ms.", caption: "Throughput ≈ window ÷ RTT, capped by the link. Distance, not plan speed, limits a small window.",
                x: { label: "Round-trip time (ms)", max: 200, ticks: [0, 25, 50, 100, 150, 200] }, y: { label: "Throughput (Mbit/s)", max: 1000, ticks: [0, 250, 500, 750, 1000] },
                series: [
                    { label: "1 MiB window", tone: 0, points: [[1, 1000], [8.4, 1000], [10, 839], [15, 559], [20, 419], [30, 280], [50, 168], [75, 112], [100, 84], [150, 56], [200, 42]], tag: { at: [48, 260], text: "1 MiB window" } },
                    { label: "64 KiB window", tone: 2, points: [[1, 524], [2, 262], [3, 175], [5, 105], [10, 52], [20, 26], [50, 10.5], [100, 5.2], [200, 2.6]], tag: { at: [36, 90], text: "64 KiB window" } }
                ] },
            { type: "stack", labelWidth: 120, total: 47, title: "Where 46 ms of one-way delay comes from", desc: "Idle link: propagation 5 ms, serialization 1.2 ms, queuing 0.5 ms, processing 0.1 ms. Busy link with a large buffer: the same plus 40 ms of queuing.", caption: "1,500-byte packet, 1,000 km of fiber, 10 Mbit/s uplink. Under load, an oversized buffer (bufferbloat) dominates the total.",
                rows: [
                    { label: "Idle link", segments: [{ label: "Propagation", short: "Prop 5", value: 5, display: "5 ms", tone: 1 }, { label: "Serialization", short: "", value: 1.2, display: "1.2 ms", tone: 0 }, { label: "Queuing", short: "", value: 0.5, display: "0.5 ms idle / 40 ms busy", tone: 2 }, { label: "Processing", short: "", value: 0.1, display: "0.1 ms", tone: 3 }] },
                    { label: "Busy link", segments: [{ label: "Propagation", short: "Prop 5", value: 5, display: "5 ms", tone: 1 }, { label: "Serialization", short: "", value: 1.2, display: "1.2 ms", tone: 0 }, { label: "Queuing", short: "Queuing 40 ms", value: 40, display: "0.5 ms idle / 40 ms busy", tone: 2 }, { label: "Processing", short: "", value: 0.1, display: "0.1 ms", tone: 3 }] }
                ] }
        ],
        takeaway: "BDP = bandwidth × RTT. Single-flow throughput ≤ window ÷ RTT. Under load, queues often dominate latency.",
        studio: [["tcp", "TCP handshake"], ["icmp", "ICMP"]],
        lessons: [
            ["Bufferbloat", "When a router's queue is too large, a busy upload fills it and every packet, including a voice call's, waits behind it. Latency can jump from 20 ms to hundreds of milliseconds. Test latency under load, not just idle speed. Smart queue management, covered in the QoS module, fixes this."],
            ["Measure what matters", "Speed tests use several parallel connections to a nearby server, which hides window and distance limits. A single large download from a faraway server may be much slower. Compare idle RTT, loaded RTT, loss and single-flow throughput."]
        ],
        practice: ["A 200 Mbit/s link has a 40 ms RTT. How much data must be in flight to fill it, and can a fixed 256 KiB window do it?",
            "BDP = 200,000,000 bit/s × 0.04 s = 8,000,000 bits = 1 MB. A 256 KiB window (about 2.1 Mbit) allows only about 2.1 Mbit ÷ 0.04 s ≈ 52 Mbit/s, so the link would be roughly a quarter used."],
        questions: [
            question("What is the bandwidth-delay product of a 200 Mbit/s link with a 40 ms RTT?", ["8 Mbit (1 MB)", "5 Mbit", "200 Mbit", "40 KB"], 0, "200 Mbit/s × 0.04 s = 8 Mbit, which is 1 MB of data in flight."),
            question("A connection has a 64 KiB window and a 100 ms RTT. What is its approximate maximum throughput?", ["1 Gbit/s", "64 Mbit/s", "About 5 Mbit/s", "100 Mbit/s"], 2, "64 KiB is about 524,000 bits per round trip; ÷ 0.1 s ≈ 5.2 Mbit/s, regardless of link speed."),
            question("Video calls lag badly whenever someone uploads a large file. Which problem fits best?", ["DNS caching", "Bufferbloat: an oversized queue under load", "A duplicate IP address", "An expired DHCP lease"], 1, "The upload fills a large buffer and every packet waits behind it, raising latency for interactive traffic."),
            question("Which delay component does upgrading to a faster link not reduce?", ["Serialization delay", "Queuing behind a smaller backlog", "Time to transmit each frame", "Propagation delay over distance"], 3, "Propagation depends on distance and signal speed. Faster links only shorten the time to transmit bits.")
        ]
    },
    {
        id: "n102-dns", chapters: ["learn102-dns"], title: "DNS resolution in depth", minutes: 13,
        heading: "Follow a name through the DNS hierarchy",
        intro: "101 showed DNS turning names into addresses and caching answers. Now follow the full chain: who actually walks the hierarchy, what each server knows and how record types, TTLs and security extensions shape the result.",
        builds: [["#learn-join", "DHCP & DNS", "A and AAAA records and TTL caching"]],
        goals: ["Trace recursive and iterative resolution step by step.", "Choose record types and TTLs for real changes.", "Separate DNS integrity (DNSSEC) from privacy (DoT and DoH)."],
        concepts: [
            ["Stub, recursive, authoritative", "Your device runs a stub resolver that asks one recursive resolver to do all the work. The recursive resolver asks a root server, which refers it to the TLD servers for .com, which refer it to the domain's authoritative servers, which return the answer. Each referral lists name servers (NS records), sometimes with glue addresses."],
            ["Caching at every level", "The recursive resolver caches answers and referrals for their TTLs, so most lookups never reach the root. Negative answers such as NXDOMAIN are cached too, for a time set in the zone's SOA record. That is why a just-created name can still fail for a while if someone looked it up too early."],
            ["Record types beyond A and AAAA", "CNAME makes one name an alias for another; a name with a CNAME cannot hold other records, so it is not used at a zone apex. MX lists mail servers with preference values. NS delegates a zone. TXT carries text such as SPF and domain verification. PTR maps addresses back to names. CAA limits which certificate authorities may issue certificates."],
            ["Transport, privacy and integrity", "Classic DNS uses UDP port 53 and switches to TCP for large responses and zone transfers. DNS over TLS (port 853) and DNS over HTTPS (443) encrypt the query to the resolver. DNSSEC is different: it signs records so resolvers can verify they are authentic and unchanged, but it does not hide the query."]
        ],
        figures: [
            { type: "graph", width: 640, height: 300, title: "Resolving shop.example.com", desc: "The stub resolver asks the recursive resolver once. The recursive resolver asks a root server and is referred to the .com TLD servers, asks those and is referred to example.com's authoritative servers, then gets the final answer and returns it to the stub.", caption: "1 the stub asks. 2–3 root refers to .com. 4–5 .com refers to example.com. 6–7 the authoritative server answers. 8 the resolver replies and caches every step.",
                nodes: [{ id: "stub", label: "Your device", sub: "stub resolver", x: 75, y: 150, tone: 1 }, { id: "rec", label: "Recursive", sub: "resolver + cache", x: 255, y: 150, tone: 0 }, { id: "root", label: "Root", sub: ".", x: 470, y: 45, tone: 3 }, { id: "tld", label: ".com TLD", sub: "referral", x: 565, y: 150, tone: 3 }, { id: "auth", label: "Authoritative", sub: "example.com", x: 470, y: 255, tone: 2 }],
                edges: [{ from: "stub", to: "rec", label: "1 query / 8 answer", state: "path", arrow: "both", dy: -14 }, { from: "rec", to: "root", label: "2–3", arrow: "both", dx: -12 }, { from: "rec", to: "tld", label: "4–5", arrow: "both", dy: -10 }, { from: "rec", to: "auth", label: "6–7", state: "path", arrow: "both", dx: -12, dy: 16 }] },
            { type: "bars", log: true, labelWidth: 120, title: "Worst-case time for an old answer to expire (log scale)", desc: "With a TTL of 60 seconds, caches can hold an old answer up to 1 minute; 300 seconds up to 5 minutes; 3,600 seconds up to 1 hour; 86,400 seconds up to 24 hours.", caption: "Lower the TTL at least one old-TTL period before a migration, make the change, then raise it again.",
                items: [{ label: "TTL 60", value: 60, display: "1 minute", tone: 0 }, { label: "TTL 300", value: 300, display: "5 minutes", tone: 0 }, { label: "TTL 3600", value: 3600, display: "1 hour", tone: 1 }, { label: "TTL 86400", value: 86400, display: "24 hours", tone: 2 }] }
        ],
        takeaway: "The recursive resolver does the walking and the caching. TTL controls how long change takes; DNSSEC proves authenticity; DoT and DoH add privacy.",
        studio: [["dns", "DNS lookup"], ["dnssec", "DNSSEC validation"], ["doh", "DNS over HTTPS"]],
        lessons: [
            ["Split-horizon DNS", "Organizations sometimes answer the same name differently inside and outside: internal clients receive a private address and the internet receives a public one. It is useful, but confusing when a laptop on VPN still uses the outside resolver, or the reverse."],
            ["Troubleshooting lookups", "Query the authoritative server directly to see what it publishes, then query the recursive resolver to see what is cached. If they differ, you are waiting for a TTL. If the authoritative server is wrong, fix the zone. Tools such as dig and nslookup let you choose the server and record type."]
        ],
        practice: ["You will move www.example.com to a new server next Friday. Its A record TTL is 86,400 seconds. What should you do before the move?",
            "At least 24 hours before the move, lower the TTL to something short, such as 300 seconds, so caches pick up the short TTL. On Friday, change the A record; most caches update within minutes. Afterwards, raise the TTL again to reduce query load."],
        questions: [
            question("Which component walks the hierarchy from the root to the authoritative server?", ["The stub resolver on the laptop", "The recursive resolver", "The TLD server", "The DHCP server"], 1, "The stub asks one question. The recursive resolver follows referrals from the root to the TLD to the authoritative servers and caches each result."),
            question("A zone is signed with DNSSEC and your resolver validates it. What does that give you?", ["Proof that records are authentic and unaltered", "Encryption of queries", "Faster lookups", "Automatic IP address assignment"], 0, "DNSSEC signs DNS data for integrity and authenticity. It does not hide queries; DoT or DoH provide that privacy to the resolver."),
            question("A newly created name returns NXDOMAIN for some users. What is a likely reason?", ["The A record is too long", "MX records block it", "A negative answer was cached before the record existed", "The TTL is 0"], 2, "Resolvers cache NXDOMAIN responses for a period from the zone's SOA. Users who asked early keep the negative answer until it expires."),
            question("Which record type tells mail servers where to deliver email for a domain?", ["CNAME", "TXT", "PTR", "MX"], 3, "MX records list mail exchangers with preference values; lower preference values are tried first.")
        ]
    },
    {
        id: "n102-wireless", chapters: ["learn102-wireless"], title: "Wireless engineering", minutes: 14,
        heading: "Plan Wi-Fi with spectrum, signal and airtime",
        intro: "101 explained Wi-Fi bands and why signal matters. Wireless design goes further: channels overlap, every device shares airtime, and signal is meaningful only compared with noise.",
        builds: [["#learn-wireless", "Wi-Fi without the mystery", "bands, signal strength and access points"]],
        goals: ["Choose non-overlapping channels and explain channel width trade-offs.", "Use dBm, SNR and simple decibel math.", "Explain co-channel contention, roaming and AP power."],
        concepts: [
            ["Channels overlap at 2.4 GHz", "2.4 GHz channel numbers are only 5 MHz apart, but each transmission is about 20 MHz wide. In North America, channels 1, 6 and 11 are the only common set that does not overlap. Using channel 3 next to channel 1 creates adjacent-channel interference, which looks like noise and is worse than sharing a channel."],
            ["Wider is not always better", "At 5 GHz and 6 GHz, channels can be bonded to 40, 80 or 160 MHz (and 320 MHz with Wi-Fi 7). Wider channels raise peak speed but leave fewer independent channels and pick up more noise. Dense buildings often perform better with narrower channels on more APs. Some 5 GHz channels require DFS radar detection and may move suddenly."],
            ["Signal, noise and decibels", "Received signal strength is measured in dBm, a logarithmic scale: −50 dBm is much stronger than −70 dBm. What matters is signal-to-noise ratio: −65 dBm against a −95 dBm noise floor is a 30 dB SNR. Every 3 dB is about double or half the power, and 10 dB is ten times. Higher SNR allows higher modulation rates."],
            ["Airtime is the shared resource", "Wi-Fi is half duplex: on one channel, only one radio transmits at a time while the others wait (CSMA/CA). Nearby APs on the same channel share airtime, a problem called co-channel contention. Old or distant clients using slow rates occupy more airtime for the same data and slow everyone."]
        ],
        figures: [
            { type: "line", title: "2.4 GHz channel overlap", desc: "Spectrum shapes for channels 1, 6 and 11, centered at 2412, 2437 and 2462 MHz, do not overlap. Channel 3, centered at 2422 MHz, overlaps both channel 1 and channel 6.", caption: "Channels 1, 6 and 11 sit side by side. Channel 3 straddles 1 and 6, interfering with both.",
                x: { label: "Frequency: channel centers 2412–2462 MHz", min: 2398, max: 2476, ticks: [2412, 2422, 2437, 2462], format: tick => `ch ${(tick - 2407) / 5}` }, y: { label: "Relative power", max: 1.15, ticks: [0, .5, 1], format: tick => tick.toFixed(1) },
                series: [
                    { label: "Channel 1", tone: 0, area: true, points: channel(1), tag: { at: [2412, 1.03], text: "1" } },
                    { label: "Channel 6", tone: 0, area: true, points: channel(6), tag: { at: [2437, 1.03], text: "6" } },
                    { label: "Channel 11", tone: 0, area: true, points: channel(11), tag: { at: [2462, 1.03], text: "11" } },
                    { label: "Channel 3", tone: 2, area: true, dashed: true, points: channel(3), tag: { at: [2424, 1.1], text: "3 overlaps" } }
                ] },
            { type: "bars", max: 70, labelWidth: 170, title: "Rule-of-thumb client signal targets", desc: "Approximate guidance: −50 dBm excellent, −60 very good, −67 dBm commonly targeted for voice and video, −70 adequate for basic browsing, −80 unreliable.", caption: "Guidelines, not guarantees. Noise, interference and client capability change the result; measure SNR as well as signal.",
                items: [{ label: "Excellent", value: 50, display: "−50 dBm", tone: 0 }, { label: "Very good", value: 40, display: "−60 dBm", tone: 0 }, { label: "Voice & video target", value: 33, display: "−67 dBm", tone: 1 }, { label: "Basic browsing", value: 30, display: "−70 dBm", tone: 2 }, { label: "Unreliable", value: 20, display: "−80 dBm", tone: 4 }] }
        ],
        takeaway: "Use non-overlapping channels, size channel width to density, design for SNR and remember that every client shares airtime.",
        studio: [["wifi", "Wi-Fi association"], ["wpa3", "WPA3 authentication"]],
        lessons: [
            ["Why maximum AP power can hurt", "An AP at full power may reach a phone that cannot transmit back as strongly, producing a link that looks fine but performs poorly. Large overlapping cells also make clients cling to a distant AP. Moderate power with more APs usually gives smaller, cleaner cells."],
            ["Roaming is the client's decision", "Clients decide when to switch APs, often late. 802.11k shares neighbor lists, 802.11v lets the network suggest a better AP and 802.11r speeds up secure reauthentication. Consistent SSIDs and security settings across APs help clients roam smoothly."]
        ],
        practice: ["An office has three 2.4 GHz APs set to channels 1, 3 and 6, and users report slow Wi-Fi near the middle AP. What would you change?",
            "Move the middle AP from channel 3 to 11, giving the non-overlapping 1/6/11 plan. Channel 3 overlaps both neighbors, creating interference rather than orderly sharing. Then check that power levels and placement avoid excessive overlap, and steer capable clients to 5 or 6 GHz."],
        questions: [
            question("Which 2.4 GHz channels form the common non-overlapping set in North America?", ["1, 2 and 3", "1, 6 and 11", "3, 7 and 11", "Any three odd channels"], 1, "Channels are 5 MHz apart but about 20 MHz wide, so they must be at least five numbers apart: 1, 6 and 11."),
            question("Two nearby APs both use channel 36. What is the main effect?", ["They must share airtime, taking turns to transmit", "They combine into one faster channel", "Their SSIDs merge", "They switch to 2.4 GHz"], 0, "Radios on the same channel within range defer to each other. That co-channel contention reduces capacity for both."),
            question("A signal improves by 3 dB. What happened to its power?", ["It increased tenfold", "It increased by 3 percent", "It roughly doubled", "It stayed the same"], 2, "Decibels are logarithmic: +3 dB is about double, +10 dB is ten times."),
            question("Why can setting every AP to maximum power make Wi-Fi worse?", ["It disables WPA3", "It shortens the DHCP lease", "It reduces the number of SSIDs", "Clients cannot transmit back as strongly, and large overlapping cells hurt roaming and reuse"], 3, "Wireless links are two-way. Oversized cells create imbalanced links, more contention and sticky clients.")
        ]
    },
    {
        id: "n102-tunnels", chapters: ["learn102-tunnels"], title: "MTU, tunnels & VPNs", minutes: 13,
        heading: "Encapsulation has a size budget",
        intro: "Every link limits packet size. Tunnels and VPNs wrap packets inside other packets, spending some of that budget on headers. When the budget is miscalculated, small requests work and large transfers mysteriously hang.",
        builds: [["#learn-layers", "Layers & encapsulation", "each layer adds a header"], ["#learn-security", "Safer network habits", "where encrypted connections start and end"]],
        goals: ["Calculate MTU and TCP MSS with and without tunnel overhead.", "Diagnose a path MTU black hole.", "Compare VPN types, split tunneling and what a VPN does not protect."],
        concepts: [
            ["MTU and MSS", "The maximum transmission unit is the largest IP packet a link carries without fragmenting, usually 1,500 bytes on Ethernet. Subtract a 20-byte IPv4 header and a 20-byte TCP header and the maximum segment size (MSS) is 1,460 bytes of payload. With IPv6's 40-byte header, MSS is 1,440."],
            ["Tunnels spend bytes", "A tunnel adds outer headers. WireGuard over IPv4 adds 60 bytes (20 IPv4 + 8 UDP + 32 WireGuard), and 80 over IPv6; its common default inner MTU of 1,420 covers both. PPPoE DSL and fiber links use 8 bytes, leaving 1,492. IPsec overhead varies with mode and cipher."],
            ["Path MTU discovery and black holes", "Hosts set the IPv4 Don't Fragment bit and rely on routers to return ICMP \"fragmentation needed\" (IPv6: \"packet too big\") when a packet is too large. If a firewall drops those ICMP messages, the sender never learns to shrink packets. Handshakes and small pages work; large transfers stall. MSS clamping on the tunnel router is a common fix."],
            ["What a VPN does and does not do", "Remote-access VPNs connect one device to a network; site-to-site VPNs connect whole networks. A full tunnel sends all traffic through the VPN; a split tunnel sends only chosen destinations. Encryption covers only the path between tunnel endpoints. After the VPN server, traffic travels as it normally would, so TLS is still needed for end-to-end protection."]
        ],
        figures: [
            { type: "stack", labelWidth: 120, total: 1500, title: "Spending a 1,500-byte MTU", desc: "Plain IPv4 plus TCP: 20 + 20 header bytes and 1,460 payload. Inside WireGuard over IPv4: 20 outer IPv4, 8 UDP, 32 WireGuard, 20 inner IPv4, 20 TCP and 1,400 payload. PPPoE: 8 PPPoE, 20 IPv4, 20 TCP and 1,452 payload.", caption: "Headers look thin, but every byte comes out of the same 1,500-byte budget. Exceed it and packets must fragment or be dropped.",
                rows: [
                    { label: "Plain TCP", segments: [{ label: "IPv4 header", value: 20, display: "20 bytes", tone: 1 }, { label: "TCP header", value: 20, display: "20 bytes", tone: 3 }, { label: "TCP payload", short: "Payload 1460", value: 1460, display: "MSS on plain Ethernet", tone: 0 }] },
                    { label: "WireGuard v4", segments: [{ label: "Outer IPv4 + UDP + WireGuard", short: "", value: 60, display: "60 bytes", tone: 2 }, { label: "IPv4 header", value: 20, display: "20 bytes", tone: 1 }, { label: "TCP header", value: 20, display: "20 bytes", tone: 3 }, { label: "Payload inside WireGuard", short: "Payload 1400", value: 1400, display: "1,400 bytes", tone: 0 }] },
                    { label: "PPPoE", segments: [{ label: "PPPoE header", value: 8, display: "8 bytes", tone: 4 }, { label: "IPv4 header", value: 20, display: "20 bytes", tone: 1 }, { label: "TCP header", value: 20, display: "20 bytes", tone: 3 }, { label: "Payload on PPPoE", short: "Payload 1452", value: 1452, display: "1,452 bytes", tone: 0 }] }
                ] },
            { type: "bars", max: 80, labelWidth: 170, title: "Encapsulation overhead per packet", desc: "PPPoE adds 8 bytes, GRE over IPv4 24 bytes, WireGuard over IPv4 60 bytes and WireGuard over IPv6 80 bytes.", caption: "Larger overhead leaves a smaller inner MTU. Stacked tunnels add their overheads together.",
                items: [{ label: "PPPoE", value: 8, display: "8 B", tone: 4 }, { label: "GRE over IPv4", value: 24, display: "24 B", tone: 1 }, { label: "WireGuard over IPv4", value: 60, display: "60 B", tone: 0 }, { label: "WireGuard over IPv6", value: 80, display: "80 B", tone: 2 }] }
        ],
        takeaway: "Inner MTU = outer MTU − overhead. Let ICMP \"too big\" messages through or clamp MSS, and remember VPN encryption ends at the tunnel endpoint.",
        studio: [["wireguard", "WireGuard"], ["ipsec", "IPsec"], ["icmp", "ICMP"]],
        lessons: [
            ["Fragmentation is a last resort", "IPv4 routers may fragment packets without DF set, but fragments are less efficient, harder for firewalls to inspect and lost entirely if any piece drops. IPv6 routers never fragment; only the sender can, after learning the path MTU."],
            ["Testing the path MTU", "Send pings with Don't Fragment set and increasing sizes, for example ping -M do -s 1472 on Linux (1,472 + 8 ICMP + 20 IP = 1,500). The largest size that succeeds reveals the path MTU. If large pings vanish silently with no error, suspect a black hole."]
        ],
        practice: ["Over a new site-to-site VPN, users can log in to an internal web app but uploading files hangs. Pings work. What would you check?",
            "Suspect an MTU black hole: small packets fit, but full-size ones exceed the tunnel MTU and the ICMP \"fragmentation needed\" replies are blocked. Test with DF-set pings of increasing size, allow the necessary ICMP types and set MSS clamping or a lower tunnel MTU."],
        questions: [
            question("On standard 1,500-byte Ethernet, what is the TCP MSS for IPv4 without options?", ["1,500", "1,480", "1,460", "1,400"], 2, "The MTU covers the IP packet, so subtract the headers inside it: 1,500 − 20 (IPv4) − 20 (TCP) = 1,460 bytes of application payload per segment."),
            question("Small pages load over a VPN, but large downloads stall. What is the classic cause?", ["A path MTU black hole where ICMP size messages are blocked", "An expired DNS TTL", "Too many VLANs", "Wrong Wi-Fi channel"], 0, "Full-size packets are dropped, and without the ICMP error the sender never reduces its packet size."),
            question("A laptop VPN is configured as a split tunnel. How is its traffic handled?", ["Encrypts traffic twice", "Uses two VPN servers at once", "Splits each packet into fragments", "Sends only selected destinations through the VPN"], 3, "Split tunneling routes chosen networks through the VPN and everything else directly. A full tunnel sends all traffic through the VPN."),
            question("A remote worker connects to a website over a full-tunnel VPN. Which path does the VPN's encryption protect?", ["Every hop to the website", "Only the path between the device and the VPN server", "Only the website's internal network", "None; VPNs only change IP addresses"], 1, "The tunnel ends at the VPN server. Beyond it, traffic is protected only if the application uses its own encryption, such as TLS.")
        ]
    },
    {
        id: "n102-qos", chapters: ["learn102-qos"], title: "QoS & queue management", minutes: 12,
        heading: "Decide what waits when the link is full",
        intro: "Quality of service does not create bandwidth. It decides which packets wait, and which are dropped, when more traffic arrives than a link can send. Done well, a call stays clear during a large upload.",
        builds: [["#learn102-performance", "Latency, bandwidth & BDP", "queuing delay and bufferbloat"], ["#learn102-vlans", "VLANs & trunking", "the PCP priority bits"]],
        goals: ["Explain classification, marking, queuing, shaping and policing.", "Read common DSCP values and know where they are trusted.", "Use smart queue management to control bufferbloat."],
        concepts: [
            ["QoS only acts when there is a queue", "If a link is never full, packets do not wait and QoS changes nothing. The bottleneck, usually the upload direction of an internet connection or a Wi-Fi link, is where queues form and where policy must be applied."],
            ["Classify, mark, then queue", "Devices identify traffic by port, application or address and mark it with a DSCP value, 6 bits in the IP header. Queues then serve marks differently. Expedited Forwarding (EF, 46) is commonly used for voice. Marks are only trusted inside a network you control; the internet usually ignores or rewrites them."],
            ["Priority needs a limit", "A strict priority queue always sends first, which suits small, latency-sensitive voice. Without a rate limit, a misbehaving flow in that queue could starve everything else. Weighted fair queuing shares the remaining capacity in proportions you choose."],
            ["Shaping versus policing", "Shaping buffers excess packets and sends them at a controlled rate: smooth, but it adds delay. Policing drops or re-marks packets above a rate immediately: no added delay, but loss. Providers often police; customers often shape just below that rate so the queue stays in their own equipment."]
        ],
        figures: [
            { type: "line", title: "Latency during a large upload (illustrative)", desc: "Before the upload starts at 10 seconds, latency is about 20 ms in both cases. Without smart queue management it climbs to about 300 ms during the upload. With SQM shaping slightly below the link rate it stays near 30 to 35 ms. Both return to 20 ms after the upload ends at 40 seconds.", caption: "A typical shape, not a measurement of one product. SQM keeps the queue short and shared fairly.",
                x: { label: "Time (s)", max: 50, ticks: [0, 10, 20, 30, 40, 50] }, y: { label: "Round-trip latency (ms)", max: 340, ticks: [0, 100, 200, 300] },
                marks: [{ x: 10, label: "Upload starts" }, { x: 40, label: "Upload ends" }],
                series: [
                    { label: "No queue management", tone: 2, area: true, points: [[0, 20], [10, 21], [12, 180], [14, 280], [20, 300], [30, 305], [40, 298], [41, 30], [42, 20], [50, 20]], tag: { at: [25, 325], text: "No SQM ≈ 300 ms" } },
                    { label: "With SQM", tone: 0, points: [[0, 20], [10, 21], [12, 34], [20, 31], [30, 35], [40, 32], [41, 21], [50, 20]], tag: { at: [25, 62], text: "SQM ≈ 30 ms" } }
                ] }
        ],
        table: { caption: "Common DSCP markings (typical uses; organizations define their own policy)", columns: ["Class", "DSCP", "Typical use"], rows: [
            ["EF", "46", "Voice media"], ["AF41", "34", "Interactive video"], ["CS3", "24", "Call signaling (in many designs)"], ["AF21", "18", "Low-latency business data"], ["Default / CS0", "0", "Best effort"], ["LE", "1", "Background and bulk (lower than best effort)"]
        ] },
        takeaway: "Put the queue where you control it, keep it short with AQM, prioritize sparingly and trust markings only inside your own network.",
        studio: [["udp", "UDP datagrams"], ["sip", "SIP call setup"]],
        lessons: [
            ["Active queue management", "Algorithms such as CoDel, fq_codel and CAKE drop or mark packets when they have waited too long, signalling TCP senders to slow down before a large queue forms. Fair queuing gives each flow its turn, so a bulk upload cannot crowd out a game or call."],
            ["Wi-Fi has its own priorities", "Wi-Fi Multimedia (WMM) maps traffic into voice, video, best-effort and background access categories with different contention timers. It helps only if applications or the AP mark traffic sensibly; marking everything as voice defeats the purpose."]
        ],
        practice: ["A home has a 100 Mbit/s download and 20 Mbit/s upload. Calls break up whenever cloud backups run. Where and how would you apply QoS?",
            "The upload is the bottleneck. Enable SQM, such as fq_codel or CAKE, shaping upload to about 90–95% of 20 Mbit/s so the queue forms in the router, where it can be managed. Fair queuing alone often fixes it; optionally lower the backup's priority."],
        questions: [
            question("When does QoS change how traffic is delivered?", ["Only when a queue forms because traffic exceeds capacity", "Always, even on idle links", "Only on fiber connections", "Only for encrypted traffic"], 0, "Without congestion, every packet is sent immediately. QoS determines which packets wait or drop when a queue exists."),
            question("What is the difference between shaping and policing?", ["Shaping encrypts traffic; policing decrypts it", "Shaping buffers excess traffic to send later; policing drops or re-marks it immediately", "They are the same", "Policing only applies to Wi-Fi"], 1, "Shaping smooths bursts at the cost of delay. Policing enforces a rate at once at the cost of loss."),
            question("Why should a strict priority queue be rate-limited?", ["To save DSCP bits", "Because voice packets are large", "So it cannot starve all other traffic", "So TTL is not decremented"], 2, "Strict priority always goes first. A cap prevents a flood in that class from blocking every other queue."),
            question("Why do SQM guides suggest shaping slightly below the ISP's rate?", ["To bypass the ISP firewall", "To increase the advertised speed", "To disable TCP congestion control", "To move the bottleneck queue into your router, where AQM can control it"], 3, "If you send slightly slower than the line rate, the queue builds in your router instead of the modem or ISP equipment, so your queue management decides.")
        ]
    },
    {
        id: "n102-capture", chapters: ["learn102-capture"], title: "Packet capture & analysis", minutes: 14,
        heading: "Read the conversation on the wire",
        intro: "When reasoning stalls, a packet capture shows what actually happened: which side waited, which packets were lost and which answer came back. This module turns 101's evidence-based troubleshooting into hands-on analysis.",
        builds: [["#learn-fix", "Troubleshoot with evidence", "test one layer at a time"], ["#learn102-tcp", "TCP reliability & congestion", "sequence numbers and windows"]],
        goals: ["Choose where to capture and use capture versus display filters.", "Measure RTT, server time and transfer time from timestamps.", "Recognize retransmissions, resets, zero windows and DNS errors."],
        concepts: [
            ["Capture in the right place", "A switch sends each port only its own traffic, plus broadcasts and some multicast. Capturing on your laptop shows your laptop's conversations, not your neighbor's. To see another device, capture on that device, use a switch mirror (SPAN) port or insert a network tap. Capture only on networks and devices you are authorized to inspect."],
            ["Two kinds of filters", "Capture filters, written in BPF syntax such as host 192.0.2.10 and tcp port 443, decide what is recorded. Use them to keep files small. Display filters, such as Wireshark's ip.addr == 192.0.2.10 or tcp.analysis.retransmission, hide packets from view but keep everything recorded for later questions."],
            ["Timestamps tell the story", "The gap between SYN and SYN-ACK approximates the network round trip. The gap between a request and the first response byte is mostly server time. Long gaps where nothing happens show who was waiting for whom; that is often the answer to \"is it the network?\""],
            ["Patterns worth knowing", "Retransmissions and duplicate ACKs indicate loss. A zero window means the receiver is not reading fast enough. A RST means a port refused the connection or one side aborted it. NXDOMAIN and SERVFAIL are DNS failures. A TLS alert explains a failed handshake. Encrypted payloads stay hidden, but timing, sizes and names in SNI and DNS often remain visible."]
        ],
        table: { caption: "Excerpt from a capture loading https://shop.example (illustrative)", columns: ["No.", "Time (s)", "Source", "Destination", "Protocol", "Info"], highlight: 8, rows: [
            ["1", "0.000", "192.168.1.20", "192.168.1.1", "DNS", "Standard query A shop.example"],
            ["2", "0.018", "192.168.1.1", "192.168.1.20", "DNS", "Response A 203.0.113.80"],
            ["3", "0.020", "192.168.1.20", "203.0.113.80", "TCP", "50432 → 443 [SYN]"],
            ["4", "0.062", "203.0.113.80", "192.168.1.20", "TCP", "443 → 50432 [SYN, ACK]"],
            ["5", "0.062", "192.168.1.20", "203.0.113.80", "TCP", "50432 → 443 [ACK]"],
            ["6", "0.063", "192.168.1.20", "203.0.113.80", "TLS", "Client Hello (SNI shop.example)"],
            ["7", "0.108", "203.0.113.80", "192.168.1.20", "TLS", "Server Hello, Change Cipher Spec"],
            ["8", "0.110", "192.168.1.20", "203.0.113.80", "TLS", "Application Data (request)"],
            ["9", "0.752", "203.0.113.80", "192.168.1.20", "TLS", "Application Data (first response bytes)"]
        ] },
        figures: [
            { type: "stack", labelWidth: 0, total: 872, title: "Where did the 872 ms go?", desc: "From the same capture: DNS 18 ms, TCP handshake 42 ms, TLS handshake 47 ms, waiting for the server 642 ms and downloading the response 123 ms.", caption: "The network round trip is about 42 ms. Most of the delay is the 642 ms between request and first response: a server-side problem, not the network.",
                rows: [{ label: "", segments: [{ label: "DNS lookup", short: "", value: 18, display: "18 ms", tone: 3 }, { label: "TCP handshake", short: "TCP", value: 42, display: "42 ms", tone: 1 }, { label: "TLS handshake", short: "TLS", value: 47, display: "47 ms", tone: 4 }, { label: "Waiting for server", short: "Server think time 642 ms", value: 642, display: "642 ms", tone: 2 }, { label: "Download", short: "Download", value: 123, display: "123 ms", tone: 0 }] }] }
        ],
        takeaway: "Capture where the traffic is, filter what you display, then read the gaps. Timing usually reveals whether the network, the client or the server is waiting.",
        studio: [["tcp", "TCP handshake"], ["tls", "TLS"], ["dns", "DNS lookup"]],
        lessons: [
            ["Captures are sensitive data", "A capture can contain passwords from unencrypted protocols, cookies, internal names and personal data. Store it like a confidential document, share only the relevant packets and remove or anonymize what is not needed."],
            ["Artifacts that fool beginners", "With checksum offload, outgoing packets may show bad checksums because the network card calculates them after capture. With segmentation offload, you may see one huge \"packet\" larger than the MTU that the card later splits. Capturing on the receiver or a tap shows what actually crossed the wire."]
        ],
        practice: ["In the capture excerpt, how long is the network round trip, and how long did the server take to start responding?",
            "SYN at 0.020 s and SYN-ACK at 0.062 s give an RTT of about 42 ms. The request left at 0.110 s and the first response arrived at 0.752 s: about 642 ms, minus one RTT, is server processing. The network is not the main cause; investigate the application or its back end."],
        questions: [
            question("In the excerpt, what does the time between packets 3 (SYN) and 4 (SYN-ACK) approximate?", ["DNS cache time", "Server processing time", "The network round-trip time to the server", "TLS certificate size"], 2, "The handshake reply needs almost no server work, so the SYN to SYN-ACK gap is a good estimate of network RTT."),
            question("What is the difference between a capture filter and a display filter?", ["A capture filter limits what is recorded; a display filter only hides recorded packets from view", "They are identical", "Display filters delete packets from the file", "Capture filters decrypt TLS"], 0, "Capture filters reduce what is saved. Display filters let you explore without losing data you might need later."),
            question("You run a capture on your laptop connected to a switch. Whose unicast traffic will you mostly see?", ["Every device on the switch", "Only the router's", "Nothing; switches block capture", "Mostly your own laptop's, plus broadcasts and some multicast"], 3, "Switches forward unicast frames only to the destination port. Use a mirror port or tap to see other devices."),
            question("A capture shows \"TCP Zero Window\" from the client. What does it suggest?", ["The network is losing packets", "The client's receive buffer is full because the application is not reading fast enough", "DNS failed", "The TLS certificate expired"], 1, "A zero window is the receiver asking the sender to pause. Look at the receiving host and application, not the path.")
        ]
    }
];
