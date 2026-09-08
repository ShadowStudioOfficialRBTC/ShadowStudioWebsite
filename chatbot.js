const messages = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#chatInput");
const clearChat = document.querySelector("#clearChat");
const statusText = document.querySelector("#statusText");
const modelStatus = document.querySelector("#modelStatus");
const assetStates = {
    tokenizer: document.querySelector("#tokenizerState"),
    adapter: document.querySelector("#adapterState"),
    data: document.querySelector("#dataState")
};
let knowledge = [];

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
            if (name === "data") knowledge = parseCsv(content);
        } else {
            setAssetState(name, "unavailable", false);
        }
    }

    const adapterReady = assetStates.adapter.classList.contains("is-ready");
    statusText.textContent = adapterReady
        ? "Local assets ready · adapter needs Qwen base runtime"
        : "Local assistant ready · asset check incomplete";
    modelStatus.classList.add("is-ready");
}

function parseCsv(csv) {
    return csv.split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
        const match = line.match(/^([^,]+),("[\s\S]*"|.*)$/);
        if (!match) return null;
        return {
            question: match[1].trim().toLowerCase(),
            answer: match[2].trim().replace(/^"|"$/g, "").replace(/""/g, '"')
        };
    }).filter(Boolean);
}

function getReply(prompt) {
    const normalized = prompt.toLowerCase().replace(/[?!.,]/g, "").trim();
    const exact = knowledge.find((item) => item.question === normalized);
    if (exact) return exact.answer;
    const related = knowledge.find((item) => normalized.includes(item.question) || item.question.includes(normalized));
    if (related) return related.answer;
    if (/hello|hi|hey/.test(normalized)) return "Hello! I am Shadow. How can I help you today?";
    if (/help|do you do|capabilities/.test(normalized)) return "I can help answer questions, write code, brainstorm, and process text. Try asking me about the studio or give me something to make.";
    return "I am still learning that one. Try asking me about Shadow, ShadowStudios, robotics, code, or a creative idea.";
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

function replyTo(prompt) {
    window.setTimeout(() => addMessage(getReply(prompt), "shadow"), 300);
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
