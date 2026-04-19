import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  paymentMethod: string;
  installments?: string;
}

export async function extractTransactionsFromFile(fileBase64: string, mimeType: string, categories: string[]): Promise<ExtractedTransaction[]> {
  const prompt = `Extraia todas as transações financeiras deste arquivo (PDF ou CSV de fatura/extrato bancário). 
        Retorne um array JSON de objetos com os seguintes campos:
        - date: string (formato YYYY-MM-DD)
        - description: string
        - amount: number (valor positivo para gastos)
        - category: string (ESCOLHA OBRIGATORIAMENTE DESTA LISTA: [${categories.join(", ")}]. Se não encontrar uma categoria adequada, use "Outros")
        - paymentMethod: string (ex: Cartão de Crédito, Débito, PIX)
        - installments: string (se houver, ex: "2 de 9")
        - type: string (use 'expense' para gastos/débitos e 'income' para ganhos/créditos)
        
        IMPORTANTE: Ignore transações que sejam "Pagamento de fatura" ou "Pagamento de cartão de crédito", pois estas representam a liquidação da fatura e não um gasto individual.
        
        Seja preciso com os valores e datas.`;

  console.log("🚀 [Gemini] Iniciando extração...", { 
    mimeType, 
    categoriesCount: categories.length,
    dataSize: fileBase64.length 
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
      },
    });

    console.log("📥 [Gemini] Resposta bruta da IA:", response.text);

    const results: ExtractedTransaction[] = JSON.parse(response.text);
    console.log(`✅ [Gemini] ${results.length} transações extraídas com sucesso.`);

    // Filtro de segurança para evitar pagamentos de fatura (evita contagem duplicada)
    return results.filter(tx => {
      const desc = tx.description.toLowerCase();
      return !desc.includes("pagamento de fatura") && !desc.includes("pagamento fatura") && !desc.includes("pagamento de cartão");
    });
  } catch (e: any) {
    console.error("💥 [Gemini] Erro crítico na API ou parsing:", e);
    return [];
  }
}
