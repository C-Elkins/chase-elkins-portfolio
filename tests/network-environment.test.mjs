import { guidedLessons } from "../js/network-guided.mjs";

export async function runNetworkEnvironmentTests(base = "/") {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    let frame = document.createElement("iframe");
    frame.title = "Network workspace layout verification";
    frame.width = "1440";
    frame.height = "900";
    frame.style.border = "0";
    document.body.append(frame);
    try {
        for (const hash of ["", "#algorithms", "#network"]) {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("Network preview failed to load")), 10000);
                frame.onload = () => { clearTimeout(timeout); resolve(); };
                frame.src = `${base}lab.html?network-layout=${Date.now()}${hash}`;
            });
            const freshDoc = frame.contentDocument;
            const freshWin = frame.contentWindow;
            await freshDoc.fonts.ready;
            freshWin.location.hash = "#network";
            freshWin.dispatchEvent(new freshWin.HashChangeEvent("hashchange"));
            await new Promise(resolve => setTimeout(resolve, 40));
            assert(freshDoc.getElementById("network-speed").value === "1200", `Fresh ${hash || "default"} load starts at 0.5x`);
            assert([...freshDoc.querySelectorAll(".scene-icon")].every(icon =>
                freshWin.getComputedStyle(icon).opacity === "1" && !icon.getAnimations().length
            ), `Fresh ${hash || "default"} load never freezes essential artwork at opacity zero`);
            freshWin.dispatchEvent(new freshWin.PageTransitionEvent("pagehide"));
            assert([...freshDoc.querySelectorAll(".scene-icon")].every(icon => freshWin.getComputedStyle(icon).opacity === "1"),
                "A lifecycle pause before playback leaves ready-state icons visible");
        }
        const doc = frame.contentDocument;
        const win = frame.contentWindow;
        const $ = id => doc.getElementById(id);
        await doc.fonts.ready;
        assert($("protocol-picker").children.length === 39, "Guided controller initializes all lessons");
        for (const width of [320, 375, 768, 1000, 1058, 1250, 1251, 1280, 1440, 1511]) {
            frame.width = String(width);
            for (const theme of ["light", "dark"]) {
                doc.documentElement.dataset.theme = theme;
                await new Promise(resolve => setTimeout(resolve, 70));
                assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `Workspace fits ${width}px in ${theme}`);
                if ($("network-fit").getAttribute("aria-pressed") !== "true") $("network-fit").click();
                await new Promise(resolve => setTimeout(resolve, 30));
                const viewport = doc.querySelector(".topology-scroll").getBoundingClientRect();
                assert([...doc.querySelectorAll(".device:not(.scene-outside)")].every(device => {
                    const rect = device.getBoundingClientRect();
                    return rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1;
                }), `Fit diagram keeps every actor visible at ${width}px`);
                if (width >= 1000) {
                    const toolbar = doc.querySelector(".studio-topbar").getBoundingClientRect();
                    const controls = [...doc.querySelectorAll("#network-library, #network-command, .osi-indicator, .studio-mode, .studio-settings > summary, #network-shortcuts")]
                        .map(control => control.getBoundingClientRect());
                    assert(controls.every(rect => rect.left >= toolbar.left && rect.right <= toolbar.right && rect.top >= toolbar.top && rect.bottom <= toolbar.bottom),
                        `Every toolbar control fits its container at ${width}px in ${theme}`);
                    assert(controls.every((a, index) => controls.slice(index + 1).every(b =>
                        a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)),
                    `Toolbar controls never overlap at ${width}px in ${theme}`);
                    const layers = $("network-layers").getBoundingClientRect();
                    const osi = doc.querySelector(".osi-indicator").getBoundingClientRect();
                    assert(layers.right <= osi.right && layers.left >= osi.left, `OSI indicators stay inside their own control at ${width}px`);
                    const layerName = $("network-layer-name");
                    const originalName = layerName.textContent;
                    for (const name of ["PHYSICAL", "DATA LINK", "NETWORK", "TRANSPORT", "SESSION", "PRESENTATION", "APPLICATION"]) {
                        layerName.textContent = name;
                        const text = doc.createRange();
                        text.selectNodeContents(layerName);
                        const label = text.getBoundingClientRect();
                        const numbers = $("network-layers").getBoundingClientRect();
                        const separated = label.right + 4 <= numbers.left || label.bottom + 4 <= numbers.top;
                        assert(separated && label.top >= osi.top && label.bottom <= osi.bottom,
                            `${name} text stays clear of the layer numbers at ${width}px in ${theme}: label=${JSON.stringify(label.toJSON())}, numbers=${numbers.left}, osi=${osi.top}-${osi.bottom}`);
                        assert([...$("network-layers").children].every(chip => chip.getBoundingClientRect().width >= 16),
                            `${name} leaves all seven layer numbers readable at ${width}px in ${theme}`);
                    }
                    layerName.textContent = originalName;
                    const scene = doc.querySelector(".scene-stage").getBoundingClientRect();
                    const packets = doc.querySelector(".simulation").getBoundingClientRect();
                    const overview = doc.querySelector(".protocol-overview").getBoundingClientRect();
                    assert(scene.bottom <= packets.top && overview.bottom <= packets.top, `Desktop panes never overlap at ${width}px in ${theme}`);
                    assert([...doc.querySelectorAll(".device:not(.scene-outside)")].every(device => {
                        const rect = device.getBoundingClientRect();
                        return rect.top >= viewport.top - 1 && rect.bottom <= viewport.bottom + 1;
                    }), `Fitted artwork and labels are fully visible vertically at ${width}px in ${theme}`);
                    assert(packets.bottom <= doc.querySelector(".network-layout").getBoundingClientRect().bottom + 1, `Packet Flow stays inside the bounded workspace at ${width}px`);
                }
                $("sequence-view").click();
                assert(!$("network-sequence-view").hidden, `Sequence view works at ${width}px`);
                assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `Wide sequence is contained at ${width}px`);
                $("network-view").click();
                const color = win.getComputedStyle(doc.querySelector(".network-layers .layer-current")).backgroundColor;
                assert(color !== "rgba(0, 0, 0, 0)", `${theme} paints the active OSI focus`);
                assert($("network-layer-name").textContent === "APPLICATION", `${theme} names DHCP's layer at ${width}px`);
                for (const [button, id] of [["network-command", "protocol-command"], ["network-library", "protocol-drawer"], ["network-osi-guide", "protocol-osi"]]) {
                    $(button).click();
                    const dialog = $(id);
                    await new Promise(resolve => setTimeout(resolve, 10));
                    const bounds = dialog.getBoundingClientRect();
                    assert(dialog.open && bounds.left >= 0 && bounds.right <= doc.documentElement.clientWidth, `${id} fits ${width}px in ${theme}: open=${dialog.open}, left=${bounds.left}, right=${bounds.right}, viewport=${doc.documentElement.clientWidth}`);
                    assert(dialog.contains(doc.activeElement), `${id} receives native modal focus at ${width}px`);
                    dialog.close();
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
        }
        for (const width of [375, 1440]) {
            frame.width = String(width);
            await new Promise(resolve => setTimeout(resolve, 50));
            for (const theme of ["light", "dark"]) {
                doc.documentElement.dataset.theme = theme;
                for (const id of Object.keys(guidedLessons)) {
                    doc.querySelector(`#protocol-picker [data-protocol="${id}"]`).click();
                    const devices = [...doc.querySelectorAll(".device")];
                    for (const device of devices) {
                        const name = device.querySelector(".device-name");
                        assert(name.scrollWidth <= name.clientWidth + 1 && name.scrollHeight <= name.clientHeight + 1, `${id} caption is fully contained at ${width}px in ${theme}`);
                    }
                    assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `${id} scene stays within ${width}px in ${theme}`);
                    $("network-step").click();
                    const matrix = new win.DOMMatrix($("topology-board").style.transform);
                    const origin = $("topology-viewport").getBoundingClientRect();
                    const viewport = doc.querySelector(".topology-scroll").getBoundingClientRect();
                    const framed = [...doc.querySelectorAll(".device:not(.scene-outside)"), $("scene-callout")].filter(element => !element.hidden);
                    assert(framed.every(element => {
                        const x = origin.left + matrix.e + parseFloat(element.style.left) * matrix.a;
                        const y = origin.top + matrix.f + parseFloat(element.style.top) * matrix.d;
                        return x >= viewport.left - 1 && y >= viewport.top - 1
                            && x + element.offsetWidth * matrix.a <= viewport.right + 1
                            && y + element.offsetHeight * matrix.d <= viewport.bottom + 1;
                    }), `${id} follow camera targets contain artwork, labels and callout at ${width}px in ${theme}`);
                    const callout = $("scene-callout").getBoundingClientRect();
                    assert(devices.filter(device => !device.classList.contains("scene-outside")).every(device => {
                        const bounds = device.getBoundingClientRect();
                        return callout.right <= bounds.left || callout.left >= bounds.right || callout.bottom <= bounds.top || callout.top >= bounds.bottom;
                    }), `${id} packet tag never covers a label at ${width}px in ${theme}`);
                }
            }
        }
        doc.querySelector('#protocol-picker [data-protocol="dhcp"]').click();
        for (const [width, height] of [[1058, 805], [1280, 720], [1440, 900]]) {
            frame.width = String(width); frame.height = String(height);
            for (const theme of ["light", "dark"]) {
                doc.documentElement.dataset.theme = theme;
                await new Promise(resolve => setTimeout(resolve, 80));
                const packets = doc.querySelector(".simulation").getBoundingClientRect();
                const scene = doc.querySelector(".scene-stage").getBoundingClientRect();
                assert(scene.bottom <= packets.top, `Scene and Packet Flow stay separate at ${width}×${height} in ${theme}`);
                assert(packets.bottom <= height + 1, `Full workspace fits the ${width}×${height} window in ${theme}`);
                const toggle = doc.querySelector(".lab-header [data-theme-toggle]").getBoundingClientRect();
                assert(toggle.top >= 0 && toggle.right <= width, `Single global theme control stays visible at ${width}×${height}`);
            }
        }
        frame.width = "1280";
        frame.height = "900";
        await new Promise(resolve => setTimeout(resolve, 50));
        $("network-step").focus({ preventScroll: true });
        const scroll = win.scrollY;
        for (let i = 0; i < 10; i++) $("network-step").click();
        assert(doc.activeElement === $("network-step"), "Playback does not recreate or steal focused controls");
        assert(win.scrollY === scroll, "Advancing packets never scrolls the page");
        $("network-mode").value = "sandbox";
        $("network-mode").dispatchEvent(new win.Event("change"));
        doc.querySelector(".network-builder").open = true;
        frame.width = "320";
        await new Promise(resolve => setTimeout(resolve, 50));
        assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, "Expanded mobile builder stays contained");
        assert(doc.querySelectorAll(".palette-item").length === 9, "All original builder devices remain available");
        $("network-mode").value = "guided";
        $("network-mode").dispatchEvent(new win.Event("change"));
        $("network-play").click();
        win.dispatchEvent(new win.PageTransitionEvent("pagehide"));
        const progress = $("network-progress").value;
        await new Promise(resolve => setTimeout(resolve, 800));
        assert($("network-progress").value === progress && $("network-play").textContent === "Play", "Navigation cancels pending playback timers");
        const snapshot = doc.documentElement.cloneNode(true);
        for (const id of ["packet-rows", "protocol-picker", "device-palette"]) snapshot.querySelector(`#${id}`).replaceChildren();
        const markup = snapshot.outerHTML;
        frame.remove();
        frame = document.createElement("iframe");
        frame.title = "Reduced-motion network verification";
        document.body.append(frame);
        const reducedDoc = frame.contentDocument;
        reducedDoc.open();
        const nativeMatchMedia = frame.contentWindow.matchMedia.bind(frame.contentWindow);
        frame.contentWindow.matchMedia = query => {
            const result = nativeMatchMedia(query);
            if (query === "(prefers-reduced-motion: reduce)") Object.defineProperty(result, "matches", { value: true });
            return result;
        };
        reducedDoc.write(markup);
        reducedDoc.close();
        for (let attempt = 0; attempt < 300 && !reducedDoc.getElementById("packet-rows")?.children.length; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        assert(reducedDoc.getElementById("packet-rows")?.children.length > 0, "Reduced-motion workspace initializes");
        reducedDoc.getElementById("network-step").click();
        reducedDoc.getElementById("network-step").click();
        const packet = reducedDoc.querySelector(".network-packet");
        assert(packet && packet.getAnimations().length === 0, "Reduced-motion controller shows static packet positions instead of travel animation");
        return { passed, message: `${passed} Network Studio environment assertions passed.` };
    } finally { frame.remove(); }
}
