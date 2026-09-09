const modelUrl = new URL("Ashadow/HuggingFaceTB/SmolLM-135M-Instruct/onnx/model_q4.onnx", self.registration.scope);
const modelPath = modelUrl.pathname;
const partPaths = [
    `${modelPath}.part1`,
    `${modelPath}.part2`,
    `${modelPath}.part3`,
    `${modelPath}.part4`
];

self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.pathname !== modelPath) return;

    event.respondWith((async () => {
        const responses = await Promise.all(partPaths.map((path) => fetch(path)));
        if (responses.some((response) => !response.ok)) {
            throw new Error("Shadow model parts could not be loaded");
        }
        const parts = await Promise.all(responses.map((response) => response.arrayBuffer()));
        return new Response(new Blob(parts, { type: "application/octet-stream" }), {
            headers: {
            "Content-Length": String(parts.reduce((total, part) => total + part.byteLength, 0)),
                "Content-Type": "application/octet-stream"
            }
        });
    })());
});
