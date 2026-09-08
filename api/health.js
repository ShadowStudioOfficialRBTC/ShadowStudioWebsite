export default async function handler(request, response) {
    if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        return response.status(405).json({ error: "Method not allowed" });
    }

    const server = process.env.SHADOW_MODEL_SERVER;
    if (!server) {
        return response.status(503).json({
            error: "SHADOW_MODEL_SERVER is missing. Add it in Vercel Project Settings > Environment Variables."
        });
    }

    try {
        const upstream = await fetch(`${server.replace(/\/$/, "")}/api/health`);
        const body = await upstream.text();
        return response.status(upstream.status).send(body || JSON.stringify({ error: "Empty model server response" }));
    } catch (error) {
        return response.status(502).json({ error: `Model server unavailable: ${error.message}` });
    }
}