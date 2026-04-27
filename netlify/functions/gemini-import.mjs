import { ensurePost, generateJson, json, parseBody, parseGeneratedJson, Type } from "./_gemini.mjs";

export async function handler(event) {
  const invalidMethod = ensurePost(event);
  if (invalidMethod) return invalidMethod;

  try {
    const { fileBase64, mimeType, categories } = parseBody(event);

    if (!fileBase64 || !mimeType || !Array.isArray(categories) || categories.length === 0) {
      return json(400, { error: "Dados insuficientes para processar a importacao." });
    }

    const prompt = `Extraia todas as transacoes financeiras deste arquivo (PDF ou CSV de fatura/extrato bancario).
Retorne um array JSON de objetos com os seguintes campos:
- date: string (formato YYYY-MM-DD)
- description: string
- amount: number (valor positivo para gastos)
- category: string (ESCOLHA OBRIGATORIAMENTE DESTA LISTA: [${categories.join(", ")}]. Se nao encontrar uma categoria adequada, use "Outros")
- paymentMethod: string (ex: Cartao de Credito, Debito, PIX)
- installments: string (se houver, ex: "2 de 9")
- type: string (use 'expense' para gastos/debitos e 'income' para ganhos/creditos)

IMPORTANTE: Ignore transacoes que sejam "Pagamento de fatura" ou "Pagamento de cartao de credito", pois estas representam a liquidacao da fatura e nao um gasto individual.

Seja preciso com os valores e datas.`;

    const raw = await generateJson({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType,
            data: fileBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      schema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            type: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            installments: { type: Type.STRING },
          },
          required: ["date", "description", "amount", "category", "paymentMethod", "type"],
        },
      },
      temperature: 0.2,
    });

    const parsed = parseGeneratedJson(raw, "array");
    const results = Array.isArray(parsed) ? parsed : [];
    const filtered = results.filter((tx) => {
      const description = String(tx.description ?? "").toLowerCase();
      return (
        !description.includes("pagamento de fatura") &&
        !description.includes("pagamento fatura") &&
        !description.includes("pagamento de cartao")
      );
    });

    return json(200, { transactions: filtered });
  } catch (error) {
    console.error("[gemini-import]", error);
    return json(500, {
      error:
        error instanceof Error && error.message
          ? error.message
          : "Falha ao processar o arquivo com o Gemini.",
    });
  }
}
