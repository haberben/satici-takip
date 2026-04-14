import { useState } from 'react';
import { type IssueNote } from '../types';
import { useStore } from '../store/useStore';
import { Trash2 } from 'lucide-react';

export function IssuesGrid({ issues, selectedIds = [], setSelectedIds }: { issues: IssueNote[], selectedIds?: string[], setSelectedIds?: Function }) {
  const { updateIssue, deleteIssue } = useStore();
  const [editingCell, setEditingCell] = useState<{ rowId: string, col: keyof IssueNote } | null>(null);
  const [editValue, setEditValue] = useState<any>('');

  const columns: { id: keyof IssueNote, width: string, type: string, label: string }[] = [
    { id: 'issue_text', width: '30%', type: 'text', label: 'İlgili Sorun' },
    { id: 'solution_text', width: '30%', type: 'text', label: 'Uygulanan Çözüm' },
    { id: 'created_at', width: '15%', type: 'date', label: 'Tarih' },
    { id: 'reminder_date', width: '15%', type: 'datetime-local', label: 'Hatırlatıcı' }
  ];

  const handleCommit = (rowId: string, colId: keyof IssueNote, finalVal: any) => {
    const issue = issues.find(i => i.id === rowId);
    if (issue && issue[colId] !== finalVal) {
      const payload: any = { [colId]: finalVal };
      if (colId === 'reminder_date') payload.reminder_sent = false;
      updateIssue(rowId, payload);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, colId: keyof IssueNote) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleCommit(rowId, colId, editValue);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="grid-container data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: '40px', textAlign: 'center' }}>
              <input 
                type="checkbox" className="row-checkbox"
                checked={issues.length > 0 && selectedIds.length === issues.length}
                onChange={(e) => setSelectedIds && setSelectedIds(e.target.checked ? issues.map(n => n.id) : [])}
              />
            </th>
            <th style={{ width: '150px' }}>Durum</th>
            {columns.map(c => <th key={c.id} style={{ width: c.width }}>{c.label}</th>)}
            <th style={{ textAlign: 'right', width: '50px' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {issues.map(issue => {
            let rowClass = issue.status === 'archived' ? 'opacity-60' : '';
            if (issue.status === 'resolved') rowClass += ' row-bg-resolved';
            if (issue.status === 'pending') rowClass += ' row-bg-pending';
            
            return (
              <tr key={issue.id} className={rowClass.trim()}>
                <td style={{ textAlign: 'center' }}>
                  <input 
                    type="checkbox" className="row-checkbox"
                    checked={selectedIds?.includes(issue.id)}
                    onChange={(e) => setSelectedIds && setSelectedIds((prev: string[]) => e.target.checked ? [...prev, issue.id] : prev.filter(id => id !== issue.id))}
                  />
                </td>
                <td>
                  <select 
                    className="cell-select"
                    value={issue.status}
                    onChange={(e) => updateIssue(issue.id, { status: e.target.value as any })}
                  >
                    <option value="pending">Devam Ediyor</option>
                    <option value="resolved">Çözüldü</option>
                    <option value="archived">Arşivle</option>
                  </select>
                </td>
                
                {columns.map(col => {
                  const isEditing = editingCell?.rowId === issue.id && editingCell?.col === col.id;
                  const rawValue = issue[col.id as keyof IssueNote];
                  const value = typeof rawValue === 'boolean' || Array.isArray(rawValue) ? '' : rawValue as React.ReactNode;

                  return (
                    <td key={col.id}>
                      <div 
                        className="cell-wrapper"
                        onDoubleClick={() => {
                          setEditingCell({ rowId: issue.id, col: col.id });
                          setEditValue(value || '');
                        }}
                      >
                        {isEditing ? (
                          <input 
                            autoFocus
                            type={col.type}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCommit(issue.id, col.id, editValue)}
                            onKeyDown={(e) => handleKeyDown(e, issue.id, col.id)}
                            className="cell-input-active"
                          />
                        ) : (
                          <div className="cell-content truncate-text" title={String(value || '')} style={{ maxHeight: '4.5rem', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', whiteSpace: 'pre-wrap' }}>
                            {col.type === 'date' && value ? new Date(value as string).toLocaleDateString('tr-TR') : value}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td style={{ textAlign: 'right', padding: '0 1rem' }}>
                  <button 
                    className="btn-icon" style={{ color: 'var(--danger)' }}
                    title="Sil"
                    onClick={() => {
                      if(confirm('Kayıt tamamen silinecek. Emin misiniz?')) deleteIssue(issue.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
