const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Vérifier si un admin existe
router.get('/admin/exists', async (req, res) => {
  try {
    const result = await pool.query('SELECT id FROM admins LIMIT 1');
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('❌ Vérification admin error:', err);
    res.status(500).json({ message: 'Erreur vérification admin' });
  }
});

// Créer le premier admin
router.post('/register/admin', async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone } = req.body;

    // Vérifier si l’email existe déjà
    const exist = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (exist.rows.length > 0) {
      return res.status(400).json({ message: 'Admin déjà existant' });
    }

    // Insérer l’admin
    const result = await pool.query(
  `INSERT INTO admins (nom, prenom, email, motDePasse, telephone, date_inscription)
   VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
   RETURNING *`,
  [nom, prenom, email, motDePasse, telephone]
);


    res.json(result.rows[0]);

  } catch (err) {
    console.error('❌ Création admin error:', err);
    res.status(500).json({ message: 'Erreur création administrateur' });
  }
});

module.exports = router;
