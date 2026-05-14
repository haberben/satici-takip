import { useState, useRef, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { DataGrid } from './DataGrid';
import { Plus, Search, BookOpen, Download, Share2, Upload, LogOut, User, Trash2, Filter, TrendingUp } from 'lucide-react';
import { GlobalNotesSidebar } from './GlobalNotesSidebar';
import { IssuesGrid } from './IssuesGrid';
import { ReportingPanel } from './ReportingPanel';
import { ColumnSettingsPanel } from './ColumnSettingsPanel';
import { useColumnConfig } from '../utils/useColumnConfig';
import { ShareModal } from './ShareModal';


export function Dashboard() {
  const { 
    notes, issues, addNote, addIssue, activeWorkspace, availableWorkspaces, 
    setActiveWorkspace, user, signOut, workspacePermissions,
    selectedMonth, viewMode, setSelectedMonth, setViewMode
  } = useStore();
  const currentUserEmail = user?.email || localStorage.getItem('saticiUserEmail') || '';
  const hasEditPermission = !activeWorkspace || workspacePermissions[activeWorkspace] === 'edit' || activeWorkspace === currentUserEmail;
  const [mode, setMode] = useState<'seller' | 'issues' | 'reporting'>('seller');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const handleShare = () => setIsShareModalOpen(true);
  
  const normalizeTurkish = (str: string) => {
    if (!str) return '';
    return str
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase();
  };
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
  const columnConfig = useColumnConfig(activeWorkspace);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const s = normalizeTurkish(searchTerm);
      const matchesSearch = 
        normalizeTurkish(note.storeName).includes(s) || 
        normalizeTurkish(note.sellerName).includes(s) ||
        normalizeTurkish(note.fromWhom).includes(s) ||
        normalizeTurkish(note.subject).includes(s);
        
      const fs = normalizeTurkish(filterSeller);
      const matchesSeller = filterSeller
        ? normalizeTurkish(note.sellerName).includes(fs) ||
          normalizeTurkish(note.fromWhom).includes(fs)
        : true;
      const matchesDate = filterDate ? note.requestDate === filterDate : true;
      
      // Monthly Filter
      const matchesMonth = viewMode === 'all' ? true : (note.requestDate?.startsWith(selectedMonth));

      const isMatch = matchesSearch && matchesSeller && matchesDate && matchesMonth;
      if (filter === 'all') return isMatch && note.status !== 'archived';
      return isMatch && note.status === filter;
    });
  }, [notes, searchTerm, filterSeller, filterDate, selectedMonth, viewMode, filter]);

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const s = normalizeTurkish(searchTerm);
      const matchesSearch = 
        normalizeTurkish(issue.issue_text).includes(s) ||
        normalizeTurkish(issue.solution_text).includes(s);
      
      const matchesDate = filterDate ? issue.created_at === filterDate : true;
      
      // Monthly Filter
      const matchesMonth = viewMode === 'all' ? true : (issue.created_at?.startsWith(selectedMonth));

      const isMatch = matchesSearch && matchesDate && matchesMonth;
      if (filter === 'all') return isMatch && issue.status !== 'archived';
      return isMatch && issue.status === filter;
    });
  }, [issues, searchTerm, filterDate, selectedMonth, viewMode, filter]);

  const pendingCount = useMemo(() => filteredNotes.filter(n => n.status === 'pending').length, [filteredNotes]);
  const resolvedCount = useMemo(() => filteredNotes.filter(n => n.status === 'resolved').length, [filteredNotes]);
  const archivedCount = useMemo(() => filteredNotes.filter(n => n.status === 'archived').length, [filteredNotes]);
  const activeCount = useMemo(() => filteredNotes.filter(n => n.status !== 'archived').length, [filteredNotes]);
  const progress = useMemo(() => Math.round((resolvedCount / Math.max(activeCount, 1)) * 100), [resolvedCount, activeCount]);

  const currentDataLength = mode === 'seller' ? filteredNotes.length : filteredIssues.length;
  const totalPages = Math.ceil(currentDataLength / itemsPerPage);
  const paginatedNotes = filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const topSellerStats = useMemo(() => {
    if (mode !== 'seller') return { name: '-', products: 0, count: 0 };
    const sStats: Record<string, { requests: number, products: number }> = {};
    filteredNotes.forEach(n => {
      const seller = n.sellerName || n.storeName || 'Belirtilmemiş';
      if (!sStats[seller]) {
        sStats[seller] = { requests: 0, products: 0 };
      }
      sStats[seller].requests += 1;
      sStats[seller].products += (Number(n.productCount) || 1);
    });

    let tName = '-';
    let tReq = 0;
    let tProd = 0;

    Object.entries(sStats).forEach(([name, data]) => {
      if (data.requests > tReq) {
        tReq = data.requests;
        tProd = data.products;
        tName = name;
      }
    });

    return { name: tName, count: tReq, products: tProd };
  }, [filteredNotes, mode]);

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
      // Use custom column labels from config — visible columns in their configured order
      const exportCols = columnConfig.visibleColumns;
      const headers = ['Durum', ...exportCols.map(c => c.label)];
      const rows = dataToExport.map(n => {
        const statusLabel = n.status === 'resolved' ? 'Çözüldü' : n.status === 'pending' ? 'Devam Ediyor' : 'Arşivlendi';
        const colValues = exportCols.map(col => {
          const val = n[col.id as keyof typeof n];
          if (val === null || val === undefined) return '';
          if (typeof val === 'boolean') return val ? 'Evet' : 'Hayır';
          if (Array.isArray(val)) return '';
          return String(val);
        });
        return [statusLabel, ...colValues];
      });
      
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


  return (
    <div className="container-fluid" style={{ maxWidth: '1600px', margin: '0 auto', padding: '3rem 2rem' }}>
      {/* Üst Kısım: Kurumsal Header */}
      <div className="flex justify-between items-center mb-8" style={{ background: 'var(--bg-panel)', padding: '1.25rem 2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 pr-6" style={{ borderRight: '2px solid var(--bg-hover)' }}>
               <img 
                 src="https://idefix.akinoncdn.com/static_omnishop/idefix201/img/idefix-logo-svg.svg" 
                 alt="Idefix Logo" 
                 style={{ height: '36px', objectFit: 'contain' }} 
               />
               <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Takip Paneli</span>
            </div>
            <div className="flex items-center gap-2">
               <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Çalışma Alanı:</span>
               <select 
                className="form-select" 
                style={{ width: 'auto', minWidth: '250px', fontWeight: 600, border: 'none', background: 'var(--bg-hover)', borderRadius: '8px' }}
                value={activeWorkspace || ''}
                onChange={(e) => setActiveWorkspace(e.target.value)}
              >
                {availableWorkspaces.map(ws => (
                  <option key={ws} value={ws}>
                    {ws === currentUserEmail ? 'Kişisel Panelim' : `${ws} (Paylaşılan)`}
                  </option>
                ))}
              </select>
            </div>
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

      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>
            {mode === 'seller' ? 'Satıcı & Mağaza Yönetimi' : mode === 'issues' ? 'Ar-Ge & Sorun Yönetimi' : 'Raporlama & Analiz'}
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {mode === 'seller' ? 'Operasyonel süreçlerinizi ve satıcı taleplerini profesyonel düzeyde takip edin.' : mode === 'issues' ? 'Sistem sorunlarını kaydedin ve çözüm süreçlerini yönetin.' : 'Veriye dayalı kararlar için gelişmiş istatistikler.'}
          </p>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end px-6" style={{ borderRight: '2px solid var(--border-color)' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Aktif Dönem</span>
             <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{viewMode === 'all' ? 'TÜM ZAMANLAR' : selectedMonth}</span>
           </div>
           <div style={{ paddingLeft: '1.5rem', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-resolved)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Genel İlerleme</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>%{progress}</div>
           </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8 p-1.5" style={{ background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
          <button
            className={`btn ${mode === 'seller' ? 'btn-primary' : ''}`}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: mode === 'seller' ? 'var(--primary-color)' : 'transparent', color: mode === 'seller' ? '#fff' : 'var(--text-secondary)', border: 'none' }}
            onClick={() => setMode('seller')}
          >
            <Search size={18} /> Satıcı Takip
          </button>
          <button
            className={`btn ${mode === 'issues' ? 'btn-primary' : ''}`}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: mode === 'issues' ? 'var(--primary-color)' : 'transparent', color: mode === 'issues' ? '#fff' : 'var(--text-secondary)', border: 'none' }}
            onClick={() => setMode('issues')}
          >
            <Plus size={18} /> Genel Sorunlar
          </button>
          <button
            className={`btn ${mode === 'reporting' ? 'btn-primary' : ''}`}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', background: mode === 'reporting' ? 'var(--primary-color)' : 'transparent', color: mode === 'reporting' ? '#fff' : 'var(--text-secondary)', border: 'none' }}
            onClick={() => setMode('reporting')}
          >
            <TrendingUp size={18} /> Raporlama
          </button>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          {mode !== 'reporting' && (
            <div className="flex items-center gap-4">
              {selectedIds.length > 0 ? (
                <div className="flex items-center gap-4 bg-danger-light p-2 px-4 rounded-xl border border-red-200 shadow-sm">
                   <span style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.9rem' }}>{selectedIds.length} Kayıt Seçildi</span>
                   <button className="btn btn-outline" style={{ background: '#fff' }} onClick={() => exportToExcel(true)}>İndir</button>
                   {hasEditPermission && (
                     <button className="btn" style={{ background: 'var(--danger)', color: '#fff' }} onClick={() => {
                        if(confirm(`${selectedIds.length} kaydı silmek istediğinize emin misiniz?`)){
                          if (mode === 'seller') useStore.getState().bulkDeleteNotes(selectedIds);
                          else useStore.getState().bulkDeleteIssues(selectedIds);
                          setSelectedIds([]);
                        }
                     }}>Sil</button>
                   )}
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  {/* Dönem Filtresi Grubu */}
                  <div className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <button 
                      className={`btn btn-sm ${viewMode === 'monthly' ? 'btn-primary' : 'btn-outline'}`} 
                      style={{ border: 'none', padding: '0.5rem 1rem', background: viewMode === 'monthly' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'monthly' ? '#fff' : 'var(--text-secondary)' }} 
                      onClick={() => setViewMode('monthly')}
                    >
                      Aylık
                    </button>
                    <button 
                      className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-outline'}`} 
                      style={{ border: 'none', padding: '0.5rem 1rem', background: viewMode === 'all' ? 'var(--primary-color)' : 'transparent', color: viewMode === 'all' ? '#fff' : 'var(--text-secondary)' }} 
                      onClick={() => setViewMode('all')}
                    >
                      Tümü
                    </button>
                    {viewMode === 'monthly' && (
                      <input type="month" className="form-input" style={{ width: '150px', height: '32px', fontSize: '0.875rem', marginLeft: '0.5rem' }} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                    )}
                  </div>

                  {/* İşlem Butonları Grubu */}
                  <div className="flex items-center gap-3">
                    <button className="btn btn-outline shadow-sm" style={{ background: '#fff', padding: '0.6rem' }} onClick={() => exportToExcel(false)} title="Excel Dışa Aktar">
                      <Download size={20} />
                    </button>
                    {mode === 'seller' && (
                      <>
                        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportCSV} />
                        <button className="btn btn-outline shadow-sm" style={{ background: '#fff', padding: '0.6rem' }} onClick={() => fileInputRef.current?.click()} title="CSV İçe Aktar">
                          <Upload size={20} />
                        </button>
                        <div className="shadow-sm rounded-lg overflow-hidden">
                          <ColumnSettingsPanel
                            columns={columnConfig.columns}
                            renameColumn={columnConfig.renameColumn}
                            toggleColumn={columnConfig.toggleColumn}
                            moveColumn={columnConfig.moveColumn}
                            resetColumns={columnConfig.resetColumns}
                          />
                        </div>
                      </>
                    )}
                    <button className="btn btn-outline shadow-sm" style={{ background: '#fff', padding: '0.6rem' }} onClick={() => setIsSidebarOpen(true)} title="Serbest Defter">
                      <BookOpen size={20} />
                    </button>
                  </div>

                  <div style={{ width: '2px', height: '30px', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>

                  {/* Yeni Kayıt Grubu */}
                  {hasEditPermission && (
                    <button className="btn btn-primary shadow-lg" style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, gap: '0.75rem' }} onClick={handleAddNewRow}>
                      <Plus size={20} /> Yeni Kayıt Ekle
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {mode === 'reporting' ? (
        <ReportingPanel />
      ) : (
        <>
          <div className="flex gap-6 mb-8" style={{ display: 'grid', gridTemplateColumns: mode === 'seller' ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)' }}>
            <div className="stat-card" style={{ borderLeft: '4px solid var(--text-primary)' }}>
              <div className="flex justify-between items-start mb-2">
                 <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOPLAM AKTİF</h3>
                 <div style={{ background: 'var(--bg-hover)', padding: '0.5rem', borderRadius: '8px' }}><Search size={16} /></div>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{activeCount}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Aktif taleplerin özeti</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--status-pending)' }}>
              <div className="flex justify-between items-start mb-2">
                 <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>DEVAM EDEN</h3>
                 <div style={{ background: 'var(--status-pending-bg)', padding: '0.5rem', borderRadius: '8px', color: 'var(--status-pending)' }}><Plus size={16} /></div>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--status-pending)' }}>{pendingCount}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Müdahale bekleyenler</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--status-resolved)' }}>
              <div className="flex justify-between items-start mb-2">
                 <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ÇÖZÜLENLER</h3>
                 <div style={{ background: 'var(--status-resolved-bg)', padding: '0.5rem', borderRadius: '8px', color: 'var(--status-resolved)' }}><Plus size={16} style={{ transform: 'rotate(45deg)' }} /></div>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--status-resolved)' }}>{resolvedCount}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Tamamlanan işlemler</div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--status-archived)' }}>
              <div className="flex justify-between items-start mb-2">
                 <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>ARŞİVLENEN</h3>
                 <div style={{ background: 'var(--status-archived-bg)', padding: '0.5rem', borderRadius: '8px', color: 'var(--status-archived)' }}><Trash2 size={16} /></div>
              </div>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--status-archived)' }}>{archivedCount}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Geçmiş kayıtlar</div>
            </div>

            {mode === 'seller' && (
              <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <div className="flex justify-between items-start mb-2">
                   <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LİDER MAĞAZA</h3>
                   <div style={{ background: 'var(--danger-light)', padding: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }}><TrendingUp size={16} /></div>
                </div>
                <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--danger)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={topSellerStats.name}>{topSellerStats.name}</p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{topSellerStats.products} Ürün Müdahale</div>
              </div>
            )}
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
                    type="text" className="form-input" placeholder="Satıcı / Kimden..." 
                    style={{ width: '160px', background: 'var(--bg-app)' }} 
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
                <DataGrid notes={paginatedNotes} selectedIds={selectedIds} setSelectedIds={setSelectedIds} visibleColumns={columnConfig.visibleColumns} />
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
        </>
      )}

      <GlobalNotesSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isShareModalOpen && <ShareModal onClose={() => setIsShareModalOpen(false)} />}
    </div>
  );
}
