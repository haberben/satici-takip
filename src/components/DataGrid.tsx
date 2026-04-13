import { useState, useRef, useEffect } from 'react';
import { type SellerNote } from '../types';
import { useStore } from '../store/useStore';
import { History, Bell, Mail, Trash2, CheckCircle2 } from 'lucide-react';

export function DataGrid({ notes }: { notes: SellerNote[] }) {
  const { updateNote, deleteNote } = useStore();
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  
  // React-based Grid Navigation State
  const [editingCell, setEditingCell] = useState<{ rowId: string, col: keyof SellerNote } | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [showToast, setShowToast] = useState(false);

  const columns: { id: keyof SellerNote, width: string, type: string }[] = [
    { id: 'storeName', width: '10%', type: 'text' },
    { id: 'fromWhom', width: '10%', type: 'text' },
    { id: 'sellerName', width: '10%', type: 'text' },
    { id: 'phoneNumber', width: '10%', type: 'text' },
    { id: 'subject', width: '14%', type: 'text' },
    { id: 'subjectDetail', width: '15%', type: 'text' },
    { id: 'productCount', width: '5%', type: 'number' },
    { id: 'requestDate', width: '8%', type: 'date' },
    { id: 'reminderDate', width: '10%', type: 'datetime-local' }
  ];

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCommit = (rowId: string, colId: keyof SellerNote, finalVal: any, goToNext: boolean = false) => {
    const note = notes.find(n => n.id === rowId);
    if (note && note[colId] !== finalVal) {
      const payload: any = { [colId]: finalVal };
      if (colId === 'reminderDate') payload.reminderSent = false;
      updateNote(rowId, payload);
      triggerToast();
    }

    if (goToNext) {
      // Find the next column index
      const colIndex = columns.findIndex(c => c.id === colId);
      if (colIndex !== -1 && colIndex < columns.length - 1) {
        const nextCol = columns[colIndex + 1];
        setEditingCell({ rowId, col: nextCol.id });
        const nextVal = notes.find(n => n.id === rowId)?.[nextCol.id];
        setEditValue(nextVal || '');
        return;
      }
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, colId: keyof SellerNote, type: string) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const finalVal = type === 'number' ? Number(editValue) : editValue;
      handleCommit(rowId, colId, finalVal, true);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleRestore = (noteId: string, previousState: Partial<SellerNote>) => {
    if (confirm('Bu sürüme dönmek istediğinize emin misiniz?')) {
      updateNote(noteId, previousState);
      setOpenHistoryId(null);
      triggerToast();
    }
  };

  return (
    <>
      {showToast && (
        <div className="save-toast">
          <CheckCircle2 size={18} /> Kaydedildi
        </div>
      )}

      <div className="grid-container data-table-wrapper">
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
              <th style={{ textAlign: 'center' }}>Bildirim</th>
              <th style={{ textAlign: 'right' }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {notes.map(note => {
              const rowClass = note.status === 'archived' ? 'opacity-60' : '';
              return (
                <tr key={note.id} className={rowClass}>
                  <td>
                    <select 
                      className="cell-select"
                      value={note.status}
                      onChange={(e) => updateNote(note.id, { status: e.target.value as any })}
                    >
                      <option value="pending">Devam Ediyor</option>
                      <option value="resolved">Çözüldü</option>
                      <option value="archived">Arşivle</option>
                    </select>
                  </td>
                  
                  {columns.map(col => {
                    const isEditing = editingCell?.rowId === note.id && editingCell?.col === col.id;
                    const value = note[col.id as keyof SellerNote];

                    return (
                      <td key={col.id} style={{ minWidth: col.width }}>
                        <div 
                          className="cell-wrapper"
                          onDoubleClick={() => {
                            setEditingCell({ rowId: note.id, col: col.id });
                            setEditValue(value || '');
                          }}
                        >
                          {isEditing ? (
                            <input 
                              autoFocus
                              type={col.type}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => {
                                const finalVal = col.type === 'number' ? Number(editValue) : editValue;
                                handleCommit(note.id, col.id, finalVal, false);
                              }}
                              onKeyDown={(e) => handleKeyDown(e, note.id, col.id, col.type)}
                              className="cell-input-active"
                            />
                          ) : (
                            <div className="cell-content">
                              {value}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  <td style={{ textAlign: 'center' }}>
                    <div className="flex gap-2 justify-center py-2">
                      <button 
                        title="Tarayıcı Bildirimi"
                        onClick={() => updateNote(note.id, { notifyBrowser: !note.notifyBrowser })}
                        style={{ opacity: note.notifyBrowser ? 1 : 0.3, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Bell size={16} />
                      </button>
                      <button 
                        title="E-posta Bildirimi"
                        onClick={() => updateNote(note.id, { notifyEmail: !note.notifyEmail })}
                        style={{ opacity: note.notifyEmail ? 1 : 0.3, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Mail size={16} />
                      </button>
                    </div>
                  </td>
                  
                  <td style={{ textAlign: 'right', padding: '0 1rem' }}>
                    <div className="flex gap-2 items-center justify-end" style={{ position: 'relative' }}>
                      <button 
                        className="btn-icon" 
                        title="Geçmiş"
                        onClick={() => setOpenHistoryId(openHistoryId === note.id ? null : note.id)}
                      >
                        <History size={16} />
                      </button>
                      <button 
                        className="btn-icon" style={{ color: 'var(--danger)' }}
                        title="Sil"
                        onClick={() => {
                          if(confirm('Kayıt tamamen silinecek. Emin misiniz?')) deleteNote(note.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>

                      {openHistoryId === note.id && note.history && note.history.length > 0 && (
                        <div className="history-dropdown" style={{ textAlign: 'left' }}>
                          <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-hover)', fontWeight: 600 }}>Son Değişiklikler</div>
                          {note.history.map((h, idx) => (
                            <div key={idx} className="history-item flex justify-between items-center">
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {new Date(h.timestamp).toLocaleString('tr-TR')}
                              </span>
                              <button 
                                className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
