from PIL import Image
import os

# Create 2x version of mobile logo for high-DPI screens (Retina, etc.)
input_file = 'assets/logo_blur-mobile.png'
output_2x = 'assets/logo_blur-mobile@2x.webp'
output_1x = 'assets/logo_blur-mobile@1x.webp'

if os.path.exists(input_file):
    img = Image.open(input_file)
    
    # 1x version: 300x200 (current)
    img_1x = img.resize((300, 200), Image.Resampling.LANCZOS)
    img_1x.save(output_1x, 'WEBP', quality=80, method=6)
    
    # 2x version: 600x400 for Retina displays
    img_2x = img.resize((600, 400), Image.Resampling.LANCZOS)
    img_2x.save(output_2x, 'WEBP', quality=85, method=6)
    
    size_1x = os.path.getsize(output_1x)
    size_2x = os.path.getsize(output_2x)
    
    print(f"1x version: {size_1x/1024:.1f}KB (300x200)")
    print(f"2x version: {size_2x/1024:.1f}KB (600x400)")
    print(f"Total for high-DPI: {size_2x/1024:.1f}KB")
else:
    print(f"File not found: {input_file}")

# Also create 2x desktop version
input_desktop = 'assets/logo_blur-desktop.png'
output_desktop_2x = 'assets/logo_blur-desktop@2x.webp'

if os.path.exists(input_desktop):
    img_desktop = Image.open(input_desktop)
    
    # Desktop 2x: 1200x798 for Retina MacBooks
    img_desktop_2x = img_desktop.resize((1200, 798), Image.Resampling.LANCZOS)
    img_desktop_2x.save(output_desktop_2x, 'WEBP', quality=85, method=6)
    
    size_desktop_2x = os.path.getsize(output_desktop_2x)
    print(f"Desktop 2x version: {size_desktop_2x/1024:.1f}KB (1200x798)")
else:
    print(f"File not found: {input_desktop}")
