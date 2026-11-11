import { guidedLessons, guidedLesson } from "../js/network-guided.mjs";
import { lessonTeaching } from "../js/network-lessons.mjs";

const inventory = [
    "http", "https", "websocket", "webrtc", "sip", "rtsp", "rtmp", "quic", "tcp", "udp", "ip", "bgp", "ipv6",
    "dns", "doh", "dnssec", "dhcp", "icmp", "igmp", "ntp", "ethernet", "pppoe", "wifi", "wpa3", "radius",
    "captive", "smtp", "pop3", "imap", "ftp", "smb", "ssh", "tls", "http-proxy", "socks5", "reverse-proxy",
    "wireguard", "ipsec", "modbus"
];
const allowedTypes = new Set(["client", "phone", "printer", "switch", "ap", "router", "firewall", "server", "internet"]);
const allowedFamilies = new Set(["DHCP", "DNS", "TCP", "HTTP", "TLS", "CONTROL", "DATA"]);
const referenceHosts = new Set([
    "www.rfc-editor.org", "standards.ieee.org", "www.wi-fi.org",
    "rtmp.veriskope.com", "learn.microsoft.com", "www.wireguard.com", "www.modbus.org"
]);

// Collapse forwarding hops without confusing a later message with the same label.
function messages(kind) {
    return guidedLesson(kind).steps.filter((step, index, steps) => !index || step.packetId !== steps[index - 1].packetId);
}

export function runGuidedNetworkTests() {
    let passed = 0;
    const assert = (condition, label) => {
        if (!condition) throw new Error(`Guided network: ${label}`);
        passed++;
    };
    const text = kind => {
        const definition = guidedLessons[kind];
        return [definition.transport, definition.description, definition.note, ...messages(kind).map(step => step.summary)].join(" ");
    };
    const position = (kind, protocol) => messages(kind).findIndex(step => step.protocol === protocol);
    const before = (kind, first, second) => {
        const a = position(kind, first);
        const b = position(kind, second);
        assert(a >= 0 && b > a, `${kind}: ${first} precedes ${second}`);
    };
    assert(Object.keys(guidedLessons).length === 39, "exactly 39 definitions");
    assert(inventory.every(id => Object.hasOwn(guidedLessons, id)), "all required IDs exist");
    assert(Object.isFrozen(guidedLessons), "catalog cannot be mutated");
    assert(new Set(Object.values(guidedLessons).map(definition => definition.entry.text)).size === inventory.length, "each lesson has its own opening entry");
    assert(new Set(Object.values(guidedLessons).map(definition => definition.group)).size === 3, "all three overview groups represented");
    for (const id of ["invalid", "", "__proto__", "constructor", null, undefined]) {
        let error;
        try { guidedLesson(id); } catch (caught) { error = caught; }
        assert(error instanceof Error && error.message.includes("Unsupported guided network lesson"), `unsupported ${String(id)} fails clearly`);
    }

    for (const id of inventory) {
        const result = guidedLesson(id);
        const { topology, steps, definition } = result;
        const { devices, links } = topology;
        assert(definition === guidedLessons[id], `${id}: definition identity matches contract`);
        assert(Object.isFrozen(definition.entry), `${id}: opening presentation is immutable`);
        for (const field of ["heading", "text", "context"]) {
            assert(typeof definition.entry[field] === "string" && definition.entry[field].length > 5, `${id}: meaningful opening ${field}`);
        }
        assert(definition.entry.text.length <= 29 && definition.entry.context.length <= 35, `${id}: opening fits the caption`);
        assert(["command", "address"].includes(definition.entry.kind), `${id}: known opening presentation`);
        if (definition.entry.kind === "address") {
            assert(new URL(definition.entry.text).hostname.endsWith(".test"), `${id}: illustrative address uses a reserved domain`);
        }
        for (const field of ["name", "fullName", "title", "layer", "transport", "description", "note"]) {
            assert(typeof definition[field] === "string" && definition[field].trim().length > 0, `${id}: meaningful ${field}`);
        }
        assert(["core", "application", "security"].includes(definition.group), `${id}: valid group`);
        assert(Number.isInteger(definition.layerIndex) && definition.layerIndex >= 1 && definition.layerIndex <= 7, `${id}: layer index within display range`);
        assert(definition.phases.length >= 3 && definition.phases.length <= 6, `${id}: 3–6 conceptual phases`);
        assert(new Set(definition.phases).size === definition.phases.length, `${id}: distinct phase names`);
        assert(definition.references.length > 0, `${id}: standards cited`);
        assert(Object.isFrozen(definition) && Object.isFrozen(definition.phases) && Object.isFrozen(definition.references), `${id}: shared metadata is immutable`);
        for (const reference of definition.references) {
            const url = /^https:\/\/([^/?#]+)\/\S+$/.exec(reference.url);
            assert(reference.label.length > 0 && url && referenceHosts.has(url[1]), `${id}: authoritative HTTPS reference`);
            assert(Object.isFrozen(reference), `${id}: reference cannot mutate future lessons`);
        }
        assert(/scripted conceptual events/.test(definition.note) && /No network requests or sandbox state changes/.test(definition.note), `${id}: explicit simulation boundary`);
        assert(devices.length >= 2 && devices.length <= 8, `${id}: bounded actor count`);
        const byId = new Map(devices.map(device => [device.id, device]));
        assert(byId.size === devices.length, `${id}: unique node IDs`);
        const endpoints = new Map(devices.map(device => [`${device.name} (${device.address})`, device.id]));
        assert(endpoints.size === devices.length, `${id}: unambiguous endpoint identities`);
        for (const device of devices) {
            assert(Number.isInteger(device.id) && allowedTypes.has(device.type), `${id}: supported device icon`);
            assert(device.x >= 62 && device.x <= 698 && device.y >= 44 && device.y <= 396, `${id}: device inside board bounds`);
            assert(typeof device.name === "string" && typeof device.address === "string" && device.address.length > 0, `${id}: named, addressed actor`);
            assert(/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|2001:db8:|02:|0\.0\.0\.0$)/i.test(device.address), `${id}: documentation/private address only`);
        }
        const edges = new Set();
        const edgeKey = ([a, b]) => [a, b].sort((x, y) => x - y).join(":");
        for (const link of links) {
            assert(link.length === 2 && byId.has(link[0]) && byId.has(link[1]) && link[0] !== link[1], `${id}: valid topology edge`);
            assert(!edges.has(edgeKey(link)), `${id}: no duplicate undirected link`);
            edges.add(edgeKey(link));
        }
        const reachable = new Set([devices[0].id]);
        for (let iteration = 0; iteration < devices.length; iteration++) {
            for (const [a, b] of links) {
                if (reachable.has(a)) reachable.add(b);
                if (reachable.has(b)) reachable.add(a);
            }
        }
        assert(reachable.size === devices.length, `${id}: every actor connected`);
        assert(steps.length > 0 && steps.length <= 120, `${id}: bounded nonempty trace`);
        assert(definition.phases.every(phase => steps.some(step => step.phase === phase)), `${id}: every phase reachable`);
        const seenPackets = new Set();
        let current;
        let previous;
        let phaseIndex = -1;
        for (const step of steps) {
            assert(byId.has(step.node), `${id}: trace node exists`);
            assert(allowedFamilies.has(step.family), `${id}: palette-compatible family`);
            for (const field of ["protocol", "source", "destination", "summary", "message", "packetId"]) {
                assert(typeof step[field] === "string" && step[field].length > 0, `${id}: populated step ${field}`);
            }
            assert(definition.phases.includes(step.phase), `${id}: phase belongs to definition`);
            const nextPhase = definition.phases.indexOf(step.phase);
            assert(nextPhase >= phaseIndex, `${id}: phase order does not regress`);
            phaseIndex = nextPhase;
            assert(endpoints.has(step.source) && endpoints.has(step.destination), `${id}: stable named endpoint address strings`);
            if (step.packetId !== current?.packetId) {
                if (current) assert(previous.node === endpoints.get(current.destination), `${id}: previous message reaches its declared destination`);
                assert(!seenPackets.has(step.packetId), `${id}: logical message ID never reused non-contiguously`);
                seenPackets.add(step.packetId);
                current = step;
                assert(step.edge === null, `${id}: logical message starts without a forwarding edge`);
                assert(step.node === endpoints.get(step.source), `${id}: logical message starts at source`);
            } else {
                assert(Array.isArray(step.edge) && step.edge[0] === previous.node && step.edge[1] === step.node, `${id}: forwarding is contiguous`);
                assert(["source", "destination", "protocol", "family", "phase", "summary"].every(field => step[field] === current[field]), `${id}: packet metadata constant across forwarding hops`);
            }
            if (step.edge !== null) assert(edges.has(edgeKey(step.edge)), `${id}: uses an actual connected link`);
            previous = step;
        }
        assert(previous.node === endpoints.get(current.destination), `${id}: final message reaches destination`);
        assert(seenPackets.size >= definition.phases.length, `${id}: phases contain substantive logical events`);

        const fresh = guidedLesson(id);
        assert(fresh.topology !== topology && fresh.steps !== steps && fresh.topology.devices !== devices && fresh.topology.links !== links, `${id}: fresh top-level data`);
        assert(fresh.topology.devices[0] !== devices[0] && fresh.topology.links[0] !== links[0] && fresh.steps[0] !== steps[0], `${id}: fresh nested records`);
        const firstEdge = steps.find(step => step.edge);
        const newEdge = fresh.steps.find(step => step.edge);
        assert(firstEdge && newEdge && firstEdge.edge !== newEdge.edge, `${id}: fresh nested trace edges`);
        const baseline = JSON.stringify(fresh);
        devices[0].name = "mutated";
        links[0][0] = -1;
        firstEdge.edge[0] = -1;
        steps[0].summary = "mutated";
        steps.pop();
        assert(JSON.stringify(guidedLesson(id)) === baseline, `${id}: caller mutations cannot contaminate later runs`);
    }

    // Security and control-plane order matter more than animation labels.
    for (const kind of ["https", "tls", "doh", "http-proxy", "smtp"]) {
        before(kind, "TLS ClientHello", "TLS ServerHello");
        before(kind, "TLS ServerHello", "TLS encrypted server flight");
        before(kind, "TLS encrypted server flight", "TLS certificate verification");
        before(kind, "TLS certificate verification", "TLS encrypted client Finished");
        const flight = messages(kind).find(step => step.protocol === "TLS encrypted server flight");
        assert(/Encrypted after ServerHello/.test(flight.summary) && /CertificateVerify/.test(flight.summary) && /Finished/.test(flight.summary), `${kind}: protected server authentication flight`);
    }
    before("https", "DNS query", "TCP SYN");
    before("https", "TLS encrypted client Finished", "HTTPS request");
    assert(/cleartext UDP 53/i.test(messages("https")[0].summary) && /destination IP.*203\.0\.113\.10/.test(text("https")), "HTTPS leaves ordinary DNS and routing IP visible");
    before("tls", "TLS encrypted client Finished", "TLS application data");
    assert(/no single strict OSI layer/.test(guidedLessons.tls.layer), "TLS layer index is only a display anchor");
    before("quic", "QUIC Initial / TLS ClientHello", "QUIC Initial / TLS ServerHello");
    before("quic", "QUIC Initial / TLS ServerHello", "QUIC Handshake / encrypted server flight");
    before("quic", "QUIC Handshake / encrypted server flight", "QUIC certificate verification");
    before("quic", "QUIC certificate verification", "QUIC Handshake / client Finished");
    before("quic", "QUIC Handshake / client Finished", "HTTP/3 request on QUIC");
    assert(/UDP 443/.test(guidedLessons.quic.transport) && !messages("quic").some(step => step.family === "TCP"), "QUIC uses UDP rather than TCP");
    assert(/publicly derivable/.test(guidedLessons.quic.note), "QUIC Initial is not confidential against observers");

    assert(messages("dhcp").map(step => step.protocol).join(",") === "DHCP DISCOVER,DHCP OFFER,DHCP REQUEST,DHCP ACK", "DHCP DORA order");
    assert(/68.*67/.test(text("dhcp")) && /No lease is committed/.test(text("dhcp")), "DHCP ports and sandbox independence");
    before("dns", "DNS root referral", "DNS TLD query");
    before("dns", "DNS TLD referral", "DNS authoritative query");
    before("dnssec", "DNSKEY and RRSIG", "DNSSEC local validation");
    assert(/trust anchor/.test(text("dnssec")) && /Authenticity is not secrecy/.test(text("dnssec")), "DNSSEC anchored authenticity, not confidentiality");
    before("bgp", "BGP OPEN", "BGP UPDATE");
    assert(/TCP 179/.test(guidedLessons.bgp.transport) && messages("bgp").every(step => ["TCP", "CONTROL"].includes(step.family)), "BGP routing is control plane");
    assert(/not a measured packet path/.test(text("bgp")) && /203\.0\.113\.0\/24/.test(text("bgp")), "BGP advertises prefixes without promising forwarding path");
    before("ipv6", "ICMPv6 Router Advertisement", "SLAAC tentative address");
    before("ipv6", "ICMPv6 DAD Neighbor Solicitation", "DAD wait completed");
    before("ipv6", "DAD wait completed", "IPv6 application datagram");
    assert(guidedLesson("ipv6").topology.devices.every(device => device.address.startsWith("2001:db8:")), "IPv6 uses documentation space");

    before("webrtc", "Application signaling", "ICE STUN check");
    before("webrtc", "ICE nomination", "DTLS handshake");
    before("webrtc", "DTLS fingerprint verification", "SRTP media");
    assert(/not specified by WebRTC/.test(text("webrtc")) && /TURN fallback/.test(text("webrtc")), "WebRTC signaling and relay limits explicit");
    before("sip", "SIP forwarded ACK", "RTP audio");
    assert(/5060/.test(text("sip")) && /5061/.test(text("sip")) && /RTP.*negotiated/.test(text("sip")), "SIP control and media distinguished");
    before("rtsp", "RTSP SETUP", "RTSP PLAY");
    before("rtsp", "RTSP PLAY", "RTP video");
    assert(/TCP 554/.test(text("rtsp")), "RTSP control port");
    before("rtmp", "RTMP C2", "RTMP connect");
    before("rtmp", "RTMP publish", "RTMP media chunks");
    assert(/TCP 1935/.test(text("rtmp")) && /not a cryptographic handshake/.test(text("rtmp")), "RTMP handshake is not TLS");

    before("wpa3", "SAE Confirm", "EAPOL-Key message 1");
    before("wpa3", "EAPOL-Key message 4", "Protected 802.11 data");
    assert(/WPA2-Personal.*PSK/.test(text("wpa3")) && /without SAE/.test(text("wpa3")) && /Neither sends the password/.test(text("wpa3")), "WPA2 and WPA3 password handshakes differentiated");
    assert(/open WLAN/.test(text("wifi")) && /proves no password/.test(text("wifi")), "open Wi-Fi is not secure authentication");
    const radius = guidedLesson("radius");
    const backendRequests = radius.steps.filter(step => step.protocol.startsWith("RADIUS Access-Request"));
    assert(backendRequests.length > 0 && backendRequests.every(step => step.source.startsWith("Authenticator (") && step.destination.startsWith("AAA backend (")), "only authenticator sends RADIUS requests");
    assert(/UDP 1812/.test(text("radius")) && /EAPOL, not RADIUS/.test(text("radius")), "EAP access link is distinct from RADIUS backend");

    before("ftp", "FTP EPSV", "FTP data TCP SYN");
    before("ftp", "FTP 150", "FTP file data");
    before("ftp", "FTP file data", "FTP 226");
    assert(/TCP 21/.test(text("ftp")) && /50000/.test(text("ftp")) && /not fixed TCP 20/.test(text("ftp")), "FTP control and passive data ports differ");
    before("http-proxy", "HTTP 200 Connection Established", "TLS ClientHello");
    assert(/does not establish TLS/.test(text("http-proxy")), "CONNECT success is not a TLS handshake");
    assert(/TCP 1080/.test(text("socks5")) && /does not conceal/.test(text("socks5")), "SOCKS does not encrypt payloads");
    before("reverse-proxy", "Reverse proxy route decision", "Backend HTTP request");
    assert(/TLS.*terminates there/.test(text("reverse-proxy")) && /cleartext/.test(text("reverse-proxy")), "reverse proxy TLS termination is not end-to-end TLS");
    before("ssh", "SSH host-key verification", "SSH user authentication");
    before("ssh", "SSH USERAUTH_SUCCESS", "SSH CHANNEL_OPEN");
    assert(/no shell or process is launched/.test(text("ssh")), "SSH lesson never executes a shell");
    before("smtp", "TLS encrypted client Finished", "SMTP EHLO after TLS");
    before("smtp", "SMTP RCPT TO", "SMTP DATA");
    before("smtp", "SMTP 354", "SMTP message content");
    assert(/TCP 587/.test(text("smtp")), "SMTP submission port");
    assert(/retrieval alone does not/.test(text("pop3")) && /no DELE/i.test(text("pop3")), "POP3 retrieval does not silently delete mail");
    before("imap", "IMAP IDLE continuation", "IMAP EXISTS update");
    assert(/UIDVALIDITY/.test(text("imap")) && /without implicitly setting the Seen/.test(text("imap")), "IMAP stable identity and non-mutating fetch explained");
    assert(/CREATE is the SMB operation name/.test(text("smb")), "SMB read-only open is not an implicit file write");

    assert(/IP protocol 6/.test(text("tcp")) && /retransmission/.test(text("tcp")), "TCP recovery and protocol number");
    assert(/IP protocol 17/.test(text("udp")) && /no.*automatic retry/.test(text("udp")), "UDP has no transport retransmission");
    assert(/protocol 1;/.test(text("icmp")) && /no.*ports/.test(text("icmp")), "ICMP is not a port-based transport");
    assert(/protocol 2/.test(text("igmp")) && /224\.0\.0\.22/.test(text("igmp")), "IGMP protocol and report destination");
    assert(/offset =/.test(text("ntp")) && /never blindly set time/i.test(text("ntp")), "NTP estimates offset before applying discipline policy");
    before("ethernet", "Ethernet frame A to B", "Ethernet learned unicast");
    assert(/0x8863/.test(text("pppoe")) && /0x8864/.test(text("pppoe")), "PPPoE discovery and session EtherTypes");
    assert(/CAPPORT/.test(text("captive")) && /not.*simulated/.test(text("captive")), "captive portal limits are explicit");
    assert(/UDP.*51820/.test(text("wireguard")) && /configurable/.test(text("wireguard")), "WireGuard port is a configurable convention");
    before("wireguard", "WireGuard handshake response", "WireGuard encrypted transport");
    assert(/UDP 500/.test(text("ipsec")) && /UDP 4500/.test(text("ipsec")) && /ESP IP protocol 50/.test(text("ipsec")), "IPsec IKE, NAT-T, ESP identifiers");
    before("ipsec", "Encrypted IKE_AUTH response", "ESP tunnel packet");
    assert(/no NAT-T/.test(text("ipsec")) && /unidirectional/.test(text("ipsec")), "ESP mode and directional SAs explicit");
    assert(/TCP 502/.test(text("modbus")) && /function 03/i.test(text("modbus")) && /no write command/.test(text("modbus")), "Modbus only reads a benign register");
    before("modbus", "Modbus read response", "Modbus transaction validation");
    const intros = new Set(), explanations = new Set();
    for (const id of inventory) {
        const teaching = lessonTeaching[id];
        assert(teaching && Object.isFrozen(teaching) && Object.isFrozen(teaching.phases), `${id} has frozen teaching content`);
        assert(teaching.intro.length >= 120 && teaching.intro.length <= 300 && teaching.intro.split(/[.!?](?:\s|$)/).filter(Boolean).length >= 2,
            `${id} intro is two or more bounded beginner sentences`);
        assert(!intros.has(teaching.intro), `${id} intro is unique`); intros.add(teaching.intro);
        assert(teaching.facts.length === 3 && teaching.facts.every(([label, value]) => label.length <= 20 && value.length > 0 && value.length <= 45),
            `${id} has three bounded lesson facts`);
        assert(JSON.stringify(Object.keys(teaching.phases)) === JSON.stringify(guidedLessons[id].phases), `${id} teaches every scripted phase in order`);
        for (const [phase, [tagline, explanation]] of Object.entries(teaching.phases)) {
            assert(tagline.length > 0 && tagline.length <= 40, `${id} / ${phase} tagline is concise`);
            assert(explanation.length >= 80 && explanation.length <= 240, `${id} / ${phase} explanation is bounded`);
            assert(!explanations.has(explanation), `${id} / ${phase} explanation is unique`); explanations.add(explanation);
        }
    }
    assert(Object.keys(lessonTeaching).length === inventory.length, "Teaching content covers exactly the 39 lessons");
    return { passed, message: `${passed} guided network assertions passed across 39 protocols.` };
}

if (typeof document === "undefined") console.log(runGuidedNetworkTests());
