# Pixel Puzzle

A pixel art guessing quiz game. The server reads image files from a folder
you point it at, exposes a small JSON API listing them, and ships a static
front-end that turns those images into a guess-the-pixel-art quiz.

## Features

- FastAPI backend with a single `/api/images` JSON endpoint.
- Static front-end (vanilla HTML/CSS/JS) bundled with the package.
- Long-lived cache headers for versioned assets, `no-cache` for `index.html`.
- GZip middleware for text payloads.
- Image-folder caching keyed on directory mtime.
- Environment-driven configuration (`HOST`, `PORT`, `IMAGE_FOLDER`).

## Requirements

- Python 3.14 or newer.

## Installation

Install with [`uv`](https://docs.astral.sh/uv/) as a standalone tool:

```bash
uv tool install pixel-puzzle
```

Or, alternatively, run it ephemerally:

```bash
uvx pixel-puzzle
```

Or, install it into a project virtual environment with:

```bash
uv add pixel-puzzle
```

## Usage

Drop pixel art images (`.png`, `.jpg`, `.jpeg`) into a directory, then point
the server at it via the `IMAGE_FOLDER` environment variable (default: a
folder named `images` in the current working directory):

```bash
IMAGE_FOLDER=/path/to/pixel-art pixel-puzzle
```

Open <http://localhost:8000> and start guessing.

### Configuration

| Variable        | Default              | Description                              |
|-----------------|----------------------|------------------------------------------|
| `HOST`          | `0.0.0.0`            | Interface for uvicorn to bind.           |
| `PORT`          | `8000`               | TCP port for the HTTP server.            |
| `IMAGE_FOLDER`  | `./images`           | Directory scanned for image files.       |

## Development

Clone the repository and sync the dev environment:

```bash
git clone https://github.com/luca/Pixel-Puzzle.git
cd Pixel-Puzzle
uv sync --extra dev
```

Run the test suite:

```bash
uv run pytest
```

Run the server from a working copy:

```bash
uv run pixel-puzzle
```

## Project layout

```
src/pixel_puzzle/
    __init__.py
    __main__.py        # console-script entry point
    app.py             # FastAPI application
    static/            # HTML, JS, CSS, fonts
tests/
pyproject.toml
```

## License

MIT. See the project metadata in `pyproject.toml` for the canonical notice.
