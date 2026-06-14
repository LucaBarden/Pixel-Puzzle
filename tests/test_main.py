"""Tests for the Pixel Puzzle FastAPI app."""

from fastapi.testclient import TestClient

from pixel_puzzle.app import app

client = TestClient(app)


def test_index_returns_200():
    response = client.get("/")
    assert response.status_code == 200
    assert "Pixel Quiz" in response.text
    assert response.headers.get("Cache-Control") == "no-cache"


def test_api_images_returns_json_list():
    response = client.get("/api/images")
    assert response.status_code == 200
    data = response.json()
    assert "images" in data
    assert isinstance(data["images"], list)


def test_api_images_cache_returns_same_result():
    first = client.get("/api/images").json()
    second = client.get("/api/images").json()
    assert first == second


def test_static_js_has_cache_control():
    response = client.get("/static/js/config.js")
    assert response.status_code == 200
    assert response.headers.get("Cache-Control") == "public, max-age=31536000, immutable"


def test_static_fonts_css():
    response = client.get("/static/fonts.css")
    assert response.status_code == 200
    assert "Outfit" in response.text
