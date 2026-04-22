-- Supabase SQL Editor üzerinden aşağıdaki komutları çalıştırınız.
-- Bu komut, panel sıralama ve gizleme ayarlarının her bir kullanıcı (workspace) için veritabanında tutulmasını sağlar.
-- Böylece başka biri panelinizi görüntülediğinde, sizin belirlediğiniz sütun sıralamasıyla görür.

CREATE TABLE IF NOT EXISTS workspace_settings (
  owner_email TEXT PRIMARY KEY,
  column_config JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) ayarları (Opsiyonel ama önerilir)
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes okuyabilir" ON workspace_settings
  FOR SELECT USING (true);

CREATE POLICY "Kullanıcılar kendi ayarlarını güncelleyebilir" ON workspace_settings
  FOR ALL USING (auth.email() = owner_email);
