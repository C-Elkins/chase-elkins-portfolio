import { appliedCourse } from "../js/networking-applied.mjs";
import { mountWorkbench } from "../js/network-workbench.js";
import { workbenchFields, verifyWorkbench } from "../js/network-workbench-model.mjs";
import { repairs } from "./network-workbench-model.test.mjs";

export async function runWorkbenchUITests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const host = document.createElement("section");
    host.className = "guided-course";
    document.body.append(host);
    let controller;
    try {
        for (const module of appliedCourse.modules) {
            host.replaceChildren();
            let verified = 0;
            controller = mountWorkbench({ container: host, module, onPass: () => { verified++; }, onSave: () => {} });
            await settle();
            const desktop = innerWidth >= 1000;
            for (const view of [...(desktop ? [] : ["topology"]), "configure", "test", "trace", "objectives"]) {
                const tab = host.querySelector(`[data-workbench-view="${view}"]`);
                assert(Boolean(tab), `${module.id}: ${view} has a focused-view control`);
                tab.click();
                await settle();
                const panel = host.querySelector(`#${tab.getAttribute("aria-controls")}`);
                assert(tab.getAttribute("aria-pressed") === "true" && panel?.getBoundingClientRect().height > 0, `${module.id}: ${view} exposes its actual panel and selected state`);
                if (desktop) assert(host.querySelector("svg").getBoundingClientRect().height > 0, `${module.id}: topology remains visible alongside ${view}`);
            }
            if (desktop && innerHeight >= 600) assert(host.getBoundingClientRect().height <= innerHeight - 44, `${module.id}: desktop workspace is bounded to the usable viewport`);
            const selectDevice = async id => {
                host.querySelector('[data-workbench-view="configure"]').click();
                const picker = host.querySelector("[data-workbench-device]");
                assert(Boolean(picker), `${module.id}: keyboard device picker exists`);
                picker.value = id;
                picker.dispatchEvent(new Event("change", { bubbles: true }));
                await settle();
            };
            const command = async text => {
                host.querySelector('[data-workbench-view="test"]').click();
                const input = host.querySelector("[data-workbench-command]");
                assert(Boolean(input?.form), `${module.id}: console is a real labeled form`);
                input.value = text;
                input.form.requestSubmit();
                await settle();
            };
            await selectDevice("client");
            await command("Test-NetConnection app.branch.example -Port 443");
            assert(!controller.getState().results.at(-1).ok, `${module.id}: console exposes the actual initial fault`);
            host.querySelector("[data-workbench-pin]").click();
            await settle();
            assert(controller.getState().pinned.length === 1, `${module.id}: failed baseline is pinned`);
            const byDevice = new Map();
            for (const [path, value] of Object.entries(repairs[module.id])) {
                const device = workbenchFields.find(field => field.path === path).device;
                if (!byDevice.has(device)) byDevice.set(device, []);
                byDevice.get(device).push([path, value]);
            }
            for (const [device, changes] of byDevice) {
                await selectDevice(device);
                for (const [path, value] of changes) {
                    const input = host.querySelector(`[data-config-path="${path}"]`);
                    assert(Boolean(input), `${module.id}: realistic editable ${path} control`);
                    if (input.type === "checkbox") input.checked = value;
                    else input.value = String(value);
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                }
                host.querySelector("[data-workbench-apply]").click();
                await settle();
            }
            await selectDevice("client");
            if (["addressing", "services", "capstone"].includes(module.id)) {
                await command("Test-NetConnection app.branch.example -Port 443");
                assert(!controller.getState().results.at(-1).ok, `${module.id}: server changes alone do not rewrite held lease`);
                await command("ipconfig /renew");
            }
            await command("Test-NetConnection app.branch.example -Port 443");
            assert(controller.getState().results.at(-1).ok, `${module.id}: actual configuration repairs the service`);
            host.querySelector("[data-workbench-pin]").click();
            await settle();
            host.querySelector("[data-workbench-verify]").click();
            await settle();
            assert(verified === 1 && verifyWorkbench(controller.getState()).passed, `${module.id}: evidence plus full objective matrix earns practical`);
            assert(host.querySelector("svg"), `${module.id}: visual topology is rendered`);
            assert(host.scrollWidth <= host.clientWidth + 1, `${module.id}: workbench has no horizontal page overflow`);
            const count = controller.getState().results.length;
            await command("ping app.branch.example; alert(1)");
            assert(controller.getState().results.length === count, `${module.id}: unsupported input cannot execute actions`);
            controller.destroy();
            controller = null;
        }
    } finally {
        controller?.destroy();
        host.remove();
    }
    return `Workbench UI tests passed: ${passed} assertions.`;
}
