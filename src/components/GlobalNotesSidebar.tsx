import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Plus, Trash2 } from 'lucide-react';

interface GlobalNoteItem {
  id: string;
  text: string;
  date: string;
}

export function GlobalNotesSidebar({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { globalNote, updateGlobalNote, isLoading, fetchGlobalNote } = useStore();
  const [items, setItems] = useState<GlobalNoteItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    fetchGlobalNote();
  }, [fetchGlobalNote]);

  useEffect(() => {
    try {
      if (globalNote && globalNote.trim().startsWith('[')) {
        setItems(JSON.parse(globalNote));
      } else if (globalNote && globalNote.trim() !== '') {
        // Eski duz yazi varsa da item olarak goster
        setItems([{ id: 'gen', text: globalNote, date: new Date().toISOString() }]);
      } else {
        setItems([]);
      }
    } catch (e) {
      if (globalNote) setItems([{ id: 'gen', text: globalNote, date: new Date().toISOString() }]);
    }
  }, [globalNote]);

  const commitItems = (newItems: GlobalNoteItem[]) => {
    setItems(newItems);
    updateGlobalNote(JSON.stringify(newItems));
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const item: GlobalNoteItem = {
      id: crypto.randomUUID(),
      text: newItemText,
      date: new Date().toISOString()
    };
    commitItems([item, ...items]);
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    commitItems(items.filter(i => i.id !== id));
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '400px',
        background: 'var(--bg-app)', zIndex: 50, display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.1)'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Serbest Defter</h2>
          <button onClick={onClose} className="btn-icon"><X size={20} /></button>
        </div>

        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input 
              type="text" 
              className="form-input" 
              placeholder="Yeni not ekle..." 
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
            />
            <button type="submit" className="btn btn-primary"><Plus size={18} /></button>
          </form>
        </div>
        
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          {isLoading && <p>Yükleniyor...</p>}
          {!isLoading && items.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Henüz not eklenmedi.</p>}
          
          <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item) => (
              <div key={item.id} className="stat-card" style={{ padding: '1rem', position: 'relative' }}>
                <div className="flex justify-between items-start mb-2">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="btn-icon" style={{ padding: '2px', color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
