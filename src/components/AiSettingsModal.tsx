import { useState, useEffect } from 'react';
import { X, Key } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function AiSettingsModal({ onClose }: Props) {
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setApiKey(localStorage.getItem('geminiApiKey') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('geminiApiKey', apiKey.trim());
    alert('API Anahtarı kaydedildi!');
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg shadow-xl max-w-md w-full p-6 relative" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Key size={24} style={{ color: 'var(--primary-color)' }} />
          Yapay Zeka API Ayarları
        </h2>
        
        <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Yapay zeka özelliklerini (Arka Sayfa, İdefix Fikir Alanı) kullanabilmek için Google Gemini API anahtarınızı girmeniz gerekmektedir. Ücretsiz bir anahtar almak için Google AI Studio'yu ziyaret edebilirsiniz.
        </p>

        <input
          type="password"
          placeholder="API Anahtarınızı Buraya Girin (AIzaSy...)"
          className="form-input w-full mb-4"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        
        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose}>İptal</button>
          <button className="btn btn-primary" onClick={handleSave}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}
