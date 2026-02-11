// =====================================================
// DOSSIER MEDICAL ROUTES - backend/routes/dossier-medical.routes.js
// =====================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// ============== DOSSIER MÉDICAL ==============

// GET dossier médical
router.get('/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM dossiers_medicaux WHERE patient_id = $1',
      [patientId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dossier médical non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// CREATE dossier médical
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patient_id,
      date_naissance,
      groupe_sanguin,
      maladies_chroniques,
      maladies_hereditaires,
      allergies,
      medicaments_en_cours,
      chirurgies_anterieures,
      hospitalisations_passees,
      vaccinations,
      observations_medicales,
      don_organes,
      directives_anticipees
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO dossiers_medicaux (
        patient_id, date_naissance, groupe_sanguin, maladies_chroniques,
        maladies_hereditaires, allergies, medicaments_en_cours,
        chirurgies_anterieures, hospitalisations_passees, vaccinations,
        observations_medicales, don_organes, directives_anticipees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        patient_id, date_naissance, groupe_sanguin, maladies_chroniques,
        maladies_hereditaires, allergies, medicaments_en_cours,
        JSON.stringify(chirurgies_anterieures || []),
        JSON.stringify(hospitalisations_passees || []),
        JSON.stringify(vaccinations || []),
        observations_medicales, don_organes, directives_anticipees
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

// UPDATE dossier médical
router.put('/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      date_naissance,
      groupe_sanguin,
      maladies_chroniques,
      maladies_hereditaires,
      allergies,
      medicaments_en_cours,
      chirurgies_anterieures,
      hospitalisations_passees,
      vaccinations,
      observations_medicales,
      don_organes,
      directives_anticipees
    } = req.body;
    
    const result = await pool.query(
      `UPDATE dossiers_medicaux SET
        date_naissance = $1,
        groupe_sanguin = $2,
        maladies_chroniques = $3,
        maladies_hereditaires = $4,
        allergies = $5,
        medicaments_en_cours = $6,
        chirurgies_anterieures = $7,
        hospitalisations_passees = $8,
        vaccinations = $9,
        observations_medicales = $10,
        don_organes = $11,
        directives_anticipees = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE patient_id = $13
      RETURNING *`,
      [
        date_naissance, groupe_sanguin, maladies_chroniques,
        maladies_hereditaires, allergies, medicaments_en_cours,
        JSON.stringify(chirurgies_anterieures || []),
        JSON.stringify(hospitalisations_passees || []),
        JSON.stringify(vaccinations || []),
        observations_medicales, don_organes, directives_anticipees,
        patientId
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Dossier non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
});

// ============== CONTACTS D'URGENCE ==============

// GET contacts d'urgence
router.get('/contacts/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM contacts_urgence WHERE patient_id = $1 ORDER BY ordre',
      [patientId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// CREATE contact d'urgence
router.post('/contacts', authenticateToken, async (req, res) => {
  try {
    const { patient_id, nom, lien, telephone, ordre } = req.body;
    
    const result = await pool.query(
      `INSERT INTO contacts_urgence (patient_id, nom, lien, telephone, ordre)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patient_id, nom, lien, telephone, ordre || 1]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

// UPDATE contact d'urgence
router.put('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, lien, telephone, ordre } = req.body;
    
    const result = await pool.query(
      `UPDATE contacts_urgence 
       SET nom = $1, lien = $2, telephone = $3, ordre = $4
       WHERE id = $5
       RETURNING *`,
      [nom, lien, telephone, ordre, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contact non trouvé' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
});

// DELETE contact d'urgence
router.delete('/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM contacts_urgence WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contact non trouvé' });
    }
    
    res.json({ message: 'Contact supprimé' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

module.exports = router;