import { useState } from 'react';
import { useStore } from '../store/useStore';
import { DataGrid } from './DataGrid';
import { Plus, Search, BookOpen } from 'lucide-react';
import { GlobalNotesSidebar } from './GlobalNotesSidebar';

export function Dashboard() {
  const { notes, addNote } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'archived'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const pendingCount = notes.filter(n => n.status === 'pending').length;
  const resolvedCount = notes.filter(n => n.status === 'resolved').length;

  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.storeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      note.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch && note.status !== 'archived';
    return matchesSearch && note.status === filter;
  });

  const handleAddNewRow = () => {
    addNote({
      storeName: 'Yeni Mağaza',
      fromWhom: '',
      subject: '',
      subjectDetail: '',
      productCount: 1,
      sellerName: '',
      phoneNumber: '',
      solution: '',
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      notifyBrowser: true,
      notifyEmail: false
    });
  };

  return (
    <div className="container-fluid">
      <div className="header">
        <div>
          <h1>Satıcı & Mağaza Yönetim Paneli</h1>
          <p>Taleplerinizi ve hatırlatıcılarınızı profesyonel Excel görünümünde yönetin.</p>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn btn-outline" onClick={() => setIsSidebarOpen(true)}>
            <BookOpen size={18} /> Serbest Defter
          </button>
          <button className="btn btn-primary" onClick={handleAddNewRow}>
            <Plus size={18} /> Yeni Satır Ekle
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Toplam Aktif</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>{notes.filter(n => n.status !== 'archived').length}</p>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--status-pending)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Devam Eden</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--status-pending)' }}>{pendingCount}</p>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--status-resolved)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Çözülen</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--status-resolved)' }}>{resolvedCount}</p>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--status-archived)' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Arşivlenen</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--status-archived)' }}>{notes.filter(n => n.status === 'archived').length}</p>
        </div>
      </div>

      <div className="grid-container mb-4" style={{ padding: '1rem' }}>
        <div className="flex gap-4 items-center">
          <div className="flex-1" style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Mağaza, satıcı veya konu ara..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '200px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">Sadece Aktifler (Arşiv Hariç)</option>
            <option value="pending">Devam Edenler</option>
            <option value="resolved">Çözülenler</option>
            <option value="archived">Arşivlenenler</option>
          </select>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          <p>Kayıt bulunamadı. Lütfen filtreyi değiştirin veya Ekle butonuna basın.</p>
        </div>
      ) : (
        <DataGrid notes={filteredNotes} />
      )}

      <GlobalNotesSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
