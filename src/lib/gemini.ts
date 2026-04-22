export const callGeminiApi = async (prompt: string, apiKey: string) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gemini API bağlantı hatası oluştu. Lütfen API anahtarınızı kontrol edin.');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Yanıt alınamadı.';
};
