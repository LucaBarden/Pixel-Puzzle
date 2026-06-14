"""Console-script entry point: ``pixel-puzzle``."""

from __future__ import annotations

import logging
import os

import uvicorn

logger = logging.getLogger("pixel_puzzle")


def main() -> None:
    """Start the FastAPI app under uvicorn."""
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("pixel_puzzle.app:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
