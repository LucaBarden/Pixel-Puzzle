const PB_KEY_V2 = "pixel_puzzle_session_best_v2";
const PB_KEY_LEGACY = "pixel_puzzle_session_best";
const PB_KEY_LEGACY_INT = "pixel_puzzle_highscore";

const noopStorage = {
    getItem: () => null,
    setItem: () => {},
};

export function createStorage(localStorageImpl) {
    const localStorageRef =
        localStorageImpl ??
        (typeof localStorage !== "undefined" ? localStorage : noopStorage);
    function migrateLegacy() {
        const existing = localStorageRef.getItem(PB_KEY_V2);
        if (existing) return;

        for (const key of [PB_KEY_LEGACY, PB_KEY_LEGACY_INT]) {
            const raw = localStorageRef.getItem(key);
            if (!raw) continue;
            const total = parseInt(raw, 10);
            if (total > 0) {
                localStorageRef.setItem(
                    PB_KEY_V2,
                    JSON.stringify({ total, imageCount: 0, date: null })
                );
            }
            break;
        }
    }

    function getPersonalBest() {
        migrateLegacy();
        const raw = localStorageRef.getItem(PB_KEY_V2);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed.total === "number") return parsed;
        } catch {
            /* ignore corrupt data */
        }
        return null;
    }

    function savePersonalBest(total, imageCount) {
        const current = getPersonalBest();
        if (!current || total > current.total) {
            localStorageRef.setItem(
                PB_KEY_V2,
                JSON.stringify({
                    total,
                    imageCount,
                    date: new Date().toISOString(),
                })
            );
            return true;
        }
        return false;
    }

    function formatPersonalBest(pb) {
        if (!pb) return "";
        if (pb.imageCount > 0) {
            return `Rekord: ${pb.total} (${pb.imageCount} Bilder)`;
        }
        return `Rekord: ${pb.total}`;
    }

    function formatPersonalBestDate(pb) {
        if (!pb?.date) return "";
        try {
            return new Date(pb.date).toLocaleDateString("de-DE");
        } catch {
            return "";
        }
    }

    return {
        getPersonalBest,
        savePersonalBest,
        formatPersonalBest,
        formatPersonalBestDate,
    };
}

export const storage =
    typeof localStorage !== "undefined" ? createStorage(localStorage) : createStorage();
