import { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { useStore } from './store/useStore';
import { requestNotificationPermission, sendNotification } from './utils/notifications';
import { sendReminderEmail } from './utils/emailjs';

function App() {
  const { notes, markReminderSent, fetchNotes } = useStore();

  useEffect(() => {
    // Sayfa açıldığında verileri Supabase'den çek
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    requestNotificationPermission();

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

  return <Dashboard />;
}

export default App;
