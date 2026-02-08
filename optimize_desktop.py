from PIL import Image
import os

def optimize_image(input_path, output_path, max_width, quality=85):
    """Optimize image with proper transparency handling"""
    img = Image.open(input_path)
    
    # Preserve transparency for PNG
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
    elif img.mode == 'RGB':
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
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        img.save(output_path, 'JPEG', quality=quality, optimize=True)
    
    original_size = os.path.getsize(input_path) / 1024
    new_size = os.path.getsize(output_path) / 1024
    print(f"  {os.path.basename(output_path)}: {original_size:.1f}KB -> {new_size:.1f}KB ({100-new_size/original_size*100:.1f}% saved)")

print("Creating desktop-optimized versions...")
print()

# Hero logo desktop - 600px display size
print("1. Hero logo desktop (600px):")
optimize_image(
    'assets/logo_blur-Aq2Qv48BaWH3VXD1.png',
    'assets/logo_blur-desktop.png',
    max_width=600
)

# Hero background desktop - compressed
print("\n2. Hero background desktop (1920px, quality 75):")
optimize_image(
    'assets/main_pic-dWx9yXgJoNfgOMBk.jpg',
    'assets/main_pic-desktop.jpg',
    max_width=1920,
    quality=75
)

print("\n✅ Desktop optimized images ready!")
