export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ ok: false, error: "Method not allowed" })
    };
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        ok: false,
        error: "APPS_SCRIPT_URL is not configured in Netlify environment variables"
      })
    };
  }

  try {
    const upstream = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body || "{}"
    });
    const text = await upstream.text();
    return {
      statusCode: upstream.ok ? 200 : upstream.status,
      headers: {
        ...cors,
        "Content-Type": upstream.headers.get("content-type") || "application/json"
      },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ ok: false, error: error.message || "Proxy error" })
    };
  }
}
