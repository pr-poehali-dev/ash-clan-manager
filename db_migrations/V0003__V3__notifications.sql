CREATE TABLE t_p65061780_ash_clan_manager.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.users(id),
    type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    link VARCHAR(64),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON t_p65061780_ash_clan_manager.notifications(user_id, is_read, created_at DESC);
