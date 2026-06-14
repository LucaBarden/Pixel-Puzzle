FROM python:3.14-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock ./
COPY README.md ./

RUN uv sync --frozen --no-dev

COPY src/ ./src/

RUN mkdir -p images

EXPOSE 8000

CMD ["uv", "run", "pixel-puzzle"]
