import { useState } from 'react';
import { Lightbulb, Download, Loader2, AlertCircle, Presentation, Sparkles } from 'lucide-react';
import { callGeminiApi } from '../lib/gemini';
import ReactMarkdown from 'react-markdown';
import pptxgen from 'pptxgenjs';

export function IdefixIdeaPanel() {
  const [idea, setIdea] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setError('Lütfen bir konu veya fikir girin.');
      return;
    }

    const apiKey = localStorage.getItem('geminiApiKey') || '';

    setLoading(true);
    setError(null);

    const prompt = `Sen İdefix e-ticaret platformunda çalışan yaratıcı bir ürün yöneticisi ve stratejistsin. Kullanıcı senden şu konu hakkında bir sunum taslağı hazırlamanı istiyor: "${idea}"\n\nSenden İstenenler:\n1. Konuyu çekici bir başlık ve kısa bir özet ile başlat.\n2. Bu fikrin/sorunun İdefix satıcıları ve platformu için neden önemli olduğunu (Neden?) açıkla.\n3. Aksiyon planı veya çözüm adımlarını (Nasıl?) 3-4 madde halinde sırala.\n4. Beklenen sonuçlar ve kazanımları belirt.\n\nLütfen Markdown formatında ve profesyonel, vizyoner bir dille yaz. Slaytlara bölünebilecek şekilde yapılandır (Örn: "## Slayt 1: Başlık" gibi). Sadece Türkçe yanıt ver.`;

    try {
      const response = await callGeminiApi(prompt, apiKey);
      setResult(response);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPPTX = () => {
    if (!result) return;
    
    const pptx = new pptxgen();
    pptx.author = 'İBRAHİM YILDIRIM';
    pptx.company = 'İdefix';
    
    const slides = result.split(/## Slayt \d+:/i).filter(s => s.trim().length > 0);
    
    if (slides.length === 1 && !result.includes('## Slayt')) {
      const slide = pptx.addSlide();
      slide.addText('İdefix Fikir Sunumu', { x: 0.5, y: 0.5, w: 9, h: 1, fontSize: 32, bold: true, color: '003366', fontFace: 'Segoe UI' });
      slide.addText(result.replace(/[*#]/g, '').substring(0, 1000), { x: 0.5, y: 1.8, w: 9, h: 3.5, fontSize: 14, color: '333333', fontFace: 'Segoe UI' });
    } else {
      slides.forEach((content, index) => {
        const slide = pptx.addSlide();
        const lines = content.trim().split('\n');
        const title = lines[0].replace(/[*#]/g, '').trim() || `Slayt ${index + 1}`;
        const body = lines.slice(1).join('\n').replace(/[*#]/g, '').trim();
        
        // Header
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: 'f59e0b' } }); // Gold line
        slide.addText(title, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 24, bold: true, color: '003366', fontFace: 'Segoe UI' });
        
        // Body
        if (body) {
           slide.addText(body.substring(0, 800), { x: 0.5, y: 1.5, w: 9, h: 3.5, fontSize: 16, color: '333333', align: 'left', valign: 'top', fontFace: 'Segoe UI' });
        }
      });
    }

    pptx.writeFile({ fileName: 'Idefix_Fikir_Sunumu.pptx' });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', gap: '2rem', flexDirection: 'column', height: '100%' }}>
      <div className="flex gap-4 flex-wrap" style={{ height: '100%', minHeight: '600px' }}>
        
        {/* Sol Panel: Giriş */}
        <div style={{ flex: '1 1 350px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="stat-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.1))', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <h3 className="flex items-center gap-2 mb-2" style={{ color: '#d97706' }}>
              <Lightbulb size={20} />
              İdefix Fikir Alanı
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Yeni projeler, iyileştirmeler veya operasyonel fikirleriniz için profesyonel sunum taslakları hazırlar.
            </p>

            <label className="form-label">Fikriniz Nedir?</label>
            <textarea
              className="form-textarea mb-4"
              rows={5}
              placeholder="Örn: Satıcıların kendi kargo şablonlarını oluşturabilmesi için bir panel ekleyelim. Böylece operasyonel yükümüz azalır..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />

            <button 
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', gap: '0.5rem', background: '#d97706', border: 'none' }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              Taslak Oluştur
            </button>
          </div>

          {result && (
            <button 
              className="btn btn-outline w-full"
              style={{ justifyContent: 'center', gap: '0.5rem', borderColor: '#d97706', color: '#d97706', height: '50px' }}
              onClick={handleExportPPTX}
            >
              <Download size={18} />
              PowerPoint Olarak İndir
            </button>
          )}
        </div>

        {/* Sağ Panel: Çıktı */}
        <div className="stat-card" style={{ flex: '2 1 500px', padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg-app)' }}>
          {error && (
            <div className="flex items-center gap-2 mb-4" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 gap-4" style={{ flexDirection: 'column', minHeight: '400px' }}>
              <Loader2 size={40} className="animate-spin" style={{ color: '#d97706' }} />
              <p>Fikriniz profesyonel bir sunuma dönüştürülüyor...</p>
            </div>
          ) : result ? (
            <div className="markdown-body" style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 gap-3 text-center" style={{ flexDirection: 'column', opacity: 0.6, minHeight: '400px' }}>
              <Presentation size={48} />
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>Taslak Bekleniyor</h3>
              <p style={{ maxWidth: '400px', margin: 0 }}>Aklınızdaki fikri sol tarafa yazarak İdefix formatında bir sunum taslağı elde edebilirsiniz.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
