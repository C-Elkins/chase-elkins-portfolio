import { parseWorkbenchCommand, workbenchHelp } from "../js/network-workbench-console.mjs";
import { createWorkbench, runWorkbenchDiagnostic } from "../js/network-workbench-model.mjs";

export function runWorkbenchConsoleTests() {
    let passed = 0;
    const assert = (value, label) => { if (!value) throw new Error(label); passed++; };
    const rows = [
        ["ipconfig /all", "config"], ["IPCONFIG /RENEW", "renew"], ["ipconfig /flushdns", "flush"],
        ["route print", "routes"], ["ping app.branch.example", "ping"], ["nslookup app.branch.example 192.168.10.53", "dns"],
        ["tracert 192.168.20.10", "trace"], ["Test-NetConnection app.branch.example -Port 443", "tcp"],
        ["ping -f -l 1372 192.168.20.10", "ping"]
    ];
    for (const [command, kind] of rows) {
        const parsed = parseWorkbenchCommand(command, "client");
        assert(parsed.action.test === kind && parsed.action.source === "client", `${command}: correct action`);
        const a = runWorkbenchDiagnostic(createWorkbench("services"), parsed.action);
        const b = runWorkbenchDiagnostic(createWorkbench("services"), { ...parsed.action });
        assert(JSON.stringify(a) === JSON.stringify(b), `${command}: deterministic action parity`);
    }
    assert(parseWorkbenchCommand("ping -f -l 1372 192.168.20.10").action.size === 1372, "DF payload parsed exactly");
    for (const [command, kind] of [["show ip route", "routes"], ["show vlan brief", "vlans"], ["show interfaces trunk", "trunks"], ["show access-lists", "acl"], ["wireless status", "wireless"]]) {
        assert(parseWorkbenchCommand(command, "router").action.test === kind, `${command}: teaching-device dialect`);
    }
    for (const command of ["", "x".repeat(161), "ping 999.1.1.1", "ping example.com; echo nope", "ping $(whoami)", "<script>alert(1)</script>", "fetch('https://example.com')", "nslookup 192.168.20.10", "Test-NetConnection app.branch.example -Port 0", "Test-NetConnection app.branch.example -Port 65536", "ping -f -l 1473 192.168.20.10", "ipconfig /arbitrary", "tracert a.example | curl x", "ping a.example\nclear"]) {
        let rejected = false;
        try { parseWorkbenchCommand(command); } catch { rejected = true; }
        assert(rejected, `${command.slice(0, 25)}: unsupported input remains inert`);
    }
    assert(parseWorkbenchCommand("help").help.includes("SIMULATED"), "Help labels local simulation");
    assert(parseWorkbenchCommand("clear").clear, "Clear is not a shell action");
    assert(workbenchHelp("router").includes("teaching-device"), "Platform context is explicit");
    return `Workbench console tests passed: ${passed} assertions.`;
}
