import { makeRecoveryCode, readRecoveryCode, MAX_BACKUP_TEXT } from "./learning-backup.mjs";
import { assessmentGrade, openModulePassed } from "./open-course-progress.mjs";
import { moduleComplete } from "./course-progression.mjs";

const LAST_BACKUP_KEY = "portfolio-learning:last-backup-revision";
const make = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
};

function describeCourse(snapshot, definition) {
    const progress = snapshot.courses[definition.id];
    if (!progress) return "Not started";
    if (definition.kind === "open") {
        const checked = definition.modules.filter(module => progress.assessments[module.id]?.latest).length;
        const passed = definition.modules.filter(module => openModulePassed(progress, module)).length;
        const final = definition.final && progress.assessments.final
            ? assessmentGrade(definition.final, progress.assessments.final.best) : null;
        return `${definition.prerequisite ? `${passed} passed` : `${checked} checked`}/${definition.modules.length} modules · ${progress.studied.length} lessons studied${final ? ` · final best ${final.correct}/${final.total}` : ""}`;
    }
    const count = definition.course.modules.filter(module => moduleComplete(progress, module.id)).length;
    const final = progress.final ? `${progress.final.correct}/${progress.final.total}` : "not submitted";
    return `${count}/${definition.course.modules.length} modules complete · ${progress.studied.length} lessons studied${definition.course.capstone ? ` · capstone ${progress.capstone ? "passed" : "not passed"}` : ""} · final best ${final}`;
}

export function initializeLearningBackup({ store, definitions }) {
    const $ = id => document.getElementById(id);
    const dialog = $("learning-backup");
    const open = $("learning-backup-open");
    const reminder = $("learning-backup-reminder");
    const status = $("learning-backup-status");
    const output = $("learning-backup-code");
    const input = $("learning-backup-import");
    const file = $("learning-backup-file");
    const download = $("learning-backup-download");
    const comparison = $("learning-backup-comparison");
    const replace = $("learning-backup-replace");
    let downloadUrl = null;
    let pending = null;
    let lastBackup = null;
    let previewVersion = 0;
    try { lastBackup = window.localStorage.getItem(LAST_BACKUP_KEY); } catch { lastBackup = null; }

    const updateReminder = () => {
        const hasWork = Object.keys(store.snapshot().courses).length > 0;
        reminder.textContent = lastBackup === store.revision && hasWork ? "Backup generated for current work" : lastBackup ? "Backup may be outdated" : hasWork ? "No backup generated" : "No backup yet";
        open.classList.toggle("learning-backup-outdated", Boolean(hasWork && lastBackup !== store.revision));
    };
    const clearPreview = () => {
        previewVersion++;
        pending = null;
        comparison.replaceChildren();
        comparison.hidden = true;
        replace.disabled = true;
    };
    const message = (text, error = false) => {
        status.textContent = text;
        status.classList.toggle("learning-backup-error", error);
    };
    store.subscribe(() => {
        updateReminder();
        if (pending && pending.revision !== store.revision) {
            clearPreview();
            message("Progress changed after the comparison. Preview the backup again.", true);
        }
    });
    updateReminder();
    open.addEventListener("click", () => { dialog.showModal(); $("learning-backup-close").focus(); });
    $("learning-backup-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => open.focus({ preventScroll: true }));
    input.addEventListener("input", clearPreview);
    file.addEventListener("change", async () => {
        clearPreview();
        const version = previewVersion;
        const selected = file.files?.[0];
        if (!selected) return;
        if (selected.size > MAX_BACKUP_TEXT) { message("That file exceeds the backup size limit.", true); return; }
        try {
            const text = await selected.text();
            if (version !== previewVersion) return;
            input.value = text;
            message("File loaded. Preview it before replacing any progress.");
        } catch {
            if (version === previewVersion) message("The selected file could not be read. Try another file or paste the recovery code.", true);
        }
    });

    $("learning-backup-generate").addEventListener("click", async () => {
        const generate = $("learning-backup-generate");
        generate.disabled = true;
        message("Preparing a local backup…");
        try {
            const snapshot = store.validate(store.snapshot());
            const code = await makeRecoveryCode(snapshot);
            output.value = code;
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            downloadUrl = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
            download.href = downloadUrl;
            download.hidden = false;
            lastBackup = snapshot.revision;
            let reminderSaved = true;
            try { window.localStorage.setItem(LAST_BACKUP_KEY, lastBackup); } catch { reminderSaved = false; }
            updateReminder();
            message(reminderSaved
                ? "Backup generated. Copy or download it somewhere safe; generating it does not save it elsewhere."
                : "Backup generated, but this browser could not save the backup reminder. Copy or download the code somewhere safe.");
        } catch (error) { message(error.message || "The backup could not be generated.", true); }
        finally { generate.disabled = false; }
    });
    $("learning-backup-copy").addEventListener("click", async () => {
        if (!output.value) { message("Generate a backup before copying it.", true); return; }
        try {
            if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable.");
            await navigator.clipboard.writeText(output.value);
            message("Copied. Save the code outside this browser's site data.");
        } catch {
            output.focus();
            output.select();
            message("Clipboard access failed. The complete code is selected; copy it manually.", true);
        }
    });
    $("learning-backup-preview").addEventListener("click", async () => {
        clearPreview();
        const version = previewVersion;
        message("Checking the backup…");
        try {
            const restored = await readRecoveryCode(input.value, value => store.validate(value));
            if (version !== previewVersion) return;
            const current = store.snapshot();
            const table = make("table", undefined, "learning-backup-table");
            table.append(make("caption", "Current progress compared with the backup"));
            const head = make("thead");
            const heading = make("tr");
            ["Course", "Current browser", "Backup"].forEach(text => {
                const th = make("th", text); th.scope = "col"; heading.append(th);
            });
            head.append(heading); table.append(head);
            const body = make("tbody");
            definitions.forEach(definition => {
                const row = make("tr");
                const title = make("th", definition.title); title.scope = "row";
                row.append(title, make("td", describeCourse(current, definition)), make("td", describeCourse(restored, definition)));
                body.append(row);
            });
            table.append(body);
            comparison.replaceChildren(make("p", "Replacement affects all listed courses, including courses shown as not started in the backup. Export current work first if you need to keep it."), table);
            comparison.hidden = false;
            pending = { snapshot: restored, revision: current.revision };
            replace.disabled = false;
            message("Backup validated. Review the comparison before confirming replacement.");
        } catch (error) {
            if (version === previewVersion) message(error.message || "The backup could not be validated.", true);
        }
    });
    replace.addEventListener("click", () => {
        if (!pending) { message("Preview a valid backup first.", true); return; }
        if (!window.confirm("Replace all course progress with the reviewed backup? Your theme and unrelated site data will not be changed.")) return;
        try {
            if (!store.replace(pending.snapshot, pending.revision)) { message(store.issue || "The backup could not be restored.", true); clearPreview(); return; }
            clearPreview();
            message("Progress restored. Reloading the courses with the recovered state.");
            window.location.reload();
        } catch (error) { clearPreview(); message(error.message || "The backup could not be restored.", true); }
    });
    window.addEventListener("pagehide", () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); });
}
