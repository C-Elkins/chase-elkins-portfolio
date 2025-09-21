# Chase Elkins - Portfolio Website

A modern, responsive portfolio website showcasing my transition from IT Professional to Full-Stack Developer.

## 🚀 Features

- **Responsive Design** - Looks great on all devices
- **Modern Animations** - Smooth scroll animations and hover effects
- **Interactive Elements** - Dynamic project loading and contact form
- **Performance Optimized** - Fast loading and smooth scrolling
- **SEO Friendly** - Semantic HTML and meta tags

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter)
- **Deployment**: GitHub Pages / Netlify

## 📁 Project Structure

```bash
portfolio/
├── index.html              # Main HTML file
├── css/
│   ├── style.css           # Main stylesheet
│   └── animations.css      # Animation definitions
├── js/
│   ├── main.js            # Main JavaScript functionality
│   └── projects.js        # Projects data and rendering
├── images/
│   ├── profile.jpg        # Profile photo
│   └── projects/          # Project screenshots
├── assets/
│   └── resume.pdf         # Resume download
└── README.md              # This file
```

## 🎯 Sections

1. **Hero** - Introduction and call-to-action
2. **About** - Background and experience highlights
3. **Skills** - Technical skills organized by category
4. **Projects** - Featured projects with live demos
5. **Contact** - Contact form and information

## 🚀 Quick Start

1. Open the project folder in VS Code
2. Install Live Server extension (if not already installed)
3. Right-click on `index.html` and select "Open with Live Server"
4. Or simply open `index.html` in your browser

## 📝 Customization

### Adding New Projects

Edit `js/projects.js` and add new project objects to the `projects` array:

```javascript
{
    title: "Project Name",
    description: "Project description...",
    tech: ["Technology", "Stack"],
    image: "🚀", // Emoji or image path
    github: "https://github.com/username/repo",
    demo: "https://demo-url.com",
    status: "completed" // completed, in-progress, or planned
}
```

### Updating Personal Information

- Edit contact details in `index.html`
- Replace social media links
- Update the resume link in the assets folder
- Replace `images/profile.jpg` with your photo

### Customizing Colors

Update CSS custom properties in `css/style.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    /* ... other colors */
}
```

## 🌐 Deployment Instructions

Live URL (GitHub Pages):

- <https://c-elkins.github.io/chase-elkins-portfolio/>

### GitHub Pages (Recommended)

1. **Create GitHub Repository:**

    ```bash
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git branch -M main
   git remote add origin https://github.com/C-Elkins/chase-elkins-portfolio.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
   - Save

3. **Your site will be live at:** `https://c-elkins.github.io/chase-elkins-portfolio/`

### Netlify (Alternative)

1. Drag and drop your project folder to [netlify.com](https://netlify.com)
2. Or connect your GitHub repository for auto-deployment

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

## 🎨 Design Features

- **Color Scheme**: Modern gradient-based design
- **Typography**: Clean, readable Inter font family
- **Layout**: CSS Grid and Flexbox for responsive design
- **Animations**: Smooth CSS transitions and scroll animations
- **Accessibility**: ARIA labels and semantic HTML

## 📈 Performance

- Lightweight CSS and JavaScript
- Optimized images and assets
- Minimal external dependencies
- Fast loading times

## 📞 Contact

- **Email**: <chase.e.elkins1@gmail.com>
- **LinkedIn**: [Chase Elkins](https://linkedin.com/in/chase-elkins-793bb8169)
- **GitHub**: [@C-Elkins](https://github.com/C-Elkins)
- **Phone**: +1 (850) 557-3197

## ✉️ Contact Form (Formspree)

This site uses Formspree for contact form handling when hosted on GitHub Pages.

1. Create a Formspree form at <https://formspree.io/forms> and copy your form ID (looks like `xyzabcd`)
2. Update the endpoint in `index.html` contact form:

    `data-endpoint="https://formspree.io/f/yourFormId"` → replace `yourFormId`

3. Optional: Add allowed domains in Formspree settings so submissions from your Pages URL are accepted.
4. Test by submitting the form on your live site; check your email or Formspree dashboard for messages.

---

— Built with ❤️ by Chase Elkins · Full-Stack Developer
