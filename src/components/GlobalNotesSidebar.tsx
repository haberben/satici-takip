import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, BookOpen } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalNotesSidebar({ isOpen, onClose }: Props) {
  const { globalNote, updateGlobalNote, fetchGlobalNote } = useStore();
  const [content, setContent] = useState(globalNote);

  useEffect(() => {
    if (isOpen) {
      fetchGlobalNote();
    }
  }, [isOpen, fetchGlobalNote]);

  useEffect(() => {
    setContent(globalNote);
  }, [globalNote]);

  const handleSave = () => {
    updateGlobalNote(content);
  };

  return (
    <>
      {isOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 999 }}
          onClick={onClose}
        />
      )}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3 className="flex items-center gap-2"><BookOpen size={18} /> Serbest Defter</h3>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="sidebar-content">
          <p className="text-sm mb-4 text-secondary">
            Buraya dilediğiniz her şeyi yazabilirsiniz. Çıktığınız an veritabanına otomatik senkronize olur.
          </p>
          <textarea 
            className="form-textarea" 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleSave}
            placeholder="Tarihler, müşteri isimleri, hatırlatmalar..."
            style={{ resize: 'none', flex: 1, minHeight: '300px' }}
          />
        </div>
      </div>
    </>
  );
}
