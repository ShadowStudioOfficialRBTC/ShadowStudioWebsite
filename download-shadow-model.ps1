$ErrorActionPreference = "Stop"

$model = "HuggingFaceTB/SmolLM-135M-Instruct"
$destination = Join-Path $PSScriptRoot "Ashadow\$model"

Write-Host "Downloading $model to $destination"
hf download $model `
    config.json `
    generation_config.json `
    special_tokens_map.json `
    tokenizer.json `
    tokenizer_config.json `
    onnx/model_q4.onnx `
    --local-dir $destination

Write-Host "Shadow model downloaded successfully."
