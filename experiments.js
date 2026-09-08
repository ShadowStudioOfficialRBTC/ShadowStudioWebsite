const experimentGrid = document.querySelector("#experimentGrid");

function createExperimentCard(experiment) {
    const card = document.createElement("article");
    card.className = "experiment-card";
    const image = document.createElement("img");
    image.src = experiment.image;
    image.alt = `${experiment.title} preview`;
    const title = document.createElement("h2");
    title.textContent = experiment.title;
    const description = document.createElement("p");
    description.textContent = experiment.description;
    const link = document.createElement("a");
    link.className = "button button-primary";
    link.href = experiment.link;
    link.textContent = "Open experiment";
    card.append(image, title, description, link);
    return card;
}

async function loadExperiments() {
    try {
        const response = await fetch("exp/experiments.json");
        if (!response.ok) throw new Error("Experiment catalog unavailable");
        const experiments = await response.json();
        experimentGrid.replaceChildren(...experiments.map(createExperimentCard));
    } catch (error) {
        experimentGrid.innerHTML = "<p class=\"loading-state\">Add an experiment folder and list it in exp/experiments.json.</p>";
    }
}

loadExperiments();