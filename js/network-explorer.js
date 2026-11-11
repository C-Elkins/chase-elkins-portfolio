import { guidedLessons, guidedLesson } from "./network-guided.mjs";
import { protocolFacts } from "./network-facts.mjs";
import { lessonTeaching, lessonPhaseTeaching } from "./network-lessons.mjs?v=2026-11-10-teaching-1";
import { packetGroups } from "./network-protocols.mjs";
import { packetExample } from "./network-packets.mjs";
import { osiLayers } from "./networking-basics-model.mjs";

const $ = id => document.getElementById(id);
const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

export function initializeNetworkExplorer({ state, seek, pause, openGuided, status, motion }) {
    const explored = new Map();
    const totals = new Map(Object.keys(guidedLessons).map(id => [id, packetGroups(guidedLesson(id).steps).length]));
    const dialogs = ["protocol-drawer", "protocol-command", "protocol-shortcuts", "protocol-inspector", "protocol-osi"].map($);
    const library = document.querySelector(".protocol-library");
    let inspected = 0;
    let results = [];
    let resultIndex = 0;
    let wire = null;
    let expandedPhases = true;
    let phaseKey = "";
    const closeDialogs = () => dialogs.forEach(dialog => { if (dialog.open) dialog.close(); });
    const open = id => {
        pause();
        closeDialogs();
        document.querySelector(".studio-settings").open = false;
        $(id).showModal();
    };
    document.addEventListener("pointerdown", event => {
        if (event.target instanceof Element && !event.target.closest(".studio-settings")) document.querySelector(".studio-settings").open = false;
    });
    document.querySelector(".studio-settings-menu").addEventListener("click", event => {
        if (!(event.target instanceof Element) || !event.target.closest("button")) return;
        const settings = event.currentTarget.closest(".studio-settings");
        settings.open = false;
        if (settings.contains(document.activeElement)) settings.querySelector("summary").focus();
    });
    dialogs.forEach(dialog => {
        dialog.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", event => { if (event.target === dialog) {
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        } });
    });
    $("network-library").addEventListener("click", () => {
        open("protocol-drawer");
        library.open = true;
        $("protocol-drawer-content").append(library);
        $("protocol-search").focus({ preventScroll: true });
    });
    $("protocol-drawer").addEventListener("close", () => {
        if (!$("protocol-drawer").open) $("protocol-library-home").after(library);
    });
    $("network-shortcuts").addEventListener("click", () => open("protocol-shortcuts"));
    const highlightOsi = layer => {
        $("osi-guide-list").querySelectorAll("li").forEach((item, index) => item.classList.toggle("osi-guide-active", index + 1 === layer));
    };
    $("network-osi-guide").addEventListener("click", () => {
        highlightOsi(Number($("network-layers").querySelector(".layer-current")?.dataset.layer));
        open("protocol-osi");
    });
    const tooltip = $("osi-tooltip");
    document.body.append(tooltip);
    let tooltipChip = null;
    let tooltipTimer = 0;
    const hideTooltip = () => {
        clearTimeout(tooltipTimer);
        tooltipChip = null;
        tooltip.hidden = true;
        tooltip.classList.remove("is-visible");
    };
    const showTooltip = chip => {
        clearTimeout(tooltipTimer);
        const layer = Number(chip.dataset.layer);
        const info = osiLayers[layer - 1];
        if (!info) return;
        tooltipChip = chip;
        tooltip.querySelector(".osi-tooltip-layer").textContent = `LAYER ${layer}`;
        tooltip.querySelector(".osi-tooltip-name").textContent = info.name;
        tooltip.querySelector(".osi-tooltip-summary").textContent = info.summary;
        tooltip.querySelector(".osi-tooltip-examples").textContent = info.examples;
        tooltip.querySelector(".osi-tooltip-focus").hidden = !chip.classList.contains("layer-current");
        tooltip.hidden = false;
        const chipBox = chip.getBoundingClientRect();
        const box = tooltip.getBoundingClientRect();
        const gap = 10;
        const left = Math.min(window.innerWidth - box.width - 8, Math.max(8, chipBox.left + chipBox.width / 2 - box.width / 2));
        const below = chipBox.bottom + gap + box.height <= window.innerHeight - 8;
        const top = below ? chipBox.bottom + gap : Math.max(8, chipBox.top - gap - box.height);
        tooltip.style.left = `${Math.round(left)}px`;
        tooltip.style.top = `${Math.round(top)}px`;
        tooltip.style.setProperty("--arrow-x", `${Math.round(chipBox.left + chipBox.width / 2 - left)}px`);
        tooltip.dataset.side = below ? "below" : "above";
        requestAnimationFrame(() => { if (tooltipChip === chip) tooltip.classList.add("is-visible"); });
    };
    const layers = $("network-layers");
    layers.addEventListener("pointerover", event => {
        const chip = event.target instanceof Element ? event.target.closest(".osi-chip") : null;
        if (!chip || chip === tooltipChip) return;
        clearTimeout(tooltipTimer);
        tooltipTimer = setTimeout(() => showTooltip(chip), tooltipChip ? 0 : 90);
    });
    layers.addEventListener("pointerleave", hideTooltip);
    layers.addEventListener("focusin", event => { if (event.target.closest?.(".osi-chip")) showTooltip(event.target.closest(".osi-chip")); });
    layers.addEventListener("focusout", event => { if (!layers.contains(event.relatedTarget)) hideTooltip(); });
    layers.addEventListener("click", event => {
        const chip = event.target instanceof Element ? event.target.closest(".osi-chip") : null;
        if (!chip) return;
        hideTooltip();
        highlightOsi(Number(chip.dataset.layer));
        open("protocol-osi");
    });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && !tooltip.hidden) hideTooltip(); }, true);
    window.addEventListener("scroll", hideTooltip, { passive: true });
    window.addEventListener("resize", hideTooltip);
    document.addEventListener("click", event => {
        const link = event.target instanceof Element ? event.target.closest("[data-studio-lesson]") : null;
        if (!link || !guidedLessons[link.dataset.studioLesson]) return;
        event.preventDefault();
        if (window.location.hash !== "#network") {
            history.pushState(null, "", "#network");
            window.dispatchEvent(new HashChangeEvent("hashchange"));
        }
        window.scrollTo({ top: 0 });
        openGuided(link.dataset.studioLesson);
        $("network-now").focus({ preventScroll: true });
    });
    for (const view of ["overview", "step"]) {
        $(`protocol-${view}-show`).addEventListener("click", () => {
            const content = $(view === "overview" ? "protocol-overview-content" : "protocol-phase-content");
            const changed = content.hidden;
            $("protocol-overview-content").hidden = view !== "overview";
            $("protocol-phase-content").hidden = view !== "step";
            document.querySelector(".overview-heading .eyebrow").textContent = view === "overview" ? "Protocol overview"
                : $("network").dataset.sceneComplete === "true" ? "Lesson summary" : "Step details";
            $("protocol-overview-show").setAttribute("aria-pressed", String(view === "overview"));
            $("protocol-step-show").setAttribute("aria-pressed", String(view === "step"));
            document.querySelector(".protocol-overview").scrollTop = 0;
            if (changed) motion.enter("field-guide", content, 12);
        });
    }
    $("network-compact").addEventListener("click", () => {
        const compact = document.body.dataset.networkCompact === "false";
        document.body.dataset.networkCompact = String(compact);
        document.body.classList.toggle("lab-compact", compact);
        document.body.classList.toggle("network-app", compact);
        $("network-compact").setAttribute("aria-pressed", String(compact));
        $("network-compact").textContent = compact ? "Show lab introduction" : "Compact workspace";
    });
    const resultSelection = () => {
        [...$("command-results").children].forEach((option, index) => option.setAttribute("aria-selected", String(index === resultIndex)));
        const current = $("command-results").children[resultIndex];
        if (current) {
            $("command-query").setAttribute("aria-activedescendant", current.id);
            const container = $("command-results");
            if (current.offsetTop < container.scrollTop) container.scrollTop = current.offsetTop;
            else if (current.offsetTop + current.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = current.offsetTop + current.offsetHeight - container.clientHeight;
        } else $("command-query").removeAttribute("aria-activedescendant");
    };
    const activate = index => {
        const result = results[index];
        if (!result) return;
        $("protocol-command").close();
        openGuided(result.id);
        if (result.phase) {
            const target = state().steps.findIndex(step => step.phase === result.phase);
            if (target >= 0) seek(target + 1);
        }
        $("network-command").focus({ preventScroll: true });
    };
    const search = () => {
        const query = $("command-query").value.trim().toLowerCase();
        results = Object.entries(guidedLessons).flatMap(([id, lesson]) => {
            const facts = protocolFacts[id];
            const teaching = lessonTeaching[id];
            const heading = `${lesson.name} ${lesson.fullName} ${lesson.title} ${lesson.description} ${teaching.intro} ${teaching.facts.flat().join(" ")} ${facts.ports} ${facts.operations}`.toLowerCase();
            const matches = !query || heading.includes(query);
            return [
                ...(matches ? [{ id, title: lesson.name, detail: lesson.title }] : []),
                ...lesson.phases.filter(phase => query && `${lesson.name} ${phase} ${teaching.phases[phase][0]}`.toLowerCase().includes(query))
                    .map(phase => ({ id, phase, title: `${lesson.name} / ${phase}`, detail: `Jump to phase · ${teaching.phases[phase][0]}` }))
            ];
        });
        resultIndex = 0;
        $("command-results").replaceChildren(...results.map((result, index) => {
            const option = make("div");
            option.id = `protocol-result-${index}`;
            option.setAttribute("role", "option");
            option.append(make("strong", result.title), make("span", result.detail));
            option.addEventListener("click", () => activate(index));
            return option;
        }));
        $("command-count").textContent = results.length ? `${results.length} matching protocols and phases` : "No results. Try a protocol, port, or lesson phase.";
        resultSelection();
    };
    $("network-command").addEventListener("click", () => {
        open("protocol-command");
        $("command-query").value = "";
        search();
        $("command-query").focus({ preventScroll: true });
    });
    $("command-query").addEventListener("input", search);
    $("command-query").addEventListener("keydown", event => {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            if (results.length) resultIndex = (resultIndex + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
            resultSelection();
        } else if (event.key === "Enter") { event.preventDefault(); activate(resultIndex); }
    });
    const phaseButtons = () => document.querySelectorAll("#protocol-phases [data-phase], #protocol-picker [data-phase]");
    const update = () => {
        const { mode, lesson, steps, stepIndex, completedIndex } = state();
        const groups = packetGroups(steps);
        const active = steps[stepIndex - 1];
        $("protocol-step-show").disabled = !active;
        if (!active && !$("protocol-phase-content").hidden) $("protocol-overview-show").click();
        const nextPhaseKey = `${mode}:${lesson}:${active?.phase}:${steps.length}`;
        if (phaseKey !== nextPhaseKey) {
            phaseKey = nextPhaseKey;
            $("protocol-phase-title").textContent = active?.phase || "Select a phase";
            const [tagline, explanation] = (mode === "guided" && active && lessonPhaseTeaching(lesson, active.phase)) || ["", ""];
            $("protocol-phase-tagline").textContent = tagline;
            $("protocol-phase-tagline").hidden = !tagline;
            $("protocol-phase-explain").textContent = explanation;
            $("protocol-phase-explain").hidden = !explanation;
            const phases = [...new Set(steps.map(step => step.phase))];
            const phaseGroups = groups.filter(group => group.step.phase === active?.phase);
            const phaseHops = steps.filter(step => step.phase === active?.phase).length;
            $("protocol-phase-count").textContent = active ? `STEP ${phases.indexOf(active.phase) + 1} OF ${phases.length}` : "";
            $("protocol-phase-description").textContent = active
                ? `${phaseGroups.length} conceptual message${phaseGroups.length === 1 ? "" : "s"} · ${phaseHops} local and forwarding step${phaseHops === 1 ? "" : "s"}.`
                : "";
            $("protocol-phase-messages").replaceChildren(...groups.flatMap((group, index) => {
                if (!active || group.step.phase !== active.phase) return [];
                const li = make("li");
                const button = make("button");
                button.type = "button";
                button.dataset.message = group.id;
                button.append(make("strong", group.step.protocol), make("span", group.step.summary));
                button.addEventListener("click", () => inspect(index));
                li.append(button); return [li];
            }));
        }
        $("protocol-phase-messages").querySelectorAll("button").forEach(button => {
            if (button.dataset.message === active?.packetId) button.setAttribute("aria-current", "step");
            else button.removeAttribute("aria-current");
        });
        if (mode === "guided" && stepIndex > 0) {
            const group = groups.find(item => item.end === completedIndex);
            if (group) {
                if (!explored.has(lesson)) explored.set(lesson, new Set());
                explored.get(lesson).add(group.id);
            }
        }
        const complete = [...explored].filter(([id, messages]) => messages.size >= totals.get(id)).length;
        $("course-progress").value = complete;
        $("course-status").textContent = `${complete} / 39 guided lessons fully explored · this visit only, not a knowledge score`;
        $("protocol-picker").querySelectorAll("[data-protocol]").forEach(button => {
            const count = explored.get(button.dataset.protocol)?.size || 0;
            const done = count >= totals.get(button.dataset.protocol);
            button.dataset.progress = done ? "complete" : count ? "started" : "new";
            button.querySelector(".lesson-progress").textContent = done ? "Explored" : count ? `${count}/${totals.get(button.dataset.protocol)} messages` : "Not explored";
        });
        phaseButtons().forEach(button => {
            const indices = steps.flatMap((step, index) => step.phase === button.dataset.phase ? [index] : []);
            const current = steps[stepIndex - 1]?.phase === button.dataset.phase;
            button.classList.toggle("current", current);
            button.classList.toggle("phase-complete", indices.length > 0 && indices.every(index => index < completedIndex));
            if (current) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
        });
        $("network-inspect").disabled = !steps.length;
        $("message-flow").querySelectorAll("button").forEach((button, index) => {
            const group = groups[index];
            const current = stepIndex > group.start && stepIndex <= group.end;
            button.classList.toggle("current", current);
            button.classList.toggle("message-complete", completedIndex >= group.end);
            if (current) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
        });
    };
    const decorateLibrary = () => {
        const { mode, lesson, steps } = state();
        $("protocol-picker").querySelectorAll("[data-protocol]").forEach(button => {
            button.append(make("small", "", "lesson-progress"));
            if (button.dataset.protocol !== lesson) return;
            const wrapper = button.parentElement;
            const toggle = make("button", expandedPhases ? "Hide lesson phases" : "Show lesson phases", "library-phase-toggle");
            toggle.type = "button";
            toggle.setAttribute("aria-expanded", String(expandedPhases));
            toggle.setAttribute("aria-controls", "library-active-phases");
            const list = make("ol", undefined, "library-phases");
            list.id = "library-active-phases";
            list.hidden = !expandedPhases;
            const phases = [...document.querySelectorAll("#protocol-phases [data-phase]")].map(item => item.dataset.phase);
            const names = mode === "guided" ? guidedLessons[lesson].phases : phases;
            list.append(...names.map((phase, index) => {
                const li = make("li");
                const control = make("button");
                control.type = "button";
                control.dataset.phase = phase;
                const copy = make("span", phase, "phase-step-copy");
                const count = new Set(steps.filter(step => step.phase === phase).map(step => step.packetId)).size;
                const tagline = mode === "guided" ? lessonPhaseTeaching(lesson, phase)?.[0] : "";
                const detail = make("small", tagline || `${count} message${count === 1 ? "" : "s"}`, "phase-step-count");
                if (tagline) {
                    const total = make("span", ` · ${count} message${count === 1 ? "" : "s"}`, "sr-only");
                    detail.append(total);
                }
                copy.append(detail);
                control.append(make("span", String(index + 1).padStart(2, "0"), "phase-step-number"), copy);
                control.disabled = !steps.some(step => step.phase === phase);
                control.addEventListener("click", () => {
                    pause();
                    seek(state().steps.findIndex(step => step.phase === phase) + 1);
                    $("protocol-step-show").click();
                    if ($("protocol-drawer").open) $("protocol-drawer").close();
                    $("network-library").focus({ preventScroll: true });
                });
                li.append(control); return li;
            }));
            toggle.addEventListener("click", () => {
                expandedPhases = !expandedPhases;
                list.hidden = !expandedPhases;
                toggle.setAttribute("aria-expanded", String(expandedPhases));
                toggle.textContent = expandedPhases ? "Hide lesson phases" : "Show lesson phases";
            });
            wrapper.append(toggle, list);
        });
        update();
    };
    $("course-reset").addEventListener("click", () => {
        explored.clear();
        // Only guided endpoints contribute progress. Never rewind a sandbox DHCP
        // trace here: that could remove a lease the user has just completed.
        pause();
        if (state().mode === "guided") seek(0);
        update();
        status("Visit progress reset. Nothing was saved to browser storage.");
    });
    const metadata = () => {
        const facts = protocolFacts[state().lesson];
        $("protocol-ports").textContent = facts.ports;
        $("protocol-format").textContent = facts.format;
        $("protocol-operations").textContent = facts.operations;
        $("protocol-overview-show").click();
    };
    const renderMessages = () => {
        const { steps } = state();
        $("message-flow").replaceChildren(...packetGroups(steps).map((group, index) => {
            const button = make("button", `${index + 1} / ${group.step.protocol}`);
            button.type = "button";
            button.dataset.family = group.step.family;
            button.setAttribute("aria-label", `Inspect message ${index + 1}: ${group.step.protocol}`);
            button.addEventListener("click", () => inspect(index));
            return button;
        }));
    };
    const highlight = field => {
        $("wire-bytes").querySelectorAll("[data-byte]").forEach(span => {
            const index = Number(span.dataset.byte);
            span.classList.toggle("byte-selected", index >= field.start && index < field.start + field.length);
        });
        $("wire-selection").textContent = `${field.label}: byte offsets ${field.start}–${field.start + field.length - 1}. ${field.value}`;
    };
    const renderInspector = () => {
        const { steps, topology, lesson } = state();
        const groups = packetGroups(steps);
        if (!groups.length) { $("protocol-inspector").close(); return; }
        inspected = Math.max(0, Math.min(groups.length - 1, inspected));
        const group = groups[inspected];
        const step = group.step;
        $("inspector-count").textContent = `${guidedLessons[lesson].name} / MESSAGE ${inspected + 1} OF ${groups.length}`;
        $("inspector-title").textContent = step.protocol;
        $("inspector-route").textContent = `${step.source} → ${step.destination}`;
        $("inspector-summary").textContent = step.summary;
        const route = steps.slice(group.start, group.end).map(hop => topology.devices.find(device => device.id === hop.node)?.name).filter(Boolean);
        const fields = [
            ["Lesson phase", step.phase], ["Message family", step.family],
            ["Route through this diagram", route.join(" → ")],
            ["What this represents", step.source === step.destination ? "A local state transition, not necessarily a network packet." : `${group.end - group.start} scripted forwarding hops. One event can summarize multiple real packets.`],
            ["Outcome", step.error ? "Stopped or blocked; inspect the explanation." : "Scripted teaching event; not evidence of real connectivity."],
            ["Timing and size", "Not measured. Playback speed is a teaching control, not network latency."]
        ];
        $("inspector-fields").replaceChildren(...fields.map(([label, value]) => {
            const div = make("div"); div.append(make("dt", label), make("dd", value)); return div;
        }));
        $("inspect-previous").disabled = inspected === 0;
        $("inspect-next").disabled = inspected === groups.length - 1;
        wire = packetExample(step);
        $("inspector-wire").hidden = !wire;
        $("inspector-unavailable").hidden = !!wire;
        $("wire-fields").replaceChildren(); $("wire-bytes").replaceChildren();
        if (!wire) {
            $("inspector-unavailable").textContent = "No byte dump is fabricated for this conceptual event. It may aggregate records, contain encrypted/random values, or describe a local action. Decoded synthetic examples are available for DHCP DORA, DNS query/answer, TCP handshakes, HTTP GET/200, and ICMP Echo messages; these are not captures of this diagram.";
            return;
        }
        $("wire-note").textContent = wire.note;
        $("wire-selection").textContent = "Choose a decoded field to highlight its bytes.";
        $("wire-fields").append(...wire.sections.map(section => {
            const details = make("details");
            details.open = true;
            details.append(make("summary", `${section.name} / ${section.length} bytes`));
            section.fields.forEach(field => {
                const button = make("button");
                button.type = "button";
                button.append(make("strong", field.label), make("span", field.value));
                button.addEventListener("click", () => highlight(field));
                details.append(button);
            });
            return details;
        }));
        for (let start = 0; start < wire.bytes.length; start += 16) {
            const row = make("span", undefined, "hex-row");
            row.append(make("span", start.toString(16).padStart(4, "0"), "hex-offset"));
            const bytes = wire.bytes.slice(start, start + 16);
            bytes.forEach((value, index) => {
                const byte = make("span", value.toString(16).padStart(2, "0"));
                byte.dataset.byte = String(start + index);
                row.append(byte);
            });
            const ascii = Array.from(bytes, value => value >= 32 && value <= 126 ? String.fromCharCode(value) : ".").join("");
            row.append(make("span", ascii, "hex-ascii"));
            $("wire-bytes").append(row);
        }
    };
    const inspect = index => {
        inspected = index;
        const group = packetGroups(state().steps)[index];
        if (!group) return;
        pause(); seek(group.end);
        renderInspector();
        if (!$("protocol-inspector").open) open("protocol-inspector");
    };
    $("network-inspect").addEventListener("click", () => {
        const { steps, stepIndex } = state();
        inspect(Math.max(0, packetGroups(steps).findIndex(group => stepIndex > group.start && stepIndex <= group.end)));
    });
    const inspectHop = index => {
        inspected = packetGroups(state().steps).findIndex(group => index >= group.start && index < group.end);
        renderInspector();
        open("protocol-inspector");
    };
    $("inspect-previous").addEventListener("click", () => inspect(inspected - 1));
    $("inspect-next").addEventListener("click", () => inspect(inspected + 1));
    const changeProtocol = delta => {
        const ids = Object.keys(guidedLessons);
        openGuided(ids[(ids.indexOf(state().lesson) + delta + ids.length) % ids.length]);
    };
    const changePace = delta => {
        const select = $("network-speed");
        select.selectedIndex = Math.max(0, Math.min(select.options.length - 1, select.selectedIndex + delta));
        select.dispatchEvent(new Event("change"));
    };
    document.addEventListener("keydown", event => {
        if ($("network").hidden || event.defaultPrevented || event.isComposing || event.repeat) return;
        const target = event.target instanceof Element ? event.target : document.activeElement;
        const typing = target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
        const key = event.key.toLowerCase();
        const modal = dialogs.find(dialog => dialog.open);
        if (modal) {
            if (modal === $("protocol-inspector") && !typing && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault();
                $(event.key === "ArrowLeft" ? "inspect-previous" : "inspect-next").click();
            }
            return;
        }
        if ((event.metaKey || event.ctrlKey) && key === "k") {
            event.preventDefault(); $("network-command").click(); return;
        }
        if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
        if (key === " " && target?.closest("button, a, summary")) return;
        if (event.key === "Escape") {
            const settings = document.querySelector(".studio-settings");
            if (settings.open) { settings.open = false; settings.querySelector("summary").focus({ preventScroll: true }); return; }
            if ($("network").classList.contains("diagram-focus")) $("network-focus").click();
            return;
        }
        if (document.querySelector(".studio-settings").open) return;
        const actions = {
            " ": () => $("network-play").click(),
            arrowright: () => $("network-step").click(), arrowleft: () => $("network-back").click(),
            r: () => $("network-replay").click(),
            s: () => { const select = $("network-step-unit"); select.selectedIndex = (select.selectedIndex + 1) % select.options.length; select.dispatchEvent(new Event("change")); },
            v: () => $($("network-sequence-view").hidden ? "sequence-view" : "network-view").click(),
            d: () => $("network-focus").click(), l: () => $("network-library").click(),
            f: () => $("network-fullscreen").click(), t: () => document.querySelector(".lab-header [data-theme-toggle]").click(),
            n: () => changeProtocol(1), p: () => changeProtocol(-1),
            "/": () => $("network-command").click(), "?": () => $("network-shortcuts").click(),
            i: () => $("network-inspect").click(), "[": () => changePace(-1), "]": () => changePace(1)
        };
        if (/^[1-9]$/.test(key)) {
            const button = $("protocol-phases").querySelectorAll("button")[Number(key) - 1];
            if (button) { event.preventDefault(); button.click(); }
        } else if (actions[key]) { event.preventDefault(); actions[key](); }
    });
    return { update, decorateLibrary, metadata, renderMessages, closeDialogs, inspectHop };
}
