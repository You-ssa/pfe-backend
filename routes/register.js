// backend/routes/register.js
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const upload = require('../middleware/upload');

const router = express.Router();

// ========================================
// INSCRIPTION PATIENT
// ========================================
router.post('/register/patient', upload.single('photo'), async (req, res) => {
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
      dateInscription
    } = req.body;

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    // Vérifier email existant
    const exists = await pool.query(
      'SELECT id FROM patients WHERE email = $1 LIMIT 1',
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const photo = req.file ? req.file.buffer.toString('base64') : null;

    const query = `
      INSERT INTO patients
      (nom, prenom, sexe, email, pays, ville, telephone, mot_de_passe, photo_base64, date_inscription)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, nom, prenom, email, telephone, sexe, pays, ville, date_inscription, photo_base64
    `;
    
    const values = [
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

    const result = await pool.query(query, values);

    const user = {
      ...result.rows[0],
      userType: 'patient',
      photoBase64: result.rows[0].photo_base64 || null
    };
    delete user.photo_base64;

    return res.status(201).json({ 
      user,
      message: 'Compte créé avec succès'
    });

  } catch (err) {
    console.error('❌ Patient register error:', err);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});
// ========================================
// INSCRIPTION MEDECIN
// ========================================
router.post('/register/medecin', upload.single('photo'), async (req, res) => {
  try {
    const {
      nom,
      prenom,
      sexe,
      email,
      telephone,
      motDePasse,
      specialite,
      rpps,
      adresseHopital,
      dateInscription
    } = req.body;

    console.log('📝 Données reçues pour médecin:', req.body);

    // Champs obligatoires (sécurité backend)
    if (!nom || !prenom || !email || !motDePasse || !telephone) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    // Vérifier email existant
    const exists = await pool.query(
      'SELECT id FROM medecins WHERE email = $1 LIMIT 1',
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const photo = req.file ? req.file.buffer.toString('base64') : null;

    const query = `
      INSERT INTO medecins
      (nom, prenom, sexe, email, telephone, mot_de_passe, specialite, rpps, adresse_hopital,
       photo_base64, statut, date_inscription)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, nom, prenom, sexe, email, telephone, specialite, rpps, adresse_hopital,
                statut, date_inscription, photo_base64
    `;

    const values = [
      nom,
      prenom,
      sexe || null,
      email,
      telephone,                 // ✅ CORRECT
      hashedPassword,
      specialite || null,
      rpps || null,
      adresseHopital || null,
      photo,
      'en_attente',
      dateInscription || new Date().toISOString()
    ];

    const result = await pool.query(query, values);

    const user = {
      ...result.rows[0],
      userType: 'medecin',
      photoBase64: result.rows[0].photo_base64 || null,
      adresseHopital: result.rows[0].adresse_hopital || null
    };

    delete user.photo_base64;
    delete user.adresse_hopital;

    console.log('✅ Médecin créé avec succès:', user.id);

    return res.status(201).json({
      user,
      message: 'Compte créé, en attente d\'approbation'
    });

  } catch (err) {
    console.error('❌ Medecin register error:', err);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});

// ========================================
// INSCRIPTION SECRETAIRE
// ========================================
router.post('/register/secretaire', upload.single('photo'), async (req, res) => {
  try {
    const {
      nom,
      prenom,
      sexe,
      email,
      telephone,
      motDePasse,
      specialite,
      adresseHopital,
      poste,
      departement,
      dateInscription
    } = req.body;

    console.log('📝 Données reçues pour secrétaire:', { nom, prenom, sexe, email, specialite, adresseHopital, poste, departement });

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    // Vérifier email existant
    const exists = await pool.query(
      'SELECT id FROM secretaires WHERE email = $1 LIMIT 1',
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const photo = req.file ? req.file.buffer.toString('base64') : null;

        const query = `
      INSERT INTO secretaires
      (nom, prenom, sexe, email, telephone, mot_de_passe, specialite, adresse_hopital,
       poste, departement, photo_base64, statut, date_inscription)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id, nom, prenom, sexe, email, telephone, specialite, adresse_hopital,
                poste, departement, statut, date_inscription, photo_base64
    `;
    
    const values = [
      nom,
      prenom,
      sexe || null,
      email,
      telephone || null,
      hashedPassword,
      specialite || null,
      adresseHopital || null,
      poste || null,
      departement || null,
      photo,
      'en_attente',
      dateInscription || new Date().toISOString()
    ];

    const result = await pool.query(query, values);

    const user = {
      ...result.rows[0],
      userType: 'secretaire',
      photoBase64: result.rows[0].photo_base64 || null,
      adresseHopital: result.rows[0].adresse_hopital || null
    };
    delete user.photo_base64;
    delete user.adresse_hopital;

    console.log('✅ Secrétaire créée avec succès:', user.id);

    return res.status(201).json({ 
      user,
      message: 'Compte créé, en attente d\'approbation'
    });

  } catch (err) {
    console.error('❌ Secretaire register error:', err);
    console.error('Stack:', err.stack);
    return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
  }
});

// ========================================
// INSCRIPTION ADMIN
// ========================================
router.post('/register/admin', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, motDePasse, dateInscription } = req.body;

    if (!nom || !prenom || !email || !motDePasse) {
      return res.status(400).json({ message: 'Champs obligatoires manquants' });
    }

    const exists = await pool.query('SELECT id FROM admins WHERE email = $1 LIMIT 1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    const result = await pool.query(
      `INSERT INTO admins (nom, prenom, email, telephone, mot_de_passe, date_inscription)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, nom, prenom, email, telephone, date_inscription`,
      [nom, prenom, email, telephone || null, hashedPassword, dateInscription || new Date().toISOString()]
    );

    return res.status(201).json({ 
      user: { ...result.rows[0], userType: 'admin' }, 
      message: 'Admin créé avec succès' 
    });

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
    if (!table) {
      return res.status(400).json({ message: 'Type utilisateur invalide' });
    }

    const result = await pool.query(
      `SELECT id FROM ${table} WHERE email = $1 LIMIT 1`, 
      [email]
    );
    
    return res.json({ exists: result.rows.length > 0 });

  } catch (err) {
    console.error('❌ Email check error:', err);
    return res.status(500).json({ message: 'Erreur vérification email' });
  }
});

module.exports = router;