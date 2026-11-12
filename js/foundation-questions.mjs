const question = (prompt, options, answer, explanation) => ({ prompt, options, answer, explanation });

export function placeFoundationQuestions(questions, offset) {
    return questions.map((item, index) => {
        const answer = (offset + index) % item.options.length;
        const options = [...item.options];
        [options[item.answer], options[answer]] = [options[answer], options[item.answer]];
        return { ...item, options, answer };
    });
}

export const extra101Questions = {
    foundations: [
        question("A connection advertises 100 Mbit/s, but a download averages 40 Mbit/s. What does 40 Mbit/s describe?", ["The measured throughput for that download", "The cable's length", "The round-trip latency", "The number of connected switches"], 0, "Throughput is the rate actually delivered. Advertised bandwidth is a capacity, not a promise for every transfer."),
        question("A voice call breaks up while some packets never arrive. Which measurement describes those missing packets?", ["DNS TTL", "Packet loss", "Subnet mask", "Disk capacity"], 1, "Packet loss counts packets that do not arrive. A real-time call may expose the missing audio rather than waiting for every packet.")
    ],
    hardware: [
        question("A switch already knows which port leads to a destination MAC address. What does it normally do with that unicast frame?", ["Send it out every port", "Rewrite the destination IP address", "Forward it toward the learned port", "Send it to DNS for translation"], 2, "A learned MAC-table entry lets the switch select the destination port within the VLAN; unknown unicast can be flooded."),
        question("What does a bridging Wi-Fi access point primarily connect?", ["Wireless clients to an existing local network", "Two unrelated internet providers", "A domain name to a public certificate", "A printer driver to a document"], 0, "An access point provides wireless access to a LAN. Routing to other networks is a separate role, even when both roles share one box.")
    ],
    addressing: [
        question("A device needs to reach an address outside its local IPv4 subnet. Which configured address identifies its usual next-hop router?", ["Its DNS search suffix", "Its default gateway", "Its own source port", "Its Ethernet broadcast address"], 1, "A default gateway is the local router used for destinations without a more specific route. It is not the remote destination's address."),
        question("What is an important limitation of private IPv4 addresses such as 192.168.1.20?", ["They can never be used on Ethernet", "They identify a transport port", "They cannot be used with DHCP", "They are not globally routable on the public internet"], 3, "Private addresses can be reused inside separate networks. Internet access typically uses a gateway and address translation or another appropriate design.")
    ],
    services: [
        question("A DHCP reservation is changed for a printer, but the device still shows its previous lease. What should you check next?", ["Whether the device has renewed or reacquired its lease", "Whether TCP has replaced the MAC address", "Whether the monitor is plugged in", "Whether every DNS TTL is zero"], 0, "A server-side change does not necessarily change an already held client lease. Check the actual client state and renew it when appropriate."),
        question("What is the difference between DNS and DHCP?", ["DNS assigns Ethernet ports; DHCP encrypts web pages", "DNS resolves names; DHCP can supply network settings", "Both always perform the same task", "DHCP resolves names; DNS assigns printer paper sizes"], 1, "DHCP can supply an address, gateway, and resolver. DNS answers questions about names; the services have different responsibilities.")
    ],
    transport: [
        question("A browser connects to a web server on TCP 443 from client port 51842. Which port helps the reply reach the browser's connection?", ["Only the server's MAC address", "The client's temporary source port 51842", "A random new port chosen by the switch", "The DNS record's TTL"], 1, "A transport connection uses both endpoint addresses and ports. Replies target the client-side port associated with that connection."),
        question("What does UDP itself promise about a datagram?", ["It will arrive exactly once and in order", "It is automatically encrypted", "It has a transport header, but delivery and ordering are not guaranteed", "It cannot carry an application protocol"], 2, "UDP supplies datagrams and port numbers without TCP's ordered, retransmitted byte stream. An application can add its own reliability.")
    ],
    layers: [
        question("In a typical HTTPS-over-TCP exchange, which order describes the wrappers around HTTP data?", ["HTTP inside TLS, then TCP, IP, and a link-layer frame", "Ethernet inside DNS, then DHCP", "IP inside a printer queue, without transport", "TLS inside a MAC address"], 0, "HTTP data is protected by TLS, carried by TCP, placed in an IP packet, and sent in a link-layer frame."),
        question("A packet crosses two routers without NAT. Which value normally remains the remote endpoint's address throughout forwarding?", ["The outgoing Ethernet destination MAC", "The destination IP address", "The local switch port number", "The link-layer source MAC"], 1, "Each routed hop uses a new local frame, but the IP destination remains the endpoint unless a function such as NAT changes it.")
    ],
    web: [
        question("A browser reports that a site's certificate name does not match the hostname. What is the safer response?", ["Ignore the warning because TCP connected", "Disable all certificate checks permanently", "Verify the address and certificate rather than bypassing the warning", "Assume DNS encrypted the page"], 2, "A TCP connection does not establish server identity. A name mismatch needs investigation before trusting the connection."),
        question("Which service usually translates a website's hostname into an IP address before a new connection?", ["DNS", "The print spooler", "Spanning Tree", "A keyboard driver"], 0, "DNS supplies address information for names. An existing cached answer can sometimes avoid a new query.")
    ],
    diagnostics: [
        question("Before changing a setting to fix a fault, why record the failing test and target?", ["It makes the change irreversible", "It provides a baseline for a comparable retest", "It guarantees the first hypothesis is correct", "It removes the need to check working users"], 1, "A baseline makes it possible to compare the same source, destination, and action after a change."),
        question("A gateway responds to ping, but a website still fails. What does the reply prove?", ["The local gateway answered that probe, not that every remote service works", "The website's TLS certificate is valid", "All DNS names resolve correctly", "The application server has accepted a web request"], 0, "A successful gateway probe is a useful local-path observation. Remote routing, DNS, policy, and the application still need their own checks.")
    ],
    wireless: [
        question("A device joins the Wi-Fi network but receives no usable gateway or DNS settings. Which distinction helps?", ["Association and network configuration are separate stages", "Joining Wi-Fi guarantees internet access", "A strong signal always proves DHCP succeeded", "Every SSID must have a public IP"], 0, "Radio association connects the client to the wireless network; address assignment, routing, and DNS are additional dependencies."),
        question("Several nearby Wi-Fi networks compete for the same channel. What can happen even when signal strength is good?", ["Contention can increase delay and reduce useful throughput", "The subnet mask automatically changes", "Every client gains a dedicated channel", "DNS records stop having TTLs"], 0, "Clients share radio airtime. A strong received signal does not eliminate contention or interference.")
    ],
    security: [
        question("Why should a network administrator install supported router and printer firmware updates?", ["Updates can correct known defects and security vulnerabilities", "Updates make access controls unnecessary", "Firmware changes every private IP into a public address", "Updates guarantee hardware can never fail"], 0, "Vendor updates can fix security and reliability issues. Review compatibility and use a safe update process."),
        question("What is the difference between encryption and access control?", ["Encryption limits who may connect; access control hides all data automatically", "Encryption protects data from being read in transit; access control decides which actions are allowed", "Both are names for a subnet mask", "Neither has a role on a local network"], 1, "Encryption and authorization solve different problems. A protected connection can still be accessible to someone who should not have permission.")
    ],
    "printer-setup": [
        question("A printer moves to another subnet. Besides its IP address and prefix, which setting may need to change for it to reach remote services?", ["Its default gateway", "Its paper orientation", "Its toner level", "The browser's zoom setting"], 0, "A gateway must be reachable on the printer's local subnet and route toward the needed remote destination."),
        question("Why document a printer's fixed IP address before assigning another one manually?", ["To avoid assigning the same address to two devices", "To disable DNS caching", "To increase the printer's memory", "To make every print job wireless"], 0, "An address inventory helps prevent duplicate ownership and makes later support and replacement safer.")
    ],
    "printer-discovery": [
        question("A printer is listed by name but a job to its IPP port fails. What is a useful next distinction?", ["Finding the device and delivering a job are different steps", "A discovery result guarantees the print service is reachable", "DNS automatically installs every driver", "The printer must be on the public internet"], 0, "Discovery can succeed while a queue, route, firewall rule, or print service prevents delivery."),
        question("What does the S in IPPS indicate?", ["IPP is carried over a TLS-protected connection", "The printer always uses a static address", "The job cannot be queued", "Only a USB connection is supported"], 0, "IPPS uses TLS for the connection. Appropriate certificate and access configuration still matter.")
    ],
    "printer-management": [
        question("A single computer's print queue is paused. What happens to new jobs submitted to that queue?", ["They can wait in the queue until it is resumed", "They automatically reset the printer's firmware", "They bypass the operating system", "They change the printer's IP address"], 0, "A paused queue can accept jobs without sending them. Check queue state as well as network reachability."),
        question("Why change a printer's default administrator credentials?", ["To reduce unauthorized access to its management settings", "To make TCP unnecessary", "To guarantee every document prints correctly", "To replace all firewall rules"], 0, "Default credentials are widely known. Unique credentials and limited management access reduce exposure but do not replace maintenance or network policy.")
    ],
    "shared-devices": [
        question("A shared device works from a staff laptop but not from a guest network. What should you compare first?", ["The intended access and isolation policy for the two networks", "The color of the device's case", "The user's keyboard layout", "Whether the device has a web browser"], 0, "A guest network may deliberately block internal devices. Compare the intended policy before treating the block as a fault."),
        question("A NAS is reachable by its IP address but not by its hostname. Which dependency deserves a focused check?", ["Name resolution and the client's configured resolver", "Only the NAS power cable", "The monitor's display resolution", "Only the Ethernet frame size"], 0, "A working IP-based path alongside a name failure points toward resolution or cached names rather than a complete physical outage.")
    ]
};

export const extra102Questions = {
    "n102-subnetting": [
        question("How many usable host addresses does a conventional IPv4 /28 subnet provide?", ["14", "16", "30", "62"], 0, "A /28 has 16 total addresses. In a conventional subnet the network and broadcast addresses leave 14 usable hosts.")
    ],
    "n102-routing": [
        question("What normally happens when an IPv4 packet's TTL reaches zero at a router?", ["The router forwards it forever", "The router discards it and may send an ICMP Time Exceeded message", "DNS assigns a new destination", "The source port becomes a VLAN ID"], 1, "Routers decrement TTL. A packet whose TTL expires is discarded; diagnostic ICMP can be filtered or rate-limited.")
    ],
    "n102-dynamic": [
        question("On a normal OSPF link, two routers use different area IDs for that link. What should you investigate?", ["The area mismatch can prevent the expected adjacency", "BGP automatically corrects the area", "The mismatch increases the Ethernet MTU", "Area IDs apply only to DNS"], 0, "Neighbors on the same ordinary OSPF link must agree on relevant adjacency parameters, including area; special virtual-link behavior is outside this example.")
    ],
    "n102-nat": [
        question("Why does a stateful firewall usually allow a matching reply to an established permitted connection?", ["It associates the reply with tracked connection state", "It assumes every inbound packet is safe", "NAT encrypts the reply", "The reply does not contain IP addresses"], 0, "A stateful policy can recognize return traffic belonging to an allowed flow. The precise state and timeout rules depend on the implementation.")
    ],
    "n102-vlans": [
        question("An untagged endpoint frame enters an access port assigned to VLAN 20. Which VLAN does the switch associate it with?", ["VLAN 20", "Every VLAN on the trunk", "A VLAN chosen by the DNS server", "No VLAN is involved in switching"], 0, "An access port normally classifies the endpoint's untagged traffic into its configured access VLAN.")
    ],
    "n102-stp": [
        question("Why might an administrator enable a root-protection feature on a user-facing switch port?", ["To prevent an unexpected downstream switch from becoming the root through that port", "To make every port forward during a loop", "To assign DHCP addresses", "To encrypt Ethernet frames"], 0, "Root-protection features help enforce the intended root placement when superior bridge information arrives on a port where a root is not expected.")
    ],
    "n102-ipv6": [
        question("Which IPv6 prefix identifies link-local addresses?", ["fe80::/10", "2001:db8::/32", "::/0", "ff00::/8"], 0, "IPv6 link-local addresses use fe80::/10 and are scoped to a link. 2001:db8::/32 is reserved for documentation examples.")
    ],
    "n102-tcp": [
        question("A receiver gets 500 bytes beginning at TCP sequence number 1000 without a gap. What acknowledgment number is expected next?", ["1500", "500", "1000", "2000"], 0, "TCP acknowledges the next byte expected: bytes 1000 through 1499 advance the acknowledgment to 1500.")
    ],
    "n102-performance": [
        question("For a 10 Mbit/s path with a 100 ms RTT, what is the idealized bandwidth-delay product?", ["125,000 bytes", "1,000 bytes", "1,250,000 bytes", "10 bytes"], 0, "10,000,000 bits/s multiplied by 0.1 s is 1,000,000 bits, or 125,000 bytes in flight. It is not guaranteed application throughput.")
    ],
    "n102-dns": [
        question("Which DNS record type holds an IPv6 address for a name?", ["AAAA", "A", "MX", "TXT"], 0, "AAAA records hold IPv6 addresses. A records hold IPv4 addresses.")
    ],
    "n102-wireless": [
        question("A received signal is −60 dBm and the noise floor is −90 dBm. What is the approximate signal-to-noise ratio?", ["30 dB", "−150 dB", "90 dB", "3 dB"], 0, "Subtract the noise level from the signal level: −60 minus −90 is 30 dB. Real RF decisions need additional measurements.")
    ],
    "n102-tunnels": [
        question("With a 1400-byte inner IPv4 MTU and no IP or TCP options, what TCP MSS fits the usual 40-byte headers?", ["1360 bytes", "1400 bytes", "1440 bytes", "1260 bytes"], 0, "Subtract 20 bytes of IPv4 header and 20 bytes of TCP header. Extra options or encapsulation assumptions change the budget.")
    ],
    "n102-qos": [
        question("Does a DSCP marking by itself reserve bandwidth across every network on a path?", ["No; devices must have a policy that recognizes and treats the marking", "Yes; markings force every ISP to reserve capacity", "Yes; DSCP eliminates congestion", "No; DSCP is a DNS record type"], 0, "A marking is a classification signal. Each network decides whether to trust, rewrite, or act on it.")
    ],
    "n102-capture": [
        question("A packet is captured after source NAT rather than before it. What address might the capture show?", ["The translated source address", "Only the original source address in every case", "The DNS server's MAC as the destination IP", "No IP address because NAT removes IP"], 0, "Capture position matters: a device observing the packet after translation can see the translated source tuple instead of the original one.")
    ]
};
