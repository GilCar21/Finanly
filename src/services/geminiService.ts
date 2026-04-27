import { postGeminiFunction } from "@/lib/geminiApi";

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  paymentMethod: string;
  installments?: string;
}

interface ImportResponse {
  transactions: ExtractedTransaction[];
}

export async function extractTransactionsFromFile(fileBase64: string, mimeType: string, categories: string[]): Promise<ExtractedTransaction[]> {
  try {
    const response = await postGeminiFunction<ImportResponse>("gemini-import", {
      fileBase64,
      mimeType,
      categories,
    });

    return Array.isArray(response.transactions) ? response.transactions : [];
  } catch (e: any) {
    console.error("Erro ao extrair transacoes com Gemini:", e);
    return [];
  }
}
