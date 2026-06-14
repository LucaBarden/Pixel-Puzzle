"""Pixel Puzzle — a pixel art guessing quiz game."""

from __future__ import annotations

try:
    from importlib.metadata import version

    __version__: str = version("pixel-puzzle-game")
except Exception:
    __version__ = "0.0.0+editable"

__all__ = ["__version__"]
