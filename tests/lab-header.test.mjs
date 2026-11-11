export async function runLabHeaderTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const go = async hash => {
        history.replaceState(null, "", hash);
        dispatchEvent(new HashChangeEvent("hashchange"));
        scrollTo(0, 0);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    };
    const tabs = [...document.querySelectorAll(".lab-tabs a")];
    let reference = null;
    for (const tab of tabs) {
        await go(tab.hash);
        const header = document.querySelector(".lab-header");
        const navigation = document.querySelector(".lab-tabs");
        const box = header.getBoundingClientRect();
        const navBox = navigation.getBoundingClientRect();
        const dimensions = [box.x, box.width, box.height, navBox.y, navBox.height];
        reference ||= dimensions;
        assert(dimensions.every((value, index) => Math.abs(value - reference[index]) < 1), `${tab.hash} shares header and navigation dimensions`);
        assert(getComputedStyle(document.querySelector(".lab-intro")).display === "none", `${tab.hash} hides the large introduction by default`);
        assert(document.getElementById("lab-section-title").textContent === ` / ${tab.textContent.split(" / ")[1].toUpperCase()}`, `${tab.hash} names the active section`);
        assert(tab.getAttribute("aria-current") === "location", `${tab.hash} marks its tab current`);
        assert(document.body.classList.contains("network-app") === (tab.hash === "#network"), `${tab.hash} keeps network-only layout isolated`);
        assert(document.documentElement.scrollWidth <= innerWidth, `${tab.hash} has no page-wide horizontal overflow`);
    }
    await go("#network");
    document.getElementById("network-compact").click();
    assert(!document.body.classList.contains("lab-compact"), "Explicit introduction toggle restores expanded header");
    await go("#learn");
    assert(getComputedStyle(document.querySelector(".lab-intro")).display !== "none", "Expanded preference carries across tabs");
    await go("#network");
    document.getElementById("network-compact").click();
    await go("#printer-connect");
    const chapter = document.getElementById("printer-connect");
    chapter.scrollIntoView();
    assert(chapter.getBoundingClientRect().top >= document.querySelector(".lab-header").getBoundingClientRect().bottom, "Sticky shared header does not obscure chapter targets");
    await go("#network");
    return `Lab header tests passed: ${passed} assertions.`;
}
