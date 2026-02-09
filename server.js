// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', require('./routes/login'));
app.use('/api', require('./routes/register'));
app.use('/api', require('./routes/admin'));

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend Telemedecine OK',
    endpoints: {
      login: 'POST /api/login',
      register: {
        patient: 'POST /api/register/patient',
        medecin: 'POST /api/register/medecin',
        secretaire: 'POST /api/register/secretaire',
        admin: 'POST /api/register/admin'
      },
      admin: {
        stats: 'GET /api/stats',
        enAttente: 'GET /api/utilisateurs-en-attente/:userType',
        approuver: 'PUT /api/approuver/:userType/:userId',
        refuser: 'DELETE /api/refuser/:userType/:userId',
        medecins: 'GET /api/medecins-approuves',
        secretaires: 'GET /api/secretaires-approuves'
      },
      utils: {
        emailExists: 'GET /api/email-exists/:userType/:email'
      }
    }
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/`);
});