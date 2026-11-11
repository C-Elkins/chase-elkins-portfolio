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

const scenes = {
    client: [
        ["M13 25 65 8 69 60 17 78Z", "scene-side"],
        ["M17 28 61 14 64 56 21 70Z", "scene-face"],
        ["M22 30 57 19 60 52 25 64Z", "scene-screen"],
        ["M17 78 69 60 108 79 55 99Z", "scene-side"],
        ["M17 74 69 56 108 75 55 94Z", "scene-top"],
        ["M27 74 68 61 92 73 51 86Z", "scene-keyboard"],
        ["M35 72 59 84M44 69 68 81M53 66 77 78M62 63 86 75M33 78 74 65M41 82 82 69", "scene-detail"],
        ["M58 87 76 81 83 84 65 90Z", "scene-face"],
        ["M27 35 52 27M28 40 44 35M30 48 53 40M31 53 49 47", "scene-screen-idle"],
        ["M19 80 55 98 105 80", "scene-detail"]
    ],
    router: [
        ["M13 48 67 27 108 49 54 72Z", "scene-top"],
        ["M13 48V70L54 94V72Z", "scene-side"],
        ["M54 72 108 49V71L54 94Z", "scene-face"],
        ["M25 42 23 14 28 12 30 40M89 37 92 8 97 10 95 40", "scene-face"],
        ["M25 18 27 37M94 14 92 34", "scene-detail"],
        ["M32 46 58 37 71 44 45 53Z", "scene-screen"],
        ["M39 46 53 41m-3 5 5-5-7-1M59 46l-9 4m3-4-4 4 7 1", "scene-detail"],
        ["M63 74 99 59V69L63 84Z", "scene-port"],
        ["M68 74v5m6-8v6m6-8v6m6-8v6m6-8v6M20 60l17 9M21 66l8 5", "scene-detail"],
        ["M43 75v4m4-2v4", "scene-led"]
    ],
    switch: [
        ["M8 39 74 16 114 38 48 63Z", "scene-top"],
        ["M8 39V61L48 86V63Z", "scene-side"],
        ["M48 63 114 38V62L48 86Z", "scene-face"],
        ["M55 65 107 46V61L55 80Z", "scene-port"],
        ["M62 64v9m8-12v9m8-12v9m8-12v9m8-12v9m8-12v9", "scene-detail"],
        ["M26 40 74 23M32 44 80 27M38 48 86 31", "scene-detail"],
        ["M16 50 34 61M17 56l10 6", "scene-detail"],
        ["M43 67v4m0 4v3", "scene-led"]
    ],
    server: [
        ["M27 16 68 2 103 20 62 36Z", "scene-top"],
        ["M27 16V77L62 99V36Z", "scene-side"],
        ["M62 36 103 20V82L62 99Z", "scene-face"],
        ["M32 28 57 43V54L32 39ZM32 45 57 60V71L32 56ZM32 62 57 77V88L32 73Z", "scene-port"],
        ["M38 33v5m5-2v5m5-2v5m5-2v5M38 50v5m5-2v5m5-2v5m5-2v5M38 67v5m5-2v5m5-2v5m5-2v5", "scene-detail"],
        ["M69 43 95 33M69 49 95 39M69 60 95 50M69 66 95 56M69 78 95 68", "scene-detail"],
        ["M43 17 69 8 87 18 61 28Z", "scene-screen"],
        ["M49 17 68 11M55 20 75 13M61 23 81 16", "scene-detail"],
        ["M69 85l5-2m4-2 5-2", "scene-led"]
    ],
    resolver: [
        ["M16 28 66 8 105 29 55 50Z", "scene-top"],
        ["M16 28V43L55 66V50Z", "scene-side"],
        ["M55 50 105 29V44L55 66Z", "scene-face"],
        ["M16 49 55 72 105 51V66L55 88 16 65Z", "scene-side"],
        ["M55 72 105 51V66L55 88Z", "scene-face"],
        ["M16 71 55 94 105 73V87L55 108 16 87Z", "scene-side"],
        ["M55 94 105 73V87L55 108Z", "scene-face"],
        ["M26 28 65 14 92 29 54 43Z", "scene-screen"],
        ["M33 28 64 17m-23 15 31-11m-23 15 31-11M61 52l35-15M61 76l35-15M61 98l35-15", "scene-detail"],
        ["M24 37l21 12v7L24 44ZM24 59l21 12v7L24 66ZM24 81l21 12v7L24 88Z", "scene-screen"],
        ["M63 59l5-2m-5 24 5-2m-5 24 5-2", "scene-led"]
    ],
    firewall: [
        ["M24 24 72 7 98 22 50 40Z", "scene-top"],
        ["M24 24V72L50 90V40Z", "scene-side"],
        ["M50 40 98 22V72L50 90Z", "scene-face"],
        ["M51 53 97 36M51 68 97 51M63 36v12m19-20v14M74 45v14M62 65v17m22-27v17", "scene-detail"],
        ["M25 40 49 55M25 55 49 70M36 33v14m0 15v18", "scene-detail"],
        ["M69 51 85 45V59Q85 71 77 79Q69 77 69 66Z", "scene-screen"],
        ["M73 63l4 4 5-10", "scene-detail"]
    ],
    ap: [
        ["M18 61 67 43 104 63 55 83Z", "scene-top"],
        ["M18 61V70L55 93V83Z", "scene-side"],
        ["M55 83 104 63V73L55 93Z", "scene-face"],
        ["M36 60 66 50 86 61 56 72Z", "scene-screen"],
        ["M51 54q8-11 16-1M42 45q17-22 34-1M33 35q26-32 52-1", "scene-radio"],
        ["M56 62h1M63 84l7-3", "scene-led"]
    ],
    phone: [
        ["M35 14 67 3 84 13V80L52 94 35 83Z", "scene-side"],
        ["M35 14 52 25 84 13M52 25V94", "scene-detail"],
        ["M57 30 79 22V72L57 82Z", "scene-screen"],
        ["M62 27l11-4M65 83l6-3", "scene-detail"],
        ["M62 43 74 38M62 49 72 45M62 61 75 56M62 67 70 63", "scene-detail"]
    ],
    printer: [
        ["M16 41 66 24 104 44 54 64Z", "scene-top"],
        ["M16 41V68L54 92V64Z", "scene-side"],
        ["M54 64 104 44V72L54 92Z", "scene-face"],
        ["M31 39V14L67 2 85 11V34L49 48Z", "scene-face"],
        ["M38 20 68 10M38 27 68 17M38 34 58 27", "scene-detail"],
        ["M62 68 96 55V65L62 79Z", "scene-port"],
        ["M62 72 91 61 92 81 63 92Z", "scene-face"],
        ["M68 75l17-6M68 81l13-5M23 52l17 10", "scene-detail"],
        ["M92 48l4-1", "scene-led"]
    ],
    internet: [
        ["M15 73C1 65 8 45 24 43C21 23 42 17 55 28C65 2 96 15 96 36C122 36 122 67 106 75C108 96 81 104 66 90C48 108 26 96 27 84C21 84 15 80 15 73Z", "scene-face"],
        ["M15 73q8 11 19 5m32 12q14-9 20-5", "scene-detail"],
        ["M45 56a19 19 0 1 0 38 0 19 19 0 1 0-38 0", "scene-screen"],
        ["M45 56h38M48 46h32M48 66h32M64 37c-14 11-14 27 0 38 14-11 14-27 0-38M64 37v38", "scene-detail"]
    ],
    proxy: [
        ["M10 35 40 24 62 36 32 48Z", "scene-top"],
        ["M10 35V61L32 75V48Z", "scene-side"],
        ["M32 48 62 36V62L32 75Z", "scene-face"],
        ["M61 48 90 37 111 49 82 61Z", "scene-top"],
        ["M61 48V75L82 89V61Z", "scene-side"],
        ["M82 61 111 49V76L82 89Z", "scene-face"],
        ["M39 56l16-6M39 63l16-6M88 68l16-6M88 75l16-6", "scene-detail"],
        ["M48 21 71 12 81 18m-6-8 7 8-11 3M71 93 48 101 38 95m6 8-7-8 11-3", "scene-radio"]
    ]
};

export function deviceArtwork(device) {
    if (/proxy/i.test(device.name)) return "proxy";
    if (device.type === "server" && /dns|resolver/i.test(device.name)) return "resolver";
    return device.type;
}

export function networkIcon(type, scene = false, device = null) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const artwork = device ? deviceArtwork(device) : type;
    svg.setAttribute("viewBox", scene ? "0 0 120 108" : "0 0 24 24");
    svg.setAttribute("class", scene ? "device-icon scene-icon" : "device-icon");
    svg.setAttribute("aria-hidden", "true");
    if (scene) {
        svg.dataset.artwork = artwork;
        const shadow = document.createElementNS(svg.namespaceURI, "path");
        shadow.setAttribute("d", "M14 83 65 64 117 88 65 108Z");
        shadow.setAttribute("class", "scene-shadow");
        svg.append(shadow);
    }
    for (const [data, className] of scene ? scenes[artwork] : paths[type].map(data => [data, ""])) {
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute("d", data);
        if (className) path.setAttribute("class", className);
        svg.appendChild(path);
    }
    if (scene && artwork === "client") {
        const output = document.createElementNS(svg.namespaceURI, "g");
        output.setAttribute("class", "scene-screen-output");
        for (const [data, className] of [
            ["M26 33 54 24 54 29 27 38Z", "scene-output-header"],
            ["M28 42 39 38 40 48 29 52ZM43 37 54 33 55 43 44 47Z", "scene-face"],
            ["M30 57 54 49M31 61 48 55", "scene-detail"]
        ]) {
            const path = document.createElementNS(svg.namespaceURI, "path");
            path.setAttribute("d", data);
            path.setAttribute("class", className);
            output.append(path);
        }
        svg.append(output);
    }
    return svg;
}
