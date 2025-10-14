# Chase Elkins - Portfolio Website

[![Deploy static site to GitHub Pages](https://github.com/C-Elkins/chase-elkins-portfolio/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/C-Elkins/chase-elkins-portfolio/actions/workflows/pages.yml)

> A modern, responsive portfolio showcasing my transition from IT Professional to Full-Stack Developer

**Live Demo:** [https://c-elkins.github.io/chase-elkins-portfolio/](https://c-elkins.github.io/chase-elkins-portfolio/)

---

## 👨‍💻 About Me

I'm a **Full-Stack Developer** with 8+ years of IT infrastructure experience, now specializing in building modern web applications. My unique background in system troubleshooting, network security, and team leadership gives me a comprehensive perspective on software development—understanding both technical requirements and business needs.

### 💼 Professional Background
- 🔧 **8+ Years** IT Infrastructure Management
- 🎓 **CompTIA Security+** Certified
- 🌐 **Full-Stack Development** Focus
- 🚀 **Remote-First** Approach

---

## 🛠️ Technical Skills

### Frontend Development
![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![HTML5](https://img.shields.io/badge/-HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/-CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Backend Development
![Java](https://img.shields.io/badge/-Java-007396?style=for-the-badge&logo=java&logoColor=white)
![Python](https://img.shields.io/badge/-Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/-Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Spring Boot](https://img.shields.io/badge/-Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)
![Express](https://img.shields.io/badge/-Express-000000?style=for-the-badge&logo=express&logoColor=white)

### Databases
![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MongoDB](https://img.shields.io/badge/-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![MySQL](https://img.shields.io/badge/-MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

### DevOps & Tools
![Git](https://img.shields.io/badge/-Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![Docker](https://img.shields.io/badge/-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/-AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Linux](https://img.shields.io/badge/-Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![VS Code](https://img.shields.io/badge/-VS_Code-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white)

---

## ✨ Portfolio Features

- **🌙 Dark Mode** - Fully functional dark theme with localStorage persistence
- **🎨 Modern UI** - Gradient hero section with glassmorphism effects
- **🎯 Project Filtering** - Filter projects by status (All, Completed, In Progress, Planned)
- **🎪 Animated Skills** - Infinite scrolling skill icons in two directions
- **📱 Responsive Design** - Optimized for all devices and screen sizes
- **⚡ Performance** - Fast loading with optimized assets
- **♿ Accessible** - ARIA labels, semantic HTML, keyboard navigation
- **🔝 Scroll to Top** - Smooth navigation back to hero section
- **📧 Contact Form** - Functional form with Formspree integration
- **🎭 Smooth Animations** - Intersection Observer API for scroll effects

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties (CSS Variables)
- **Icons**: Font Awesome 6.0
- **Fonts**: Google Fonts (Inter)
- **APIs**: Intersection Observer, LocalStorage, Web Audio API
- **Forms**: Formspree
- **Deployment**: GitHub Pages
- **Version Control**: Git & GitHub

## 📁 Project Structure

```bash
portfolio/
├── index.html              # Main HTML file
├── 404.html               # Custom 404 error page
├── success.html           # Form submission success page
├── css/
│   ├── style.css          # Main stylesheet (dark mode, responsive)
│   └── animations.css     # Animation definitions & keyframes
├── js/
│   ├── main.js           # Core functionality (nav, dark mode, scroll)
│   └── projects.js       # Dynamic project rendering & filtering
├── images/
│   ├── profile.jpg       # Profile photo
│   └── projects/         # Project screenshots
├── assets/
│   ├── favicon.svg       # Site favicon
│   └── social-card.png   # Open Graph preview image
├── .github/
│   └── workflows/        # GitHub Actions (auto-deploy)
└── README.md             # Documentation
```

## 🎯 Portfolio Sections

### 1. 🏠 Hero Section
- Gradient background with wave overlay
- Animated typing effect for name
- Call-to-action buttons
- Social media links
- Profile image with gradient border

### 2. 👤 About Section
- Professional background summary
- Experience highlights with icons
- Interactive stat cards
- IT to development transition story

### 3. ⚡ Skills Section (NEW!)
- Infinite scrolling skill icons
- Two-directional animation (left & right)
- Hover to pause functionality
- Responsive icon sizing
- Glassmorphism background effect

### 4. 💼 Projects Section
- Dynamic project cards with status badges
- Filter by: All, Completed, In Progress, Planned
- GitHub & live demo links
- Tech stack tags
- Fade-in animations

### 5. 📬 Contact Section
- Functional contact form (Formspree)
- Contact information with icons
- Form validation
- Success/error notifications

## 🚀 Quick Start

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/C-Elkins/chase-elkins-portfolio.git
   cd chase-elkins-portfolio
   ```

2. **Open in VS Code**

   ```bash
   code .
   ```

3. **Run with Live Server**
   - Install Live Server extension in VS Code
   - Right-click on `index.html` → "Open with Live Server"
   - Or simply open `index.html` in your browser

4. **View in browser**
   - Navigate to `http://localhost:5500` (or the port Live Server assigns)

---

## 📝 Customization Guide

### Adding New Projects

Edit [js/projects.js](js/projects.js) and add to the `projects` array:

```javascript
{
    title: "Your Project Name",
    description: "Brief project description highlighting key features",
    tech: ["React", "Node.js", "MongoDB"],
    image: "🚀", // Emoji or image path
    github: "https://github.com/username/repo",
    demo: "https://your-demo-url.com",
    status: "completed" // or "in-progress" or "planned"
}
```

### Updating Personal Information

| File | What to Update |
|------|----------------|
| `index.html` | Contact details, social media links, email |
| `images/profile.jpg` | Replace with your profile photo |
| `assets/` | Add your resume PDF or other documents |
| `js/projects.js` | Your projects and tech stack |

### Customizing Theme Colors

Update CSS variables in [css/style.css](css/style.css):

```css
:root {
    --primary-color: #667eea;      /* Main brand color */
    --secondary-color: #764ba2;    /* Secondary brand color */
    --text-primary: #2d3748;       /* Main text color */
    --bg-primary: #ffffff;          /* Background color */
    /* ... customize other colors */
}
```

### Dark Mode Colors

```css
[data-theme="dark"] {
    --text-primary: #f7fafc;
    --bg-primary: #1a202c;
    /* ... dark theme overrides */
}
```

## 🌐 Deployment

**🔗 Live Site:** [https://c-elkins.github.io/chase-elkins-portfolio/](https://c-elkins.github.io/chase-elkins-portfolio/)

### Deploy to GitHub Pages

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository `Settings` → `Pages`
   - Source: `Deploy from a branch`
   - Branch: `main` / Folder: `/ (root)`
   - Click `Save`

3. **Wait for deployment**
   - GitHub Actions will automatically build and deploy
   - Your site will be live at: `https://YOUR-USERNAME.github.io/YOUR-REPO/`

### Alternative: Deploy to Netlify

1. **Quick Deploy**
   - Drag & drop project folder to [netlify.com/drop](https://app.netlify.com/drop)

2. **Or connect GitHub repo**
   - Sign in to Netlify → `New site from Git`
   - Connect repository
   - Deploy settings: Auto-detected
   - Click `Deploy site`

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Latest |
| Firefox | ✅ Latest |
| Safari | ✅ Latest (iOS 12+) |
| Edge | ✅ Latest |
| Mobile | ✅ iOS & Android |

## ⚡ Performance & Optimization

- **Lighthouse Score**: 95+ Performance, 100 Accessibility
- **Load Time**: < 1.5s on 3G
- **Bundle Size**: < 50KB (uncompressed)
- **Optimizations**:
  - Preload critical assets (fonts, hero image)
  - Lazy loading for images
  - Intersection Observer for animations
  - Debounced scroll events
  - Minimized external dependencies

## 🎨 Design Philosophy

- **Modern Aesthetic**: Gradient-based color schemes with glassmorphism
- **Typography**: Inter font family for clean readability
- **Layout**: Flexbox & CSS Grid for responsive layouts
- **Animations**: Subtle, purposeful animations that enhance UX
- **Accessibility**: WCAG 2.1 AA compliant
- **Dark Mode**: Full theme support with smooth transitions

## 🔒 Security

For security disclosures, please see [SECURITY.md](./.github/SECURITY.md).

## 📄 License

**Code**: MIT License - see [LICENSE](./LICENSE)

**Content & Media**: © 2025 Chase Elkins. All images, logos, and written content are not licensed for reuse without permission.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please refer to our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📞 Contact

| Platform | Link |
|----------|------|
| 📧 Email | [chase.e.elkins1@gmail.com](mailto:chase.e.elkins1@gmail.com) |
| 💼 LinkedIn | [Chase Elkins](https://linkedin.com/in/chase-elkins-793bb8169) |
| 👨‍💻 GitHub | [@C-Elkins](https://github.com/C-Elkins) |
| 📱 Phone | [+1 (850) 557-3197](tel:+18505573197) |

## 📬 Contact Form Setup

This portfolio uses [Formspree](https://formspree.io) for form handling:

1. **Create Formspree Account**
   - Sign up at [formspree.io](https://formspree.io)
   - Create a new form project

2. **Get Form Endpoint**
   - Copy your form ID (e.g., `meorjqpq`)

3. **Update index.html**
   ```html
   <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```

4. **Configure Settings** (Optional)
   - Add allowed domains in Formspree dashboard
   - Set up email notifications
   - Customize success redirect

---

<div align="center">

**Built with ❤️ by [Chase Elkins](https://github.com/C-Elkins)**

*Full-Stack Developer | IT Professional | Problem Solver*

⭐ Star this repo if you found it helpful!

[View Live Site](https://c-elkins.github.io/chase-elkins-portfolio/) • [Report Bug](https://github.com/C-Elkins/chase-elkins-portfolio/issues) • [Request Feature](https://github.com/C-Elkins/chase-elkins-portfolio/issues)

</div>
