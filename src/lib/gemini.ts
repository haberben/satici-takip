export const callGeminiApi = async (prompt: string, apiKey: string) => {
  const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '';
  const finalApiKey = apiKey || envKey;
  
  if (!finalApiKey) {
    throw new Error('API anahtarı bulunamadı. Lütfen sağ üstteki ayarlar ikonundan API anahtarınızı girin.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${finalApiKey}`;

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
