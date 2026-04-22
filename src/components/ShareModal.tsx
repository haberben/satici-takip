import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Trash2, UserPlus } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function ShareModal({ onClose }: Props) {
  const { shares, sharePanel, updateSharePermission, removeShare, user } = useStore();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');

  const handleShare = () => {
    if (!email) return;
    if (email === user?.email) {
      alert('Kendi kendinize paylaşım yapamazsınız.');
      return;
    }
    sharePanel(user.email, email, permission);
    setEmail('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg shadow-xl max-w-lg w-full p-6 relative" style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'var(--text-secondary)' }}>
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <UserPlus size={24} style={{ color: 'var(--primary-color)' }} />
          Panel Paylaşımı
        </h2>
        
        <div className="mb-6 flex gap-2 flex-wrap">
          <input
            type="email"
            placeholder="E-posta adresi"
            className="form-input"
            style={{ flex: '1 1 200px' }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select 
            className="form-select"
            style={{ width: '130px' }}
            value={permission}
            onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
          >
            <option value="view">Görüntüleme</option>
            <option value="edit">Düzenleme</option>
          </select>
          <button className="btn btn-primary" onClick={handleShare}>Paylaş</button>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Erişimi Olanlar</h3>
          {shares.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>Henüz kimseyle paylaşmadınız.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {shares.map(share => (
                <div key={share.id} className="flex items-center justify-between p-3 rounded-md" style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {share.shared_with_email.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{share.shared_with_email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      className="form-select"
                      style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', height: '30px' }}
                      value={share.permission_level || 'view'}
                      onChange={(e) => updateSharePermission(share.id, e.target.value as 'view' | 'edit')}
                    >
                      <option value="view">Görüntüleme</option>
                      <option value="edit">Düzenleme</option>
                    </select>
                    
                    <button 
                      onClick={() => {
                        if(confirm(`${share.shared_with_email} kişisinin erişimini kaldırmak istediğinize emin misiniz?`)) {
                          removeShare(user.email, share.shared_with_email);
                        }
                      }}
                      className="btn-icon"
                      style={{ color: 'var(--danger)' }}
                      title="Erişimi Kaldır"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
