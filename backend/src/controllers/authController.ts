import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import sgMail from "@sendgrid/mail";

import { pool } from "../config/database";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function register(req: Request, res: Response) {
  try {
    const {
      name,
      email,
      password,
      preferences = {
        vegetarian: false,
        glutenFree: false,
        lactoseFree: false,
      },
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Já existe um usuário com este e-mail." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, vegetarian, gluten_free, lactose_free)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, name, email, passwordHash,
        preferences.vegetarian ?? false,
        preferences.glutenFree ?? false,
        preferences.lactoseFree ?? false,
      ]
    );

    const accessToken = generateAccessToken({ userId, email });
    const refreshToken = generateRefreshToken({ userId, email });

    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, userId]);

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      user: { id: userId, name, email, preferences },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao cadastrar usuário.", error });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });

    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [refreshToken, user.id]);

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferences: user.preferences || {},
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao realizar login.", error });
  }
}

// Busca perfil do usuário logado
export async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const result = await pool.query(
      "SELECT id, name, email, preferences FROM users WHERE id = $1",
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Usuário não encontrado" });
    const u = result.rows[0];
    return res.json({ id: u.id, name: u.name, email: u.email, preferences: u.preferences || {} });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar perfil" });
  }
}

// Atualiza nome, e-mail, senha e/ou preferências do usuário logado
export async function updateMe(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const { name, email, currentPassword, newPassword, preferences } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Nome não pode estar vazio" });
    if (!email?.trim()) return res.status(400).json({ message: "E-mail não pode estar vazio" });

    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (!result.rows.length) return res.status(404).json({ message: "Usuário não encontrado" });
    const user = result.rows[0];

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: "Informe a senha atual" });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(400).json({ message: "Senha atual incorreta" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Nova senha deve ter pelo menos 6 caracteres" });
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== user.email) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [normalizedEmail, userId]
      );
      if (existing.rows.length > 0) return res.status(409).json({ message: "E-mail já em uso" });
    }

    if (preferences !== undefined) {
      await pool.query(
        "UPDATE users SET name = $1, email = $2, preferences = $3 WHERE id = $4",
        [name.trim(), normalizedEmail, JSON.stringify(preferences), userId]
      );
    } else {
      await pool.query(
        "UPDATE users SET name = $1, email = $2 WHERE id = $3",
        [name.trim(), normalizedEmail, userId]
      );
    }

    const updated = await pool.query(
      "SELECT id, name, email, preferences FROM users WHERE id = $1",
      [userId]
    );
    const u = updated.rows[0];
    return res.json({ user: { id: u.id, name: u.name, email: u.email, preferences: u.preferences || {} } });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return res.status(500).json({ message: "Erro ao atualizar dados" });
  }
}

// RF29 — Solicitar recuperação de senha
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "E-mail é obrigatório." });
    }

    const result = await pool.query(
      "SELECT id, name FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
      });
    }

    const user = result.rows[0];
    const token = randomUUID();

    // Salva expires_at já em UTC explícito
    await pool.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [user.id]
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2::uuid, (NOW() AT TIME ZONE 'UTC') + INTERVAL '1 hour')`,
      [user.id, token]
    );

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: "Redefinição de senha — MealSync",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2563eb;">MealSync</h2>
          <p>Olá, <strong>${user.name}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Copie o código abaixo e cole no aplicativo:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
            <code style="font-size: 18px; letter-spacing: 2px; color: #1e40af;">${token}</code>
          </div>
          <p style="color: #64748b; font-size: 13px;">Este código expira em <strong>1 hora</strong>.</p>
          <p style="color: #64748b; font-size: 13px;">Se você não solicitou a redefinição, ignore este e-mail.</p>
        </div>
      `,
    });

    return res.status(200).json({
      message: "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail de recuperação:", error);
    return res.status(500).json({ message: "Erro ao processar solicitação." });
  }
}

// RF29 — Redefinir senha com token
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token e nova senha são obrigatórios." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
    }

    const cleanToken = token.trim().toLowerCase();

    // Compara expires_at com NOW() AT TIME ZONE 'UTC' para evitar problema de fuso
    const result = await pool.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token::text = $1
         AND used = FALSE
         AND expires_at > (NOW() AT TIME ZONE 'UTC')`,
      [cleanToken]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Token inválido ou expirado." });
    }

    const { id: tokenId, user_id: userId } = result.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
    await pool.query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [tokenId]);

    return res.status(200).json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return res.status(500).json({ message: "Erro ao redefinir senha." });
  }
}