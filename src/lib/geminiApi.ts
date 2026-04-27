export interface GeminiApiErrorPayload {
  error?: string;
}

export async function postGeminiFunction<TResponse>(
  endpoint: string,
  payload: unknown
): Promise<TResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "";
  const url = `${baseUrl}/.netlify/functions/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Erro ao processar a requisicao do Gemini.";

    try {
      const data = (await response.json()) as GeminiApiErrorPayload;
      if (data.error) {
        message = data.error;
      }
    } catch {
      // Keep fallback message when the response body is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}
