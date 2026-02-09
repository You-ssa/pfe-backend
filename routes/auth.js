const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

/**
 * 🔐 LOGIN (tous les types)
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  const { email, motDePasse, userType } = req.body;

  if (!email || !motDePasse || !userType) {
    return res.status(400).json({ message: 'Champs manquants' });
  }

  try {
    // Sécurité : tables autorisées uniquement
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

    const result = await pool.query(
      `SELECT * FROM ${table} WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Vérifier mot de passe
    const isMatch = await bcrypt.compare(motDePasse, user.mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier validation (médecin / secrétaire)
    if (
      (userType === 'medecin' || userType === 'secretaire') &&
      user.is_validated === false
    ) {
      return res.status(403).json({ message: 'Compte en attente de validation' });
    }

    // JWT
    const token = jwt.sign(
      { id: user.id, userType },
      'SECRET_KEY',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        userType
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * 📝 REGISTER (patient / medecin / secretaire)
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  const {
    nom,
    prenom,
    email,
    telephone,
    motDePasse,
    userType
  } = req.body;

  if (!nom || !prenom || !email || !motDePasse || !userType) {
    return res.status(400).json({ message: 'Champs manquants' });
  }

  try {
    const tables = {
      patient: 'patients',
      medecin: 'medecins',
      secretaire: 'secretaires'
    };

    const table = tables[userType];
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    // Vérifier email existant
    const check = await pool.query(
      `SELECT id FROM ${table} WHERE email = $1`,
      [email]
    );

    if (check.rows.length > 0) {
      return res.status(409).json({ message: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    const isValidated = userType === 'patient';

    await pool.query(
      `INSERT INTO ${table}
      (nom, prenom, email, telephone, mot_de_passe, is_validated)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [nom, prenom, email, telephone, hashedPassword, isValidated]
    );

    res.status(201).json({
      message:
        userType === 'patient'
          ? 'Inscription réussie'
          : 'Compte créé, en attente de validation'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
