ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(255) NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS orders
    DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE IF EXISTS orders
    DROP CONSTRAINT IF EXISTS orders_created_by_type_check;

ALTER TABLE IF EXISTS orders
    ADD CONSTRAINT orders_created_by_type_check CHECK (created_by_type IN ('BOT', 'SAAS', 'SHOP'));

ALTER TABLE IF EXISTS orders
    ADD CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'));

ALTER TABLE IF EXISTS providers
    DROP CONSTRAINT IF EXISTS providers_kind_check;

ALTER TABLE IF EXISTS providers
    ADD CONSTRAINT providers_kind_check CHECK (kind IN ('CLAUDE_CLI', 'CODEX_CLI', 'GPT_CLI', 'ANTHROPIC_API', 'OPENAI', 'OPENAI_COMPAT'));

-- O CHECK de `scripts.kind` foi gerado pelo Hibernate quando o enum ScriptKind tinha menos valores;
-- `ddl-auto=update` não atualiza check constraints, então MCP/CONNECTOR eram rejeitados. Recria com o
-- conjunto atual (mesmo padrão do providers_kind_check acima).
ALTER TABLE IF EXISTS scripts
    DROP CONSTRAINT IF EXISTS scripts_kind_check;

ALTER TABLE IF EXISTS scripts
    ADD CONSTRAINT scripts_kind_check CHECK (kind IN ('COMMAND', 'INLINE', 'FILE', 'HTTP', 'MCP', 'CONNECTOR'));

-- A tabela `secrets` tinha uma coluna legada `kind` (NOT NULL, sem default) de antes do rename para
-- `auth_type`; `ddl-auto=update` não remove colunas antigas, então todo INSERT em secrets falhava com
-- "null value in column kind". A entidade SecretEntity só mapeia `auth_type` — remover a coluna órfã.
ALTER TABLE IF EXISTS secrets
    DROP COLUMN IF EXISTS kind;

ALTER TABLE IF EXISTS pending_contact_info
    ALTER COLUMN bot_id DROP NOT NULL;

-- Permitir exercícios órfãos nas sessões de treino
ALTER TABLE IF EXISTS workout_session_exercises 
    ALTER COLUMN exercise_id DROP NOT NULL;

-- Adicionar XP e Nível para usuários existentes
ALTER TABLE IF EXISTS users 
    ADD COLUMN IF NOT EXISTS xp BIGINT NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS users 
    ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS onboarding_goal VARCHAR(50);

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS onboarding_level VARCHAR(50);

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS onboarding_days_per_week INTEGER;

CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES users(id),
    followed_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_follows_follower_followed UNIQUE (follower_id, followed_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed_id ON follows(followed_id);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    reference_key VARCHAR(255),
    achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_reference_key ON achievements(reference_key) WHERE reference_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(type);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES users(id),
    content VARCHAR(500),
    media_url VARCHAR(1000),
    media_thumbnail_url VARCHAR(1000),
    media_type VARCHAR(20) NOT NULL DEFAULT 'NONE',
    post_type VARCHAR(30) NOT NULL DEFAULT 'USER',
    workout_id UUID,
    achievement_id UUID,
    is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON posts(is_draft);
CREATE INDEX IF NOT EXISTS idx_posts_workout_id ON posts(workout_id);
CREATE INDEX IF NOT EXISTS idx_posts_achievement_id ON posts(achievement_id);

CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL DEFAULT 'CLAP',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_post_reactions_post_user_type UNIQUE (post_id, user_id, type)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);

CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id),
    author_id UUID NOT NULL REFERENCES users(id),
    content VARCHAR(300) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON post_comments(author_id);

CREATE TABLE IF NOT EXISTS device_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(128) NOT NULL,
    token VARCHAR(512) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'FCM',
    app_version VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_device_tokens_token UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_device_id ON device_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_is_active ON device_tokens(is_active);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    recipient_user_id UUID NOT NULL REFERENCES users(id),
    actor_user_id UUID,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(500) NOT NULL,
    target_route VARCHAR(255) NOT NULL,
    payload_json TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    new_follower_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    post_reaction_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    post_comment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    achievement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    workout_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ranking_enabled BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- Community Explore catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS community_assets (
    id UUID PRIMARY KEY,
    owner_user_id UUID,
    kind VARCHAR(32) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    tags JSONB NOT NULL,
    payload JSONB NOT NULL,
    visibility VARCHAR(32) NOT NULL DEFAULT 'PRIVATE',
    origin_asset_id UUID,
    import_count BIGINT NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT community_assets_kind_check CHECK (kind IN ('SQUAD', 'SKILL', 'KNOWLEDGE', 'SCRIPT', 'COMMAND', 'MCP')),
    CONSTRAINT community_assets_visibility_check CHECK (visibility IN ('PRIVATE', 'PUBLIC'))
);
CREATE INDEX IF NOT EXISTS idx_community_assets_visibility ON community_assets(visibility);
CREATE INDEX IF NOT EXISTS idx_community_assets_kind ON community_assets(kind);
CREATE INDEX IF NOT EXISTS idx_community_assets_owner_user_id ON community_assets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_community_assets_import_count ON community_assets(import_count DESC);

-- ============================================================
-- Knowledge base (RAG) — pgvector
-- ============================================================
-- Este script roda DEPOIS do Hibernate (spring.jpa.defer-datasource-initialization=true), então as
-- tabelas knowledge_collection e knowledge_document (entidades JPA) já existem aqui. A tabela
-- knowledge_chunk NÃO é uma entidade JPA: sua coluna `embedding` usa o tipo `vector` (extensão
-- pgvector) e é lida por SQL nativo (busca por similaridade), então é criada e gerida aqui.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunk (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES knowledge_document(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES knowledge_collection(id) ON DELETE CASCADE,
    ordinal INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    embedding vector NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_document_id ON knowledge_chunk(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_collection_id ON knowledge_chunk(collection_id);

-- Índice ANN opcional (exige dimensão fixa). Depois de travar `app.ai.embeddings.dimensions`, rode uma vez:
--   ALTER TABLE knowledge_chunk ALTER COLUMN embedding TYPE vector(1024);
--   CREATE INDEX IF NOT EXISTS idx_knowledge_chunk_embedding
--       ON knowledge_chunk USING hnsw (embedding vector_cosine_ops);
