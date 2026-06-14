import logging
import os
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.staticfiles import StaticFiles as StarletteStaticFiles
from starlette.responses import Response

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("pixel_puzzle")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_FOLDER = os.getenv("IMAGE_FOLDER", os.path.join(BASE_DIR, "images"))

_images_cache: list[str] | None = None
_images_cache_mtime: float | None = None

CACHE_IMMUTABLE = "public, max-age=31536000, immutable"
CACHE_NO_CACHE = "no-cache"


class CachedStaticFiles(StarletteStaticFiles):
    """StaticFiles with long-lived cache headers for versioned assets."""

    async def get_response(self, path: str, scope) -> Response:
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = CACHE_IMMUTABLE
        return response


app = FastAPI(title="Pixel Puzzle")
app.add_middleware(GZipMiddleware, minimum_size=512)

if not os.path.exists(IMAGE_FOLDER):
    try:
        os.makedirs(IMAGE_FOLDER, exist_ok=True)
        logger.info(f"Created missing image directory at: {IMAGE_FOLDER}")
    except Exception as e:
        logger.error(f"Could not create image directory {IMAGE_FOLDER}: {e}")

app.mount("/static", CachedStaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

if os.path.exists(IMAGE_FOLDER):
    app.mount("/images", StaticFiles(directory=IMAGE_FOLDER), name="images")
else:
    logger.warning(f"Image folder {IMAGE_FOLDER} does not exist. /images path will not be mounted properly.")


def get_images_list() -> list[str]:
    global _images_cache, _images_cache_mtime

    if not os.path.exists(IMAGE_FOLDER):
        logger.warning(f"Image folder {IMAGE_FOLDER} does not exist.")
        return []

    try:
        folder_mtime = os.path.getmtime(IMAGE_FOLDER)
        if _images_cache is not None and _images_cache_mtime == folder_mtime:
            return _images_cache

        files = sorted(os.listdir(IMAGE_FOLDER))
        _images_cache = [
            f"/images/{f}" for f in files if f.lower().endswith((".png", ".jpg", ".jpeg"))
        ]
        _images_cache_mtime = folder_mtime
        return _images_cache
    except Exception as e:
        logger.error(f"Error reading image folder {IMAGE_FOLDER}: {e}")
        return []


@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(BASE_DIR, "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, headers={"Cache-Control": CACHE_NO_CACHE})
    return HTMLResponse(
        "<html><body><h1>Pixel Puzzle</h1><p>Frontend template not found.</p></body></html>",
        status_code=404,
    )


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    favicon_path = os.path.join(BASE_DIR, "static", "favicon.svg")
    if os.path.exists(favicon_path):
        return FileResponse(
            favicon_path,
            media_type="image/svg+xml",
            headers={"Cache-Control": CACHE_IMMUTABLE},
        )
    return HTMLResponse(status_code=404)


@app.get("/api/images")
def api_images():
    images = get_images_list()
    return JSONResponse(content={"images": images})


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=False)
