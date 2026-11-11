const question = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });

export const networkingModules = [
    {
        id: "foundations", chapters: ["learn-what"], title: "Networks & packets", minutes: 7,
        goals: ["Explain how a LAN differs from the internet.", "Tell bandwidth, latency and packet loss apart."],
        lessons: [
            ["Your LAN can work without the internet", "Printing to a local printer or copying a file to a local NAS does not need your internet provider. Those devices exchange frames inside the LAN. Internet access is needed only when the destination or a required service is elsewhere."],
            ["Fast is more than one number", "Bandwidth is the capacity of a link, usually measured in bits per second. Throughput is the useful rate you actually achieve. Latency is delay, usually measured in milliseconds. Packet loss means some pieces never arrive. A large download benefits from throughput; a voice call also needs low delay and little variation in that delay (jitter). A 1 Gbit/s subscription cannot fix weak Wi-Fi inside your home."]
        ],
        practice: ["Your internet provider has an outage. The laptop and Ethernet printer are still on the same working LAN. Can a locally installed document print?",
            "Usually yes, if the laptop can reach the printer and its printing software does not depend on a cloud service. The route stays inside the LAN; the ISP is not in that path."],
        questions: [
            question("Which task can stay entirely inside a working LAN?", ["Opening a remote news website", "Printing directly to a printer on that LAN", "Downloading a cloud backup", "Streaming from a remote video service"], 1, "Local devices can communicate without an internet connection. Cloud services still require a path outside the LAN."),
            question("A game has a long delay despite a high download speed. Which measurement best describes that delay?", ["Disk space", "MAC address length", "Bandwidth", "Latency"], 3, "Latency is the time a message takes to travel. Bandwidth describes capacity, not how long each trip takes."),
            question("Why are large messages divided into packets?", ["Smaller labeled pieces can share links and be forwarded independently", "Every packet must go through a printer", "Packets remove the need for addresses", "Each packet needs a different Wi-Fi password"], 0, "Packet switching lets different conversations share links. Addresses and protocol rules still matter.")
        ]
    },
    {
        id: "hardware", chapters: ["learn-hardware"], title: "Follow the hardware", minutes: 7,
        goals: ["Choose a switch, access point or router for a job.", "Follow a local frame and a routed packet."],
        lessons: [
            ["What a switch learns", "A switch learns source MAC addresses on its ports. If it knows the destination, it forwards the frame to that port. Broadcasts and unknown destinations may be flooded within the same VLAN. A switch is not an internet subscription, and adding one does not create routing or Wi-Fi."],
            ["One home box, several jobs", "A typical home gateway combines a router, firewall, Ethernet switch, access point and DHCP server. A cable modem or fiber ONT terminates the provider's access link; it may be separate or built in. An access point in bridge mode extends a LAN rather than creating a second routed network."]
        ],
        practice: ["You have one free LAN port and need to connect three nearby wired computers on the same network. What would you add?",
            "An Ethernet switch, with one uplink to the existing LAN and ports for the computers. You do not need a second router just to add local ports."],
        questions: [
            question("Which device normally forwards packets between different IP networks?", ["Access point in bridge mode", "Ethernet cable", "Router", "USB hub"], 2, "A router makes forwarding decisions between IP networks. A switch or bridging access point primarily connects the local link."),
            question("You only need more wired ports on the existing LAN. What should you add?", ["An Ethernet switch", "A second DNS suffix", "A new public IP for each computer", "A modem for each port"], 0, "A switch expands local Ethernet connectivity. It does not need to create another subnet."),
            question("A home router also provides Wi-Fi and DHCP. What does that mean?", ["Wi-Fi and DHCP are the same protocol", "One physical box is doing several distinct jobs", "Every access point must be the gateway", "MAC addresses are no longer used"], 1, "Physical products often combine roles. Separating those roles mentally makes troubleshooting easier.")
        ]
    },
    {
        id: "addressing", chapters: ["learn-addresses"], title: "Addresses & subnets", minutes: 10,
        goals: ["Use a prefix to decide whether traffic is local.", "Explain the roles of ARP, a gateway and private addresses."],
        lessons: [
            ["Read a /24 without guessing", "For 192.168.10.42/24, the subnet is 192.168.10.0/24. In a conventional /24, .0 identifies the network, .255 is the directed broadcast, and .1 through .254 are host addresses. With a /25, the split changes: .20 and .200 are in different subnets. Matching the first three numbers works for /24, not every prefix."],
            ["The next hop needs a local address too", "For an on-link IPv4 destination, ARP asks which MAC address owns that IP. For an off-link destination, the computer resolves the gateway's MAC instead. The Ethernet destination is the next hop, while the IP destination remains the remote device. MAC addresses can be locally assigned or randomized; they are not permanent proof of identity."]
        ],
        practice: ["Laptop 192.168.10.20/24 wants printer 192.168.20.45/24. Does the laptop send directly to the printer's MAC?",
            "No. The network portions differ, so it sends to an on-link gateway, if configured. Routing and firewall rules must then allow the printer's subnet. Change the checker inputs to compare this with two devices in 192.168.10.0/24."],
        questions: [
            question("Which address shares 192.168.10.20/24's subnet?", ["192.168.20.21", "10.0.10.21", "192.168.11.20", "192.168.10.45"], 3, "With /24, the first 24 bits identify the network: 192.168.10.0/24. All four octets and the prefix matter."),
            question("For an off-link IPv4 destination, which MAC address normally goes in the outgoing Ethernet frame?", ["The remote website's MAC", "The default gateway's local MAC", "The DNS resolver's MAC in every case", "No MAC address is needed"], 1, "The frame reaches the next hop on the local link. The packet inside still names the remote IP destination."),
            question("Which statement about a /25 is correct?", ["Every address beginning 192.168 is local", ".20 and .200 always share a subnet", "A /25 splits a /24 into two 128-address blocks", "The mask is 255.255.0.0"], 2, "A /25 uses one more network bit than /24, creating blocks .0-.127 and .128-.255. Its mask is 255.255.255.128.")
        ]
    },
    {
        id: "services", chapters: ["learn-join"], title: "DHCP & DNS", minutes: 8,
        goals: ["Separate address assignment from name resolution.", "Use leases, reservations and caches to explain common surprises."],
        lessons: [
            ["A lease is borrowed configuration", "A DHCP client normally renews before its lease expires and may keep the same address for a long time. A reservation asks the DHCP server to offer a chosen address to a particular client. Manually entering an address does not register it with DHCP; avoid conflicts with the pool and other fixed devices."],
            ["Names can be cached", "DNS answers have a time-to-live (TTL). A browser, operating system or resolver may reuse an answer until its cache expires. An A record supplies IPv4 addresses; AAAA supplies IPv6 addresses. Normal DNS is not the same as local mDNS discovery, and changing DNS servers does not repair a disconnected cable."]
        ],
        practice: ["A computer has a valid address and can reach its gateway, but nslookup for a website times out. Should you start by replacing its Ethernet cable?",
            "Not first: the working gateway path suggests the link is up. Check the configured DNS resolver, its reachability and whether the problem affects other names. DNS translates names; DHCP supplied the resolver configuration."],
        questions: [
            question("Which service normally supplies a device with an IPv4 address, gateway and resolver settings?", ["HTTP", "TLS", "DHCP", "mDNS"], 2, "DHCP distributes network configuration. DNS resolves names after that configuration is available."),
            question("A DNS A record supplies what?", ["An IPv4 address for a name", "A Wi-Fi password", "An Ethernet switch port", "An encrypted print job"], 0, "A records hold IPv4 addresses; AAAA records hold IPv6 addresses."),
            question("Why might a device still use yesterday's DNS answer?", ["Its MAC contains the website's address", "TCP disables DNS updates", "Every answer is permanent", "A DNS cache can retain an answer until its TTL expires"], 3, "Caching reduces repeated lookups. A valid cached answer may outlive a change at the authoritative server.")
        ]
    },
    {
        id: "transport", chapters: ["learn-ports"], title: "Ports & transport", minutes: 8,
        goals: ["Distinguish a device address from a service port.", "Choose reliability or low-overhead datagrams for an application."],
        lessons: [
            ["Two ends of a conversation", "A connection is identified using both endpoints: source IP and port, destination IP and port, plus its transport protocol. A browser often chooses a temporary source port and connects to a server listening on 443. TCP port 53 and UDP port 53 are different transport endpoints, even though DNS can use both."],
            ["UDP does not mean applications cannot be reliable", "TCP provides an ordered byte stream with retransmission and flow/congestion control. UDP provides datagrams without those guarantees. Applications can add their own reliability: QUIC runs over UDP and implements reliable streams and congestion control. A port number is a convention, not proof that the service is genuine or encrypted."]
        ],
        practice: ["A browser connects from 192.168.1.20:52000 to 203.0.113.10:443. Which port is the server's service port?",
            "443 is the destination service port; 52000 is the client's temporary source port. Return traffic addresses that source endpoint. This is a fictional example using a documentation-only public address."],
        questions: [
            question("What does a destination port help identify?", ["The length of the Ethernet cable", "The service endpoint on the destination device", "The Wi-Fi channel", "The subnet mask"], 1, "The IP address identifies a device/interface; the transport port helps deliver data to the appropriate service."),
            question("Which behavior does TCP provide?", ["Guaranteed zero delay", "No need for IP", "Automatic encryption for every connection", "An ordered byte stream with retransmission"], 3, "TCP handles ordering and retransmission, but does not itself encrypt the data or guarantee low latency."),
            question("QUIC runs over UDP. Can it still offer reliable streams?", ["Yes, QUIC implements reliability above UDP", "No, everything using UDP must lose data", "Only if UDP becomes Ethernet", "Only on port 22"], 0, "A protocol built on UDP can add reliability. UDP's own minimal guarantees do not limit every higher-level protocol.")
        ]
    },
    {
        id: "layers", chapters: ["learn-layers"], title: "Layers & encapsulation", minutes: 7,
        goals: ["Trace application data inside transport, IP and link headers.", "Use layers as a troubleshooting model, not rigid boxes."],
        lessons: [
            ["An envelope inside an envelope", "On a typical HTTPS-over-TCP exchange, HTTP data is protected by TLS, carried by TCP, placed inside an IP packet and sent inside an Ethernet or Wi-Fi frame. Each layer adds information its peer needs. At the receiver, layers interpret and remove their own wrapping. This is encapsulation, not repeated copies of the whole message."],
            ["What changes at a router?", "A router receives a link-layer frame, examines the IP packet and sends a new frame on the next link. The source and destination MAC addresses therefore change hop by hop. IP forwarding also updates fields such as TTL/hop limit; NAT may rewrite addresses and ports. The application message is not decoded by every transit switch."]
        ],
        practice: ["A packet leaves Ethernet and crosses a Wi-Fi link on its way to the same destination. Must the application switch from HTTP to a new application protocol?",
            "No. The link-layer wrapping can change while the application and transport conversation continue. Layering allows the same application to work over different kinds of links."],
        questions: [
            question("What is encapsulation?", ["Replacing every IP with a MAC address", "Encrypting the Wi-Fi password", "Wrapping higher-level data in lower-level protocol information", "Sending all packets to DNS"], 2, "Each layer carries data from above along with its own headers or framing so the receiver can interpret it."),
            question("Which OSI layer is the primary home of IP routing?", ["Network, layer 3", "Physical, layer 1", "Session, layer 5", "Application, layer 7"], 0, "IP addressing and forwarding are network-layer responsibilities. Multiple lower and higher layers still participate in an exchange."),
            question("A router forwards a packet onto a new Ethernet link. What usually changes?", ["The website's HTML language", "The user's document", "The transport changes from TCP to USB", "The local frame's MAC addresses"], 3, "The outgoing frame addresses the next link. Routers also update IP forwarding fields; NAT can additionally rewrite endpoints.")
        ]
    },
    {
        id: "web", chapters: ["learn-journey"], title: "A website, end to end", minutes: 8,
        goals: ["Connect DNS, routing, transport, TLS and HTTP.", "Understand what a secure connection does and does not promise."],
        lessons: [
            ["Separate route, connection and request", "DNS supplies an address. Routing chooses a next hop for packets toward it. A common HTTPS connection uses TCP followed by TLS, then HTTP requests over the protected connection. HTTP/3 instead uses QUIC with TLS integrated into its setup. NAT, when used, translates the outgoing packets along that path; it is not a separate step completed before the first packet is sent."],
            ["What the padlock actually means", "TLS protects data in transit and authenticates the server name through certificate validation. It does not certify that a store is honest or that downloaded files are harmless. Browsers may reuse connections and cached DNS answers; real page loads often fetch resources from several servers."]
        ],
        practice: ["DNS resolves a site's name, but the browser shows a certificate-name error. Would changing the subnet mask normally fix it?",
            "No. You already have a name-to-address answer. Investigate the hostname, certificate and server configuration instead; do not bypass the warning just because DNS worked."],
        questions: [
            question("In a typical new HTTPS-over-TCP connection, what happens before the HTTP request is sent?", ["The printer renews its lease", "Every router decrypts the page", "A public DNS server opens the page", "TCP and TLS establish the protected connection"], 3, "TCP establishes transport; TLS negotiates protection and authenticates the server. Connection reuse can skip repeating setup."),
            question("Does a valid HTTPS connection prove that a website is trustworthy?", ["Yes, it guarantees the seller is honest", "No, it protects the connection, not the site's intentions", "Yes, it scans all downloads for malware", "Only when the server uses IPv4"], 1, "Certificate validation and encryption protect the connection. Phishing or malicious content can still be hosted on HTTPS."),
            question("Why might a second page load not repeat the DNS query?", ["DNS is only needed on Wi-Fi", "TCP invents the hostname", "The device can reuse a cached DNS answer", "The router turns off encryption"], 2, "DNS caching and connection reuse avoid repeating work. The exact sequence depends on the browser and cache state.")
        ]
    },
    {
        id: "diagnostics", chapters: ["learn-fix"], title: "Troubleshoot with evidence", minutes: 9,
        goals: ["Pick a next check from the symptom rather than guessing.", "Recognize the limits of ping and configuration clues."],
        lessons: [
            ["One failed check is a clue, not a verdict", "A failed ping does not prove a host is down: ICMP might be filtered even while HTTPS works. A 169.254.x.x IPv4 link-local address often appears when no usable DHCP lease was obtained, but link-local use can also be deliberate. Compare the address, mask, gateway and DNS settings with a working device on the same network."],
            ["Change one thing, then retest", "Write down the symptom and expected result. Check link, addressing, gateway reachability, remote connectivity, DNS and the specific service. If only one laptop fails, inspect that laptop before restarting the whole network. Use read-only checks on systems you own or have permission to troubleshoot; the examples here do not execute commands."]
        ],
        practice: ["A fictional check returns: gateway reachable; a known IP service reachable; nslookup example.com times out. Which component would you investigate next?",
            "The DNS resolver settings and resolver reachability. Link and routing already have supporting evidence. If DNS answers but only one website fails, move up to that service rather than resetting every network setting."],
        questions: [
            question("IP connectivity works but name lookups time out. What is the most focused next check?", ["DNS configuration and resolver reachability", "The printer's paper tray", "Replacing every switch", "Changing every device's MAC"], 0, "Working IP connectivity narrows the symptom. Investigate name resolution before changing unrelated hardware."),
            question("A remote host does not answer ping. What can you conclude?", ["It has no internet connection", "Its DNS record must be wrong", "No reply arrived; ICMP might be filtered", "Every TCP port is closed"], 2, "Ping tests ICMP echo behavior. Firewalls and host policy may block it while other services work."),
            question("Only one laptop cannot browse; other devices work. Where should you start?", ["Reboot the ISP's entire network", "Inspect that laptop's configuration and symptoms", "Factory-reset every printer", "Disable all firewalls permanently"], 1, "The scope points toward the affected endpoint or its particular connection. Start with low-impact, targeted checks.")
        ]
    },
    {
        id: "wireless", chapters: ["learn-wireless"], title: "Wi-Fi without the mystery", minutes: 8,
        goals: ["Separate Wi-Fi association from internet connectivity.", "Explain bands, interference and client isolation."],
        lessons: [
            ["Signal bars are not the internet", "An SSID is the name advertised for a wireless network. Association joins an access point; authentication controls access. A device still needs usable IP configuration and a path to the destination. Strong signal bars only tell you something about the radio link, not DNS, the ISP or the health of a website."],
            ["Bands, channels and placement", "2.4 GHz often reaches farther but has less capacity and more competing devices. 5 GHz and 6 GHz can offer more capacity at shorter practical range; support varies by device and region. Nearby networks share airtime, so moving an access point away from obstructions or using a wired uplink may help more than buying faster internet."],
            ["Guest isolation is intentional", "A guest network may allow internet access while blocking clients from each other or from the main LAN. Being under the same roof, or even seeing similar Wi-Fi names, does not guarantee local access. Do not remove isolation just to make discovery work; choose a supported printing or casting path."]
        ],
        practice: ["A phone browses normally on guest Wi-Fi but cannot discover a printer on the main LAN. Is weak signal the best explanation?",
            "Not necessarily. Guest isolation or separate subnets are likely candidates. Try an authorized device on the printer's trusted LAN, then check the router's intended access policy."],
        questions: [
            question("A phone shows strong Wi-Fi signal. What does that establish?", ["All websites are working", "DNS answers are correct", "Its public IP is permanent", "The radio link has a strong received signal"], 3, "Wi-Fi strength describes only part of the path. IP configuration, routing, DNS and remote services can still fail."),
            question("Why might an older printer not see a 5-GHz-only SSID?", ["DNS is always disabled on printers", "The printer may support only 2.4 GHz", "Every printer requires IPv6", "5 GHz cannot carry print jobs"], 1, "Radio-band support depends on the hardware. A 2.4-GHz-only device cannot join a 5-GHz-only network."),
            question("Guest Wi-Fi has internet but cannot reach local printers. What should you check?", ["Guest/client isolation and inter-network policy", "The website's HTML", "Whether TCP has seven layers", "The printer's font selection"], 0, "Guest networks often deliberately separate devices. Treat that policy as a security boundary, not automatically a fault.")
        ]
    },
    {
        id: "security", chapters: ["learn-security"], title: "Safer network habits", minutes: 8,
        goals: ["Choose proportionate protections for a small network.", "Distinguish encryption, access control and segmentation."],
        lessons: [
            ["Protect the administration plane", "Your router's administration page controls the network. Use a unique admin password, current firmware and supported Wi-Fi security such as WPA2-AES or WPA3. The Wi-Fi password and admin password are different credentials. Disable unneeded remote administration and review automatic port-mapping features instead of exposing local devices casually."],
            ["Separate devices, then allow what is needed", "Segmentation places device groups on different networks or VLANs. Firewall rules decide which groups may talk. For example, trusted computers may submit print jobs while a printer cannot initiate connections to unrelated laptops. A VLAN alone does not encrypt data or guarantee isolation if routing rules allow everything."],
            ["A VPN is one protected part of a path", "A VPN protects traffic between a device and its VPN endpoint; it does not make every website honest or replace software updates. HTTPS still matters beyond the tunnel. A VPN can also change local routes and make printers unreachable, so inspect its local-network-access policy when diagnosing that symptom."]
        ],
        practice: ["You want to print while away from home. Should you forward TCP 9100 from the public internet directly to the printer?",
            "No. Raw printing commonly lacks suitable authentication and transport protection. Use a supported, authenticated remote-access approach, such as a properly configured VPN, and keep the printer itself off the public internet."],
        questions: [
            question("What is the safer way to administer a home router?", ["Leave the default admin password", "Expose its admin page publicly for convenience", "Use a unique admin password and supported firmware", "Turn off all updates"], 2, "Protect the management interface and keep supported firmware current. Avoid unnecessary remote exposure."),
            question("What does a VLAN alone guarantee?", ["Encrypted traffic", "A logical separation that still needs appropriate routing/firewall policy", "Protection from every malicious file", "Automatic printer discovery across all networks"], 1, "VLANs separate link-layer domains. Inter-VLAN routing and firewall rules determine which traffic can cross."),
            question("Which is the safer printer setup?", ["Publish port 9100 to the internet", "Share the admin password with all guests", "Disable the firewall permanently", "Keep it local and allow only necessary access"], 3, "Minimize exposure and permitted traffic. Remote access should use an authenticated, maintained solution.")
        ]
    },
    {
        id: "printer-setup", chapters: ["printer-connect", "printer-address"], title: "Printers: connect & address", minutes: 8,
        goals: ["Choose a stable connection and address for a printer.", "Avoid address conflicts when replacing or reconfiguring it."],
        lessons: [
            ["Make an installation record", "Print the device's network configuration page and note its connection type, IP, prefix, gateway, MAC and firmware version. Use a DHCP reservation where possible. Ethernet and Wi-Fi adapters may have different MAC addresses; a reservation for one interface does not automatically cover the other."],
            ["Replacing a printer safely", "A saved queue may still point to the old printer's IP or driver. Confirm the new device's actual address rather than assuming it inherited the old one. If assigning a static address, coordinate it with the DHCP pool and other reservations, and enter the correct prefix and gateway. Never reuse an address that is still active."]
        ],
        practice: ["The printer moves from Wi-Fi to Ethernet and its DHCP reservation stops applying. What would you compare first?",
            "Compare the active Ethernet MAC address with the reservation's MAC. They may identify different interfaces. Update the reservation and verify the resulting lease before changing every computer's queue."],
        questions: [
            question("Which is usually easiest to manage centrally for a stable printer IP?", ["A random address on each restart", "A new subnet mask every day", "A DHCP reservation on the router/server", "The browser history"], 2, "A reservation keeps automatic configuration while making the offered address predictable."),
            question("Why might a Wi-Fi reservation not apply after connecting Ethernet?", ["The two interfaces can have different MAC addresses", "Ethernet cannot use DHCP", "Printers cannot use private addresses", "IPPS disables Ethernet"], 0, "Reservations identify clients/interfaces. Verify the MAC of the interface actually in use."),
            question("When choosing a manual static IP, what must you avoid?", ["An address in your intended subnet", "Recording the settings", "Configuring a gateway when needed", "Conflicts with the DHCP pool or another device"], 3, "Overlapping assignments create duplicate IPs. Coordinate static settings with the network's address plan.")
        ]
    },
    {
        id: "printer-discovery", chapters: ["printer-discover", "printer-protocols"], title: "Printers: discover & deliver", minutes: 8,
        goals: ["Distinguish finding a printer from delivering a print job.", "Recognize IPP/IPPS, raw printing and discovery boundaries."],
        lessons: [
            ["Discovery and printing are separate paths", "A computer may discover a printer's name and capabilities through mDNS/DNS-SD or WSD, then submit jobs over IPP or another transport. Discovery can fail while a manually configured IPP queue still works. Conversely, appearing in a list does not prove the job's destination port is reachable."],
            ["Crossing a subnet deliberately", "Local multicast discovery normally stays on its segment. Managed networks can use discovery gateways or reflectors, with policies defining which services cross. A firewall rule allowing print traffic alone does not automatically forward discovery. Prefer the least access needed rather than merging all networks."]
        ],
        practice: ["The printer is absent from Add Printer, but a manually configured IPP queue prints successfully. Which part needs attention?",
            "Discovery, not the entire print path. Check whether the devices share a segment, whether discovery traffic is allowed and whether the intended network uses a managed discovery gateway."],
        questions: [
            question("A printer is not discovered, but printing to its IP works. What does that suggest?", ["The cable cannot carry packets", "Discovery is failing independently of job delivery", "The printer has no IP address", "All TCP traffic is blocked"], 1, "Discovery and the print connection can use different protocols and policy rules."),
            question("Which modern printing protocol can use TLS to protect jobs in transit?", ["ARP", "Plain raw TCP 9100 by itself", "DHCP", "IPPS"], 3, "IPPS carries IPP over a TLS-protected connection. Support and certificate configuration still need verification."),
            question("Will allowing TCP 631 automatically make mDNS discovery cross a router?", ["No, print access and multicast discovery need separate handling", "Yes, every TCP port forwards multicast", "Only if the printer runs out of paper", "Yes, DNS and IPP are the same protocol"], 0, "A print-port rule permits job delivery. It is not a discovery reflector or gateway.")
        ]
    },
    {
        id: "printer-management", chapters: ["printer-drivers", "printer-secure"], title: "Printers: queues & security", minutes: 8,
        goals: ["Explain driverless printing and centralized queues.", "Protect printer management and stored documents."],
        lessons: [
            ["Follow the queue, not just the printer", "A job can wait on your laptop, a print server or the device itself. A paused queue, incorrect driver or incompatible job format can stop printing even when networking works. Driverless standards negotiate common capabilities and formats, but the printer and client must both support the relevant standard."],
            ["Status access is not admin access", "Monitoring tools may query printer status through SNMP or other management services. That is separate from submitting jobs. Where SNMP is needed, prefer securely configured SNMPv3 when supported; disable unneeded legacy access. Restrict the administration page, use HTTPS where supported, update firmware and consider document storage at retirement."]
        ],
        practice: ["Everyone's jobs stop at the office print server, but direct authorized printing still works. Should the printer be factory-reset first?",
            "No. Inspect the shared queue, spooler, driver and server availability. The successful direct path is evidence that the printer and at least one network path work."],
        questions: [
            question("What does driverless printing require?", ["No network interface", "A different IP for every page", "Compatible client and printer support for a common printing standard", "Public access to the printer's admin page"], 2, "Standards such as IPP Everywhere let compatible devices negotiate capabilities without a vendor-specific driver."),
            question("Why can a shared USB printer become unavailable when the host computer is off?", ["The host computer provides the sharing service", "USB turns off DNS across the internet", "The printer's MAC becomes a public IP", "All Ethernet switches stop"], 0, "The sharing computer is part of that print path. Its availability matters even if other network services are healthy."),
            question("Before disposing of an office printer, what should you consider?", ["Only whether its cables are tidy", "Whether the label uses the right font", "Changing its Wi-Fi channel only", "Stored jobs, address books and internal storage"], 3, "Printers may retain documents or other data. Follow the manufacturer's secure erase and disposal guidance.")
        ]
    },
    {
        id: "shared-devices", chapters: ["printer-fix", "printer-others"], title: "Shared-device support", minutes: 9,
        goals: ["Use symptoms to isolate a printer or shared-device fault.", "Apply addressing, discovery and access policy to NAS, casting and IoT."],
        lessons: [
            ["Offline describes a symptom", "A saved queue can say offline because of stale addressing, blocked status checks, a stopped spooler or a sleeping/error-state device. Test only relevant components. Opening the printer's admin page can show reachability, but failure alone does not prove an outage: the page might be disabled or management access restricted."],
            ["The same checklist, different services", "For a NAS, check the share service and authentication after connectivity. For casting, check discovery and network boundaries. For a camera, verify its authorized viewing path without exposing it publicly. Keep each device's identity, address, service and permissions separate in your notes."]
        ],
        practice: ["The printer display is healthy, its IP matches the saved queue, and only one computer has a stuck job. What is the least disruptive next action?",
            "Inspect and cancel or resume that computer's queue, then retest a small job. Do not reset the router or weaken firewall rules when the evidence points to a local queue."],
        questions: [
            question("A healthy printer works for everyone except one laptop with a paused queue. What should you check first?", ["The ISP's public BGP routing", "That laptop's queue and spooler", "Every device's Wi-Fi password", "The building's entire subnet plan"], 1, "The scope points to one client. Inspect its queue before disrupting working devices."),
            question("A phone cannot cast to a TV on another isolated network. Which idea transfers from printer discovery?", ["Multicast discovery and access rules may not cross that boundary", "Change the TV's volume", "Install a printer driver on the router", "Replace all private IPs with public ones"], 0, "Shared devices often rely on local discovery. Check the intended network policy instead of assuming they are on the same LAN."),
            question("A printer admin page does not open. Does that alone prove printing cannot work?", ["Yes, web administration is required for every print job", "Yes, HTTP and IPP always share an access rule", "No, management access might be disabled or separately restricted", "Only if the device uses Ethernet"], 2, "Management and printing can have different services and firewall policies. Use several relevant checks rather than one verdict.")
        ]
    }
];

export function gradeModule(module, answers) {
    if (!Array.isArray(answers) || answers.length !== module.questions.length) {
        throw new TypeError("Provide one answer slot per question.");
    }
    const missing = [];
    const results = module.questions.map((item, index) => {
        const selected = answers[index];
        if (selected === null || selected === undefined) {
            missing.push(index);
            return false;
        }
        if (!Number.isInteger(selected) || selected < 0 || selected >= item.options.length) {
            throw new RangeError("Answer must identify an available option.");
        }
        return selected === item.answer;
    });
    return { complete: missing.length === 0, missing, results, correct: results.filter(Boolean).length, total: module.questions.length };
}
