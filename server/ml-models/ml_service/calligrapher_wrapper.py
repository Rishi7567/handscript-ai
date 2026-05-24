"""
Calligrapher.ai Wrapper - Text to SVG Handwriting Generation
"""
import os
import sys
import re
import threading
from typing import Optional

# Add calligrapher directory to path
CALLIGRAPHER_DIR = os.path.join(os.path.dirname(__file__), '..', 'calligrapher')
sys.path.insert(0, CALLIGRAPHER_DIR)

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

_hand_instance = None
_preload_lock = threading.Lock()
_preload_thread: Optional[threading.Thread] = None
_preload_error: Optional[str] = None


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

        # Change to calligrapher directory for relative path imports
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
    
    # Calculate new viewBox dimensions (inverse scale to zoom)
    new_width = vb_width / scale
    new_height = vb_height / scale
    
    # Build transform for slant (skewX) - apply at content level
    transforms = []
    if abs(slant) > 0.1:
        transforms.append(f"skewX({-slant * 0.5})")
    
    # Modify SVG with transforms
    modified_svg = svg_content
    
    # Update viewBox for size scaling
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
        text: Text to convert to handwriting (max 75 chars per line)
        style: Predefined style number (0-14)
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
    
    # Split text into lines (max 75 chars each)
    lines = []
    for line in text.split('\n'):
        while len(line) > 75:
            # Find last space before 75 chars
            split_idx = line[:75].rfind(' ')
            if split_idx == -1:
                split_idx = 75
            lines.append(line[:split_idx])
            line = line[split_idx:].strip()
        if line:
            lines.append(line)
    
    if not lines:
        lines = [" "]
    
    # Generate SVG to temp file
    with tempfile.NamedTemporaryFile(suffix='.svg', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        # Change to calligrapher dir for style files
        original_dir = os.getcwd()
        os.chdir(CALLIGRAPHER_DIR)
        
        try:
            biases = [bias] * len(lines)
            styles = [style] * len(lines)
            stroke_colors = [stroke_color] * len(lines)
            stroke_widths = [stroke_width] * len(lines)
            
            hand.write(
                filename=tmp_path,
                lines=lines,
                biases=biases,
                styles=styles,
                stroke_colors=stroke_colors,
                stroke_widths=stroke_widths
            )
        finally:
            os.chdir(original_dir)
        
        # Read SVG content
        with open(tmp_path, 'r') as f:
            svg_content = f.read()
        
        # Apply slider transforms (slant, size, spacing)
        svg_content = apply_svg_transforms(svg_content, slant, size, spacing)
        
        return svg_content
    
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def get_available_styles() -> list:
    """Return list of available predefined styles (0-14)"""
    return list(range(15))


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
