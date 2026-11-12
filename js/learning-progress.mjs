export const LEARNING_STORAGE_KEY = "portfolio-learning:progress";
export const LEGACY_APPLIED_KEY = "portfolio-course:applied-networking";
const FORMAT = "portfolio-learning";
const VERSION = 1;
const isRecord = value => Boolean(value && typeof value === "object" && !Array.isArray(value));
const copy = value => structuredClone(value);

export function newLearningSnapshot() {
    return { format: FORMAT, version: VERSION, revision: "initial", savedAt: 0, legacyAppliedHandled: false, courses: {} };
}

export function validateLearningSnapshot(value, adapters) {
    if (!isRecord(value) || value.format !== FORMAT || value.version !== VERSION ||
        typeof value.revision !== "string" || !value.revision || value.revision.length > 100 ||
        !Number.isSafeInteger(value.savedAt) || value.savedAt < 0 ||
        typeof value.legacyAppliedHandled !== "boolean" || !isRecord(value.courses) ||
        Object.keys(value).some(key => !["format", "version", "revision", "savedAt", "legacyAppliedHandled", "courses"].includes(key))) {
        throw new TypeError("The saved learning progress format is invalid or unsupported.");
    }
    const courses = {};
    for (const [id, progress] of Object.entries(value.courses)) {
        if (!Object.hasOwn(adapters, id)) throw new TypeError("The saved progress contains an unknown course.");
        courses[id] = adapters[id].validate(progress);
    }
    return {
        format: FORMAT, version: VERSION, revision: value.revision, savedAt: value.savedAt,
        legacyAppliedHandled: value.legacyAppliedHandled, courses
    };
}

export function createLearningStore({ adapters, storage = () => window.localStorage, now = () => Date.now(), token } = {}) {
    if (!isRecord(adapters) || !Object.keys(adapters).length) throw new TypeError("Course progress adapters are required.");
    const nextToken = token || (() => globalThis.crypto?.randomUUID?.() || `${now()}-${Math.random().toString(36).slice(2)}`);
    const listeners = new Set();
    let snapshot = newLearningSnapshot();
    let savedRaw = null;
    let blocked = false;
    let issue = "";

    const notify = () => listeners.forEach(listener => listener());
    const fail = message => {
        blocked = true;
        issue = `${message} Current changes are held only in this tab. Export a backup if possible; existing saved data has not been intentionally cleared.`;
        notify();
    };
    const prepare = value => ({ ...value, revision: nextToken(), savedAt: now() });
    const write = next => {
        if (blocked) return false;
        try {
            const target = storage();
            if (target.getItem(LEARNING_STORAGE_KEY) !== savedRaw) {
                fail("Progress changed in another tab. Back up this tab's work and reload before continuing.");
                return false;
            }
            const raw = JSON.stringify(next);
            target.setItem(LEARNING_STORAGE_KEY, raw);
            savedRaw = raw;
            issue = "";
            notify();
            return true;
        } catch {
            fail("Browser storage could not save progress.");
            return false;
        }
    };

    try {
        const target = storage();
        savedRaw = target.getItem(LEARNING_STORAGE_KEY);
        if (savedRaw !== null) snapshot = validateLearningSnapshot(JSON.parse(savedRaw), adapters);
        if (!snapshot.legacyAppliedHandled) {
            const legacy = target.getItem(LEGACY_APPLIED_KEY);
            if (legacy !== null) {
                if (!Object.hasOwn(adapters, "applied-networking")) throw new TypeError("Applied Networking progress cannot be migrated.");
                const applied = adapters["applied-networking"].validate(JSON.parse(legacy));
                snapshot.courses["applied-networking"] = applied;
                snapshot.legacyAppliedHandled = true;
                snapshot = prepare(snapshot);
                write(snapshot);
            } else {
                snapshot.legacyAppliedHandled = true;
            }
        }
    } catch {
        fail("Saved course progress could not be read or uses an unsupported format.");
    }

    function course(id) {
        const adapter = adapters[id];
        if (!adapter) throw new RangeError("Unknown course.");
        return {
            load: () => copy(snapshot.courses[id] || adapter.empty()),
            save(value) {
                const validated = adapter.validate(value);
                if (JSON.stringify(snapshot.courses[id]) === JSON.stringify(validated)) return !blocked;
                snapshot = prepare({ ...snapshot, courses: { ...snapshot.courses, [id]: validated } });
                const saved = write(snapshot);
                if (!saved) notify();
                return saved;
            },
            reset() {
                if (blocked) return false;
                const previous = snapshot;
                snapshot = prepare({ ...snapshot, legacyAppliedHandled: true, courses: { ...snapshot.courses, [id]: adapter.empty() } });
                if (write(snapshot)) return true;
                snapshot = previous;
                notify();
                return false;
            },
            subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
            get blocked() { return blocked; },
            get issue() { return issue; }
        };
    }

    function replace(candidate, expectedRevision) {
        const validated = validateLearningSnapshot(candidate, adapters);
        if (expectedRevision !== snapshot.revision) throw new Error("Progress changed while the backup was being reviewed. Review it again.");
        let target;
        try {
            target = storage();
            if (target.getItem(LEARNING_STORAGE_KEY) !== savedRaw) throw new Error("Progress changed in another tab. Reload and review the backup again.");
            if (blocked && savedRaw !== null) {
                const recoveryKey = `${LEARNING_STORAGE_KEY}:preserved:${nextToken()}`;
                target.setItem(recoveryKey, savedRaw);
            }
            const next = prepare({ ...validated, legacyAppliedHandled: true });
            const raw = JSON.stringify(next);
            target.setItem(LEARNING_STORAGE_KEY, raw);
            snapshot = next;
            savedRaw = raw;
            blocked = false;
            issue = "";
            notify();
            return true;
        } catch (error) {
            issue = error.message || "The backup could not be restored.";
            blocked = true;
            notify();
            return false;
        }
    }

    function observeExternal(event) {
        if (event.key === LEARNING_STORAGE_KEY && event.newValue !== savedRaw) {
            fail("Progress changed in another tab. Back up this tab's work and reload before continuing.");
        }
    }

    return {
        course,
        snapshot: () => copy(snapshot),
        validate: value => validateLearningSnapshot(value, adapters),
        replace,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        observeExternal,
        get revision() { return snapshot.revision; },
        get blocked() { return blocked; },
        get issue() { return issue; }
    };
}
