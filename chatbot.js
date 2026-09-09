import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";

const MODEL_PATH = "HuggingFaceTB/SmolLM-135M-Instruct";
const MODEL_NAME = "Shadow";
const SYSTEM_PROMPT = "You are Shadow, the official assistant of Shadow Studios. Shadow Studios is a creative place where innovative ideas are imagined, explored, and built through robotics, software, design, digital art, and experiments. Explain the studio clearly when asked about it. Be thoughtful, concise, curious, and practical. Do not claim to be human or invent facts about Shadow Studios.";
const ESTIMATED_LOAD_SECONDS = 120;
const messages = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#chatInput");
const clearChat = document.querySelector("#clearChat");
const statusText = document.querySelector("#statusText");
const modelStatus = document.querySelector("#modelStatus");
const modelLoader = document.querySelector("#modelLoader");
const loaderTitle = document.querySelector("#loaderTitle");
const loaderCopy = document.querySelector("#loaderCopy");
const timeLeft = document.querySelector("#timeLeft");
const loaderProgress = document.querySelector("#loaderProgress");
const assetStates = {
    model: document.querySelector("#adapterState"),
};
let generator;
let loadingPromise;

env.localModelPath = "./Ashadow/";
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.useBrowserCache = true;
let loadStartedAt;
let countdownTimer;

function setAssetState(name, value, isReady) {
    assetStates[name].textContent = value;
    assetStates[name].classList.toggle("is-ready", isReady);
}

function setStatus(text, isReady = false) {
    statusText.textContent = text;
    modelStatus.classList.toggle("is-ready", isReady);
}

function updateCountdown() {
    const elapsed = Math.floor((Date.now() - loadStartedAt) / 1000);
    const remaining = Math.max(0, ESTIMATED_LOAD_SECONDS - elapsed);
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    timeLeft.textContent = `${minutes}:${seconds}`;
}

function startLoadingScreen() {
    loadStartedAt = Date.now();
    updateCountdown();
    countdownTimer = window.setInterval(updateCountdown, 1000);
    loaderTitle.textContent = "Loading Shadow";
    loaderCopy.textContent = "Preparing your private chat session.";
    loaderProgress.style.width = "6%";
}

function showModelLoading() {
    loaderTitle.textContent = "Loading Shadow";
    loaderCopy.textContent = "Preparing Shadow for your conversation.";
}

function finishLoadingScreen() {
    window.clearInterval(countdownTimer);
    timeLeft.textContent = "00:00";
    loaderTitle.textContent = "Shadow is ready";
    loaderCopy.textContent = "The chat is live. Your messages run in this browser session.";
    loaderProgress.style.width = "100%";
    window.setTimeout(() => modelLoader.classList.add("is-hidden"), 700);
}

async function loadWorkspaceModel(onProgress = () => {}) {
    if (generator) return generator;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
        if ("serviceWorker" in navigator) {
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) {
                await new Promise((resolve) => {
                    navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
                });
            }
        }
        showModelLoading();
        onProgress("Loading Shadow from local files...");
        setStatus("Loading Shadow...");
        setAssetState("model", "loading", false);
        generator = await pipeline("text-generation", MODEL_PATH, {
            dtype: "q4",
            progress_callback: (progress) => {
                if (progress.status === "progress" && progress.progress) {
                    const percent = Math.round(progress.progress);
                    loaderProgress.style.width = `${Math.max(6, percent)}%`;
                    onProgress(`Loading Shadow from local files... ${percent}%`);
                }
            }
        });
        setAssetState("model", "loaded", true);
        setStatus("Shadow is ready", true);
        finishLoadingScreen();
        return generator;
    })();
    try {
        return await loadingPromise;
    } catch (error) {
        loadingPromise = undefined;
        window.clearInterval(countdownTimer);
        loaderTitle.textContent = `${MODEL_NAME} could not load`;
        loaderCopy.textContent = `The local Shadow files could not be loaded: ${error.message}`;
        setStatus("Shadow model could not load");
        throw error;
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
        const model = await loadWorkspaceModel((progress) => {
            pending.querySelector("p").textContent = progress;
        });
        const output = await model(`<|im_start|>system\n${SYSTEM_PROMPT}<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`, {
            max_new_tokens: 180,
            do_sample: true,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
        });
        const reply = output[0]?.generated_text?.trim();
        if (!reply) throw new Error(`${MODEL_NAME} returned an empty reply`);
        pending.remove();
        addMessage(reply, "shadow");
    } catch (error) {
        pending.remove();
        addMessage(`I could not load ${MODEL_NAME}. ${error.message}`, "shadow");
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

startLoadingScreen();
loadWorkspaceModel().catch(() => {});
