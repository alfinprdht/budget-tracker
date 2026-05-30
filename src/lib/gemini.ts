type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
};

function extractGeminiText(result: GeminiResponse): string {
  const candidate = result.candidates?.[0];

  if (!candidate?.content?.parts?.length) {
    throw new Error("Gemini API tidak mengembalikan respons");
  }

  const text = candidate.content.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini API tidak mengembalikan respons");
  }

  if (candidate.finishReason === "MAX_TOKENS") {
    return `${text}\n\n[Catatan: respons mungkin terpotong karena batas token. Jalankan analisa ulang jika perlu.]`;
  }

  return text;
}

export async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di file .env");
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 8192);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API gagal: ${errorText}`);
  }

  const result = (await response.json()) as GeminiResponse;
  return extractGeminiText(result);
}
