const projectGrid = document.querySelector("#projectGrid");

function createProjectCard(project) {
	const card = document.createElement("article");
	card.className = "project-card";
	const image = project.image
		? `<img src="${project.image}" alt="${project.title} project preview">`
		: "&#9881;";

	card.innerHTML = `
		<div class="project-image">${image}</div>
		<h3>${project.title}</h3>
		<p>${project.description}</p>
		${project.link ? `<a class="project-link" href="${project.link}">View project &#8599;</a>` : ""}
	`;
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
