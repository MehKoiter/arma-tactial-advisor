#!/usr/bin/env python3
"""
Generate XYZ raster map tiles from public/everon-map.jpg for MapLibre GL.

Usage:
    pip install Pillow
    python scripts/generate-tiles.py

Input:   public/everon-map.jpg
Output:  public/tiles/{z}/{x}/{y}.jpg  (XYZ scheme, standard Web Mercator tile indices)

The tile coordinate system matches the virtual degree space defined in
src/data/mapConfig.ts:
    virtual_lng = gameX_metres / 111_320
    virtual_lat = gameZ_metres / 111_320

Tile zoom range: MIN_ZOOM–MAX_ZOOM (edit below if needed).
Approximate tile counts per zoom level for the 0.11° × 0.11° Everon world:
    z=10  →   1 tiles   (overview)
    z=11  →   1 tiles
    z=12  →   4 tiles
    z=13  →   9 tiles
    z=14  →  36 tiles
    z=15  → 121 tiles
    z=16  → 441 tiles   (full detail)
"""

import math
import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required.  Run:  pip install Pillow")

# ---------------------------------------------------------------------------
# Configuration — must match src/data/mapConfig.ts
# ---------------------------------------------------------------------------
GAME_WORLD_SIZE    = 12_800      # metres (Everon map edge — 12.8 km × 12.8 km)
METRES_PER_DEGREE  = 111_320
WORLD_DEG          = GAME_WORLD_SIZE / METRES_PER_DEGREE   # ≈ 0.11037

BOUNDS_LNG_MIN     = 0.0
BOUNDS_LAT_MIN     = 0.0
BOUNDS_LNG_MAX     = WORLD_DEG
BOUNDS_LAT_MAX     = WORLD_DEG

MIN_ZOOM           = 10
MAX_ZOOM           = 16
TILE_SIZE          = 256
JPEG_QUALITY       = 85
BG_COLOR           = (26, 26, 46)   # dark navy — matches app background

REPO_ROOT    = Path(__file__).resolve().parent.parent
SOURCE_IMAGE = REPO_ROOT / "public" / "everon-map.jpg"
OUTPUT_DIR   = REPO_ROOT / "public" / "tiles"

# ---------------------------------------------------------------------------
# Tile math (standard XYZ / Web Mercator)
# ---------------------------------------------------------------------------

def lng_to_tx(lng: float, z: int) -> int:
    return int((lng + 180.0) / 360.0 * (2 ** z))

def lat_to_ty(lat: float, z: int) -> int:
    lat_r = math.radians(lat)
    return int((1.0 - math.log(math.tan(lat_r) + 1.0 / math.cos(lat_r)) / math.pi) / 2.0 * (2 ** z))

def tx_to_lng(tx: int, z: int) -> float:
    return tx / (2 ** z) * 360.0 - 180.0

def ty_to_lat(ty: int, z: int) -> float:
    n = math.pi - 2.0 * math.pi * ty / (2 ** z)
    return math.degrees(math.atan(math.sinh(n)))

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not SOURCE_IMAGE.exists():
        sys.exit(f"Source image not found: {SOURCE_IMAGE}\n"
                 "Place everon-map.jpg in the public/ folder first.")

    print(f"Loading {SOURCE_IMAGE} …")
    img = Image.open(SOURCE_IMAGE).convert("RGB")
    img_w, img_h = img.size
    print(f"Source: {img_w} × {img_h} px")
    print(f"Output: {OUTPUT_DIR}/{{z}}/{{x}}/{{y}}.jpg  (z={MIN_ZOOM}–{MAX_ZOOM})\n")

    grand_total = 0

    for z in range(MIN_ZOOM, MAX_ZOOM + 1):
        tx_min = lng_to_tx(BOUNDS_LNG_MIN, z)
        tx_max = lng_to_tx(BOUNDS_LNG_MAX, z)
        ty_min = lat_to_ty(BOUNDS_LAT_MAX, z)   # higher lat → lower tile y index
        ty_max = lat_to_ty(BOUNDS_LAT_MIN, z)

        count = (tx_max - tx_min + 1) * (ty_max - ty_min + 1)
        grand_total += count
        print(f"z={z:2d}  tx=[{tx_min}–{tx_max}]  ty=[{ty_min}–{ty_max}]  ({count} tiles)")

        for tx in range(tx_min, tx_max + 1):
            for ty in range(ty_min, ty_max + 1):

                # Tile geographic bounds (lng/lat)
                t_lng0 = tx_to_lng(tx,     z)
                t_lng1 = tx_to_lng(tx + 1, z)
                t_lat1 = ty_to_lat(ty,     z)   # XYZ: ty increases downward, so ty→lat_max
                t_lat0 = ty_to_lat(ty + 1, z)   # ty+1→lat_min

                # Map tile bounds to source-image pixel bounds
                # image x: 0 → lng=0,         img_w → lng=WORLD_DEG
                # image y: 0 → lat=WORLD_DEG,  img_h → lat=0  (top=north)
                def lng_to_px(lng: float) -> float:
                    return (lng - BOUNDS_LNG_MIN) / WORLD_DEG * img_w

                def lat_to_py(lat: float) -> float:
                    return (1.0 - (lat - BOUNDS_LAT_MIN) / WORLD_DEG) * img_h

                src_x0, src_x1 = lng_to_px(t_lng0), lng_to_px(t_lng1)
                src_y0, src_y1 = lat_to_py(t_lat1), lat_to_py(t_lat0)   # lat1>lat0 so y0<y1

                # Clamp to image bounds
                cx0 = max(0.0, src_x0);  cx1 = min(float(img_w), src_x1)
                cy0 = max(0.0, src_y0);  cy1 = min(float(img_h), src_y1)

                tile = Image.new("RGB", (TILE_SIZE, TILE_SIZE), BG_COLOR)

                if cx1 > cx0 and cy1 > cy0:
                    crop = img.crop((int(cx0), int(cy0), int(cx1), int(cy1)))

                    # Scale factor: full tile spans (src_x1-src_x0) source pixels
                    tile_src_w = src_x1 - src_x0
                    tile_src_h = src_y1 - src_y0
                    sx = TILE_SIZE / tile_src_w if tile_src_w > 0 else 1.0
                    sy = TILE_SIZE / tile_src_h if tile_src_h > 0 else 1.0

                    new_w = max(1, int(round(crop.width  * sx)))
                    new_h = max(1, int(round(crop.height * sy)))
                    crop_scaled = crop.resize((new_w, new_h), Image.LANCZOS)

                    # Paste position within the 256×256 tile
                    paste_x = int(round((cx0 - src_x0) * sx))
                    paste_y = int(round((cy0 - src_y0) * sy))
                    tile.paste(crop_scaled, (paste_x, paste_y))

                out_dir = OUTPUT_DIR / str(z) / str(tx)
                out_dir.mkdir(parents=True, exist_ok=True)
                tile.save(out_dir / f"{ty}.jpg", "JPEG", quality=JPEG_QUALITY)

    print(f"\nDone — {grand_total} tiles written to {OUTPUT_DIR}/")
    print("Run the dev server and MapLibre will load them automatically.")


if __name__ == "__main__":
    main()
