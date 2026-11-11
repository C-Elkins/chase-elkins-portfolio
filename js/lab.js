import { deviceTypes, officeTopology, networkScenario, isClient, validateLink, sortFrames } from "./lab-model.mjs";
import { protocols, protocolTrace, packetGroups } from "./network-protocols.mjs";
import { guidedLessons, guidedLesson } from "./network-guided.mjs?v=2026-11-10-entries-1";
import { lessonTeaching } from "./network-lessons.mjs?v=2026-11-10-teaching-1";
import { networkIcon } from "./network-icons.mjs?v=2026-11-10-directed-2";
import { initializeNetworkExplorer } from "./network-explorer.js?v=2026-11-11-shared-header-1";
import { layoutScene, sceneDimensions, sceneDevice, sceneLane, sceneBounds, scenePosition, sceneRoute, placeSceneCallout, directScene, placeFlightLabel } from "./network-scene.mjs?v=2026-11-10-workspace-1";
import { createStudioMotion, sceneCommand, studioTiming } from "./network-motion.mjs?v=2026-11-10-teaching-1";
import { initializeCompression } from "./compression.js";
import { initializeCryptoStudio } from "./crypto-studio.js";
import { initializeNetworkingBasics } from "./networking-basics.js?v=2026-11-12-course-102-2";
import { initializeNetworking102 } from "./networking-102.js?v=2026-11-12-course-102-2";
import { appliedCourse } from "./networking-applied.mjs";
import { initializeGuidedCourse } from "./guided-course.js";
import { initializeSubnetSprint } from "./subnet-sprint.js?v=2026-11-13-practice-labs";
import { initializeFirewallBuilder } from "./firewall-builder.js?v=2026-11-13-practice-labs";

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
    let playing = false;
    let packetAnimation = null;
    let trafficState = "ready";
    let trafficFrame = null;
    let cycleDue = 0;
    let cycleDuration = Number($("network-speed").value);
    let remaining = 0;
    let pausedIndex = -1;
    let waitingForArrival = false;
    let activeStep = null;
    let cableMode = false;
    let cableFrom = null;
    let dragging = false;
    let lesson = "dhcp";
    let leaseBefore = null;
    let traceClient = null;
    let mode = "guided";
    let category = "all";
    let fitted = true;
    let followScene = true;
    let playUntil = 0;
    let sandbox = { topology, nextId, selected, source: "1" };
    const motion = createStudioMotion(reducedMotion, cycleDuration);
    let presentedMessage = "";
    let presentedPhase = "";
    let presentedActors = new Set();
    let presentedShot = "";
    let presentedRoute = "";
    let flightFrame = null;
    const boardSize = () => mode === "guided" ? sceneDimensions : { width: 760, height: 440 };
    const deviceSize = () => mode === "guided" ? sceneDevice : { centerX: 57, centerY: 38 };
    const definition = () => mode === "guided" ? guidedLessons[lesson] : protocols[lesson];
    const openingEntry = () => mode === "guided" && stepIndex === 1 ? definition().entry : null;
    const traceComplete = () => !!activeStep && stepIndex === steps.length && trafficState === "processing" && !activeStep.error;
    const sceneShot = () => directScene(topology, steps, stepIndex, {
        follow: mode === "guided" && followScene, fitted,
        delivered: trafficState === "processing" && !activeStep?.error
    });
    const sceneActors = () => sceneShot().actors;
    const address = device => device.address || leases.get(device.id)?.ip || (device.type === "router" ? "192.168.10.1" : device.type === "server" ? "192.168.10.53" : device.type === "internet" ? "203.0.113.10" : deviceTypes[device.type].label);
    const fitDiagram = () => {
        const layout = document.querySelector(".network-layout");
        const layoutTop = document.fullscreenElement ? layout.getBoundingClientRect().top : layout.getBoundingClientRect().top + window.scrollY;
        layout.style.setProperty("--workspace-height", `${Math.max(440, window.innerHeight - layoutTop - 16)}px`);
        if ($("topology-viewport").parentElement.clientWidth === 0) return;
        const { width, height } = boardSize();
        const scroll = $("topology-viewport").parentElement;
        const bounded = getComputedStyle(scroll).getPropertyValue("--bounded-scene").trim() === "1";
        const actors = sceneActors();
        const bounds = topology.devices.filter(device => actors.includes(device.id)).map(sceneBounds);
        const callouts = croppedCallouts();
        callouts.forEach(({ x, y }) => bounds.push({ left: x, top: y, right: x + 248, bottom: y + 78 }));
        const cropped = fitted && mode === "guided";
        const left = cropped ? Math.max(0, Math.min(...bounds.map(b => b.left)) - 24) : 0;
        const top = cropped ? Math.max(0, Math.min(...bounds.map(b => b.top)) - 24) : 0;
        const visibleWidth = cropped ? Math.min(width, Math.max(...bounds.map(b => b.right)) + 24) - left : width;
        const visibleHeight = cropped ? Math.min(height, Math.max(...bounds.map(b => b.bottom)) + 24) - top : height;
        const frameHeight = bounded ? scroll.clientHeight : Math.max(mode === "guided" ? 300 : 0, scroll.clientWidth * height / width);
        const closeup = ["prepare", "local", "complete"].includes(sceneShot().kind);
        const scale = fitted ? Math.min(closeup ? 1.65 : 1.3, (scroll.clientWidth - 2) / visibleWidth, cropped ? (frameHeight - 2) / visibleHeight : Infinity) : 1;
        $("topology-board").style.width = `${width}px`;
        $("topology-board").style.height = `${height}px`;
        $("topology-lines").setAttribute("viewBox", `0 0 ${width} ${height}`);
        const x = cropped ? (scroll.clientWidth - visibleWidth * scale) / 2 - left * scale : 0;
        const y = cropped ? (frameHeight - visibleHeight * scale) / 2 - top * scale : 0;
        const board = $("topology-board");
        const transform = `translate(${x}px, ${y}px) scale(${scale})`;
        if (board.style.transform !== transform) {
            const previous = getComputedStyle(board).transform;
            board.style.transform = transform;
            if (board.classList.contains("camera-follow")) motion.animate("camera", board, [
                { transform: previous }, { transform }
            ], { duration: cameraDuration(), easing: "cubic-bezier(.16,1,.3,1)" });
            followFlightLabel();
        }
        $("topology-board").style.position = cropped ? "absolute" : "relative";
        $("topology-viewport").style.width = `${cropped ? scroll.clientWidth : width * scale}px`;
        $("topology-viewport").style.height = `${cropped ? frameHeight : height * scale}px`;
        scroll.dataset.fitted = String(cropped);
        if (cropped) { scroll.scrollLeft = 0; scroll.scrollTop = 0; }
    };
    const croppedCallouts = () => {
        if (mode === "guided" && followScene && fitted && activeStep && sceneShot().kind !== "exchange") {
            return topology.devices.filter(device => sceneActors().includes(device.id))
                .map(localCallout).filter(Boolean);
        }
        return [];
    };
    const localCallout = node => {
        const scroll = document.querySelector(".topology-scroll");
        const bounded = getComputedStyle(scroll).getPropertyValue("--bounded-scene").trim() === "1";
        const height = bounded ? scroll.clientHeight : Math.max(300, scroll.clientWidth * sceneDimensions.height / sceneDimensions.width);
        const actors = sceneActors();
        return placeSceneCallout({ ...topology, devices: topology.devices.filter(device => actors.includes(device.id)) }, node, {
            preferSide: scroll.clientWidth / height > 1.8
        });
    };
    const timing = () => studioTiming(cycleDuration);
    const syncTimingStyles = () => {
        $("network").style.setProperty("--camera-duration", `${timing().camera}ms`);
        $("network").style.setProperty("--node-pulse-duration", `${timing().receive}ms`);
        $("network").style.setProperty("--packet-travel-duration", `${timing().travel}ms`);
    };
    const cameraDuration = () => timing().camera;
    const hopDuration = () => mode === "guided"
        ? stepIndex === 1 ? timing().opening
            : activeStep.source === activeStep.destination ? timing().local
                : activeStep.edge ? timing().hop : timing().preparation
        : timing().hop;
    const renderLibrary = () => {
        const scroll = $("protocol-picker").scrollTop;
        const focused = document.activeElement?.closest("#protocol-picker button")?.dataset.protocol;
        const query = $("protocol-search").value.trim().toLowerCase();
        const catalog = mode === "guided" ? guidedLessons : protocols;
        const entries = Object.entries(catalog).filter(([id, item]) => {
            const group = item.group || guidedLessons[id].group;
            return (category === "all" || group === category) && `${item.name} ${item.fullName || ""} ${item.title} ${item.description} ${item.transport}`.toLowerCase().includes(query);
        });
        $("protocol-picker").replaceChildren(...entries.map(([kind, item]) => {
            const button = make("button");
            button.type = "button";
            button.dataset.protocol = kind;
            button.setAttribute("aria-pressed", String(kind === lesson));
            button.append(make("strong", item.name), make("span", item.title));
            button.addEventListener("click", () => chooseLesson(kind));
            const wrapper = make("article", undefined, "library-lesson");
            wrapper.append(button);
            return wrapper;
        }));
        $("protocol-empty").hidden = !!entries.length;
        $("protocol-picker").scrollTop = scroll;
        if (focused) $("protocol-picker").querySelector(`button[data-protocol="${focused}"]`)?.focus({ preventScroll: true });
        $("protocol-total").textContent = `${entries.length}/${Object.keys(catalog).length} ${mode === "guided" ? "guided lessons" : "sandbox lessons"}`;
        $("protocol-categories").querySelectorAll("button").forEach(button => {
            const group = button.dataset.category;
            const count = Object.entries(catalog).filter(([id, item]) => group === "all" || (item.group || guidedLessons[id].group) === group).length;
            button.textContent = `${group[0].toUpperCase()}${group.slice(1)} ${count}`;
            button.setAttribute("aria-pressed", String(group === category));
        });
        explorer.decorateLibrary();
    };

    const renderSequence = () => {
        const svg = $("network-sequence");
        const container = $("network-sequence-view");
        const scroll = { left: container.scrollLeft, top: container.scrollTop };
        svg.replaceChildren();
        $("sequence-actors").replaceChildren();
        const groups = packetGroups(steps);
        $("sequence-empty").hidden = !!groups.length;
        svg.hidden = !groups.length;
        if (!groups.length) return;
        const endpoints = [...new Set(groups.flatMap(group => [group.step.source, group.step.destination]))];
        const width = Math.max(640, container.clientWidth, endpoints.length * 185);
        const height = groups.length * 112;
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        const add = (tag, attrs, text) => {
            const element = document.createElementNS(svg.namespaceURI, tag);
            for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
            if (text) element.textContent = text;
            svg.append(element);
            return element;
        };
        const x = endpoint => (endpoints.indexOf(endpoint) + .5) * width / endpoints.length;
        const header = $("sequence-actors");
        header.style.width = `${width}px`;
        header.style.gridTemplateColumns = `repeat(${endpoints.length}, minmax(0, 1fr))`;
        endpoints.forEach(endpoint => {
            const label = make("div", undefined, "sequence-actor");
            label.append(make("strong", endpoint.replace(/ \([^()]*\)$/, "")), make("span", endpoint.match(/\(([^()]*)\)$/)?.[1] || endpoint));
            header.append(label);
            add("line", { x1: x(endpoint), y1: 0, x2: x(endpoint), y2: height, class: "sequence-lifeline" });
        });
        groups.forEach((group, index) => {
            const from = x(group.step.source);
            const to = x(group.step.destination);
            const y = 50 + index * 112;
            const state = stepIndex > group.start ? stepIndex <= group.end ? "current" : "visited" : "future";
            add("rect", { x: 0, y: index * 112, width, height: 112, class: `sequence-row ${state}`, "data-start": group.start, "data-end": group.end });
            add("text", { x: 16, y: y - 28, class: `sequence-label ${state}` }, `${index + 1}. ${group.step.protocol}${group.step.error ? " / failed" : ""}`);
            const line = from === to
                ? add("path", { d: `M${from} ${y - 4}h42v18h-42`, class: `sequence-message ${state}`, "data-family": group.step.family })
                : add("line", { x1: from, y1: y, x2: to, y2: y, class: `sequence-message ${state}`, "data-family": group.step.family });
            line.setAttribute("stroke-dasharray", group.step.error ? "4 4" : "none");
            const direction = to > from ? 1 : -1;
            const endY = from === to ? y + 14 : y;
            add("path", { d: `M${to - direction * 8} ${endY - 5} L${to} ${endY} L${to - direction * 8} ${endY + 5}`, class: `sequence-message ${state}`, "data-family": group.step.family });
            add("text", { x: 16, y: y + 42, class: "sequence-detail" },
                `${group.step.phase} / ${Math.max(0, Math.min(stepIndex, group.end) - group.start)}/${group.end - group.start} local + forwarding steps`);
            if (state === "current") {
                add("rect", { x: 0, y: index * 112 + 109, width, height: 3, class: "sequence-progress" });
            }
        });
        container.scrollLeft = scroll.left;
        container.scrollTop = scroll.top;
        followSequence();
        svg.setAttribute("aria-label", `${definition().name} sequence: ${groups.map(g => `${g.step.protocol}, ${g.step.source} to ${g.step.destination}, ${g.step.summary}`).join(". ")}`);
    };
    const followSequence = () => {
        const container = $("network-sequence-view");
        const current = $("network-sequence").querySelector(".sequence-row.current");
        if (container.hidden || !followScene || !current) return;
        const top = Number(current.getAttribute("y"));
        const bottom = top + Number(current.getAttribute("height"));
        const header = $("sequence-actors").offsetHeight;
        if (top < container.scrollTop) container.scrollTop = top;
        else if (bottom > container.scrollTop + container.clientHeight - header) container.scrollTop = bottom - container.clientHeight + header;
    };
    const renderOverview = () => {
        const item = definition();
        $("protocol-name").textContent = item.name;
        $("protocol-fullname").textContent = item.fullName || guidedLessons[lesson].fullName;
        $("protocol-title").textContent = item.title;
        $("protocol-description").textContent = item.description;
        const teaching = lessonTeaching[lesson];
        $("protocol-intro").textContent = teaching?.intro || item.description;
        $("protocol-fact-grid").querySelectorAll(".lesson-fact").forEach(fact => fact.remove());
        $("protocol-fact-grid").append(...(teaching?.facts || []).map(([label, value]) => {
            const fact = make("div");
            fact.className = "lesson-fact";
            fact.append(make("dt", label), make("dd", value));
            return fact;
        }));
        $("protocol-layer").textContent = item.layer;
        $("protocol-transport").textContent = item.transport;
        $("protocol-note").textContent = item.note;
        $("run-protocol").textContent = `Prepare ${item.name} lesson`;
        $("network-now").textContent = `NOW LEARNING / ${item.name}`;
        const layerNames = ["Physical", "Data link", "Network", "Transport", "Session", "Presentation", "Application"];
        const layerIndex = item.layerIndex || guidedLessons[lesson].layerIndex;
        $("network-layer-name").textContent = layerNames[layerIndex - 1].toUpperCase();
        $("osi-current").textContent = `${item.name}: ${item.layer}. ${item.description}`;
        $("network-layers").replaceChildren(...Array.from({ length: 7 }, (_, index) => {
            const chip = make("button", String(index + 1));
            chip.type = "button";
            chip.className = index + 1 === layerIndex ? "osi-chip layer-current" : "osi-chip";
            chip.dataset.layer = String(index + 1);
            chip.setAttribute("aria-label", `Layer ${index + 1}, ${layerNames[index]}${index + 1 === layerIndex ? ", current lesson focus" : ""}. Open the OSI guide.`);
            chip.setAttribute("aria-describedby", "osi-tooltip");
            return chip;
        }));
        $("network-layers").setAttribute("aria-label", `OSI focus: ${item.layer}. OSI mapping is conceptual; some protocols span layers.`);
        $("protocol-references").replaceChildren(...(item.references || guidedLessons[lesson].references).map(reference => {
            const link = make("a", reference.label);
            link.href = reference.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            return link;
        }));
        $("protocol-phases").replaceChildren(...item.phases.map((phase, index) => {
            const item = make("li");
            const button = make("button");
            button.type = "button";
            button.dataset.phase = phase;
            button.append(make("span", String(index + 1).padStart(2, "0")), make("strong", phase));
            button.addEventListener("click", () => {
                const target = steps.findIndex(step => step.phase === phase);
                if (target < 0) { status("Prepare this lesson first. Phases unavailable on a failed route cannot be selected.", true); return; }
                pause(); seek(target + 1); $("protocol-step-show").click();
            });
            item.append(button);
            return item;
        }));
        explorer.metadata();
        renderLibrary();
    };
    const updateTraceUI = () => {
        $("network-back").disabled = stepIndex === 0;
        $("network-replay").disabled = !steps.length;
        $("network-play").disabled = !steps.length || (stepIndex === steps.length && trafficState === "processing" && !playing && !remaining);
        $("network-step").disabled = !steps.length || stepIndex === steps.length;
        $("network-progress").max = Math.max(1, steps.length);
        $("network-progress").value = stepIndex;
        $("packet-explanation").textContent = activeStep?.summary || "Prepare a lesson, then Play or step through the exchange.";
        $("network").dataset.family = activeStep?.family || "DHCP";
        $("protocol-phases").querySelectorAll("button").forEach(button => {
            const current = button.dataset.phase === activeStep?.phase;
            button.classList.toggle("current", current);
            const indices = steps.flatMap((step, index) => step.phase === button.dataset.phase ? [index] : []);
            const completed = stepIndex - (trafficState === "processing" ? 0 : 1);
            button.classList.toggle("phase-complete", indices.length > 0 && indices.every(index => index < completed));
            if (current) button.setAttribute("aria-current", "step");
            else button.removeAttribute("aria-current");
        });
        $("packet-rows").querySelectorAll("tr").forEach((row, index) => {
            const current = stepIndex > Number(row.dataset.start) && stepIndex <= Number(row.dataset.end);
            row.classList.toggle("packet-current", current);
            row.classList.toggle("packet-visited", stepIndex > Number(row.dataset.end));
            row.hidden = !$("network-show-upcoming").checked && stepIndex <= Number(row.dataset.start);
            const button = row.querySelector("button");
            if (current) button.setAttribute("aria-current", "step");
            else button.removeAttribute("aria-current");
        });
        $("packet-empty").hidden = !!stepIndex || ($("network-show-upcoming").checked && !!steps.length);
        $("packet-empty").textContent = steps.length ? "No messages yet. Press Play or Step to begin the exchange." : "Choose and prepare a lesson to see its messages.";
        renderSequence();
        explorer.update();
        setTrafficState(activeStep ? trafficState : "ready");
    };
    const renderPacketRows = () => {
        const messages = $("network-table-unit").value === "message";
        const entries = messages ? packetGroups(steps) : steps.map((step, index) => ({ step, start: index, end: index + 1 }));
        $("packet-number-heading").textContent = messages ? "No." : "Hop";
        $("packet-route-heading").textContent = messages ? "Diagram route" : "Via device";
        $("packet-table-caption").textContent = `Conceptual ${messages ? "messages; one event may aggregate packets or a local action" : "messages expanded into forwarding hops"}, not captured packets or measured timings. Endpoints identify actors, not every wire-header address. Select a row to inspect.`;
        $("packet-rows").replaceChildren(...entries.map(({ step, start, end }, index) => {
            const row = make("tr");
            row.dataset.family = step.family;
            row.dataset.start = String(start); row.dataset.end = String(end);
            const number = make("td");
            const button = make("button", String(index + 1), "packet-hop");
            button.type = "button";
            button.setAttribute("aria-label", `Inspect ${messages ? "message" : "hop"} ${index + 1}: ${step.family}, ${step.summary}`);
            button.addEventListener("click", () => { pause(); seek(messages ? end : start + 1); explorer.inspectHop(start); });
            number.append(button);
            const route = messages ? steps.slice(start, end).map(hop => topology.devices.find(device => device.id === hop.node)?.name).join(" → ")
                : topology.devices.find(device => device.id === step.node)?.name;
            const info = make("td", undefined, "packet-info");
            info.append(make("span", step.summary, "packet-summary"));
            info.title = `Diagram route: ${route}`;
            const live = make("span", undefined, "packet-live");
            live.append(make("span", "", "packet-live-state"), make("span", "", "packet-live-route"));
            const progress = make("span", undefined, "packet-live-progress");
            progress.setAttribute("aria-hidden", "true");
            info.append(live, progress);
            const endpoint = value => {
                const cell = make("td", value.match(/ \(([^()]+)\)$/)?.[1] || value, "packet-endpoint");
                cell.title = value;
                return cell;
            };
            row.append(number, endpoint(step.source), endpoint(step.destination),
                make("td", step.protocol, "packet-family"), make("td", route, "packet-route"), info);
            return row;
        }));
        const families = [...new Set(entries.map(({ step }) => step.family))];
        $("packet-legend").replaceChildren(...families.map(family => {
            const chip = make("span", family);
            chip.dataset.family = family;
            return chip;
        }));
        explorer.renderMessages();
    };
    const updateLiveProgress = (fraction = 1) => {
        const sequence = $("network-sequence").querySelector(".sequence-row.current");
        if (sequence) {
            const start = Number(sequence.dataset.start), end = Number(sequence.dataset.end);
            $("network-sequence").style.setProperty("--sequence-progress", String(Math.max(0, Math.min(1, (stepIndex - start - 1 + fraction) / (end - start)))));
        }
        const row = $("packet-rows").querySelector(".packet-current");
        if (!row) return;
        const start = Number(row.dataset.start), end = Number(row.dataset.end);
        const progress = (stepIndex - start - 1 + fraction) / (end - start);
        row.style.setProperty("--message-progress", String(Math.max(0, Math.min(1, progress))));
    };
    const followLiveProgress = () => {
        cancelAnimationFrame(trafficFrame);
        const tick = () => {
            if (packetAnimation?.playState !== "running" || trafficState !== "transit") return;
            updateLiveProgress(packetAnimation.effect.getComputedTiming().progress ?? 0);
            trafficFrame = requestAnimationFrame(tick);
        };
        tick();
    };
    const setTrafficState = state => {
        trafficState = state;
        cancelAnimationFrame(trafficFrame);
        const paused = !!remaining && $("network").dataset.playback === "paused";
        const label = paused ? "PAUSED" : state === "transit" ? "IN TRANSIT" : state === "processing" ? "PROCESSING" : "SIMULATION ONLY";
        const name = id => topology.devices.find(device => device.id === id)?.name || "";
        const route = activeStep?.edge?.map(name).join(" → ");
        const location = activeStep ? state === "transit" ? route : `At ${name(activeStep.node)}` : "";
        $("scene-packet-state").textContent = label;
        $("scene-packet-hop").textContent = activeStep ? `${location} · ${stepIndex}/${steps.length} hops` : `${topology.devices.length} actors · ${topology.links.length} links`;
        $("packet-location").textContent = activeStep ? `${label} · ${location}. ${activeStep.source} → ${activeStep.destination}.` : "";
        $("network").dataset.traffic = paused ? "paused" : state;
        $("topology-devices").querySelectorAll(".device").forEach(button => {
            button.classList.toggle("sending", state === "transit" && Number(button.dataset.deviceId) === activeStep?.edge?.[0]);
        });
        $("packet-live-indicator").textContent = activeStep ? paused ? "PAUSED" : playing || state === "transit" ? "LIVE" : "HELD" : "READY";
        $("packet-status").textContent = activeStep
            ? `${activeStep.phase} / ${activeStep.protocol} · ${label} · ${location} · Hop ${stepIndex}/${steps.length}`
            : `${steps.length} hops ready. Play or step through the trace.`;
        $("phase-live-card").hidden = !activeStep;
        if (activeStep) {
            $("phase-live-name").textContent = activeStep.protocol;
            $("phase-live-state").textContent = label;
            $("phase-live-endpoints").textContent = activeStep.source === activeStep.destination
                ? `${activeStep.source} / local operation` : `${activeStep.source} → ${activeStep.destination}`;
            const entry = openingEntry();
            $("phase-live-detail").textContent = entry ? `${entry.heading}: ${entry.text}. ${activeStep.summary}` : activeStep.summary;
            $("phase-live-location").textContent = `${location} · Hop ${stepIndex}/${steps.length}`;
        }
        $("packet-rows").querySelectorAll("tr").forEach(row => {
            const current = row.classList.contains("packet-current");
            const delivered = stepIndex > Number(row.dataset.end) || (current && stepIndex === Number(row.dataset.end) && state === "processing");
            row.classList.toggle("packet-visited", delivered);
            row.dataset.state = current ? paused ? "paused" : state : delivered ? "delivered" : "queued";
            row.querySelector(".packet-live-state").textContent = current ? label : delivered ? "DELIVERED" : "UPCOMING";
            const hop = `${stepIndex - Number(row.dataset.start)}/${Number(row.dataset.end) - Number(row.dataset.start)}`;
            row.querySelector(".packet-live-route").textContent = current ? `${location} · ${hop}` : "";
            if (!current) row.style.setProperty("--message-progress", delivered ? "1" : "0");
        });
        if (state === "transit") {
            updateLiveProgress(packetAnimation?.effect.getComputedTiming().progress ?? 0);
            if (!paused) followLiveProgress();
        } else updateLiveProgress();
        followFlightLabel();
    };

    const status = (message, error = false) => {
        $("network-status").textContent = message;
        $("network-status").classList.toggle("error", error);
    };
    const pause = () => {
        if (playing || packetAnimation?.playState === "running") {
            const travelLeft = packetAnimation?.playState === "running"
                ? Math.max(0, Number(packetAnimation.effect.getComputedTiming().endTime) - (packetAnimation.currentTime || 0)) / packetAnimation.playbackRate : 0;
            remaining = timer !== null ? Math.max(1, cycleDue - performance.now()) : travelLeft + timing().receive;
            pausedIndex = stepIndex;
        }
        clearTimeout(timer);
        timer = null;
        playing = false;
        waitingForArrival = false;
        $("network-play").textContent = "Play";
        $("network").dataset.playback = "paused";
        if (packetAnimation?.playState === "running") packetAnimation.pause();
        if (activeStep) motion.pause();
        else motion.reset();
        $("network").dataset.motionPaused = String(!!activeStep);
        if (activeStep) setTrafficState(trafficState);
    };
    const clearTrace = () => {
        pause();
        motion.reset();
        presentedMessage = "";
        presentedPhase = "";
        presentedActors.clear();
        presentedShot = "";
        presentedRoute = "";
        $("topology-lines").querySelector(".scene-message-route")?.remove();
        cancelAnimationFrame(flightFrame);
        $("scene-flight-label").hidden = true;
        $("scene-result").hidden = true;
        $("scene-command-caret").hidden = true;
        $("network").dataset.motionPaused = "false";
        if ($("protocol-inspector").open) $("protocol-inspector").close();
        steps = [];
        stepIndex = 0;
        pendingLease = null;
        leaseBefore = null;
        traceClient = null;
        activeStep = null;
        remaining = 0;
        pausedIndex = -1;
        $("network-log").replaceChildren();
        $("packet-status").textContent = "Choose an action to prepare a trace.";
        $("network-play").disabled = true;
        $("network-step").disabled = true;
        $("network-stop").disabled = true;
        renderPacketRows();
        updateTraceUI();
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
    const svgElement = (tag, attributes) => {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
        return node;
    };
    const routePath = points => points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
    const updateFlightLabel = () => {
        const label = $("scene-flight-label");
        label.hidden = mode !== "guided" || !activeStep || !["exchange", "overview"].includes(sceneShot().kind) || dragging;
        $("scene-flight-tether").toggleAttribute("hidden", label.hidden);
        if (label.hidden) return;
        const copy = {
            "scene-flight-title": activeStep.protocol,
            "scene-flight-command": sceneCommand(activeStep),
            "scene-flight-state": $("network").dataset.traffic === "paused" ? "PAUSED"
                : trafficState === "transit" ? "IN TRANSIT" : activeStep.edge ? "RECEIVED" : "LOCAL PREPARATION"
        };
        for (const [id, text] of Object.entries(copy)) if ($(id).textContent !== text) $(id).textContent = text;
        const scroll = document.querySelector(".topology-scroll");
        const viewport = scroll.getBoundingClientRect();
        const anchor = $("topology-lines").querySelector(".packet-core")
            || $("topology-devices").querySelector(`[data-device-id="${activeStep.node}"] .scene-icon`);
        if (!anchor || !viewport.width || !viewport.height) return;
        const bounds = anchor.getBoundingClientRect();
        const point = { x: (bounds.left + bounds.right) / 2 - viewport.left, y: (bounds.top + bounds.bottom) / 2 - viewport.top };
        const obstacles = [...$("topology-devices").querySelectorAll(".device:not(.scene-outside)"), document.querySelector(".scene-shot-heading")]
            .map(element => element.getBoundingClientRect())
            .map(rect => ({ left: rect.left - viewport.left - 4, top: rect.top - viewport.top - 4, right: rect.right - viewport.left + 4, bottom: rect.bottom - viewport.top + 4 }));
        const placement = placeFlightLabel(point, viewport, obstacles, label.offsetWidth, label.offsetHeight);
        label.style.transform = `translate(${placement.x + scroll.scrollLeft}px, ${placement.y + scroll.scrollTop}px)`;
        const tether = $("scene-flight-tether");
        tether.removeAttribute("hidden");
        tether.style.transform = `translate(${scroll.scrollLeft}px, ${scroll.scrollTop}px)`;
        tether.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
        const line = tether.firstElementChild;
        line.setAttribute("x1", point.x);
        line.setAttribute("y1", point.y);
        line.setAttribute("x2", Math.max(placement.x, Math.min(placement.x + label.offsetWidth, point.x)));
        line.setAttribute("y2", Math.max(placement.y, Math.min(placement.y + label.offsetHeight, point.y)));
    };
    const followFlightLabel = () => {
        cancelAnimationFrame(flightFrame);
        const tick = () => {
            $("scene-flight-tether").setAttribute("hidden", "");
            updateFlightLabel();
            if (!document.hidden && (packetAnimation?.playState === "running"
                || $("topology-board").getAnimations().some(animation => animation.playState === "running"))) flightFrame = requestAnimationFrame(tick);
        };
        tick();
    };
    const frameSceneActors = (animate = false) => {
        const shot = sceneShot();
        const complete = mode === "guided" && traceComplete();
        $("network").dataset.shot = shot.kind;
        $("network").dataset.sceneComplete = String(complete);
        const headings = {
            overview: ["NETWORK MAP", "Explore the topology"],
            prepare: ["01 / PREPARE", mode === "guided" ? definition().entry.heading : "Prepare the exchange"],
            exchange: ["02 / EXCHANGE", activeStep?.phase],
            local: ["LOCAL / PROCESS", "No packet leaves this device"],
            complete: ["03 / RESULT", "The exchange has arrived"]
        };
        $("scene-shot-number").textContent = headings[shot.kind][0];
        $("scene-shot-label").textContent = headings[shot.kind][1];
        $("topology-devices").querySelectorAll(".device").forEach(button => {
            const id = Number(button.dataset.deviceId);
            const outside = !shot.actors.includes(id);
            button.classList.toggle("scene-outside", outside);
            button.classList.toggle("scene-result-target", complete && id === activeStep.node);
            button.tabIndex = outside ? -1 : 0;
            if (outside) button.setAttribute("aria-hidden", "true");
            else button.removeAttribute("aria-hidden");
            if (animate && activeStep && !outside && !presentedActors.has(id)) motion.animate(`actor-${id}`, button.querySelector(".scene-icon"), [
                { opacity: .35, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }
            ]);
        });
        presentedActors = new Set(shot.actors);
        const key = `${shot.kind}:${activeStep?.phase || ""}`;
        if (animate && key !== presentedShot) motion.enter("shot-heading", document.querySelector(".scene-shot-heading"), 6);
        presentedShot = key;
        $("scene-result").hidden = !complete;
        document.querySelector(".overview-heading .eyebrow").textContent = $("protocol-phase-content").hidden ? "Protocol overview"
            : complete ? "Lesson summary" : "Step details";
        if (complete) {
            $("scene-result-title").textContent = `${definition().name} exchange complete`;
            $("scene-result-detail").textContent = `${packetGroups(steps).length} conceptual messages reached their modeled destinations through ${steps.length} local and forwarding steps. Reset to watch the sequence again.`;
        }
    };
    const presentCallout = (animate = false) => {
        const node = topology.devices.find(device => device.id === activeStep?.node);
        const shot = sceneShot().kind;
        const callout = mode === "guided" && node && !dragging && ["prepare", "local", "complete"].includes(shot)
            ? localCallout(node) : null;
        $("scene-callout").hidden = !callout;
        if (!callout) return;
        $("scene-callout").style.left = `${callout.x}px`;
        $("scene-callout").style.top = `${callout.y}px`;
        const entry = shot === "prepare" ? openingEntry() : null;
        const command = entry?.text || sceneCommand(activeStep);
        $("scene-callout").dataset.kind = entry?.kind || "command";
        $("scene-callout-title").textContent = entry ? `${definition().name} / ${entry.kind === "address" ? "web address" : "prepare"}` : activeStep.protocol;
        $("scene-command-context").textContent = entry?.context || (shot === "complete" ? "Delivered / illustrative result"
            : shot === "local" ? "Local processing / no packet sent" : "Local preparation / no packet sent");
        const message = `${mode}:${lesson}:${activeStep.packetId}`;
        if (animate && presentedMessage !== message) {
            const delay = cameraDuration() * .75;
            motion.animate("callout", $("scene-callout"), [
                { opacity: 0, transform: "translateY(12px) scale(.94)" },
                { opacity: 1, transform: "translateY(0) scale(1)" }
            ], { delay, fill: "backwards" });
            motion.type($("scene-callout-detail"), $("scene-command-caret"), command, delay);
        } else if (presentedMessage !== message || shot === "complete") {
            $("scene-callout-detail").textContent = command;
            $("scene-command-caret").hidden = true;
        }
    };
    const presentMessage = (animate = false) => {
        if (!activeStep) return;
        const message = `${mode}:${lesson}:${activeStep.packetId}`;
        const phase = `${mode}:${lesson}:${activeStep.phase}`;
        if (animate && presentedMessage !== message) {
            motion.enter("message-card", $("phase-live-card"), 12);
            motion.enter("message-name", $("scene-packet-name"), 6);
            motion.enter("flight-title", $("scene-flight-title"), 6);
            const row = $("packet-rows").querySelector(".packet-current");
            if (row) motion.animate("packet-row", row, [{ opacity: .25 }, { opacity: 1 }], { duration: 220 });
        }
        if (animate && presentedPhase !== phase) {
            motion.enter("phase-title", $("protocol-phase-title"), 10);
            motion.enter("phase-tagline", $("protocol-phase-tagline"), 8, 40);
            motion.enter("phase-explain", $("protocol-phase-explain"), 8, 90);
            motion.enter("phase-description", $("protocol-phase-description"), 8, 40);
            motion.enter("phase-messages", $("protocol-phase-messages"), 8, 80);
        }
        presentedMessage = message;
        presentedPhase = phase;
    };
    const revealMessageRoute = (animate = false) => {
        const edges = activeStep && mode === "guided" && sceneShot().kind === "exchange"
            ? steps.filter(step => step.packetId === activeStep.packetId && step.edge).map(step => step.edge) : [];
        const path = edges.map(edge => routePath(sceneRoute(topology, ...edge, sceneLane))).join(" ");
        if (path === presentedRoute) return;
        $("topology-lines").querySelector(".scene-message-route")?.remove();
        presentedRoute = path;
        if (!path) return;
        const line = svgElement("path", { d: path, class: "scene-message-route" });
        $("topology-lines").append(line);
        if (animate) {
            const length = line.getTotalLength();
            motion.animate("route-reveal", line, [
                { strokeDasharray: `${length}`, strokeDashoffset: length },
                { strokeDasharray: `${length}`, strokeDashoffset: 0 }
            ], { duration: timing().route, easing: "cubic-bezier(.16,1,.3,1)" });
        }
    };
    const renderLinks = () => {
        const coords = positions();
        $("topology-lines").replaceChildren();
        presentedRoute = "";
        if (mode === "guided") {
            const defs = svgElement("defs", {});
            for (const state of ["muted", "active"]) {
                const marker = svgElement("marker", { id: `scene-arrow-${state}`, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto", markerUnits: "strokeWidth" });
                marker.append(svgElement("path", { d: "M1 1 9 5 1 9Z", class: `scene-arrow-${state}` }));
                defs.append(marker);
            }
            $("topology-lines").append(defs);
        }
        topology.links.forEach(([a, b]) => {
            const from = coords.get(a);
            const to = coords.get(b);
            const devices = [a, b].map(id => topology.devices.find(d => d.id === id));
            const wireless = devices.some(d => d.type === "ap") && devices.some(d => ["client", "phone"].includes(d.type));
            for (const [start, end] of mode === "guided" ? [[a, b], [b, a]] : [[a, b]]) {
                const line = mode === "guided"
                    ? svgElement("path", { d: routePath(sceneRoute(topology, start, end, sceneLane)), "marker-end": "url(#scene-arrow-muted)" })
                    : svgElement("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y });
                line.dataset.from = start; line.dataset.to = end;
                line.setAttribute("class", `network-link${wireless ? " wireless" : ""}`);
                $("topology-lines").appendChild(line);
            }
        });
    };
    const updateTraffic = (animate = false, frameOnly = false) => {
        if (waitingForArrival && !frameOnly) {
            waitingForArrival = false;
            scheduleTick(timing().receive);
        }
        if (!frameOnly) {
            packetAnimation?.cancel();
            packetAnimation = null;
        }
        const previousShot = $("network").dataset.shot;
        frameSceneActors(animate);
        const actors = sceneActors();
        syncTimingStyles();
        $("topology-board").classList.toggle("camera-follow", mode === "guided" && !!activeStep && !dragging);
        $("topology-devices").querySelectorAll(".device").forEach(button => {
            if (!frameOnly) button.classList.remove("processing");
        });
        $("topology-lines").querySelectorAll(".network-link").forEach(line => {
            const active = !!activeStep?.edge && (mode === "guided"
                ? activeStep.edge[0] === Number(line.dataset.from) && activeStep.edge[1] === Number(line.dataset.to)
                : activeStep.edge.every(id => [Number(line.dataset.from), Number(line.dataset.to)].includes(id)));
            line.classList.toggle("active", active);
            line.classList.toggle("scene-outside", !actors.includes(Number(line.dataset.from)) || !actors.includes(Number(line.dataset.to)));
            if (mode === "guided") line.setAttribute("marker-end", `url(#scene-arrow-${active ? "active" : "muted"})`);
        });
        if (frameOnly) {
            presentCallout();
            revealMessageRoute();
            $("topology-devices").querySelectorAll(".device").forEach(button => {
                const current = Number(button.dataset.deviceId) === selected;
                button.classList.toggle("selected", current);
                button.setAttribute("aria-pressed", String(current));
            });
            fitDiagram();
            followFlightLabel();
            return;
        }
        $("topology-lines").querySelector(".network-packet")?.remove();
        const arrival = () => {
            $("topology-devices").querySelector(`[data-device-id="${activeStep?.node}"]`)?.classList.add("processing");
            setTrafficState("processing");
            updateTraceUI();
            if (mode === "guided" && stepIndex === steps.length && !activeStep.error) {
                frameSceneActors(true);
                presentCallout();
                if (sceneShot().kind === "complete") {
                    $("topology-lines").querySelectorAll(".network-link").forEach(line => line.classList.add("scene-outside"));
                    $("scene-flight-label").hidden = true;
                }
                $("topology-lines").querySelector(".scene-message-route")?.remove();
                presentedRoute = "";
                fitDiagram();
                motion.enter("lesson-result", $("scene-result"), 12);
                if (sceneShot().kind === "complete") {
                    motion.enter("received-caption", $("scene-callout"), 10, cameraDuration() * .6);
                    motion.enter("received-output", $("topology-devices").querySelector(".scene-result-target .scene-screen-output"), 0, cameraDuration() * .65);
                }
            }
            if (stepIndex === steps.length) status(activeStep.error
                ? "Trace ended at the failed step. Change the topology or service settings and try again."
                : "Trace complete. Select another lesson, replay, or inspect a hop.", !!activeStep.error);
        };
        $("scene-packet-name").textContent = activeStep?.protocol || "READY TO EXPLORE";
        $("scene-packet-detail").textContent = activeStep?.summary || "Choose a phase or press Play. Every message stays inside this teaching simulation.";
        $("scene-packet-state").textContent = activeStep ? "AT NODE" : "SIMULATION ONLY";
        $("scene-packet-hop").textContent = activeStep
            ? `At ${topology.devices.find(device => device.id === activeStep.node)?.name} · ${stepIndex}/${steps.length} hops`
            : `${topology.devices.length} actors · ${topology.links.length} links`;
        presentCallout(animate);
        revealMessageRoute(animate);
        presentMessage(animate);
        if (activeStep?.edge && !dragging) {
            const coords = positions();
            const route = mode === "guided" ? sceneRoute(topology, ...activeStep.edge, sceneLane) : activeStep.edge.map(id => coords.get(id));
            const to = route.at(-1);
            const packet = svgElement("g", { class: "network-packet" });
            packet.append(svgElement("circle", { cx: to.x, cy: to.y, r: "16", class: "packet-aura" }),
                svgElement("circle", { cx: to.x, cy: to.y, r: "6", class: "packet-core" }));
            $("topology-lines").appendChild(packet);
            if (animate && !reducedMotion.matches) {
                const current = activeStep;
                const distances = [0];
                for (let index = 1; index < route.length; index++) distances.push(distances.at(-1) + Math.hypot(route[index].x - route[index - 1].x, route[index].y - route[index - 1].y));
                const animation = packet.animate(route.map((point, index) => ({
                    transform: `translate(${point.x - to.x}px, ${point.y - to.y}px)`,
                    offset: distances[index] / distances.at(-1)
                })), {
                    duration: timing().travel,
                    delay: playing && previousShot !== "exchange" && sceneShot().kind === "exchange" ? cameraDuration() * .3 : 0,
                    fill: "backwards", easing: "cubic-bezier(.35,0,.25,1)"
                });
                packetAnimation = animation;
                setTrafficState("transit");
                animation.addEventListener("finish", () => {
                    if (current === activeStep && packetAnimation === animation) {
                        arrival();
                    }
                }, { once: true });
            } else arrival();
        } else if (activeStep) arrival();
        else setTrafficState("ready");
        $("topology-devices").querySelectorAll(".device").forEach(button => {
            const id = Number(button.dataset.deviceId);
            button.classList.toggle("active", activeStep?.node === id);
            button.classList.toggle("selected", selected === id);
            button.classList.toggle("cable-source", cableMode && cableFrom === id);
            button.setAttribute("aria-pressed", String(selected === id));
            const device = topology.devices.find(d => d.id === id);
            button.querySelector(".device-ip").textContent = address(device);
        });
        fitDiagram();
        followFlightLabel();
    };
    const moveDevice = (device, x, y, button) => {
        const point = mode === "guided" ? scenePosition(topology, device.id, x, y)
            : { x: Math.round(Math.max(62, Math.min(698, x))), y: Math.round(Math.max(44, Math.min(396, y))) };
        if (!point) { status("Leave space between actors so their artwork and labels stay readable.", true); return; }
        Object.assign(device, point);
        const size = deviceSize();
        button.style.left = `${device.x - size.centerX}px`;
        button.style.top = `${device.y - size.centerY}px`;
        renderLinks();
        updateTraffic();
    };
    const boardPoint = event => {
        const rect = $("topology-board").getBoundingClientRect();
        const { width, height } = boardSize();
        return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height };
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
        updateTraffic(false, true);
        renderInspector();
    };
    const render = () => {
        $("topology-count").textContent = `${topology.devices.length}${mode === "guided" ? " ACTORS" : "/16 DEVICES"} · ${topology.links.length} LINKS`;
        renderLinks();
        $("topology-devices").replaceChildren(...topology.devices.map(d => {
            const button = make("button", undefined, `device${d.id === selected ? " selected" : ""}${activeStep?.node === d.id ? " active" : ""}`);
            button.type = "button";
            button.dataset.deviceId = String(d.id);
            const size = deviceSize();
            button.style.left = `${d.x - size.centerX}px`;
            button.style.top = `${d.y - size.centerY}px`;
            button.setAttribute("aria-label", `${d.name}. Select to inspect; arrow keys move the device.`);
            button.setAttribute("aria-pressed", String(d.id === selected));
            button.append(
                networkIcon(d.type, true, d),
                make("span", d.name, "device-name"),
                make("span", address(d), "device-ip")
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
                updateTraffic(false, !moved);
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
                firewall: "Filters simulated TCP / web connections. The block setting applies to every firewall on the selected route.",
                server: "Answers demo.test with 203.0.113.10. DNS resolution does not itself grant connectivity.",
                internet: "An external simulated web endpoint, never a real internet request."
            };
            const copy = make("div");
            copy.append(make("strong", device.name), make("p", description[device.type]));
            if (mode === "guided") {
                copy.replaceChildren(make("strong", device.name), make("p", `${address(device)} / Guided actor. Drag or use arrow keys to rearrange; message routes are scripted for this lesson.`));
                inspector.append(copy);
                return;
            }
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
    const seek = index => {
        if (!index) {
            motion.reset();
            presentedMessage = "";
            presentedPhase = "";
            $("scene-command-caret").hidden = true;
        }
        motion.resume();
        $("network").dataset.motionPaused = "false";
        const firstStep = !activeStep;
        remaining = 0;
        pausedIndex = -1;
        stepIndex = Math.max(0, Math.min(steps.length, index));
        activeStep = steps[stepIndex - 1] || null;
        trafficState = "ready";
        if (pendingLease) {
            if (leaseBefore) leases.set(traceClient, leaseBefore);
            else leases.delete(traceClient);
            if (stepIndex === steps.length && !activeStep?.error) leases.set(traceClient, pendingLease.lease);
        }
        $("network-log").replaceChildren(...steps.slice(0, stepIndex).map(step => make("li", step.message, step.error ? "error" : "")));
        $("packet-status").textContent = activeStep ? `${activeStep.protocol} / ${activeStep.phase} · Hop ${stepIndex}/${steps.length}` : `${steps.length} hops ready. Play or step through the trace.`;
        if (steps.length && stepIndex === steps.length) {
            status("Final hop in progress. Waiting for the receiving device.");
        } else status("Inspecting a teaching trace. Playback never sends real traffic.");
        updateTraceUI();
        if (firstStep && activeStep) $("protocol-step-show").click();
        updateTraffic(true);
        if ($("network-follow").checked) {
            $("network-log").scrollTop = $("network-log").scrollHeight;
            const row = [...$("packet-rows").children].find(row => stepIndex > Number(row.dataset.start) && stepIndex <= Number(row.dataset.end));
            if (row) {
                const container = $("packet-table-scroll");
                const bounds = container.getBoundingClientRect();
                const current = row.getBoundingClientRect();
                const header = container.querySelector("thead").getBoundingClientRect().height;
                if (current.height > container.clientHeight - header) container.scrollTop += current.top - bounds.top - header;
                else if (current.bottom > bounds.bottom) container.scrollTop += current.bottom - bounds.bottom;
                else if (current.top < bounds.top + header) container.scrollTop -= bounds.top + header - current.top;
            }
        }
    };
    const boundary = direction => {
        const unit = $("network-step-unit").value;
        if (unit === "hop") return stepIndex + direction;
        const ends = unit === "message" ? packetGroups(steps).map(group => group.end)
            : steps.flatMap((step, index) => index === steps.length - 1 || steps[index + 1].phase !== step.phase ? [index + 1] : []);
        return direction > 0 ? ends.find(end => end > stepIndex) ?? steps.length : ends.filter(end => end < stepIndex).at(-1) ?? 0;
    };
    const next = () => { if (stepIndex < steps.length) seek(stepIndex + 1); };
    const scheduleTick = duration => {
        cycleDue = performance.now() + duration;
        timer = setTimeout(() => {
            timer = null;
            if (!playing) return;
            if (packetAnimation?.playState === "running") {
                const pending = packetAnimation;
                waitingForArrival = true;
                pending.addEventListener("finish", () => {
                    if (waitingForArrival && playing && packetAnimation === pending) {
                        waitingForArrival = false;
                        scheduleTick(timing().receive);
                    }
                }, { once: true });
                return;
            }
            if (stepIndex < playUntil) playTick();
            else {
                playing = false;
                remaining = 0;
                $("network-play").textContent = "Play";
                $("network").dataset.playback = "idle";
                updateTraceUI();
                setTrafficState(trafficState);
            }
        }, duration);
    };
    const playTick = () => {
        cycleDuration = Number($("network-speed").value);
        next();
        const travel = packetAnimation?.playState === "running" ? Number(packetAnimation.effect.getComputedTiming().endTime) : 0;
        scheduleTick(Math.max(hopDuration(), travel + timing().receive));
    };
    const startPlayback = target => {
        motion.resume();
        $("network").dataset.motionPaused = "false";
        playUntil = target;
        playing = true;
        $("network-play").textContent = "Pause";
        $("network").dataset.playback = "playing";
        if (remaining && pausedIndex === stepIndex) {
            if (packetAnimation?.playState === "paused") packetAnimation.play();
            scheduleTick(remaining);
            remaining = 0;
            setTrafficState(trafficState);
        } else playTick();
    };
    const prepare = result => {
        clearTrace();
        updateTraffic();
        if (result.error) { status(result.error, true); return; }
        steps = result.steps;
        traceClient = Number($("source-client").value);
        leaseBefore = leases.get(traceClient) || null;
        if (result.lease) pendingLease = { clientId: traceClient, lease: result.lease };
        $("network-play").disabled = false;
        $("network-step").disabled = false;
        $("network-stop").disabled = false;
        renderPacketRows();
        renderLibrary();
        updateTraceUI();
        $("packet-status").textContent = `${steps.length} hops ready. Play or step through the trace.`;
        status("Trace prepared; the simulation has not sent any real traffic.");
    };
    const runLesson = () => {
        if (mode === "guided") prepare(guidedLesson(lesson));
        else prepare(protocolTrace(lesson, topology, Number($("source-client").value), leases, {
            dhcpEnabled: $("dhcp-on").checked, dnsEnabled: $("dns-on").checked, blockWeb: $("firewall-on").checked
        }));
    };
    const chooseLesson = kind => {
        const fromDrawer = $("protocol-drawer").open;
        if (fromDrawer) $("protocol-drawer").close();
        clearTrace(); lesson = kind;
        if (mode === "guided") {
            const demonstration = guidedLesson(kind);
            topology = layoutScene(demonstration.topology);
            selected = topology.devices[0]?.id ?? null;
            $("scenario-lesson").textContent = "GUIDED / Preconfigured actors. Conceptual messages; no real traffic.";
            refreshControls(); render();
        }
        renderOverview(); updateTraceUI(); updateTraffic();
        if (mode === "guided") runLesson();
        else status(`${definition().name} selected. Prepare the lesson to explore it.`);
        fitDiagram();
        if (fromDrawer) $("network-library").focus({ preventScroll: true });
    };
    $("protocol-search").addEventListener("input", renderLibrary);
    $("protocol-categories").querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
        category = button.dataset.category; renderLibrary();
    }));
    $("run-protocol").addEventListener("click", runLesson);
    $("network-table-unit").addEventListener("change", () => { renderPacketRows(); updateTraceUI(); });
    $("network-show-upcoming").addEventListener("change", updateTraceUI);
    $("run-dhcp").addEventListener("click", () => { chooseLesson("dhcp"); runLesson(); });
    $("run-web").addEventListener("click", () => { chooseLesson("http"); runLesson(); });
    $("network-back").addEventListener("click", () => { pause(); seek(boundary(-1)); });
    $("network-replay").addEventListener("click", () => { pause(); seek(0); });
    const switchMode = () => {
        const nextMode = $("network-mode").value;
        if (nextMode === mode) return;
        if (mode === "sandbox") sandbox = { topology, nextId, selected, source: $("source-client").value };
        clearTrace();
        cableMode = false; cableFrom = null;
        $("network-connect").setAttribute("aria-pressed", "false");
        mode = nextMode;
        $("network").dataset.mode = mode;
        $("network-connect").hidden = mode === "guided" || !$("network-sequence-view").hidden;
        category = "all"; $("protocol-search").value = "";
        $("source-client").disabled = mode === "guided";
        $("network-mode-note").textContent = mode === "guided"
            ? "Guided diagrams are preconfigured conceptual scenarios, not real protocol implementations. No traffic leaves your browser."
            : "Sandbox traces use your cables, source client, and service settings. Finish DHCP before DNS/TCP/HTTP/HTTPS can use that client's lease. No real packets or measured timings.";
        $("network-edit-hint").textContent = mode === "guided"
            ? "Drag or use arrow keys to arrange guided actors. Routes are scripted. Switch to the editable sandbox to build and troubleshoot."
            : "Drag devices, or focus one and use arrow keys. Dashed links are Wi-Fi. Open the builder for devices, cables, scenarios, and service settings.";
        if (mode === "sandbox") {
            ({ topology, nextId, selected } = sandbox);
            refreshControls(); $("source-client").value = sandbox.source;
            render();
            $("scenario-lesson").textContent = "SANDBOX / Your editable topology. Open Build & troubleshoot to add devices and change settings.";
        }
        chooseLesson(Object.hasOwn(protocols, lesson) ? lesson : "dhcp");
        fitDiagram();
    };
    $("network-mode").addEventListener("change", switchMode);
    $("network-focus").addEventListener("click", () => {
        const focused = $("network").classList.toggle("diagram-focus");
        $("network-focus").setAttribute("aria-pressed", String(focused));
        $("network-focus").textContent = focused ? "Show all panels" : "Diagram focus";
        fitDiagram();
    });
    $("network-fit").addEventListener("click", () => {
        fitted = !fitted;
        $("network-fit").setAttribute("aria-pressed", String(fitted));
        $("network-follow-scene").setAttribute("aria-pressed", String(followScene && fitted));
        updateTraffic(false, true);
    });
    $("network-follow-scene").addEventListener("click", () => {
        const sequence = !$("network-sequence-view").hidden;
        followScene = !followScene || (!sequence && !fitted);
        if (followScene && !sequence) fitted = true;
        $("network-fit").setAttribute("aria-pressed", String(fitted));
        $("network-follow-scene").setAttribute("aria-pressed", String(followScene));
        updateTraffic(false, true);
        followSequence();
    });
    $("scene-reset-layout").addEventListener("click", () => {
        if (mode !== "guided") return;
        pause();
        topology = layoutScene(topology);
        render(); fitDiagram();
        status("Scene arrangement reset. The selected lesson and trace position are unchanged.");
    });
    const diagramObserver = new ResizeObserver(() => {
        fitDiagram();
        if (!$("network-sequence-view").hidden) renderSequence();
    });
    diagramObserver.observe($("topology-viewport").parentElement);
    diagramObserver.observe($("network"));
    document.querySelector(".topology-scroll").addEventListener("scroll", updateFlightLabel, { passive: true });
    window.addEventListener("resize", fitDiagram);
    $("network-fullscreen").addEventListener("click", async () => {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if ($("network").requestFullscreen) await $("network").requestFullscreen();
            else status("Full-screen mode is not supported in this browser. Diagram focus is available instead.", true);
        } catch (error) { status(`Full-screen mode failed: ${error.message}`, true); }
    });
    document.addEventListener("fullscreenchange", () => {
        $("network-fullscreen").textContent = document.fullscreenElement === $("network") ? "Exit full screen" : "Full screen";
        fitDiagram();
    });
    for (const view of ["network", "sequence"]) {
        $(`${view}-view`).addEventListener("click", () => {
            $("network-map-view").hidden = view !== "network";
            $("network-sequence-view").hidden = view !== "sequence";
            $("network-view").setAttribute("aria-pressed", String(view === "network"));
            $("sequence-view").setAttribute("aria-pressed", String(view === "sequence"));
            $("network-connect").hidden = view === "sequence" || mode === "guided";
            $("network-fit").hidden = view === "sequence";
            $("scene-reset-layout").hidden = view === "sequence";
            $("network-follow-scene").setAttribute("aria-pressed", String(followScene && (view === "sequence" || fitted)));
            if (view === "network") fitDiagram();
            else { renderSequence(); followSequence(); }
        });
    }
    $("network-step").addEventListener("click", () => {
        pause();
        const target = boundary(1);
        remaining = 0;
        if ($("network-step-unit").value === "hop" || reducedMotion.matches) seek(target);
        else startPlayback(target);
    });
    $("network-play").addEventListener("click", () => {
        if (playing) { pause(); return; }
        startPlayback(steps.length);
    });
    $("network-speed").addEventListener("change", () => {
        const duration = Number($("network-speed").value);
        motion.setPace(duration);
        const ratio = duration / cycleDuration;
        if (playing && timer !== null) {
            const left = Math.max(1, cycleDue - performance.now()) * ratio;
            clearTimeout(timer);
            scheduleTick(left);
        } else if (remaining) remaining *= ratio;
        if (packetAnimation && ["running", "paused"].includes(packetAnimation.playState)) {
            packetAnimation.updatePlaybackRate(packetAnimation.playbackRate / ratio);
        }
        cycleDuration = duration;
        syncTimingStyles();
    });
    $("network-step-unit").addEventListener("change", () => {
        pause();
        const unit = $("network-step-unit").value;
        $("network-step").textContent = `Next ${unit} →`;
        $("network-back").setAttribute("aria-label", `Previous ${unit}`);
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
        if (mode !== "sandbox") { status("Switch to the editable sandbox to add devices.", true); return; }
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
    $("network").dataset.mode = mode;
    $("source-client").disabled = true;
    const explorer = initializeNetworkExplorer({
        motion,
        state: () => ({ topology, steps, stepIndex, lesson, mode, completedIndex: Math.max(0, stepIndex - (trafficState === "processing" ? 0 : 1)) }),
        seek, pause, status,
        openGuided: kind => {
            if (mode !== "guided") { $("network-mode").value = "guided"; switchMode(); }
            category = "all"; $("protocol-search").value = "";
            chooseLesson(kind);
        }
    });
    if (window.matchMedia("(max-width: 1350px)").matches) document.querySelector(".protocol-library").open = false;
    chooseLesson("dhcp");
    reducedMotion.addEventListener("change", () => {
        if (reducedMotion.matches && packetAnimation && ["running", "paused"].includes(packetAnimation.playState)) packetAnimation.finish();
    });
    fitDiagram();
    return () => { pause(); explorer.closeDialogs(); };
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
const pauseSubnetSprint = initializeSubnetSprint();
initializeFirewallBuilder();
const showNetworkingCourse = initializeNetworkingBasics();
const showNetworking102 = initializeNetworking102();
const showAppliedCourse = initializeGuidedCourse({ course: appliedCourse, root: $("applied-networking") });
const experiments = ["learn", "learn102", "applied-networking", "network", "algorithms", "audio", "compression", "crypto", "subnet", "firewall"];
let courseReturn = null;
document.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("#applied-networking [data-studio-lesson]")) courseReturn = window.location.hash;
}, true);
$("applied-studio-return").addEventListener("click", () => { window.location.hash = courseReturn || "#applied-networking"; });
const labSwitcher = $("lab-switcher");
const labSearch = $("lab-library-search");
const labLinks = [...document.querySelectorAll(".lab-library a")];
function positionLabLibrary() {
    if (!labSwitcher.open) return;
    const bounds = labSwitcher.closest("nav").getBoundingClientRect();
    const below = Math.max(0, innerHeight - bounds.bottom - 12);
    const above = Math.max(0, bounds.top - 12);
    $("lab-library").classList.toggle("opens-up", above > below);
    $("lab-library").style.setProperty("--lab-library-space", `${Math.max(above, below)}px`);
}
function filterLabLibrary() {
    const query = labSearch.value.trim().toLowerCase();
    let matches = 0;
    document.querySelectorAll(".lab-library-group").forEach(group => {
        const links = [...group.querySelectorAll("a")];
        const category = `${group.dataset.kind} ${group.querySelector("h2").textContent}`;
        links.forEach(link => {
            link.hidden = !`${category} ${link.textContent}`.toLowerCase().includes(query);
            if (!link.hidden) matches++;
        });
        group.hidden = links.every(link => link.hidden);
    });
    $("lab-library-status").hidden = !query;
    $("lab-library-status").textContent = matches ? `${matches} matching ${matches === 1 ? "destination" : "destinations"}.` : "No matches. Try networking, subnet, firewall or encryption.";
}
function closeLabLibrary() {
    if (!labSwitcher.open) return;
    const restoreFocus = labSwitcher.contains(document.activeElement);
    labSwitcher.open = false;
    if (restoreFocus) labSwitcher.querySelector("summary").focus({ preventScroll: true });
}
labSearch.addEventListener("input", filterLabLibrary);
labSwitcher.addEventListener("toggle", () => {
    if (labSwitcher.open) positionLabLibrary();
    else {
        labSearch.value = "";
        filterLabLibrary();
    }
});
window.addEventListener("resize", positionLabLibrary);
window.addEventListener("scroll", positionLabLibrary, { passive: true });
labLinks.forEach(link => link.addEventListener("click", closeLabLibrary));
document.addEventListener("pointerdown", event => {
    if (!labSwitcher.contains(event.target)) closeLabLibrary();
});
labSwitcher.addEventListener("keydown", event => {
    if (event.key === "Escape" && labSwitcher.open) {
        event.preventDefault();
        event.stopPropagation();
        closeLabLibrary();
    }
});
labSwitcher.addEventListener("focusout", event => {
    if (event.relatedTarget && !labSwitcher.contains(event.relatedTarget)) closeLabLibrary();
});
let activeExperiment = null;
function showExperiment() {
    const requested = window.location.hash.slice(1);
    const chapter = document.getElementById(requested)?.closest(".experiment")?.id;
    const current = requested.startsWith("applied-") ? "applied-networking" : experiments.includes(requested) ? requested : chapter || activeExperiment || "network";
    const switched = activeExperiment !== current;
    if (switched) {
        pauseNetwork(); pauseSorting();
        pauseCompression();
        pauseSubnetSprint();
        if (activeExperiment === "audio") pauseAudio();
        if (activeExperiment === "applied-networking") showAppliedCourse.pause();
    }
    activeExperiment = current;
    if (current !== "network") courseReturn = null;
    $("applied-studio-return").hidden = current !== "network" || !courseReturn;
    document.body.classList.toggle("lab-compact", document.body.dataset.networkCompact !== "false");
    document.body.classList.toggle("network-app", current === "network" && document.body.dataset.networkCompact !== "false");
    experiments.forEach(id => { $(id).hidden = id !== current; });
    labLinks.forEach(link => {
        if (link.hash === `#${current}`) {
            link.setAttribute("aria-current", "location");
            const title = link.textContent.split(" / ")[1];
            $("lab-section-title").textContent = ` / ${title.toUpperCase()}`;
            $("lab-current-title").textContent = title;
            $("lab-current-kind").textContent = link.closest(".lab-library-group").dataset.kind;
        }
        else link.removeAttribute("aria-current");
    });
    closeLabLibrary();
    if (current === "learn") showNetworkingCourse(requested);
    else if (current === "learn102") showNetworking102(requested);
    else if (current === "applied-networking") showAppliedCourse(requested);
    else if (switched && chapter && requested !== current) document.getElementById(requested).scrollIntoView();
}
window.addEventListener("hashchange", showExperiment);
window.addEventListener("pagehide", () => { pauseNetwork(); pauseSorting(); pauseSubnetSprint(); showAppliedCourse.pause(); });
document.addEventListener("visibilitychange", () => {
    if (document.hidden) { pauseNetwork(); pauseSorting(); pauseCompression(); pauseSubnetSprint(); showAppliedCourse.pause(); }
});
showExperiment();
