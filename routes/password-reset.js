const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendPasswordResetEmail } = require('../config/email');

const router = express.Router();

/**
 * 📧 Demander une réinitialisation de mot de passe
 * POST /api/password-reset/request
 */
router.post('/password-reset/request', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ message: 'Email et type utilisateur requis' });
    }

    // Tables correspondantes
    const tables = {
      patient: 'patients',
      medecin: 'medecins',
      secretaire: 'secretaires',
      admin: 'admins'
    };

    const table = tables[userType];
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    // Vérifier si l'email existe
    const userResult = await pool.query(
      `SELECT id, email FROM ${table} WHERE email = $1`,
      [email]
    );

    // Email n'existe pas
    if (userResult.rows.length === 0) {
      return res.json({
        exists: false,
        message: `Cette email n'existe pas pour ${userType}`
      });
    }

    // Générer un token sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    // Supprimer les anciens tokens pour cet email
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE email = $1 AND user_type = $2',
      [email, userType]
    );

    // Insérer le nouveau token
    await pool.query(
      `INSERT INTO password_reset_tokens (email, token, user_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, resetToken, userType, expiresAt]
    );

    // Envoyer l'email
    await sendPasswordResetEmail(email, resetToken, userType);

    console.log(`✅ Token de réinitialisation envoyé à ${email}`);

    res.json({
      exists: true,
      message: 'Un lien de réinitialisation a été envoyé à votre email.'
    });

  } catch (error) {
    console.error('❌ Erreur demande réinitialisation:', error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation' });
  }
});

/**
 * ✅ Vérifier la validité d'un token
 * GET /api/password-reset/verify-token/:token
 */
router.get('/password-reset/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Token manquant' });
    }

    const result = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND is_used = FALSE
       LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ 
        message: 'Lien invalide ou déjà utilisé',
        valid: false 
      });
    }

    const resetToken = result.rows[0];

    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ 
        message: 'Lien expiré. Veuillez faire une nouvelle demande.',
        valid: false 
      });
    }

    res.json({
      message: 'Token valide',
      valid: true,
      email: resetToken.email,
      userType: resetToken.user_type
    });

  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification du token' });
  }
});

/**
 * 🔄 Réinitialiser le mot de passe
 * POST /api/password-reset/reset
 */
router.post('/password-reset/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const tokenResult = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND is_used = FALSE
       LIMIT 1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Lien invalide ou déjà utilisé' });
    }

    const resetToken = tokenResult.rows[0];

    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({ message: 'Lien expiré' });
    }

    const tables = {
      patient: 'patients',
      medecin: 'medecins',
      secretaire: 'secretaires',
      admin: 'admins'
    };

    const table = tables[resetToken.user_type];
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE ${table} SET mot_de_passe = $1 WHERE email = $2`,
      [hashedPassword, resetToken.email]
    );

    await pool.query(
      'UPDATE password_reset_tokens SET is_used = TRUE WHERE id = $1',
      [resetToken.id]
    );

    console.log(`✅ Mot de passe réinitialisé pour ${resetToken.email}`);

    res.json({
      message: 'Mot de passe réinitialisé avec succès',
      success: true
    });

  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
});

module.exports = router;
