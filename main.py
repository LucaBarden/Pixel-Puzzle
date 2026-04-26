from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI()

IMAGE_FOLDER = "images"

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/images", StaticFiles(directory=IMAGE_FOLDER), name="images")


def get_images():
    files = sorted(os.listdir(IMAGE_FOLDER))
    return [
        f"/images/{f}" for f in files if f.lower().endswith((".png", ".jpg", ".jpeg"))
    ]


@app.get("/", response_class=HTMLResponse)
def index():
    images = get_images()

    return f"""
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Pixel Quiz</title>

    <!-- Tailwind CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="bg-zinc-900 text-white flex items-center justify-center min-h-screen">

    <div class="flex justify-center w-full px-6">
    
        <div id="card" class="bg-zinc-800 rounded-2xl shadow-2xl p-6 text-center inline-block">

            <h1 class="text-3xl font-bold mb-4">Pixel Quiz</h1>

            <!-- Canvas -->
            <div class="flex justify-center">
                <canvas id="canvas" class="rounded-lg border border-zinc-700"></canvas>
            </div>

            <!-- Score + Status -->
            <div class="mt-4 flex justify-between items-center">
                <div id="score" class="text-xl font-semibold">
                    Score: 1000
                </div>

                <div id="status" class="text-sm text-zinc-400">
                    Bereit
                </div>
            </div>

            <!-- Controls -->
            <div class="mt-4 text-sm text-zinc-400">
                <span class="px-2 py-1 bg-zinc-700 rounded">SPACE</span> Start / Pause
                <span class="mx-2">|</span>
                <span class="px-2 py-1 bg-zinc-700 rounded">N</span> Nächstes Bild
            </div>

        </div>

    </div>

    <script>
        const IMAGES = {images};
    </script>
    <script src="/static/app.js"></script>

</body>
</html>
"""
