import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Sparkles, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { callGeminiApi } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';

export function AiSupportPanel() {
  const { notes } = useStore();
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [extraContext, setExtraContext] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
      setError('Lütfen önce sağ üstteki "AI Ayarları" butonundan API anahtarınızı girin.');
      return;
    }

    setLoading(true);
    setError(null);

    const validNotes = notes.filter(n => n.subject && n.subjectDetail);
    
    // Son 100 kaydı alalım (Token limiti için)
    const contextData = validNotes.slice(0, 100).map(n => 
      `Konu: ${n.subject}\nDetay: ${n.subjectDetail}\nÇözüm: ${n.solution || 'Yok'}`
    ).join('\n\n---\n\n');

    let prompt = `Sen e-ticaret satıcı destek operasyonları için uzman bir danışmansın. Aşağıda sistemimizde karşılaşılan bazı satıcı sorunları (Konu, Detay ve varsa Çözüm) listelenmiştir.\n\nSenden İstenenler:\n1. Bu sorunları ana kategorilerine göre grupla (Örn: Kargo Sorunları, İade Sorunları vs.).\n2. Her kategori için, bu sorunların neden kaynaklandığına dair kısa bir analiz yap.\n3. Bu sorunların tekrar yaşanmaması için sistem veya süreç bazlı *kalıcı çözüm önerileri* sun.\n4. Sadece Türkçe ve profesyonel bir dil kullan.\n\n`;
    
    if (extraContext) {
      prompt += `Ayrıca kullanıcı şu ek bilgiyi/soruyu da değerlendirmeni istedi: "${extraContext}"\n\n`;
    }

    prompt += `İşte Veriler:\n${contextData || 'Sistemde henüz detaylı not yok, genel tavsiyeler verebilirsin.'}`;

    try {
      const response = await callGeminiApi(prompt, apiKey);
      setAnalysisResult(response);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', gap: '2rem', flexDirection: 'column', height: '100%' }}>
      <div className="flex gap-4 flex-wrap" style={{ height: '100%', minHeight: '600px' }}>
        
        {/* Sol Panel: Ek Bilgi ve Analiz Tetikleme */}
        <div style={{ flex: '1 1 350px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stat-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <h3 className="flex items-center gap-2 mb-2" style={{ color: 'var(--primary-color)' }}>
              <Sparkles size={20} />
              AI Sorun Analizi
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Sistemdeki satıcı notlarınızı analiz ederek kalıcı çözüm önerileri üretir.
            </p>

            <label className="form-label">Özel Talimat / Ek Bağlam Ekle</label>
            <textarea
              className="form-textarea mb-4"
              rows={4}
              placeholder="Örn: Özellikle kargo ile ilgili sorunlara odaklan ve lojistik firmasına ne dememiz gerektiğini söyle..."
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
            />

            <button 
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', gap: '0.5rem', background: 'var(--primary-color)', border: 'none' }}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {analysisResult ? 'Yeniden Türet' : 'Analizi Başlat'}
            </button>
          </div>

          <div className="stat-card" style={{ padding: '1.5rem' }}>
            <h4 className="mb-2" style={{ fontSize: '0.95rem' }}>Nasıl Çalışır?</h4>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Veritabanındaki "Konu", "Detay" ve "Çözüm" verilerinizi okur.</li>
              <li>Bu verileri gruplar ve özetler.</li>
              <li>Sorunların tekrar etmemesi için şirket içi süreç veya yazılım bazlı kalıcı çözümler önerir.</li>
              <li>Bu sayfayı paylaştığınız kişiler <b>göremez</b>.</li>
            </ul>
          </div>
        </div>

        {/* Sağ Panel: Analiz Sonucu */}
        <div className="stat-card" style={{ flex: '2 1 500px', padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg-app)' }}>
          {error && (
            <div className="flex items-center gap-2 mb-4" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4" style={{ minHeight: '400px' }}>
              <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary-color)' }} />
              <p>Yapay zeka verilerinizi analiz ediyor, lütfen bekleyin...</p>
            </div>
          ) : analysisResult ? (
            <div className="markdown-body" style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              <ReactMarkdown>{analysisResult}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 text-center" style={{ opacity: 0.6, minHeight: '400px' }}>
              <Sparkles size={48} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Henüz Analiz Yapılmadı</h3>
              <p style={{ maxWidth: '400px' }}>Sol taraftaki butonu kullanarak veritabanınızdaki sorunların yapay zeka tarafından analiz edilmesini sağlayın.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
