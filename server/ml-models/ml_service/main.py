"""
ML Service - FastAPI Application
Bridges Node.js backend with Python ML models (HWT + Calligrapher.ai)
"""
import asyncio
import os
import base64
import tempfile
import time
from functools import partial
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import wrappers
from calligrapher_wrapper import (
    generate_handwriting,
    get_available_styles,
    preload as preload_calligrapher,
    preload_async as preload_calligrapher_async,
    get_model_state as get_calligrapher_model_state,
    get_preload_error as get_calligrapher_preload_error,
    cache_stats as get_cache_stats,
)
from hwt_wrapper import extract_style_from_image, generate_hwt_handwriting, load_style, list_styles, delete_style, build_style_from_samples
from compositor import compose_handwriting


# Pydantic models for request/response
class BuildStyleRequest(BaseModel):
    name: str = Field(..., description="Name for the custom style")
    samples: list = Field(..., description="List of CharSample dicts with char, strokes, timestamp")


class GenerateRequest(BaseModel):
    text: str = Field(..., description="Text to convert to handwriting")
    style_id: str = Field(default="0", description="Style ID: 0-14 for predefined, custom_* for drawn, style_* for HWT")
    bias: float = Field(default=0.75, ge=0.0, le=1.0, description="Randomness (0=random, 1=deterministic)")
    stroke_color: str = Field(default="black", description="SVG stroke color")
    stroke_width: int = Field(default=2, ge=1, le=10, description="SVG stroke width")
    slant: float = Field(default=0, ge=-30, le=30, description="Slant angle in degrees")
    size: float = Field(default=100, ge=50, le=200, description="Size percentage")
    spacing: float = Field(default=50, ge=0, le=100, description="Letter spacing")
    ink_weight: float = Field(default=50, ge=0, le=100, description="Ink weight/stroke thickness")


class GenerateResponse(BaseModel):
    svg: str
    lines_count: int
    status: str = "success"


class ExtractStyleResponse(BaseModel):
    style_id: str
    embedding_size: int
    status: str


class StyleInfo(BaseModel):
    style_id: str
    metadata: dict


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict


class WarmupResponse(BaseModel):
    status: str
    model_state: str
    detail: Optional[str] = None


# Lifespan for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("ML Service starting up...")
    preload_mode = os.environ.get("CALLIGRAPHER_PRELOAD_MODE", "async").lower()
    if preload_mode not in {"off", "async", "sync"}:
        print(f"Unknown CALLIGRAPHER_PRELOAD_MODE='{preload_mode}', defaulting to async")
        preload_mode = "async"

    if preload_mode == "sync":
        print("Preloading Calligrapher.ai model synchronously...")
        preload_calligrapher()
    elif preload_mode == "async":
        print("Starting Calligrapher.ai background preload...")
        preload_calligrapher_async()

    yield
    print("ML Service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="HandScript AI - ML Service",
    description="Python bridge for handwriting ML models",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    model_state = get_calligrapher_model_state()
    return {
        "status": "healthy" if model_state in {"ready", "warming"} else "unhealthy",
        "models_loaded": {
            "calligrapher": model_state == "ready",
            "calligrapher_state": model_state,
            "hwt": True
        }
    }


@app.post("/warmup", response_model=WarmupResponse)
async def warmup_calligrapher():
    """Trigger background model warmup and return current state."""
    preload_calligrapher_async()
    return {
        "status": "accepted",
        "model_state": get_calligrapher_model_state(),
        "detail": get_calligrapher_preload_error(),
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate handwritten SVG from text.

    Routes by style_id prefix:
      0-12      → Calligrapher.ai LSTM (parallel lines, LRU-cached)
      custom_*  → Glyph Compositor  (instant, from canvas strokes)
      style_*   → HWT Transformer   (extracted image style)
    """
    try:
        t0          = time.perf_counter()
        sid         = request.style_id.strip()
        lines_count = len(request.text.split('\n'))
        loop        = asyncio.get_event_loop()

        # ── Route 1: custom canvas style ──────────────────────────────────────
        if sid.startswith('custom_'):
            style_data = load_style(sid)
            if not style_data:
                raise HTTPException(status_code=404, detail=f"Custom style {sid} not found")
            # compositor is pure Python / CPU — run in executor to stay async
            svg = await loop.run_in_executor(
                None,
                partial(
                    compose_handwriting,
                    text=request.text,
                    samples=style_data.get('samples', []),
                    slant=request.slant,
                    size=request.size,
                    spacing=request.spacing,
                    ink_weight=request.ink_weight,
                    stroke_color=request.stroke_color,
                )
            )
            ms = round((time.perf_counter() - t0) * 1000, 2)
            print(f"/generate [compositor] {ms}ms")
            return {"svg": svg, "lines_count": lines_count, "status": "success"}

        # ── Route 2: HWT extracted style ──────────────────────────────────────
        if sid.startswith('style_'):
            svg = await loop.run_in_executor(
                None,
                partial(generate_hwt_handwriting, style_id=sid, text=request.text)
            )
            ms = round((time.perf_counter() - t0) * 1000, 2)
            print(f"/generate [hwt] {ms}ms")
            return {"svg": svg, "lines_count": lines_count, "status": "success"}

        # ── Route 3: Calligrapher.ai predefined style (0-12) ──────────────────
        try:
            style_num = int(sid)
        except ValueError:
            style_num = 0

        model_state = get_calligrapher_model_state()
        if model_state in {'idle', 'error'}:
            preload_calligrapher_async()

        stroke_width = max(1, min(4, 1 + int(request.ink_weight / 33)))

        # Run the CPU-bound TF inference in a thread pool executor so the
        # event loop (and other requests) are never blocked.
        svg = await loop.run_in_executor(
            None,
            partial(
                generate_handwriting,
                text=request.text,
                style=style_num,
                bias=request.bias,
                stroke_color=request.stroke_color,
                stroke_width=stroke_width,
                slant=request.slant,
                size=request.size,
                spacing=request.spacing,
            )
        )

        ms = round((time.perf_counter() - t0) * 1000, 2)
        print(f"/generate [calligrapher] {ms}ms  state={get_calligrapher_model_state()}")

        return {"svg": svg, "lines_count": lines_count, "status": "success"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/cache/stats")
async def cache_stats_endpoint():
    """Return SVG LRU cache statistics."""
    return get_cache_stats()


@app.delete("/cache")
async def clear_cache():
    """Flush the SVG LRU cache (useful after model changes)."""
    from calligrapher_wrapper import _svg_cache, _cache_lock
    with _cache_lock:
        count = len(_svg_cache)
        _svg_cache.clear()
    return {"cleared": count, "status": "ok"}



@app.get("/styles/available")
async def get_predefined_styles():
    """Get list of available predefined styles"""
    return {
        "styles": get_available_styles(),
        "description": "Predefined handwriting styles (0-14)"
    }


@app.post("/styles/build")
async def build_style(request: BuildStyleRequest):
    """
    Build a custom style from user-drawn stroke samples (Onboarding flow).

    Saves the stroke data for future HWT processing and returns style info.
    """
    try:
        if not request.name or not request.name.strip():
            raise HTTPException(status_code=400, detail="Style name is required")

        if not request.samples or len(request.samples) == 0:
            raise HTTPException(status_code=400, detail="At least one character sample is required")

        style = build_style_from_samples(
            name=request.name.strip(),
            samples=request.samples
        )

        return {"style": style, "status": "created"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-style", response_model=ExtractStyleResponse)
async def extract_style(file: UploadFile = File(...)):
    """
    Extract handwriting style from an uploaded image.
    
    Uses HWT model to analyze handwriting and create a style embedding.
    """
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Extract style
            result = extract_style_from_image(tmp_path)
            return result
        finally:
            # Cleanup
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/extract-style-base64", response_model=ExtractStyleResponse)
async def extract_style_base64(data: dict):
    """
    Extract handwriting style from a base64 encoded image.
    """
    if 'image' not in data:
        raise HTTPException(status_code=400, detail="Missing 'image' field")
    
    try:
        # Decode base64
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        
        try:
            result = extract_style_from_image(tmp_path)
            return result
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/styles", response_model=list[StyleInfo])
async def get_saved_styles():
    """Get all saved user styles"""
    return list_styles()


@app.get("/styles/{style_id}")
async def get_style(style_id: str):
    """Get a specific saved style"""
    style = load_style(style_id)
    if not style:
        raise HTTPException(status_code=404, detail="Style not found")
    return style


@app.delete("/styles/{style_id}")
async def remove_style(style_id: str):
    """Delete a saved style"""
    if delete_style(style_id):
        return {"status": "deleted", "style_id": style_id}
    raise HTTPException(status_code=404, detail="Style not found")


# Main entry point
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.environ.get("ML_SERVICE_PORT", 8001))
    host = os.environ.get("ML_SERVICE_HOST", "127.0.0.1")
    
    print(f"Starting ML Service on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
