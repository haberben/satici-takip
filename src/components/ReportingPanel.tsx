import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Download, FileSpreadsheet, Presentation, TrendingUp, Users, Calendar, BarChart3, PieChart, RefreshCw, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ── Types ──
interface PersonStat {
  name: string;
  totalRequests: number;
  pending: number;
  resolved: number;
  archived: number;
  avgResolutionDays: number;
  subjects: Record<string, number>;
  dateMap: Record<string, number>;
}

interface DateStat {
  date: string;
  count: number;
  pending: number;
  resolved: number;
}

// ── Mini Chart Components (Pure Canvas) ──
function MiniBarChart({ data, color, height = 120 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barWidth = Math.min(32, (width - 20) / data.length - 4);
    const startX = (width - (barWidth + 4) * data.length) / 2;
    const chartHeight = height - 24;

    // Draw bars
    data.forEach((d, i) => {
      const barH = (d.value / maxVal) * (chartHeight - 10);
      const x = startX + i * (barWidth + 4);
      const y = chartHeight - barH;

      // Gradient bar
      const gradient = ctx.createLinearGradient(x, y, x, chartHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '40');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();

      // Value on top
      ctx.fillStyle = '#333';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      if (d.value > 0) {
        ctx.fillText(d.value.toString(), x + barWidth / 2, y - 3);
      }

      // Label
      ctx.fillStyle = '#888';
      ctx.font = '9px Inter, sans-serif';
      const label = d.label.length > 5 ? d.label.slice(0, 5) + '..' : d.label;
      ctx.fillText(label, x + barWidth / 2, height - 4);
    });
  }, [data, color, height]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}

function DonutChart({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const total = segments.reduce((s, d) => s + d.value, 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || total === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 8;
    const innerRadius = radius * 0.6;
    let startAngle = -Math.PI / 2;

    segments.forEach(seg => {
      const sliceAngle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = '#111';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), cx, cy - 6);
    ctx.fillStyle = '#888';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('Toplam', cx, cy + 12);
  }, [segments, total, size]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

function LineChart({ data, color, height = 140 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || data.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const maxVal = Math.max(...data.map(d => d.value), 1);
    const padLeft = 30;
    const padRight = 10;
    const padTop = 15;
    const padBottom = 30;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // Grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#aaa';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (1 - i / 4)).toString(), padLeft - 5, y + 3);
    }

    // Points and line
    const points = data.map((d, i) => ({
      x: padLeft + (chartW / Math.max(data.length - 1, 1)) * i,
      y: padTop + chartH - (d.value / maxVal) * chartH
    }));

    // Area fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, padTop + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padTop + chartH);
    ctx.closePath();

    const areaGradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    areaGradient.addColorStop(0, color + '30');
    areaGradient.addColorStop(1, color + '05');
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // X labels
    ctx.fillStyle = '#888';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(data.length / 7));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        ctx.fillText(d.label, points[i].x, height - 6);
      }
    });
  }, [data, color, height]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}


// ── Main Component ──
export function ReportingPanel() {
  const { notes, globalNote } = useStore();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'people' | 'timeline'>('overview');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Filtered Data ──
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (dateFrom && n.requestDate < dateFrom) return false;
      if (dateTo && n.requestDate > dateTo) return false;
      if (personFilter) {
        const pf = personFilter.toLowerCase();
        const matchesSeller = n.sellerName.toLowerCase().includes(pf);
        const matchesFrom = n.fromWhom.toLowerCase().includes(pf);
        const matchesStore = n.storeName.toLowerCase().includes(pf);
        if (!matchesSeller && !matchesFrom && !matchesStore) return false;
      }
      return true;
    });
  }, [notes, dateFrom, dateTo, personFilter]);

  // ── Statistics ──
  const stats = useMemo(() => {
    const pending = filteredNotes.filter(n => n.status === 'pending').length;
    const resolved = filteredNotes.filter(n => n.status === 'resolved').length;
    const archived = filteredNotes.filter(n => n.status === 'archived').length;
    const total = filteredNotes.length;
    const totalProducts = filteredNotes.reduce((sum, n) => sum + (Number(n.productCount) || 1), 0);
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Average resolution time (days)
    let totalDays = 0;
    let resolvedWithDates = 0;
    filteredNotes.forEach(n => {
      if (n.status === 'resolved' && n.solutionDate && n.requestDate) {
        const diff = new Date(n.solutionDate).getTime() - new Date(n.requestDate).getTime();
        totalDays += diff / (1000 * 60 * 60 * 24);
        resolvedWithDates++;
      }
    });
    const avgResolutionDays = resolvedWithDates > 0 ? Math.round(totalDays / resolvedWithDates * 10) / 10 : 0;

    return { total, pending, resolved, archived, resolutionRate, avgResolutionDays, totalProducts };
  }, [filteredNotes]);

  // ── Person Statistics ──
  const personStats = useMemo(() => {
    const map: Record<string, PersonStat> = {};

    filteredNotes.forEach(n => {
      // Track by "fromWhom" (request origin person)
      const key = n.fromWhom || 'Belirtilmemiş';
      if (!map[key]) {
        map[key] = { name: key, totalRequests: 0, pending: 0, resolved: 0, archived: 0, avgResolutionDays: 0, subjects: {}, dateMap: {} };
      }
      map[key].totalRequests++;
      map[key][n.status]++;
      
      // Subjects
      const subj = n.subject || 'Diğer';
      map[key].subjects[subj] = (map[key].subjects[subj] || 0) + 1;

      // Date map
      const d = n.requestDate || 'N/A';
      map[key].dateMap[d] = (map[key].dateMap[d] || 0) + 1;
    });

    // Calculate avg resolution for each person
    Object.values(map).forEach(ps => {
      const personNotes = filteredNotes.filter(n => (n.fromWhom || 'Belirtilmemiş') === ps.name);
      let days = 0;
      let count = 0;
      personNotes.forEach(n => {
        if (n.status === 'resolved' && n.solutionDate && n.requestDate) {
          days += (new Date(n.solutionDate).getTime() - new Date(n.requestDate).getTime()) / (1000 * 60 * 60 * 24);
          count++;
        }
      });
      ps.avgResolutionDays = count > 0 ? Math.round(days / count * 10) / 10 : 0;
    });

    return Object.values(map).sort((a, b) => b.totalRequests - a.totalRequests);
  }, [filteredNotes]);

  // ── Timeline Statistics ──
  const timelineStats = useMemo(() => {
    const map: Record<string, DateStat> = {};
    filteredNotes.forEach(n => {
      const d = n.requestDate || 'N/A';
      if (!map[d]) map[d] = { date: d, count: 0, pending: 0, resolved: 0 };
      map[d].count++;
      if (n.status === 'pending') map[d].pending++;
      if (n.status === 'resolved') map[d].resolved++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredNotes]);

  // ── Subject breakdown ──
  const subjectStats = useMemo(() => {
    const map: Record<string, number> = {};
    filteredNotes.forEach(n => {
      const subj = n.subject || 'Diğer';
      map[subj] = (map[subj] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredNotes]);

  // ── Unique person names for filter (fromWhom + sellerName + storeName) ──
  const uniquePersons = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => {
      if (n.fromWhom) set.add(n.fromWhom);
      if (n.sellerName) set.add(n.sellerName);
      if (n.storeName) set.add(n.storeName);
    });
    return Array.from(set).sort();
  }, [notes]);

  // ── Export Functions ──
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Genel Özet
    const summaryData = [
      ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR')],
      ['Rapor Dönemi', `${dateFrom || 'Başlangıç'} - ${dateTo || 'Bugüne'}`],
      ['Kişi Filtresi', personFilter || 'Tümü'],
      [],
      ['GENEL İSTATİSTİKLER'],
      ['Toplam Talep', stats.total],
      ['Devam Eden', stats.pending],
      ['Çözülen', stats.resolved],
      ['Arşivlenen', stats.archived],
      ['Çözüm Oranı (%)', stats.resolutionRate],
      ['Ort. Çözüm Süresi (Gün)', stats.avgResolutionDays],
      ['İşlem Gören Ürün Adedi', stats.totalProducts],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wpx: 200 }, { wpx: 150 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Genel Özet');

    // Sheet 2: Kişi bazlı istatistikler
    const personData = [
      ['Kişi Adı', 'Toplam Talep', 'Devam Eden', 'Çözülen', 'Arşivlenen', 'Çözüm Oranı (%)', 'Ort. Çözüm (Gün)', 'En Çok İstenen Konu'],
      ...personStats.map(ps => {
        const topSubject = Object.entries(ps.subjects).sort((a, b) => b[1] - a[1])[0];
        return [
          ps.name,
          ps.totalRequests,
          ps.pending,
          ps.resolved,
          ps.archived,
          ps.totalRequests > 0 ? Math.round((ps.resolved / ps.totalRequests) * 100) : 0,
          ps.avgResolutionDays,
          topSubject ? `${topSubject[0]} (${topSubject[1]})` : '-'
        ];
      })
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(personData);
    ws2['!cols'] = [{ wpx: 150 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 120 }, { wpx: 120 }, { wpx: 200 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Kişi İstatistikleri');

    // Sheet 3: Tarih bazlı istatistikler
    const timeData = [
      ['Tarih', 'Toplam Talep', 'Devam Eden', 'Çözülen'],
      ...timelineStats.map(ts => [ts.date, ts.count, ts.pending, ts.resolved])
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(timeData);
    ws3['!cols'] = [{ wpx: 120 }, { wpx: 100 }, { wpx: 100 }, { wpx: 100 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Tarih İstatistikleri');

    // Sheet 4: Konu dağılımı
    const subjectData = [
      ['Konu', 'Talep Sayısı'],
      ...subjectStats.map(s => [s.name, s.count])
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(subjectData);
    ws4['!cols'] = [{ wpx: 200 }, { wpx: 100 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Konu Dağılımı');

    // Sheet 5: Ham veri
    const rawHeaders = ['Durum', 'Mağaza', 'Kimden', 'Satıcı', 'Tel', 'Konu', 'Detay', 'İç Not', 'Adet', 'Talep Tarihi', 'Çözüm Tarihi'];
    const rawData = [
      rawHeaders,
      ...filteredNotes.map(n => [
        n.status === 'resolved' ? 'Çözüldü' : n.status === 'pending' ? 'Devam Ediyor' : 'Arşivlendi',
        n.storeName, n.fromWhom, n.sellerName, n.phoneNumber,
        n.subject, n.subjectDetail, n.internalNote || '',
        n.productCount, n.requestDate, n.solutionDate || ''
      ])
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(rawData);
    ws5['!cols'] = rawHeaders.map(() => ({ wpx: 120 }));
    XLSX.utils.book_append_sheet(wb, ws5, 'Ham Veri');

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Satici_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPPTX = async () => {
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.author = 'Satıcı Takip Sistemi';
    pptx.title = 'Satıcı Talep Raporlama';
    pptx.subject = 'Dönemsel İstatistik Raporu';

    // ── Theme Colors ──
    const DARK_BG = 'ffffff'; // Idefix için beyaz arka plan
    const CARD_BG = 'f8f9fa'; // Çok açık gri
    const ACCENT = '005CAA';  // Idefix Mavi
    const HIGHLIGHT = '533483';
    const GOLD = 'FE0000';    // Idefix Kırmızı
    const WHITE = '000000';   // Koyu metin rengi siyah
    const LIGHT = '555555';   // İkincil metin rengi koyu gri
    const GREEN = '2ecc71';
    const ORANGE = 'f39c12';
    const BLUE = '3498db';

    // ── Logo Helper ──
    const addLogo = (slide: any) => {
      // Slaytın sağ üst köşesine Idefix 'i' simgesi ve yazısı
      slide.addShape(pptx.ShapeType.ellipse, { x: 8.3, y: 0.25, w: 0.15, h: 0.15, fill: { type: 'solid', color: GOLD } });
      slide.addShape(pptx.ShapeType.parallelogram, { x: 8.28, y: 0.43, w: 0.18, h: 0.25, fill: { type: 'solid', color: ACCENT } });
      slide.addText('idefix', { x: 8.55, y: 0.28, w: 1.2, h: 0.4, fontSize: 18, color: ACCENT, bold: true, fontFace: 'Arial' });
    };

    // ── Slide 1: Cover ──
    const slide1 = pptx.addSlide();
    slide1.background = { color: DARK_BG };
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'solid', color: DARK_BG } });
    // Accent bar
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 2.2, w: 0.15, h: 1.5, fill: { type: 'solid', color: GOLD } });
    slide1.addText('Satıcı Talep\nRaporlama', { x: 0.5, y: 1.8, w: 9, h: 2, fontSize: 36, color: ACCENT, bold: true, fontFace: 'Segoe UI', lineSpacingMultiple: 1.2 });
    slide1.addText(`Rapor Dönemi: ${dateFrom || 'Başlangıç'} — ${dateTo || 'Bugüne'}`, { x: 0.5, y: 3.6, w: 9, h: 0.5, fontSize: 14, color: LIGHT, fontFace: 'Segoe UI' });
    slide1.addText(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`, { x: 0.5, y: 4.1, w: 9, h: 0.5, fontSize: 12, color: LIGHT, fontFace: 'Segoe UI' });
    slide1.addText(personFilter ? `Kişi Filtresi: ${personFilter}` : 'Tüm Kişiler', { x: 0.5, y: 4.5, w: 9, h: 0.5, fontSize: 12, color: GOLD, fontFace: 'Segoe UI', bold: true });
    
    // Kapak sayfası büyük logo
    slide1.addShape(pptx.ShapeType.ellipse, { x: 6.8, y: 1.5, w: 0.6, h: 0.6, fill: { type: 'solid', color: GOLD } });
    slide1.addShape(pptx.ShapeType.parallelogram, { x: 6.75, y: 2.2, w: 0.7, h: 1.0, fill: { type: 'solid', color: ACCENT } });
    slide1.addText('idefix', { x: 7.6, y: 1.8, w: 4, h: 1.5, fontSize: 60, color: ACCENT, bold: true, fontFace: 'Arial' });

    const slide2 = pptx.addSlide();
    slide2.background = { color: DARK_BG };
    slide2.addText('Genel Bakış', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, color: WHITE, bold: true, fontFace: 'Segoe UI' });
    slide2.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.85, w: 2, h: 0.04, fill: { type: 'solid', color: GOLD } });

    // KPI Cards
    const kpis = [
      { label: 'Toplam Talep', value: stats.total.toString(), color: BLUE },
      { label: 'Devam Eden', value: stats.pending.toString(), color: ORANGE },
      { label: 'Çözülen', value: stats.resolved.toString(), color: GREEN },
      { label: 'Çözüm Oranı', value: `%${stats.resolutionRate}`, color: GOLD },
    ];

    kpis.forEach((kpi, i) => {
      const x = 0.5 + i * 2.3;
      slide2.addShape(pptx.ShapeType.roundRect, { x, y: 1.3, w: 2.1, h: 1.6, fill: { type: 'solid', color: CARD_BG }, rectRadius: 0.15 });
      slide2.addText(kpi.value, { x, y: 1.5, w: 2.1, h: 0.8, fontSize: 32, color: kpi.color, bold: true, align: 'center', fontFace: 'Segoe UI' });
      slide2.addText(kpi.label, { x, y: 2.2, w: 2.1, h: 0.5, fontSize: 12, color: LIGHT, align: 'center', fontFace: 'Segoe UI' });
    });

    // Extra info
    slide2.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 3.1, w: 4.8, h: 1.6, fill: { type: 'solid', color: CARD_BG }, rectRadius: 0.15 });
    slide2.addText([
      { text: 'Ort. Çözüm Süresi: ', options: { color: LIGHT, fontSize: 14, fontFace: 'Segoe UI' } },
      { text: `${stats.avgResolutionDays} gün`, options: { color: GREEN, fontSize: 14, bold: true, fontFace: 'Segoe UI' } },
    ], { x: 0.8, y: 3.3, w: 4, h: 0.4 });
    slide2.addText([
      { text: 'Arşivlenen: ', options: { color: LIGHT, fontSize: 14, fontFace: 'Segoe UI' } },
      { text: stats.archived.toString(), options: { color: LIGHT, fontSize: 14, bold: true, fontFace: 'Segoe UI' } },
    ], { x: 0.8, y: 3.7, w: 4, h: 0.4 });
    slide2.addText([
      { text: 'İşlem Gören Ürün: ', options: { color: LIGHT, fontSize: 16, fontFace: 'Segoe UI' } },
      { text: `${stats.totalProducts} Adet`, options: { color: ACCENT, fontSize: 16, bold: true, fontFace: 'Segoe UI' } },
    ], { x: 0.8, y: 4.1, w: 4, h: 0.4 });

    // ── Slide 3: Kişi Bazlı ──
    const slide3 = pptx.addSlide();
    slide3.background = { color: DARK_BG };
    slide3.addText('Kişi Bazlı İstatistikler', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, color: WHITE, bold: true, fontFace: 'Segoe UI' });
    slide3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.85, w: 2, h: 0.04, fill: { type: 'solid', color: GOLD } });

    // Table
    const topPeople = personStats.slice(0, 8);
    const tableRows: any[][] = [
      [
        { text: 'Kişi', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
        { text: 'Toplam', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
        { text: 'Devam', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
        { text: 'Çözülen', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
        { text: 'Çözüm %', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
        { text: 'Ort. Gün', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
      ],
      ...topPeople.map((ps, i) => [
        { text: ps.name, options: { color: WHITE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
        { text: ps.totalRequests.toString(), options: { color: BLUE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI', bold: true } },
        { text: ps.pending.toString(), options: { color: ORANGE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
        { text: ps.resolved.toString(), options: { color: GREEN, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
        { text: `%${ps.totalRequests > 0 ? Math.round((ps.resolved / ps.totalRequests) * 100) : 0}`, options: { color: WHITE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
        { text: ps.avgResolutionDays.toString(), options: { color: LIGHT, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
      ])
    ];

    slide3.addTable(tableRows, {
      x: 0.5, y: 1.2, w: 9,
      border: { type: 'solid', pt: 0.5, color: ACCENT },
      colW: [2.5, 1.2, 1.2, 1.2, 1.2, 1.2],
      rowH: 0.4,
    });

    // ── Slide 4+: Zaman Çizelgesi (tüm tarihler, her slayta 15 satır) ──
    const ROWS_PER_SLIDE = 15;
    const timeSlideCount = Math.max(1, Math.ceil(timelineStats.length / ROWS_PER_SLIDE));
    const timeSlides: any[] = [];

    for (let si = 0; si < timeSlideCount; si++) {
      const slicedStats = timelineStats.slice(si * ROWS_PER_SLIDE, (si + 1) * ROWS_PER_SLIDE);
      const tsSlide = pptx.addSlide();
      tsSlide.background = { color: DARK_BG };
      const slideLabel = timeSlideCount > 1
        ? `Zaman Çizelgesi (${si + 1}/${timeSlideCount})`
        : 'Zaman Çizelgesi';
      tsSlide.addText(slideLabel, { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, color: WHITE, bold: true, fontFace: 'Segoe UI' });
      tsSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.85, w: 2, h: 0.04, fill: { type: 'solid', color: GOLD } });

      const timeRows: any[][] = [
        [
          { text: 'Tarih', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
          { text: 'Toplam', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
          { text: 'Devam Eden', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
          { text: 'Çözülen', options: { bold: true, color: WHITE, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Segoe UI' } },
        ],
        ...slicedStats.map((ts, i) => [
          { text: ts.date, options: { color: WHITE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
          { text: ts.count.toString(), options: { color: BLUE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI', bold: true } },
          { text: ts.pending.toString(), options: { color: ORANGE, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
          { text: ts.resolved.toString(), options: { color: GREEN, fill: { color: i % 2 === 0 ? CARD_BG : DARK_BG }, fontSize: 10, fontFace: 'Segoe UI' } },
        ])
      ];

      tsSlide.addTable(timeRows, {
        x: 0.5, y: 1.2, w: 9,
        border: { type: 'solid', pt: 0.5, color: ACCENT },
        colW: [3, 2, 2, 2],
        rowH: 0.4,
      });

      timeSlides.push(tsSlide);
    }

    // ── Slide 5: Konu Dağılımı ──
    const slide5 = pptx.addSlide();
    slide5.background = { color: DARK_BG };
    slide5.addText('Konu Dağılımı', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, color: WHITE, bold: true, fontFace: 'Segoe UI' });
    slide5.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.85, w: 2, h: 0.04, fill: { type: 'solid', color: GOLD } });

    const subjColors = [BLUE, GREEN, ORANGE, GOLD, HIGHLIGHT, '1abc9c', '9b59b6', 'e67e22', '2980b9', '27ae60'];
    subjectStats.forEach((s, i) => {
      const y = 1.3 + i * 0.4;
      // Background bar
      slide5.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 9, h: 0.35, fill: { type: 'solid', color: CARD_BG }, rectRadius: 0.05 });
      // Value bar
      const maxCount = subjectStats[0].count;
      const barW = Math.max(0.3, (s.count / maxCount) * 5);
      slide5.addShape(pptx.ShapeType.roundRect, { x: 3.5, y: y + 0.05, w: barW, h: 0.25, fill: { type: 'solid', color: subjColors[i % subjColors.length] }, rectRadius: 0.05 });
      // Label
      slide5.addText(s.name, { x: 0.6, y, w: 2.8, h: 0.35, fontSize: 10, color: WHITE, fontFace: 'Segoe UI', valign: 'middle' });
      // Count
      slide5.addText(s.count.toString(), { x: 3.5 + barW + 0.15, y, w: 1, h: 0.35, fontSize: 10, color: subjColors[i % subjColors.length], bold: true, fontFace: 'Segoe UI', valign: 'middle' });
    });

    // Eklenen slaytlara Logo koyuyoruz
    addLogo(slide2);
    addLogo(slide3);
    timeSlides.forEach(ts => addLogo(ts));
    addLogo(slide5);

    // ── Global Note JSON Parse ──
    let parsedNotesText = 'Henüz görünürde veya serbest defterde önemli bir not bulunmamaktadır.';
    if (globalNote) {
      try {
        if (globalNote.trim().startsWith('[')) {
          const parsed = JSON.parse(globalNote);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedNotesText = parsed.map((item: any) => `• ${item.text}`).join('\n\n');
          }
        } else {
          parsedNotesText = globalNote;
        }
      } catch(e) {
        parsedNotesText = globalNote;
      }
    }

    // ── Slide 6: Serbest Defter (Önemli Notlar) ──
    const slide6 = pptx.addSlide();
    slide6.background = { color: DARK_BG };
    slide6.addText('Önemli Notlar / Serbest Defter', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, color: ACCENT, bold: true, fontFace: 'Segoe UI' });
    slide6.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.85, w: 2, h: 0.04, fill: { type: 'solid', color: GOLD } });
    
    slide6.addText(parsedNotesText, {
        x: 0.5, y: 1.2, w: 9, h: 4, 
        fontSize: 14, color: WHITE, 
        valign: 'top', fontFace: 'Segoe UI' 
    });
    addLogo(slide6);

    // ── Slide 7: Summary ──
    const slide7 = pptx.addSlide();
    slide7.background = { color: DARK_BG };
    slide7.addShape(pptx.ShapeType.rect, { x: 0, y: 2.0, w: 0.15, h: 1.5, fill: { type: 'solid', color: GOLD } });
    slide7.addText('Teşekkürler', { x: 0.5, y: 1.8, w: 9, h: 1, fontSize: 36, color: ACCENT, bold: true, fontFace: 'Segoe UI' });
    slide7.addText('Bu rapor Satıcı Takip Sistemi tarafından otomatik oluşturulmuştur.', { x: 0.5, y: 3.0, w: 9, h: 0.6, fontSize: 14, color: LIGHT, fontFace: 'Segoe UI' });
    slide7.addText(`Rapor Tarih: ${new Date().toLocaleDateString('tr-TR')} • Toplam ${stats.total} Kayıt Analiz Edildi`, { x: 0.5, y: 3.6, w: 9, h: 0.5, fontSize: 12, color: GOLD, fontFace: 'Segoe UI' });
    addLogo(slide7);

    pptx.writeFile({ fileName: `Satici_Sunum_${new Date().toISOString().split('T')[0]}.pptx` });
  };

  // Chart colors
  const chartColors = ['#6366f1', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#3b82f6'];

  return (
    <div className="reporting-panel">
      {/* Header */}
      <div className="report-header">
        <div className="report-header-left">
          <div className="report-icon-wrap">
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 className="report-title">Raporlama & İstatistikler</h2>
            <p className="report-subtitle">Talep verilerinizi analiz edin, profesyonel raporlar indirin</p>
          </div>
        </div>

        <div className="report-export-wrap" ref={exportMenuRef}>
          <button className="btn-export-main" onClick={() => setExportMenuOpen(!exportMenuOpen)}>
            <Download size={18} />
            Rapor İndir
            <ChevronDown size={16} style={{ transform: exportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {exportMenuOpen && (
            <div className="export-dropdown">
              <button className="export-option" onClick={() => { exportToExcel(); setExportMenuOpen(false); }}>
                <FileSpreadsheet size={20} />
                <div>
                  <div className="export-option-title">Excel Raporu (.xlsx)</div>
                  <div className="export-option-desc">5 sayfada detaylı istatistikler</div>
                </div>
              </button>
              <button className="export-option" onClick={() => { exportToPPTX(); setExportMenuOpen(false); }}>
                <Presentation size={20} />
                <div>
                  <div className="export-option-title">Sunum Dosyası (.pptx)</div>
                  <div className="export-option-desc">6 slaytlık profesyonel sunum</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="report-filters">
        <div className="filter-group">
          <Calendar size={16} />
          <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Başlangıç" />
          <span style={{ color: 'var(--text-secondary)' }}>—</span>
          <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Bitiş" />
        </div>
        <div className="filter-group">
          <Users size={16} />
          <select
            className="form-input"
            value={personFilter}
            onChange={e => setPersonFilter(e.target.value)}
            style={{ minWidth: '220px' }}
          >
            <option value="">— Tüm Kişiler —</option>
            {uniquePersons.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {(dateFrom || dateTo || personFilter) && (
          <button className="btn-reset" onClick={() => { setDateFrom(''); setDateTo(''); setPersonFilter(''); }}>
            <RefreshCw size={14} /> Temizle
          </button>
        )}
      </div>

      {/* Section Nav */}
      <div className="report-nav">
        <button className={`report-nav-btn ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>
          <PieChart size={16} /> Genel Bakış
        </button>
        <button className={`report-nav-btn ${activeSection === 'people' ? 'active' : ''}`} onClick={() => setActiveSection('people')}>
          <Users size={16} /> Kişi Bazlı
        </button>
        <button className={`report-nav-btn ${activeSection === 'timeline' ? 'active' : ''}`} onClick={() => setActiveSection('timeline')}>
          <TrendingUp size={16} /> Zaman Çizelgesi
        </button>
      </div>

      {/* ── Overview Section ── */}
      {activeSection === 'overview' && (
        <div className="report-section fade-in">
          {/* KPI Row */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
              <div className="kpi-label">Toplam Talep</div>
              <div className="kpi-bar" style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#f5a623' }}>{stats.pending}</div>
              <div className="kpi-label">Devam Eden</div>
              <div className="kpi-bar" style={{ background: 'linear-gradient(90deg, #f5a623, #fbbf24)' }} />
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#0070f3' }}>{stats.resolved}</div>
              <div className="kpi-label">Çözülen</div>
              <div className="kpi-bar" style={{ background: 'linear-gradient(90deg, #0070f3, #38bdf8)' }} />
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#10b981' }}>%{stats.resolutionRate}</div>
              <div className="kpi-label">Çözüm Oranı</div>
              <div className="kpi-bar" style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#8b5cf6' }}>{stats.avgResolutionDays}</div>
              <div className="kpi-label">Ort. Çözüm (Gün)</div>
              <div className="kpi-bar" style={{ background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' }} />
            </div>
          </div>

          {/* Charts Row */}
          <div className="chart-row">
            <div className="chart-card" style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 className="chart-title">Durum Dağılımı</h4>
              <DonutChart segments={[
                { label: 'Devam', value: stats.pending, color: '#f5a623' },
                { label: 'Çözülen', value: stats.resolved, color: '#0070f3' },
                { label: 'Arşiv', value: stats.archived, color: '#888' },
              ]} />
              <div className="donut-legend">
                {[
                  { label: 'Devam Eden', color: '#f5a623', val: stats.pending },
                  { label: 'Çözülen', color: '#0070f3', val: stats.resolved },
                  { label: 'Arşivlenen', color: '#888', val: stats.archived },
                ].map(l => (
                  <div key={l.label} className="legend-item">
                    <span className="legend-dot" style={{ background: l.color }} />
                    <span>{l.label}</span>
                    <span className="legend-val">{l.val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card" style={{ flex: 1 }}>
              <h4 className="chart-title">En Çok Talep Edilen Konular</h4>
              <MiniBarChart
                data={subjectStats.slice(0, 8).map(s => ({ label: s.name, value: s.count }))}
                color="#6366f1"
                height={180}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── People Section ── */}
      {activeSection === 'people' && (
        <div className="report-section fade-in">
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <h4 className="chart-title">Kişi Bazlı Talep Dağılımı</h4>
            <MiniBarChart
              data={personStats.slice(0, 10).map(ps => ({ label: ps.name, value: ps.totalRequests }))}
              color="#06b6d4"
              height={160}
            />
          </div>

          <div className="people-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kişi (Kimden)</th>
                  <th>Toplam Talep</th>
                  <th>Devam Eden</th>
                  <th>Çözülen</th>
                  <th>Arşiv</th>
                  <th>Çözüm Oranı</th>
                  <th>Ort. Çözüm (Gün)</th>
                  <th>En Çok Konu</th>
                </tr>
              </thead>
              <tbody>
                {personStats.map((ps, i) => {
                  const topSubj = Object.entries(ps.subjects).sort((a, b) => b[1] - a[1])[0];
                  const rate = ps.totalRequests > 0 ? Math.round((ps.resolved / ps.totalRequests) * 100) : 0;
                  return (
                    <tr key={ps.name}>
                      <td className="rank-cell">{i + 1}</td>
                      <td className="person-cell">
                        <div className="person-avatar" style={{ background: chartColors[i % chartColors.length] }}>
                          {ps.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{ps.name}</span>
                      </td>
                      <td><strong>{ps.totalRequests}</strong></td>
                      <td><span className="badge badge-pending">{ps.pending}</span></td>
                      <td><span className="badge badge-resolved">{ps.resolved}</span></td>
                      <td><span className="badge badge-archived">{ps.archived}</span></td>
                      <td>
                        <div className="rate-bar-wrap">
                          <div className="rate-bar" style={{ width: `${rate}%`, background: rate > 70 ? '#10b981' : rate > 40 ? '#f5a623' : '#ef4444' }} />
                          <span>%{rate}</span>
                        </div>
                      </td>
                      <td>{ps.avgResolutionDays > 0 ? ps.avgResolutionDays + ' gün' : '—'}</td>
                      <td className="subject-cell">{topSubj ? `${topSubj[0]} (${topSubj[1]})` : '—'}</td>
                    </tr>
                  );
                })}
                {personStats.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Gösterilecek veri yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Timeline Section ── */}
      {activeSection === 'timeline' && (
        <div className="report-section fade-in">
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <h4 className="chart-title">Günlük Talep Trendi</h4>
            <LineChart
              data={timelineStats.map(ts => ({ label: ts.date.slice(5), value: ts.count }))}
              color="#6366f1"
              height={180}
            />
          </div>

          <div className="chart-row">
            <div className="chart-card" style={{ flex: 1 }}>
              <h4 className="chart-title">Çözülen Talepler (Günlük)</h4>
              <LineChart
                data={timelineStats.map(ts => ({ label: ts.date.slice(5), value: ts.resolved }))}
                color="#10b981"
                height={140}
              />
            </div>
            <div className="chart-card" style={{ flex: 1 }}>
              <h4 className="chart-title">Devam Eden Talepler (Günlük)</h4>
              <LineChart
                data={timelineStats.map(ts => ({ label: ts.date.slice(5), value: ts.pending }))}
                color="#f5a623"
                height={140}
              />
            </div>
          </div>

          <div className="people-table-wrap" style={{ marginTop: '1.5rem' }}>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Toplam Talep</th>
                  <th>Devam Eden</th>
                  <th>Çözülen</th>
                  <th>Dağılım</th>
                </tr>
              </thead>
              <tbody>
                {timelineStats.map(ts => (
                  <tr key={ts.date}>
                    <td style={{ fontWeight: 600 }}>{new Date(ts.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td><strong>{ts.count}</strong></td>
                    <td><span className="badge badge-pending">{ts.pending}</span></td>
                    <td><span className="badge badge-resolved">{ts.resolved}</span></td>
                    <td>
                      <div className="stacked-bar">
                        {ts.resolved > 0 && <div style={{ flex: ts.resolved, background: '#0070f3', borderRadius: '4px 0 0 4px' }} />}
                        {ts.pending > 0 && <div style={{ flex: ts.pending, background: '#f5a623' }} />}
                        {(ts.count - ts.resolved - ts.pending) > 0 && <div style={{ flex: ts.count - ts.resolved - ts.pending, background: '#ddd', borderRadius: '0 4px 4px 0' }} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {timelineStats.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Gösterilecek veri yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
