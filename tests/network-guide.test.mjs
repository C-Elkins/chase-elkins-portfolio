import { guidedLessons } from "../js/network-guided.mjs";
import { lessonTeaching } from "../js/network-lessons.mjs";

export async function runNetworkGuideTests() {
    let passed = 0;
    const assert = (condition, label) => { if (!condition) throw new Error(label); passed++; };
    const $ = id => document.getElementById(id);
    assert(matchMedia("(prefers-reduced-motion: reduce)").matches, "Run deterministic field-guide geometry checks with reduced motion");
    assert(innerWidth >= 1000 && innerHeight >= 700, "Field-guide fit checks use the bounded desktop layout");
    location.hash = "#network"; dispatchEvent(new HashChangeEvent("hashchange"));
    $("network-mode").value = "guided"; $("network-mode").dispatchEvent(new Event("change"));
    $("protocol-search").value = ""; $("protocol-search").dispatchEvent(new Event("input"));
    document.querySelector('[data-category="all"]').click();
    await document.fonts.ready;
    const panel = document.querySelector(".protocol-overview");
    const fits = label => assert(panel.scrollHeight <= panel.clientHeight + 1,
        `${label} fits without scrolling at ${innerWidth}x${innerHeight} (${panel.scrollHeight}/${panel.clientHeight})`);
    for (const id of Object.keys(guidedLessons)) {
        document.querySelector(`#protocol-picker [data-protocol="${id}"]`).click();
        fits(`${id} overview`);
        const teaching = lessonTeaching[id];
        const visible = element => element.getBoundingClientRect().height > 0;
        assert($("protocol-intro").textContent === teaching.intro && visible($("protocol-intro")), `${id} opens with its plain-English introduction`);
        assert(document.querySelectorAll("#protocol-fact-grid .lesson-fact").length === 3, `${id} shows its three lesson facts`);
        $("network-step").click();
        fits(`${id} opening`);
        for (const button of $("message-flow").children) {
            button.click();
            $("protocol-inspector").close();
            fits(`${id} / ${button.textContent}`);
            const [tagline, explanation] = teaching.phases[$("protocol-phase-title").textContent];
            assert($("protocol-phase-tagline").textContent === tagline && $("protocol-phase-explain").textContent === explanation
                && visible($("protocol-phase-explain")), `${id} / ${button.textContent} explains its phase in plain English`);
            const port = $("packet-table-scroll").getBoundingClientRect();
            const row = $("packet-rows").querySelector(".packet-current").getBoundingClientRect();
            const header = document.querySelector(".packet-table thead").getBoundingClientRect();
            assert(row.top >= header.bottom - 1 && row.bottom <= port.bottom + 1,
                `${id} / ${button.textContent} remains fully readable below the sticky packet header`);
        }
    }
    document.querySelector('#protocol-picker [data-protocol="https"]').click();
    const extras = document.querySelector("#protocol-overview-content .guide-extra");
    extras.open = true;
    assert($("protocol-format").getBoundingClientRect().height > 0 && $("protocol-operations").textContent.length > 10,
        "Expanded overview retains the full format and operation facts");
    extras.open = false;
    $("network-step").click();
    document.querySelector(".phase-message-list").open = true;
    assert($("protocol-phase-messages").getBoundingClientRect().height > 0, "Phase inspection remains available on demand");
    document.querySelector(".phase-message-list").open = false;
    const limits = document.querySelector(".protocol-caveats");
    limits.open = true;
    assert($("protocol-note").getBoundingClientRect().height > 0 && $("protocol-references").children.length > 0,
        "Model limits and standards remain available on demand");
    limits.open = false;
    $("protocol-overview-show").click();
    assert(panel.scrollTop === 0, "Changing field-guide view returns to its heading");
    return { passed, message: `${passed} field-guide fit assertions passed.` };
}
