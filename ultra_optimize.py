from PIL import Image
import os

def ultra_optimize_png(input_path, output_path, max_width, colors=256):
    """Ultra optimize PNG with color reduction"""
    img = Image.open(input_path)
    
    if img.mode in ('RGBA', 'LA', 'P'):
        img = img.convert('RGBA')
    
    # Resize
    width, height = img.size
    if width > max_width:
        ratio = max_width / width
        new_height = int(height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
    
    # Reduce colors for smaller file size while keeping transparency
    img = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=colors)
    
    # Save with maximum compression
    img.save(output_path, 'PNG', optimize=True, compress_level=9)
    
    original_size = os.path.getsize(input_path) / 1024
    new_size = os.path.getsize(output_path) / 1024
    print(f"  {os.path.basename(output_path)}: {original_size:.1f}KB -> {new_size:.1f}KB ({100-new_size/original_size*100:.1f}% saved)")

print("Ultra-optimizing hero logo for mobile LCP...")
print()

# Hero logo mobile - displayed at 298x198, so 300x200 is perfect
print("1. Hero logo mobile ultra-compressed (300x200):")
ultra_optimize_png(
    'assets/logo_blur-Aq2Qv48BaWH3VXD1.png',
    'assets/logo_blur-mobile.png',
    max_width=300,
    colors=256
)

print("\n✅ Ultra-optimized mobile logo ready!")
print("Expected: ~10-15 KB with transparency preserved")
