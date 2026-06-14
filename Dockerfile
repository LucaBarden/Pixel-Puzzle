FROM python:3.12-slim

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen --no-dev

COPY main.py ./
COPY static/ ./static/

RUN mkdir -p images

EXPOSE 8000

CMD ["uv", "run", "python", "main.py"]
