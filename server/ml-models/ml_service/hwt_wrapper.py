"""
HWT (Handwriting Transformers) Wrapper - Image to Style Extraction
"""
import os
import sys
import uuid
import json
from datetime import datetime, timezone
from typing import Optional
import numpy as np

# Add HWT directory to path
HWT_DIR = os.path.join(os.path.dirname(__file__), '..', 'hwt')
sys.path.insert(0, HWT_DIR)

STYLES_DIR = os.path.join(os.path.dirname(__file__), 'styles')

_model = None
_device = None


def get_model():
    """Lazy load the HWT model (singleton pattern)"""
    global _model, _device
    
    if _model is None:
        import torch
        
        # Set device
        _device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {_device}")
        
        # Load checkpoint
        model_path = os.path.join(HWT_DIR, 'files', 'iam_model.pth')
        print(f"Loading HWT model from {model_path}...")
        
        checkpoint = torch.load(model_path, map_location=_device, weights_only=False)
        
        # For now, store the checkpoint - full model loading requires more setup
        _model = checkpoint
        print("HWT checkpoint loaded!")
    
    return _model, _device


def extract_style_from_image(image_path: str) -> dict:
    """
    Extract handwriting style from an image.
    
    Args:
        image_path: Path to handwriting image (PNG/JPG)
    
    Returns:
        dict with style_id, embedding, preview info
    """
    from PIL import Image
    import torch
    
    # Load and preprocess image
    img = Image.open(image_path).convert('L')  # Grayscale
    
    # Resize to expected dimensions
    target_height = 64
    aspect_ratio = img.width / img.height
    target_width = int(target_height * aspect_ratio)
    img = img.resize((target_width, target_height))
    
    # Convert to tensor
    img_array = np.array(img, dtype=np.float32) / 255.0
    
    # For now, generate a random style embedding
    # TODO: Implement full HWT inference pipeline
    style_embedding = np.random.randn(256).tolist()
    
    # Generate unique style ID
    style_id = f"style_{uuid.uuid4().hex[:12]}"
    
    # Save style
    save_style(style_id, style_embedding, metadata={
        "source_image": os.path.basename(image_path),
        "image_size": [img.width, img.height]
    })
    
    return {
        "style_id": style_id,
        "embedding_size": len(style_embedding),
        "status": "extracted"
    }


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
        "embedding": embedding,
        "metadata": metadata or {}
    }
    
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    with open(style_path, 'w') as f:
        json.dump(style_data, f)
    
    return style_path


def load_style(style_id: str) -> Optional[dict]:
    """
    Load a style embedding from disk.
    
    Args:
        style_id: Style identifier
    
    Returns:
        Style data dict or None if not found
    """
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    
    if not os.path.exists(style_path):
        return None
    
    with open(style_path, 'r') as f:
        return json.load(f)


def list_styles() -> list:
    """List all saved styles"""
    os.makedirs(STYLES_DIR, exist_ok=True)
    
    styles = []
    for filename in os.listdir(STYLES_DIR):
        if filename.endswith('.json'):
            style_id = filename[:-5]
            style_data = load_style(style_id)
            if style_data:
                styles.append({
                    "style_id": style_id,
                    "metadata": style_data.get("metadata", {})
                })
    
    return styles


def delete_style(style_id: str) -> bool:
    """Delete a saved style"""
    style_path = os.path.join(STYLES_DIR, f"{style_id}.json")
    
    if os.path.exists(style_path):
        os.remove(style_path)
        return True
    return False


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
