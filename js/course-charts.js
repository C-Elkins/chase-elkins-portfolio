// Builds accessible, theme-aware SVG teaching figures from plain data. Colors come from CSS classes.
const SVG = "http://www.w3.org/2000/svg";

const svgNode = (tag, attributes = {}, text) => {
    const node = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attributes)) {
        // CSP blocks style attributes, but CSSOM custom properties are allowed.
        if (name === "style") {
            const [property, setting] = value.split(":");
            node.style.setProperty(property, setting);
        } else node.setAttribute(name, String(value));
    }
    if (text !== undefined) node.textContent = text;
    return node;
};
const html = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};
const scale = (value, min, max, start, end) => start + ((value - min) / (max - min)) * (end - start);

function lineChart(svg, spec) {
    const width = 640, height = 300, left = 64, right = 20, top = 18, bottom = 52;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const x = value => scale(value, spec.x.min ?? 0, spec.x.max, left, width - right);
    const y = value => scale(value, spec.y.min ?? 0, spec.y.max, height - bottom, top);
    const grid = svgNode("g", { class: "chart-grid" });
    for (const tick of spec.y.ticks) {
        grid.append(svgNode("line", { x1: left, x2: width - right, y1: y(tick), y2: y(tick) }));
        grid.append(svgNode("text", { x: left - 8, y: y(tick) + 4, "text-anchor": "end", class: "chart-tick" }, spec.y.format ? spec.y.format(tick) : tick));
    }
    for (const tick of spec.x.ticks) {
        grid.append(svgNode("text", { x: x(tick), y: height - bottom + 18, "text-anchor": "middle", class: "chart-tick" }, spec.x.format ? spec.x.format(tick) : tick));
    }
    grid.append(svgNode("line", { x1: left, x2: width - right, y1: height - bottom, y2: height - bottom, class: "chart-axis" }));
    grid.append(svgNode("line", { x1: left, x2: left, y1: top, y2: height - bottom, class: "chart-axis" }));
    grid.append(svgNode("text", { x: (left + width - right) / 2, y: height - 10, "text-anchor": "middle", class: "chart-label" }, spec.x.label));
    grid.append(svgNode("text", { x: 14, y: (top + height - bottom) / 2, "text-anchor": "middle", transform: `rotate(-90 14 ${(top + height - bottom) / 2})`, class: "chart-label" }, spec.y.label));
    svg.append(grid);
    for (const mark of spec.marks || []) {
        const group = svgNode("g", { class: "chart-mark" });
        group.append(svgNode("line", { x1: x(mark.x), x2: x(mark.x), y1: top, y2: height - bottom }));
        group.append(svgNode("text", { x: x(mark.x) + 5, y: top + 12 + (mark.row || 0) * 14, class: "chart-mark-label" }, mark.label));
        svg.append(group);
    }
    spec.series.forEach((series, index) => {
        const points = series.points.map(([px, py]) => `${x(px).toFixed(1)},${y(py).toFixed(1)}`).join(" ");
        const tone = `chart-tone-${series.tone ?? index}`;
        if (series.area) {
            const base = y(spec.y.min ?? 0).toFixed(1);
            const first = x(series.points[0][0]).toFixed(1), last = x(series.points.at(-1)[0]).toFixed(1);
            svg.append(svgNode("polygon", { points: `${first},${base} ${points} ${last},${base}`, class: `chart-area ${tone}` }));
        }
        svg.append(svgNode("polyline", { points, class: `chart-line ${tone}${series.dashed ? " chart-dashed" : ""}`, pathLength: 1 }));
        if (series.tag) {
            const [tx, ty] = series.tag.at;
            svg.append(svgNode("text", { x: x(tx), y: y(ty), "text-anchor": "middle", class: `chart-series-label ${tone}` }, series.tag.text));
        }
    });
}

function barChart(svg, spec) {
    const width = 640, rowHeight = 34, left = spec.labelWidth || 150, right = 110, top = 10;
    const height = top * 2 + spec.items.length * rowHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const max = spec.max ?? Math.max(...spec.items.map(item => item.value));
    spec.items.forEach((item, index) => {
        const rowY = top + index * rowHeight;
        const barWidth = Math.max(2, scale(spec.log ? Math.log10(item.value) : item.value, 0, spec.log ? Math.log10(max) : max, 0, width - left - right));
        svg.append(svgNode("text", { x: left - 10, y: rowY + 21, "text-anchor": "end", class: "chart-tick chart-bar-name" }, item.label));
        svg.append(svgNode("rect", { x: left, y: rowY + 6, width: width - left - right, height: 22, rx: 3, class: "chart-track" }));
        svg.append(svgNode("rect", { x: left, y: rowY + 6, width: barWidth, height: 22, rx: 3, class: `chart-bar chart-tone-${item.tone ?? 0}`, style: `--bar-delay:${index * 70}ms` }));
        svg.append(svgNode("text", { x: left + barWidth + 8, y: rowY + 21, class: "chart-value" }, item.display ?? item.value));
    });
}

function stackChart(svg, spec, figure) {
    const width = 640, rowHeight = 64, left = spec.labelWidth ?? 120, right = 12, top = 8;
    const height = top * 2 + spec.rows.length * rowHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const total = spec.total ?? Math.max(...spec.rows.map(row => row.segments.reduce((sum, segment) => sum + segment.value, 0)));
    const key = html("ul", undefined, "chart-key");
    const seen = new Set();
    spec.rows.forEach((row, rowIndex) => {
        const rowY = top + rowIndex * rowHeight;
        if (left) svg.append(svgNode("text", { x: left - 10, y: rowY + 30, "text-anchor": "end", class: "chart-tick chart-bar-name" }, row.label));
        let offset = left;
        row.segments.forEach(segment => {
            const segmentWidth = scale(segment.value, 0, total, 0, width - left - right);
            const group = svgNode("g", { class: `chart-segment chart-tone-${segment.tone ?? 0}` });
            group.append(svgNode("rect", { x: offset, y: rowY + 8, width: Math.max(segmentWidth - 2, 1), height: 36, rx: 3 }));
            const text = segment.short ?? segment.label;
            if (segmentWidth > text.length * 6.6 + 10) group.append(svgNode("text", { x: offset + segmentWidth / 2 - 1, y: rowY + 31, "text-anchor": "middle", class: "chart-segment-label" }, text));
            group.append(svgNode("title", {}, `${segment.label}: ${segment.display ?? segment.value}`));
            svg.append(group);
            offset += segmentWidth;
            const keyText = `${segment.label}: ${segment.display ?? segment.value}`;
            if (!seen.has(keyText)) {
                seen.add(keyText);
                const item = html("li");
                item.append(html("span", undefined, `chart-swatch chart-tone-${segment.tone ?? 0}`), document.createTextNode(keyText));
                key.append(item);
            }
        });
        if (row.note) svg.append(svgNode("text", { x: left, y: rowY + 60, class: "chart-tick" }, row.note));
    });
    figure.append(key);
}

function graphChart(svg, spec) {
    const width = spec.width ?? 640, height = spec.height ?? 300;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const nodes = new Map(spec.nodes.map(node => [node.id, node]));
    const markerId = `${svg.id}-arrow`;
    const defs = svgNode("defs");
    const marker = svgNode("marker", { id: markerId, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    marker.append(svgNode("path", { d: "M0 0 10 5 0 10z", class: "chart-arrowhead" }));
    defs.append(marker);
    svg.append(defs);
    spec.edges.forEach((edge, index) => {
        const from = nodes.get(edge.from), to = nodes.get(edge.to);
        const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
        const pad = 34;
        const attributes = {
            x1: from.x + dx / length * pad, y1: from.y + dy / length * pad,
            x2: to.x - dx / length * pad, y2: to.y - dy / length * pad,
            class: `chart-edge chart-edge-${edge.state || "normal"}`, style: `--edge-delay:${index * 120}ms`, pathLength: 1
        };
        if (edge.arrow) attributes["marker-end"] = `url(#${markerId})`;
        if (edge.arrow === "both") attributes["marker-start"] = `url(#${markerId})`;
        svg.append(svgNode("line", attributes));
        if (edge.label) {
            const lx = (from.x + to.x) / 2 + (edge.dx ?? 0), ly = (from.y + to.y) / 2 + (edge.dy ?? -8);
            svg.append(svgNode("text", { x: lx, y: ly, "text-anchor": "middle", class: `chart-edge-label chart-edge-label-${edge.state || "normal"}` }, edge.label));
        }
    });
    for (const node of spec.nodes) {
        const group = svgNode("g", { class: `chart-node chart-tone-${node.tone ?? 1}` });
        group.append(svgNode("rect", { x: node.x - 52, y: node.y - 22, width: 104, height: 44, rx: 8 }));
        group.append(svgNode("text", { x: node.x, y: node.sub ? node.y - 3 : node.y + 4, "text-anchor": "middle", class: "chart-node-label" }, node.label));
        if (node.sub) group.append(svgNode("text", { x: node.x, y: node.y + 12, "text-anchor": "middle", class: "chart-node-sub" }, node.sub));
        svg.append(group);
    }
}

const renderers = { line: lineChart, bars: barChart, stack: stackChart, graph: graphChart };

export function buildFigure(spec, idBase) {
    const figure = html("figure", undefined, `course-figure course-figure-${spec.type}`);
    const svg = svgNode("svg", { id: `${idBase}-svg`, role: "img", "aria-labelledby": `${idBase}-title ${idBase}-desc`, focusable: "false" });
    svg.append(svgNode("title", { id: `${idBase}-title` }, spec.title), svgNode("desc", { id: `${idBase}-desc` }, spec.desc));
    const canvas = html("div", undefined, "course-figure-canvas");
    canvas.append(svg);
    figure.append(html("p", spec.title, "course-figure-title"), canvas);
    renderers[spec.type](svg, spec, figure);
    figure.append(html("figcaption", spec.caption));
    return figure;
}

export function buildTable(spec) {
    const wrap = html("div", undefined, "table-wrap");
    const table = html("table", undefined, "learn-table course-table");
    table.append(html("caption", spec.caption));
    const head = html("thead");
    const headRow = html("tr");
    spec.columns.forEach(column => {
        const cell = html("th", column);
        cell.scope = "col";
        headRow.append(cell);
    });
    head.append(headRow);
    const body = html("tbody");
    spec.rows.forEach((row, index) => {
        const tr = html("tr");
        if (spec.highlight === index) tr.className = "course-row-highlight";
        row.forEach(value => tr.append(html("td", value)));
        body.append(tr);
    });
    table.append(head, body);
    wrap.append(table);
    return wrap;
}
