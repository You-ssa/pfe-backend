// =====================================================
// RENDEZ-VOUS & NOTIFICATIONS ROUTES
// backend/routes/rendez-vous.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============== RENDEZ-VOUS ==============

// GET rendez-vous for a patient
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      `SELECT r.*, 
              m.nom as medecin_nom, 
              m.prenom as medecin_prenom, 
              m.specialite as medecin_specialite,
              m.photo_base64 as medecin_photo
       FROM rendez_vous r
       LEFT JOIN medecins m ON r.medecin_id = m.id
       WHERE r.patient_id = $1
       ORDER BY r.date_rdv DESC`,
      [patientId]
    );
    
    const rdvs = result.rows.map(row => ({
      ...row,
      medecin: {
        id: row.medecin_id,
        nom: row.medecin_nom,
        prenom: row.medecin_prenom,
        specialite: row.medecin_specialite,
        photo_base64: row.medecin_photo
      }
    }));
    
    res.json(rdvs);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// CREATE rendez-vous
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patient_id,
      medecin_id,
      date_rdv,
      duree_minutes,
      type_consultation,
      motif
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO rendez_vous (
        patient_id, medecin_id, date_rdv, duree_minutes, 
        type_consultation, motif, statut
      ) VALUES ($1, $2, $3, $4, $5, $6, 'planifie')
      RETURNING *`,
      [patient_id, medecin_id, date_rdv, duree_minutes || 30, type_consultation, motif]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

// UPDATE rendez-vous
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date_rdv, duree_minutes, motif, statut } = req.body;
    
    const result = await pool.query(
      `UPDATE rendez_vous 
       SET date_rdv = COALESCE($1, date_rdv),
           duree_minutes = COALESCE($2, duree_minutes),
           motif = COALESCE($3, motif),
           statut = COALESCE($4, statut),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [date_rdv, duree_minutes, motif, statut, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
});

// CANCEL rendez-vous
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE rendez_vous 
       SET statut = 'annule', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de l\'annulation' });
  }
});

// ============== CONSULTATIONS ==============

// GET consultations for a patient
router.get('/consultations/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      `SELECT c.*,
              m.nom as medecin_nom,
              m.prenom as medecin_prenom,
              m.specialite as medecin_specialite
       FROM consultations c
       LEFT JOIN medecins m ON c.medecin_id = m.id
       WHERE c.patient_id = $1
       ORDER BY c.date_consultation DESC`,
      [patientId]
    );
    
    const consultations = result.rows.map(row => ({
      ...row,
      medecin: {
        id: row.medecin_id,
        nom: row.medecin_nom,
        prenom: row.medecin_prenom,
        specialite: row.medecin_specialite
      }
    }));
    
    res.json(consultations);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET consultation by ID
router.get('/consultations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM consultations WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Consultation non trouvée' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ============== NOTIFICATIONS ==============

// GET notifications for a patient
router.get('/notifications/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE destinataire_id = $1 AND type_destinataire = 'patient'
       ORDER BY created_at DESC
       LIMIT 50`,
      [patientId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// MARK notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE notifications SET lue = true WHERE id = $1',
      [id]
    );
    
    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// MARK all notifications as read
router.put('/notifications/:patientId/read-all', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    await pool.query(
      `UPDATE notifications 
       SET lue = true 
       WHERE destinataire_id = $1 AND type_destinataire = 'patient'`,
      [patientId]
    );
    
    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;