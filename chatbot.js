import { env, pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm";

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct-ONNX";
const messages = document.querySelector("#messages");
const form = document.querySelector("#chatForm");
const input = document.querySelector("#chatInput");
const clearChat = document.querySelector("#clearChat");
const statusText = document.querySelector("#statusText");
const modelStatus = document.querySelector("#modelStatus");
const assetStates = {
    model: document.querySelector("#adapterState"),
    runtime: document.querySelector("#dataState")
};
let generator;
let loadingPromise;

env.allowLocalModels = false;
env.useBrowserCache = true;

function setAssetState(name, value, isReady) {
    assetStates[name].textContent = value;
    assetStates[name].classList.toggle("is-ready", isReady);
}

function setStatus(text, isReady = false) {
    statusText.textContent = text;
    modelStatus.classList.toggle("is-ready", isReady);
}

async function loadBrowserModel() {
    if (generator) return generator;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
        setStatus("Downloading browser model · first load may take a moment...");
        setAssetState("model", "loading", false);
        setAssetState("runtime", "starting", false);
        let device = "wasm";
        if ("gpu" in navigator) {
            try {
                const adapter = await navigator.gpu.requestAdapter();
                if (adapter) device = "webgpu";
            } catch (error) {
                device = "wasm";
            }
        }
        try {
            generator = await pipeline("text-generation", MODEL_ID, { device, dtype: "q4" });
        } catch (error) {
            if (device !== "wasm") {
                setStatus("WebGPU unavailable · switching to browser CPU...");
                generator = await pipeline("text-generation", MODEL_ID, { device: "wasm", dtype: "q4" });
                device = "wasm";
            } else {
                throw error;
            }
        }
        setAssetState("model", "loaded", true);
        setAssetState("runtime", device, true);
        setStatus(`Shadow is ready · running in browser (${device})`, true);
        return generator;
    })();
    try {
        return await loadingPromise;
    } catch (error) {
        loadingPromise = undefined;
        setStatus("Browser model could not load");
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
        const model = await loadBrowserModel();
        const output = await model(`<|im_start|>system\nYou are Shadow, a helpful AI assistant created by ShadowStudios.<|im_end|>\n<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`, {
            max_new_tokens: 180, do_sample: true, temperature: 0.7, top_p: 0.9, return_full_text: false
        });
        const reply = output[0]?.generated_text?.trim();
        if (!reply) throw new Error("The browser model returned an empty reply");
        pending.remove();
        addMessage(reply, "shadow");
    } catch (error) {
        pending.remove();
        addMessage(`I could not load the browser model. ${error.message}`, "shadow");
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

loadBrowserModel().catch(() => {});
