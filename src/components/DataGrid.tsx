import { useState, useRef, useEffect } from 'react';
import { type SellerNote } from '../types';
import { useStore } from '../store/useStore';
import { History, Bell, Mail, Trash2 } from 'lucide-react';

interface CellProps {
  value: any;
  type?: string;
  onSave: (val: any) => void;
  width?: string;
}

function EditableCell({ value, type = 'text', onSave, width }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVal(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    if (val !== value) {
      // Type conversions
      const finalVal = type === 'number' ? Number(val) : val;
      onSave(finalVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleBlur();

      // Biraz bekleyip DOM üzerinde bir sonraki Editable hücreyi bulup açalım
      setTimeout(() => {
        const currentTd = inputRef.current?.closest('td');
        let nextTd = currentTd?.nextElementSibling;
        let nextContent = nextTd?.querySelector('.cell-content') as HTMLElement;
        
        while (nextTd && !nextContent) {
           nextTd = nextTd.nextElementSibling;
           if (nextTd) nextContent = nextTd.querySelector('.cell-content') as HTMLElement;
        }

        if (nextContent) {
          // React event'ini tetiklemek için double click dispatch
          const event = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
          nextContent.dispatchEvent(event);
        }
      }, 50);
    }
    if (e.key === 'Escape') {
      setVal(value);
      setEditing(false);
    }
  };

  return (
    <td style={{ minWidth: width }}>
      {editing ? (
        <input 
          ref={inputRef}
          type={type}
          value={val || ''}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="cell-input"
        />
      ) : (
        <div className="cell-content" onDoubleClick={() => setEditing(true)}>
          {value}
        </div>
      )}
    </td>
  );
}

export function DataGrid({ notes }: { notes: SellerNote[] }) {
  const { updateNote, deleteNote } = useStore();
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  const StatusTemplate = ({ note }: { note: SellerNote }) => (
    <td>
      <select 
        className="cell-select status"
        value={note.status}
        onChange={(e) => updateNote(note.id, { status: e.target.value as any })}
      >
        <option value="pending">Devam Ediyor</option>
        <option value="resolved">Çözüldü</option>
        <option value="archived">Arşivle</option>
      </select>
    </td>
  );

  const NotificationsTemplate = ({ note }: { note: SellerNote }) => (
    <td style={{ textAlign: 'center' }}>
      <div className="flex gap-2 justify-center" style={{ padding: '0.5rem' }}>
        <button 
          title="Tarayıcı Bildirimi"
          onClick={() => updateNote(note.id, { notifyBrowser: !note.notifyBrowser })}
          style={{ opacity: note.notifyBrowser ? 1 : 0.3, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Bell size={16} className={note.notifyBrowser ? "text-accent" : ""} />
        </button>
        <button 
          title="E-posta Bildirimi"
          onClick={() => updateNote(note.id, { notifyEmail: !note.notifyEmail })}
          style={{ opacity: note.notifyEmail ? 1 : 0.3, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Mail size={16} className={note.notifyEmail ? "text-accent" : ""} />
        </button>
      </div>
    </td>
  );

  const handleRestore = (noteId: string, previousState: Partial<SellerNote>) => {
    if (confirm('Bu sürüme dönmek istediğinize emin misiniz?')) {
      updateNote(noteId, previousState);
      setOpenHistoryId(null);
    }
  };

  return (
    <div className="grid-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Durum</th>
            <th>Mağaza Adı</th>
            <th>Kimden Geldiği</th>
            <th>Satıcı Adı</th>
            <th>Cep No</th>
            <th>Konu</th>
            <th>Konu Detay</th>
            <th>Adet</th>
            <th>Talep Tarihi</th>
            <th>Hatırlatıcı</th>
            <th>Bildirimler</th>
            <th style={{ textAlign: 'right' }}>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {notes.map(note => (
            <tr key={note.id} className={note.status === 'archived' ? 'opacity-80' : ''}>
              <StatusTemplate note={note} />
              <EditableCell width="150px" value={note.storeName} onSave={(val) => updateNote(note.id, { storeName: val })} />
              <EditableCell width="150px" value={note.fromWhom} onSave={(val) => updateNote(note.id, { fromWhom: val })} />
              <EditableCell width="150px" value={note.sellerName} onSave={(val) => updateNote(note.id, { sellerName: val })} />
              <EditableCell width="130px" value={note.phoneNumber} onSave={(val) => updateNote(note.id, { phoneNumber: val })} />
              <EditableCell width="180px" value={note.subject} onSave={(val) => updateNote(note.id, { subject: val })} />
              <EditableCell width="250px" value={note.subjectDetail} onSave={(val) => updateNote(note.id, { subjectDetail: val })} />
              <EditableCell type="number" width="80px" value={note.productCount} onSave={(val) => updateNote(note.id, { productCount: val })} />
              <EditableCell type="date" width="130px" value={note.requestDate} onSave={(val) => updateNote(note.id, { requestDate: val })} />
              <EditableCell type="datetime-local" width="180px" value={note.reminderDate} onSave={(val) => updateNote(note.id, { reminderDate: val, reminderSent: false })} />
              <NotificationsTemplate note={note} />
              
              <td style={{ textAlign: 'right', padding: '0.75rem 1rem' }}>
                <div className="flex gap-2 items-center justify-end" style={{ position: 'relative' }}>
                  <button 
                    className="btn-icon" 
                    title="Geçmiş Kayıtlar"
                    onClick={() => setOpenHistoryId(openHistoryId === note.id ? null : note.id)}
                  >
                    <History size={16} />
                  </button>
                  <button 
                    className="btn-icon text-danger" 
                    title="Sil"
                    onClick={() => {
                      if(confirm('Kayıt silinecek. Emin misiniz?')) deleteNote(note.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* History Dropdown */}
                  {openHistoryId === note.id && note.history && note.history.length > 0 && (
                    <div className="history-dropdown" style={{ textAlign: 'left' }}>
                      <div style={{ padding: '0.5rem', background: '#f8fafc', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Son Değişiklikler</div>
                      {note.history.map((h, idx) => (
                        <div key={idx} className="history-item flex justify-between items-center">
                          <span style={{ fontSize: '0.75rem' }}>{new Date(h.timestamp).toLocaleString('tr-TR')}</span>
                          <button 
                            className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                            onClick={() => handleRestore(note.id, h.previousState)}
                          >
                            Geri Dön
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
