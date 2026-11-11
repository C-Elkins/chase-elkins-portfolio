export async function runLabNavigationTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const navigation = document.querySelector(".lab-tabs");
    const switcher = document.getElementById("lab-switcher");
    const summary = switcher.querySelector("summary");
    const search = document.getElementById("lab-library-search");
    const library = document.getElementById("lab-library");
    const links = [...navigation.querySelectorAll("a")];
    const originalHash = location.hash;
    const originalScroll = scrollY;
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        scrollTo(0, 0);
        await settle();
    };
    const open = async () => {
        if (!switcher.open) summary.click();
        await settle();
    };
    const filter = async value => {
        search.focus();
        search.value = value;
        search.dispatchEvent(new Event("input", { bubbles: true }));
        await settle();
    };
    const dismiss = async () => {
        summary.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await settle();
    };
    const additions = [];
    try {
        await go("#learn102");
        const height = navigation.getBoundingClientRect().height;
        assert(!switcher.open, "Library is collapsed on entry");
        assert(navigation.scrollWidth <= navigation.clientWidth, "Collapsed navigation never scrolls horizontally");
        assert(document.getElementById("lab-current-title").textContent === "Networking 102", "Current course stays visible without opening library");
        assert(document.getElementById("lab-current-kind").textContent === "Course", "Current destination identifies its group");
        await open();
        assert(switcher.open, "Explore lab opens the library");
        assert(Math.abs(navigation.getBoundingClientRect().height - height) < 1, "Opening library does not push workspace down");
        assert(library.scrollWidth <= library.clientWidth, "Open library has no horizontal scrolling");
        const box = library.getBoundingClientRect();
        assert(box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight, "Open library fits inside viewport");
        assert(library.scrollHeight <= library.clientHeight + 1, "Existing destinations are visible without scrolling the list");
        assert(navigation.querySelectorAll(".lab-library-group").length === 2, "Courses and labs have separate groups");
        assert(links.every(link => !link.hidden && link.getBoundingClientRect().height >= 44), "Every destination has a visible touch-sized target");
        await filter("networking");
        assert(links.filter(link => !link.hidden).length === 3, "Search narrows to all networking courses");
        assert(navigation.querySelector('[data-kind="Interactive lab"]').hidden, "Empty groups disappear from search");
        await filter("courses");
        assert(links.filter(link => !link.hidden).length === navigation.querySelector('[data-kind="Course"]').querySelectorAll("a").length, "Search also recognizes category names");
        await filter("  ENCRYPTION  ");
        assert(links.filter(link => !link.hidden).length === 1 && !links.find(link => link.hash === "#crypto").hidden, "Search ignores casing and surrounding spaces");
        await filter("unmatched-topic");
        assert(links.every(link => link.hidden), "Unmatched search hides all destinations");
        assert(!document.getElementById("lab-library-status").hidden && document.getElementById("lab-library-status").textContent.startsWith("No matches"), "Empty search has an explicit recovery message");
        await dismiss();
        assert(!switcher.open && document.activeElement === summary, "Escape closes and returns focus to trigger");
        assert(!search.value && links.every(link => !link.hidden), "Closing clears filters for the next visit");
        await open();
        search.focus();
        document.querySelector(".header-actions a").focus();
        await settle();
        assert(!switcher.open, "Tabbing out closes the library without trapping focus");
        await open();
        document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
        await settle();
        assert(!switcher.open, "Clicking outside dismisses library");
        await open();
        links.find(link => link.hash === "#learn102").click();
        await settle();
        assert(!switcher.open, "Selecting the current destination also closes library");
        for (const link of links) {
            await open();
            link.click();
            await settle();
            assert(!switcher.open && !document.querySelector(link.hash).hidden, `${link.hash}: selection opens destination and closes library`);
            assert(link.getAttribute("aria-current") === "location", `${link.hash}: selected link remains marked current`);
            assert(document.getElementById("lab-current-title").textContent === link.textContent.split(" / ")[1], `${link.hash}: compact label follows navigation`);
            assert(Math.abs(navigation.getBoundingClientRect().height - height) < 1, `${link.hash}: navigation height stays constant`);
        }
        await go("#learn102-ipv6");
        assert(document.getElementById("lab-current-title").textContent === "Networking 102", "Deep chapter links retain the correct course label");
        const group = navigation.querySelector('[data-kind="Course"] .lab-library-links');
        for (let index = 0; index < 24; index++) {
            const link = document.createElement("a");
            link.href = "#learn102";
            link.textContent = `Future course ${index + 1}`;
            group.append(link);
            additions.push(link);
        }
        assert(Math.abs(navigation.getBoundingClientRect().height - height) < 1, "Adding 24 courses never enlarges the collapsed bar");
        await open();
        assert(library.getBoundingClientRect().bottom <= innerHeight, "Expanded future library stays viewport-bounded");
        await filter("future course 24");
        assert(additions.filter(link => !link.hidden).length === 1, "Future entries are searchable without navigation changes");
        assert(library.scrollHeight <= library.clientHeight + 1, "Search reaches future content without scrolling through entries");
    } finally {
        additions.forEach(link => link.remove());
        await dismiss();
        await go(originalHash);
        scrollTo(0, originalScroll);
    }
    return `Lab navigation tests passed: ${passed} assertions.`;
}
