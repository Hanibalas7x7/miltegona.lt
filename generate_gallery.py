#!/usr/bin/env python3
"""
Gallery Generator - Automatiškai generuoja gallery-config.json failą
Nuskaitydamas nuotraukas iš /assets/gallery/ folderių

Naudojimas:
    python generate_gallery.py

Po to įkelkite gallery-config.json į GitHub
"""

import os
import json
from pathlib import Path
from datetime import datetime

# Kategorijų mapping
CATEGORIES = {
    'metalines': {
        'id': 'metalwork',
        'name': 'Metalinės konstrukcijos',
        'description': 'Metalinių konstrukcijų miltelinis dažymas'
    },
    'baldai': {
        'id': 'furniture',
        'name': 'Baldai',
        'description': 'Baldų ir interjero detalių dažymas'
    },
    'automobiliai': {
        'id': 'automotive',
        'name': 'Automobilių dalys',
        'description': 'Automobilių ir motociklų detalių dažymas'
    },
    'pramone': {
        'id': 'industrial',
        'name': 'Pramoninė įranga',
        'description': 'Pramoninės įrangos ir mechanizmų dažymas'
    }
}

# Palaikomos nuotraukų plėtinių rūšys
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

def scan_gallery_folder():
    """Nuskaitydamas visas nuotraukas iš gallery folderių"""
    gallery_path = Path('assets/gallery')
    
    if not gallery_path.exists():
        print(f"❌ Klaida: {gallery_path} folderis nerastas!")
        return None
    
    gallery_data = {
        'generated_at': datetime.now().isoformat(),
        'categories': [],
        'images': []
    }
    
    # Sukuriame kategorijas
    for folder_name, category_info in CATEGORIES.items():
        category_path = gallery_path / folder_name
        
        if not category_path.exists():
            print(f"⚠️  Perspėjimas: {category_path} folderis nerastas, sukuriamas...")
            category_path.mkdir(parents=True, exist_ok=True)
        
        gallery_data['categories'].append({
            'id': category_info['id'],
            'name': category_info['name'],
            'description': category_info['description'],
            'folder': folder_name
        })
    
    # Skanuojame nuotraukas
    total_images = 0
    
    for folder_name, category_info in CATEGORIES.items():
        category_path = gallery_path / folder_name
        images_in_category = []
        
        # Randame visas nuotraukas folderyje
        for image_file in category_path.iterdir():
            if image_file.suffix.lower() in IMAGE_EXTENSIONS:
                # Gauname failą informaciją
                stat = image_file.stat()
                
                image_data = {
                    'filename': image_file.name,
                    'path': f'/assets/gallery/{folder_name}/{image_file.name}',
                    'category': category_info['id'],
                    'category_name': category_info['name'],
                    'title': category_info['name'],  # Tik kategorijos pavadinimas
                    'size': stat.st_size,
                    'added': datetime.fromtimestamp(stat.st_ctime).isoformat()
                }
                
                images_in_category.append(image_data)
                total_images += 1
        
        # Rūšiuojame pagal datą (naujausi pirmi)
        images_in_category.sort(key=lambda x: x['added'], reverse=True)
        gallery_data['images'].extend(images_in_category)
        
        print(f"✅ {category_info['name']}: {len(images_in_category)} nuotraukų")
    
    print(f"\n📊 Iš viso rasta: {total_images} nuotraukų")
    return gallery_data

def save_gallery_config(data):
    """Išsaugo gallery konfigūraciją į JSON failą"""
    output_file = 'gallery-config.json'
    
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Sėkmingai sugeneruotas: {output_file}")
        print(f"📁 Galite jį įkelti į GitHub su komanda:")
        print(f"   git add {output_file}")
        print(f"   git commit -m 'Update gallery config'")
        print(f"   git push origin main")
        return True
    
    except Exception as e:
        print(f"❌ Klaida saugant failą: {e}")
        return False

def main():
    print("🖼️  Gallery Generator - Nuskaitydamas nuotraukas...\n")
    
    # Nuskaitydamas folderius
    gallery_data = scan_gallery_folder()
    
    if gallery_data is None:
        return 1
    
    # Išsaugome konfigūraciją
    if save_gallery_config(gallery_data):
        print("\n🎉 Galerija sėkmingai atnaujinta!")
        print("\n💡 Kaip pridėti naujas nuotraukas:")
        print("   1. Įkelkite nuotraukas į atitinkamą folderį:")
        print("      - /assets/gallery/metalines/")
        print("      - /assets/gallery/baldai/")
        print("      - /assets/gallery/automobiliai/")
        print("      - /assets/gallery/pramone/")
        print("   2. Paleiskite: python generate_gallery.py")
        print("   3. Įkelkite gallery-config.json į GitHub")
        return 0
    
    return 1

if __name__ == '__main__':
    exit(main())
