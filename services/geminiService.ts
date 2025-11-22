import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Product } from '../types';

// Define the response schema for structured output
const itemMatchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    originalRequest: { type: Type.STRING, description: "The exact text line from the customer request" },
    matchedProductDescription: { type: Type.STRING, description: "The exact Description from the catalog that matches, or null if no match found", nullable: true },
    quantity: { type: Type.NUMBER, description: "Quantity inferred from request, default to 1 if not specified" },
    confidence: { type: Type.STRING, enum: ["HIGH", "LOW", "NONE"], description: "Confidence level of the match" },
    reasoning: { type: Type.STRING, description: "Short explanation of why this match was chosen or why it failed" }
  },
  required: ["originalRequest", "quantity", "confidence"]
};

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: itemMatchSchema
};

export const matchQuoteItems = async (
  catalog: Product[], 
  customerRequest: string
): Promise<any[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Simplify catalog to reduce token usage, sending only description strings
  // In a real production app with 10k+ items, we would use embeddings/vector search first.
  // Since the user's file is ~600 items, it fits easily in context.
  const catalogList = catalog.map(p => p.description).join('\n');

  const prompt = `
    Você é um assistente especialista em vendas de materiais elétricos.
    
    ABAIXO ESTÁ O CATÁLOGO DE PRODUTOS DA LOJA (Lista de Descrições):
    ---
    ${catalogList}
    ---

    ABAIXO ESTÁ O PEDIDO DO CLIENTE (Texto bruto):
    ---
    ${customerRequest}
    ---

    SUA TAREFA:
    Para cada item solicitado pelo cliente, encontre a CORRESPONDÊNCIA MAIS PROVÁVEL no catálogo.
    
    REGRAS:
    1. Se o cliente escrever "Fio 2.5", e no catálogo tiver "CABO FLEX 2,5MM", isso é um match.
    2. Se o cliente escrever "Tomada 20A", procure por "TOMADA 20A" ou marcas comuns listadas (Liz, Aria, etc).
    3. Se não houver correspondência clara, retorne null em 'matchedProductDescription' e confidence 'NONE'.
    4. Extraia a quantidade. Se não especificado, assuma 1.
    5. Identifique padrões de escrita (ex: "cx" = "caixa", "int" = "interruptor").
    
    Retorne um JSON Array seguindo o schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for deterministic matching
      },
    });

    const resultText = response.text;
    if (!resultText) return [];
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw error;
  }
};