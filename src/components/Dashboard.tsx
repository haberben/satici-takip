import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DataGrid } from './DataGrid';
import { Plus, Search, BookOpen, Download, Share2, Upload, LogOut, User, Trash2, Filter } from 'lucide-react';
import { GlobalNotesSidebar } from './GlobalNotesSidebar';

export function Dashboard() {
  const { notes, addNote, activeWorkspace, availableWorkspaces, setActiveWorkspace, sharePanel, user, signOut } = useStore();
  const currentUserEmail = user?.email || localStorage.getItem('saticiUserEmail') || '';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'archived'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = notes.filter(n => n.status === 'pending').length;
  const resolvedCount = notes.filter(n => n.status === 'resolved').length;

  const filteredNotes = notes.filter(note => {
    const matchesSearch = 
      note.storeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      note.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesSeller = filterSeller ? note.sellerName.toLowerCase().includes(filterSeller.toLowerCase()) : true;
    const matchesDate = filterDate ? note.requestDate === filterDate : true;
    
    const isMatch = matchesSearch && matchesSeller && matchesDate;
    if (filter === 'all') return isMatch && note.status !== 'archived';
    return isMatch && note.status === filter;
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
      const cleanText = text.replace(/^\uFEFF/, ''); // BOM temizliği
      const lines = cleanText.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
      if (lines.length < 2) {
        alert("Geçerli bir veri/satır bulunamadı.");
        return;
      }
      
      const separator = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      const idxStore = headers.findIndex(h => h.includes('mağaza') || h.includes('magaza'));
      const idxFrom = headers.findIndex(h => h.includes('kimden'));
      const idxSeller = headers.findIndex(h => h.includes('satıcı') || h.includes('satici'));
      const idxPhone = headers.findIndex(h => h.includes('cep') || h.includes('tel'));
      const idxSubj = headers.findIndex(h => h === 'konu');
      const idxDet = headers.findIndex(h => h.includes('detay'));
      const idxCount = headers.findIndex(h => h.includes('adet'));
      const idxNote = headers.findIndex(h => h.includes('ekstra') || h.includes('iç not'));

      let imported = 0;
      for(let i = 1; i < lines.length; i++) {
        // virgüller arası parçala, boşlukları temizle
        const row = lines[i].split(separator).map(c => c.trim().replace(/"/g, ''));
        if (!row.some(c => c !== '')) continue; // Tamamen boş satır atlanır
        
        await addNote({
           storeName: idxStore > -1 && row[idxStore] ? row[idxStore] : 'İçe Aktarılan',
           fromWhom: idxFrom > -1 && row[idxFrom] ? row[idxFrom] : '',
           sellerName: idxSeller > -1 && row[idxSeller] ? row[idxSeller] : '',
           phoneNumber: idxPhone > -1 && row[idxPhone] ? row[idxPhone] : '',
           subject: idxSubj > -1 && row[idxSubj] ? row[idxSubj] : 'Konu Yok',
           subjectDetail: idxDet > -1 && row[idxDet] ? row[idxDet] : '',
           productCount: idxCount > -1 && parseInt(row[idxCount]) ? parseInt(row[idxCount]) : 1,
           solution: '',
           requestDate: new Date().toISOString().split('T')[0],
           status: 'pending',
           notifyBrowser: true,
           notifyEmail: false,
           internalNote: idxNote > -1 && row[idxNote] ? row[idxNote] : ''
        });
        imported++;
      }
      alert(`${imported} adet satır başarıyla içe aktarıldı!`);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = ''; 
  };

  const exportToExcel = (onlySelected: boolean = false) => {
    const dataToExport = onlySelected ? notes.filter(n => selectedIds.includes(n.id)) : filteredNotes;
    const headers = ['Durum', 'Mağaza Adı', 'Kimden Geldiği', 'Satıcı Adı', 'Cep No', 'Konu', 'Konu Detay', 'İç Not', 'Adet', 'Talep Tarihi', 'Hatırlatıcı'];
    const rows = dataToExport.map(n => [
      n.status === 'resolved' ? 'Çözüldü' : n.status === 'pending' ? 'Devam Ediyor' : 'Arşivlendi',
      n.storeName,
      n.fromWhom,
      n.sellerName,
      n.phoneNumber,
      n.subject,
      n.subjectDetail,
      n.internalNote || '',
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
         <div className="flex items-center gap-4">
           {activeWorkspace === currentUserEmail && (
             <button className="btn btn-outline" onClick={handleShare}>
               <Share2 size={18} /> Panelimi Paylaş
             </button>
           )}
           <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
               <User size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/> 
               {currentUserEmail}
             </span>
             <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.4rem 0.8rem' }} onClick={signOut}>
               <LogOut size={16} /> Çıkış
             </button>
           </div>
         </div>
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
          {selectedIds.length > 0 ? (
            <div className="flex bg-danger-light p-2 rounded gap-4" style={{ border: '1px solid var(--danger)', padding: '0.5rem', borderRadius: 'var(--radius)' }}>
               <span style={{ fontWeight: 600, color: 'var(--danger)', alignSelf: 'center' }}>{selectedIds.length} Seçili</span>
               <button className="btn btn-outline" style={{ color: 'initial', borderColor: 'var(--success)' }} onClick={() => exportToExcel(true)}>
                 <Download size={18} /> İndir
               </button>
               <button className="btn btn-outline" style={{ color: 'white', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                 if(confirm(`${selectedIds.length} kaydı tamamen silmek istediğinize emin misiniz?`)){
                   useStore.getState().bulkDeleteNotes(selectedIds);
                   setSelectedIds([]);
                 }
               }}>
                 <Trash2 size={18} /> Sil
               </button>
            </div>
          ) : (
            <>
              <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} />
              <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                <Upload size={18} /> İçe Aktar
              </button>
              <button className="btn btn-outline" onClick={() => exportToExcel(false)} style={{ color: 'var(--status-resolved)' }}>
                <Download size={18} /> Excel'e Aktar
              </button>
              <button className="btn btn-outline" onClick={() => setIsSidebarOpen(true)}>
                <BookOpen size={18} /> Serbest Defter
              </button>
              <button className="btn btn-primary" onClick={handleAddNewRow}>
                <Plus size={18} /> Yeni Ekle
              </button>
            </>
          )}
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

      <div className="grid-container mb-4" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1" style={{ position: 'relative', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Mağaza, kişi veya konu ara..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2" style={{ background: 'var(--bg-hover)', padding: '0.4rem', borderRadius: '0.4rem' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }} />
            <input 
              type="text" className="form-input" placeholder="Satıcı Filtresi..." 
              style={{ width: '150px', background: 'var(--bg-app)' }} 
              value={filterSeller} onChange={e => setFilterSeller(e.target.value)} 
            />
            <input 
              type="date" className="form-input" title="Tarih Filtresi" 
              style={{ width: '130px', background: 'var(--bg-app)' }} 
              value={filterDate} onChange={e => setFilterDate(e.target.value)} 
            />
          </div>

          <select 
            className="form-select" 
            style={{ width: '200px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">Aktifler (Açıklar)</option>
            <option value="pending">Devam Edenler</option>
            <option value="resolved">Çözülenler</option>
            <option value="archived">Arşivlenenler</option>
          </select>
        </div>
        
        {selectedIds.length > 0 && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Birden fazla satır seçili. Yukarıdaki yeşil/kırmızı butonlarla çoklu işlem yapabilirsiniz.</div>}
      </div>

      {filteredNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          <p>Kayıt bulunamadı. Lütfen filtreyi değiştirin veya Ekle butonuna basın.</p>
        </div>
      ) : (
        <DataGrid notes={filteredNotes} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
      )}

      <GlobalNotesSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
