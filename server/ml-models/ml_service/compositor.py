"""
Glyph Compositor - Fast SVG rendering from user-drawn stroke samples.

Renders custom handwriting by placing user-drawn letter strokes with
natural variation (baseline wobble, character jitter, pressure variation).
"""
import math
import random
from typing import List, Dict, Optional


def _strokes_to_svg_path(strokes: list, offset_x: float, offset_y: float,
                          scale: float = 1.0, slant_rad: float = 0.0) -> str:
    """
    Convert a list of stroke arrays [{x,y},...] into SVG path d-string
    positioned at (offset_x, offset_y) with optional scale and slant.
    """
    path_parts = []
    for stroke in strokes:
        if not stroke or len(stroke) < 2:
            continue
        first = True
        for pt in stroke:
            px = pt.get('x', pt.get('X', 0))
            py = pt.get('y', pt.get('Y', 0))
            # Apply scale
            sx = px * scale
            sy = py * scale
            # Apply slant (shear X based on Y)
            sx += sy * math.tan(slant_rad)
            # Apply offset
            fx = offset_x + sx
            fy = offset_y + sy
            cmd = 'M' if first else 'L'
            path_parts.append(f"{cmd}{fx:.1f},{fy:.1f}")
            first = False
    return ' '.join(path_parts)


def _get_stroke_bounds(strokes: list) -> tuple:
    """Get bounding box (min_x, min_y, max_x, max_y) of strokes."""
    xs, ys = [], []
    for stroke in strokes:
        for pt in stroke:
            xs.append(pt.get('x', pt.get('X', 0)))
            ys.append(pt.get('y', pt.get('Y', 0)))
    if not xs:
        return (0, 0, 0, 0)
    return (min(xs), min(ys), max(xs), max(ys))


def _normalize_strokes(strokes: list, target_height: float = 40.0) -> tuple:
    """
    Normalize strokes to fit within a target height, returning
    (normalized_strokes, width, height).
    """
    min_x, min_y, max_x, max_y = _get_stroke_bounds(strokes)
    w = max_x - min_x
    h = max_y - min_y
    if h < 1:
        h = 1
    scale = target_height / h

    normalized = []
    for stroke in strokes:
        norm_stroke = []
        for pt in stroke:
            px = pt.get('x', pt.get('X', 0))
            py = pt.get('y', pt.get('Y', 0))
            norm_stroke.append({
                'x': (px - min_x) * scale,
                'y': (py - min_y) * scale,
            })
        normalized.append(norm_stroke)

    return normalized, w * scale, target_height


def compose_handwriting(
    text: str,
    samples: List[Dict],
    slant: float = 0,
    size: float = 100,
    spacing: float = 50,
    ink_weight: float = 50,
    stroke_color: str = "black",
) -> str:
    """
    Compose handwritten SVG from user-drawn letter stroke samples.

    Args:
        text: The text to render
        samples: List of dicts with 'char' and 'strokes' keys from onboarding
        slant: Slant angle in degrees (-30 to 30)
        size: Size percentage (50 to 200)
        spacing: Letter spacing (0 to 100), 50 = default
        ink_weight: Ink thickness (0 to 100)
        stroke_color: SVG stroke color

    Returns:
        SVG string
    """
    # Build char→strokes lookup
    char_map: Dict[str, list] = {}
    for sample in samples:
        ch = sample.get('char', '')
        strokes = sample.get('strokes', [])
        if ch and strokes:
            char_map[ch] = strokes

    # Normalize each character's strokes to a consistent height
    glyph_height = 40.0 * (size / 100.0)
    norm_cache: Dict[str, tuple] = {}  # char -> (normalized_strokes, width, height)
    for ch, strokes in char_map.items():
        norm_cache[ch] = _normalize_strokes(strokes, glyph_height)

    # Rendering parameters
    slant_rad = math.radians(slant) * 0.5
    spacing_factor = 0.5 + (spacing / 100.0)
    base_gap = glyph_height * 0.25 * spacing_factor
    space_width = glyph_height * 0.5 * spacing_factor
    stroke_width = max(0.5, 1 + (ink_weight / 50))
    line_height = glyph_height * 2.0
    left_margin = 40
    top_margin = 30

    # Split text into lines
    lines = text.split('\n')
    if not lines:
        lines = [' ']

    # Build paths
    svg_paths = []
    cursor_y = top_margin
    max_x = 0

    for line_text in lines:
        cursor_x = left_margin

        for ch in line_text:
            if ch == ' ':
                cursor_x += space_width
                continue

            # Look up the character (try exact, then case-insensitive)
            strokes_data = None
            norm_data = None
            if ch in norm_cache:
                norm_data = norm_cache[ch]
                strokes_data = norm_data[0]
            elif ch.lower() in norm_cache:
                norm_data = norm_cache[ch.lower()]
                strokes_data = norm_data[0]
            elif ch.upper() in norm_cache:
                norm_data = norm_cache[ch.upper()]
                strokes_data = norm_data[0]

            if strokes_data is None:
                # Character not in samples — render as a simple placeholder dot
                cursor_x += glyph_height * 0.4 + base_gap
                continue

            glyph_w = norm_data[1]

            # Apply natural variation (jitter)
            jitter_x = random.gauss(0, glyph_height * 0.02)
            jitter_y = random.gauss(0, glyph_height * 0.03)
            # Baseline wobble (gentle sine wave)
            wobble_y = math.sin(cursor_x * 0.02) * glyph_height * 0.05

            path_d = _strokes_to_svg_path(
                strokes_data,
                offset_x=cursor_x + jitter_x,
                offset_y=cursor_y + jitter_y + wobble_y,
                scale=1.0,
                slant_rad=slant_rad,
            )

            if path_d:
                # Slight stroke width variation for realism
                sw_var = stroke_width * random.uniform(0.9, 1.1)
                svg_paths.append(
                    f'<path d="{path_d}" stroke="{stroke_color}" '
                    f'stroke-width="{sw_var:.2f}" fill="none" '
                    f'stroke-linecap="round" stroke-linejoin="round"/>'
                )

            cursor_x += glyph_w + base_gap

        max_x = max(max_x, cursor_x)
        cursor_y += line_height

    # Build SVG
    svg_width = max(max_x + left_margin, 600)
    svg_height = cursor_y + top_margin
    paths_str = '\n'.join(svg_paths)

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {svg_width:.0f} {svg_height:.0f}">\n'
        f'<rect width="{svg_width:.0f}" height="{svg_height:.0f}" fill="white"/>\n'
        f'{paths_str}\n'
        f'</svg>'
    )

    return svg
