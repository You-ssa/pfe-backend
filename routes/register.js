// backend/routes/register.js
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const upload = require('../middleware/upload');

const router = express.Router();

// Fonction générique pour créer un utilisateur selon le type
async function register(req, res, table, statut, userType) {
  try {
    const {
      nom,
      prenom,
      sexe,
      email,
      pays,
      ville,
      telephone,
      motDePasse,
      specialite,
      rpps,
      adresseHopital,
      poste,
      departement,
      dateInscription
    } = req.body;

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const exists = await pool.query(
      `SELECT id FROM ${table} WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const photo = req.file ? req.file.buffer.toString('base64') : null;

    let query, values;

    if (userType === 'patient') {
      // Patients : pas de statut, pas de specialite, rpps, poste, departement
      query = `
        INSERT INTO ${table}
        (nom, prenom, sexe, email, pays, ville, telephone, mot_de_passe, photo_base64, date_inscription)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id, nom, prenom, email, telephone, sexe, pays, ville, date_inscription, photo_base64
      `;
      values = [
        nom,
        prenom,
        sexe || null,
        email,
        pays || null,
        ville || null,
        telephone || null,
        hashedPassword,
        photo,
        dateInscription || new Date().toISOString()
      ];
    } else if (userType === 'medecin' || userType === 'secretaire') {
      // Medecin et secretaire : toutes les colonnes
      query = `
        INSERT INTO ${table}
        (nom, prenom, sexe, email, pays, ville, telephone, mot_de_passe,
         specialite, rpps, adresse_hopital, poste, departement,
         photo_base64, statut, date_inscription)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING id, nom, prenom, email, telephone, sexe, pays, ville, specialite, rpps,
                  adresse_hopital, poste, departement, statut, date_inscription, photo_base64
      `;
      values = [
        nom,
        prenom,
        sexe || null,
        email,
        pays || null,
        ville || null,
        telephone || null,
        hashedPassword,
        specialite || null,
        rpps || null,
        adresseHopital || null,
        poste || null,
        departement || null,
        photo,
        statut,
        dateInscription || new Date().toISOString()
      ];
    } else {
      return res.status(400).json({ message: 'Type d\'utilisateur inconnu' });
    }

    const result = await pool.query(query, values);

    // Formater la réponse pour Angular
    const user = {
      ...result.rows[0],
      userType,
      photoBase64: result.rows[0].photo_base64 || null
    };
    delete user.photo_base64;

    return res.status(201).json({ 
      user,
      message: userType === 'patient' 
        ? 'Compte créé avec succès' 
        : 'Compte créé, en attente d\'approbation'
    });

  } catch (err) {
    console.error('❌ Register error:', err);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
}

// ========================================
// ROUTES D'INSCRIPTION
// ========================================
router.post('/register/patient', upload.single('photo'), (req, res) => register(req, res, 'patients', null, 'patient'));
router.post('/register/medecin', upload.single('photo'), (req, res) => register(req, res, 'medecins', 'en_attente', 'medecin'));
router.post('/register/secretaire', upload.single('photo'), (req, res) => register(req, res, 'secretaires', 'en_attente', 'secretaire'));

// Admin (sans photo)
router.post('/register/admin', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, motDePasse, dateInscription } = req.body;

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const exists = await pool.query('SELECT id FROM admins WHERE email = $1 LIMIT 1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ message: 'Cet email est déjà utilisé' });

    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    const result = await pool.query(
      `INSERT INTO admins (nom, prenom, email, telephone, mot_de_passe, date_inscription)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nom, prenom, email, telephone, date_inscription`,
      [nom, prenom, email, telephone || null, hashedPassword, dateInscription || new Date().toISOString()]
    );

    return res.status(201).json({ user: { ...result.rows[0], userType: 'admin' }, message: 'Admin créé avec succès' });

  } catch (err) {
    console.error('❌ Admin register error:', err);
    return res.status(500).json({ message: 'Erreur création admin' });
  }
});

// ========================================
// VÉRIFICATION EMAIL
// ========================================
router.get('/email-exists/:userType/:email', async (req, res) => {
  try {
    const { userType, email } = req.params;

    const tables = {
      patient: 'patients',
      medecin: 'medecins',
      secretaire: 'secretaires',
      admin: 'admins'
    };
    const table = tables[userType];
    if (!table) return res.status(400).json({ message: 'Type utilisateur invalide' });

    const result = await pool.query(`SELECT id FROM ${table} WHERE email = $1 LIMIT 1`, [email]);
    return res.json({ exists: result.rows.length > 0 });

  } catch (err) {
    console.error('❌ Email check error:', err);
    return res.status(500).json({ message: 'Erreur vérification email' });
  }
});

module.exports = router;
