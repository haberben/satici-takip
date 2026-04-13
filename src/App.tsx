import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { useStore } from './store/useStore';
import { requestNotificationPermission, sendNotification } from './utils/notifications';
import { sendReminderEmail } from './utils/emailjs';

function LoginScreen({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState('');

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    // Kullanıcı giriş butonuna tıkladığı an (kullanıcı etkileşimi şarttır) bildirim izni isteyeceğiz!
    requestNotificationPermission();
    onLogin(email);
  };

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div className="stat-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h2 className="mb-4" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Sisteme Giriş</h2>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Size özel hatırlatmaların gönderilebilmesi için e-posta bilginizi girin.
        </p>
        <form onSubmit={handleEnter}>
          <input
            autoFocus
            type="email"
            className="form-input mb-4"
            placeholder="ornek@sirket.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}>Sisteme Gir ve İzin Ver</button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const { notes, markReminderSent, initWorkspaces } = useStore();
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('saticiUserEmail'));

  useEffect(() => {
    if (userEmail) {
      initWorkspaces(userEmail);
    }
  }, [userEmail, initWorkspaces]);

  useEffect(() => {
    if (!userEmail) return;

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
  const handleLogin = (email: string) => {
    localStorage.setItem('saticiUserEmail', email);
    setUserEmail(email);
  };

  if (!userEmail) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <Dashboard />;
}

export default App;
