from PIL import Image
import os

def optimize_image(input_path, output_path, max_width, quality=85):
    """Optimize image with proper transparency handling"""
    img = Image.open(input_path)
    
    # Preserve transparency for PNG
    if img.mode in ('RGBA', 'LA', 'P'):
        # Keep RGBA mode for PNGs with transparency
        img = img.convert('RGBA')
    elif img.mode == 'RGB':
        # RGB for JPEGs
        pass
    else:
        img = img.convert('RGB')
    
    # Calculate new size maintaining aspect ratio
    width, height = img.size
    if width > max_width:
        ratio = max_width / width
        new_height = int(height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
    
    # Save with optimization
    if output_path.endswith('.png'):
        img.save(output_path, 'PNG', optimize=True, compress_level=9)
    else:
        # Convert RGBA to RGB for JPEG
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        img.save(output_path, 'JPEG', quality=quality, optimize=True)
    
    original_size = os.path.getsize(input_path) / 1024
    new_size = os.path.getsize(output_path) / 1024
    print(f"  {os.path.basename(output_path)}: {original_size:.1f}KB -> {new_size:.1f}KB ({100-new_size/original_size*100:.1f}% saved)")

print("Optimizing images for mobile performance...")
print()

# Hero background - create mobile version with lower quality
print("1. Hero background (main_pic) - aggressive compression:")
optimize_image(
    'assets/main_pic-dWx9yXgJoNfgOMBk.jpg',
    'assets/main_pic-mobile.jpg',
    max_width=800,
    quality=70
)

# Logo blur - create hero and footer mobile versions
print("\n2. Hero logo (logo_blur-mobile) - 400px:")
optimize_image(
    'assets/logo_blur-Aq2Qv48BaWH3VXD1.png',
    'assets/logo_blur-mobile.png',
    max_width=400
)

print("\n3. Footer logo (logo_blur-footer) - 300px:")
optimize_image(
    'assets/logo_blur-Aq2Qv48BaWH3VXD1.png',
    'assets/logo_blur-footer.png',
    max_width=300
)

# Header logo - optimize existing
print("\n4. Header logo (miltegona-logo-white) - 120px:")
optimize_image(
    'assets/miltegona-logo-white-v4-Awv5M7Brq0SlKNEo.png',
    'assets/miltegona-logo-white-optimized.png',
    max_width=120
)

print("\n✅ Done! Now update HTML to use optimized versions")
