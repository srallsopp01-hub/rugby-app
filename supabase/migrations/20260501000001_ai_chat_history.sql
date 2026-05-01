ALTER TABLE squad_profiles ADD COLUMN IF NOT EXISTS ai_chat_history jsonb DEFAULT '[]';
