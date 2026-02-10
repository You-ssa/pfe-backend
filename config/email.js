// backend/config/email.js - VERSION CORRIGÉE FINALE
const nodemailer = require('nodemailer');

// Variable globale pour le transporteur
let transporter;

/**
 * Créer un transporteur email
 */
async function createTransporter() {
  // OPTION 1 : Si USE_ETHEREAL est activé (test automatique)
  if (process.env.USE_ETHEREAL === 'true') {
    console.log('📧 Utilisation de Ethereal Email (compte de test automatique)...');
    
    // Créer un compte de test Ethereal automatiquement
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    console.log('✅ Ethereal Email configuré');
    console.log('📬 Les emails de test seront visibles dans la console');
    console.log('👤 User:', testAccount.user);
    console.log('🔑 Pass:', testAccount.pass);
    
  } 
  // OPTION 2 : Utiliser la configuration normale (Gmail, Mailtrap, etc.)
  else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    console.log('✅ Email configuré avec', process.env.EMAIL_HOST);
    console.log('📧 Email expéditeur:', process.env.EMAIL_USER);
  } 
  // OPTION 3 : Aucune configuration trouvée, on utilise Ethereal par défaut
  else {
    console.warn('⚠️ Aucune configuration email trouvée dans .env');
    console.log('📧 Utilisation de Ethereal Email par défaut...');
    
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    console.log('✅ Ethereal Email configuré (par défaut)');
  }
  
  return transporter;
}

/**
 * Envoyer un code de vérification
 */
const sendVerificationCode = async (email, code, userType) => {
  // S'assurer que le transporteur est créé
  if (!transporter) {
    await createTransporter();
  }

  const userTypeLabels = {
    patient: 'Patient',
    medecin: 'Médecin',
    secretaire: 'Secrétaire'
  };

  const fromEmail = process.env.EMAIL_FROM || 
                    `"Télémédecine" <${process.env.EMAIL_USER || 'noreply@telemedecine.com'}>`;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: '🔐 Code de vérification - Télémédecine',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { 
            background: #f9f9f9; 
            padding: 30px; 
            border-radius: 0 0 10px 10px; 
          }
          .code-box { 
            background: white; 
            border: 2px dashed #667eea; 
            padding: 20px; 
            text-align: center; 
            margin: 20px 0; 
            border-radius: 8px; 
          }
          .code { 
            font-size: 32px; 
            font-weight: bold; 
            color: #667eea; 
            letter-spacing: 8px; 
          }
          .warning { 
            color: #e74c3c; 
            font-size: 14px; 
            margin-top: 20px; 
          }
          .footer { 
            text-align: center; 
            color: #777; 
            font-size: 12px; 
            margin-top: 20px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Télémédecine</h1>
            <p>Vérification de votre email</p>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Vous avez demandé à créer un compte <strong>${userTypeLabels[userType]}</strong> sur notre plateforme.</p>
            <p>Voici votre code de vérification :</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <p>Saisissez ce code dans le formulaire d'inscription pour finaliser votre compte.</p>
            
            <p class="warning">⚠️ Ce code expire dans <strong>15 minutes</strong>.</p>
            
            <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Télémédecine - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Code de vérification envoyé à ${email}`);
    console.log(`📨 Code envoyé: ${code}`); // Pour debug en développement
    
    // Si on utilise Ethereal, afficher l'URL pour voir l'email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📧 Voir l\'email ici:', previewUrl);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
};

/**
 * Envoyer un lien de réinitialisation de mot de passe
 */
const sendPasswordResetEmail = async (email, resetToken, userType) => {
  // S'assurer que le transporteur est créé
  if (!transporter) {
    await createTransporter();
  }

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;

  const userTypeLabels = {
    patient: 'Patient',
    medecin: 'Médecin',
    secretaire: 'Secrétaire',
    admin: 'Administrateur'
  };

  const fromEmail = process.env.EMAIL_FROM || 
                    `"Télémédecine" <${process.env.EMAIL_USER || 'noreply@telemedecine.com'}>`;

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject: '🔑 Réinitialisation de votre mot de passe - Télémédecine',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { 
            background: #f9f9f9; 
            padding: 30px; 
            border-radius: 0 0 10px 10px; 
          }
          .button { 
            display: inline-block; 
            background: #667eea; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-weight: bold; 
          }
          .link-box { 
            background: white; 
            border: 1px solid #ddd; 
            padding: 15px; 
            margin: 20px 0; 
            border-radius: 5px; 
            word-break: break-all; 
          }
          .warning { 
            color: #e74c3c; 
            font-size: 14px; 
            margin-top: 20px; 
          }
          .footer { 
            text-align: center; 
            color: #777; 
            font-size: 12px; 
            margin-top: 20px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Télémédecine</h1>
            <p>Réinitialisation de mot de passe</p>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte <strong>${userTypeLabels[userType]}</strong>.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
            <div class="link-box">${resetLink}</div>
            
            <p class="warning">⚠️ Ce lien expire dans <strong>1 heure</strong>.</p>
            
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Télémédecine - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de réinitialisation envoyé à ${email}`);
    
    // Si on utilise Ethereal, afficher l'URL pour voir l'email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('📧 Voir l\'email ici:', previewUrl);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
};

// Initialiser le transporteur au démarrage du serveur
createTransporter().catch(err => {
  console.error('❌ Erreur initialisation email:', err);
  console.warn('⚠️ Le serveur continuera sans email. Vérifiez votre configuration .env');
});

module.exports = {
  sendVerificationCode,
  sendPasswordResetEmail
};