#!/usr/bin/env python3
"""
=============================================================================
GPBC Backgrounds Batch Compression & WebP Migration Engine
=============================================================================
Batch converts full-resolution PNG devotion backgrounds to optimized WebP.
Target Quality: 80
Target File Size: <100 KB
Target Format: WebP with modern compression
=============================================================================
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    try:
        from PIL import Image
        return 'pillow'
    except ImportError:
        # Check if sips or cwebp are available on system
        return 'system_fallback'

def convert_with_pillow(png_path, webp_path, quality=80):
    from PIL import Image
    with Image.open(png_path) as img:
        # Convert RGBA to RGB if saving without alpha or preserve alpha
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert('RGBA')
        else:
            img = img.convert('RGB')
        
        # Resize if dimension exceeds 1536px for background art
        max_dim = 1536
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
        img.save(webp_path, 'WEBP', quality=quality, method=6)

def convert_with_sips(png_path, webp_path):
    # macOS sips conversion
    cmd = ['sips', '-s', 'format', 'webp', str(png_path), '--out', str(webp_path)]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def process_directory(base_dir, quality=80):
    base_path = Path(base_dir)
    if not base_path.exists():
        print(f"Error: Directory {base_dir} does not exist.")
        return

    png_files = list(base_path.glob('**/*.png'))
    if not png_files:
        print(f"No PNG files found in {base_dir}")
        return

    print(f"Found {len(png_files)} background PNG images. Starting WebP conversion...")
    print("=" * 70)

    mode = check_dependencies()
    total_orig_bytes = 0
    total_webp_bytes = 0
    converted_count = 0

    for png in sorted(png_files):
        webp_path = png.with_suffix('.webp')
        orig_size = png.stat().st_size
        total_orig_bytes += orig_size

        try:
            if mode == 'pillow':
                convert_with_pillow(png, webp_path, quality)
            else:
                convert_with_sips(png, webp_path)

            webp_size = webp_path.stat().st_size
            total_webp_bytes += webp_size
            converted_count += 1

            savings = ((orig_size - webp_size) / orig_size) * 100
            print(f"✓ {png.name:32} | {orig_size/1024:6.1f} KB -> {webp_size/1024:5.1f} KB (-{savings:4.1f}%)")

        except Exception as e:
            print(f"✗ Failed {png.name}: {e}")

    print("=" * 70)
    print(f"Successfully processed {converted_count}/{len(png_files)} backgrounds.")
    if total_orig_bytes > 0:
        total_savings = ((total_orig_bytes - total_webp_bytes) / total_orig_bytes) * 100
        print(f"Original total size: {total_orig_bytes / (1024*1024):.2f} MB")
        print(f"WebP total size:     {total_webp_bytes / (1024*1024):.2f} MB")
        print(f"Total Bandwidth Saved: -{total_savings:.1f}%")

if __name__ == '__main__':
    target_dir = sys.argv[1] if len(sys.argv) > 1 else 'daily-devotion/images/backgrounds'
    process_directory(target_dir)
