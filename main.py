import logging
import os
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Load env variables from .env file if present
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("pixel_puzzle")

app = FastAPI(title="Pixel Puzzle")
app.add_middleware(GZipMiddleware, minimum_size=512)

# Resolve absolute path for robustness
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Configure image folder with env variable support
IMAGE_FOLDER = os.getenv("IMAGE_FOLDER", os.path.join(BASE_DIR, "images"))

# Automatically ensure image folder exists
if not os.path.exists(IMAGE_FOLDER):
    try:
        os.makedirs(IMAGE_FOLDER, exist_ok=True)
        logger.info(f"Created missing image directory at: {IMAGE_FOLDER}")
    except Exception as e:
        logger.error(f"Could not create image directory {IMAGE_FOLDER}: {e}")

# Mount static files and images
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

if os.path.exists(IMAGE_FOLDER):
    app.mount("/images", StaticFiles(directory=IMAGE_FOLDER), name="images")
else:
    logger.warning(f"Image folder {IMAGE_FOLDER} does not exist. /images path will not be mounted properly.")

def get_images_list():
    if not os.path.exists(IMAGE_FOLDER):
        logger.warning(f"Image folder {IMAGE_FOLDER} does not exist.")
        return []
    try:
        files = sorted(os.listdir(IMAGE_FOLDER))
        return [
            f"/images/{f}" for f in files if f.lower().endswith((".png", ".jpg", ".jpeg"))
        ]
    except Exception as e:
        logger.error(f"Error reading image folder {IMAGE_FOLDER}: {e}")
        return []

@app.get("/", response_class=HTMLResponse)
def index():
    index_path = os.path.join(BASE_DIR, "static", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse(
        "<html><body><h1>Pixel Puzzle</h1><p>Frontend template not found. Please ensure static/index.html exists.</p></body></html>", 
        status_code=404
    )

@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    favicon_path = os.path.join(BASE_DIR, "static", "favicon.svg")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path, media_type="image/svg+xml")
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

