import { parseIPv4 } from "./networking-basics-model.mjs";

const clientHelp = [
    "SIMULATED Windows client commands",
    "ipconfig /all                  Inspect held address, gateway and resolver",
    "ipconfig /renew                Renew the modeled staff lease",
    "ipconfig /flushdns             Clear modeled positive DNS cache",
    "route print                    Inspect the teaching route table",
    "ping <address-or-name>         Test modeled ICMP reachability",
    "ping -f -l <size> <target>      DF-set IPv4 test; payload 0-1472 bytes",
    "nslookup <name> [resolver]     Query DNS directly, bypassing OS cache",
    "tracert <address-or-name>      Inspect a conceptual path (not measured hops)",
    "Test-NetConnection <target> -Port <port>",
    "                              Test a modeled TCP/application connection",
    "TCP tests include a separately labeled teaching TLS/application follow-up.",
    "help                          Show supported syntax",
    "clear                         Clear visible console history",
    "Names: app.branch.example, printer.branch.example",
    "Targets: 192.168.10.1, 192.168.10.53, 192.168.20.10, 192.168.20.40",
    "No real commands or network requests run. Outputs are teaching models."
];
const deviceHelp = [
    "SIMULATED teaching-device dialect (not a universal vendor CLI)",
    "show ip route                 Inspect modeled route entries",
    "show vlan brief               Inspect staff and guest membership",
    "show interfaces trunk         Inspect modeled VLAN carriage",
    "show access-lists             Inspect staff/guest policy",
    "wireless status               Inspect simplified channel/width constraints",
    "help                          Show supported syntax",
    "clear                         Clear visible console history",
    "Use the configuration editor to apply changes.",
    "Select Staff PC or Guest PC for Windows-client diagnostics."
];

export function workbenchHelp(source = "client") {
    return (["client", "guest"].includes(source) ? clientHelp : deviceHelp).join("\n");
}

function target(value) {
    if (!value || value.length > 100 || (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(value) && parseIPv4(value) === null)) throw new TypeError("Enter a valid virtual IPv4 address or DNS name.");
    return value.toLowerCase();
}

export function parseWorkbenchCommand(text, source = "client") {
    if (typeof text !== "string" || !text.trim() || text.length > 160) throw new TypeError("Enter a supported command of 1-160 characters. Type help for examples.");
    if (/[;&|<>`$\\\n\r{}\u0000]/.test(text)) throw new TypeError("Shell operators, scripts and command chaining are not supported. Type one teaching command.");
    const tokens = text.trim().split(/\s+/);
    const lower = tokens.map(token => token.toLowerCase());
    const command = lower[0];
    if (command === "help" && tokens.length === 1) return { help: workbenchHelp(source) };
    if (command === "clear" && tokens.length === 1) return { clear: true };
    const action = { source };
    const clients = ["client", "guest"].includes(source);
    if (!clients) {
        const key = lower.join(" ");
        const tests = { "show ip route": "routes", "show vlan brief": "vlans", "show interfaces trunk": "trunks", "show access-lists": "acl", "wireless status": "wireless" };
        if (tests[key]) return { action: { ...action, test: tests[key] } };
        throw new TypeError("Unsupported teaching-device command. Type help, or select a client for Windows diagnostics.");
    }
    if (command === "ipconfig" && tokens.length === 2) {
        const tests = { "/all": "config", "/renew": "renew", "/flushdns": "flush" };
        if (tests[lower[1]]) return { action: { ...action, test: tests[lower[1]] } };
    }
    if (lower.join(" ") === "route print") return { action: { ...action, test: "routes" } };
    if (command === "ping") {
        if (tokens.length === 2) return { action: { ...action, test: "ping", destination: target(tokens[1]) } };
        if (tokens.length === 5 && lower[1] === "-f" && lower[2] === "-l" && /^\d+$/.test(tokens[3])) {
            const size = Number(tokens[3]);
            if (size > 1472) throw new RangeError("Payload size must be from 0 to 1472 bytes.");
            return { action: { ...action, test: "ping", destination: target(tokens[4]), size, df: true } };
        }
    }
    if (command === "tracert" && tokens.length === 2) return { action: { ...action, test: "trace", destination: target(tokens[1]) } };
    if (command === "nslookup" && [2, 3].includes(tokens.length)) {
        const destination = target(tokens[1]);
        if (parseIPv4(destination) !== null) throw new TypeError("This lesson models forward lookup by name, not reverse PTR lookup.");
        const parsed = { ...action, test: "dns", destination };
        if (tokens[2]) {
            if (parseIPv4(tokens[2]) === null) throw new TypeError("The optional resolver must be a virtual IPv4 address.");
            parsed.resolver = tokens[2];
        }
        return { action: parsed };
    }
    if (command === "test-netconnection" && tokens.length === 4 && lower[2] === "-port" && /^\d+$/.test(tokens[3])) {
        const port = Number(tokens[3]);
        if (port < 1 || port > 65535) throw new RangeError("Port must be from 1 to 65535.");
        return { action: { ...action, test: "tcp", destination: target(tokens[1]), port } };
    }
    throw new TypeError("Unsupported command or flag. Type help for this device's supported syntax. Nothing was executed.");
}
