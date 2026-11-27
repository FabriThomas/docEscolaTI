"""
Media Sanitizer Service (Pillow WebP <= 300 KB, Zero EXIF/GPS)
Conforms to: ADR-11, STY016-RN02, RB-06
"""

import hashlib
import io
from typing import Tuple
from PIL import Image, ImageOps


MAX_WEBP_BYTES = 300 * 1024  # 300 KB limit (EDTS-373 / ADR-11)
MAX_PHOTOS_PER_LISTING = 6


def sanitize_to_webp_no_exif(raw_bytes: bytes, max_bytes: int = MAX_WEBP_BYTES) -> Tuple[bytes, int, int, str]:
    """
    Validates image bytes, strips all EXIF/GPS/XMP metadata by re-encoding clean pixels,
    and compresses to WebP <= max_bytes (300 KB).
    Returns: (webp_bytes, width, height, sha256_hash)
    """
    with Image.open(io.BytesIO(raw_bytes)) as img:
        img = ImageOps.exif_transpose(img)
        mode = "RGBA" if img.mode in ("RGBA", "LA", "P") else "RGB"
        if img.mode != mode:
            img = img.convert(mode)

        # Create a brand-new Image from raw pixel data so zero metadata/EXIF survives
        clean_img = Image.new(mode, img.size)
        clean_img.putdata(list(img.getdata()))

        # Downscale if oversized while preserving aspect ratio
        max_dim = 1600
        if clean_img.width > max_dim or clean_img.height > max_dim:
            clean_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

        quality = 85
        best_bytes = b""
        while quality >= 25:
            buf = io.BytesIO()
            clean_img.save(buf, format="WEBP", quality=quality, method=6)
            data = buf.getvalue()
            best_bytes = data
            if len(data) <= max_bytes:
                break
            quality -= 15

        # If still > max_bytes, scale down dimensions and re-encode
        while len(best_bytes) > max_bytes and (clean_img.width > 400 and clean_img.height > 400):
            clean_img = clean_img.resize(
                (int(clean_img.width * 0.75), int(clean_img.height * 0.75)),
                Image.Resampling.LANCZOS,
            )
            buf = io.BytesIO()
            clean_img.save(buf, format="WEBP", quality=60, method=6)
            best_bytes = buf.getvalue()

        sha256_hex = hashlib.sha256(best_bytes).hexdigest()
        return best_bytes, clean_img.width, clean_img.height, sha256_hex
