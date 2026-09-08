const messages = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#chatInput");
const clearChat = document.querySelector("#clearChat");
const statusText = document.querySelector("#statusText");
const modelStatus = document.querySelector("#modelStatus");
const modelServer = window.SHADOW_MODEL_SERVER || "";
const assetStates = {
    tokenizer: document.querySelector("#tokenizerState"),
    adapter: document.querySelector("#adapterState"),
    data: document.querySelector("#dataState")
};
function setAssetState(name, value, isReady) {
    assetStates[name].textContent = value;
    assetStates[name].classList.toggle("is-ready", isReady);
}

async function loadLocalAssets() {
    const assets = [
        ["tokenizer", "AIShadow/AShadowTokenizer/tokenizer.json"],
        ["adapter", "AIShadow/Shadow500M/adapter_config.json"],
        ["data", "AIShadow/data.csv"]
    ];
    const results = await Promise.allSettled(assets.map(([, path]) => fetch(path)));

    for (const [index, result] of results.entries()) {
        const [name] = assets[index];
        if (result.status === "fulfilled" && result.value.ok) {
            const content = await result.value.text();
            setAssetState(name, "loaded", true);
        } else {
            setAssetState(name, "unavailable", false);
        }
    }

    const adapterReady = assetStates.adapter.classList.contains("is-ready");
    statusText.textContent = adapterReady
        ? "Server assets loaded · connecting to model runtime..."
        : "Server model assets incomplete · runtime unavailable";
    modelStatus.classList.toggle("is-ready", adapterReady);

    try {
        const response = await fetch(`${modelServer}/api/health`);
        if (!response.ok) throw new Error("Model runtime unavailable");
        statusText.textContent = "Shadow is ready · running on server";
    } catch (error) {
        statusText.textContent = "The Shadow server is unavailable";
        modelStatus.classList.remove("is-ready");
    }
}

function addMessage(text, sender) {
    const article = document.createElement("article");
    article.className = `message message-${sender}`;
    const label = sender === "user" ? "You" : "Shadow";
    article.innerHTML = `<div class="message-label">${label} <time>now</time></div><p></p>`;
    article.querySelector("p").textContent = text;
    messages.append(article);
    messages.scrollTop = messages.scrollHeight;
}

async function replyTo(prompt) {
    const pending = document.createElement("article");
    pending.className = "message message-shadow message-pending";
    pending.innerHTML = '<div class="message-label">Shadow <time>now</time></div><p>Thinking...</p>';
    messages.append(pending);
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await fetch(`${modelServer}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: prompt })
        });
        const responseText = await response.text();
        let result;
        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            throw new Error(`Server returned ${response.status} ${response.statusText}, not JSON`);
        }
        if (!response.ok) throw new Error(result.error || `Model request failed (${response.status})`);
        if (!result.reply) throw new Error("The model returned an empty reply");
        pending.remove();
        addMessage(result.reply, "shadow");
    } catch (error) {
        pending.remove();
        addMessage(`I could not reach the Shadow server. ${error.message}`, "shadow");
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;
    addMessage(prompt, "user");
    input.value = "";
    replyTo(prompt);
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
        input.value = button.dataset.prompt;
        input.focus();
    });
});

clearChat.addEventListener("click", () => {
    messages.replaceChildren();
    addMessage("Chat cleared. What should we explore next?", "shadow");
    input.focus();
});

loadLocalAssets();
