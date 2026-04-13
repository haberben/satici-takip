import { type SellerNote } from '../types';
import { Phone, User, Package, CheckCircle, Clock, Bell } from 'lucide-react';

interface Props {
  note: SellerNote;
  onClick: (note: SellerNote) => void;
}

export function NoteCard({ note, onClick }: Props) {
  const isResolved = note.status === 'resolved';

  return (
    <div 
      className={`glass-panel note-card ${isResolved ? 'status-resolved' : 'status-pending'}`}
      onClick={() => onClick(note)}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 style={{ marginBottom: 0 }}>{note.storeName}</h3>
        <span className={`badge ${isResolved ? 'badge-resolved' : 'badge-pending'}`}>
          {isResolved ? 'Çözüldü' : 'Devam Ediyor'}
        </span>
      </div>
      
      <p className="text-sm mb-4" style={{ height: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <strong>Konu:</strong> {note.subject}
      </p>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div className="flex items-center gap-2 text-xs opacity-80">
          <User size={14} />
          <span>{note.sellerName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Phone size={14} />
          <span>{note.phoneNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-80">
          <Package size={14} />
          <span>{note.productCount} Adet</span>
        </div>
        <div className="flex items-center gap-2 text-xs opacity-80">
          {isResolved ? <CheckCircle size={14} className="text-green-500" /> : <Clock size={14} className="text-yellow-500" />}
          <span>{new Date(note.requestDate).toLocaleDateString('tr-TR')}</span>
        </div>
      </div>

      {note.reminderDate && note.status === 'pending' && (
        <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: note.reminderSent ? 'var(--text-secondary)' : 'var(--accent-color)' }}>
            <Bell size={14} />
            <span>Hatırlatıcı: {new Date(note.reminderDate).toLocaleString('tr-TR')}</span>
          </div>
          {note.reminderSent && <span className="text-xs" style={{ color: 'var(--status-resolved)' }}>Gönderildi</span>}
        </div>
      )}
    </div>
  );
}
