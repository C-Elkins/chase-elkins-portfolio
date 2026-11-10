const paths = {
    client: ["M3 4h18v12H3z", "M8 21h8M12 16v5"],
    phone: ["M7 2h10v20H7z", "M10 5h4M11 19h2"],
    printer: ["M6 9V3h12v6M6 17H3V9h18v8h-3", "M6 14h12v8H6z", "M17 11h1"],
    switch: ["M2 7h20v11H2z", "M5 11h2m3 0h2m3 0h2M5 14h2m3 0h2m3 0h2"],
    ap: ["M12 15v7M7 22h10", "M9 12a4 4 0 0 1 6 0M5 8a10 10 0 0 1 14 0M2 4a15 15 0 0 1 20 0"],
    router: ["M3 14h18v7H3zM6 14V5m12 9V5", "M8 17h8m-2-2 2 2-2 2M8 3l-2 2-2-2m12 0 2 2 2-2"],
    firewall: ["M3 3h18v18H3z", "M3 9h18M3 15h18M9 3v6m6 0v6m-6 0v6"],
    server: ["M5 2h14v20H5z", "M5 8h14M5 14h14M8 5h1m-1 6h1m-1 6h1m3-12h4m-4 6h4m-4 6h4"],
    internet: ["M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0", "M2 12h20M12 2c-6 6-6 14 0 20 6-6 6-14 0-20"]
};

export function networkIcon(type) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "device-icon");
    svg.setAttribute("aria-hidden", "true");
    for (const data of paths[type]) {
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute("d", data);
        svg.appendChild(path);
    }
    return svg;
}
