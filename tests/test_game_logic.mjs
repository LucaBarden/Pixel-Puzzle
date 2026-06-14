import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    computeScore,
    computePixelSize,
    accumulateSessionTotal,
    isGameComplete,
    formatProgress,
} from "../static/js/game-logic.js";
import { createStorage } from "../static/js/storage.js";
import { GAME } from "../static/js/config.js";

describe("game-logic", () => {
    it("computeScore at start is MAX_SCORE", () => {
        assert.equal(computeScore(0), GAME.MAX_SCORE);
    });

    it("computeScore at end is 0", () => {
        assert.equal(computeScore(1), 0);
    });

    it("computePixelSize decreases with progress", () => {
        assert.equal(computePixelSize(0), GAME.INITIAL_PIXEL_SIZE);
        assert.equal(computePixelSize(1), 1);
    });

    it("accumulateSessionTotal sums scores", () => {
        assert.equal(accumulateSessionTotal(100, 250), 350);
    });

    it("isGameComplete when index reaches length", () => {
        assert.equal(isGameComplete(3, 3), true);
        assert.equal(isGameComplete(2, 3), false);
    });

    it("formatProgress shows current image", () => {
        assert.equal(formatProgress(0, 5), "Bild 1 / 5");
        assert.equal(formatProgress(0, 0), "—");
    });
});

describe("storage", () => {
    it("savePersonalBest stores best session total", () => {
        const map = new Map();
        const ls = {
            getItem: (k) => map.get(k) ?? null,
            setItem: (k, v) => map.set(k, v),
        };
        const s = createStorage(ls);

        assert.equal(s.savePersonalBest(1000, 3), true);
        assert.equal(s.getPersonalBest().total, 1000);
        assert.equal(s.getPersonalBest().imageCount, 3);

        assert.equal(s.savePersonalBest(800, 3), false);
        assert.equal(s.savePersonalBest(1200, 4), true);
        assert.equal(s.getPersonalBest().total, 1200);
    });

    it("migrates legacy integer key", () => {
        const map = new Map([["pixel_puzzle_session_best", "500"]]);
        const ls = {
            getItem: (k) => map.get(k) ?? null,
            setItem: (k, v) => map.set(k, v),
        };
        const s = createStorage(ls);
        const pb = s.getPersonalBest();
        assert.equal(pb.total, 500);
    });
});
