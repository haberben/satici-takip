import React, { useState, useEffect } from 'react';
import { type SellerNote } from '../types';
import { X } from 'lucide-react';

interface Props {
  note?: SellerNote | null;
  onSave: (note: Partial<SellerNote>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function NoteForm({ note, onSave, onDelete, onCancel }: Props) {
  const [formData, setFormData] = useState<Partial<SellerNote>>({
    storeName: '',
    fromWhom: '',
    subject: '',
    subjectDetail: '',
    productCount: 1,
    sellerName: '',
    phoneNumber: '',
    solution: '',
    requestDate: new Date().toISOString().split('T')[0],
    solutionDate: '',
    status: 'pending',
    reminderDate: '',
  });

  useEffect(() => {
    if (note) {
      setFormData(note);
    }
  }, [note]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="glass-panel" style={{ position: 'relative' }}>
      <button 
        type="button" 
        onClick={onCancel}
        className="btn-icon" 
        style={{ position: 'absolute', top: '1rem', right: '1rem' }}
      >
        <X size={20} />
      </button>

      <h2 className="mb-4">{note ? 'Notu Düzenle' : 'Yeni Not Ekle'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">Mağaza Adı</label>
            <input required type="text" name="storeName" value={formData.storeName || ''} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Kimden Geldiği</label>
            <input required type="text" name="fromWhom" value={formData.fromWhom || ''} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Konu</label>
            <input required type="text" name="subject" value={formData.subject || ''} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Ürün Adet Sayısı</label>
            <input required type="number" name="productCount" value={formData.productCount || ''} onChange={handleChange} className="form-input" min="1" />
          </div>
          <div className="form-group">
            <label className="form-label">Satıcı Adı</label>
            <input required type="text" name="sellerName" value={formData.sellerName || ''} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Cep Numarası</label>
            <input required type="tel" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Talep Tarihi</label>
            <input required type="date" name="requestDate" value={formData.requestDate || ''} onChange={handleChange} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Durum</label>
            <select required name="status" value={formData.status || 'pending'} onChange={handleChange} className="form-select">
              <option value="pending">Devam Ediyor</option>
              <option value="resolved">Çözüldü</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Konu Detay</label>
            <textarea required name="subjectDetail" value={formData.subjectDetail || ''} onChange={handleChange} className="form-textarea" rows={3}></textarea>
          </div>
          
          {formData.status === 'resolved' && (
            <>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Çözüm</label>
                <textarea required name="solution" value={formData.solution || ''} onChange={handleChange} className="form-textarea" rows={2}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Çözüm Tarihi</label>
                <input required type="date" name="solutionDate" value={formData.solutionDate || ''} onChange={handleChange} className="form-input" />
              </div>
            </>
          )}

          {formData.status === 'pending' && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Hatırlatıcı Ayarla (Tarih ve Saat)</label>
              <input type="datetime-local" name="reminderDate" value={formData.reminderDate || ''} onChange={handleChange} className="form-input" />
              <p className="text-xs mt-2">Belirlediğiniz saatte tarayıcı bildirimi alacaksınız.</p>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-4" style={{ justifyContent: 'flex-end' }}>
          {note && onDelete && (
            <button type="button" onClick={onDelete} className="btn btn-danger" style={{ marginRight: 'auto' }}>Sil</button>
          )}
          <button type="button" onClick={onCancel} className="btn btn-outline">İptal</button>
          <button type="submit" className="btn btn-primary">Kaydet</button>
        </div>
      </form>
    </div>
  );
}
