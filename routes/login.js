// backend/routes/login.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, motDePasse, userType } = req.body;

    // Validation des champs
    if (!email || !motDePasse || !userType) {
      return res.status(400).json({ message: 'Champs manquants' });
    }

    // Correspondance table
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

    // Recherche utilisateur
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Vérifier mot de passe
    const validPassword = await bcrypt.compare(motDePasse, user.mot_de_passe);

    if (!validPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier statut (médecin & secrétaire)
    if ((userType === 'medecin' || userType === 'secretaire') && user.statut !== 'approuve') {
      return res.status(403).json({
        message: 'Compte en attente d\'approbation par un administrateur'
      });
    }

    // Générer JWT
    const token = jwt.sign(
      { id: user.id, userType },
      process.env.JWT_SECRET || 'SECRET_KEY_CHANGE_ME',
      { expiresIn: '1d' }
    );

    // Réponse compatible Angular
    res.json({
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone,
        sexe: user.sexe || null,
        pays: user.pays || null,
        ville: user.ville || null,
        specialite: user.specialite || null,
        rpps: user.rpps || null,
        adresseHopital: user.adresse_hopital || null,
        poste: user.poste || null,
        departement: user.departement || null,
        userType,
        statut: user.statut || 'approuve',
        dateInscription: user.date_inscription,
        photoBase64: user.photo_base64 || null
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
  }
});

module.exports = router;