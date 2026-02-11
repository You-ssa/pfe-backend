// =====================================================
// BACKEND ROUTES - backend/routes/patients.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ============== PROFIL PATIENT ==============

// GET patient profile
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      'SELECT id, nom, prenom, sexe, email, pays, ville, telephone, photo_base64, date_inscription FROM patients WHERE id = $1',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// UPDATE patient profile
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, prenom, sexe, email, pays, ville, telephone, photo_base64 } = req.body;

    const { rows } = await pool.query(
      `UPDATE patients 
       SET nom = $1, prenom = $2, sexe = $3, email = $4, pays = $5, ville = $6, telephone = $7, photo_base64 = $8
       WHERE id = $9
       RETURNING id, nom, prenom, sexe, email, pays, ville, telephone, photo_base64, date_inscription`,
      [nom, prenom, sexe, email, pays, ville, telephone, photo_base64, id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
});

// UPDATE patient photo
router.put('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    const rawPhoto = req.body.photo_base64 || req.body.photo;

    if (!rawPhoto) {
      return res.status(400).json({ message: 'photo_base64 manquant' });
    }

    // Strip data URL prefix if present
    const photo_base64 = rawPhoto.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const { rowCount } = await pool.query(
      'UPDATE patients SET photo_base64 = $1 WHERE id = $2',
      [photo_base64, id]
    );

    if (!rowCount) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mise à jour photo patient:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la photo' });
  }
});

// GET dashboard stats
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const rdvResult = await pool.query(
      `SELECT COUNT(*) as count FROM rendez_vous 
       WHERE patient_id = $1 AND date_rdv >= NOW() AND statut != 'annule'`,
      [id]
    );

    const consultResult = await pool.query(
      'SELECT COUNT(*) as count FROM consultations WHERE patient_id = $1',
      [id]
    );

    const docResult = await pool.query(
      'SELECT COUNT(*) as count FROM documents_medicaux WHERE patient_id = $1',
      [id]
    );

    const notifResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE destinataire_id = $1 AND lue = false',
      [id]
    );

    res.json({
      prochains_rdv: parseInt(rdvResult.rows[0].count, 10),
      consultations_totales: parseInt(consultResult.rows[0].count, 10),
      documents_medicaux: parseInt(docResult.rows[0].count, 10),
      notifications_non_lues: parseInt(notifResult.rows[0].count, 10)
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
