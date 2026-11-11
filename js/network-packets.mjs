const encoder = new TextEncoder();
export function internetChecksum(bytes) {
    let sum = 0;
    for (let i = 0; i < bytes.length; i += 2) sum += (bytes[i] << 8) | (bytes[i + 1] || 0);
    while (sum >>> 16) sum = (sum & 65535) + (sum >>> 16);
    return (~sum) & 65535;
}
const join = (...parts) => {
    const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
};
const word = (bytes, offset, value) => new DataView(bytes.buffer).setUint16(offset, value);
const name = text => join(...text.split(".").map(label => join(Uint8Array.of(label.length), encoder.encode(label))), Uint8Array.of(0));

// These are independent, deterministic wire examples, not encodings of the
// conceptual event. In particular, encrypted and aggregated events have no dump.
export function packetExample(step) {
    if (step.error) return null;
    let protocol = step.protocol.toUpperCase();
    if (step.family === "DHCP" && /^(DISCOVER|OFFER|REQUEST|ACK)$/.test(protocol)) protocol = `DHCP ${protocol}`;
    if (protocol === "TCP") {
        if (step.summary.startsWith("SYN + ACK")) protocol = "TCP SYN-ACK";
        else if (step.summary.startsWith("SYN /")) protocol = "TCP SYN";
        else if (step.summary.startsWith("ACK /")) protocol = "TCP ACK";
    }
    if (protocol === "HTTP" && step.summary.startsWith("GET /")) protocol = "HTTP GET";
    if (protocol === "HTTP" && step.summary.startsWith("HTTP/1.1 200")) protocol = "HTTP 200";
    const text = `${protocol} ${step.phase} ${step.summary} ${step.source} ${step.destination}`.toUpperCase();
    const dns = /^DNS (RECURSIVE |AUTHORITATIVE )?(QUERY|ANSWER)$/.test(protocol);
    const dhcp = /^DHCP (DISCOVER|OFFER|REQUEST|ACK)$/.test(protocol);
    const http = /^HTTP (GET|200)$/.test(protocol);
    const tcp = /^TCP (SYN|SYN-ACK|ACK)$/.test(protocol);
    const icmp = /^ICMP ECHO (REQUEST|REPLY)$/.test(protocol);
    if (!dns && !dhcp && !http && !tcp && !icmp) return null;
    const reply = /ANSWER|200|SYN-ACK|REPLY|OFFER|DHCP ACK/.test(protocol);
    const source = dhcp ? reply ? [192, 0, 2, 1] : [0, 0, 0, 0] : reply ? [192, 0, 2, 53] : [192, 0, 2, 10];
    const destination = dhcp ? [255, 255, 255, 255] : reply ? [192, 0, 2, 10] : [192, 0, 2, 53];
    const datagram = dns || dhcp;
    const ipProtocol = datagram ? 17 : icmp ? 1 : 6;
    let payload = new Uint8Array();
    let application = null;
    if (dns) {
        const header = new Uint8Array(12);
        word(header, 0, 0x4001); word(header, 2, reply ? 0x8180 : 0x0100);
        word(header, 4, 1); word(header, 6, reply ? 1 : 0);
        const question = join(name("studio.test"), Uint8Array.of(0, 1, 0, 1));
        const answer = reply ? Uint8Array.of(0xc0, 0x0c, 0, 1, 0, 1, 0, 0, 0, 60, 0, 4, 203, 0, 113, 10) : new Uint8Array();
        payload = join(header, question, answer);
        application = { name: "DNS", fields: [
            ["Transaction ID", "0x4001 (example)", 0, 2],
            ["Flags", reply ? "0x8180: response, recursion available" : "0x0100: query, recursion desired", 2, 2],
            ["Record counts", `1 question, ${reply ? 1 : 0} answer, 0 authority, 0 additional`, 4, 8],
            ["Question", "studio.test / A / IN", 12, question.length],
            ...(reply ? [["Answer", "Name pointer 0xc00c; A 203.0.113.10; TTL 60 seconds", 12 + question.length, answer.length]] : [])
        ] };
    } else if (dhcp) {
        const type = { "DHCP DISCOVER": 1, "DHCP OFFER": 2, "DHCP REQUEST": 3, "DHCP ACK": 5 }[protocol];
        const header = new Uint8Array(240);
        header[0] = reply ? 2 : 1; header[1] = 1; header[2] = 6;
        new DataView(header.buffer).setUint32(4, 0x40010001);
        word(header, 10, 0x8000);
        if (reply) header.set([192, 0, 2, 100], 16);
        header.set([2, 0, 0, 0, 0, 10], 28);
        header.set([99, 130, 83, 99], 236);
        const options = Uint8Array.from([
            53, 1, type,
            ...(reply || type === 3 ? [54, 4, 192, 0, 2, 1] : []),
            ...(type === 3 ? [50, 4, 192, 0, 2, 100] : []),
            ...(reply ? [51, 4, 0, 0, 14, 16, 1, 4, 255, 255, 255, 0, 3, 4, 192, 0, 2, 1, 6, 4, 192, 0, 2, 53] : []),
            255
        ]);
        payload = new Uint8Array(300);
        payload.set(header); payload.set(options, 240);
        application = { name: "DHCP / BOOTP", fields: [
            ["Operation / hardware", `${reply ? "BOOTREPLY" : "BOOTREQUEST"}; Ethernet, 6-byte address, 0 relay hops`, 0, 4],
            ["Transaction ID", "0x40010001 (example)", 4, 4],
            ["Elapsed seconds / flags", "0 seconds; broadcast bit set", 8, 4],
            ["Client / offered addresses", reply ? "ciaddr 0.0.0.0; yiaddr 192.0.2.100" : "ciaddr 0.0.0.0; yiaddr 0.0.0.0", 12, 8],
            ["Server / relay fields", "siaddr and giaddr 0.0.0.0; DHCP server identifier is option 54", 20, 8],
            ["Client hardware address", "02:00:00:00:00:0a with zero padding", 28, 16],
            ["Legacy boot fields", "Server name and boot file unused", 44, 192],
            ["DHCP cookie", "63 82 53 63 (hex)", 236, 4],
            ["Options", `Message type ${type} (${protocol}); ${reply ? "server 192.0.2.1, lease 3600s, mask /24, router .1, DNS .53" : type === 3 ? "server 192.0.2.1, requested address 192.0.2.100" : "minimal discovery"}; End then zero padding`, 240, 60]
        ] };
    } else if (http) {
        const message = reply
            ? "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\nHello"
            : "GET /guide HTTP/1.1\r\nHost: studio.test\r\n\r\n";
        payload = encoder.encode(message);
        application = { name: "HTTP/1.1", fields: [["Readable application bytes", message, 0, payload.length]] };
    }
    let segment;
    let transport;
    const port = dns ? 53 : dhcp ? 67 : /443/.test(text) ? 443 : 80;
    const clientPort = dhcp ? 68 : 49152;
    const sequence = protocol === "TCP SYN" || protocol === "TCP SYN-ACK" ? reply ? 200 : 100 : reply ? 201 : 101;
    const acknowledgment = protocol === "TCP SYN" ? 0 : reply ? 101 : 201;
    if (icmp) {
        segment = join(Uint8Array.of(reply ? 0 : 8, 0, 0, 0, 0x40, 1, 0, 1), encoder.encode("lab"));
        word(segment, 2, internetChecksum(segment));
        transport = { name: "ICMP", fields: [
            ["Type / code", reply ? "0 / 0: Echo Reply" : "8 / 0: Echo Request", 0, 2],
            ["Checksum", `0x${new DataView(segment.buffer).getUint16(2).toString(16).padStart(4, "0")}`, 2, 2],
            ["Identifier / sequence", "0x4001 / 1 (example)", 4, 4],
            ["Payload", "lab (three ASCII bytes)", 8, 3]
        ] };
    } else {
        const header = new Uint8Array(datagram ? 8 : 20);
        word(header, 0, reply ? port : clientPort); word(header, 2, reply ? clientPort : port);
        if (datagram) word(header, 4, header.length + payload.length);
        else {
            const view = new DataView(header.buffer);
            view.setUint32(4, sequence);
            view.setUint32(8, acknowledgment);
            header[12] = 0x50;
            header[13] = protocol === "TCP SYN" ? 2 : protocol === "TCP SYN-ACK" ? 18 : http ? 24 : 16;
            word(header, 14, 4096);
        }
        segment = join(header, payload);
        const pseudo = join(Uint8Array.from(source), Uint8Array.from(destination), Uint8Array.of(0, ipProtocol, segment.length >>> 8, segment.length & 255), segment);
        word(segment, datagram ? 6 : 16, internetChecksum(pseudo) || 65535);
        transport = { name: datagram ? "UDP" : "TCP", fields: [
            ["Source / destination ports", `${reply ? port : clientPort} → ${reply ? clientPort : port}`, 0, 4],
            ...(datagram ? [["Length", `${segment.length} bytes including UDP header`, 4, 2]]
                : [["Sequence / acknowledgment", `${sequence} / ${acknowledgment} (example)`, 4, 8],
                    ["Header / flags", `20 bytes; ${protocol.startsWith("TCP ") ? protocol.slice(4) : "PSH, ACK"}`, 12, 2],
                    ["Receive window", "4096 bytes (example; scaling omitted)", 14, 2]]),
            ["Checksum", `0x${new DataView(segment.buffer).getUint16(datagram ? 6 : 16).toString(16).padStart(4, "0")}; includes IPv4 pseudo-header`, datagram ? 6 : 16, 2],
            ...(!datagram ? [["Urgent pointer", "0; URG is not set", 18, 2]] : [])
        ] };
    }
    const ip = new Uint8Array(20);
    ip[0] = 0x45; word(ip, 2, 20 + segment.length); word(ip, 4, 0x4001);
    word(ip, 6, 0x4000); ip[8] = 64; ip[9] = ipProtocol;
    ip.set(source, 12); ip.set(destination, 16); word(ip, 10, internetChecksum(ip));
    const ethernet = Uint8Array.of(2, 0, 0, 0, 0, reply ? 10 : 53, 2, 0, 0, 0, 0, reply ? 53 : 10, 8, 0);
    if (dhcp) { ethernet.fill(255, 0, 6); ethernet[11] = reply ? 1 : 10; }
    const section = (item, start, length) => ({
        name: item.name, start, length,
        fields: item.fields.map(([label, value, offset, size]) => ({ label, value, start: start + offset, length: size }))
    });
    const sections = [
        section({ name: "Ethernet II", fields: [
            ["Destination / source", dhcp ? `ff:ff:ff:ff:ff:ff / ${reply ? "02:00:00:00:00:01" : "02:00:00:00:00:0a"}` : reply ? "02:00:00:00:00:0a / 02:00:00:00:00:35" : "02:00:00:00:00:35 / 02:00:00:00:00:0a", 0, 12],
            ["EtherType", "0x0800: IPv4", 12, 2]
        ] }, 0, 14),
        section({ name: "IPv4", fields: [
            ["Version / header length / DSCP / ECN", "IPv4; 20 bytes; ordinary best-effort traffic", 0, 2],
            ["Total length", `${20 + segment.length} bytes (not including Ethernet)`, 2, 2],
            ["Identification / fragmentation", "0x4001; Don't Fragment; offset 0", 4, 4],
            ["TTL / protocol", `64 / ${ipProtocol} (${transport.name})`, 8, 2],
            ["Header checksum", `0x${new DataView(ip.buffer).getUint16(10).toString(16).padStart(4, "0")}`, 10, 2],
            ["Source", source.join("."), 12, 4], ["Destination", destination.join("."), 16, 4]
        ] }, 14, 20),
        section(transport, 34, datagram ? 8 : icmp ? segment.length : 20)
    ];
    if (application) sections.push(section(application, datagram ? 42 : 54, payload.length));
    return {
        bytes: join(ethernet, ip, segment), sections,
        note: `Independent synthetic example on a fictional local Ethernet link using documentation addresses${dhcp ? " and initial DHCP broadcasts" : " 192.0.2.10 and 192.0.2.53"}. Not this diagram's capture, timing, addresses, or exact event. Checksums are calculated; sequence numbers are examples. Ethernet padding, preamble and FCS are omitted.`
    };
}
