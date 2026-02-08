from PIL import Image
import os

# Convert images to WebP format for better compression
images = {
    'assets/logo_blur-footer.png': {
        'output': 'assets/logo_blur-footer.webp',
        'resize': (200, 133),  # Displayed size
        'quality': 80
    },
    'assets/miltegona-logo-white-optimized.png': {
        'output': 'assets/miltegona-logo-white-optimized.webp',
        'resize': None,  # Keep original size
        'quality': 85
    },
    'assets/logo_blur-mobile.png': {
        'output': 'assets/logo_blur-mobile.webp',
        'resize': None,  # Already optimized size
        'quality': 80
    },
    'assets/logo_blur-desktop.png': {
        'output': 'assets/logo_blur-desktop.webp',
        'resize': None,
        'quality': 85
    }
}

for input_path, config in images.items():
    if os.path.exists(input_path):
        img = Image.open(input_path)
        
        # Resize if needed
        if config['resize']:
            img = img.resize(config['resize'], Image.Resampling.LANCZOS)
        
        # Convert to WebP
        img.save(config['output'], 'WEBP', quality=config['quality'], method=6)
        
        # Get file sizes
        original_size = os.path.getsize(input_path)
        webp_size = os.path.getsize(config['output'])
        savings = ((original_size - webp_size) / original_size) * 100
        
        print(f"{os.path.basename(input_path)}: {original_size/1024:.1f}KB -> {webp_size/1024:.1f}KB ({savings:.1f}% saved)")
    else:
        print(f"File not found: {input_path}")
