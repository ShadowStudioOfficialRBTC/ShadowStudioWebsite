from pathlib import Path
from typing import cast

import torch
from flask import Flask, jsonify, request, send_from_directory
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, PreTrainedTokenizerBase


ROOT = Path(__file__).resolve().parent
BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER = ROOT / "AIShadow" / "Shadow500M"
TOKENIZER = ROOT / "AIShadow" / "AShadowTokenizer"

app = Flask(__name__, static_folder=str(ROOT), static_url_path="")
tokenizer: PreTrainedTokenizerBase | None = None
model = None
model_error = None


@app.after_request
def allow_frontend_requests(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


def load_model():
    global model, tokenizer, model_error
    try:
        loaded_tokenizer = AutoTokenizer.from_pretrained(str(TOKENIZER), local_files_only=True)
        loaded_tokenizer.chat_template = (ADAPTER / "chat_template.jinja").read_text(encoding="utf-8")
        tokenizer = loaded_tokenizer
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL,
            torch_dtype=torch.float16,
            low_cpu_mem_usage=True,
        )
        model = PeftModel.from_pretrained(base_model, str(ADAPTER), local_files_only=True)
        model.eval()
    except Exception as error:
        model_error = str(error)
        raise


@app.get("/api/health")
def health():
    if model is None:
        return jsonify({"ready": False, "error": model_error}), 503
    return jsonify({"ready": True, "model": BASE_MODEL, "adapter": str(ADAPTER)})


@app.errorhandler(Exception)
def handle_server_error(error):
    app.logger.exception("Model request failed")
    return jsonify({"error": str(error)}), 500


@app.post("/api/chat")
def chat():
    active_tokenizer = tokenizer
    if model is None or active_tokenizer is None:
        return jsonify({"error": "The Shadow model is not loaded."}), 503
    payload = request.get_json(silent=True) or {}
    message = str(payload.get("message", "")).strip()
    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    messages = [
        {"role": "system", "content": "You are Shadow, a helpful AI assistant created by ShadowStudios."},
        {"role": "user", "content": message},
    ]
    prompt = active_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    prompt_text = prompt if isinstance(prompt, str) else str(prompt)
    inputs = active_tokenizer(prompt_text, return_tensors="pt")
    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=180,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=active_tokenizer.eos_token_id,
        )
    generated = output[0][inputs["input_ids"].shape[1]:]
    decoded = active_tokenizer.decode(generated, skip_special_tokens=True)
    reply = decoded if isinstance(decoded, str) else decoded[0]
    reply = reply.strip()
    return jsonify({"reply": reply or "I do not have a response for that yet."})


@app.get("/")
def home():
    return send_from_directory(ROOT, "chatbot.html")


if __name__ == "__main__":
    load_model()
    app.run(host="0.0.0.0", port=8000, debug=False)