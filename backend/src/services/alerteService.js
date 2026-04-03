// services/alerteService.js
const cron = require('node-cron');
const { Contrat, Actif } = require('../models');
const nodemailer = require('nodemailer');

// Tous les jours à 8h
cron.schedule('0 8 * * *', async () => {
  const now = new Date();
  const dans30Jours = new Date(now.setDate(now.getDate() + 30));
  const contrats = await Contrat.findAll({
    where: { date_fin: { [Op.lte]: dans30Jours } },
    include: [Actif]
  });
  for (const contrat of contrats) {
    // Vérifier si une alerte a déjà été envoyée pour cette échéance
    const alerteDejaEnvoyee = contrat.alertes_envoyees?.includes(contrat.date_fin);
    if (!alerteDejaEnvoyee) {
      // Envoyer email
      await sendEmail(contrat);
      // Mettre à jour le champ alertes_envoyees
      contrat.alertes_envoyees = [...(contrat.alertes_envoyees || []), contrat.date_fin];
      await contrat.save();
    }
  }
});