$ErrorActionPreference = "Stop"

$model = "HuggingFaceTB/SmolLM-135M-Instruct"
$destination = Join-Path $PSScriptRoot "Ashadow\$model"
$temporary = Join-Path $PSScriptRoot ".shadow-model-download"
$original = Join-Path $temporary "onnx\model_q4.onnx"
$partSize = 90MB

Write-Host "Downloading $model to $destination"
hf download $model `
    config.json `
    generation_config.json `
    merges.txt `
    special_tokens_map.json `
    tokenizer.json `
    tokenizer_config.json `
    vocab.json `
    onnx/model_q4.onnx `
    --local-dir $temporary

New-Item -ItemType Directory -Force -Path (Join-Path $destination "onnx") | Out-Null
Copy-Item (Join-Path $temporary "*.json") $destination -Force
Copy-Item (Join-Path $temporary "merges.txt") $destination -Force

$input = [System.IO.File]::OpenRead($original)
try {
    for ($index = 1; $input.Position -lt $input.Length; $index++) {
        $remaining = $input.Length - $input.Position
        $bytesToCopy = [Math]::Min($partSize, $remaining)
        $partPath = Join-Path $destination "onnx\model_q4.onnx.part$index"
        $output = [System.IO.File]::Create($partPath)
        try {
            $buffer = New-Object byte[] 1048576
            $left = $bytesToCopy
            while ($left -gt 0) {
                $read = $input.Read($buffer, 0, [Math]::Min($buffer.Length, $left))
                if ($read -eq 0) { throw "Unexpected end of model file" }
                $output.Write($buffer, 0, $read)
                $left -= $read
            }
        } finally {
            $output.Dispose()
        }
    }
} finally {
    $input.Dispose()
}

Remove-Item $temporary -Recurse -Force

Write-Host "Shadow model downloaded and split successfully."
