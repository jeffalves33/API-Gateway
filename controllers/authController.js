// Arquivo: controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { pool } = require('../config/db');
const { clearCacheForUser } = require('../helpers/keyHelper');
const { s3, BUCKET_NAME } = require('../config/s3Config');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Função para registrar um novo usuário
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se o usuário já existe
    const userExists = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email já registrado' });
    }

    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Inserir novo usuário no banco de dados
    const newUser = await pool.query(
      'INSERT INTO "user" (name, email, password) VALUES ($1, $2, $3) RETURNING id_user, name, email',
      [name, email, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso!',
      user: {
        id: newUser.rows[0].id_user,
        name: newUser.rows[0].name,
        email: newUser.rows[0].email
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Função para login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário pelo email
    const result = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Email ou senha incorretos' });
    }

    const user = result.rows[0];

    // Verificar se a senha está correta
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) return res.status(400).json({ success: false, message: 'Email ou senha incorretos' });


    // Criar e atribuir um token JWT
    const token = jwt.sign(
      { id: user.id_user, email: user.email },
      process.env.JWT_SECRET || 'seu_segredo_jwt',
      { expiresIn: '1h' }
    );

    // Configurar o cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 3600000, // 1 hora em milissegundos
      // Em produção, adicione: secure: true (para HTTPS apenas)
    });

    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      user: {
        id: user.id_user,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Função para trocar senha com token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verifica token
    const tokenQuery = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = FALSE`,
      [token]
    );

    if (tokenQuery.rows.length === 0) return res.status(400).json({ success: false, message: "Token inválido" });

    const row = tokenQuery.rows[0];

    if (new Date() > row.expires_at) return res.status(400).json({ success: false, message: "Token expirado" });

    // Atualiza senha
    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE "user" SET password = $1 WHERE email = $2`,
      [hash, row.email]
    );

    // Marca token como usado
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE token = $1`,
      [token]
    );

    res.json({ success: true, message: "Senha alterada com sucesso!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao alterar senha" });
  }
};

// Função para enviar email com link
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Verifica se usuario existe
    const userQuery = await pool.query(
      'SELECT id_user FROM "user" WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) return res.status(400).json({ success: false, message: "Email não encontrado" });

    // Gera token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Salva token
    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, expires_at)
       VALUES ($1, $2, $3)`,
      [email, token, expiresAt]
    );

    // URL do reset
    const resetLink = `${process.env.FRONTEND_BASE_URL}/resetPassword.html?token=${token}`;

    // Envio de email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Recuperação de senha",
      html: `
        <p>Você solicitou a recuperação de senha.</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Este link expira em 1 hora.</p>
      `
    });

    res.json({ success: true, message: "Email enviado!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erro ao enviar email" });
  }
};

// Função para obter dados do perfil
const getUserProfile = async (req, res) => {
  try {
    // Buscar dados do usuário no banco
    const result = await pool.query('SELECT id_user, name, email, created_at, foto_perfil FROM "user" WHERE id_user = $1', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      message: 'Dados do perfil recuperados com sucesso',
      user
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
};

// Função para logout
const logoutUser = (req, res) => {
  const id_user = req.user?.id;
  if (id_user) clearCacheForUser(id_user);

  res.clearCookie('jwt');
  res.status(200).json({ success: true, message: 'Logout realizado com sucesso' });
};

const checkAuthStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        message: 'Usuário não está logado'
      });
    }

    // Buscar dados atualizados do usuário no banco
    const result = await pool.query('SELECT id_user, name, email FROM "user" WHERE id_user = $1', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: false,
        authenticated: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      authenticated: true,
      message: 'Usuário está logado',
      user: {
        id: user.id_user,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status de autenticação:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      message: 'Erro interno do servidor'
    });
  }
};

const addAvatarProfileBucket = async (req, res) => {
  try {
    // Verifica se um arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo de imagem foi enviado'
      });
    }

    // URL da imagem no S3
    const imageUrl = req.file.location;

    // Opcional: Deletar avatar antigo se existir
    try {
      const userResult = await pool.query('SELECT foto_perfil FROM "user" WHERE id_user = $1', [req.user.id]);

      if (userResult.rows.length > 0 && userResult.rows[0].foto_perfil) {
        const oldImageUrl = userResult.rows[0].foto_perfil;

        // Extrair a chave (nome do arquivo) da URL antiga
        if (oldImageUrl.includes(BUCKET_NAME)) {
          const oldKey = oldImageUrl.split('/').pop();

          // Deletar arquivo antigo do S3
          await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: oldKey
          }));
        }
      }
    } catch (deleteError) {
      console.warn('Erro ao deletar imagem anterior:', deleteError);
      // Não interrompe o processo se não conseguir deletar a imagem antiga
    }

    // Atualizar URL da foto no banco de dados
    const updateResult = await pool.query(
      'UPDATE "user" SET foto_perfil = $1 WHERE id_user = $2 RETURNING id_user, name, email, foto_perfil',
      [imageUrl, req.user.id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar enviado com sucesso!',
      url: imageUrl,
      user: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);

    // Se houve erro, tenta deletar o arquivo que foi enviado
    if (req.file && req.file.key) {
      try {
        await s3.deleteObject({
          Bucket: BUCKET_NAME,
          Key: req.file.key
        }).promise();
      } catch (deleteError) {
        console.error('Erro ao deletar arquivo após falha:', deleteError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao fazer upload da imagem'
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, email, foto_perfil } = req.body;
    const userId = req.user.id;

    // Validações básicas
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios'
      });
    }

    // Verificar se o email já está sendo usado por outro usuário
    const emailExists = await pool.query('SELECT id_user FROM "user" WHERE email = $1 AND id_user != $2', [email, userId]);

    if (emailExists.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este email já está sendo usado por outro usuário'
      });
    }

    // Atualizar os dados do usuário
    const updateResult = await pool.query(
      'UPDATE "user" SET name = $1, email = $2, foto_perfil = $3 WHERE id_user = $4 RETURNING id_user, name, email, foto_perfil',
      [name, email, foto_perfil, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      user: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar dados do usuário (incluindo foto de perfil)
    const userResult = await pool.query('SELECT foto_perfil FROM "user" WHERE id_user = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = userResult.rows[0];

    // Deletar foto de perfil do S3 se existir
    if (user.foto_perfil && user.foto_perfil.includes(BUCKET_NAME)) {
      try {
        const imageKey = user.foto_perfil.split('/').pop();
        await s3.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: imageKey
        }));
      } catch (deleteError) {
        console.warn('Erro ao deletar imagem do S3:', deleteError);
        // Não interrompe o processo se não conseguir deletar a imagem
      }
    }

    // Deletar usuário do banco de dados
    await pool.query('DELETE FROM "user" WHERE id_user = $1', [userId]);

    // Limpar cache do usuário
    clearCacheForUser(userId);

    // Limpar cookie
    res.clearCookie('jwt');

    res.status(200).json({
      success: true,
      message: 'Conta deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  addAvatarProfileBucket,
  checkAuthStatus,
  deleteUserAccount,
  forgotPassword,
  getUserProfile,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  updateUserProfile,
};