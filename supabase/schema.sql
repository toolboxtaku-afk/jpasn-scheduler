-- JPASN 日程調整アプリ - Supabase スキーマ
-- このファイルをSupabase SQL Editorで実行してください

-- events: イベント（会議）管理テーブル
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  creator_token UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- options: 候補日時テーブル
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- responses: 回答テーブル
-- status: 0 = × (NG), 1 = △ (どちらとも), 2 = ○ (OK)
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  status INT NOT NULL CHECK (status IN (0, 1, 2)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(option_id, user_name)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_options_event_id ON options(event_id);
CREATE INDEX IF NOT EXISTS idx_responses_option_id ON responses(option_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_name ON responses(user_name);

-- リアルタイム機能を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE options;

-- RLS (Row Level Security) ポリシー - 全員が読み書き可能（認証不要）
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- events: 誰でも作成・閲覧可能
CREATE POLICY "events_select" ON events FOR SELECT USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (true);

-- options: 誰でも作成・閲覧可能
CREATE POLICY "options_select" ON options FOR SELECT USING (true);
CREATE POLICY "options_insert" ON options FOR INSERT WITH CHECK (true);

-- responses: 誰でも作成・閲覧・更新可能
CREATE POLICY "responses_select" ON responses FOR SELECT USING (true);
CREATE POLICY "responses_insert" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "responses_update" ON responses FOR UPDATE USING (true);
