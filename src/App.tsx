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
  const { notes, markReminderSent, checkAuth, user } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;

    // Hatırlatıcı kontrolcüsü
    const interval = setInterval(() => {
      const now = new Date();
      notes.forEach((note) => {
        if (note.status === 'pending' && note.reminderDate && !note.reminderSent) {
          const reminderTime = new Date(note.reminderDate);
          if (now >= reminderTime) {
            
            // Kullanıcı tercihine göre bildirim gönder (Varsayılan olarak Browser True)
            if (note.notifyBrowser !== false) {
              sendNotification(`Hatırlatma: ${note.storeName}`, {
                body: `${note.subject} (Satıcı: ${note.sellerName}) - ${note.phoneNumber}`,
                icon: '/vite.svg'
              });
            }

            // Kullanıcı tercihine göre e-mail gönder
            if (note.notifyEmail === true) {
              sendReminderEmail({
                store_name: note.storeName,
                subject: note.subject,
                phone_number: note.phoneNumber,
                seller_name: note.sellerName,
              });
            }

            // Sistemde tekrar hatırlatılmasını engelle
            markReminderSent(note.id);
          }
        }
      });
    }, 1000 * 10);

    return () => clearInterval(interval);
  }, [notes, markReminderSent]);
  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}

export default App;
