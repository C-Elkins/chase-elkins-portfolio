export const osiLayers = Object.freeze([
    { name: "Physical", summary: "Moves raw bits as electrical, light or radio signals.", examples: "Cables, fiber, Wi-Fi radio" },
    { name: "Data link", summary: "Delivers frames to a neighbor on the same local link using MAC addresses.", examples: "Ethernet, Wi-Fi, switches" },
    { name: "Network", summary: "Uses IP addresses to route packets between different networks.", examples: "IPv4, IPv6, routers" },
    { name: "Transport", summary: "Carries data between programs using ports, with optional reliability.", examples: "TCP, UDP, QUIC" },
    { name: "Session", summary: "Opens, keeps track of and closes a conversation.", examples: "Session setup and resumption" },
    { name: "Presentation", summary: "Agrees on how data is encoded, compressed or encrypted.", examples: "Encoding, TLS concepts" },
    { name: "Application", summary: "The protocols apps actually speak to get work done.", examples: "HTTP, DNS, DHCP, email" }
].map(Object.freeze));

export function parseIPv4(text) {
    const parts = String(text).trim().split(".");
    if (parts.length !== 4 || !parts.every(part => /^(0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255)) return null;
    return parts.reduce((value, part) => value * 256 + Number(part), 0);
}

export const formatIPv4 = value => [24, 16, 8, 0].map(shift => Math.floor(value / 2 ** shift) % 256).join(".");

export function parsePrefix(text) {
    const value = String(text).trim().replace(/^\//, "");
    if (/^\d{1,2}$/.test(value)) {
        const prefix = Number(value);
        return prefix <= 32 ? prefix : null;
    }
    const mask = parseIPv4(value);
    if (mask === null) return null;
    const bits = mask.toString(2).padStart(32, "0");
    return /^1*0*$/.test(bits) ? bits.indexOf("0") === -1 ? 32 : bits.indexOf("0") : null;
}

const maskFor = prefix => prefix === 0 ? 0 : (2 ** 32 - 2 ** (32 - prefix));
const networkOf = (address, prefix) => address - address % 2 ** (32 - prefix);

export function compareSubnet(first, second, prefixText) {
    const a = parseIPv4(first);
    const b = parseIPv4(second);
    const prefix = parsePrefix(prefixText);
    if (a === null || b === null) return { ok: false, error: "Enter two IPv4 addresses such as 192.168.1.20." };
    if (prefix === null) return { ok: false, error: "Enter a prefix such as /24 or a mask such as 255.255.255.0." };
    const size = 2 ** (32 - prefix);
    const networkA = networkOf(a, prefix);
    const networkB = networkOf(b, prefix);
    const usable = prefix >= 31 ? size : Math.max(0, size - 2);
    return {
        ok: true,
        prefix,
        mask: formatIPv4(maskFor(prefix)),
        networkA: `${formatIPv4(networkA)}/${prefix}`,
        networkB: `${formatIPv4(networkB)}/${prefix}`,
        same: networkA === networkB,
        usable,
        broadcast: prefix >= 31 ? null : formatIPv4(networkA + size - 1)
    };
}

const steps = {
    power: { question: "Is the printer powered on and showing no error (paper, toner, jam)?", yes: "network", no: { fix: "Clear the error on the printer's own screen first. A printer that is asleep, jammed or out of paper often reports itself as offline." } },
    network: { question: "Does the printer's own network page show it connected with an IP address?", yes: "subnet", no: { fix: "Reconnect it to Wi-Fi or check the Ethernet cable and switch port. Without a link and an address, nothing else can reach it." } },
    subnet: { question: "Is that address in the same subnet as your computer (for example 192.168.1.x with a /24)?", yes: "changed", no: { fix: "The printer may be on a guest or IoT network, or have an old static address. Move it to the right network or ask the admin for a route or firewall rule between them." } },
    changed: { question: "Does the address your computer uses for the printer match the printer's current address?", yes: "firewall", no: { fix: "The printer's address changed after a DHCP lease ended. Re-add the printer, and give it a DHCP reservation so the address stays the same." } },
    firewall: { question: "Can you open the printer's built-in web page from your computer?", yes: "queue", no: { fix: "Something between you is blocking traffic: client isolation on Wi-Fi, a firewall, or a VPN. Allow local network access or disconnect the VPN and try again." } },
    queue: { question: "Is the print queue on your computer clear of stuck or paused jobs?", yes: { fix: "Remove and re-add the printer using its IPP/AirPrint/Mopria entry, or update its driver. If that fails, restart the printer and the print spooler." }, no: { fix: "Cancel the stuck job and resume the queue. One broken job can block every job behind it." } }
};

export const printerTroubleshooter = Object.freeze({ start: "power", steps });

export function troubleshootStep(id) {
    const step = steps[id];
    return step ? { id, question: step.question } : null;
}

export function troubleshootAnswer(id, answer) {
    const next = steps[id]?.[answer ? "yes" : "no"];
    if (!next) return null;
    return typeof next === "string" ? { next } : { fix: next.fix };
}
