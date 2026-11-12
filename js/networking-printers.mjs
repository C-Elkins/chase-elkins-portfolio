// Printer Networking: a standalone, open course that goes deeper than the Networking 101 printer modules.
export { gradeModule } from "./networking-course.mjs";

const question = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });

export const printerModules = [
    {
        id: "print-path", chapters: ["learnprint-path"], title: "The print path", minutes: 11,
        heading: "Follow one page from Print to paper",
        intro: "Clicking Print starts a relay. The application describes the page, the operating system queues it, software converts it into a language the printer understands, and a network protocol carries the result. When printing fails, the useful question is which leg of that relay stopped.",
        builds: [["#learn-layers", "Layers & encapsulation", "each layer wraps the data from the layer above"], ["#printer-protocols", "Discover & deliver", "finding a printer is separate from sending a job"]],
        goals: ["Name each stage between an application and the printed page.", "Explain what a spooler and print queue do.", "Locate a failure by asking which stage last succeeded."],
        concepts: [
            ["The application only describes the page", "A word processor or browser does not speak to the printer directly. It hands the operating system a description of the pages: text, fonts, images and their positions. The print dialog adds choices such as copies, duplex and paper tray. Nothing has crossed the network yet."],
            ["The spooler holds the job", "The spooler is a background service that accepts the job and stores it in a queue on disk, so the application can carry on. Windows runs the Print Spooler service; macOS and most Linux systems use CUPS. Each queue represents one printer configuration: a destination, a driver and default options."],
            ["A driver or filter renders the job", "The queue converts the page description into a page description language (PDL) or raster image the printer can interpret, such as PDF, PCL, PostScript or PWG Raster. Driverless printing still performs this step; it simply uses a standard format the printer has advertised instead of a vendor-specific driver."],
            ["A backend delivers it, the printer prints it", "Finally a port monitor (Windows) or backend (CUPS) sends the rendered job over IPP, a raw TCP socket, LPD, SMB or USB. The printer's interpreter turns the data into an image of each page and the print engine puts it on paper. Errors can occur at the queue, during rendering, in transport or inside the device."]
        ],
        figures: [
            { type: "graph", width: 640, height: 230, title: "The print path for one network job", desc: "Five stages left to right: the application, the spooler and queue, the driver or filter that renders the job, the network transport, and the printer's interpreter and engine.", caption: "Each arrow is a hand-off you can check. If the job never appears in the queue, the problem is before the network; if it leaves the queue but never prints, look at transport or the device.",
                nodes: [{ id: "A", label: "Application", sub: "describes pages", x: 70, y: 80, tone: 1 }, { id: "S", label: "Spooler", sub: "queue on disk", x: 200, y: 160, tone: 0 }, { id: "D", label: "Driver/filter", sub: "renders PDL", x: 320, y: 80, tone: 0 }, { id: "N", label: "Transport", sub: "IPP / 9100 / SMB", x: 445, y: 160, tone: 3 }, { id: "P", label: "Printer", sub: "interpret + print", x: 570, y: 80, tone: 2 }],
                edges: [{ from: "A", to: "S", state: "path", arrow: true }, { from: "S", to: "D", state: "path", arrow: true }, { from: "D", to: "N", state: "path", arrow: true }, { from: "N", to: "P", state: "path", arrow: true }] }
        ],
        table: { caption: "Where to look at each stage", columns: ["Stage", "What it does", "Evidence to check"], rows: [
            ["Application", "Describes the pages and options", "Does printing work from another application?"],
            ["Spooler/queue", "Stores and orders jobs", "Does the job appear, and with what status?"],
            ["Driver/filter", "Converts pages to a PDL or raster", "Garbled or partial pages suggest a format mismatch"],
            ["Transport", "Carries the job over the network", "Can the computer reach the printer's address and port?"],
            ["Printer", "Interprets and prints", "Control panel errors, configuration page, job log"]
        ] },
        takeaway: "A print job is a relay: application, spooler, renderer, transport, printer. Find the last stage that clearly worked, then test the next one.",
        studio: [["tcp", "TCP handshake"]],
        lessons: [
            ["Local queue or shared queue?", "A direct-IP queue sends jobs from each computer straight to the printer. A shared queue sends jobs to a print server first, which then forwards them. Both are valid; the difference changes where the job waits, who installs drivers and which machine you should inspect when jobs pile up."],
            ["Why a stuck job blocks the rest", "Queues are usually first in, first out. If one job cannot be sent or rendered, later jobs wait behind it. Cancelling or restarting the stuck job is a reasonable first fix, but find out why it stuck, such as a very large file, a printer error or a driver crash, so it does not return."]
        ],
        practice: ["Several users print to the same direct-IP printer. One user's jobs sit in their queue as \"Error\", while everyone else prints normally. Where should you start?",
            "Start on that user's computer. Other computers reach and use the printer, so the device and network path are probably fine. Compare the user's queue: the printer address it points to, its driver and the job's status. A stale address or failing driver on that one machine explains the symptom."],
        questions: [
            question("Which component stores a print job and lets the application continue immediately?", ["The printer's paper tray", "The spooler and its print queue", "The DNS resolver", "The switch's MAC table"], 1, "The spooler accepts the job, stores it in a queue and sends it later, so the application does not have to wait for the printer."),
            question("What does a printer driver or print filter mainly do?", ["Assigns the printer an IP address", "Encrypts Wi-Fi traffic", "Converts the page description into a format the printer understands", "Measures toner levels"], 2, "Drivers and filters render pages into a page description language or raster format that matches the printer's capabilities."),
            question("A job never appears in the computer's print queue. Which part of the path is the least likely cause?", ["The printer's paper path", "The application's print command", "The local spooler service", "Permissions to use that queue"], 0, "If the job never reaches the queue, it has not been sent to the printer yet, so a paper jam inside the printer cannot be the reason."),
            question("Pages print as lines of strange symbols. What does this most often indicate?", ["A weak Wi-Fi signal", "An expired DHCP lease", "A DNS cache problem", "The job was rendered in a format the printer does not interpret correctly"], 3, "A printer printing raw command text usually received a language it does not expect, which points to the driver or queue configuration.")
        ]
    },
    {
        id: "print-addressing", chapters: ["learnprint-addressing"], title: "Addresses, names & lifecycle", minutes: 11,
        heading: "Keep printers findable as things change",
        intro: "Networking 101 showed why a printer needs an address that does not move. In practice, printers are replaced, moved between networks and re-cabled. Good addressing and naming habits keep every queue pointing at the right device through those changes.",
        builds: [["#printer-address", "Connect & address", "reservations keep a printer's address stable"], ["#learn102-subnetting", "Subnet math & VLSM", "plan subnets with room to grow"]],
        goals: ["Choose between DHCP reservations, static addresses and DNS names.", "Plan a printer subnet and naming convention.", "Replace a printer without breaking existing queues."],
        concepts: [
            ["Reservation, static or name", "A DHCP reservation keeps central control: the DHCP server always offers the same address to that interface's MAC. A static address set on the printer works even if DHCP is down, but must sit outside the DHCP pool. A DNS name, such as prn-2f-east.corp.example, lets queues survive an address change if the record is updated."],
            ["Use names in queues where you can", "If a hundred computers point to 10.40.8.25 and that address changes, a hundred queues break. If they point to a DNS name, you update one record. Keep record lifetimes (TTL) reasonable so a change takes effect promptly, and make sure the printer's actual certificate or configuration matches the name if you use encrypted printing."],
            ["Give printers their own space", "A dedicated printer subnet or VLAN makes addresses predictable and firewall rules simple: allow the print server or client subnets to reach printers on the needed ports, and block the rest. Size it with room to grow, and document which addresses are reserved, static or free."],
            ["Replacement is a lifecycle event", "A new printer has a new MAC address, so the old reservation will not apply. Update the reservation or DNS record, retire the old device's address, remove any certificate or SNMP entries that referred to it, and print a configuration page to confirm what the new device actually received."]
        ],
        figures: [
            { type: "stack", labelWidth: 0, total: 64, title: "Example printer subnet 10.40.8.0/26", desc: "A 64-address block: the network address, 1 gateway address, 20 reserved printer addresses, 10 static infrastructure addresses for print servers and management, 31 free addresses and the broadcast address.", caption: "An illustrative plan. Recording which addresses are reserved, static and free prevents two devices from being given the same address.",
                rows: [{ label: "", segments: [
                    { label: "Network and gateway", short: "Net+GW", value: 2, display: ".0 network, .1 gateway", tone: 4 },
                    { label: "DHCP reservations for printers", short: "Printers", value: 20, display: ".2–.21 reserved", tone: 1 },
                    { label: "Static infrastructure", short: "Static", value: 10, display: ".22–.31 servers/mgmt", tone: 0 },
                    { label: "Free for growth", short: "Free", value: 31, display: ".32–.62 free", tone: 3 },
                    { label: "Broadcast", short: "", value: 1, display: ".63 broadcast", tone: 4 }
                ] }] }
        ],
        table: { caption: "Choosing how a printer keeps its identity", columns: ["Method", "Strength", "Watch out for"], rows: [
            ["DHCP reservation", "Central control, easy to change", "Tied to one interface's MAC address"],
            ["Static on the printer", "Works without DHCP", "Must stay outside the pool; easy to forget"],
            ["DNS name in queues", "Queues survive address changes", "Record must be kept current; cached answers lag"],
            ["Discovery only", "No setup for users", "Fails across subnets without extra help"]
        ] },
        takeaway: "Give printers stable addresses, refer to them by name where possible, and treat every replacement as a change that touches reservations, DNS and queues.",
        studio: [["dhcp", "DHCP lease"], ["dns", "DNS lookup"]],
        lessons: [
            ["Label the hardware", "Put the printer's name and address on a visible label and in your asset list. When someone reports \"the printer by the kitchen\", you can map that to a queue name, an address and a switch port without guessing."],
            ["Avoid duplicate address surprises", "If someone types a static address that is also in the DHCP pool, another device may later receive it. The symptom is intermittent: printing works until the other device is on. Checking ARP tables or a DHCP conflict log usually reveals two MAC addresses claiming one IP."]
        ],
        practice: ["You replace a broken printer with the same model. Users' queues point to prn-hr.corp.example, which resolves to 10.40.8.12 through a DHCP reservation. After installation, nobody can print. What is the most likely cause?",
            "The reservation still names the old printer's MAC address, so the new printer received a different address from the pool. Update the reservation with the new MAC (or update the DNS record), renew the printer's lease and confirm the configuration page shows 10.40.8.12."],
        questions: [
            question("Why can a DNS name in print queues be easier to maintain than a raw IP address?", ["DNS makes printing faster", "One record can be updated instead of every queue", "Printers cannot use IP addresses", "DNS encrypts print jobs"], 1, "When the printer's address changes, updating one DNS record redirects every queue that uses the name."),
            question("A static address set on a printer must avoid which range?", ["The DHCP server's dynamic pool", "Every private address range", "The printer's own subnet", "All addresses ending in .1"], 0, "Addresses in the dynamic pool can be offered to another device, creating a duplicate address conflict."),
            question("Why does a DHCP reservation usually fail to apply to a replacement printer?", ["Reservations expire every night", "New printers cannot use DHCP", "The new printer has a different MAC address", "Reservations only work for laptops"], 2, "Reservations match the client's hardware address. A new device or interface needs its reservation updated."),
            question("Printing to one printer fails intermittently, and two MAC addresses appear for its IP in the switch's ARP data. What is likely happening?", ["The printer's toner is low", "The print driver is outdated", "Spanning Tree is blocking the port", "Two devices are using the same IP address"], 3, "Two MAC addresses answering for one IP is a classic sign of an address conflict.")
        ]
    },
    {
        id: "print-discovery", chapters: ["learnprint-discovery"], title: "Discovery across networks", minutes: 12,
        heading: "Why printers appear on one network and vanish on another",
        intro: "Discovery is how a computer learns that a printer exists without anyone typing its address. Most discovery protocols use link-local multicast, which deliberately stays on one network segment. That one design choice explains most \"I can't see the printer\" tickets in segmented networks.",
        builds: [["#printer-discover", "Discover & deliver", "printers advertise themselves"], ["#learn102-vlans", "VLANs & trunking", "VLANs split one switch into separate networks"]],
        goals: ["Explain how mDNS/DNS-SD and WS-Discovery advertise printers.", "Predict when discovery will fail across subnets or VLANs.", "Choose a safe way to make printers discoverable across networks."],
        concepts: [
            ["mDNS and DNS-SD", "Multicast DNS lets devices answer name queries on the local link using UDP port 5353 and the group 224.0.0.251 (ff02::fb for IPv6). DNS Service Discovery (DNS-SD) builds on it: a printer advertises services such as _ipp._tcp or _ipps._tcp, plus a TXT record describing formats and features. AirPrint and IPP Everywhere use this."],
            ["WS-Discovery and other methods", "Windows also uses WS-Discovery (WSD), which sends multicast probes on UDP port 3702. Older environments may use SLP or broadcast-based vendor tools. SNMP is often used after discovery to read status and model information. Each has the same limitation: probes are meant for the local segment."],
            ["Why routers stop discovery", "Link-local multicast is not forwarded by routers. When guests, staff and printers sit on different VLANs, a laptop's mDNS query never reaches the printer's segment. Nothing is broken; the boundary is working as designed. Direct printing by address or name still works if routing and firewall rules allow it."],
            ["Ways to cross the boundary", "A print server can publish shared queues so clients never need to discover printers. An mDNS gateway or reflector can relay selected advertisements between VLANs; filter it to the services you intend to share. Unicast DNS-SD lets a normal DNS zone hold printer service records for clients that support it."]
        ],
        figures: [
            { type: "graph", width: 640, height: 270, title: "Discovery stops at the router; printing does not have to", desc: "A laptop on the staff VLAN sends an mDNS query that reaches only its own segment. The printer is on a separate printer VLAN behind a router. A dashed blocked line shows multicast not crossing the router. A separate highlighted path shows direct IPP traffic routed to the printer's address.", caption: "The router does not forward link-local multicast, so the printer is invisible to discovery. A routed connection to the printer's name or address can still work if the firewall allows it.",
                nodes: [{ id: "Q", label: "mDNS query", sub: "224.0.0.251:5353", x: 320, y: 55, tone: 4 }, { id: "L", label: "Laptop", sub: "Staff VLAN", x: 90, y: 190, tone: 1 }, { id: "R", label: "Router/firewall", sub: "between VLANs", x: 320, y: 190, tone: 0 }, { id: "P", label: "Printer", sub: "Printer VLAN", x: 550, y: 190, tone: 2 }],
                edges: [{ from: "L", to: "Q", label: "stays on the staff VLAN", state: "blocked", dx: -40 }, { from: "L", to: "R", label: "IPP to 10.40.8.12:631", state: "path", arrow: true, dy: 34 }, { from: "R", to: "P", label: "routed IPP", state: "path", arrow: true, dy: 34 }] }

        ],
        table: { caption: "Common discovery mechanisms", columns: ["Mechanism", "Transport", "Typical use", "Crosses routers?"], rows: [
            ["mDNS / DNS-SD", "UDP 5353 multicast", "AirPrint, IPP Everywhere, Linux/CUPS", "No, without a gateway"],
            ["Unicast DNS-SD", "Normal DNS", "Managed networks publishing service records", "Yes"],
            ["WS-Discovery", "UDP 3702 multicast", "Windows device discovery", "No, without help"],
            ["Published queues", "Print server or directory", "Managed office printing", "Yes"]
        ] },
        takeaway: "Discovery is local by design. Across VLANs, publish queues, relay only chosen services or print by name and address.",
        studio: [["dns", "DNS lookup"], ["igmp", "IGMP multicast"]],
        lessons: [
            ["Reflectors need limits", "Relaying every mDNS advertisement between all VLANs can expose devices to guests and creates extra multicast noise. Good gateways let you choose which service types, VLANs and sometimes which devices are shared, keeping the original segmentation meaningful."],
            ["Discovery is not permission", "Seeing a printer in a list does not mean you are allowed to print to it, and hiding it does not stop a user who knows its address. Use firewall rules and printer or server access controls for permission, and treat discovery as convenience."]
        ],
        practice: ["Staff laptops on VLAN 20 cannot see printers on VLAN 40 in the add-printer list, but adding a printer by its IP address works. A colleague proposes reflecting all mDNS traffic between every VLAN. What would you recommend?",
            "The routing path works; only discovery is missing because mDNS does not cross routers. Either publish the printers as named queues or use an mDNS gateway limited to printer service types between VLAN 20 and VLAN 40. Reflecting everything everywhere would also expose unrelated devices, such as guest or IoT services."],
        questions: [
            question("Which UDP port does multicast DNS use?", ["53", "631", "5353", "9100"], 2, "mDNS uses UDP 5353 with the link-local multicast groups 224.0.0.251 and ff02::fb."),
            question("A laptop can print to a printer's IP address but cannot discover the printer. They are on different VLANs. What is the most likely explanation?", ["Link-local discovery multicast is not routed between the VLANs", "The printer's toner is empty", "IPP cannot cross routers", "The laptop's DNS cache is full"], 0, "Discovery multicast stays on one segment. Routed unicast printing can still work."),
            question("What does a DNS-SD service type such as _ipps._tcp tell a client?", ["The printer's paper size", "The printer's MAC address", "Which VLAN the printer uses", "That the device offers IPP over TLS"], 3, "DNS-SD service types describe services. _ipps._tcp advertises IPP over TLS."),
            question("Why should an mDNS gateway be filtered rather than relaying everything?", ["Filtering makes printing faster", "Unfiltered relaying can expose unrelated devices across security boundaries", "Gateways cannot relay printer services", "Filtering is required for IPv6"], 1, "Relaying only chosen services between chosen networks preserves segmentation while restoring the discovery users need.")
        ]
    },
    {
        id: "print-protocols", chapters: ["learnprint-protocols"], title: "IPP, 9100, LPD & SMB", minutes: 12,
        heading: "Choose how jobs travel to the printer",
        intro: "Once a printer is found, a protocol carries the job. The common choices differ in whether they can report status, authenticate users and encrypt the job. Knowing the trade-offs helps you pick a sensible default and recognize old configurations worth replacing.",
        builds: [["#learn-ports", "Ports & transport", "services listen on TCP or UDP ports"], ["#learn102-tcp", "TCP reliability", "TCP retransmits and orders data"]],
        goals: ["Compare IPP/IPPS, raw TCP 9100, LPD and SMB printing.", "Identify each protocol's default port and security limits.", "Recommend a modern default for new printers."],
        concepts: [
            ["IPP and IPPS", "The Internet Printing Protocol sends operations such as Print-Job and Get-Printer-Attributes over HTTP, usually on TCP port 631. Clients can query capabilities, supported formats and job status. IPPS is IPP over TLS, so jobs and credentials are encrypted in transit, and IPP supports user authentication when the printer or server is configured for it."],
            ["Raw printing on TCP 9100", "Often called AppSocket or JetDirect, raw printing opens a TCP connection to port 9100 and streams the job. It is simple and widely supported, but it has no built-in authentication, encryption or detailed job status. Anyone who can reach the port can send data to the printer."],
            ["LPD/LPR", "The Line Printer Daemon protocol (RFC 1179) uses TCP port 515 and names a queue on the printer or server. It is older, provides limited status and no encryption, and remains mainly for compatibility with legacy systems."],
            ["SMB printer shares", "Windows print servers commonly share queues over SMB on TCP port 445. Clients connect to a share such as \\\\printserver\\Finance-2F and may download drivers through Point and Print. SMB signing and encryption depend on server and client settings; the server then talks to the physical printer with its own protocol."]
        ],
        table: { caption: "Printing protocols at a glance", columns: ["Protocol", "Default port", "Job status", "Encryption"], highlight: 0, rows: [
            ["IPPS (IPP over TLS)", "TCP 631", "Detailed", "Yes, TLS"],
            ["IPP", "TCP 631", "Detailed", "No"],
            ["Raw / AppSocket", "TCP 9100", "Minimal", "No"],
            ["LPD / LPR", "TCP 515", "Basic", "No"],
            ["SMB share", "TCP 445", "Through the server", "Optional SMB encryption"]
        ] },
        figures: [
            { type: "bars", labelWidth: 150, max: 3, title: "Security features each protocol offers (illustrative score)", desc: "A count of three security features, authentication, encryption and detailed status: IPPS has 3, SMB shares 2, IPP 2, LPD 0 and raw 9100 0.", caption: "A simple teaching comparison, not a benchmark. SMB depends on configuration; IPP counts authentication and status without encryption.",
                items: [["IPPS", 3], ["SMB share", 2], ["IPP", 2], ["LPD/LPR", 0], ["Raw 9100", 0]].map(([label, value], index) => ({ label, value, display: `${value} of 3`, tone: index === 0 ? 1 : value ? 0 : 2 })) }
        ],
        takeaway: "Prefer IPPS for new printers and servers. Treat raw 9100 and LPD as legacy options that should only be reachable from trusted systems.",
        studio: [["http", "HTTP request"], ["tls", "TLS handshake"], ["smb", "SMB file share"]],
        lessons: [
            ["Status matters for support", "With IPP a client can ask whether the printer is idle, processing or stopped, and why: for example, media empty or door open. Raw printing often gives the computer no such feedback, so a job may look sent while nothing prints."],
            ["Encrypting the last hop", "If clients use IPPS to a print server but the server uses raw 9100 to the printer, the final hop is still unencrypted. Decide whether that link needs protection, and if so configure IPPS to the printer or keep that segment tightly controlled."]
        ],
        practice: ["A finance team prints sensitive reports to a printer that is reachable on TCP 9100 from the whole office network. The printer supports IPPS. What would you change?",
            "Configure queues to use IPPS so jobs are encrypted in transit, and restrict or disable port 9100 so only approved systems can submit jobs. If a print server is used, protect the server-to-printer hop too. Add secure release if printed pages sitting in the tray are also a concern."],
        questions: [
            question("Which port does IPP use by default?", ["TCP 9100", "TCP 515", "TCP 445", "TCP 631"], 3, "IPP and IPPS normally use TCP 631; IPPS adds TLS."),
            question("Which statement about raw printing on TCP 9100 is correct?", ["It has no built-in authentication or encryption", "It always encrypts jobs", "It requires a Windows domain", "It works only over USB"], 0, "Raw printing streams data to an open TCP port; access must be controlled by network rules."),
            question("Which protocol is designed for detailed printer and job status queries?", ["Raw 9100", "IPP", "LPD", "ARP"], 1, "IPP includes operations for printer attributes and job status."),
            question("Clients use IPPS to a print server, which forwards jobs to the printer on TCP 9100. What remains true?", ["Every hop is encrypted", "Discovery is required for each job", "The server-to-printer hop is not encrypted", "The printer must use LPD"], 2, "TLS protects only the IPPS connection. The raw 9100 hop from server to printer is unencrypted.")
        ]
    },
    {
        id: "print-drivers", chapters: ["learnprint-drivers"], title: "Drivers & page languages", minutes: 11,
        heading: "Speak the printer's language",
        intro: "Printers do not all understand the same input. A page has to be expressed in a page description language or raster format the device supports. Drivers used to be the only way to do that; driverless standards now let many printers advertise exactly what they accept.",
        builds: [["#printer-drivers", "Queues & security", "drivers translate jobs for a printer"]],
        goals: ["Distinguish PCL, PostScript, PDF and raster formats.", "Explain how driverless printing chooses a format.", "Diagnose symptoms caused by the wrong driver or format."],
        concepts: [
            ["Page description languages", "PCL (Printer Command Language) and PostScript describe pages with commands for text, shapes and images, and the printer renders them. Many printers also accept PDF directly. A printer that receives a language it does not support may print raw commands as text or print nothing at all."],
            ["Raster formats", "Raster formats send the page as already-rendered dots, line by line. PWG Raster is used by IPP Everywhere, and Apple raster (URF) by AirPrint. Rendering on the computer reduces dependence on the printer's interpreter but can produce larger jobs."],
            ["Driverless printing", "With IPP Everywhere, AirPrint and Mopria, the printer advertises its supported formats, media and features. The client renders the job into one of those standard formats and sends it with IPP. No vendor-specific driver installation is needed, which reduces security and maintenance work."],
            ["When vendor drivers still help", "Vendor drivers can expose advanced finishing, such as stapling, punching and special trays, or tuned color management. They must be kept updated, and installing drivers needs administrative trust. Choose them deliberately when users need features that driverless printing does not provide."]
        ],
        table: { caption: "Common job formats", columns: ["Format", "Type", "Typical use"], rows: [
            ["PCL 5 / PCL 6", "Command language", "Office laser printers"],
            ["PostScript", "Command language", "Design, publishing and many workgroup printers"],
            ["PDF", "Document format", "Direct PDF printing on capable devices"],
            ["PWG Raster", "Raster", "IPP Everywhere driverless printing"],
            ["Apple raster (URF)", "Raster", "AirPrint"]
        ] },
        figures: [
            { type: "graph", width: 640, height: 230, title: "Driverless printing negotiation", desc: "A client asks the printer for its attributes over IPP. The printer replies with supported formats such as PDF and PWG Raster. The client renders the job in a supported format and sends it.", caption: "The capability query lets the client choose a format the printer has said it understands.",
                nodes: [{ id: "C", label: "Client", sub: "asks", x: 110, y: 55, tone: 1 }, { id: "P", label: "Printer", sub: "IPP service", x: 530, y: 55, tone: 2 }, { id: "R", label: "Client", sub: "renders job", x: 110, y: 180, tone: 1 }, { id: "O", label: "Printer", sub: "prints", x: 530, y: 180, tone: 2 }],
                edges: [{ from: "C", to: "P", label: "1. Get-Printer-Attributes", arrow: true }, { from: "P", to: "R", label: "2. formats: PDF, PWG Raster", arrow: true, dx: 40, dy: -10 }, { from: "R", to: "O", label: "3. Print-Job (PWG Raster)", state: "path", arrow: true, dy: 30 }] }

        ],
        takeaway: "The job format must match what the printer accepts. Driverless printing negotiates that over IPP; vendor drivers trade simplicity for extra features.",
        studio: [["http", "HTTP request"]],
        lessons: [
            ["Universal drivers", "Many vendors offer a universal driver that supports a family of models with one package. It simplifies servers but may hide model-specific features. Test duplex, trays and finishing with each model before deploying widely."],
            ["Driver trust and Point and Print", "Drivers run with high privileges in the print system. After the 2021 PrintNightmare vulnerabilities, Windows restricted Point and Print driver installation to administrators by default. Package and approve drivers centrally instead of letting users install them from shares."]
        ],
        practice: ["A newly added printer prints every page as lines beginning with @PJL and strange symbols. The queue was created with a generic PostScript driver. What is wrong and how would you fix it?",
            "The printer is receiving a language it is not interpreting as intended, so it prints the commands. Confirm which formats it supports from its configuration page or IPP attributes, then switch the queue to driverless IPP Everywhere or the correct PCL/PostScript driver for that model."],
        questions: [
            question("Which format sends the page as already-rendered dots?", ["PCL 5", "PostScript", "PWG Raster", "LPD"], 2, "PWG Raster is a raster format, used by IPP Everywhere."),
            question("How does a driverless client learn which formats a printer supports?", ["It guesses from the printer's color", "It reads the printer's IPP attributes", "It asks the DHCP server", "It checks the switch port speed"], 1, "IPP printers advertise attributes, including supported document formats."),
            question("Why might an organization still choose a vendor driver?", ["Vendor drivers never need updates", "They are required for any network printing", "They remove the need for a spooler", "They can expose advanced finishing or tray features"], 3, "Vendor drivers can offer device-specific features that standard driverless printing may not expose."),
            question("A printer receives a language it does not support. What is a common symptom?", ["Pages of command text or nothing printed", "Faster printing", "A new IP address", "Automatic duplex printing"], 0, "Unsupported data may be printed as text or discarded by the printer.")
        ]
    },
    {
        id: "print-servers", chapters: ["learnprint-servers"], title: "Print servers & queues", minutes: 11,
        heading: "Centralize printing without creating a single point of failure",
        intro: "A print server collects jobs from many clients and sends them to printers. It can simplify drivers, permissions and auditing, but it also becomes infrastructure that needs monitoring, updates and a recovery plan.",
        builds: [["#printer-drivers", "Queues & security", "queues hold jobs and settings"], ["#learn-fix", "Troubleshoot with evidence", "scope a problem before changing things"]],
        goals: ["Compare direct-IP printing with server-based queues.", "Configure sensible queue permissions and defaults.", "Recognize print server failure modes."],
        concepts: [
            ["Why use a print server", "A server keeps one copy of each queue configuration, distributes approved drivers, applies permissions and records who printed what. Users can be given queues through policy instead of adding printers manually. Changes to a printer's address are made once on the server."],
            ["Direct-IP printing", "Without a server, each computer sends jobs straight to the printer. There is no central queue to fail, and small offices often prefer it. The trade-off is that every client needs its own driver and queue settings, and auditing depends on the printer's own logs."],
            ["Queues are policy", "Each queue has defaults and permissions: who may print, manage documents or change settings, plus default duplex, color and paper size. Separate queues for the same printer can offer different defaults, such as a black-and-white duplex queue that saves toner."],
            ["Server failure modes", "If the spooler stops, its disk fills or a driver crashes, every queue on that server can stop. Monitor the service, free space and queue lengths, keep the server patched and plan how clients will print if it is unavailable."]
        ],
        figures: [
            { type: "graph", width: 640, height: 260, title: "Server-based printing", desc: "Three client computers send jobs to a print server over SMB or IPPS. The server sends jobs to two printers over IPPS.", caption: "Clients talk to the server; the server talks to printers. Firewall rules can then allow only the server to reach printers.",
                nodes: [{ id: "C1", label: "Client", x: 90, y: 55, tone: 1 }, { id: "C2", label: "Client", x: 90, y: 130, tone: 1 }, { id: "C3", label: "Client", x: 90, y: 205, tone: 1 }, { id: "S", label: "Print server", sub: "queues + drivers", x: 320, y: 130, tone: 0 }, { id: "P1", label: "Printer A", x: 550, y: 80, tone: 2 }, { id: "P2", label: "Printer B", x: 550, y: 180, tone: 2 }],
                edges: [{ from: "C1", to: "S", arrow: true }, { from: "C2", to: "S", label: "SMB / IPPS", arrow: true, dy: -10 }, { from: "C3", to: "S", arrow: true }, { from: "S", to: "P1", label: "IPPS", state: "path", arrow: true }, { from: "S", to: "P2", label: "IPPS", state: "path", arrow: true }] }
        ],
        table: { caption: "Direct-IP compared with a print server", columns: ["Question", "Direct-IP", "Print server"], rows: [
            ["Single point of failure?", "No central queue", "Yes, unless made resilient"],
            ["Driver management", "On every client", "Central approval and distribution"],
            ["Audit trail", "Printer logs only", "Server logs plus printer logs"],
            ["Firewall rules", "Clients need printer access", "Only the server needs printer access"]
        ] },
        takeaway: "A print server centralizes drivers, permissions and logs. Treat it like any critical service: monitor it, patch it and plan for its failure.",
        studio: [["smb", "SMB file share"]],
        lessons: [
            ["CUPS as a server", "On Linux and macOS, CUPS can share queues with other clients over IPP. Its web interface and configuration control who may print and administer queues. Restrict administrative access and avoid exposing the CUPS port beyond the networks that need it."],
            ["Cloud print services", "Some organizations replace on-site servers with a cloud print service. The printer or a connector makes an outbound connection to the service, and users print through their identity. It removes local servers but adds dependence on internet access and the provider."]
        ],
        practice: ["Every user in an office suddenly reports that printing fails. All printers show Ready on their panels, and they can be pinged from the server. Jobs from all users are stuck on the print server. Where do you look?",
            "The common component is the server, not the printers. Check the spooler service status, recent errors, free disk space in the spool folder and whether one stuck job or driver crash is blocking queues. Restart the service only after collecting that evidence."],
        questions: [
            question("Which is a key advantage of a print server?", ["It removes the need for printers to have addresses", "Drivers, permissions and logs can be managed centrally", "It eliminates every single point of failure", "It makes discovery cross routers automatically"], 1, "Central management is the main benefit; the server itself must be made reliable."),
            question("With a print server, which firewall rule is often possible?", ["Allow only the server to submit jobs to printers", "Allow the internet to reach printers", "Block the server from printers", "Disable all client access to the server"], 0, "Clients send to the server, so printers only need to accept jobs from the server."),
            question("Why might you create two queues for one physical printer?", ["Printers require exactly two queues", "To give each queue a different MAC address", "To offer different defaults or permissions", "To speed up DHCP"], 2, "Separate queues can provide different defaults such as color or duplex, or different access."),
            question("All users' jobs are stuck on the server, but printers are reachable. What is the best first area to investigate?", ["Each user's monitor", "The building's Wi-Fi channels", "Every printer's toner", "The server's spooler, disk and logs"], 3, "The shared failure points to the server's print service or storage.")
        ]
    },
    {
        id: "print-wireless", chapters: ["learnprint-wireless"], title: "Wireless & mobile printing", minutes: 10,
        heading: "Keep wireless printers reachable and contained",
        intro: "Wireless printers are convenient until they sleep, roam, lose signal or land on the wrong network. Mobile devices add another layer: they rely on discovery and often sit on guest or isolated Wi-Fi.",
        builds: [["#learn-wireless", "Wi-Fi without the mystery", "radio bands and guest networks"], ["#learn102-wireless", "Wi-Fi design", "coverage and channel planning"]],
        goals: ["Identify wireless problems specific to printers.", "Explain Wi-Fi Direct and its risks.", "Design safe mobile printing for staff and guests."],
        concepts: [
            ["Printers are quiet clients", "A printer may sit idle for hours, enter power-saving mode and stop answering discovery or pings. Some access points disconnect idle clients. Wired Ethernet avoids most of this; for wireless printers, use a stable address, a strong signal and power-saving settings that still allow network wake-up."],
            ["Band and security support", "Many printers support 2.4 GHz only, and some older models cannot join networks that require WPA3 or certain enterprise authentication methods. Check the printer's specifications before changing an SSID to 5 GHz only or a stricter security mode, or provide a dedicated printer network."],
            ["Wi-Fi Direct", "Wi-Fi Direct lets the printer create its own small network, so a phone can connect directly. It is useful where no infrastructure Wi-Fi exists, but it adds another network with its own password. Disable it where not needed, or set a strong password, so visitors cannot use it to reach the printer's services."],
            ["Mobile printing on segmented networks", "Phones usually find printers with mDNS, which is blocked by guest isolation and separate VLANs. Options include a guest printer placed on the guest network, a filtered mDNS gateway or a print service with its own access controls. Never solve it by removing guest isolation entirely."]
        ],
        figures: [
            { type: "bars", labelWidth: 170, max: 4, title: "Common causes of \"printer offline\" on Wi-Fi (example ticket review)", desc: "An illustrative review of 10 tickets: 4 caused by sleep or idle disconnects, 3 by an address change, 2 by the wrong network or isolation, and 1 by weak signal.", caption: "Example data for teaching, not a survey. It shows why a stable address and sleep settings deserve checking before replacing hardware.",
                items: [["Sleep / idle disconnect", 4], ["Address changed", 3], ["Wrong network / isolation", 2], ["Weak signal", 1]].map(([label, value], index) => ({ label, value, display: `${value} tickets`, tone: index === 0 ? 2 : index === 1 ? 1 : 0 })) }
        ],
        table: { caption: "Wireless printer settings to confirm", columns: ["Setting", "Why it matters"], rows: [
            ["Band (2.4 or 5 GHz)", "The printer must support the band the SSID offers"],
            ["Security mode", "Older printers may not support WPA3 or some enterprise methods"],
            ["Address", "A reservation keeps queues working after sleep or reconnects"],
            ["Sleep and network wake", "Deep sleep can hide the printer from discovery"],
            ["Wi-Fi Direct", "Disable it or protect it with a strong password"]
        ] },
        takeaway: "Wireless printers need a stable address, compatible band and security settings and sensible sleep behavior. Mobile printing should respect guest isolation, not remove it.",
        studio: [["wifi", "Wi-Fi association"], ["wpa3", "WPA3 authentication"]],
        lessons: [
            ["Signal strength is not throughput", "A printer showing one bar may still connect but retransmit heavily, making large jobs fail. Check the printer's reported signal and, if possible, the access point's view of the client. Moving the printer or an access point is often cheaper than repeated troubleshooting."],
            ["Roaming and multiple SSIDs", "If several SSIDs exist, a printer configured for one may join another after a reset. Document which network each printer belongs to and remove saved networks it should not use."]
        ],
        practice: ["IT changes the office SSID to 5 GHz only with WPA3. The next morning, laptops work but two older printers are offline. What likely happened, and what are safe options?",
            "The older printers may support only 2.4 GHz or older security modes, so they can no longer join. Safe options are to connect them by Ethernet, provide a separate printer SSID or VLAN that they support with strong settings, or replace them. Do not weaken security for every device."],
        questions: [
            question("Why might a printer stop responding after several idle hours on Wi-Fi?", ["Power saving or idle disconnects", "Its toner expired", "DNS cannot resolve printers", "Its PCL driver was removed"], 0, "Sleep modes and access point idle timeouts can make wireless printers temporarily unreachable."),
            question("What should you check before making an SSID 5 GHz only?", ["Whether printers support PostScript", "Whether printers support 5 GHz", "Whether printers use LPD", "Whether printers have paper"], 1, "Some printers support only 2.4 GHz and cannot join a 5-GHz-only network."),
            question("What is a sensible Wi-Fi Direct setting where it is not needed?", ["Leave it open", "Publish its password", "Disable it", "Bridge it to the internet"], 2, "Disabling unused Wi-Fi Direct removes an extra path to the printer."),
            question("Guests need to print, but guest Wi-Fi is isolated. What is a safe approach?", ["Remove isolation from guest Wi-Fi", "Put guests on the staff VLAN", "Expose printers to the internet", "Provide a controlled guest printing path"], 3, "Keep isolation and add a deliberate, limited printing option.")
        ]
    },
    {
        id: "print-scanning", chapters: ["learnprint-scanning"], title: "Scanning & multifunction devices", minutes: 11,
        heading: "Multifunction devices send data too",
        intro: "A multifunction printer (MFP) can print, copy, scan and sometimes fax. Scanning reverses the usual direction: the device sends documents out to email servers, file shares or computers. Those destinations require credentials and secure protocols.",
        builds: [["#printer-others", "Other shared devices", "MFPs act like small computers"], ["#learn-security", "Safer network habits", "least privilege and segmentation"]],
        goals: ["Compare scan-to-email, scan-to-folder and driverless scanning.", "Choose least-privilege credentials for scanning.", "Diagnose common scan delivery failures."],
        concepts: [
            ["Scan to email", "The MFP acts as an email client and submits messages through an SMTP server, commonly on TCP 587 with STARTTLS or 465 with implicit TLS. Many cloud mail providers restrict or retire basic password authentication for SMTP, so older devices may need an approved relay, modern authentication or a vendor connector."],
            ["Scan to folder", "The MFP connects to a network share, usually with SMB on TCP 445, and writes a file. It needs the server name, share path and an account with write permission. Modern Windows systems disable SMBv1, so very old devices that only support SMBv1 may fail and should be updated or replaced, not used to justify re-enabling SMBv1."],
            ["Driverless and computer-initiated scanning", "With eSCL (often called AirScan) or WSD Scan, a computer finds the scanner and pulls the image over HTTP or HTTPS. This avoids storing credentials on the device, but it relies on discovery or an entered address, so the same VLAN rules apply."],
            ["Address books and stored credentials", "MFPs often store email addresses, share paths and passwords. Protect the admin interface, use a dedicated low-privilege scanning account, limit which folders it can write to and remove stale entries. A compromised scanner account should not open the whole file server."]
        ],
        table: { caption: "Scan destinations", columns: ["Destination", "Protocol", "Credential needed", "Common failure"], rows: [
            ["Email", "SMTP 587 or 465", "Mail account or relay permission", "Authentication method rejected"],
            ["Network folder", "SMB 445", "Account with write access", "SMBv1-only device or wrong share permissions"],
            ["Computer (driverless)", "eSCL or WSD over HTTP(S)", "Usually none on the device", "Scanner not discoverable across VLANs"],
            ["FTP", "FTP 21", "FTP account", "Unencrypted; avoid on untrusted networks"]
        ] },
        figures: [
            { type: "graph", width: 640, height: 250, title: "Where a scan travels", desc: "An MFP sends scans to three destinations: an SMTP server on port 587 for email, a file server on port 445 for folders, and a computer that pulls scans over eSCL.", caption: "Scanning creates outbound connections from the MFP. Firewall rules and credentials should allow only the destinations you intend.",
                nodes: [{ id: "M", label: "MFP", sub: "scanner", x: 110, y: 125, tone: 2 }, { id: "E", label: "Mail server", sub: "SMTP 587", x: 510, y: 45, tone: 0 }, { id: "F", label: "File server", sub: "SMB 445", x: 510, y: 125, tone: 0 }, { id: "C", label: "Computer", sub: "eSCL client", x: 510, y: 205, tone: 1 }],
                edges: [{ from: "M", to: "E", label: "scan to email", state: "path", arrow: true }, { from: "M", to: "F", label: "scan to folder", state: "path", arrow: true }, { from: "C", to: "M", label: "computer pulls scan", arrow: true, dy: 12 }] }
        ],
        takeaway: "Scanning sends data out from the MFP. Use secure protocols, least-privilege service accounts and protected device settings.",
        studio: [["smtp", "SMTP email"], ["smb", "SMB file share"], ["tls", "TLS handshake"]],
        lessons: [
            ["Test the destination separately", "If scan to folder fails, test the same share path and account from a computer. If that also fails, the problem is the share or credentials. If it works, compare the device's SMB version, name resolution and saved path."],
            ["Faxes and phone lines", "Fax uses telephone networks or a fax-over-IP service, not normal printing protocols. Fax-to-email gateways combine fax and email paths. Diagnose them as separate legs with separate logs."]
        ],
        practice: ["An older MFP suddenly cannot scan to email. Nothing changed on the device, but the organization's cloud mail service recently disabled basic SMTP authentication. What should you do?",
            "The device's password-based SMTP login is now rejected. Use a supported method: update firmware for modern authentication if available, configure an approved SMTP relay restricted to the device, or use a vendor or cloud scanning connector. Do not re-enable a weaker method for every mailbox."],
        questions: [
            question("Which protocol does scan to email usually use to send messages?", ["IPP", "SMTP", "LPD", "mDNS"], 1, "The MFP submits email through an SMTP server."),
            question("A very old MFP can scan to folders only with SMBv1. What is the safer response?", ["Re-enable SMBv1 on all servers", "Share the folder with Everyone", "Update or replace the device, or use another scan method", "Disable the firewall"], 2, "SMBv1 is obsolete. Keep it disabled and choose a supported path."),
            question("Which account is best for scan to folder?", ["A dedicated account with write access only to scan folders", "A domain administrator", "A shared guest account with access everywhere", "The help desk manager's account"], 0, "Least privilege limits the damage if the device's stored credentials are exposed."),
            question("What does eSCL scanning usually change?", ["The MFP sends email through SMTP", "The scanner requires SMBv1", "The scanner needs a static MAC", "A computer pulls the scan from the device"], 3, "eSCL lets a computer request and receive the scan over HTTP or HTTPS.")
        ]
    },
    {
        id: "print-security", chapters: ["learnprint-security"], title: "Printer security & management", minutes: 12,
        heading: "Treat printers like networked computers",
        intro: "Modern printers run operating systems, web servers, storage and network services. They store documents and credentials and may be forgotten for years. Secure them with the same habits used for other endpoints.",
        builds: [["#printer-secure", "Queues & security", "basic printer security"], ["#firewall", "Firewall rule builder", "allow only necessary traffic"]],
        goals: ["Build a printer hardening checklist.", "Choose secure management and monitoring protocols.", "Limit exposure with segmentation and secure release."],
        concepts: [
            ["Start with access", "Change default administrator passwords, restrict the web admin page to management networks and use HTTPS for administration. Disable services you do not use, such as Telnet, FTP, LPD, raw printing or Wi-Fi Direct. Every enabled service is another way in."],
            ["Patch and inventory", "Printer firmware receives security fixes. Keep an inventory of model, firmware, address, location and owner so you can find affected devices when an advisory appears. Schedule updates and verify that settings survive them."],
            ["Manage with secure protocols", "SNMP lets tools read status, toner levels and counters. Use SNMPv3 with authentication and privacy where possible; SNMPv1 and v2c send community strings in clear text, and default community names such as public should be changed or disabled. Send logs to a central collector if the device supports it."],
            ["Protect documents", "Secure release, also called pull printing, holds a job until the user authenticates at the device, so sensitive pages do not sit in the tray. Printers with internal storage can retain job data; enable encryption or overwrite options and wipe storage before disposal."]
        ],
        figures: [
            { type: "graph", width: 640, height: 260, title: "A segmented printer network", desc: "Staff clients send jobs only to the print server. The print server sends jobs to the printer VLAN. A management workstation reaches printer admin pages over HTTPS and SNMPv3. The internet is blocked from the printer VLAN.", caption: "Allow only the paths printing needs. Printers should not accept connections from the internet or from every client segment.",
                nodes: [{ id: "C", label: "Staff clients", x: 90, y: 70, tone: 1 }, { id: "S", label: "Print server", x: 320, y: 70, tone: 0 }, { id: "P", label: "Printer VLAN", x: 550, y: 130, tone: 2 }, { id: "M", label: "Admin station", x: 320, y: 200, tone: 3 }, { id: "I", label: "Internet", x: 90, y: 200, tone: 4 }],
                edges: [{ from: "C", to: "S", label: "IPPS / SMB", arrow: true }, { from: "S", to: "P", label: "IPPS", state: "path", arrow: true }, { from: "M", to: "P", label: "HTTPS + SNMPv3", arrow: true, dy: 18 }, { from: "I", to: "P", label: "blocked", state: "blocked", dy: 20 }] }
        ],
        table: { caption: "Printer hardening checklist", columns: ["Area", "Action"], rows: [
            ["Administration", "Unique admin password; HTTPS only; restrict by network"],
            ["Services", "Disable unused protocols and Wi-Fi Direct"],
            ["Firmware", "Track versions and apply security updates"],
            ["Monitoring", "Use SNMPv3; change or disable v1/v2c communities"],
            ["Documents", "Secure release; encrypted or wiped storage"],
            ["Exposure", "Never publish printers directly to the internet"]
        ] },
        takeaway: "Printers are computers with paper. Restrict access, patch firmware, disable unused services, monitor securely and protect stored documents.",
        studio: [["tls", "TLS handshake"], ["https", "HTTPS page load"]],
        lessons: [
            ["Why internet exposure is dangerous", "Search engines continuously index devices with open printing and admin ports. An exposed printer can receive unwanted jobs, leak information through its web interface or be attacked through firmware flaws. Use a VPN or a managed cloud print service for remote printing instead."],
            ["Disposal is a security step", "Before returning a leased or retired printer, use its secure erase function, remove address books and credentials, and record that it was done. Hard drives and flash storage can retain old scans and jobs."]
        ],
        practice: ["A security scan finds that a branch printer accepts Telnet, FTP and SNMP with community string public, and its admin page uses the factory password. What would you do first?",
            "Change the admin password and restrict admin access to the management network, disable Telnet and FTP if not required, disable SNMP v1/v2c or replace public with SNMPv3 credentials, update firmware and add the device to inventory and monitoring. Then check whether other printers from the same rollout share these settings."],
        questions: [
            question("Which SNMP version supports authentication and privacy?", ["SNMPv1", "SNMPv2c", "SNMPv3", "SNMP public"], 2, "SNMPv3 can authenticate requests and encrypt management data."),
            question("What is the safest remote-printing approach?", ["Expose TCP 9100 to the internet", "Use a VPN or managed print service", "Publish the admin page publicly", "Disable all passwords"], 1, "Remote users should connect through authenticated, maintained services rather than directly exposed printer ports."),
            question("What does secure release protect against?", ["Sensitive pages sitting unattended in the output tray", "DHCP address conflicts", "Wrong paper size", "Wi-Fi interference"], 0, "Secure release holds jobs until the user authenticates at the printer."),
            question("What should happen before a printer with internal storage is disposed of?", ["Raise its print speed", "Enable Wi-Fi Direct", "Change its paper tray", "Securely erase stored data and credentials"], 3, "Internal storage can retain jobs, scans and saved credentials.")
        ]
    },
    {
        id: "print-troubleshooting", chapters: ["learnprint-troubleshooting"], title: "Troubleshooting method", minutes: 12,
        heading: "Fix printers with evidence, not guesses",
        intro: "Printer problems are easier when you combine general troubleshooting with the print path. Define the scope, check the last stage that worked, test the next hand-off and change one thing at a time.",
        builds: [["#learn-fix", "Troubleshoot with evidence", "scope symptoms and test one layer at a time"], ["#printer-fix", "Fix offline", "common printer symptoms"]],
        goals: ["Scope printer issues by user, queue, printer and network.", "Use layered tests from queue to device.", "Choose low-impact fixes and document the cause."],
        concepts: [
            ["Scope first", "Ask who is affected, which printer and queue, what changed and when it began. One user points to that client or queue; everyone on one printer points to the device or its network; every printer on one server points to the server. Scope prevents random restarts."],
            ["Check the queue", "Look for the job and its status. Paused queues, errors, stuck jobs or offline status are clues. Compare the queue's target address or name, driver and port with a working computer or with documentation."],
            ["Test the path", "Can the client resolve the printer's name? Can it reach the address? Is the printing port open: 631 for IPP, 9100 for raw or 445 for an SMB server? A ping may be blocked even when printing works, so test the actual service port where possible."],
            ["Check the device and record the fix", "Print a configuration page to verify address, gateway, DNS and enabled protocols. Check the panel and job log for media, memory or certificate errors. After the fix, record the cause and update monitoring or documentation so it is easier next time."]
        ],
        figures: [
            { type: "graph", width: 640, height: 270, title: "A printer troubleshooting flow", desc: "Start by scoping who is affected. Then check the queue, name resolution, network reachability, service port and device status. Each successful check moves to the next step.", caption: "Work along the path. The first failed check tells you where to focus.",
                nodes: [{ id: "S", label: "Scope", sub: "who and what?", x: 80, y: 70, tone: 1 }, { id: "Q", label: "Queue", sub: "job status", x: 245, y: 70, tone: 0 }, { id: "N", label: "Name", sub: "DNS", x: 410, y: 70, tone: 0 }, { id: "R", label: "Reach", sub: "address/path", x: 560, y: 145, tone: 0 }, { id: "P", label: "Port", sub: "631/9100/445", x: 410, y: 220, tone: 3 }, { id: "D", label: "Device", sub: "config + log", x: 245, y: 220, tone: 2 }],
                edges: [{ from: "S", to: "Q", state: "path", arrow: true }, { from: "Q", to: "N", state: "path", arrow: true }, { from: "N", to: "R", state: "path", arrow: true }, { from: "R", to: "P", state: "path", arrow: true }, { from: "P", to: "D", state: "path", arrow: true }] }
        ],
        table: { caption: "Symptom to first check", columns: ["Symptom", "First check"], rows: [
            ["One user cannot print", "That user's queue, driver and target"],
            ["Everyone fails on one printer", "Printer status, address and network port"],
            ["Every printer on a server fails", "Server spooler, disk and logs"],
            ["Printer works by IP, not discovery", "VLAN boundary and discovery method"],
            ["Garbled output", "Driver or document format"],
            ["Scans fail but printing works", "Scan destination, credentials and protocol"]
        ] },
        takeaway: "Scope the problem, follow the print path and test the actual service. Fix the cause, then document it.",
        studio: [["icmp", "ICMP ping"], ["tcp", "TCP handshake"], ["dns", "DNS lookup"]],
        lessons: [
            ["Useful client tests", "On Windows, Test-NetConnection printer-name -Port 631 checks name resolution and a TCP connection. On macOS and Linux, lpstat -p shows printer status, and lpoptions or the CUPS web interface shows queue settings. These checks prove reachability, not that the job format is correct."],
            ["Restart with purpose", "Restarting a printer or spooler can clear a stuck state, but it also erases evidence. Note the queue status, errors and time first. If the symptom returns, those notes show whether it was a memory, driver, network or service problem."]
        ],
        practice: ["Users on one floor say the printer is offline. The printer panel says Ready. A client can resolve its name, but Test-NetConnection to port 631 fails. Another floor can print to it. What does that suggest?",
            "The device appears healthy and name resolution works, but the affected floor cannot reach the IPP port. Check the routing and firewall rules between that floor's subnet and the printer, plus any recent ACL change. The other floor's success suggests a path or policy difference, not a printer fault."],
        questions: [
            question("Every user printing to one printer fails, but other printers work. Where should you focus first?", ["Each user's monitor", "That printer and its network path", "Every client's browser", "The DHCP pool for laptops"], 1, "The shared failure is the one printer or its path."),
            question("Why test the printer's service port instead of relying only on ping?", ["Ping is always faster", "Ports are only used by DNS", "ICMP can be blocked while the print service still works, or the reverse", "Printers cannot receive ICMP"], 2, "A port test checks the service that actually carries jobs."),
            question("What is a good first check when one user cannot print?", ["That user's queue, driver and printer target", "Replace the switch", "Restart every printer", "Change the building's SSID"], 0, "A single affected user points to that client or its configuration."),
            question("Why record queue status and errors before restarting a spooler?", ["Restarts make printing slower", "The spooler requires notes to start", "Records change the printer's address", "A restart can erase evidence needed to find the cause"], 3, "Evidence helps identify recurring causes after a temporary fix.")
        ]
    }
];

export const troubleshootingCases = [
    {
        id: "case-one-floor", title: "One floor cannot print",
        scenario: "After a weekend network change, staff on the third floor cannot print to PRN-HR. Staff on the second floor can. The printer panel says Ready.",
        evidence: ["Third-floor laptop resolves prn-hr.corp.example to 10.40.8.12.", "Ping from the third floor fails; ping from the second floor works.", "Test-NetConnection to 10.40.8.12 port 631 fails from the third floor."],
        question: question("What is the most likely next area to inspect?", ["The printer's toner", "Routing or firewall rules between the third-floor subnet and the printer VLAN", "Every laptop's print driver", "The printer's paper size"], 1, "Name resolution works and the printer serves another floor. Failed reachability from one subnet after a network change points to routing or ACLs.")
    },
    {
        id: "case-garbled", title: "Pages of symbols",
        scenario: "A new printer was added to a print server. Users receive pages that begin with @PJL and contain long lines of symbols.",
        evidence: ["The queue uses a driver for another model.", "The printer's configuration page lists PCL 6, PDF and PWG Raster."],
        question: question("What is the best fix?", ["Change the printer's DHCP lease", "Reboot the core switch", "Assign a supported driver or driverless IPP Everywhere queue", "Disable TLS"], 2, "The wrong format is reaching the printer. Use a driver or driverless format the printer supports.")
    },
    {
        id: "case-guest", title: "Guests cannot find the printer",
        scenario: "Visitors on guest Wi-Fi need to print in the lobby. Staff can see the printer. Guest phones cannot discover it.",
        evidence: ["Guest Wi-Fi uses client isolation and a separate VLAN.", "The printer is on the staff printer VLAN."],
        question: question("Which response best preserves security?", ["Remove guest isolation for everyone", "Move guests onto the staff VLAN", "Provide a controlled guest printer path such as a guest-network printer or filtered printing service", "Publish the printer to the internet"], 2, "Keep guest isolation and add a deliberate, limited printing path.")
    },
    {
        id: "case-scan-folder", title: "Scans stop reaching a folder",
        scenario: "An old MFP stopped scanning to a shared folder after the file server was upgraded. Printing from the MFP still works.",
        evidence: ["The server disables SMBv1.", "The MFP firmware supports SMBv1 only.", "The same account can write to the share from a computer."],
        question: question("What should you recommend?", ["Update or replace the MFP, or choose another secure scan destination", "Re-enable SMBv1 on the server", "Give the scan account domain administrator rights", "Turn off the server firewall"], 0, "The device needs a supported protocol. Re-enabling obsolete SMBv1 would weaken the server.")
    },
    {
        id: "case-server", title: "Every queue is stuck",
        scenario: "Every user's jobs stay queued on PRINT-01. All printers are reachable from the server and show Ready.",
        evidence: ["The spool folder's disk has 0 MB free.", "The Print Spooler service is running, but no queue is moving."],
        question: question("What is the most likely cause?", ["Every printer has the wrong DNS name", "Guest Wi-Fi isolation", "Printer toner is empty", "The print server's spool storage is full"], 3, "Jobs need disk space while queued. The shared server symptom and full spool disk point to storage.")
    }
];

export const finalExam = [
    { module: "print-path", ...question("A job appears in the queue as Sent, but nothing prints. Which stages remain to check?", ["Only the application", "Only the print dialog", "Transport and the printer", "The user's keyboard"], 2, "The job has left the queue, so check delivery and the device.") },
    { module: "print-path", ...question("What does a print queue usually represent?", ["A printer's paper drawer", "A printer configuration with destination, driver and defaults", "A DNS server", "A Wi-Fi channel"], 1, "A queue combines where jobs go and how they are prepared.") },
    { module: "print-addressing", ...question("Why should printer address plans include free space?", ["Printers require half a subnet", "To allow growth without renumbering", "To disable broadcasts", "To make DHCP slower"], 1, "Reserving room avoids redesigning addresses when more devices arrive.") },
    { module: "print-addressing", ...question("A replacement printer has a new MAC. What should be updated if the old one used a reservation?", ["The paper size", "The printer's toner model", "The guest SSID", "The DHCP reservation"], 3, "Reservations match a hardware address, so the new MAC must be recorded.") },
    { module: "print-discovery", ...question("WS-Discovery primarily uses which transport?", ["TCP 631 unicast", "UDP 3702 multicast", "TCP 445 unicast", "UDP 53 unicast"], 1, "WSD sends multicast discovery probes on UDP 3702.") },
    { module: "print-discovery", ...question("Which option lets managed clients find printers through a normal DNS zone?", ["SMBv1", "Raw 9100", "Unicast DNS-SD", "Wi-Fi Direct"], 2, "Unicast DNS-SD stores service discovery records in DNS.") },
    { module: "print-protocols", ...question("Which protocol commonly uses TCP 515?", ["LPD/LPR", "IPPS", "SMB", "mDNS"], 0, "LPD/LPR, the older Line Printer Daemon protocol, uses TCP 515.") },
    { module: "print-protocols", ...question("Which protocol is the best modern default for encrypted network printing?", ["Raw 9100", "LPD", "IPPS", "Telnet"], 2, "IPPS adds TLS to IPP, encrypting jobs and credentials in transit.") },
    { module: "print-drivers", ...question("Which format is used by AirPrint as a raster format?", ["SMB", "SNMPv3", "LPD", "Apple raster (URF)"], 3, "AirPrint commonly uses Apple raster, also called URF.") },
    { module: "print-drivers", ...question("What is a main benefit of driverless printing?", ["It removes the need for networks", "Clients use standard advertised formats without installing vendor drivers", "It guarantees stapling support", "It replaces DHCP"], 1, "Driverless printing uses standard formats and IPP capability information.") },
    { module: "print-servers", ...question("What is a main risk of using one print server?", ["It prevents logging", "It requires every user to be an administrator", "It can become a single point of failure", "It disables IPPS"], 2, "A central server needs monitoring and recovery planning.") },
    { module: "print-servers", ...question("Which design lets you allow only one system to submit jobs to printers?", ["Direct-IP from every client", "A print server forwarding jobs", "Wi-Fi Direct", "Disabling DNS"], 1, "With a print server, the server can be the only client allowed to reach printers.") },
    { module: "print-wireless", ...question("Why can Wi-Fi Direct be a security concern?", ["It creates another network path to the printer", "It disables printing", "It changes PCL to PostScript", "It requires SMBv1"], 0, "An unused or weakly protected Wi-Fi Direct network adds exposure.") },
    { module: "print-wireless", ...question("What is a common reason older printers cannot join a newly secured SSID?", ["They cannot print PDFs", "They do not support the band or security mode", "They lack a toner sensor", "They require LPD"], 1, "Hardware may not support 5 GHz or newer authentication methods.") },
    { module: "print-scanning", ...question("Scan to folder usually writes to a share using which protocol?", ["SMTP", "mDNS", "IPP", "SMB"], 3, "Network folders commonly use SMB on TCP 445.") },
    { module: "print-scanning", ...question("Why use a dedicated scanning account?", ["It speeds up toner usage", "It limits access if device credentials are exposed", "It enables Wi-Fi Direct", "It makes SMBv1 safe"], 1, "Least privilege reduces the impact of stored credential exposure.") },
    { module: "print-security", ...question("What is a safer replacement for SNMP community string public?", ["Telnet", "SNMPv3 with authentication and privacy", "FTP", "Raw 9100"], 1, "SNMPv3 can authenticate and encrypt management traffic.") },
    { module: "print-security", ...question("Which setting reduces exposure on a printer?", ["Leaving factory passwords", "Enabling every protocol", "Disabling unused services", "Publishing the admin page online"], 2, "Fewer enabled services means fewer paths to attack.") },
    { module: "print-troubleshooting", ...question("A client resolves the printer name but cannot connect to port 631. What has been ruled out?", ["DNS name resolution", "Routing", "Firewall rules", "The IPP service"], 0, "The name resolved, so the next problem lies in reachability or the service.") },
    { module: "print-troubleshooting", ...question("What should you do after fixing a printer problem?", ["Delete all logs", "Record the cause and update documentation or monitoring", "Disable the queue", "Change every password"], 1, "Recording the cause helps prevent and diagnose repeats.") }
];

export const FINAL_TARGET = 16;
