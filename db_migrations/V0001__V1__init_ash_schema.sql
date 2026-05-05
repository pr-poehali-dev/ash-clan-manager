
CREATE TABLE t_p65061780_ash_clan_manager.users (
    id SERIAL PRIMARY KEY,
    steam_id VARCHAR(32) UNIQUE NOT NULL,
    steam_nick VARCHAR(128) NOT NULL,
    steam_avatar TEXT,
    session_token VARCHAR(64) UNIQUE,
    clan_id INTEGER,
    role VARCHAR(32) DEFAULT 'member',
    kda NUMERIC(5,2) DEFAULT 0,
    wins INTEGER DEFAULT 0,
    winrate NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(16) DEFAULT 'offline',
    rank VARCHAR(64) DEFAULT '',
    games TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p65061780_ash_clan_manager.clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) UNIQUE NOT NULL,
    tag VARCHAR(16) UNIQUE NOT NULL,
    owner_id INTEGER NOT NULL,
    level INTEGER DEFAULT 1,
    rank VARCHAR(64) DEFAULT 'Bronze',
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    winrate NUMERIC(5,2) DEFAULT 0,
    max_members INTEGER DEFAULT 30,
    founded_year CHAR(4) DEFAULT EXTRACT(YEAR FROM NOW())::CHAR(4),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE t_p65061780_ash_clan_manager.users
    ADD CONSTRAINT fk_users_clan FOREIGN KEY (clan_id)
    REFERENCES t_p65061780_ash_clan_manager.clans(id);

CREATE TABLE t_p65061780_ash_clan_manager.messages (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.clans(id),
    user_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE t_p65061780_ash_clan_manager.invites (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.clans(id),
    from_user_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.users(id),
    to_user_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.users(id),
    status VARCHAR(16) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (clan_id, to_user_id)
);

CREATE TABLE t_p65061780_ash_clan_manager.activity (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL REFERENCES t_p65061780_ash_clan_manager.clans(id),
    user_id INTEGER REFERENCES t_p65061780_ash_clan_manager.users(id),
    action TEXT NOT NULL,
    type VARCHAR(32) DEFAULT 'info',
    game VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_clan ON t_p65061780_ash_clan_manager.messages(clan_id, created_at DESC);
CREATE INDEX idx_activity_clan ON t_p65061780_ash_clan_manager.activity(clan_id, created_at DESC);
CREATE INDEX idx_invites_to ON t_p65061780_ash_clan_manager.invites(to_user_id, status);
