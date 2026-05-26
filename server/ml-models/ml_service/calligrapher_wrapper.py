"""
Calligrapher.ai Wrapper - Text to SVG Handwriting Generation
"""
import os
import sys
import re
import threading
import contextlib
from typing import Optional

# Add calligrapher directory to path
CALLIGRAPHER_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'calligrapher'))
CALLIGRAPHER_STYLES_DIR = os.path.join(CALLIGRAPHER_DIR, 'styles')
sys.path.insert(0, CALLIGRAPHER_DIR)

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# The calligrapher model only has style files 0-12
MAX_STYLE = 12

# Characters the calligrapher model understands (from drawing.py alphabet)
CALLIGRAPHER_ALPHABET = set(
    '\x00 !"#\'(),-.0123456789:;?'
    'ABCDEFGHIJKLMNOPRSTUVWYabcdefghijklmnopqrstuvwxyz'
)

_hand_instance = None
_preload_lock = threading.Lock()
_preload_thread: Optional[threading.Thread] = None
_preload_error: Optional[str] = None


def sanitize_text(text: str) -> str:
    """
    Remove or replace characters that the calligrapher model doesn't support.
    Unsupported chars are replaced with a space so words don't merge together.
    """
    result = []
    for ch in text:
        if ch == '\n':
            result.append(ch)        # keep newlines for line splitting
        elif ch in CALLIGRAPHER_ALPHABET:
            result.append(ch)
        else:
            result.append(' ')       # replace unsupported char with space
    # Collapse multiple consecutive spaces into one
    cleaned = re.sub(r' +', ' ', ''.join(result))
    return cleaned.strip()


@contextlib.contextmanager
def _calligrapher_cwd():
    """
    Thread-safe context manager that temporarily changes the working directory
    to CALLIGRAPHER_DIR so the model can load its relative-path style files.
    Uses a per-thread lock to prevent races between concurrent requests.
    """
    with _preload_lock:
        original_dir = os.getcwd()
        os.chdir(CALLIGRAPHER_DIR)
        try:
            yield
        finally:
            os.chdir(original_dir)



def get_hand():
    """Lazy load the Hand model (singleton pattern)"""
    global _hand_instance, _preload_error
    if _hand_instance is not None:
        return _hand_instance

    with _preload_lock:
        if _hand_instance is not None:
            return _hand_instance

        if _preload_error is not None:
            print("Retrying Calligrapher.ai model load after a previous preload failure...")
            _preload_error = None

        # Change to calligrapher directory so Hand() can load its checkpoints
        original_dir = os.getcwd()
        os.chdir(CALLIGRAPHER_DIR)
        try:
            from demo import Hand
            print("Loading Calligrapher.ai model...")
            _hand_instance = Hand()
            print("Calligrapher.ai model loaded!")
        finally:
            os.chdir(original_dir)
    return _hand_instance


def _apply_spacing_to_path(path_d: str, spacing_factor: float) -> str:
    """
    Parse an SVG path d-string and scale horizontal distances between
    pen-up moves (M commands) to apply letter spacing.
    
    spacing_factor: 1.0 = no change, >1 = wider, <1 = tighter
    """
    if abs(spacing_factor - 1.0) < 0.01:
        return path_d  # No change needed

    # Tokenize: split into (command, x, y) triples
    # Path format from calligrapher: "M0,0 Mx1,y1 Lx2,y2 Mx3,y3 ..."
    tokens = re.findall(r'([ML])(-?[\d.]+),(-?[\d.]+)', path_d)
    if len(tokens) < 2:
        return path_d

    # First pass: collect all X coords to find the leftmost X
    all_x = [float(t[1]) for t in tokens]
    x_min = min(all_x) if all_x else 0.0

    # Second pass: rebuild path with scaled X positions
    result_parts = []
    for cmd, x_str, y_str in tokens:
        x = float(x_str)
        y = float(y_str)
        # Scale horizontal distance from left edge
        new_x = x_min + (x - x_min) * spacing_factor
        result_parts.append(f"{cmd}{new_x:.1f},{y_str} ")

    return ''.join(result_parts)


def apply_svg_transforms(svg_content: str, slant: float, size: float, spacing: float) -> str:
    """Apply post-processing transforms to SVG for slant, size, and spacing."""
    
    # Parse viewBox to get dimensions
    viewbox_match = re.search(r'viewBox="([^"]+)"', svg_content)
    if not viewbox_match:
        return svg_content
    
    viewbox_parts = viewbox_match.group(1).split()
    if len(viewbox_parts) != 4:
        return svg_content
    
    vb_x, vb_y, vb_width, vb_height = [float(x) for x in viewbox_parts]
    
    # Scale factor from size (100 = 1.0)
    scale = size / 100.0
    
    # Spacing factor: 50 = default (1.0), 0 = tight (0.5), 100 = wide (1.5)
    spacing_factor = 0.5 + (spacing / 100.0)
    
    # Apply spacing to each <path> d-attribute
    modified_svg = svg_content
    if abs(spacing_factor - 1.0) > 0.01:
        def _replace_path_d(match):
            d_value = match.group(1)
            new_d = _apply_spacing_to_path(d_value, spacing_factor)
            return f'd="{new_d}"'
        modified_svg = re.sub(r'd="([^"]+)"', _replace_path_d, modified_svg)
    
    # Calculate new viewBox dimensions (inverse scale to zoom)
    # Also widen viewBox if spacing increased
    new_width = (vb_width * spacing_factor) / scale
    new_height = vb_height / scale
    
    # Build transform for slant (skewX) - apply at content level
    transforms = []
    if abs(slant) > 0.1:
        transforms.append(f"skewX({-slant * 0.5})")
    
    # Update viewBox for size + spacing scaling
    modified_svg = re.sub(
        r'viewBox="[^"]+"',
        f'viewBox="0 0 {new_width:.1f} {new_height:.1f}"',
        modified_svg
    )
    
    # Add transform to paths if slant is applied
    if transforms:
        transform_str = ' '.join(transforms)
        # Wrap all paths in a group with transform
        modified_svg = re.sub(
            r'(<rect[^>]*/>)(.*?)(</svg>)',
            rf'\1<g transform="{transform_str}">\2</g>\3',
            modified_svg,
            flags=re.DOTALL
        )
    
    return modified_svg


def generate_handwriting(
    text: str,
    style: int = 0,
    bias: float = 0.75,
    stroke_color: str = "black",
    stroke_width: int = 2,
    slant: float = 0,
    size: float = 100,
    spacing: float = 50
) -> str:
    """
    Generate handwritten SVG from text.

    Args:
        text: Text to convert to handwriting
        style: Predefined style number (0-12 — only 0-12 have .npy files)
        bias: Controls randomness (0.0=random, 1.0=deterministic)
        stroke_color: SVG stroke color
        stroke_width: SVG stroke width
        slant: Slant angle in degrees (-30 to 30)
        size: Size percentage (50 to 200)
        spacing: Letter spacing (0 to 100)

    Returns:
        SVG string content
    """
    import tempfile

    hand = get_hand()

    # Clamp style to valid range (only 0-12 have style .npy files)
    style = max(0, min(MAX_STYLE, style))

    # Strip characters the model doesn't support
    safe_text = sanitize_text(text)
    if not safe_text.strip():
        safe_text = 'Hello'

    # Split text into lines (max 75 chars each)
    lines = []
    for line in safe_text.split('\n'):
        line = line.strip()
        while len(line) > 75:
            split_idx = line[:75].rfind(' ')
            if split_idx == -1:
                split_idx = 75
            lines.append(line[:split_idx])
            line = line[split_idx:].strip()
        if line:
            lines.append(line)

    if not lines:
        lines = ['Hello']

    # Generate SVG to temp file
    with tempfile.NamedTemporaryFile(suffix='.svg', delete=False) as tmp:
        tmp_path = tmp.name

    try:
        biases = [bias] * len(lines)
        styles = [style] * len(lines)
        stroke_colors = [stroke_color] * len(lines)
        stroke_widths = [stroke_width] * len(lines)

        # Use the lock-protected cwd context to avoid concurrent-request races
        with _calligrapher_cwd():
            hand.write(
                filename=tmp_path,
                lines=lines,
                biases=biases,
                styles=styles,
                stroke_colors=stroke_colors,
                stroke_widths=stroke_widths
            )

        # Read SVG content
        with open(tmp_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()

        # Apply slider transforms (slant, size, spacing)
        svg_content = apply_svg_transforms(svg_content, slant, size, spacing)

        return svg_content

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def get_available_styles() -> list:
    """Return list of available predefined styles (0-12)"""
    return list(range(MAX_STYLE + 1))


def get_model_state() -> str:
    """Return model warmup state: idle | warming | ready | error."""
    if _hand_instance is not None:
        return "ready"
    if _preload_error is not None:
        return "error"
    if _preload_thread is not None and _preload_thread.is_alive():
        return "warming"
    return "idle"


def get_preload_error() -> Optional[str]:
    """Return warmup error if preload failed."""
    return _preload_error


def preload_async() -> None:
    """Start background preload once. Safe to call repeatedly."""
    global _preload_thread, _preload_error

    with _preload_lock:
        if _hand_instance is not None:
            return
        if _preload_thread is not None and _preload_thread.is_alive():
            return
        _preload_error = None

        def _run_preload():
            global _preload_error
            try:
                preload()
            except Exception as exc:
                _preload_error = str(exc)
                print(f"Calligrapher.ai preload failed: {exc}")

        _preload_thread = threading.Thread(
            target=_run_preload,
            name="calligrapher-preload",
            daemon=True,
        )
        _preload_thread.start()


# Preload model on demand
def preload():
    """Preload the model for faster first request"""
    get_hand()
