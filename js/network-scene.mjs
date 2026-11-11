export const sceneDimensions = Object.freeze({ width: 1120, height: 640 });
export const sceneDevice = Object.freeze({ width: 236, height: 224, centerX: 118, centerY: 80 });
export const sceneLane = 8;

export function directScene(topology, steps, index, { follow = true, fitted = true, delivered = false } = {}) {
    const step = steps[index - 1];
    if (!step || !follow || !fitted) return { kind: "overview", actors: topology.devices.map(device => device.id) };
    if (delivered && index === steps.length) return { kind: "complete", actors: [step.node] };
    if (index === 1) return { kind: "prepare", actors: [step.node] };
    if (step.source === step.destination) return { kind: "local", actors: [step.node] };
    return {
        kind: "exchange",
        actors: [...new Set(steps.filter(item => item.packetId === step.packetId).flatMap(item => item.edge || [item.node]))]
    };
}

export function placeFlightLabel(point, viewport, obstacles, width, height) {
    const margin = 10, gap = 22;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const candidates = [
        [point.x - width / 2, point.y - height - gap],
        [point.x + gap, point.y - height / 2],
        [point.x - width - gap, point.y - height / 2],
        [point.x - width / 2, point.y + gap],
        [point.x + gap, point.y - height - gap],
        [point.x - width - gap, point.y - height - gap],
        [point.x + gap, point.y + gap],
        [point.x - width - gap, point.y + gap]
    ].map(([x, y]) => ({
        x: clamp(x, margin, viewport.width - width - margin),
        y: clamp(y, margin, viewport.height - height - margin)
    }));
    const score = candidate => obstacles.reduce((area, obstacle) => area
        + Math.max(0, Math.min(candidate.x + width, obstacle.right) - Math.max(candidate.x, obstacle.left))
        * Math.max(0, Math.min(candidate.y + height, obstacle.bottom) - Math.max(candidate.y, obstacle.top)), 0) * 100
        + Math.hypot(candidate.x + width / 2 - point.x, candidate.y + height / 2 - point.y);
    return candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
}

const layouts = {
    2: [[290, 370], [815, 270]],
    3: [[165, 365], [550, 290], [940, 215]],
    4: [[150, 425], [475, 295], [935, 150], [875, 440]],
    5: [[142, 450], [420, 450], [698, 450], [976, 110], [976, 450]],
    6: [[142, 450], [420, 450], [698, 450], [976, 110], [698, 110], [420, 110]],
    7: [[142, 450], [420, 450], [698, 450], [976, 450], [976, 110], [698, 110], [420, 110]],
    8: [[142, 450], [420, 450], [698, 450], [976, 450], [976, 110], [698, 110], [420, 110], [142, 110]]
};

export function layoutScene(topology) {
    const slots = layouts[topology.devices.length];
    if (!slots) throw new Error("Guided scenes require between two and eight actors.");
    return {
        devices: topology.devices.map((device, index) => ({ ...device, x: slots[index][0], y: slots[index][1] })),
        links: topology.links.map(link => [...link])
    };
}

export function sceneBounds(device) {
    return {
        left: device.x - sceneDevice.centerX, top: device.y - sceneDevice.centerY,
        right: device.x + sceneDevice.width - sceneDevice.centerX,
        bottom: device.y + sceneDevice.height - sceneDevice.centerY
    };
}

const overlaps = (a, b, gap = 0) => a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;

export function scenePosition(topology, id, x, y) {
    const device = topology.devices.find(item => item.id === id);
    if (!device) throw new Error("Cannot position an unknown guided actor.");
    const candidate = {
        ...device,
        x: Math.round(Math.max(sceneDevice.centerX + 24, Math.min(sceneDimensions.width - sceneDevice.centerX - 24, x))),
        y: Math.round(Math.max(sceneDevice.centerY + 24, Math.min(sceneDimensions.height - (sceneDevice.height - sceneDevice.centerY) - 24, y)))
    };
    if (topology.devices.some(other => other.id !== id && overlaps(sceneBounds(candidate), sceneBounds(other), 32))) return null;
    return { x: candidate.x, y: candidate.y };
}

export function placeSceneCallout(topology, node, { preferSide = false } = {}) {
    const candidates = [];
    const nodeBounds = sceneBounds(node);
    const positions = [
        [nodeBounds.right + 18, nodeBounds.top + 20],
        [nodeBounds.left - 266, nodeBounds.top + 20],
        [node.x - 124, nodeBounds.top - 96],
        [node.x - 124, nodeBounds.bottom + 18],
        ...[24, 152, 270, 408, 532].flatMap(y => [24, 290, 556, 822].map(x => [x, y]))
    ];
    for (const [index, [x, y]] of positions.entries()) {
        const bounds = { left: x, top: y, right: x + 248, bottom: y + 78 };
        if (x < 24 || y < 24 || bounds.right > sceneDimensions.width - 24 || bounds.bottom > sceneDimensions.height - 24) continue;
        if (topology.devices.some(device => overlaps(bounds, sceneBounds(device), 14))) continue;
        candidates.push({ x, y, preferred: preferSide && index < 2, distance: Math.hypot(x + 124 - node.x, y + 39 - node.y) });
    }
    candidates.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.distance - b.distance);
    return candidates[0] || null;
}

export function segmentCrossesBounds(a, b, bounds) {
    let min = 0;
    let max = 1;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // Test the open interior, allowing paths along an obstacle boundary.
    const left = bounds.left + .05, right = bounds.right - .05;
    const top = bounds.top + .05, bottom = bounds.bottom - .05;
    for (const [p, q] of [[-dx, a.x - left], [dx, right - a.x], [-dy, a.y - top], [dy, bottom - a.y]]) {
        if (Math.abs(p) < .00001) { if (q < 0) return false; }
        else {
            const t = q / p;
            if (p < 0) min = Math.max(min, t); else max = Math.min(max, t);
        }
    }
    return min < max && min < 1 && max > 0;
}

export function sceneRoute(topology, fromId, toId, lane = 0) {
    const from = topology.devices.find(device => device.id === fromId);
    const to = topology.devices.find(device => device.id === toId);
    if (!from || !to || fromId === toId) throw new Error("A scene route needs two different known actors.");
    const obstacle = device => {
        const bounds = sceneBounds(device);
        return { left: bounds.left - 10, right: bounds.right + 10, top: bounds.top - 10, bottom: bounds.bottom + 10 };
    };
    const obstacles = topology.devices.map(obstacle);
    const anchor = (device, toward) => {
        const bounds = obstacle(device);
        const dx = toward.x - device.x, dy = toward.y - device.y;
        const factor = Math.min(
            dx > 0 ? (bounds.right + 8 - device.x) / dx : dx < 0 ? (bounds.left - 8 - device.x) / dx : Infinity,
            dy > 0 ? (bounds.bottom + 8 - device.y) / dy : dy < 0 ? (bounds.top - 8 - device.y) / dy : Infinity
        );
        const distance = Math.hypot(dx, dy);
        return { x: device.x + dx * factor - dy / distance * lane, y: device.y + dy * factor + dx / distance * lane };
    };
    const start = anchor(from, to);
    const end = anchor(to, from);
    const nodes = [start, end, ...obstacles.flatMap(b => [
        { x: b.left, y: b.top }, { x: b.right, y: b.top }, { x: b.left, y: b.bottom }, { x: b.right, y: b.bottom }
    ])];
    const distances = nodes.map(() => Infinity);
    const previous = nodes.map(() => -1);
    const visited = new Set();
    distances[0] = 0;
    while (visited.size < nodes.length) {
        let current = -1;
        nodes.forEach((node, index) => {
            if (!visited.has(index) && (current < 0 || distances[index] < distances[current])) current = index;
        });
        if (current < 0 || !Number.isFinite(distances[current])) break;
        if (current === 1) {
            const route = [];
            for (let index = 1; index >= 0; index = previous[index]) route.unshift(nodes[index]);
            return route;
        }
        visited.add(current);
        nodes.forEach((node, index) => {
            if (visited.has(index) || obstacles.some(bounds => segmentCrossesBounds(nodes[current], node, bounds))) return;
            const distance = distances[current] + Math.hypot(node.x - nodes[current].x, node.y - nodes[current].y);
            if (distance < distances[index]) { distances[index] = distance; previous[index] = current; }
        });
    }
    throw new Error("No unobstructed scene route exists. Reset the scene layout.");
}
