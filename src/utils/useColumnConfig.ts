import { useState, useCallback } from 'react';
import { type SellerNote } from '../types';

export interface ColumnDef {
  id: keyof SellerNote;
  label: string;
  defaultLabel: string;
  width: string;
  type: string;
  visible: boolean;
  order: number;
}

const STORAGE_KEY = 'satici-column-config';

// Default columns — the source of truth for available columns
export const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'storeName',    label: 'Mağaza Adı',       defaultLabel: 'Mağaza Adı',      width: '10%', type: 'text',           visible: true, order: 0 },
  { id: 'fromWhom',     label: 'Kimden Geldiği',    defaultLabel: 'Kimden Geldiği',   width: '10%', type: 'text',           visible: true, order: 1 },
  { id: 'sellerName',   label: 'Satıcı Adı',       defaultLabel: 'Satıcı Adı',      width: '10%', type: 'text',           visible: true, order: 2 },
  { id: 'phoneNumber',  label: 'Cep No',            defaultLabel: 'Cep No',           width: '10%', type: 'text',           visible: true, order: 3 },
  { id: 'subject',      label: 'Konu',              defaultLabel: 'Konu',             width: '12%', type: 'text',           visible: true, order: 4 },
  { id: 'subjectDetail',label: 'Konu Detay',        defaultLabel: 'Konu Detay',       width: '12%', type: 'text',           visible: true, order: 5 },
  { id: 'internalNote', label: 'Ekstra Not (İç)',   defaultLabel: 'Ekstra Not (İç)',  width: '12%', type: 'text',           visible: true, order: 6 },
  { id: 'productCount', label: 'Adet',              defaultLabel: 'Adet',             width: '5%',  type: 'number',         visible: true, order: 7 },
  { id: 'requestDate',  label: 'Talep Tarihi',      defaultLabel: 'Talep Tarihi',     width: '9%',  type: 'date',           visible: true, order: 8 },
  { id: 'reminderDate', label: 'Hatırlatıcı',       defaultLabel: 'Hatırlatıcı',      width: '10%', type: 'datetime-local', visible: true, order: 9 },
];

function loadConfig(): ColumnDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLUMNS.map(c => ({ ...c }));
    
    const saved: ColumnDef[] = JSON.parse(raw);
    
    // Merge with defaults to handle new columns added in future updates
    // Saved config wins for label/visible/order, defaults win for type/width/defaultLabel
    const merged = DEFAULT_COLUMNS.map(def => {
      const savedCol = saved.find(s => s.id === def.id);
      if (savedCol) {
        return {
          ...def,
          label: savedCol.label || def.label,
          visible: savedCol.visible,
          order: savedCol.order,
        };
      }
      // New column not in saved config — put it at end
      return { ...def, order: Math.max(...saved.map(s => s.order), def.order) + 1 };
    });
    
    return merged.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_COLUMNS.map(c => ({ ...c }));
  }
}

function saveConfig(columns: ColumnDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
}

export function useColumnConfig() {
  const [columns, setColumnsState] = useState<ColumnDef[]>(loadConfig);

  const setColumns = useCallback((updater: ColumnDef[] | ((prev: ColumnDef[]) => ColumnDef[])) => {
    setColumnsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Re-index order
      const ordered = next.map((c, i) => ({ ...c, order: i }));
      saveConfig(ordered);
      return ordered;
    });
  }, []);

  // Get only visible columns, sorted by order
  const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

  // Rename a column
  const renameColumn = useCallback((id: keyof SellerNote, newLabel: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, label: newLabel } : c));
  }, [setColumns]);

  // Toggle visibility
  const toggleColumn = useCallback((id: keyof SellerNote) => {
    setColumns(prev => {
      const col = prev.find(c => c.id === id);
      // Prevent hiding all columns
      const visibleCount = prev.filter(c => c.visible).length;
      if (col?.visible && visibleCount <= 1) return prev;
      return prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
    });
  }, [setColumns]);

  // Move column up in order
  const moveColumn = useCallback((id: keyof SellerNote, direction: 'up' | 'down') => {
    setColumns(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(c => c.id === id);
      if (idx === -1) return prev;

      if (direction === 'up' && idx > 0) {
        [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
      } else if (direction === 'down' && idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      }

      return sorted.map((c, i) => ({ ...c, order: i }));
    });
  }, [setColumns]);

  // Reset to defaults
  const resetColumns = useCallback(() => {
    const defaults = DEFAULT_COLUMNS.map(c => ({ ...c }));
    setColumns(defaults);
  }, [setColumns]);

  return {
    columns,          // All columns (for settings panel)
    visibleColumns,   // Only visible, ordered (for DataGrid rendering)
    renameColumn,
    toggleColumn,
    moveColumn,
    resetColumns,
    setColumns,
  };
}
