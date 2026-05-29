// backend/routes/conformite.js
const express = require('express');
const router = express.Router();

// GET /api/conformite/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Données mockées pour le développement
    const dashboardData = {
      score_global: 92,
      indicateurs: [
        { nom: "Plan comptable GCEC", statut: "conforme", valeur: 100, seuil: 80 },
        { nom: "Clôture exercices", statut: "conforme", valeur: 100, seuil: 80 },
        { nom: "Piste d'audit", statut: "conforme", valeur: 95, seuil: 80 },
        { nom: "Taux de change", statut: "conforme", valeur: 100, seuil: 80 },
        { nom: "Sécurité BCC", statut: "attention", valeur: 65, seuil: 80 },
        { nom: "Archivage légal", statut: "critique", valeur: 45, seuil: 80 }
      ],
      alertes: [
        { niveau: "critique", message: "5 utilisateurs ont des mots de passe expirés", action: "Vérifier" },
        { niveau: "warning", message: "Session d'audit non active depuis 7 jours", action: "Activer" },
        { niveau: "info", message: "Clôture d'exercice dans 30 jours", action: "Planifier" }
      ],
      recommandations: [
        "Mettre en place la double authentification pour tous les administrateurs",
        "Archiver les logs d'audit de plus de 12 mois",
        "Planifier la clôture de l'exercice en cours"
      ]
    };
    
    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Erreur dashboard conformité:', error);
    res.status(500).json({ 
      error: 'Erreur lors du chargement du dashboard de conformité',
      message: error.message 
    });
  }
});

// GET /api/conformite/indicateurs
router.get('/indicateurs', async (req, res) => {
  try {
    const indicateurs = [
      { id: 1, nom: "Plan comptable GCEC", valeur: 100, statut: "conforme" },
      { id: 2, nom: "Clôture exercices", valeur: 100, statut: "conforme" },
      { id: 3, nom: "Piste d'audit", valeur: 95, statut: "conforme" }
    ];
    res.status(200).json(indicateurs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/conformite/alertes
router.get('/alertes', async (req, res) => {
  try {
    const alertes = [
      { id: 1, niveau: "critique", message: "5 utilisateurs ont des mots de passe expirés", date: new Date() },
      { id: 2, niveau: "warning", message: "Session d'audit non active depuis 7 jours", date: new Date() }
    ];
    res.status(200).json(alertes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;