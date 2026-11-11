// Scripted teaching exchanges, not a packet engine or a source of network state.
import { findPath } from "./lab-model.mjs";

const catalog = {};
const scenarios = {};
const entries = {
    http: ["Open a web address", "http://studio.test/guide", "Plain HTTP / DNS comes first", "address"],
    https: ["Open a secure web address", "https://studio.test/guide", "DNS, then TCP and verified TLS", "address"],
    websocket: ["Subscribe to live updates", "ws://studio.test/updates", "TCP, then HTTP Upgrade", "address"],
    webrtc: ["Start a peer media session", "Call Peer B", "Signal before ICE and DTLS"],
    sip: ["Dial the callee", "Call via SIP proxy", "INVITE negotiates the session"],
    rtsp: ["Choose a media presentation", "rtsp://studio.test/media", "Describe before SETUP and PLAY", "address"],
    rtmp: ["Prepare a live broadcast", "Publish stream: studio", "TCP before RTMP negotiation"],
    quic: ["Open an HTTP/3 stream", "HTTP/3 over QUIC", "UDP with integrated TLS / no TCP"],
    tcp: ["Open an ordered byte stream", "Connect 203.0.113.10:8080", "SYN starts the handshake"],
    udp: ["Choose a datagram endpoint", "Send to 203.0.113.10:5004", "No transport handshake"],
    ip: ["Choose an IPv4 destination", "Route to 203.0.113.10", "Forward by destination prefix"],
    bgp: ["Prepare a routing peering", "Establish a BGP session", "TCP 179 before route updates"],
    ipv6: ["Configure an IPv6 host", "Discover an IPv6 router", "Learn a prefix, then check DAD"],
    dns: ["Look up an address record", "Resolve studio.test A", "Ask the configured resolver"],
    doh: ["Choose a private DNS query", "DNS query inside HTTPS", "Authenticate the resolver first"],
    dnssec: ["Request a validated answer", "Validate signed DNS data", "Signatures do not hide the query"],
    dhcp: ["Bring an unconfigured host online", "Request an IPv4 lease", "DISCOVER from 0.0.0.0"],
    icmp: ["Check host reachability", "Echo to 203.0.113.10", "Illustrative probe / no real ping"],
    igmp: ["Choose a multicast group", "Join 239.1.1.1", "Report local reception interest"],
    ntp: ["Prepare a clock sample", "Request time sample T1", "Estimate / never set this clock"],
    ethernet: ["Prepare a local frame", "Send frame: A to B", "The switch learns source MACs"],
    pppoe: ["Find an access concentrator", "Discover a PPPoE service", "PADI before a PPP session"],
    wifi: ["Find an open wireless LAN", "Scan for an open WLAN", "No password authentication here"],
    wpa3: ["Join a protected wireless LAN", "Start WPA3-Personal", "SAE before protected data"],
    radius: ["Identify an access supplicant", "Request an EAP identity", "EAPOL first / RADIUS at the AP"],
    captive: ["Check network access policy", "Read the CAPPORT API URI", "Advertised API / TLS assumed"],
    smtp: ["Prepare a message submission", "Submit an email message", "Greet, then STARTTLS and EHLO"],
    pop3: ["Inspect an existing maildrop", "Open POP3 transaction", "TLS and authorization assumed"],
    imap: ["Choose a server-side mailbox", "SELECT INBOX", "Authenticated TLS is established"],
    ftp: ["Choose a file representation", "TYPE I / binary transfer", "Existing plain FTP session"],
    smb: ["Prepare a shared-file session", "Negotiate SMB 3.x", "TCP exists / authenticate next"],
    ssh: ["Connect to a trusted SSH host", "Connect SSH on TCP 22", "Verify host key before user auth"],
    tls: ["Prepare peer authentication", "Negotiate TLS 1.3", "TCP exists / verify the server"],
    "http-proxy": ["Choose a forward-proxy tunnel", "CONNECT studio.test:443", "Reach the proxy before tunneling"],
    socks5: ["Choose a relayed connection", "Relay via SOCKS5 :1080", "SOCKS alone adds no encryption"],
    "reverse-proxy": ["Request a resource at the edge", "https://edge.test/guide", "TLS ends at the reverse proxy", "address"],
    wireguard: ["Select a configured VPN peer", "Route via AllowedIPs", "Private target: 192.168.20.10"],
    ipsec: ["Prepare a site-to-site tunnel", "Negotiate IKEv2 peers", "IKE_SA_INIT before ESP traffic"],
    modbus: ["Prepare a read-only transaction", "Read holding register 0", "TCP 502 / no device writes"]
};
const rfc = (number, label = `RFC ${number}`) => ({ label, url: `https://www.rfc-editor.org/rfc/rfc${number}` });
const actor = (type, name, address) => ({ type, name, address });
const client = () => actor("client", "Laptop", "192.168.10.20");
const router = () => actor("router", "Gateway", "192.168.10.1");
const service = (name = "Origin") => actor("server", name, "203.0.113.10");
const resolver = () => actor("server", "Resolver", "192.168.10.53");
const webActors = () => [client(), router(), service(), resolver()];
const webLinks = [[1, 2], [2, 3], [2, 4]];
const msg = (from, to, protocol, family, summary) => ({ from, to, protocol, family, summary });
const stage = (phase, ...messages) => ({ phase, messages });
const tcpOpen = (a, b) => [
    msg(a, b, "TCP SYN", "TCP", "SYN proposes a new byte stream and its initial sequence number."),
    msg(b, a, "TCP SYN-ACK", "TCP", "SYN-ACK acknowledges the proposal and supplies the other sequence number."),
    msg(a, b, "TCP ACK", "TCP", "ACK completes the three-way handshake; no application request has been sent.")
];
const dnsLookup = () => [
    msg(1, 4, "DNS query", "DNS", "Cleartext UDP 53 query: resolve the documentation name studio.test."),
    msg(4, 1, "DNS answer", "DNS", "An illustrative cached answer maps studio.test to 203.0.113.10; DNS itself does not open a connection.")
];
const tlsFlights = (a, b) => [
    msg(a, b, "TLS ClientHello", "TLS", "ClientHello offers TLS 1.3, algorithms, and an ephemeral key share; ordinary SNI is visible without ECH."),
    msg(b, a, "TLS ServerHello", "TLS", "ServerHello selects algorithms and a key share. Both sides can now derive handshake traffic keys conceptually."),
    msg(b, a, "TLS encrypted server flight", "TLS", "Encrypted after ServerHello: EncryptedExtensions, Certificate, CertificateVerify, and server Finished."),
    msg(a, a, "TLS certificate verification", "TLS", "Locally verify the hostname, certificate chain against trusted roots, signature, and server Finished before trusting the peer."),
    msg(a, b, "TLS encrypted client Finished", "TLS", "Client Finished authenticates the handshake transcript under derived keys; application traffic follows.")
];

function add(id, name, fullName, title, group, layer, layerIndex, transport, description, note, references, actors, links, stages) {
    const phases = Object.freeze(stages.map(item => item.phase));
    const [heading, text, context, kind = "command"] = entries[id];
    catalog[id] = Object.freeze({
        name, fullName, title, group, layer, layerIndex, transport, description, phases,
        entry: Object.freeze({ heading, text, context, kind }),
        note: `${note} All exchanges are scripted conceptual events, not captured packets; an event may summarize multiple packets or a local state transition. Endpoint labels identify actors, not every wire-header address. Cryptography and authentication are narrated, never executed. No network requests or sandbox state changes occur.`,
        references: Object.freeze(references.map(reference => Object.freeze(reference)))
    });
    scenarios[id] = { actors, links, stages };
}

add("http", "HTTP", "Hypertext Transfer Protocol", "Read a resource", "application", "Application · OSI 7", 7,
    "TCP 80 (this HTTP/1.1 example)", "A request selects a resource; a response carries its status, headers, and representation.",
    "One HTTP/1.1 request on a preconfigured network; caching, redirects, and connection teardown are omitted. HTTP is not encrypted.",
    [rfc(9110), rfc(9112)], webActors(), webLinks, [
        stage("Resolve", ...dnsLookup()),
        stage("Connect", ...tcpOpen(1, 3)),
        stage("Request", msg(1, 3, "HTTP GET", "HTTP", "GET /guide with Host: studio.test travels in cleartext; intermediaries can read it.")),
        stage("Respond", msg(3, 1, "HTTP 200", "HTTP", "200 OK returns an original illustrative resource over the established TCP stream."))
    ]);

add("https", "HTTPS", "HTTP over Transport Layer Security", "Protect a web request", "security", "Application over TLS over transport · OSI 7 / 4 boundary", 7,
    "TCP 443; ordinary DNS uses UDP 53", "TLS protects HTTP content while routing addresses and ordinary DNS remain observable.",
    "TLS 1.3 with server authentication and no resumption, client certificate, ECH, or 0-RTT. Encrypted flights aggregate several records; clear DNS and destination IP remain visible.",
    [rfc(9110), rfc(8446)], webActors(), webLinks, [
        stage("Resolve visibly", ...dnsLookup()),
        stage("Connect", ...tcpOpen(1, 3)),
        stage("Authenticate", ...tlsFlights(1, 3)),
        stage("Exchange encrypted HTTP",
            msg(1, 3, "HTTPS request", "HTTP", "Encrypted HTTP GET /guide: observers see destination IP 203.0.113.10, not the HTTP path or body."),
            msg(3, 1, "HTTPS response", "HTTP", "Encrypted HTTP 200 response; TLS protects content, not endpoint IP addresses or all traffic metadata."))
    ]);

add("websocket", "WebSocket", "WebSocket Protocol", "Upgrade to live updates", "application", "Application · OSI 7", 7,
    "TCP 80 for ws; TCP 443 with TLS for wss", "A successful HTTP upgrade creates a bidirectional message channel.",
    "Cleartext ws over HTTP/1.1 is shown to expose the upgrade. A real wss connection first requires TLS. Fragmentation, extension negotiation, and close timeouts are omitted.",
    [rfc(6455)], [client(), router(), service("Live service")], [[1, 2], [2, 3]], [
        stage("Connect", ...tcpOpen(1, 3)),
        stage("Upgrade",
            msg(1, 3, "HTTP Upgrade", "HTTP", "GET includes Upgrade: websocket, Connection: Upgrade, a fresh client key, and version 13."),
            msg(3, 1, "HTTP 101", "HTTP", "101 Switching Protocols with a validated Sec-WebSocket-Accept completes the upgrade; the key is not encryption.")),
        stage("Exchange frames",
            msg(1, 3, "WebSocket text", "DATA", "A masked client text frame requests updates. Masking prevents intermediary confusion; it is not confidentiality."),
            msg(3, 1, "WebSocket text", "DATA", "An unmasked server text frame delivers a live update without another HTTP request.")),
        stage("Close",
            msg(1, 3, "WebSocket Close", "CONTROL", "A Close control frame requests orderly shutdown."),
            msg(3, 1, "WebSocket Close", "CONTROL", "The peer returns Close; TCP teardown is omitted."))
    ]);

add("webrtc", "WebRTC", "Web Real-Time Communication", "Connect two media peers", "application", "Application media with transport and security mechanisms · OSI 7 / 4", 7,
    "ICE candidate UDP ports; STUN/TURN commonly 3478; DTLS-SRTP media", "Peers discover a viable path, authenticate the media transport, and exchange protected real-time media.",
    "Application-defined signaling is not specified by WebRTC. A direct UDP candidate succeeds; TURN fallback, NAT mappings, consent refresh, codecs, and actual media are omitted. Signaling and STUN transports are pre-established.",
    [rfc(8825), rfc(8445), rfc(8489), rfc(5764)], [
        actor("phone", "Peer A", "192.168.10.20"), router(),
        actor("phone", "Peer B", "198.51.100.40"), service("Signaling service"), actor("server", "STUN service", "203.0.113.50")
    ], [[1, 2], [2, 3], [2, 4], [2, 5]], [
        stage("Signal",
            msg(1, 4, "Application signaling", "CONTROL", "Send an SDP offer with media capabilities and a DTLS fingerprint over an application-chosen authenticated signaling channel."),
            msg(4, 3, "Application signaling", "CONTROL", "Relay the offer; WebRTC does not prescribe this signaling protocol."),
            msg(3, 4, "Application signaling", "CONTROL", "Return an SDP answer and the peer's fingerprint."),
            msg(4, 1, "Application signaling", "CONTROL", "Relay the answer; ICE candidates are also exchanged through this channel.")),
        stage("Gather candidates",
            msg(1, 5, "STUN Binding request", "CONTROL", "Gather a server-reflexive candidate by asking a STUN server how the endpoint appears."),
            msg(5, 1, "STUN Binding response", "CONTROL", "Report an illustrative mapped address; STUN alone does not guarantee peer reachability.")),
        stage("Check ICE",
            msg(1, 3, "ICE STUN check", "CONTROL", "Authenticated connectivity checks test a candidate pair for direct UDP reachability."),
            msg(3, 1, "ICE nomination", "CONTROL", "A successful check and controlling-agent nomination select this candidate pair.")),
        stage("Authenticate transport",
            msg(1, 3, "DTLS handshake", "TLS", "Start DTLS on the selected path; this conceptual handshake is not a single real datagram."),
            msg(3, 1, "DTLS fingerprint verification", "TLS", "Verify certificates against signaling fingerprints and finish DTLS; derive SRTP keys conceptually.")),
        stage("Stream media",
            msg(1, 3, "SRTP media", "DATA", "Send authenticated, encrypted RTP audio over the selected UDP path."),
            msg(3, 1, "SRTCP feedback", "CONTROL", "Protected RTCP feedback reports reception quality; no real media is produced."))
    ]);

add("sip", "SIP", "Session Initiation Protocol", "Set up a call", "application", "Application signaling · OSI 7", 7,
    "UDP/TCP 5060; TLS 5061; RTP uses negotiated media ports", "SIP negotiates a session; RTP, not SIP, carries the conversation.",
    "An already registered caller reaches a callee through a SIP proxy. Authentication, registration, forking, provisional PRACK, and secure media negotiation are omitted; plain illustrative RTP is not encrypted.",
    [rfc(3261), rfc(3550)], [
        actor("phone", "Caller", "192.168.10.20"), actor("router", "SIP proxy", "192.168.10.1"),
        actor("phone", "Callee", "198.51.100.40")
    ], [[1, 2], [2, 3]], [
        stage("Invite",
            msg(1, 2, "SIP INVITE", "CONTROL", "INVITE carries an SDP offer describing desired audio and receive ports."),
            msg(2, 3, "SIP forwarded INVITE", "CONTROL", "The proxy forwards signaling toward the registered callee.")),
        stage("Answer",
            msg(3, 2, "SIP 180 Ringing", "CONTROL", "180 reports ringing; it is not a media packet."),
            msg(2, 1, "SIP forwarded 180", "CONTROL", "The proxy relays ringing."),
            msg(3, 2, "SIP 200 OK", "CONTROL", "200 OK carries the SDP answer."),
            msg(2, 1, "SIP forwarded 200", "CONTROL", "Relay the accepted session and negotiated media information.")),
        stage("Acknowledge",
            msg(1, 2, "SIP ACK", "CONTROL", "ACK confirms the final response."),
            msg(2, 3, "SIP forwarded ACK", "CONTROL", "Deliver ACK to complete setup.")),
        stage("Carry audio",
            msg(1, 3, "RTP audio", "DATA", "RTP media follows the negotiated endpoint addresses, independently of SIP signaling."),
            msg(3, 1, "RTP audio", "DATA", "The callee sends its own RTP stream; the proxy icon also abstracts the intervening routed network.")),
        stage("End call",
            msg(1, 2, "SIP BYE", "CONTROL", "BYE ends the established dialog."),
            msg(2, 3, "SIP forwarded BYE", "CONTROL", "Relay the termination request."),
            msg(3, 2, "SIP 200 to BYE", "CONTROL", "Confirm termination."),
            msg(2, 1, "SIP forwarded termination", "CONTROL", "Relay the final confirmation."))
    ]);

add("rtsp", "RTSP", "Real-Time Streaming Protocol", "Control a media session", "application", "Application control · OSI 7", 7,
    "TCP 554 control; negotiated RTP/RTCP UDP media ports", "A player describes, sets up, starts, and stops a media session separately from its media transport.",
    "RTSP 2.0 with one unicast RTP stream. Existing TCP control connection, authentication, RTP-over-TCP interleaving, and codec negotiation details are omitted.",
    [rfc(7826), rfc(3550)], [client(), router(), service("Media server")], [[1, 2], [2, 3]], [
        stage("Describe",
            msg(1, 3, "RTSP DESCRIBE", "CONTROL", "Request the media presentation description."),
            msg(3, 1, "RTSP 200 description", "CONTROL", "Return SDP describing available tracks.")),
        stage("Set up",
            msg(1, 3, "RTSP SETUP", "CONTROL", "Choose a track and offer client RTP/RTCP UDP receive ports."),
            msg(3, 1, "RTSP 200 setup", "CONTROL", "Return a session identifier and negotiated transport parameters.")),
        stage("Play",
            msg(1, 3, "RTSP PLAY", "CONTROL", "Request playback for the established session."),
            msg(3, 1, "RTSP 200 play", "CONTROL", "Confirm playback and initial RTP information."),
            msg(3, 1, "RTP video", "DATA", "Video travels as RTP on the negotiated media ports, not inside this RTSP control response.")),
        stage("Tear down",
            msg(1, 3, "RTSP TEARDOWN", "CONTROL", "Release the session."),
            msg(3, 1, "RTSP 200 teardown", "CONTROL", "Confirm release; the media stream stops."))
    ]);

add("rtmp", "RTMP", "Real-Time Messaging Protocol", "Publish a live stream", "application", "Application streaming · OSI 7", 7,
    "TCP 1935; RTMPS adds TLS", "A persistent connection multiplexes command messages and chunked audio/video.",
    "A plain RTMP publisher is shown; the RTMP handshake is not a cryptographic handshake. No real video, codec payloads, acknowledgments, or chunk byte dumps are generated.",
    [{ label: "RTMP specification", url: "https://rtmp.veriskope.com/docs/spec/" }], [
        actor("client", "Encoder", "192.168.10.20"), router(), service("Ingest server")
    ], [[1, 2], [2, 3]], [
        stage("Connect", ...tcpOpen(1, 3)),
        stage("RTMP handshake",
            msg(1, 3, "RTMP C0 C1", "CONTROL", "Propose RTMP version and a handshake block."),
            msg(3, 1, "RTMP S0 S1 S2", "CONTROL", "Return the version, server block, and client-block acknowledgment."),
            msg(1, 3, "RTMP C2", "CONTROL", "Acknowledge the server block; this exchange does not encrypt the stream.")),
        stage("Create stream",
            msg(1, 3, "RTMP connect", "CONTROL", "Connect to the ingest application."),
            msg(3, 1, "RTMP connect result", "CONTROL", "Accept the application connection."),
            msg(1, 3, "RTMP createStream", "CONTROL", "Request a logical stream."),
            msg(3, 1, "RTMP stream result", "CONTROL", "Assign an illustrative stream identifier.")),
        stage("Publish",
            msg(1, 3, "RTMP publish", "CONTROL", "Publish an illustrative stream name."),
            msg(3, 1, "RTMP onStatus", "CONTROL", "Accept publishing."),
            msg(1, 3, "RTMP media chunks", "DATA", "Audio/video message chunks share the TCP connection; no media is executed or recorded."))
    ]);

add("quic", "QUIC", "QUIC: A UDP-Based Multiplexed and Secure Transport", "Open a secure stream", "core", "Transport with integrated TLS · OSI 4", 4,
    "UDP 443 for this HTTP/3 example; no TCP", "QUIC integrates TLS 1.3 and reliable independent streams over UDP.",
    "No Retry, version negotiation, loss recovery, migration, or 0-RTT. Initial protection is publicly derivable, not confidentiality against observers; post-ServerHello handshake keys protect later flights. Flights group multiple QUIC packets.",
    [rfc(9000), rfc(9001), rfc(9114)], [client(), router(), service("HTTP/3 origin")], [[1, 2], [2, 3]], [
        stage("Initial",
            msg(1, 3, "QUIC Initial / TLS ClientHello", "TLS", "UDP 443: QUIC CRYPTO frames carry a TLS ClientHello. There is no TCP handshake.")),
        stage("Handshake",
            msg(3, 1, "QUIC Initial / TLS ServerHello", "TLS", "The server returns ServerHello in Initial packets; Initial keys are derivable from public connection information."),
            msg(3, 1, "QUIC Handshake / encrypted server flight", "TLS", "Handshake packets encrypt TLS EncryptedExtensions, Certificate, CertificateVerify, and server Finished after ServerHello."),
            msg(1, 1, "QUIC certificate verification", "TLS", "Locally verify hostname, certificate chain, signature, and Finished against trusted roots."),
            msg(1, 3, "QUIC Handshake / client Finished", "TLS", "Client Finished completes its TLS handshake; TLS record framing is not used inside QUIC.")),
        stage("Confirm",
            msg(3, 1, "QUIC HANDSHAKE_DONE", "CONTROL", "A 1-RTT HANDSHAKE_DONE confirms the handshake to the client.")),
        stage("Multiplex",
            msg(1, 3, "HTTP/3 request on QUIC", "HTTP", "Send protected HTTP/3 headers on a bidirectional QUIC stream; control streams and SETTINGS are abstracted."),
            msg(3, 1, "HTTP/3 response on QUIC", "HTTP", "Return protected response data. Loss in one stream need not stall unrelated stream delivery."))
    ]);

add("tcp", "TCP", "Transmission Control Protocol", "Recover an ordered stream", "core", "Transport · OSI 4", 4,
    "IP protocol 6; example destination TCP 8080", "Sequence numbers and acknowledgments turn an unreliable IP path into an ordered byte stream.",
    "One segment is conceptually lost. Timers, exact sequence arithmetic, congestion control, and half-close details are abstracted; no measured latency is asserted.",
    [rfc(9293)], [client(), router(), service("Stream receiver")], [[1, 2], [2, 3]], [
        stage("Handshake", ...tcpOpen(1, 3)),
        stage("Send",
            msg(1, 3, "TCP segment A", "TCP", "Deliver the first illustrative range of stream bytes."),
            msg(3, 1, "TCP ACK A", "TCP", "Cumulative ACK identifies the next byte expected."),
            msg(1, 2, "TCP segment B lost", "TCP", "The next segment reaches the gateway but is deliberately dropped in this scripted scenario.")),
        stage("Recover",
            msg(1, 3, "TCP retransmission B", "TCP", "An illustrative retransmission timeout triggers another copy of the missing byte range."),
            msg(3, 1, "TCP ACK B", "TCP", "Acknowledge contiguous bytes. Retransmission does not create duplicate application bytes.")),
        stage("Close",
            msg(1, 3, "TCP FIN", "TCP", "The sender closes its sending direction after queued data."),
            msg(3, 1, "TCP ACK FIN", "TCP", "Acknowledge FIN; the peer's independent close is omitted."))
    ]);

add("udp", "UDP", "User Datagram Protocol", "Send independent datagrams", "core", "Transport · OSI 4", 4,
    "IP protocol 17; example destination UDP 5004", "UDP preserves message boundaries but supplies no built-in delivery, order, or retry guarantee.",
    "A media-style application sends three datagrams; one is deliberately dropped. No real checksum calculation, network loss measurement, or application recovery is performed.",
    [rfc(768)], [client(), router(), service("Datagram receiver")], [[1, 2], [2, 3]], [
        stage("Address", msg(1, 1, "UDP endpoint selection", "CONTROL", "The application chooses destination 203.0.113.10 UDP 5004 without a transport handshake.")),
        stage("Deliver", msg(1, 3, "UDP datagram A", "DATA", "The first datagram arrives as one independent message.")),
        stage("Lose", msg(1, 2, "UDP datagram B dropped", "DATA", "A scripted drop at the gateway produces no UDP-level acknowledgment or automatic retry.")),
        stage("Continue", msg(1, 3, "UDP datagram C", "DATA", "A later datagram can arrive despite the missing one; recovery, if needed, belongs to the application."))
    ]);

add("ip", "IPv4", "Internet Protocol Version 4", "Route a packet", "core", "Network · OSI 3", 3,
    "EtherType 0x0800; IPv4 Protocol field identifies the upper layer", "Routers forward toward a destination using local routing tables, not a prewritten end-to-end hop list.",
    "Routes and neighbor resolution are preconfigured. IPv4 options, fragmentation, NAT, and ICMP failure responses are omitted; the same packet's forwarding events are conceptual.",
    [rfc(791), rfc(1812)], [
        client(), router(), actor("router", "Transit router", "198.51.100.1"), service("Destination")
    ], [[1, 2], [2, 3], [3, 4]], [
        stage("Choose next hop", msg(1, 1, "IPv4 route lookup", "CONTROL", "203.0.113.10 is off-subnet, so choose the configured default gateway.")),
        stage("Forward",
            msg(1, 2, "IPv4 first link", "DATA", "Deliver a frame to the gateway's link address while preserving the remote destination IP."),
            msg(2, 3, "IPv4 routed link", "DATA", "The gateway decrements TTL, updates the header checksum, and uses longest-prefix match for its next hop.")),
        stage("Deliver",
            msg(3, 4, "IPv4 final link", "DATA", "The transit router decrements TTL and re-encapsulates the datagram for the destination's link."),
            msg(4, 4, "IPv4 upper-layer delivery", "DATA", "The destination accepts its address and dispatches by the IP Protocol field."))
    ]);

add("bgp", "BGP", "Border Gateway Protocol", "Advertise reachability", "core", "Application-layer routing control plane · OSI 7", 7,
    "TCP 179; autonomous-system routing control, not user packet forwarding", "BGP exchanges prefix reachability and path attributes so routers can apply local policy.",
    "Two documentation ASNs, 64501 and 64502, exchange one documentation prefix. Policy, validation, route reflection, and best-path tie breakers are condensed. Advertised AS_PATH is not a measured packet path.",
    [rfc(4271), rfc(5398)], [
        actor("router", "AS 64501 border", "192.0.2.1"), actor("router", "AS 64502 border", "192.0.2.2"),
        actor("server", "Route table", "198.51.100.1")
    ], [[1, 2], [2, 3]], [
        stage("Establish TCP", ...tcpOpen(1, 2)),
        stage("Open session",
            msg(1, 2, "BGP OPEN", "CONTROL", "Advertise AS 64501, router identifier, hold time, and capabilities."),
            msg(2, 1, "BGP OPEN", "CONTROL", "Return AS 64502 and compatible session parameters."),
            msg(1, 2, "BGP KEEPALIVE", "CONTROL", "Acknowledge the peer's OPEN."),
            msg(2, 1, "BGP KEEPALIVE", "CONTROL", "Both peers can enter Established.")),
        stage("Advertise",
            msg(1, 2, "BGP UPDATE", "CONTROL", "Advertise prefix 203.0.113.0/24 with AS_PATH 64501 and a reachable NEXT_HOP.")),
        stage("Apply policy",
            msg(2, 2, "BGP import policy", "CONTROL", "Evaluate the advertisement against local policy and competing paths before selecting it."),
            msg(2, 3, "Conceptual route installation", "CONTROL", "Represent a local route-table update, not a BGP wire message or user traffic following the AS_PATH.")),
        stage("Withdraw", msg(1, 2, "BGP withdrawal", "CONTROL", "Withdraw the advertised prefix; the peer must reconsider its route."))
    ]);

add("ipv6", "IPv6", "Internet Protocol Version 6", "Configure an IPv6 host", "core", "Network · OSI 3", 3,
    "EtherType 0x86DD; ICMPv6 next-header 58 for RA and DAD", "A host learns a prefix and default router from Router Advertisements, then checks a tentative SLAAC address.",
    "Link-local setup is assumed; RA uses the router's link-local source and DAD uses source ::. Actor labels show eventual documentation addresses. The /64 prefix, lifetimes, interface identifier, multicast destinations, and DAD wait are narrated rather than simulated. No RA DNS option or DHCPv6 exchange is included.",
    [rfc(8200), rfc(4861), rfc(4862)], [
        actor("client", "IPv6 host", "2001:db8:10::20"), actor("router", "IPv6 router", "2001:db8:10::1"),
        actor("server", "IPv6 service", "2001:db8:20::10")
    ], [[1, 2], [2, 3]], [
        stage("Discover router",
            msg(1, 2, "ICMPv6 Router Solicitation", "CONTROL", "Solicit Router Advertisements on the local link; link-local addressing is already available."),
            msg(2, 1, "ICMPv6 Router Advertisement", "CONTROL", "Advertise 2001:db8:10::/64 with autonomous configuration allowed and a default-router lifetime.")),
        stage("Form tentative address", msg(1, 1, "SLAAC tentative address", "CONTROL", "Combine the advertised /64 with an illustrative interface identifier; 2001:db8:10::20 remains tentative.")),
        stage("Check uniqueness",
            msg(1, 2, "ICMPv6 DAD Neighbor Solicitation", "CONTROL", "A DAD probe uses source :: and the tentative address's solicited-node multicast destination; this router represents the local link, not an answering authority."),
            msg(1, 1, "DAD wait completed", "CONTROL", "No conflicting Neighbor Solicitation or Advertisement is observed during the conceptual DAD interval; mark the address usable.")),
        stage("Use IPv6", msg(1, 3, "IPv6 application datagram", "DATA", "Use the learned default router and confirmed address to reach another documentation subnet; neighbor resolution is abstracted."))
    ]);

add("dns", "DNS", "Domain Name System", "Resolve a name", "core", "Application naming · OSI 7", 7,
    "UDP/TCP 53", "A recursive resolver follows referrals and returns a cacheable name-to-address answer.",
    "A cold recursive A lookup follows root, TLD, and authoritative actors. Glue, CNAMEs, DNSSEC, retries, and TCP fallback are omitted. The .test hierarchy is illustrative, not live public DNS.",
    [rfc(1034), rfc(1035)], [
        client(), router(), resolver(), actor("server", "Root", "192.0.2.10"),
        actor("server", "TLD authority", "192.0.2.20"), actor("server", "Zone authority", "192.0.2.30")
    ], [[1, 2], [2, 3], [2, 4], [2, 5], [2, 6]], [
        stage("Ask resolver", msg(1, 3, "DNS recursive query", "DNS", "Ask the configured resolver for studio.test A with recursion desired.")),
        stage("Follow referrals",
            msg(3, 4, "DNS root query", "DNS", "Ask the illustrative root where to find the test hierarchy."),
            msg(4, 3, "DNS root referral", "DNS", "Return a referral to the TLD authority."),
            msg(3, 5, "DNS TLD query", "DNS", "Ask the illustrative TLD authority for studio.test."),
            msg(5, 3, "DNS TLD referral", "DNS", "Return a referral to the zone authority.")),
        stage("Read authority",
            msg(3, 6, "DNS authoritative query", "DNS", "Ask the authoritative zone server for the A record."),
            msg(6, 3, "DNS authoritative answer", "DNS", "Return 203.0.113.10 with an illustrative cache lifetime.")),
        stage("Cache and reply", msg(3, 1, "DNS recursive answer", "DNS", "Cache the answer subject to TTL and return it; ordinary DNS is not confidential."))
    ]);

add("doh", "DoH", "DNS over HTTPS", "Encrypt a resolver query", "security", "Application DNS over HTTPS · OSI 7", 7,
    "TCP 443 here; HTTP/3 may instead use QUIC UDP 443", "DoH protects the query on the client-to-resolver connection, not against the chosen resolver.",
    "The resolver's address and trusted hostname are preconfigured, avoiding bootstrap recursion. One HTTP/2-style exchange follows TLS; upstream resolution, HTTP/2 setup, and DNSSEC are omitted.",
    [rfc(8484), rfc(8446)], [client(), router(), service("DoH resolver")], [[1, 2], [2, 3]], [
        stage("Connect", ...tcpOpen(1, 3)),
        stage("Authenticate resolver", ...tlsFlights(1, 3)),
        stage("Query privately", msg(1, 3, "DoH POST", "DNS", "Inside encrypted HTTPS, POST an application/dns-message query to the configured resolver endpoint.")),
        stage("Return answer", msg(3, 1, "DoH HTTP 200", "DNS", "Return an encrypted DNS answer. The resolver still sees the question; DoH does not itself prove DNS data authenticity."))
    ]);

add("dnssec", "DNSSEC", "Domain Name System Security Extensions", "Validate a signed answer", "security", "Application data authentication · OSI 7", 7,
    "DNS UDP/TCP 53 with DNSKEY, DS, and RRSIG records", "A validating resolver links signed DNS data to a configured trust anchor; signatures do not hide names or answers.",
    "A preloaded root trust anchor and cached validated parent DS represent the upper delegation chain. One positive signed zone answer is shown; actual signature math, key rollover, and authenticated denial are omitted.",
    [rfc(4033), rfc(4034), rfc(4035)], [
        client(), router(), resolver(), actor("server", "Signed zone", "192.0.2.30")
    ], webLinks, [
        stage("Request validation", msg(1, 3, "DNS query", "DNS", "Ask a validating resolver for a name in an illustrative signed zone.")),
        stage("Fetch signed data",
            msg(3, 4, "DNS DO query", "DNS", "Request the answer with DNSSEC records using the DNSSEC OK bit."),
            msg(4, 3, "DNS RRset and RRSIG", "DNS", "Return an address RRset and its signature; both remain readable in ordinary DNS."),
            msg(3, 4, "DNSKEY query", "DNS", "Fetch the zone's public DNSKEY set."),
            msg(4, 3, "DNSKEY and RRSIG", "DNS", "Return public keys and the signed key set.")),
        stage("Validate chain", msg(3, 3, "DNSSEC local validation", "CONTROL", "From a configured root trust anchor and cached validated parent DS, authenticate the zone DNSKEY, then check RRset signatures and validity periods.")),
        stage("Report secure result", msg(3, 1, "DNS validated answer", "DNS", "Return the answer with AD for this trusted validating-resolver relationship. Authenticity is not secrecy; bogus validation would yield failure."))
    ]);

add("dhcp", "DHCP", "Dynamic Host Configuration Protocol", "Walk through DORA", "core", "Application configuration on a local broadcast domain · OSI 7", 7,
    "UDP client 68 / server 67", "Discover, Offer, Request, and Acknowledge negotiate an IPv4 configuration.",
    "A single server on one broadcast domain and an unconfigured client are scripted. Broadcast delivery is drawn toward the server, not all receivers. No lease is committed to the sandbox; renewal, relays, conflict detection, and timers are omitted.",
    [rfc(2131)], [
        actor("client", "Unconfigured client", "0.0.0.0"), actor("switch", "LAN switch", "192.168.10.2"),
        actor("router", "DHCP server", "192.168.10.1")
    ], [[1, 2], [2, 3]], [
        stage("Discover", msg(1, 3, "DHCP DISCOVER", "DHCP", "Broadcast from 0.0.0.0 UDP 68 to 255.255.255.255 UDP 67 seeks configuration.")),
        stage("Offer", msg(3, 1, "DHCP OFFER", "DHCP", "Offer 192.168.10.100/24 plus gateway and DNS options; this is only an offer, not an assigned sandbox lease.")),
        stage("Request", msg(1, 3, "DHCP REQUEST", "DHCP", "Broadcast the selected server identifier and requested address so other servers can withdraw their offers.")),
        stage("Acknowledge", msg(3, 1, "DHCP ACK", "DHCP", "Acknowledge the illustrative lease parameters. This lesson narrates configuration without changing any client or sandbox state."))
    ]);

add("icmp", "ICMP", "Internet Control Message Protocol", "Probe reachability", "core", "Network control · OSI 3", 3,
    "IPv4 protocol 1; ICMP has types and codes, not TCP/UDP ports", "ICMP carries diagnostic responses and IP delivery errors; it is not an application reliability service.",
    "An Echo exchange and a separate TTL-expiry example are scripted. Firewalls may filter ICMP, so silence alone does not prove a host is down. No real ping or timing is performed.",
    [rfc(792)], [client(), router(), service("Remote host")], [[1, 2], [2, 3]], [
        stage("Echo request", msg(1, 3, "ICMP Echo Request", "CONTROL", "Send type 8 Echo Request with illustrative identifier and sequence information.")),
        stage("Echo reply", msg(3, 1, "ICMP Echo Reply", "CONTROL", "Type 0 Echo Reply matches the request; this shows this exchange succeeded, not that every service is healthy.")),
        stage("Expire TTL", msg(1, 2, "IPv4 limited-TTL probe", "CONTROL", "A separate probe with TTL 1 expires at the gateway instead of reaching the remote host.")),
        stage("Report error", msg(2, 1, "ICMP Time Exceeded", "CONTROL", "Type 11 reports TTL expiry and quotes enough of the original packet to associate the error."))
    ]);

add("igmp", "IGMP", "Internet Group Management Protocol", "Join a multicast group", "core", "Network multicast membership control · OSI 3", 3,
    "IPv4 protocol 2; no TCP/UDP port; IGMPv3 reports to 224.0.0.22", "Hosts report multicast reception interest to their local router; multicast routing beyond the LAN is separate.",
    "IGMPv3 any-source membership in 239.1.1.1 is illustrated. Link-wide multicast is drawn between named actors; report suppression, snooping, query timers, and upstream multicast routing are omitted.",
    [rfc(3376)], [
        client(), actor("router", "Multicast router", "192.168.10.1"), service("Multicast source")
    ], [[1, 2], [2, 3]], [
        stage("Join", msg(1, 2, "IGMPv3 membership report", "CONTROL", "Report an EXCLUDE-mode membership with an empty source list for 239.1.1.1, meaning any source.")),
        stage("Forward group traffic", msg(3, 1, "IPv4 multicast data", "DATA", "An already available upstream multicast stream is forwarded onto the interested LAN; IGMP is not the media protocol.")),
        stage("Refresh membership",
            msg(2, 1, "IGMP general query", "CONTROL", "A general query to 224.0.0.1 asks listeners to refresh membership."),
            msg(1, 2, "IGMPv3 current-state report", "CONTROL", "Confirm continued interest; the conceptual response delay is not a measured timer.")),
        stage("Leave", msg(1, 2, "IGMPv3 state-change report", "CONTROL", "Change to INCLUDE with no sources to stop reception interest; router group-specific checks before pruning are omitted."))
    ]);

add("ntp", "NTP", "Network Time Protocol", "Estimate clock offset", "core", "Application time synchronization · OSI 7", 7,
    "UDP 123 server port", "Four timestamps help estimate clock offset and round-trip delay before a clock-discipline policy decides what to do.",
    "A single unicast exchange uses symbolic timestamps, not measured times. Path symmetry is an approximation; source selection, outlier filtering, leap handling, and NTS authentication are omitted. No clock is set.",
    [rfc(5905), rfc(8915)], [client(), router(), service("Time server")], [[1, 2], [2, 3]], [
        stage("Request", msg(1, 3, "NTP client request", "CONTROL", "Send a mode-3 request and record local transmit timestamp T1.")),
        stage("Respond", msg(3, 1, "NTP server reply", "CONTROL", "Mode 4 echoes T1 and supplies server receive T2 and transmit T3; the client records arrival T4.")),
        stage("Estimate", msg(1, 1, "NTP offset estimate", "CONTROL", "Compute offset = ((T2 - T1) + (T3 - T4)) / 2 and delay = (T4 - T1) - (T3 - T2), subject to path assumptions.")),
        stage("Discipline safely", msg(1, 1, "NTP sample policy", "CONTROL", "A real implementation filters samples and selects trusted sources before slewing or a policy-controlled step; never blindly set time from one unauthenticated reply."))
    ]);

add("ethernet", "Ethernet", "IEEE 802.3 Ethernet", "Learn and forward a frame", "core", "Data link · OSI 2 (physical signaling abstracted)", 2,
    "Ethernet MAC addresses; example EtherType 0x0800", "A switch learns source MAC locations and forwards using its local forwarding database.",
    "One untagged LAN, initially empty forwarding database, and known endpoint neighbor mappings. MACs are documentation examples; VLANs, STP, physical encoding, FCS calculation, and aging timers are omitted.",
    [{ label: "IEEE 802.3", url: "https://standards.ieee.org/standard/802_3-2022.html" }], [
        actor("client", "Station A", "02:00:00:00:00:01"), actor("switch", "Learning switch", "02:00:00:00:00:02"),
        actor("server", "Station B", "02:00:00:00:00:03"), actor("printer", "Station C", "02:00:00:00:00:04")
    ], [[1, 2], [2, 3], [2, 4]], [
        stage("Learn source", msg(1, 2, "Ethernet frame A to B", "DATA", "Receive a frame from A addressed to B. Learn A's source MAC on the ingress port.")),
        stage("Flood unknown destination",
            msg(2, 3, "Ethernet unknown-unicast copy", "DATA", "B's MAC is not yet in the table; flood a copy on this eligible port."),
            msg(2, 4, "Ethernet unknown-unicast copy", "DATA", "Flood another copy to C, which discards the frame because the destination MAC is B's.")),
        stage("Learn reply", msg(3, 1, "Ethernet reply B to A", "DATA", "The switch learns B from the reply's source and forwards toward the already learned A port.")),
        stage("Unicast known destination", msg(1, 3, "Ethernet learned unicast", "DATA", "A subsequent frame to B goes only to B's learned port, not to C."))
    ]);

add("pppoe", "PPPoE", "Point-to-Point Protocol over Ethernet", "Establish an access session", "core", "Data-link encapsulation · OSI 2", 2,
    "EtherTypes 0x8863 discovery / 0x8864 session", "PPPoE discovers an access concentrator, then carries a separate PPP session on Ethernet.",
    "One concentrator is offered. PPP LCP, authentication, and IPCP exchanges are summarized, not implemented. Credentials are never sent or checked here; IPv6CP and session termination are omitted.",
    [rfc(2516), rfc(1661)], [
        actor("router", "Subscriber router", "192.168.10.1"), actor("switch", "Access switch", "192.0.2.2"),
        actor("router", "Access concentrator", "192.0.2.1")
    ], [[1, 2], [2, 3]], [
        stage("Discover",
            msg(1, 3, "PPPoE PADI", "CONTROL", "Broadcast a discovery initiation seeking an access concentrator."),
            msg(3, 1, "PPPoE PADO", "CONTROL", "Offer a service and concentrator identity.")),
        stage("Select session",
            msg(1, 3, "PPPoE PADR", "CONTROL", "Request the chosen offered service."),
            msg(3, 1, "PPPoE PADS", "CONTROL", "Confirm a session identifier; later frames use the session EtherType.")),
        stage("Negotiate PPP",
            msg(1, 3, "PPP LCP request", "CONTROL", "Negotiate PPP link parameters inside the PPPoE session."),
            msg(3, 1, "PPP LCP and NCP summary", "CONTROL", "Conceptually complete bidirectional LCP, any configured authentication, and IPCP before carrying IPv4; this is not one real PPP response.")),
        stage("Carry IP", msg(1, 3, "PPPoE session data", "DATA", "Carry an IPv4 packet inside PPP and the established PPPoE session; the usual Ethernet MTU limits available PPP payload."))
    ]);

add("wifi", "Wi-Fi", "IEEE 802.11 Wireless LAN", "Associate with a WLAN", "core", "Data link and radio · OSI 2 / 1", 2,
    "IEEE 802.11 management and data frames; no TCP/UDP port", "Scanning discovers a network; authentication and association establish link membership before data can flow.",
    "An open WLAN is deliberately shown, not WPA2 or WPA3. Open System authentication proves no password or identity. Channel selection, roaming, retransmissions, and radio measurements are omitted.",
    [{ label: "IEEE 802.11", url: "https://standards.ieee.org/standard/802_11-2020.html" }], [
        actor("phone", "Station", "192.168.10.20"), actor("ap", "Open access point", "192.168.10.2"),
        actor("server", "LAN service", "192.168.10.10")
    ], [[1, 2], [2, 3]], [
        stage("Discover",
            msg(2, 1, "802.11 Beacon", "CONTROL", "A beacon advertises the SSID and supported capabilities; it is not an IP configuration offer."),
            msg(1, 2, "802.11 Probe Request", "CONTROL", "An optional active scan asks for matching networks."),
            msg(2, 1, "802.11 Probe Response", "CONTROL", "Return this open network's capabilities.")),
        stage("Open authentication",
            msg(1, 2, "802.11 Open System request", "CONTROL", "Request Open System authentication; no shared-password proof occurs."),
            msg(2, 1, "802.11 Open System response", "CONTROL", "Accept the open authentication exchange.")),
        stage("Associate",
            msg(1, 2, "802.11 Association Request", "CONTROL", "Request membership with compatible capabilities."),
            msg(2, 1, "802.11 Association Response", "CONTROL", "Assign association membership; there is still no encryption in this open WLAN.")),
        stage("Bridge data", msg(1, 3, "802.11 data / Ethernet bridge", "DATA", "With preconfigured IP addressing, bridge a data frame through the AP to the LAN service."))
    ]);

add("wpa3", "WPA3", "Wi-Fi Protected Access 3 Personal", "Authenticate without sending a password", "security", "Wireless link authentication and protection · OSI 2", 2,
    "802.11 SAE authentication; EAPOL-Key four-way handshake; protected data frames", "WPA3-Personal SAE establishes shared key material; a later four-way handshake installs traffic keys.",
    "SAE commit/confirm and key installation are conceptual, with association summarized. WPA2-Personal instead derives a PMK from its PSK and uses a four-way handshake without SAE. Neither sends the password on the wire. Enterprise EAP, transition mode, anti-clogging, and cryptographic arithmetic are omitted.",
    [{ label: "Wi-Fi Alliance security", url: "https://www.wi-fi.org/discover-wi-fi/security" }, rfc(7664)], [
        actor("phone", "WPA3 station", "192.168.10.20"), actor("ap", "WPA3 access point", "192.168.10.2")
    ], [[1, 2]], [
        stage("SAE commit",
            msg(1, 2, "SAE Commit", "CONTROL", "Send a password-derived group-element commitment, not the password itself."),
            msg(2, 1, "SAE Commit", "CONTROL", "Return the AP's commitment; conceptually derive a shared secret and PMK.")),
        stage("SAE confirm",
            msg(1, 2, "SAE Confirm", "CONTROL", "Prove possession of the derived secret with a confirm value."),
            msg(2, 1, "SAE Confirm", "CONTROL", "Confirm the exchange; SAE resists passive offline password guessing, unlike WPA2-PSK's captured-handshake exposure.")),
        stage("Associate",
            msg(1, 2, "802.11 Association Request", "CONTROL", "Request association with negotiated WPA3 security parameters and protected management frame support."),
            msg(2, 1, "802.11 Association Response", "CONTROL", "Accept compatible security capabilities.")),
        stage("Install traffic keys",
            msg(2, 1, "EAPOL-Key message 1", "CONTROL", "AP sends ANonce; no password is transmitted."),
            msg(1, 2, "EAPOL-Key message 2", "CONTROL", "Station returns SNonce and a MIC under the derived key."),
            msg(2, 1, "EAPOL-Key message 3", "CONTROL", "AP authenticates key installation information and distributes protected group key material."),
            msg(1, 2, "EAPOL-Key message 4", "CONTROL", "Station confirms completion; implementations must prevent key reinstallation on retries.")),
        stage("Protect frames", msg(1, 2, "Protected 802.11 data", "DATA", "Encrypt and authenticate link-layer data with installed keys; Wi-Fi protection ends at the AP, not at a remote website."))
    ]);

add("radius", "RADIUS", "Remote Authentication Dial-In User Service", "Authorize network access", "security", "Application AAA backend with link-layer EAP access · OSI 7 / 2", 7,
    "RADIUS UDP 1812 authentication; UDP 1813 accounting (not shown)", "An authenticator relays a supplicant's EAP exchange to an AAA server and enforces the result.",
    "Enterprise 802.1X is shown with a condensed inner EAP method. The supplicant sends EAPOL, not RADIUS. Traditional RADIUS shared-secret protection is not whole-packet TLS; actual EAP credentials, key derivation, accounting, and the later wireless key handshake are omitted.",
    [rfc(2865), rfc(3579), rfc(3748)], [
        actor("client", "Supplicant", "192.168.10.20"), actor("ap", "Authenticator", "192.168.10.2"),
        actor("server", "AAA backend", "192.168.10.50")
    ], [[1, 2], [2, 3]], [
        stage("Identify",
            msg(2, 1, "EAPOL Request Identity", "CONTROL", "The authenticator keeps the controlled port closed and requests an EAP identity."),
            msg(1, 2, "EAPOL Response Identity", "CONTROL", "The supplicant answers over EAPOL on the access link, not UDP 1812.")),
        stage("Relay to backend",
            msg(2, 3, "RADIUS Access-Request", "CONTROL", "The authenticator, acting as the RADIUS client, carries EAP-Message to the AAA backend on UDP 1812."),
            msg(3, 2, "RADIUS Access-Challenge", "CONTROL", "Return an EAP method challenge and conversation state.")),
        stage("Run EAP method",
            msg(2, 1, "EAPOL method request", "CONTROL", "Relay the EAP method request; the authenticator need not terminate the inner method."),
            msg(1, 2, "EAPOL method response", "CONTROL", "A conceptual method response proves credentials inside the chosen EAP method; no real credentials are handled."),
            msg(2, 3, "RADIUS Access-Request continuation", "CONTROL", "Relay the EAP response and backend state for verification.")),
        stage("Authorize",
            msg(3, 2, "RADIUS Access-Accept", "CONTROL", "Return EAP success and authorization attributes after the conceptual method succeeds."),
            msg(2, 1, "EAPOL Success", "CONTROL", "Relay EAP success. Authorization is enforced here; wireless key installation must still finish before protected data access."))
    ]);

add("captive", "Captive portal", "Captive Portal Discovery and API", "Discover access requirements", "application", "Application access policy · OSI 7", 7,
    "HTTPS 443 CAPPORT API; discovery option via DHCP or IPv6 RA", "A client can discover a portal API and ask whether network access is captive without intercepting arbitrary HTTPS.",
    "The RFC 8910 API URI is preconfigured as if learned from DHCP/RA. The API TLS connection and certificate validation are assumed complete. Consent is illustrative, not submitted; legacy HTTP interception and arbitrary HTTPS interception are not simulated.",
    [rfc(8910), rfc(8908)], [
        client(), actor("router", "Access gateway", "192.168.10.1"), service("Portal API"), actor("server", "Internet service", "198.51.100.10")
    ], [[1, 2], [2, 3], [2, 4]], [
        stage("Discover API", msg(1, 1, "CAPPORT discovery", "CONTROL", "Read the previously advertised HTTPS captive-portal API URI; discovery is separate from authentication.")),
        stage("Read status",
            msg(1, 3, "CAPPORT HTTPS query", "HTTP", "Fetch the API with application/captive+json over an already authenticated TLS channel."),
            msg(3, 1, "CAPPORT captive status", "HTTP", "An illustrative response says captive: true and supplies a user-portal-url.")),
        stage("Meet policy",
            msg(1, 3, "Portal consent illustration", "HTTP", "Represent the user visiting the provided portal and accepting an illustrative access policy; no form or credentials are actually submitted."),
            msg(3, 2, "Conceptual policy update", "CONTROL", "Represent the portal authorizing this client at the gateway; this internal mechanism is not defined by CAPPORT.")),
        stage("Recheck access",
            msg(1, 3, "CAPPORT status recheck", "HTTP", "Query the authenticated API again."),
            msg(3, 1, "CAPPORT non-captive status", "HTTP", "Return captive: false after the conceptual policy change."),
            msg(1, 4, "Authorized application traffic", "DATA", "The gateway now permits the intended service; no arbitrary HTTPS certificate bypass is involved."))
    ]);

add("smtp", "SMTP", "Simple Mail Transfer Protocol", "Submit a message", "application", "Application mail transfer · OSI 7", 7,
    "TCP 587 submission with STARTTLS here; TCP 25 relay", "SMTP transfers a mail envelope and message content; reading an inbox is a separate protocol.",
    "Submission authentication is assumed configured and condensed after TLS; actual credentials, MIME, queue retries, and the later inter-server relay are omitted. STARTTLS requires a fresh EHLO; delivery acceptance is not proof of inbox placement.",
    [rfc(5321), rfc(6409), rfc(3207)], [client(), router(), service("Submission server")], [[1, 2], [2, 3]], [
        stage("Greet",
            ...tcpOpen(1, 3),
            msg(3, 1, "SMTP 220", "DATA", "The submission service announces readiness."),
            msg(1, 3, "SMTP EHLO", "DATA", "Introduce the client and ask for extensions."),
            msg(3, 1, "SMTP 250 capabilities", "DATA", "Advertise STARTTLS among the submission capabilities.")),
        stage("Secure submission",
            msg(1, 3, "SMTP STARTTLS", "CONTROL", "Request a TLS upgrade before authentication or message submission."),
            msg(3, 1, "SMTP 220 start TLS", "CONTROL", "Ready to begin TLS; SMTP state will reset."),
            ...tlsFlights(1, 3),
            msg(1, 3, "SMTP EHLO after TLS", "DATA", "Repeat EHLO inside TLS, discarding capabilities learned before the upgrade."),
            msg(3, 1, "SMTP secure capabilities", "DATA", "Return current capabilities; conceptual submission authorization is assumed complete after this point.")),
        stage("Address envelope",
            msg(1, 3, "SMTP MAIL FROM", "DATA", "Inside TLS, specify sender <author@example.test>; the envelope sender is distinct from message headers."),
            msg(3, 1, "SMTP 250 sender", "DATA", "Accept the envelope sender."),
            msg(1, 3, "SMTP RCPT TO", "DATA", "Specify recipient <reader@example.test>."),
            msg(3, 1, "SMTP 250 recipient", "DATA", "Accept the recipient for this transfer.")),
        stage("Transfer content",
            msg(1, 3, "SMTP DATA", "DATA", "Request transfer of headers and body."),
            msg(3, 1, "SMTP 354", "DATA", "Invite the message content."),
            msg(1, 3, "SMTP message content", "DATA", "Represent headers and a benign original greeting, terminated by the SMTP end-of-data marker."),
            msg(3, 1, "SMTP 250 queued", "DATA", "Accept responsibility for onward handling; later delivery and inbox placement are not shown."))
    ]);

add("pop3", "POP3", "Post Office Protocol Version 3", "Retrieve a mailbox copy", "application", "Application mail retrieval · OSI 7", 7,
    "TCP 995 implicit TLS here; TCP 110 traditional POP3", "POP3 retrieves messages from a maildrop; deletion is a separate action committed only on orderly update.",
    "TLS and authorization are pre-established. USER/PASS, actual credentials, large message bodies, and network failures are omitted. A downloaded message is retained; no DELE is issued.",
    [rfc(1939), rfc(8314)], [client(), router(), service("POP3 maildrop")], [[1, 2], [2, 3]], [
        stage("Enter transaction", msg(1, 1, "POP3 authenticated state", "CONTROL", "Begin in the transaction state over authenticated implicit TLS on TCP 995; the server has locked the maildrop.")),
        stage("Inspect",
            msg(1, 3, "POP3 STAT", "DATA", "Ask for maildrop message count and size summary."),
            msg(3, 1, "POP3 +OK status", "DATA", "Report an illustrative available message; no measured byte count is invented."),
            msg(1, 3, "POP3 LIST", "DATA", "Ask for the current session's message numbers."),
            msg(3, 1, "POP3 +OK list", "DATA", "Identify message 1; these numbers are not stable global identifiers.")),
        stage("Retrieve",
            msg(1, 3, "POP3 RETR 1", "DATA", "Retrieve a copy of message 1."),
            msg(3, 1, "POP3 +OK message", "DATA", "Return an illustrative message over TLS; retrieval alone does not mark it for deletion.")),
        stage("Quit", msg(1, 3, "POP3 QUIT", "CONTROL", "Enter update on orderly quit. With no DELE commands, the server retains the message."),
            msg(3, 1, "POP3 +OK goodbye", "CONTROL", "Release the maildrop and close the session."))
    ]);

add("imap", "IMAP", "Internet Message Access Protocol", "Synchronize mailbox state", "application", "Application mailbox synchronization · OSI 7", 7,
    "TCP 993 implicit TLS here; TCP 143 traditional IMAP", "IMAP works with server-side mailboxes, stable UIDs within a UIDVALIDITY epoch, flags, and selective retrieval.",
    "TLS and authentication are pre-established. One read-only message fetch and IDLE update are shown; literal payloads, extensions, folder changes, and deletion are omitted.",
    [rfc(9051), rfc(2177), rfc(8314)], [client(), router(), service("IMAP mailbox")], [[1, 2], [2, 3]], [
        stage("Select mailbox",
            msg(1, 3, "IMAP SELECT INBOX", "DATA", "A tagged command selects INBOX over the authenticated TLS connection."),
            msg(3, 1, "IMAP selection response", "DATA", "Return EXISTS, UIDVALIDITY, and tagged OK; UID identity is scoped to this mailbox and UIDVALIDITY.")),
        stage("Find messages",
            msg(1, 3, "IMAP UID SEARCH", "DATA", "Search for unseen messages using UIDs instead of changing sequence numbers."),
            msg(3, 1, "IMAP SEARCH response", "DATA", "Return an illustrative matching UID and tagged completion.")),
        stage("Fetch selectively",
            msg(1, 3, "IMAP UID FETCH BODY.PEEK", "DATA", "Fetch headers with BODY.PEEK without implicitly setting the Seen flag."),
            msg(3, 1, "IMAP FETCH response", "DATA", "Return the requested header subset and flags; the full body remains on the server.")),
        stage("Watch changes",
            msg(1, 3, "IMAP IDLE", "CONTROL", "Enter IDLE after the server advertises support."),
            msg(3, 1, "IMAP IDLE continuation", "CONTROL", "A continuation permits the idle state."),
            msg(3, 1, "IMAP EXISTS update", "DATA", "An unsolicited mailbox count update signals a change; it is not the new message body."),
            msg(1, 3, "IMAP DONE", "CONTROL", "End IDLE before sending another command."),
            msg(3, 1, "IMAP tagged IDLE completion", "CONTROL", "Complete the IDLE command."))
    ]);

add("ftp", "FTP", "File Transfer Protocol", "Separate commands from file data", "application", "Application file transfer · OSI 7", 7,
    "TCP 21 control; passive data uses a separately negotiated server port", "FTP keeps its command connection separate from each data connection.",
    "A plain FTP authenticated session is assumed; it is not confidential. Passive EPSV is used with a documentation high port, not fixed TCP 20. Login, listing format, TLS, NAT, and firewall setup are omitted.",
    [rfc(959), rfc(2428)], [client(), router(), service("FTP server")], [[1, 2], [2, 3]], [
        stage("Control session", msg(1, 3, "FTP TYPE I", "DATA", "On the existing authenticated TCP 21 control connection, choose binary transfer representation."),
            msg(3, 1, "FTP 200", "DATA", "Confirm the control command.")),
        stage("Negotiate passive data",
            msg(1, 3, "FTP EPSV", "CONTROL", "Ask the server to listen for a separate passive data connection."),
            msg(3, 1, "FTP 229", "CONTROL", "Return illustrative passive TCP port 50000 on this same server; this is not a redirect to a new host.")),
        stage("Open data connection",
            msg(1, 3, "FTP data TCP SYN", "TCP", "Open a second TCP connection to server port 50000, distinct from control port 21."),
            msg(3, 1, "FTP data TCP SYN-ACK", "TCP", "Accept the passive data connection."),
            msg(1, 3, "FTP data TCP ACK", "TCP", "Complete the independent data handshake.")),
        stage("Transfer",
            msg(1, 3, "FTP RETR", "CONTROL", "Request guide.txt on the TCP 21 control connection."),
            msg(3, 1, "FTP 150", "CONTROL", "Indicate that the data transfer is starting."),
            msg(3, 1, "FTP file data", "DATA", "Transfer a benign illustrative text file on TCP 50000, then close that data connection."),
            msg(3, 1, "FTP 226", "CONTROL", "Report transfer completion on the still-open TCP 21 control connection."))
    ]);

add("smb", "SMB", "Server Message Block Version 3", "Read a shared file", "application", "Application file sharing · OSI 7", 7,
    "TCP 445", "SMB negotiates capabilities, establishes an authenticated session, connects a share, and performs file operations.",
    "SMB 3.x on a pre-established TCP stream. Authentication tokens, actual files, credits, signing/encryption math, locking, and durable handles are omitted. Encryption is negotiated policy, not an automatic property of all SMB.",
    [{ label: "Microsoft SMB2/3 protocol", url: "https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-smb2/" }], [client(), router(), service("File server")], [[1, 2], [2, 3]], [
        stage("Negotiate",
            msg(1, 3, "SMB2 NEGOTIATE", "CONTROL", "Offer supported SMB dialects and security capabilities."),
            msg(3, 1, "SMB2 NEGOTIATE response", "CONTROL", "Select an SMB 3.x dialect and required signing policy.")),
        stage("Establish session",
            msg(1, 3, "SMB2 SESSION_SETUP", "CONTROL", "Represent an authentication-token exchange; no real credentials are provided."),
            msg(3, 1, "SMB2 SESSION_SETUP result", "CONTROL", "Conceptually authenticate the session and bind its session identifier; real authentication can require additional rounds.")),
        stage("Connect share",
            msg(1, 3, "SMB2 TREE_CONNECT", "CONTROL", "Request the read-only guides share."),
            msg(3, 1, "SMB2 TREE_CONNECT response", "CONTROL", "Authorize share access and return its tree identifier.")),
        stage("Read file",
            msg(1, 3, "SMB2 CREATE read-only", "DATA", "Open an existing guide.txt with read-only access; CREATE is the SMB operation name, not a request to create this file."),
            msg(3, 1, "SMB2 file handle", "DATA", "Return a handle for the existing file."),
            msg(1, 3, "SMB2 READ", "DATA", "Request a range from the open handle."),
            msg(3, 1, "SMB2 READ response", "DATA", "Return illustrative file content under the negotiated session protection.")),
        stage("Close handle",
            msg(1, 3, "SMB2 CLOSE", "CONTROL", "Release the open file handle."),
            msg(3, 1, "SMB2 CLOSE response", "CONTROL", "Confirm cleanup; no filesystem operations are actually performed."))
    ]);

add("ssh", "SSH", "Secure Shell", "Authenticate a secure channel", "security", "Application secure transport and channels · OSI 7", 7,
    "TCP 22", "SSH verifies the server host key, establishes protected transport, then authenticates a user and opens channels.",
    "A modern ephemeral key exchange and known host key are assumed. No TOFU acceptance, key material, password, shell, or command execution occurs. Algorithm lists, rekeying, and detailed authentication signatures are condensed.",
    [rfc(4253), rfc(4252), rfc(4254)], [client(), router(), service("SSH host")], [[1, 2], [2, 3]], [
        stage("Connect and identify",
            ...tcpOpen(1, 3),
            msg(1, 3, "SSH identification", "CONTROL", "Send the client SSH-2.0 identification string."),
            msg(3, 1, "SSH identification", "CONTROL", "Return the server's SSH-2.0 identification; identification strings are not encrypted.")),
        stage("Exchange keys",
            msg(1, 3, "SSH KEXINIT and key share", "CONTROL", "Offer algorithms and conceptually provide an ephemeral key share."),
            msg(3, 1, "SSH key exchange reply", "CONTROL", "Return an ephemeral share and a signature under the server host key."),
            msg(1, 1, "SSH host-key verification", "CONTROL", "Check the server host key against a trusted known-host entry and verify the exchange signature before continuing."),
            msg(1, 3, "SSH NEWKEYS", "CONTROL", "Begin using newly derived outbound traffic keys."),
            msg(3, 1, "SSH NEWKEYS", "CONTROL", "Switch the server's outbound direction to protected transport.")),
        stage("Authenticate user",
            msg(1, 3, "SSH user authentication", "CONTROL", "Conceptually prove possession of an authorized user key inside the protected transport."),
            msg(3, 1, "SSH USERAUTH_SUCCESS", "CONTROL", "Accept the illustrative user identity; host authentication and user authentication are different checks.")),
        stage("Open channel",
            msg(1, 3, "SSH CHANNEL_OPEN", "CONTROL", "Request a session channel; no shell or process is launched."),
            msg(3, 1, "SSH CHANNEL_OPEN_CONFIRMATION", "CONTROL", "Confirm the logical channel."),
            msg(1, 3, "SSH CHANNEL_DATA illustration", "DATA", "Represent protected channel data without interpreting or executing its content."))
    ]);

add("tls", "TLS 1.3", "Transport Layer Security Version 1.3", "Authenticate before sending data", "security", "Security above transport / below application; no single strict OSI layer", 6,
    "Above a transport, here TCP 443; TLS has no exclusive port", "TLS authenticates the peer and derives traffic keys, then protects application records against reading and modification.",
    "OSI index 6 is a display anchor, not a strict layer assignment. A full server-authenticated TLS 1.3 handshake runs over pre-established TCP. Certificate revocation policy, client certificates, resumption, 0-RTT, and actual cryptographic computation are omitted.",
    [rfc(8446), rfc(9525)], [client(), router(), service("TLS server")], [[1, 2], [2, 3]], [
        stage("Negotiate", ...tlsFlights(1, 3).slice(0, 2)),
        stage("Authenticate server", ...tlsFlights(1, 3).slice(2, 4)),
        stage("Finish client", ...tlsFlights(1, 3).slice(4)),
        stage("Protect records",
            msg(1, 3, "TLS application data", "TLS", "Only after verification and client Finished does this lesson send encrypted application data."),
            msg(3, 1, "TLS application data", "TLS", "Return authenticated encrypted records under application traffic keys. IP addresses, record sizes, and traffic patterns remain observable."))
    ]);

add("http-proxy", "HTTP proxy", "HTTP Forward Proxy and CONNECT", "Tunnel HTTPS through a proxy", "application", "Application proxying · OSI 7", 7,
    "Proxy TCP 8080 here; CONNECT targets origin TCP 443", "CONNECT asks a forward proxy for a byte tunnel; TLS inside that tunnel authenticates the origin, not the proxy.",
    "Proxy authentication and policy are omitted. The proxy-to-origin TCP open is condensed after CONNECT. This is a tunnel without TLS interception; the proxy sees the requested authority and traffic metadata but not decrypted HTTP.",
    [rfc(9110)], [
        client(), actor("firewall", "Forward proxy", "192.168.10.40"), router(), service("Origin")
    ], [[1, 2], [2, 3], [3, 4]], [
        stage("Reach proxy", ...tcpOpen(1, 2)),
        stage("Request tunnel",
            msg(1, 2, "HTTP CONNECT", "HTTP", "CONNECT studio.test:443 requests an origin tunnel over the proxy TCP 8080 connection."),
            ...tcpOpen(2, 4),
            msg(2, 1, "HTTP 200 Connection Established", "HTTP", "The proxy reports a tunnel is ready; this does not establish TLS or authenticate the origin.")),
        stage("Authenticate origin", ...tlsFlights(1, 4)),
        stage("Use tunnel",
            msg(1, 4, "HTTPS through CONNECT", "HTTP", "Encrypted HTTP travels through the proxy's byte tunnel; endpoint TLS remains client-to-origin."),
            msg(4, 1, "HTTPS tunneled response", "HTTP", "The origin response returns through the tunnel without being decrypted by the proxy."))
    ]);

add("socks5", "SOCKS5", "SOCKS Protocol Version 5", "Relay an application connection", "application", "Application proxying for transport connections · OSI 7", 7,
    "TCP 1080 proxy control; CONNECT destination TCP 8080 here", "SOCKS negotiates a proxy method and destination, then relays application bytes without providing encryption itself.",
    "TCP CONNECT with the no-authentication method is selected. UDP ASSOCIATE, BIND, authentication methods, and destination DNS details are omitted. A cleartext test application emphasizes that SOCKS5 is not a VPN or TLS.",
    [rfc(1928)], [
        client(), actor("firewall", "SOCKS proxy", "192.168.10.40"), router(), service("Test service")
    ], [[1, 2], [2, 3], [3, 4]], [
        stage("Connect proxy", ...tcpOpen(1, 2)),
        stage("Negotiate method",
            msg(1, 2, "SOCKS5 methods", "CONTROL", "Offer supported authentication methods on the TCP 1080 connection."),
            msg(2, 1, "SOCKS5 no-auth selected", "CONTROL", "Select no authentication for this restricted illustrative proxy; this adds no encryption.")),
        stage("Request destination",
            msg(1, 2, "SOCKS5 CONNECT", "CONTROL", "Request a connection to documentation address 203.0.113.10 TCP 8080."),
            ...tcpOpen(2, 4),
            msg(2, 1, "SOCKS5 success", "CONTROL", "Report successful outbound connection and a bound endpoint; the SOCKS request header is not sent to the destination application.")),
        stage("Relay bytes",
            msg(1, 4, "SOCKS5 relayed plaintext", "DATA", "Relay a benign cleartext application message; SOCKS5 by itself does not conceal it from the proxy or network."),
            msg(4, 1, "SOCKS5 relayed response", "DATA", "Relay the destination response. An application could independently run TLS through SOCKS."))
    ]);

add("reverse-proxy", "Reverse proxy", "HTTP Reverse Proxy", "Route an edge request", "application", "Application intermediary · OSI 7", 7,
    "Client TCP 443; this backend uses HTTP TCP 8080", "A reverse proxy accepts requests for a service and selects a backend; it is the client-facing server, not a general client tunnel.",
    "TLS to the edge is pre-established and terminates there. One configured backend uses private cleartext HTTP, so end-to-end encryption must not be inferred. Health checks, caching, header sanitization details, and retries are omitted.",
    [rfc(9110), rfc(7239)], [
        client(), actor("router", "Edge network", "192.0.2.1"),
        actor("server", "Reverse proxy", "203.0.113.10"), actor("server", "Backend", "192.168.20.10")
    ], [[1, 2], [2, 3], [3, 4]], [
        stage("Receive at edge", msg(1, 3, "HTTPS edge request", "HTTP", "Send GET /guide over the already authenticated client-to-edge TLS connection.")),
        stage("Select backend", msg(3, 3, "Reverse proxy route decision", "CONTROL", "Terminate client TLS and choose a configured backend by host and route; do not treat untrusted forwarding headers as identity.")),
        stage("Forward internally",
            msg(3, 4, "Backend HTTP request", "HTTP", "Open/reuse a separate private TCP 8080 connection and forward HTTP, adding only trusted forwarding metadata."),
            msg(4, 3, "Backend HTTP response", "HTTP", "The backend returns its response to the reverse proxy; this backend leg is cleartext in the lesson.")),
        stage("Return through edge", msg(3, 1, "HTTPS edge response", "HTTP", "Send the response using client-facing TLS. The client never connects directly to the backend."))
    ]);

add("wireguard", "WireGuard", "WireGuard Secure Network Tunnel", "Carry an inner IP packet", "security", "Layer-3 tunnel over UDP · OSI 3 / 4", 3,
    "UDP; conventionally 51820 here (configurable)", "Configured peer public keys identify a tunnel whose encrypted transport packets carry inner IP traffic.",
    "Pre-shared peer public keys and AllowedIPs are configured; optional preshared keys, cookies, roaming, keepalives, and rekey are omitted. The Noise_IK-based exchange is narrated, never computed. Inner addresses are distinct from the drawn outer endpoint identities.",
    [{ label: "WireGuard protocol", url: "https://www.wireguard.com/protocol/" }], [
        actor("client", "VPN client", "192.168.10.20"), router(),
        actor("firewall", "VPN gateway", "203.0.113.10"), actor("server", "Private service", "192.168.20.10")
    ], [[1, 2], [2, 3], [3, 4]], [
        stage("Select peer", msg(1, 1, "WireGuard route selection", "CONTROL", "A route and AllowedIPs select the configured peer for private destination 192.168.20.10; the inner client address is 10.10.0.2.")),
        stage("Authenticate handshake",
            msg(1, 3, "WireGuard handshake initiation", "CONTROL", "Send a UDP 51820 Noise_IK-based initiation using the configured peer key; identity/key material is not actually generated."),
            msg(3, 1, "WireGuard handshake response", "CONTROL", "Authenticate the peer and derive directional session keys conceptually; no certificate authority or TCP handshake is involved.")),
        stage("Encapsulate outbound",
            msg(1, 3, "WireGuard encrypted transport", "DATA", "Encrypt the inner IP packet into an outer UDP datagram; transit sees outer endpoint addresses, not inner traffic."),
            msg(3, 4, "Decapsulated inner IPv4", "DATA", "The gateway verifies and decrypts conceptually, applies source AllowedIPs policy, then routes the private packet.")),
        stage("Return through tunnel",
            msg(4, 3, "Private service response", "DATA", "The service routes its reply for inner client 10.10.0.2 to the VPN gateway."),
            msg(3, 1, "WireGuard protected return", "DATA", "Encrypt the reply into the peer's UDP tunnel; the client conceptually authenticates and decapsulates it."))
    ]);

add("ipsec", "IPsec", "Internet Protocol Security with IKEv2", "Negotiate a site-to-site tunnel", "security", "Network security · OSI 3", 3,
    "IKEv2 UDP 500; NAT-T UDP 4500 if needed; ESP IP protocol 50", "IKEv2 authenticates gateways and negotiates security associations; ESP then protects traffic selected by policy.",
    "A non-NAT ESP tunnel uses protocol 50. NAT detection would instead lead to UDP 4500 encapsulation, not TCP or IP protocol 51 (AH). Gateway certificates/identities and policy are preconfigured; actual cryptography, rekey, and anti-replay windows are narrated.",
    [rfc(7296), rfc(4301), rfc(4303), rfc(3948)], [
        actor("client", "Site A host", "192.168.10.20"), actor("firewall", "Gateway A", "192.0.2.1"),
        actor("router", "Transit", "192.0.2.254"), actor("firewall", "Gateway B", "198.51.100.1"),
        actor("server", "Site B service", "192.168.20.10")
    ], [[1, 2], [2, 3], [3, 4], [4, 5]], [
        stage("Negotiate IKE",
            msg(2, 4, "IKE_SA_INIT request", "CONTROL", "UDP 500 proposes algorithms and supplies an ephemeral DH value and nonce."),
            msg(4, 2, "IKE_SA_INIT response", "CONTROL", "Select algorithms and return DH value and nonce; derive IKE encryption keys conceptually.")),
        stage("Authenticate gateways",
            msg(2, 4, "Encrypted IKE_AUTH request", "CONTROL", "Under IKE protection, authenticate Gateway A and propose CHILD_SA traffic selectors."),
            msg(4, 2, "Encrypted IKE_AUTH response", "CONTROL", "Authenticate Gateway B and establish the first ESP CHILD_SA; policy selects the two private subnets.")),
        stage("Protect outbound",
            msg(1, 2, "Inner IPv4 to gateway", "DATA", "A private packet for 192.168.20.10 matches tunnel policy."),
            msg(2, 4, "ESP tunnel packet", "DATA", "ESP IP protocol 50 protects the inner packet between outer gateway addresses; there is no NAT-T on this illustrated route."),
            msg(4, 5, "Decapsulated inner packet", "DATA", "Gateway B checks integrity and replay policy, decrypts conceptually, and forwards to the private service.")),
        stage("Protect return",
            msg(5, 4, "Inner service response", "DATA", "Return the private response toward Gateway B."),
            msg(4, 2, "ESP protected return", "DATA", "Use the reverse-direction security association; IPsec SAs are unidirectional."),
            msg(2, 1, "Decapsulated response", "DATA", "Deliver the authenticated inner response on Site A."))
    ]);

add("modbus", "Modbus TCP", "Modbus Application Protocol over TCP", "Read a benign register", "application", "Application industrial messaging · OSI 7", 7,
    "TCP 502; MBAP header identifies transactions", "A controller requests a register read; the device returns register data tied to the same transaction.",
    "Read Holding Registers function 03 reads one illustrative non-operational register at protocol offset 0. Vendor address labels such as 40001 are not literal wire addresses. No writes, real equipment, payload execution, security transport, or measured register values are involved; classic Modbus TCP lacks authentication and encryption.",
    [{ label: "Modbus application specification", url: "https://www.modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf" }], [
        actor("client", "Controller", "192.168.10.20"), actor("switch", "Industrial switch", "192.168.10.2"),
        actor("server", "Training device", "192.168.10.30")
    ], [[1, 2], [2, 3]], [
        stage("Connect", ...tcpOpen(1, 3)),
        stage("Request read", msg(1, 3, "Modbus function 03", "DATA", "Send a conceptual MBAP transaction identifier, protocol identifier 0, unit identifier, and function 03: read one holding register at offset 0.")),
        stage("Return register", msg(3, 1, "Modbus read response", "DATA", "Echo the transaction identifier and return one illustrative register value; the value is teaching data, not a measurement.")),
        stage("Validate result", msg(1, 1, "Modbus transaction validation", "CONTROL", "Match the transaction and expected function and register count. An exception would use function 0x83 with an exception code; no write command is sent."))
    ]);

export const guidedLessons = Object.freeze(catalog);

const positions = [
    [82, 102], [274, 102], [466, 102], [658, 270],
    [466, 344], [274, 344], [82, 344], [658, 102]
];

export function guidedLesson(kind) {
    if (!Object.hasOwn(scenarios, kind)) throw new Error(`Unsupported guided network lesson: ${String(kind)}`);
    const scenario = scenarios[kind];
    const topology = {
        devices: scenario.actors.map((item, index) => ({
            ...item, id: index + 1, x: positions[index][0], y: positions[index][1]
        })),
        links: scenario.links.map(link => [...link])
    };
    const endpoint = id => {
        const device = topology.devices.find(item => item.id === id);
        return `${device.name} (${device.address})`;
    };
    let serial = 0;
    const steps = scenario.stages.flatMap(({ phase, messages }) => messages.flatMap(({ from, to, protocol, family, summary }) => {
        const path = findPath(topology, from, to);
        if (!path) throw new Error(`No guided route in ${kind}: ${from} to ${to}`);
        const packetId = `${kind}-${++serial}`;
        const source = endpoint(from);
        const destination = endpoint(to);
        return path.map((node, index) => ({
            node, edge: index ? [path[index - 1], node] : null,
            protocol, family, phase, source, destination, summary, packetId,
            message: `${protocol} · ${endpoint(node)}: ${summary}`
        }));
    }));
    return { topology, steps, definition: guidedLessons[kind] };
}
