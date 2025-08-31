export async function POST(req: Request) {
  const API_BASE_URL = process.env.API_BASE_URL;
  
  if (!API_BASE_URL) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const formData = await req.formData();
  
  try {
    const backendResponse = await fetch(`${API_BASE_URL}/api/scans/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: req.headers.get('Authorization') || '',
      },
    });

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to forward request" }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}