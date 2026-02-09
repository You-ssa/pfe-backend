// backend/routes/admin.js
const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// ========================================
// RÉCUPÉRER LES UTILISATEURS EN ATTENTE
// ========================================

router.get('/utilisateurs-en-attente/:userType', async (req, res) => {
  try {
    const { userType } = req.params;

    const tables = {
      medecin: 'medecins',
      secretaire: 'secretaires'
    };

    const table = tables[userType];
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    const result = await pool.query(
      `SELECT id, nom, prenom, email, telephone, sexe, pays, ville, 
              specialite, rpps, adresse_hopital, poste, departement,
              photo_base64, statut, date_inscription
       FROM ${table}
       WHERE statut = 'en_attente'
       ORDER BY date_inscription DESC`,
      []
    );

    const users = result.rows.map(user => ({
      ...user,
      userType,
      photoBase64: user.photo_base64 || null
    }));

    res.json(users);

  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs en attente:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// APPROUVER UN UTILISATEUR
// ========================================

router.put('/approuver/:userType/:userId', async (req, res) => {
  try {
    const { userType, userId } = req.params;

    const tables = {
      medecin: 'medecins',
      secretaire: 'secretaires'
    };

    const table = tables[userType];
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    const result = await pool.query(
      `UPDATE ${table}
       SET statut = 'approuve'
       WHERE id = $1
       RETURNING id, nom, prenom, email, statut`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: `${userType} approuvé avec succès`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur approbation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// REFUSER UN UTILISATEUR (SUPPRESSION)
// ========================================

router.delete('/refuser/:userType/:userId', async (req, res) => {
  try {
    const { userType, userId } = req.params;

    const tables = {
      medecin: 'medecins',
      secretaire: 'secretaires'
    };

    const table = tables[userType];
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    const result = await pool.query(
      `DELETE FROM ${table}
       WHERE id = $1
       RETURNING id, nom, prenom, email`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({
      message: `${userType} refusé et supprimé`,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur refus:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// RÉCUPÉRER TOUS LES MÉDECINS APPROUVÉS
// ========================================

router.get('/medecins-approuves', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, email, telephone, sexe, pays, ville,
              specialite, rpps, adresse_hopital, photo_base64, date_inscription
       FROM medecins
       WHERE statut = 'approuve'
       ORDER BY nom, prenom`,
      []
    );

    const medecins = result.rows.map(m => ({
      ...m,
      userType: 'medecin',
      photoBase64: m.photo_base64 || null
    }));

    res.json(medecins);

  } catch (error) {
    console.error('❌ Erreur récupération médecins:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// RÉCUPÉRER TOUS LES SECRÉTAIRES APPROUVÉS
// ========================================

router.get('/secretaires-approuves', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nom, prenom, email, telephone, sexe, pays, ville,
              poste, departement, photo_base64, date_inscription
       FROM secretaires
       WHERE statut = 'approuve'
       ORDER BY nom, prenom`,
      []
    );

    const secretaires = result.rows.map(s => ({
      ...s,
      userType: 'secretaire',
      photoBase64: s.photo_base64 || null
    }));

    res.json(secretaires);

  } catch (error) {
    console.error('❌ Erreur récupération secrétaires:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// STATISTIQUES (pour dashboard admin)
// ========================================

router.get('/stats', async (req, res) => {
  try {
    const patients = await pool.query('SELECT COUNT(*) FROM patients');
    const medecins = await pool.query('SELECT COUNT(*) FROM medecins WHERE statut = \'approuve\'');
    const secretaires = await pool.query('SELECT COUNT(*) FROM secretaires WHERE statut = \'approuve\'');
    const enAttente = await pool.query(
      `SELECT COUNT(*) FROM (
        SELECT id FROM medecins WHERE statut = 'en_attente'
        UNION ALL
        SELECT id FROM secretaires WHERE statut = 'en_attente'
      ) AS total`
    );

    res.json({
      totalPatients: parseInt(patients.rows[0].count),
      totalMedecins: parseInt(medecins.rows[0].count),
      totalSecretaires: parseInt(secretaires.rows[0].count),
      totalEnAttente: parseInt(enAttente.rows[0].count)
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;