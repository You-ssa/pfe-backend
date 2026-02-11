// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
const patientRoutes = require('./routes/patients.routes');
app.use('/api', require('./routes/login'));
app.use('/api', require('./routes/register'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/verification'));
app.use('/api', require('./routes/password-reset'));
app.use('/api/patients', patientRoutes);
app.use('/patients', patientRoutes); // alias for legacy calls

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
      verification: {
        sendCode: 'POST /api/verification/send-code',
        verifyCode: 'POST /api/verification/verify-code'
      },
      passwordReset: {
        request: 'POST /api/password-reset/request',
        verifyToken: 'GET /api/password-reset/verify-token/:token',
        reset: 'POST /api/password-reset/reset'
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
      },
      patients: {
        profil: 'GET /api/patients/:id',
        update: 'PUT /api/patients/:id',
        photo: 'PUT /api/patients/:id/photo',
        stats: 'GET /api/patients/:id/stats'
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
  console.error('Erreur serveur:', err);
  res.status(500).json({ message: 'Erreur serveur interne' });
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/`);
});
