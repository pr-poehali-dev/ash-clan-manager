CREATE TABLE t_p65061780_ash_clan_manager.events (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.clans(id),
    created_by INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.users(id),
    title VARCHAR(200) NOT NULL,
    type VARCHAR(64) DEFAULT 'event',
    description TEXT,
    game VARCHAR(64),
    event_date TIMESTAMPTZ NOT NULL,
    max_participants INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p65061780_ash_clan_manager.event_participants (
    event_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.events(id),
    user_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.users(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_events_clan ON t_p65061780_ash_clan_manager.events(clan_id, event_date);

ALTER TABLE t_p65061780_ash_clan_manager.users ADD COLUMN IF NOT EXISTS steam_profile_url TEXT;
ALTER TABLE t_p65061780_ash_clan_manager.users ADD COLUMN IF NOT EXISTS steam_country VARCHAR(8);
ALTER TABLE t_p65061780_ash_clan_manager.users ADD COLUMN IF NOT EXISTS steam_games_count INTEGER DEFAULT 0;
ALTER TABLE t_p65061780_ash_clan_manager.users ADD COLUMN IF NOT EXISTS steam_hours INTEGER DEFAULT 0;
