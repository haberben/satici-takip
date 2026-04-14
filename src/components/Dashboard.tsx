import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { DataGrid } from './DataGrid';
import { Plus, Search, BookOpen, Download, Share2, Upload, LogOut, User, Trash2, Filter } from 'lucide-react';
import { GlobalNotesSidebar } from './GlobalNotesSidebar';
import { IssuesGrid } from './IssuesGrid';

export function Dashboard() {
  const { notes, issues, addNote, addIssue, activeWorkspace, availableWorkspaces, setActiveWorkspace, sharePanel, user, signOut } = useStore();
  const currentUserEmail = user?.email || localStorage.getItem('saticiUserEmail') || '';
  const [mode, setMode] = useState<'seller' | 'issues'>('seller');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'archived'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('saticiItemsPerPage');
    return saved ? parseInt(saved, 10) : 50;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingCount = notes.filter(n => n.status === 'pending').length;
  const resolvedCount = notes.filter(n => n.status === 'resolved').length;
  const archivedCount = notes.filter(n => n.status === 'archived').length;
  const activeCount = notes.filter(n => n.status !== 'archived').length;
  const progress = Math.round((resolvedCount / Math.max(activeCount, 1)) * 100);

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

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.issue_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.solution_text.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = filterDate ? issue.created_at === filterDate : true;
    
    const isMatch = matchesSearch && matchesDate;
    if (filter === 'all') return isMatch && issue.status !== 'archived';
    return isMatch && issue.status === filter;
  });

  const currentDataLength = mode === 'seller' ? filteredNotes.length : filteredIssues.length;
  const totalPages = Math.ceil(currentDataLength / itemsPerPage);
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddNewRow = () => {
    if (mode === 'seller') {
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
    } else {
      addIssue({
        issue_text: 'Yeni Sorun (Düzenlemek için çift tıkla)',
        solution_text: '',
        status: 'pending',
        created_at: new Date().toISOString().split('T')[0]
      });
    }
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
    if (mode === 'seller') {
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
    } else {
      const dataToExport = onlySelected ? issues.filter(i => selectedIds.includes(i.id)) : filteredIssues;
      const headers = ['Durum', 'İlgili Sorun', 'Uygulanan Çözüm', 'Tarih', 'Hatırlatıcı'];
      const rows = dataToExport.map(i => [
        i.status === 'resolved' ? 'Çözüldü' : i.status === 'pending' ? 'Devam Ediyor' : 'Arşivlendi',
        i.issue_text,
        i.solution_text,
        i.created_at || '',
        i.reminder_date || ''
      ]);
      
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + headers.join(';') + '\n' 
        + rows.map(e => e.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';')).join('\n');
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `sorunlar_ve_cozumler_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
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

      <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div className="flex gap-4 mb-2">
            <button 
              className={`btn ${mode === 'seller' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setMode('seller'); setSelectedIds([]); setCurrentPage(1); }}
            >
              Satıcı Takip Modeli
            </button>
            <button 
              className={`btn ${mode === 'issues' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setMode('issues'); setSelectedIds([]); setCurrentPage(1); }}
            >
              Sorunlar & Çözümler
            </button>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px', marginTop: '0.5rem' }}>
            {mode === 'seller' ? 'Satıcı & Mağaza Yönetimi' : 'Ar-Ge & Sorun Yönetimi'}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {mode === 'seller' ? 'Taleplerinizi ve hatırlatıcılarınızı profesyonel Excel görünümünde yönetin.' : 'Karşılaşılan sorunları raporlayın ve çözüm yollarını arşivleyin.'}
          </p>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Genel Çözüm İlerlemesi</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)' }}>%{progress}</span>
          </div>
          <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', marginTop: '0.4rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-light))', width: `${progress}%`, transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap" style={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
          {selectedIds.length > 0 ? (
            <div className="flex bg-danger-light p-2 rounded gap-4" style={{ border: '1px solid var(--danger)', padding: '0.5rem', borderRadius: 'var(--radius)' }}>
               <span style={{ fontWeight: 600, color: 'var(--danger)', alignSelf: 'center' }}>{selectedIds.length} Seçili</span>
               <button className="btn btn-outline" style={{ color: 'initial', borderColor: 'var(--success)' }} onClick={() => exportToExcel(true)}>
                 <Download size={18} /> İndir
               </button>
               <button className="btn btn-outline" style={{ color: 'white', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                 if(confirm(`${selectedIds.length} kaydı tamamen silmek istediğinize emin misiniz?`)){
                   if (mode === 'seller') {
                     useStore.getState().bulkDeleteNotes(selectedIds);
                   } else {
                     useStore.getState().bulkDeleteIssues(selectedIds);
                   }
                   setSelectedIds([]);
                 }
               }}>
                 <Trash2 size={18} /> Sil
               </button>
            </div>
          ) : (
            <>
              {mode === 'seller' && <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} />}
              {mode === 'seller' && (
                <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} /> İçe Aktar
                </button>
              )}
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
          <p style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>{activeCount}</p>
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
          <p style={{ fontSize: '2.5rem', fontWeight: '600', color: 'var(--status-archived)' }}>{archivedCount}</p>
        </div>
      </div>

      <div className="grid-container mb-4" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1" style={{ position: 'relative', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder={mode === 'seller' ? "Mağaza, kişi veya konu ara..." : "Sorun veya çözüm metni ara..."} 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2" style={{ background: 'var(--bg-hover)', padding: '0.4rem', borderRadius: '0.4rem' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }} />
            {mode === 'seller' && (
              <input 
                type="text" className="form-input" placeholder="Satıcı Filtresi..." 
                style={{ width: '150px', background: 'var(--bg-app)' }} 
                value={filterSeller} onChange={e => setFilterSeller(e.target.value)} 
              />
            )}
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

      {currentDataLength === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
          <p>Kayıt bulunamadı. Lütfen filtreyi değiştirin veya Ekle butonuna basın.</p>
        </div>
      ) : (
        <>
          {mode === 'seller' ? (
            <DataGrid notes={paginatedNotes} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
          ) : (
            <IssuesGrid issues={paginatedIssues} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
          )}
          
          <div className="flex justify-between items-center mb-4" style={{ padding: '0.75rem 1rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sayfa Başına Gösterim:</span>
              <select 
                className="form-select" 
                style={{ width: '80px', padding: '0.3rem' }} 
                value={itemsPerPage} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setItemsPerPage(val);
                  localStorage.setItem('saticiItemsPerPage', val.toString());
                  setCurrentPage(1);
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={1000}>1000</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <button 
                className="btn btn-outline" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p - 1)}
                style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Önceki
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Sayfa {currentPage} / {Math.max(1, totalPages)}
              </span>
              <button 
                className="btn btn-outline" 
                disabled={currentPage >= totalPages} 
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ opacity: currentPage >= totalPages ? 0.5 : 1 }}
              >
                Sonraki
              </button>
            </div>
          </div>
        </>
      )}

      <GlobalNotesSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
}
