import pandas as pd
import torch
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig

# 1. Load your local CSV dataset
df = pd.read_csv("data.csv")

# 2. Format CSV into Qwen's Chat Template format
def format_prompts(batch):
    formatted_texts = []
    for q, a in zip(batch["q"], batch["a"]):
        messages = [
            {"role": "user", "content": str(q)},
            {"role": "assistant", "content": str(a)}
        ]
        formatted_texts.append(messages)
    return {"messages": formatted_texts}

# Convert pandas DataFrame to Hugging Face Dataset
dataset = Dataset.from_pandas(df)
dataset = dataset.map(format_prompts, batched=True)

# 3. Load Tokenizer & Model
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct"

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
    device_map="auto"
)

# 4. Configure LoRA (Lightweight Efficient Training)
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    bias="none",
    task_type="CAUSAL_LM"
)

# 5. Set Up Training Configuration
sft_config = SFTConfig(
    output_dir="./qwen_fine_tuned",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=3,
    logging_steps=10,
    save_strategy="epoch",
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    max_length=512
)

# 6. Initialize SFTTrainer and Start Training
trainer = SFTTrainer(
    model=model,
    args=sft_config,
    train_dataset=dataset,
    peft_config=peft_config,
    processing_class=tokenizer,
)

print("Starting model training...")
trainer.train()

# 7. Save Final Model Adapter & Tokenizer
trainer.model.save_pretrained("./qwen_fine_tuned_final")
tokenizer.save_pretrained("./qwen_fine_tuned_final")
print("Training complete! Model saved to ./qwen_fine_tuned_final")