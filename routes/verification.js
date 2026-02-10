// backend/routes/verification.js
const express = require('express');
const pool = require('../config/db');
const { sendVerificationCode } = require('../config/email');

const router = express.Router();

/**
 * 📧 Générer et envoyer un code de vérification
 * POST /api/verification/send-code
 */
router.post('/verification/send-code', async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ message: 'Email et type utilisateur requis' });
    }

    // Vérifier que le type est valide
    const validTypes = ['patient', 'medecin', 'secretaire'];
    if (!validTypes.includes(userType)) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    // Générer un code aléatoire à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiration : 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Supprimer les anciens codes pour cet email
    await pool.query(
      'DELETE FROM verification_codes WHERE email = $1 AND user_type = $2',
      [email, userType]
    );

    // Insérer le nouveau code
    await pool.query(
      `INSERT INTO verification_codes (email, code, user_type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, code, userType, expiresAt]
    );

    // Envoyer l'email
    await sendVerificationCode(email, code, userType);

    console.log(`✅ Code envoyé à ${email}: ${code}`); // Pour debug (à retirer en production)

    res.json({
      message: 'Code de vérification envoyé avec succès',
      expiresIn: 15 // minutes
    });

  } catch (error) {
    console.error('❌ Erreur envoi code:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du code de vérification' });
  }
});

/**
 * ✅ Vérifier un code de vérification
 * POST /api/verification/verify-code
 */
router.post('/verification/verify-code', async (req, res) => {
  try {
    const { email, code, userType } = req.body;

    if (!email || !code || !userType) {
      return res.status(400).json({ message: 'Données manquantes' });
    }

    // Rechercher le code
    const result = await pool.query(
      `SELECT * FROM verification_codes 
       WHERE email = $1 AND code = $2 AND user_type = $3 AND is_used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, code, userType]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Code invalide ou déjà utilisé' });
    }

    const verification = result.rows[0];

    // Vérifier expiration
    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({ message: 'Code expiré. Demandez un nouveau code.' });
    }

    // Marquer comme utilisé
    await pool.query(
      'UPDATE verification_codes SET is_used = TRUE WHERE id = $1',
      [verification.id]
    );

    res.json({
      message: 'Code vérifié avec succès',
      verified: true
    });

  } catch (error) {
    console.error('❌ Erreur vérification code:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification du code' });
  }
});

module.exports = router;