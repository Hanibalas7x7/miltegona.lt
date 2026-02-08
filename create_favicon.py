from PIL import Image

# Load 192x192 PNG
img = Image.open('assets/android-chrome-192x192-m7VZwRwB6rSl7pDP.png')

# Create multiple sizes for ICO (32x32, 16x16)
sizes = [(32, 32), (16, 16)]
icons = []

for size in sizes:
    icon = img.resize(size, Image.Resampling.LANCZOS)
    icons.append(icon)

# Save as favicon.ico
icons[0].save('favicon.ico', format='ICO', sizes=[(32, 32), (16, 16)], append_images=[icons[1]])

print("✅ favicon.ico created from android-chrome-192x192")
