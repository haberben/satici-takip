import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DataGrid } from './DataGrid';
import { Plus, Search, BookOpen, Download, Share2, Upload } from 'lucide-react';
import { GlobalNotesSidebar } from './GlobalNotesSidebar';

export function Dashboard() {
  const { notes, addNote, activeWorkspace, availableWorkspaces, setActiveWorkspace, sharePanel } = useStore();
  const currentUserEmail = localStorage.getItem('saticiUserEmail');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'archived'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      notifyEmail: false,
      internalNote: ''
    });
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        alert("Geçerli bir veri bulunamadı.");
        return;
      }
      
      const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
      const idxStore = headers.indexOf('Mağaza Adı');
      const idxFrom = headers.indexOf('Kimden Geldiği');
      const idxSeller = headers.indexOf('Satıcı Adı');
      const idxPhone = headers.indexOf('Cep No');
      const idxSubj = headers.indexOf('Konu');
      const idxDet = headers.indexOf('Konu Detay');
      const idxCount = headers.indexOf('Adet');

      let imported = 0;
      for(let i=1; i<lines.length; i++) {
        const row = lines[i].split(';').map(c => c.trim().replace(/"/g, ''));
        if (row.length < 2) continue; // skip broken lines
        
        await addNote({
           storeName: idxStore > -1 && row[idxStore] ? row[idxStore] : 'İçe Aktarılan',
           fromWhom: idxFrom > -1 ? row[idxFrom] : '',
           sellerName: idxSeller > -1 ? row[idxSeller] : '',
           phoneNumber: idxPhone > -1 ? row[idxPhone] : '',
           subject: idxSubj > -1 ? row[idxSubj] : 'Konu Yok',
           subjectDetail: idxDet > -1 ? row[idxDet] : '',
           productCount: idxCount > -1 ? parseInt(row[idxCount]) || 1 : 1,
           solution: '',
           requestDate: new Date().toISOString().split('T')[0],
           status: 'pending',
           notifyBrowser: true,
           notifyEmail: false,
           internalNote: ''
        });
        imported++;
      }
      alert(`${imported} adet satır başarıyla içe aktarıldı!`);
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const exportToExcel = () => {
    const headers = ['Durum', 'Mağaza Adı', 'Kimden Geldiği', 'Satıcı Adı', 'Cep No', 'Konu', 'Konu Detay', 'Adet', 'Talep Tarihi', 'Hatırlatıcı'];
    const rows = filteredNotes.map(n => [
      n.status === 'resolved' ? 'Çözüldü' : n.status === 'pending' ? 'Devam Ediyor' : 'Arşivlendi',
      n.storeName,
      n.fromWhom,
      n.sellerName,
      n.phoneNumber,
      n.subject,
      n.subjectDetail,
      n.productCount.toString(),
      n.requestDate,
      n.reminderDate || ''
    ]);
    
    // TR karakterler icin UTF-8 BOM eklenerek dosya dizilimi (Excel uyumlu ; ayraci)
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(';') + '\n' 
      + rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `satici_notlari_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleShare = () => {
    const email = prompt('Panelinizi paylaşmak istediğiniz e-posta adresini girin:');
    if (email && currentUserEmail) {
      if(email === currentUserEmail) {
         alert("Kendi kendinize paylaşım yapamazsınız.");
         return;
      }
      sharePanel(currentUserEmail, email);
    }
  };

  return (
    <div className="container-fluid">
      {/* Üst Kısım: Hesaplar & Paylaşım */}
      <div className="flex justify-between items-center mb-4" style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
         <div className="flex items-center gap-2">
            <span style={{ fontWeight: 600 }}>Çalışma Alanı:</span>
            <select 
              className="form-select" 
              style={{ width: 'auto', minWidth: '250px' }}
              value={activeWorkspace || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
            >
              {availableWorkspaces.map(ws => (
                <option key={ws} value={ws}>
                  {ws === currentUserEmail ? 'Kişisel Panelim ('+ws+')' : `${ws} (Paylaşılan)`}
                </option>
              ))}
            </select>
         </div>
         {activeWorkspace === currentUserEmail && (
           <button className="btn btn-outline" onClick={handleShare}>
             <Share2 size={18} /> Panelimi Paylaş
           </button>
         )}
      </div>

      <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Satıcı & Mağaza Yönetim Paneli</h1>
          <p>Taleplerinizi ve hatırlatıcılarınızı profesyonel Excel görünümünde yönetin.</p>
          <div style={{ marginTop: '1rem', maxWidth: '400px' }}>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Genel Çözüm İlerlemesi</span>
              <span style={{ fontWeight: 600, color: 'var(--status-resolved)' }}>
                %{Math.round((resolvedCount / Math.max(1, notes.filter(n => n.status !== 'archived').length)) * 100)}
              </span>
            </div>
            <div style={{ background: 'var(--bg-app)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(resolvedCount / Math.max(1, notes.filter(n => n.status !== 'archived').length)) * 100}%`, 
                background: 'var(--status-resolved)', 
                height: '100%', 
                transition: 'width 0.5s ease-out' 
              }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} />
          <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> İçe Aktar
          </button>
          <button className="btn btn-outline" onClick={exportToExcel} style={{ color: 'var(--status-resolved)' }}>
            <Download size={18} /> Excel'e Aktar
          </button>
          <button className="btn btn-outline" onClick={() => setIsSidebarOpen(true)}>
            <BookOpen size={18} /> Serbest Defter
          </button>
          <button className="btn btn-primary" onClick={handleAddNewRow}>
            <Plus size={18} /> Yeni Ekle
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
