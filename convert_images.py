#!/usr/bin/env python3
"""
Convert images to WebP format and create responsive versions
"""
from PIL import Image
import os
from pathlib import Path

def convert_to_webp(input_path, output_path, quality=85):
    """Convert image to WebP format"""
    try:
        img = Image.open(input_path)
        # Convert RGBA to RGB if needed
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        img.save(output_path, 'WebP', quality=quality)
        print(f"✓ Converted {input_path} → {output_path}")
        return True
    except Exception as e:
        print(f"✗ Failed {input_path}: {e}")
        return False

def create_responsive_version(input_path, output_path, max_width, max_height=None):
    """Create responsive version of image"""
    try:
        img = Image.open(input_path)
        
        # Calculate new dimensions maintaining aspect ratio
        width, height = img.size
        if max_height:
            aspect = min(max_width / width, max_height / height)
        else:
            aspect = max_width / width
        
        new_width = int(width * aspect)
        new_height = int(height * aspect)
        
        # Resize with high quality
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Convert RGBA to RGB if needed
        if img_resized.mode == 'RGBA':
            background = Image.new('RGB', img_resized.size, (255, 255, 255))
            background.paste(img_resized, mask=img_resized.split()[3])
            img_resized = background
        
        img_resized.save(output_path, 'WebP', quality=85)
        print(f"✓ Created {output_path} ({new_width}x{new_height})")
        return True
    except Exception as e:
        print(f"✗ Failed {output_path}: {e}")
        return False

def main():
    assets_dir = Path("assets")
    
    print("Converting images to WebP...\n")
    
    # Main hero image - create responsive versions
    hero_src = assets_dir / "main_pic-dWx9yXgJoNfgOMBk.jpg"
    if hero_src.exists():
        print("Hero Image:")
        convert_to_webp(hero_src, assets_dir / "main_pic-desktop.webp", quality=85)
        create_responsive_version(hero_src, assets_dir / "main_pic-tablet.webp", 1024)
        create_responsive_version(hero_src, assets_dir / "main_pic-mobile.webp", 768)
        print()
    
    # Hero logo - create mobile version
    logo_blur = assets_dir / "logo_blur-Aq2Qv48BaWH3VXD1.png"
    if logo_blur.exists():
        print("Hero Logo:")
        convert_to_webp(logo_blur, assets_dir / "logo_blur-desktop.webp", quality=90)
        create_responsive_version(logo_blur, assets_dir / "logo_blur-mobile.webp", 300, 200)
        print()
    
    # Header logo - create optimized version
    header_logo = assets_dir / "miltegona-logo-white-v4-Awv5M7Brq0SlKNEo.png"
    if header_logo.exists():
        print("Header Logo:")
        create_responsive_version(header_logo, assets_dir / "miltegona-logo-white-small.webp", 120, 60)
        print()
    
    print("Done! All images converted.")

if __name__ == "__main__":
    main()
