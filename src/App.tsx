import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { useStore } from './store/useStore';
import { requestNotificationPermission, sendNotification } from './utils/notifications';
import { sendReminderEmail } from './utils/emailjs';
import { supabase } from './lib/supabase';

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') || password.length < 6) {
      alert("Lütfen geçerli bir e-posta ve en az 6 haneli şifre girin.");
      return;
    }
    
    requestNotificationPermission();
    setLoading(true);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert('Kayıt Hatası: ' + error.message);
      else alert('Kayıt Başarılı!'); // Confirm Email kapalıysa anında giriş yapar
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert('Giriş Hatası: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div className="stat-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 className="mb-4" style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          {isRegister ? 'Yeni Hesap Oluştur' : 'Sisteme Giriş'}
        </h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Size özel çalışma alanı ve hatırlatıcılar için giriş yapın.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="email"
            className="form-input mb-4"
            placeholder="E-posta Adresiniz"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="form-input mb-4"
            placeholder="Şifreniz"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'İşleniyor...' : (isRegister ? 'Kayıt Ol' : 'Giriş Yap')}
          </button>
        </form>
        <button 
          onClick={() => setIsRegister(!isRegister)} 
          className="mt-4" 
          style={{ background: 'none', border: 'none', color: 'var(--status-pending)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isRegister ? 'Zaten hesabım var, Giriş Yap' : 'Hesabım yok, Kayıt Ol'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const { notes, markReminderSent, issues, markIssueReminderSent, globalNote, updateGlobalNote, checkAuth, user } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;

    // Hatırlatıcı kontrolcüsü
    const interval = setInterval(() => {
      const now = new Date();
      
      // 1. Seller Notes
      notes.forEach((note) => {
        if (note.status === 'pending' && note.reminderDate && !note.reminderSent) {
          const reminderTime = new Date(note.reminderDate);
          if (now >= reminderTime) {
            
            if (note.notifyBrowser !== false) {
              sendNotification(`Hatırlatma: ${note.storeName}`, {
                body: `${note.subject} (Satıcı: ${note.sellerName}) - ${note.phoneNumber}`,
                icon: '/vite.svg'
              });
            }

            if (note.notifyEmail === true) {
              sendReminderEmail({
                store_name: note.storeName,
                subject: note.subject,
                phone_number: note.phoneNumber,
                seller_name: note.sellerName,
              });
            }

            markReminderSent(note.id);
          }
        }
      });
      
      // 2. Global Notes (Serbest Defter)
      try {
        if (globalNote && globalNote.trim().startsWith('[')) {
          let updated = false;
          const items = JSON.parse(globalNote);
          const newItems = items.map((item: any) => {
            if (item.reminderDate && !item.reminderSent) {
              const rTime = new Date(item.reminderDate);
              if (now >= rTime) {
                sendNotification(`Not Hatırlatıcı`, {
                  body: item.text,
                  icon: '/vite.svg'
                });
                updated = true;
                return { ...item, reminderSent: true };
              }
            }
            return item;
          });
          
          if (updated) {
            updateGlobalNote(JSON.stringify(newItems));
          }
        }
      } catch (e) {
        console.error("Global Notes parse error for reminders", e);
      }
      
      // 3. Issues Notes
      issues.forEach((issue) => {
        if (issue.status === 'pending' && issue.reminder_date && !issue.reminder_sent) {
          const reminderTime = new Date(issue.reminder_date);
          if (now >= reminderTime) {
            sendNotification(`Sorun Hatırlatıcı`, {
              body: `${issue.issue_text.substring(0, 50)}...`,
              icon: '/vite.svg'
            });
            markIssueReminderSent(issue.id);
          }
        }
      });
      
    }, 1000 * 10);

    return () => clearInterval(interval);
  }, [notes, markReminderSent, issues, markIssueReminderSent, globalNote, updateGlobalNote, user]);
  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}

export default App;
