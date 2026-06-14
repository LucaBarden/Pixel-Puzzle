"""Console-script entry point: ``pixel-puzzle``."""

from __future__ import annotations

import logging
import os
import sys

import uvicorn

logger = logging.getLogger("pixel_puzzle")


def main() -> None:
    """Start the FastAPI app under uvicorn."""
    if "--version" in sys.argv or "-V" in sys.argv:
        try:
            from importlib.metadata import version

            print(f"pixel-puzzle {version('pixel-puzzle-game')}")
        except Exception:
            from pixel_puzzle import __version__

            print(f"pixel-puzzle {__version__}")
        raise SystemExit(0)

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("pixel_puzzle.app:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
