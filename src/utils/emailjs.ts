import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export const sendReminderEmail = async (params: {
  store_name: string;
  subject: string;
  phone_number: string;
  seller_name: string;
}) => {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn("EmailJS bilgileri eksik (.env). Lütfen EmailJS anahtarlarını girin.");
    return false;
  }

  const to_email = localStorage.getItem('saticiUserEmail');
  if (!to_email) return false;

  try {
    const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      ...params,
      to_email: to_email // Dynamically passed
    }, {
      publicKey: PUBLIC_KEY,
    });
    console.log('Email Başarıyla Gönderildi: ', result.text);
    return true;
  } catch (error) {
    console.error('Email Gönderim Hatası:', error);
    return false;
  }
};
