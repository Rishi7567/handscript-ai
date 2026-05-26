"""
HWT (Handwriting Transformers) Wrapper - Image to Style Extraction & Generation

Uses the TRGAN model to:
1. Extract style embeddings from uploaded handwriting images
2. Generate handwriting in the extracted style
"""
import os
import sys
import uuid
import json
import base64
import io
from datetime import datetime, timezone
from typing import Optional
import numpy as np

# Add HWT directory to path
HWT_DIR = os.path.join(os.path.dirname(__file__), '..', 'hwt')
sys.path.insert(0, HWT_DIR)

STYLES_DIR = os.path.join(os.path.dirname(__file__), 'styles')

_model = None
_device = None
_model_load_error = None


def get_model():
    """Lazy load the HWT TRGAN model (singleton pattern)."""
    global _model, _device, _model_load_error
    
    if _model is not None:
        return _model, _device

    if _model_load_error is not None:
        # Return None to indicate model unavailable
        print(f"HWT model previously failed to load: {_model_load_error}")
        return None, None

    try:
        import torch
        
        # Set device
        _device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"HWT using device: {_device}")
        
        # Change to HWT directory for relative imports
        original_dir = os.getcwd()
        os.chdir(HWT_DIR)
        
        try:
            from models.model import TRGAN
            
            model_path = os.path.join(HWT_DIR, 'files', 'iam_model.pth')
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"HWT model weights not found at {model_path}. "
                    "Download from https://drive.google.com/file/d/16g9zgysQnWk7-353_tMig92KsZsrcM6k"
                )
            
            print(f"Loading HWT TRGAN model from {model_path}...")
            model = TRGAN(batch_size=1)
            model.netG.load_state_dict(torch.load(model_path, map_location=_device, weights_only=False))
            model.eval()
            
            _model = model
            print("HWT model loaded successfully!")
        finally:
            os.chdir(original_dir)
        
        return _model, _device
        
    except Exception as e:
        _model_load_error = str(e)
        print(f"HWT model load failed: {e}")
        return None, None


def segment_words_from_image(image_path: str, num_samples: int = 15):
    """
    Segment individual word crops from a handwriting image using OpenCV.
    
    Args:
        image_path: Path to handwriting image
        num_samples: Max number of word crops to extract (default 15)
    
    Returns:
        List of cropped grayscale word images as numpy arrays
    """
    import cv2
    from PIL import Image
    
    # Load image
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    
    # Binarize using Otsu's method
    _, binary = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Dilate to connect nearby characters into word blobs
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 5))
    dilated = cv2.dilate(binary, kernel, iterations=1)
    
    # Find contours (word regions)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter and sort contours by position (left-to-right, top-to-bottom)
    word_boxes = []
    min_area = img.shape[0] * img.shape[1] * 0.001  # Min 0.1% of image
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w * h > min_area and h > 5 and w > 5:
            word_boxes.append((x, y, w, h))
    
    # Sort by y (row), then x (column)
    word_boxes.sort(key=lambda b: (b[1] // (img.shape[0] // 4), b[0]))
    
    # Crop words
    word_crops = []
    for x, y, w, h in word_boxes[:num_samples]:
        crop = img[y:y+h, x:x+w]
        word_crops.append(crop)
    
    if not word_crops:
        # If segmentation failed, use the whole image as one sample
        word_crops = [img]
    
    return word_crops


def prepare_style_tensor(word_crops: list):
    """
    Convert word crop images into the tensor format expected by TRGAN.
    
    Args:
        word_crops: List of grayscale numpy arrays
    
    Returns:
        (style_tensor, width_lengths) ready for TRGAN
    """
    import torch
    import torchvision.transforms as transforms
    
    target_height = 32
    max_width = 192
    num_samples = 15
    
    trans_fn = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,)),
    ])
    
    # Pad or repeat to get exactly num_samples word crops
    while len(word_crops) < num_samples:
        word_crops.append(word_crops[np.random.randint(len(word_crops))])
    word_crops = word_crops[:num_samples]
    
    imgs_pad = []
    imgs_wids = []
    
    for crop in word_crops:
        from PIL import Image
        
        # Resize to target height, maintaining aspect ratio
        h, w = crop.shape[:2]
        if h < 1:
            h = 1
        new_w = int(target_height * (w / h))
        new_w = max(1, min(max_width, new_w))
        
        resized = cv2.resize(crop, (new_w, target_height)) if 'cv2' in dir() else crop
        try:
            import cv2
            resized = cv2.resize(crop, (new_w, target_height))
        except:
            resized = np.array(Image.fromarray(crop).resize((new_w, target_height)))
        
        # Invert (dark text on light bg → light text on dark bg)
        resized = 255 - resized
        
        # Pad to max_width
        padded = np.zeros((target_height, max_width), dtype='float32')
        padded[:, :min(new_w, max_width)] = resized[:, :max_width]
        
        # Un-invert for the transform
        padded = 255 - padded
        
        pil_img = Image.fromarray(padded.astype(np.uint8))
        imgs_pad.append(trans_fn(pil_img))
        imgs_wids.append(min(new_w, max_width))
    
    style_tensor = torch.cat(imgs_pad, 0).unsqueeze(0)
    width_tensor = torch.Tensor(imgs_wids).unsqueeze(0)
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    return style_tensor.to(device), width_tensor.to(device)


def extract_style_from_image(image_path: str) -> dict:
    """
    Extract handwriting style from an image.
    
    Segments words from the image and saves them as a style tensor
    that can be used for generation via the HWT model.
    
    Args:
        image_path: Path to handwriting image (PNG/JPG)
    
    Returns:
        dict with style_id, embedding_size, status
    """
    import cv2
    
    # Segment words from the image
    word_crops = segment_words_from_image(image_path)
    
    # Prepare tensor
    style_tensor, width_tensor = prepare_style_tensor(word_crops)
    
    # Generate unique style ID
    style_id = f"style_{uuid.uuid4().hex[:12]}"
    
    # Save style data (tensor + metadata)
    os.makedirs(STYLES_DIR, exist_ok=True)
    
    style_data = {
        "style_id": style_id,
        "type": "hwt_extracted",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_image": os.path.basename(image_path),
        "num_word_crops": len(word_crops),
        "embedding_size": int(style_tensor.numel()),
        "metadata": {
            "source": "image_upload",
            "image_size": [word_crops[0].shape[1], word_crops[0].shape[0]] if word_crops else [0, 0],
        }
    }
    
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    with open(style_path, 'w') as f:
        json.dump(style_data, f)
    
    # Save tensors as .pt files for later generation
    import torch
    tensor_path = os.path.join(STYLES_DIR, f"{style_id}_tensor.pt")
    torch.save({
        'style_tensor': style_tensor.cpu(),
        'width_tensor': width_tensor.cpu(),
    }, tensor_path)
    
    return {
        "style_id": style_id,
        "embedding_size": int(style_tensor.numel()),
        "status": "extracted"
    }


def generate_hwt_handwriting(style_id: str, text: str) -> str:
    """
    Generate handwriting using the HWT model with an extracted style.
    
    Args:
        style_id: ID of a previously extracted style
        text: Text to generate
    
    Returns:
        SVG string with embedded base64 PNG image
    """
    import torch
    import cv2
    
    model, device = get_model()
    if model is None:
        raise RuntimeError("HWT model not available. Check model weights at server/ml-models/hwt/files/iam_model.pth")
    
    # Load saved style tensors
    tensor_path = os.path.join(STYLES_DIR, f"{style_id}_tensor.pt")
    if not os.path.exists(tensor_path):
        raise FileNotFoundError(f"Style tensor not found for {style_id}")
    
    saved = torch.load(tensor_path, map_location=device, weights_only=False)
    style_tensor = saved['style_tensor'].to(device)
    width_tensor = saved['width_tensor'].to(device)
    
    # Encode text for the model
    words = [w.encode() for w in text.split(' ') if w]
    if not words:
        words = [b'hello']
    
    text_encode, len_text = model.netconverter.encode(words)
    text_encode = text_encode.to(device).repeat(1, 1, 1)
    
    # Generate page
    with torch.no_grad():
        page_img = model._generate_page(style_tensor, width_tensor, text_encode, len_text)
    
    # Convert to uint8 image
    page_img = (page_img * 255).astype(np.uint8)
    
    # Encode as PNG in memory
    _, png_buffer = cv2.imencode('.png', page_img)
    b64_img = base64.b64encode(png_buffer).decode('utf-8')
    
    # Wrap in SVG for consistent frontend rendering
    h, w = page_img.shape[:2]
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {w} {h}">\n'
        f'<image width="{w}" height="{h}" '
        f'href="data:image/png;base64,{b64_img}"/>\n'
        f'</svg>'
    )
    
    return svg


def save_style(style_id: str, embedding: list, metadata: dict = None) -> str:
    """
    Save a style embedding to disk.
    
    Args:
        style_id: Unique identifier for the style
        embedding: Style embedding vector
        metadata: Optional metadata dict
    
    Returns:
        Path to saved style file
    """
    os.makedirs(STYLES_DIR, exist_ok=True)
    
    style_data = {
        "style_id": style_id,
        "type": "embedding",
        "embedding": embedding,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {}
    }
    
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    with open(style_path, 'w') as f:
        json.dump(style_data, f)
    
    return style_path


def load_style(style_id: str) -> Optional[dict]:
    """
    Load a saved style.
    
    Args:
        style_id: Style identifier
    
    Returns:
        Style dict or None if not found
    """
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    if not os.path.exists(style_path):
        return None
    with open(style_path, 'r') as f:
        return json.load(f)


def list_styles() -> list:
    """List all saved styles with metadata."""
    os.makedirs(STYLES_DIR, exist_ok=True)
    styles = []
    for filename in os.listdir(STYLES_DIR):
        if filename.endswith('.json') and not filename.endswith('_tensor.pt'):
            style_id = filename[:-5]
            style_data = load_style(style_id)
            if style_data:
                styles.append({
                    "style_id": style_id,
                    "metadata": style_data.get("metadata", {}),
                })
    return styles


def delete_style(style_id: str) -> bool:
    """Delete a saved style and its tensor file."""
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    tensor_path = os.path.join(STYLES_DIR, f"{style_id}_tensor.pt")
    deleted = False
    if os.path.exists(style_path):
        os.remove(style_path)
        deleted = True
    if os.path.exists(tensor_path):
        os.remove(tensor_path)
    return deleted


def build_style_from_samples(name: str, samples: list) -> dict:
    """
    Build and save a style from user-drawn stroke samples (from Onboarding canvas).

    Args:
        name: User-chosen name for this style
        samples: List of CharSample dicts, each with 'char', 'strokes', 'timestamp'

    Returns:
        dict with style info matching frontend's HandwritingStyle interface
    """
    style_id = f"custom_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()

    os.makedirs(STYLES_DIR, exist_ok=True)

    style_data = {
        "style_id": style_id,
        "name": name,
        "created_at": created_at,
        "type": "custom_strokes",
        "samples": samples,
        "char_count": len(samples),
        "metadata": {
            "source": "onboarding_canvas",
            "chars_collected": [s.get("char", "") for s in samples],
        }
    }

    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    with open(style_path, 'w') as f:
        json.dump(style_data, f)

    # Return shape expected by frontend HandwritingStyle interface
    return {
        "id": style_id,
        "name": name,
        "createdAt": created_at,
        "charCount": len(samples),
    }


# Preload model on module import (optional)
def preload():
    """Preload the model for faster first request"""
    get_model()
