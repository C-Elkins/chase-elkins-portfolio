import { deviceTypes, officeTopology, networkScenario, isClient, validateLink, dhcpTrace, webTrace, sortFrames } from "./lab-model.mjs";
import { networkIcon } from "./network-icons.mjs";
import { initializeCompression } from "./compression.js";
import { initializeCryptoStudio } from "./crypto-studio.js";

const $ = id => document.getElementById(id);
const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initializeNetwork() {
    let topology = officeTopology();
    let nextId = 8;
    let selected = 1;
    const leases = new Map();
    let steps = [];
    let stepIndex = 0;
    let pendingLease = null;
    let timer = null;
    let activeStep = null;
    let cableMode = false;
    let cableFrom = null;
    let dragging = false;

    const status = (message, error = false) => {
        $("network-status").textContent = message;
        $("network-status").classList.toggle("error", error);
    };
    const pause = () => {
        clearTimeout(timer);
        timer = null;
        $("network-play").textContent = "Play";
    };
    const clearTrace = () => {
        pause();
        steps = [];
        stepIndex = 0;
        pendingLease = null;
        activeStep = null;
        $("network-log").replaceChildren();
        $("packet-status").textContent = "Choose an action to prepare a trace.";
        $("network-play").disabled = true;
        $("network-step").disabled = true;
        $("network-stop").disabled = true;
    };
    const refill = (id, devices) => {
        const select = $(id);
        const previous = select.value;
        select.replaceChildren(...devices.map(d => {
            const option = make("option", d.name);
            option.value = String(d.id);
            return option;
        }));
        if (devices.some(d => String(d.id) === previous)) select.value = previous;
        if (!devices.length) {
            const option = make("option", "No devices available");
            option.value = "";
            select.appendChild(option);
        }
    };
    const positions = () => new Map(topology.devices.map(d => [d.id, { x: d.x, y: d.y }]));
    const renderLinks = () => {
        const coords = positions();
        $("topology-lines").replaceChildren();
        topology.links.forEach(([a, b]) => {
            const from = coords.get(a);
            const to = coords.get(b);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            for (const [attr, value] of Object.entries({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })) line.setAttribute(attr, value);
            line.dataset.from = a;
            line.dataset.to = b;
            const devices = [a, b].map(id => topology.devices.find(d => d.id === id));
            const wireless = devices.some(d => d.type === "ap") && devices.some(d => ["client", "phone"].includes(d.type));
            const active = activeStep?.edge && activeStep.edge.every(id => [a, b].includes(id));
            line.setAttribute("class", `network-link${wireless ? " wireless" : ""}${active ? " active" : ""}`);
            $("topology-lines").appendChild(line);
        });
    };
    const updateTraffic = (animate = false) => {
        $("topology-lines").querySelectorAll(".network-link").forEach(line => {
            line.classList.toggle("active", !!activeStep?.edge && activeStep.edge.every(id => [Number(line.dataset.from), Number(line.dataset.to)].includes(id)));
        });
        $("topology-lines").querySelector(".network-packet")?.remove();
        if (activeStep?.edge && !dragging) {
            const coords = positions();
            const from = coords.get(activeStep.edge[0]);
            const to = coords.get(activeStep.edge[1]);
            const packet = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            packet.setAttribute("class", "network-packet");
            packet.setAttribute("cx", to.x);
            packet.setAttribute("cy", to.y);
            packet.setAttribute("r", "5");
            $("topology-lines").appendChild(packet);
            if (animate && !reducedMotion.matches) packet.animate([
                { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)` },
                { transform: "translate(0, 0)" }
            ], { duration: Math.min(500, Number($("network-speed").value) * .8), easing: "ease-in-out" });
        }
        $("topology-devices").querySelectorAll(".device").forEach(button => {
            const id = Number(button.dataset.deviceId);
            button.classList.toggle("active", activeStep?.node === id);
            button.classList.toggle("selected", selected === id);
            button.classList.toggle("cable-source", cableMode && cableFrom === id);
            button.setAttribute("aria-pressed", String(selected === id));
            const lease = leases.get(id);
            if (lease) button.querySelector(".device-ip").textContent = lease.ip;
        });
    };
    const moveDevice = (device, x, y, button) => {
        device.x = Math.round(Math.max(62, Math.min(698, x)));
        device.y = Math.round(Math.max(44, Math.min(396, y)));
        button.style.left = `${device.x - 57}px`;
        button.style.top = `${device.y - 38}px`;
        renderLinks();
        updateTraffic();
    };
    const boardPoint = event => {
        const rect = $("topology-board").getBoundingClientRect();
        return { x: (event.clientX - rect.left) * 760 / rect.width, y: (event.clientY - rect.top) * 440 / rect.height };
    };
    const connect = (from, to) => {
        const error = validateLink(topology, from, to);
        if (error) { status(error, true); return; }
        topology.links.push([from, to]);
        edited("Devices connected. Leases and traces cleared for the new topology.");
    };
    const selectDevice = device => {
        selected = device.id;
        if (cableMode) {
            if (cableFrom === null) {
                cableFrom = device.id;
                status(`Cable starts at ${device.name}. Select a second device.`);
            } else {
                const from = cableFrom;
                cableFrom = null;
                connect(from, device.id);
            }
        }
        updateTraffic();
        renderInspector();
    };
    const render = () => {
        $("topology-count").textContent = `${topology.devices.length}/16 DEVICES · ${topology.links.length} LINKS`;
        renderLinks();
        $("topology-devices").replaceChildren(...topology.devices.map(d => {
            const button = make("button", undefined, `device${d.id === selected ? " selected" : ""}${activeStep?.node === d.id ? " active" : ""}`);
            button.type = "button";
            button.dataset.deviceId = String(d.id);
            button.style.left = `${d.x - 57}px`;
            button.style.top = `${d.y - 38}px`;
            button.setAttribute("aria-label", `${d.name}. Select to inspect; arrow keys move the device.`);
            button.setAttribute("aria-pressed", String(d.id === selected));
            button.append(
                networkIcon(d.type),
                make("span", d.name, "device-name"),
                make("span", leases.get(d.id)?.ip || (d.type === "router" ? "192.168.10.1" : d.type === "server" ? "192.168.10.53" : deviceTypes[d.type].label), "device-ip")
            );
            let gesture = null;
            let suppressClick = false;
            button.addEventListener("pointerdown", event => {
                if (event.button !== 0 || !event.isPrimary || cableMode) return;
                const point = boardPoint(event);
                gesture = { pointerId: event.pointerId, startX: point.x, startY: point.y, x: d.x, y: d.y, moved: false };
                button.setPointerCapture(event.pointerId);
            });
            button.addEventListener("pointermove", event => {
                if (!gesture || event.pointerId !== gesture.pointerId) return;
                const point = boardPoint(event);
                if (!gesture.moved && Math.hypot(point.x - gesture.startX, point.y - gesture.startY) < 4) return;
                if (!gesture.moved) {
                    pause(); gesture.moved = true; dragging = true; selected = d.id;
                    button.classList.add("dragging");
                    renderInspector();
                }
                moveDevice(d, gesture.x + point.x - gesture.startX, gesture.y + point.y - gesture.startY, button);
            });
            const finishDrag = event => {
                if (!gesture) return;
                const moved = gesture.moved;
                suppressClick = moved && event.type === "pointerup";
                gesture = null;
                dragging = false;
                button.classList.remove("dragging");
                updateTraffic();
                if (moved) status(`${d.name} moved. Playback paused; leases and cables are unchanged.`);
            };
            button.addEventListener("pointerup", finishDrag);
            button.addEventListener("pointercancel", finishDrag);
            button.addEventListener("lostpointercapture", finishDrag);
            button.addEventListener("click", () => {
                if (suppressClick) { suppressClick = false; return; }
                selectDevice(d);
            });
            button.addEventListener("keydown", event => {
                const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
                if (!delta) return;
                event.preventDefault();
                pause();
                moveDevice(d, d.x + delta[0] * (event.shiftKey ? 30 : 10), d.y + delta[1] * (event.shiftKey ? 30 : 10), button);
            });
            return button;
        }));
        updateTraffic();
        renderInspector();
    };
    const renderInspector = () => {
        const inspector = $("device-inspector");
        inspector.replaceChildren();
        const device = topology.devices.find(d => d.id === selected);
        if (device) {
            const description = {
                client: "Originates requests. Needs a DHCP lease before using DNS or reaching other networks.",
                phone: "A wireless client that receives its own DHCP lease and uses the AP to reach the LAN.",
                printer: "A wired network endpoint. This lesson demonstrates its DHCP and DNS client behavior, not a print protocol.",
                switch: "Forwards frames within the local network.",
                ap: "Bridges a wireless client into the wired LAN; it does not allocate addresses here.",
                router: "Default gateway and DHCP server for this single-subnet lesson.",
                firewall: "Filters simulated web traffic. The block setting applies to every firewall on the selected route.",
                server: "Answers demo.test with 203.0.113.10. DNS resolution does not itself grant connectivity.",
                internet: "An external simulated web endpoint, never a real internet request."
            };
            const copy = make("div");
            copy.append(make("strong", device.name), make("p", description[device.type]));
            const remove = make("button", "Remove device");
            remove.type = "button";
            remove.addEventListener("click", () => {
                topology.devices = topology.devices.filter(d => d.id !== selected);
                topology.links = topology.links.filter(link => !link.includes(selected));
                selected = topology.devices[0]?.id ?? null;
                edited("Device removed. Leases and traces cleared.");
            });
            const useClient = make("button", "Use as source client");
            useClient.type = "button";
            useClient.addEventListener("click", () => {
                $("source-client").value = String(device.id);
                clearTrace(); updateTraffic();
                status(`${device.name} selected as the source. Request a lease to begin.`);
            });
            inspector.append(copy);
            if (isClient(device)) inspector.append(useClient);
            inspector.append(remove);
        } else inspector.appendChild(make("p", "Add a device to start building."));
    };
    const refreshControls = () => {
        refill("link-from", topology.devices);
        refill("link-to", topology.devices);
        if ($("link-from").value === $("link-to").value && topology.devices.length > 1) $("link-to").selectedIndex = 1;
        refill("source-client", topology.devices.filter(isClient));
        $("link-list").replaceChildren(...topology.links.map(([a, b]) => {
            const li = make("li");
            const names = [a, b].map(id => topology.devices.find(d => d.id === id).name);
            const remove = make("button", "Disconnect");
            remove.type = "button";
            remove.setAttribute("aria-label", `Disconnect ${names.join(" and ")}`);
            remove.addEventListener("click", () => {
                topology.links = topology.links.filter(([x, y]) => !(x === a && y === b));
                edited("Connection removed. Request a new lease to explore the changed topology.");
            });
            li.append(make("span", names.join(" ↔ ")), remove);
            return li;
        }));
    };
    const edited = message => {
        clearTrace();
        cableFrom = null;
        leases.clear();
        refreshControls();
        render();
        status(message);
    };
    const next = () => {
        if (stepIndex >= steps.length) return;
        const step = steps[stepIndex++];
        activeStep = step;
        const li = make("li", step.message, step.error ? "error" : "");
        $("network-log").appendChild(li);
        if ($("network-follow").checked) $("network-log").scrollTop = $("network-log").scrollHeight;
        $("packet-status").textContent = `${step.protocol} · Hop ${stepIndex}/${steps.length}`;
        if (stepIndex === steps.length) {
            pause();
            if (pendingLease) leases.set(pendingLease.clientId, pendingLease.lease);
            pendingLease = null;
            $("network-play").disabled = true;
            $("network-step").disabled = true;
            status(step.error ? "Trace ended at the failed step. Change the topology or service settings and try again." : "Trace complete. You can now run another experiment.", !!step.error);
        }
        updateTraffic(true);
    };
    const playTick = () => {
        next();
        if (stepIndex < steps.length) timer = setTimeout(playTick, Number($("network-speed").value));
    };
    const prepare = result => {
        clearTrace();
        updateTraffic();
        if (result.error) { status(result.error, true); return; }
        steps = result.steps;
        $("network-play").disabled = false;
        $("network-step").disabled = false;
        $("network-stop").disabled = false;
        $("packet-status").textContent = `${steps.length} hops ready. Play or step through the trace.`;
        status("Trace prepared; the simulation has not sent any real traffic.");
    };
    $("run-dhcp").addEventListener("click", () => {
        const clientId = Number($("source-client").value);
        const result = dhcpTrace(topology, clientId, $("dhcp-on").checked, leases);
        prepare(result);
        if (result.lease) pendingLease = { clientId, lease: result.lease };
    });
    $("run-web").addEventListener("click", () => {
        prepare(webTrace(topology, Number($("source-client").value), leases, {
            dnsEnabled: $("dns-on").checked, blockWeb: $("firewall-on").checked
        }));
    });
    $("network-step").addEventListener("click", () => { pause(); next(); });
    $("network-play").addEventListener("click", () => {
        if (timer !== null) { pause(); return; }
        $("network-play").textContent = "Pause";
        playTick();
    });
    const addDevice = (type, point = null) => {
        if (!Object.hasOwn(deviceTypes, type)) { status("Choose a supported device type.", true); return; }
        if (topology.devices.length >= 16) { status("This lesson supports up to 16 devices. Remove one before adding another.", true); return; }
        if (["router", "server", "internet"].includes(type) && topology.devices.some(d => d.type === type)) {
            status(`This single-LAN lesson supports one ${deviceTypes[type].label.toLowerCase()}.`, true); return;
        }
        const id = nextId++;
        const slots = Array.from({ length: 16 }, (_, i) => ({ x: 95 + i % 4 * 190, y: 62 + Math.floor(i / 4) * 105 }));
        const slot = point
            ? { x: Math.max(62, Math.min(698, point.x)), y: Math.max(44, Math.min(396, point.y)) }
            : slots.find(s => !topology.devices.some(d => Math.abs(d.x - s.x) < 114 && Math.abs(d.y - s.y) < 80)) || slots[topology.devices.length];
        topology.devices.push({ id, type, name: `${deviceTypes[type].label} ${id}`, ...slot });
        selected = id;
        edited("Device added. Drag to position it, then use Cable mode or the From and To controls.");
    };
    $("add-device").addEventListener("click", () => addDevice($("device-type").value));
    for (const [type, info] of Object.entries(deviceTypes)) {
        const button = make("button", undefined, "palette-item");
        button.type = "button";
        button.draggable = true;
        button.append(networkIcon(type), make("span", info.label));
        button.addEventListener("click", () => addDevice(type));
        button.addEventListener("dragstart", event => {
            event.dataTransfer.setData("application/x-lab-device", type);
            event.dataTransfer.effectAllowed = "copy";
        });
        $("device-palette").append(button);
    }
    $("topology-board").addEventListener("dragover", event => {
        if (!event.dataTransfer.types.includes("application/x-lab-device")) return;
        event.preventDefault(); event.dataTransfer.dropEffect = "copy";
    });
    $("topology-board").addEventListener("drop", event => {
        event.preventDefault();
        addDevice(event.dataTransfer.getData("application/x-lab-device"), boardPoint(event));
    });
    $("add-link").addEventListener("click", () => {
        const from = Number($("link-from").value);
        const to = Number($("link-to").value);
        connect(from, to);
    });
    const loadScenario = name => {
        const scenario = networkScenario(name);
        cableMode = false;
        $("network-connect").setAttribute("aria-pressed", "false");
        topology = scenario.topology; nextId = Math.max(...topology.devices.map(d => d.id)) + 1; selected = 1;
        $("dhcp-on").checked = scenario.settings.dhcpEnabled;
        $("dns-on").checked = scenario.settings.dnsEnabled;
        $("firewall-on").checked = scenario.settings.blockWeb;
        $("scenario-lesson").textContent = scenario.lesson;
        edited("Scenario loaded. Request an IP for the selected client, then try DNS + web.");
    };
    $("load-scenario").addEventListener("click", () => loadScenario($("network-scenario").value));
    $("network-reset").addEventListener("click", () => {
        $("network-scenario").value = "office"; loadScenario("office");
    });
    $("network-clear").addEventListener("click", () => {
        cableMode = false;
        $("network-connect").setAttribute("aria-pressed", "false");
        topology = { devices: [], links: [] }; selected = null; nextId = 1;
        $("scenario-lesson").textContent = "Sandbox / Build your own single-LAN topology. Nothing here sends real network traffic.";
        edited("Topology cleared. Add a client, switch or AP, router, DNS server, and internet endpoint.");
    });
    $("network-stop").addEventListener("click", () => {
        clearTrace(); updateTraffic(); status("Trace stopped. Completed leases are preserved; an unfinished DHCP exchange is discarded.");
    });
    $("network-connect").addEventListener("click", () => {
        cableMode = !cableMode; cableFrom = null;
        $("network-connect").setAttribute("aria-pressed", String(cableMode));
        updateTraffic();
        status(cableMode ? "Cable mode on. Select a starting device, then a destination. Select Cable mode again to exit." : "Move mode on. Drag devices to rearrange them.");
    });
    for (const id of ["dhcp-on", "dns-on", "firewall-on"]) {
        $(id).addEventListener("change", () => {
            clearTrace();
            updateTraffic();
            status("Service setting changed. Existing leases remain valid; prepare a new trace.");
        });
    }
    $("source-client").addEventListener("change", () => {
        clearTrace();
        selected = Number($("source-client").value) || null;
        updateTraffic(); renderInspector();
        status("Client selected and highlighted on the board. Prepare a new trace.");
    });
    refreshControls();
    render();
    status("Office network loaded. Select Request IP / DHCP, then Play or Next hop to follow the exchange.");
    $("scenario-lesson").textContent = networkScenario("office").lesson;
    return pause;
}

function initializeSorting() {
    let original = [];
    let frames = [];
    let index = 0;
    let timer = null;
    const pause = () => { clearTimeout(timer); timer = null; $("sort-play").textContent = "Play"; };
    const render = () => {
        const frame = frames[index];
        $("sort-chart").replaceChildren(...frame.values.map((value, i) => {
            const bar = make("div", undefined, `sort-bar${frame.action === "complete" ? " complete" : frame.indices.includes(i) ? ` ${frame.action}` : ""}`);
            bar.style.height = `${value}%`;
            return bar;
        }));
        $("sort-chart").setAttribute("aria-label", `${frame.action === "complete" ? "Sorted" : "Current"} array: ${frame.values.join(", ")}`);
        $("sort-values").textContent = frame.values.join(", ");
        $("sort-comparisons").textContent = frame.comparisons;
        $("sort-writes").textContent = frame.writes;
        $("sort-state").textContent = frame.action === "complete" ? "Sorted" : frame.action === "ready" ? "Ready" : frame.action === "compare" ? "Comparing" : "Writing";
        $("sort-step").disabled = index === frames.length - 1;
        $("sort-play").disabled = index === frames.length - 1;
    };
    const reset = (randomize = false) => {
        pause();
        if (randomize) original = Array.from({ length: Number($("sort-size").value) }, () => Math.floor(Math.random() * 91) + 10);
        frames = sortFrames(original, $("sort-algorithm").value);
        index = 0;
        $("sort-size-value").textContent = original.length;
        $("sort-explanation").textContent = $("sort-algorithm").value === "bubble"
            ? "Bubble sort moves the largest remaining value to the right on each pass. Comparisons and writes are counted separately."
            : "Insertion sort shifts values to make a gap for the key. During a shift, the held key is outside the visible array; temporary duplicate values are expected.";
        render();
    };
    const next = () => {
        if (index < frames.length - 1) index++;
        render();
        if (index === frames.length - 1) pause();
    };
    const tick = () => {
        next();
        if (index < frames.length - 1) timer = setTimeout(tick, Number($("sort-speed").value));
    };
    $("sort-play").addEventListener("click", () => {
        if (timer !== null) { pause(); return; }
        $("sort-play").textContent = "Pause"; tick();
    });
    $("sort-step").addEventListener("click", () => { pause(); next(); });
    $("sort-shuffle").addEventListener("click", () => reset(true));
    $("sort-restart").addEventListener("click", () => reset());
    $("sort-algorithm").addEventListener("change", () => reset());
    $("sort-size").addEventListener("input", () => reset(true));
    reset(true);
    return pause;
}

function initializeAudio() {
    let context = null;
    let analyser = null;
    let gain = null;
    let oscillator = null;
    let media = null;
    let fileUrl = null;
    let frameId = null;
    let generation = 0;
    const canvas = $("audio-canvas");
    const drawing = canvas.getContext("2d");
    let colors;
    const updateColors = () => {
        const style = getComputedStyle(document.documentElement);
        colors = Object.fromEntries(["board", "line", "muted", "accent", "cyan"].map(name => [name, style.getPropertyValue(`--${name}`).trim()]));
    };
    updateColors();
    const status = (text, error = false) => {
        $("audio-status").textContent = text;
        $("audio-status").classList.toggle("error", error);
    };
    const drawIdle = () => {
        drawing.fillStyle = colors.board; drawing.fillRect(0, 0, canvas.width, canvas.height);
        drawing.strokeStyle = colors.line; drawing.lineWidth = 2;
        drawing.beginPath(); drawing.moveTo(0, canvas.height / 2); drawing.lineTo(canvas.width, canvas.height / 2); drawing.stroke();
        drawing.fillStyle = colors.muted; drawing.font = "16px monospace";
        drawing.fillText(reducedMotion.matches ? "REDUCED MOTION / AUDIO CONTROLS AVAILABLE" : "SIGNAL ROOM / WAITING FOR AUDIO", 24, 40);
    };
    const stop = () => {
        generation++;
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        if (media) { media.pause(); media.removeAttribute("src"); media.load(); media = null; }
        if (oscillator) { oscillator.stop(); oscillator.disconnect(); oscillator = null; }
        if (gain) gain.disconnect();
        if (analyser) analyser.disconnect();
        gain = null; analyser = null;
        const oldContext = context;
        context = null;
        if (oldContext && oldContext.state !== "closed") {
            oldContext.close().catch(() => status("The browser could not release its audio session. Reload the page before trying again.", true));
        }
        $("audio-play").disabled = false;
        $("audio-stop").disabled = true;
        canvas.setAttribute("aria-label", "Audio visualization stopped");
        drawIdle();
    };
    const draw = () => {
        if (!analyser || reducedMotion.matches || document.hidden) { frameId = null; return; }
        const waveform = $("audio-mode").value === "waveform";
        const data = new Uint8Array(waveform ? analyser.fftSize : analyser.frequencyBinCount);
        if (waveform) analyser.getByteTimeDomainData(data);
        else analyser.getByteFrequencyData(data);
        drawing.fillStyle = colors.board; drawing.fillRect(0, 0, canvas.width, canvas.height);
        if (waveform) {
            drawing.strokeStyle = colors.accent; drawing.lineWidth = 2; drawing.beginPath();
            data.forEach((value, i) => {
                const x = i / (data.length - 1) * canvas.width;
                const y = value / 255 * canvas.height;
                if (!i) drawing.moveTo(x, y); else drawing.lineTo(x, y);
            });
            drawing.stroke();
        } else {
            const bins = 96;
            const maxBin = Math.min(data.length - 1, Math.ceil(8000 / (context.sampleRate / analyser.fftSize)));
            for (let i = 0; i < bins; i++) {
                const from = Math.floor((Math.pow(maxBin + 1, i / bins) - 1));
                const to = Math.max(from + 1, Math.floor(Math.pow(maxBin + 1, (i + 1) / bins) - 1));
                let peak = 0;
                for (let bin = from; bin < Math.min(to, data.length); bin++) peak = Math.max(peak, data[bin]);
                const height = Math.max(2, peak / 255 * (canvas.height - 40));
                drawing.fillStyle = i % 3 ? colors.cyan : colors.accent;
                drawing.fillRect(i / bins * canvas.width, canvas.height - height, canvas.width / bins - 2, height);
            }
        }
        drawing.fillStyle = colors.muted; drawing.font = "14px monospace";
        drawing.fillText(waveform ? "AMPLITUDE / TIME" : "FREQUENCY / LOG SCALE / 0–8 kHz", 20, 24);
        frameId = requestAnimationFrame(draw);
    };
    $("audio-play").addEventListener("click", async () => {
        stop();
        const token = generation;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) { status("Web Audio is not supported in this browser.", true); return; }
        if ($("audio-source").value === "file" && !fileUrl) { status("Choose an audio file before starting playback.", true); return; }
        $("audio-play").disabled = true;
        $("audio-stop").disabled = false;
        try {
            context = new AudioContext();
            await context.resume();
            if (token !== generation) return;
            analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            gain = context.createGain();
            gain.gain.value = Number($("audio-volume").value) / 100;
            analyser.connect(gain); gain.connect(context.destination);
            if ($("audio-source").value === "tone") {
                oscillator = context.createOscillator();
                oscillator.type = "sine";
                oscillator.frequency.value = Number($("tone-frequency").value);
                oscillator.connect(analyser); oscillator.start();
            } else {
                media = new Audio(fileUrl);
                media.addEventListener("error", () => {
                    if (token !== generation) return;
                    stop();
                    status("The browser could not decode this audio file. Try another format or the generated tone.", true);
                }, { once: true });
                const mediaSource = context.createMediaElementSource(media);
                mediaSource.connect(analyser);
                media.addEventListener("ended", () => { stop(); status("Playback complete. Press Play to listen again."); }, { once: true });
                await media.play();
                if (token !== generation) return;
            }
            canvas.setAttribute("aria-label", `Live ${$("audio-mode").value} of ${$("audio-source").value === "tone" ? "a generated sine tone" : "a local audio file"}`);
            status(reducedMotion.matches ? "Playing audio. Visualization is static for reduced motion." : "Playing locally. No audio leaves your browser.");
            if (!reducedMotion.matches) draw();
        } catch (error) {
            if (token !== generation) return;
            stop();
            status(error.name === "NotAllowedError" ? "Playback was blocked by the browser. Press Play again or allow audio for this page." : "Audio could not be played. Try a supported audio file or the generated tone.", true);
        }
    });
    $("audio-stop").addEventListener("click", () => { stop(); status("Stopped. Press Play to restart."); });
    const clearFile = () => {
        stop();
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        fileUrl = null; $("audio-file").value = "";
    };
    $("audio-clear").addEventListener("click", () => { clearFile(); status("File cleared from this session."); });
    $("audio-file").addEventListener("change", () => {
        stop();
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        fileUrl = null;
        const file = $("audio-file").files[0];
        if (!file) { status("No file selected."); return; }
        if (file.size === 0 || file.size > 25 * 1024 * 1024) {
            $("audio-file").value = "";
            status("Choose a non-empty audio file no larger than 25 MB.", true); return;
        }
        if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)) {
            $("audio-file").value = "";
            status("This does not appear to be a supported audio file.", true); return;
        }
        fileUrl = URL.createObjectURL(file);
        $("audio-source").value = "file";
        status(`Selected ${file.name}. It remains on your device; press Play to begin.`);
    });
    $("audio-source").addEventListener("change", () => { stop(); status("Source changed. Press Play to begin."); });
    $("tone-frequency").addEventListener("input", () => {
        const frequency = Number($("tone-frequency").value);
        $("tone-value").textContent = `${frequency} Hz`;
        if (oscillator) oscillator.frequency.setTargetAtTime(frequency, context.currentTime, .03);
    });
    $("audio-volume").addEventListener("input", () => {
        const volume = Number($("audio-volume").value);
        $("volume-value").textContent = `${volume}%`;
        if (gain) gain.gain.setTargetAtTime(volume / 100, context.currentTime, .03);
    });
    const updateDrawing = () => {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        if (analyser && !document.hidden && !reducedMotion.matches) draw();
        else drawIdle();
    };
    reducedMotion.addEventListener("change", updateDrawing);
    document.addEventListener("themechange", () => { updateColors(); updateDrawing(); });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) { stop(); status("Playback stopped while this tab was hidden."); }
    });
    drawIdle();
    window.addEventListener("pagehide", clearFile);
    return () => { stop(); status("Playback stopped when leaving the Signal Room."); };
}

const pauseNetwork = initializeNetwork();
const pauseSorting = initializeSorting();
const pauseAudio = initializeAudio();
const pauseCompression = initializeCompression();
initializeCryptoStudio();
const experiments = ["network", "algorithms", "audio", "compression", "crypto"];
let activeExperiment = null;
function showExperiment() {
    const requested = window.location.hash.slice(1);
    const chapter = document.getElementById(requested)?.closest(".experiment")?.id;
    const current = experiments.includes(requested) ? requested : chapter || activeExperiment || "network";
    if (activeExperiment !== current) {
        pauseNetwork(); pauseSorting();
        pauseCompression();
        if (activeExperiment === "audio") pauseAudio();
    }
    activeExperiment = current;
    experiments.forEach(id => { $(id).hidden = id !== current; });
    document.querySelectorAll(".lab-tabs a").forEach(link => {
        if (link.hash === `#${current}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
    });
}
window.addEventListener("hashchange", showExperiment);
window.addEventListener("pagehide", () => { pauseNetwork(); pauseSorting(); });
document.addEventListener("visibilitychange", () => {
    if (document.hidden) { pauseNetwork(); pauseSorting(); pauseCompression(); }
});
showExperiment();
