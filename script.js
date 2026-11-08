const projectGrid = document.querySelector("#projectGrid");

function createProjectCard(project) {
    const card = document.createElement("article");
    card.className = "project-card";

    const imageFrame = document.createElement("div");
    imageFrame.className = "project-image";
    if (project.image) {
        const image = document.createElement("img");
        image.src = project.image;
        image.alt = `${project.title} project preview`;
        imageFrame.append(image);
    } else {
        imageFrame.textContent = "\u2699";
    }

    const title = document.createElement("h3");
    title.textContent = project.title;

    const description = document.createElement("p");
    description.textContent = project.description;
    card.append(imageFrame, title, description);

    if (project.link) {
        const link = document.createElement("a");
        link.className = "project-link";
        link.href = project.link;
        link.textContent = "View project \u2197";
        card.append(link);
    }

    return card;
}

async function loadProjects() {
    try {
        const response = await fetch("projects/projects.json");
        if (!response.ok) throw new Error("Project catalog unavailable");
        const projects = await response.json();
        projectGrid.replaceChildren(...projects.map(createProjectCard));
    } catch (error) {
        projectGrid.innerHTML = "<p class=\"loading-state\">Projects are ready to be added. See projects/README.md to start a build.</p>";
    }
}

loadProjects();
