import { pool } from "./database";

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      vegetarian BOOLEAN DEFAULT FALSE,
      gluten_free BOOLEAN DEFAULT FALSE,
      lactose_free BOOLEAN DEFAULT FALSE,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipe_id VARCHAR(255) NOT NULL,
      prepared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // RF29 — tokens de recuperação de senha com expiração de 1 hora
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token UUID NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // RF21 — avaliações de receitas com constraint de 1 avaliação por usuário por receita
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recipe_id VARCHAR(255) NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name VARCHAR(255) NOT NULL DEFAULT 'Usuário',
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (recipe_id, user_id)
    );
  `);

  // Coluna de preferências alimentares do usuário (JSONB para flexibilidade)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
  `);
}