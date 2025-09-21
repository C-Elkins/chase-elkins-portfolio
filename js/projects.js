// Projects Data
const projects = [
    {
        title: "Professional Portfolio Website",
        description: "Modern, responsive portfolio showcasing full-stack development transition. Features accessibility-first design, SEO optimization, and mobile-responsive layout.",
        tech: ["HTML5", "CSS3", "JavaScript", "GitHub Pages"],
        image: "🌟",
        github: "https://github.com/C-Elkins/chase-elkins-portfolio",
        demo: "https://c-elkins.github.io/chase-elkins-portfolio/",
        status: "completed"
    },
    {
        title: "DevStudio",
        description: "Comprehensive portfolio platform showcasing modern web development skills with interactive elements and dynamic content management.",
        tech: ["JavaScript", "HTML5", "CSS3", "Git"],
        image: "🚀",
    github: "https://github.com/C-Elkins/Devstudio",
        demo: "#",
        status: "in-progress"
    },
    {
        title: "IT Asset Management System",
        description: "Full-stack application for tracking IT equipment, software licenses, and maintenance schedules with role-based access control.",
        tech: ["Java", "Spring Boot", "React", "PostgreSQL"],
        image: "💻",
        github: "#",
        demo: "#",
        status: "planned"
    },
    {
        title: "Network Security Monitor",
        description: "Python-based tool for monitoring network security, detecting anomalies, and generating automated reports for IT teams.",
        tech: ["Python", "Flask", "SQLite", "Chart.js"],
        image: "🛡️",
        github: "#",
        demo: "#",
        status: "planned"
    },
    {
        title: "Remote Helpdesk Mobile App",
        description: "Mobile-first PWA for IT support ticket management with offline capabilities and real-time notifications.",
        tech: ["React Native", "Node.js", "MongoDB", "Socket.io"],
        image: "📱",
        github: "#",
        demo: "#",
        status: "planned"
    },
    {
        title: "System Log Analyzer",
        description: "Automated log parsing and analysis tool that identifies patterns, anomalies, and generates actionable insights.",
        tech: ["Python", "Pandas", "FastAPI", "Docker"],
        image: "📊",
        github: "#",
        demo: "#",
        status: "planned"
    },
    {
        title: "Cloud Infrastructure Dashboard",
        description: "Real-time monitoring dashboard for cloud resources with cost tracking and performance optimization suggestions.",
        tech: ["Vue.js", "AWS", "Docker", "Terraform"],
        image: "☁️",
        github: "#",
        demo: "#",
        status: "planned"
    }
];

// Function to create project cards
function createProjectCard(project) {
    const statusClass = project.status === 'completed' ? 'completed' : 
                       project.status === 'in-progress' ? 'in-progress' : 'planned';
    
    const statusText = project.status === 'completed' ? 'Completed' : 
                      project.status === 'in-progress' ? 'In Progress' : 'Coming Soon';
    
    return `
        <div class="project-card scroll-animate hover-lift">
            <div class="project-image">
                ${project.image}
            </div>
            <div class="project-content">
                <div class="project-header">
                    <h3 class="project-title">${project.title}</h3>
                    <span class="project-status ${statusClass}">${statusText}</span>
                </div>
                <p class="project-description">${project.description}</p>
                <div class="project-tech">
                    ${project.tech.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
                <div class="project-links">
                    ${project.github !== '#' ? `
                        <a href="${project.github}" target="_blank" rel="noopener noreferrer" class="project-link">
                            <i class="fab fa-github"></i> Code
                        </a>
                    ` : ''}
                    ${project.demo !== '#' ? `
                        <a href="${project.demo}" target="_blank" rel="noopener noreferrer" class="project-link">
                            <i class="fas fa-external-link-alt"></i> Demo
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Function to load projects
function loadProjects() {
    const projectsContainer = document.getElementById('projects-container');
    if (projectsContainer) {
        projectsContainer.innerHTML = projects.map(createProjectCard).join('');
        
        // Initialize scroll animations for project cards
        initScrollAnimations();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', loadProjects);