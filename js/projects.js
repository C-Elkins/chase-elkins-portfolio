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
        title: "RetroWave Music Visualizer",
        description: "Interactive music visualizer with 80s synthwave aesthetics. Features real-time audio analysis, customizable effects, and the ability to upload your own tracks.",
        tech: ["JavaScript", "Web Audio API", "Canvas", "CSS3 Animations"],
        image: "🎵",
        github: "#",
        demo: "#",
        status: "in-progress"
    },
    {
        title: "Asset Management System",
        description: "Full-stack application for tracking IT equipment, software licenses, and maintenance schedules with role-based access control.",
        tech: ["Java", "Spring Boot", "React", "PostgreSQL"],
        image: "💻",
        github: "https://github.com/C-Elkins/Asset-Management",
        demo: "#",
        status: "in-progress"
    },
    {
        title: "AI-Powered Code Snippet Manager",
        description: "Smart code snippet library with AI-powered search, syntax highlighting, and organization. Features tagging, version control, and team collaboration capabilities.",
        tech: ["TypeScript", "Next.js", "Tailwind CSS", "Supabase"],
        image: "🤖",
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
function loadProjects(filter = 'all') {
    const projectsContainer = document.getElementById('projects-container');
    if (projectsContainer) {
        const filteredProjects = filter === 'all'
            ? projects
            : projects.filter(project => project.status === filter);

        projectsContainer.innerHTML = filteredProjects.map(createProjectCard).join('');

        // Initialize scroll animations for project cards
        if (typeof initScrollAnimations === 'function') {
            initScrollAnimations();
        }
    }
}

// Initialize project filtering
function initProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Get filter value and load projects
            const filter = this.getAttribute('data-filter');
            loadProjects(filter);
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadProjects();
    initProjectFilters();
});