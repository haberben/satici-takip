import { useState, useRef, useEffect } from 'react';
import { type ColumnDef } from '../utils/useColumnConfig';
import { type SellerNote } from '../types';
import { Settings, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, GripVertical, Check, X, Pencil } from 'lucide-react';

interface Props {
  columns: ColumnDef[];
  renameColumn: (id: keyof SellerNote, label: string) => void;
  toggleColumn: (id: keyof SellerNote) => void;
  moveColumn: (id: keyof SellerNote, dir: 'up' | 'down') => void;
  resetColumns: () => void;
}

export function ColumnSettingsPanel({ columns, renameColumn, toggleColumn, moveColumn, resetColumns }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const visibleCount = sorted.filter(c => c.visible).length;

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (col: ColumnDef) => {
    setEditingId(col.id);
    setEditLabel(col.label);
  };

  const handleSaveEdit = () => {
    if (editingId && editLabel.trim()) {
      renameColumn(editingId as keyof SellerNote, editLabel.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Drag & Drop handlers
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    // Move the column from dragIdx to idx
    const col = sorted[dragIdx];
    if (dragIdx < idx) {
      // Move down
      for (let i = dragIdx; i < idx; i++) {
        moveColumn(col.id as keyof SellerNote, 'down');
      }
    } else {
      // Move up
      for (let i = dragIdx; i > idx; i--) {
        moveColumn(col.id as keyof SellerNote, 'up');
      }
    }

    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="col-settings-wrap" ref={panelRef}>
      <button
        className="btn btn-outline col-settings-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Sütun Ayarları"
      >
        <Settings size={16} className={isOpen ? 'spin' : ''} />
        Sütunlar
      </button>

      {isOpen && (
        <div className="col-settings-panel">
          <div className="col-settings-header">
            <h4>Sütun Ayarları</h4>
            <button
              className="btn-reset-cols"
              onClick={() => {
                resetColumns();
              }}
              title="Varsayılana sıfırla"
            >
              <RotateCcw size={14} /> Sıfırla
            </button>
          </div>

          <p className="col-settings-desc">
            Sütunları sürükleyerek sıralayın, göz ikonu ile gizleyin, kalem ikonu ile yeniden adlandırın.
          </p>

          <div className="col-settings-list">
            {sorted.map((col, idx) => (
              <div
                key={col.id}
                className={`col-settings-item ${dragOverIdx === idx ? 'drag-over' : ''} ${!col.visible ? 'col-hidden' : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              >
                <div className="col-item-drag">
                  <GripVertical size={14} />
                </div>

                <div className="col-item-content">
                  {editingId === col.id ? (
                    <div className="col-item-edit">
                      <input
                        ref={inputRef}
                        className="col-edit-input"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button className="col-edit-btn save" onClick={handleSaveEdit} title="Kaydet">
                        <Check size={14} />
                      </button>
                      <button className="col-edit-btn cancel" onClick={handleCancelEdit} title="İptal">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="col-item-label">
                      <span className="col-label-text">{col.label}</span>
                      {col.label !== col.defaultLabel && (
                        <span className="col-label-original" title={`Orijinal: ${col.defaultLabel}`}>
                          ({col.defaultLabel})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="col-item-actions">
                  {editingId !== col.id && (
                    <button className="col-action-btn" onClick={() => handleStartEdit(col)} title="Yeniden Adlandır">
                      <Pencil size={13} />
                    </button>
                  )}
                  <button className="col-action-btn" onClick={() => moveColumn(col.id as keyof SellerNote, 'up')} disabled={idx === 0} title="Yukarı">
                    <ChevronUp size={14} />
                  </button>
                  <button className="col-action-btn" onClick={() => moveColumn(col.id as keyof SellerNote, 'down')} disabled={idx === sorted.length - 1} title="Aşağı">
                    <ChevronDown size={14} />
                  </button>
                  <button
                    className={`col-action-btn ${col.visible ? 'col-visible' : 'col-invisible'}`}
                    onClick={() => toggleColumn(col.id as keyof SellerNote)}
                    disabled={col.visible && visibleCount <= 1}
                    title={col.visible ? 'Gizle' : 'Göster'}
                  >
                    {col.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="col-settings-footer">
            {visibleCount} / {sorted.length} sütun görünür
          </div>
        </div>
      )}
    </div>
  );
}
