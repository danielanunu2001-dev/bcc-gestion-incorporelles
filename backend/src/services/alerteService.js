// backend/src/services/alerteService.js

const cron = require('node-cron');
const { Contrat, Actif } = require('../models');
const { Op } = require('sequelize');  // ✅ AJOUT OBLIGATOIRE
const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Fonction d'envoi d'email
async function sendEmail(contrat) {
  try {
    const actif = contrat.Actif;
    const dateFin = new Date(contrat.date_fin).toLocaleDateString('fr-FR');
    const joursRestants = Math.ceil((new Date(contrat.date_fin) - new Date()) / (1000 * 60 * 60 * 24));
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@bcc.cd',
      to: process.env.ALERTES_EMAIL || 'admin@bcc.cd',
      subject: `🔔 Alerte : Contrat arrivant à échéance - ${actif?.code || 'N/A'}`,
      html: `
        <h2>⚠️ Alerte Échéance Contrat</h2>
        <p><strong>Contrat n°:</strong> ${contrat.numero_contrat}</p>
        <p><strong>Actif concerné:</strong> ${actif?.nom || 'Non spécifié'} (${actif?.code || 'N/A'})</p>
        <p><strong>Fournisseur:</strong> ${contrat.fournisseur}</p>
        <p><strong>Date de fin:</strong> ${dateFin}</p>
        <p><strong>Jours restants:</strong> ${joursRestants} jours</p>
        <p><strong>Montant:</strong> ${contrat.montant?.toLocaleString()} FC</p>
        <hr>
        <p>Merci de prendre les dispositions nécessaires pour le renouvellement.</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email envoyé pour contrat ${contrat.numero_contrat}`);
  } catch (error) {
    console.error(`❌ Erreur envoi email pour contrat ${contrat.numero_contrat}:`, error.message);
  }
}

// Tous les jours à 8h
const alerteTask = cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Exécution du service d\'alertes -', new Date().toLocaleString('fr-FR'));
  
  try {
    const now = new Date();
    const dans30Jours = new Date(now);
    dans30Jours.setDate(now.getDate() + 30);
    
    const contrats = await Contrat.findAll({
      where: { 
        date_fin: { [Op.lte]: dans30Jours } 
      },
      include: [{ model: Actif, as: 'Actif' }]
    });
    
    console.log(`📋 ${contrats.length} contrat(s) arrivant à échéance dans les 30 jours`);
    
    for (const contrat of contrats) {
      // Vérifier si une alerte a déjà été envoyée pour cette échéance
      const alerteDejaEnvoyee = contrat.alertes_envoyees?.includes(contrat.date_fin);
      if (!alerteDejaEnvoyee) {
        await sendEmail(contrat);
        contrat.alertes_envoyees = [...(contrat.alertes_envoyees || []), contrat.date_fin];
        await contrat.save();
        console.log(`📧 Alerte envoyée pour contrat ${contrat.numero_contrat}`);
      } else {
        console.log(`⏩ Alerte déjà envoyée pour contrat ${contrat.numero_contrat}`);
      }
    }
    
    console.log('✅ Service d\'alertes terminé');
  } catch (error) {
    console.error('❌ Erreur dans le service d\'alertes:', error.message);
  }
}, {
  scheduled: false  // Ne pas démarrer automatiquement
});

// Export pour pouvoir démarrer/arrêter le cron programmatiquement
module.exports = {
  startAlerteService: () => {
    alerteTask.start();
    console.log('🚀 Service d\'alertes démarré (tous les jours à 8h)');
  },
  stopAlerteService: () => {
    alerteTask.stop();
    console.log('🛑 Service d\'alertes arrêté');
  }
};