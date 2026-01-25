# UAB Miltegona Website

Modern, responsive website for UAB Miltegona - Professional powder coating services.

## 🚀 Features

- **Responsive Design** - Works perfectly on all devices (desktop, tablet, mobile)
- **Modern UI/UX** - Clean, professional design with smooth animations
- **Fast Loading** - Optimized performance
- **SEO Friendly** - Proper meta tags and semantic HTML
- **Contact Form** - PHP-powered contact form with validation
- **Image Gallery** - Filterable gallery with lightbox functionality

## 📁 Project Structure

```
Miltegona_page/
├── index.html          # Home page
├── about.html          # About us page
├── services.html       # Services page
├── gallery.html        # Gallery page
├── contact.html        # Contact page
├── css/
│   ├── style.css       # Main stylesheet
│   ├── about.css       # About page styles
│   ├── services.css    # Services page styles
│   ├── gallery.css     # Gallery page styles
│   └── contact.css     # Contact page styles
├── js/
│   ├── main.js         # Main JavaScript
│   └── gallery.js      # Gallery functionality
├── php/
│   └── contact.php     # Contact form handler
└── images/             # Images folder (add your images here)
```

## 🛠️ Installation & Setup

### 1. Basic Setup (Static Pages)

Simply open `index.html` in your web browser to view the website locally.

### 2. Full Setup (With PHP Contact Form)

You need a local server environment like XAMPP, WAMP, or MAMP:

1. **Install XAMPP** (or similar):
   - Download from [https://www.apachefriends.org](https://www.apachefriends.org)
   - Install and start Apache server

2. **Copy Project Files**:
   - Copy the entire `Miltegona_page` folder to `C:\xampp\htdocs\`

3. **Configure Email**:
   - Open `php/contact.php`
   - Change the email address on line 52:
     ```php
     $to = 'info@miltegona.lt'; // Change to your email
     ```

4. **Access Website**:
   - Open browser and go to: `http://localhost/Miltegona_page/`

### 3. Production Deployment

1. **Upload to Web Server**:
   - Upload all files via FTP to your hosting
   - Ensure PHP is enabled on your server

2. **Configure PHP Mail**:
   - Make sure your hosting supports PHP mail() function
   - For better deliverability, consider using SMTP (PHPMailer)

3. **SSL Certificate**:
   - Install SSL certificate for HTTPS
   - Update all internal links if needed

## 📝 Customization Guide

### Changing Colors

Edit `css/style.css` and modify the CSS variables:

```css
:root {
    --primary-color: #2563eb;    /* Main blue color */
    --secondary-color: #1e40af;  /* Darker blue */
    --accent-color: #f59e0b;     /* Orange accent */
}
```

### Adding Images

1. Add your images to the `images/` folder
2. Update image references in HTML files
3. For gallery, update `gallery.html` with actual image paths

### Modifying Contact Information

Update contact details in all HTML files (footer section):

```html
<li><strong>Tel:</strong> +370 5 272 3304</li>
<li><strong>Mob:</strong> +370 699 47468</li>
<li><strong>El. paštas:</strong> <a href="mailto:info@miltegona.lt">info@miltegona.lt</a></li>
```

### Google Maps Integration

In `contact.html`, update the Google Maps embed code with your actual location:

```html
<iframe src="YOUR_GOOGLE_MAPS_EMBED_URL" ...></iframe>
```

## 🎨 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 📱 Mobile Responsive

The website is fully responsive with breakpoints at:
- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: < 768px

## 🔧 Technologies Used

- HTML5
- CSS3 (Flexbox, Grid, Custom Properties)
- JavaScript (ES6+)
- PHP 7.4+
- Google Fonts (Roboto)

## 📞 Support

For questions or issues, contact:
- Email: info@miltegona.lt
- Phone: +370 5 272 3304

## 📄 License

© 2026 UAB Miltegona. All rights reserved.

## 🚀 Future Enhancements

- [ ] Add real images to gallery
- [ ] Implement database for contact form logging
- [ ] Add language switcher (LT/EN)
- [ ] Integrate analytics (Google Analytics)
- [ ] Add blog section
- [ ] Implement online quotation system
- [ ] Add customer testimonials
- [ ] Social media integration

## 📝 Notes

- Remember to add your actual business images
- Update meta descriptions for better SEO
- Configure email server settings for production
- Test contact form thoroughly before going live
- Consider adding CAPTCHA to prevent spam

---

**Built with ❤️ for UAB Miltegona**
