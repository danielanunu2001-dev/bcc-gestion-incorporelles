// backend/src/routes/exerciceRoutes.js
const express = require('express');
const router = express.Router();
const { ExerciceComptable } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');

// Récupérer tous les exercices
router.get('/', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const exercices = await ExerciceComptable.findAll({
            order: [['annee', 'DESC']]
        });
        res.json(exercices);
    } catch (error) {
        console.error('Erreur récupération exercices:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Récupérer un exercice par ID
router.get('/:id', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const exercice = await ExerciceComptable.findByPk(req.params.id);
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        res.json(exercice);
    } catch (error) {
        console.error('Erreur récupération exercice:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Créer un nouvel exercice
router.post('/', authMiddleware, authorize('admin'), async (req, res) => {
    try {
        const { annee, date_debut, date_fin } = req.body;
        
        const existing = await ExerciceComptable.findOne({ where: { annee } });
        if (existing) {
            return res.status(400).json({ message: `L'exercice ${annee} existe déjà` });
        }
        
        const exercice = await ExerciceComptable.create({
            annee,
            date_debut,
            date_fin,
            cloture: false
        });
        
        res.status(201).json(exercice);
    } catch (error) {
        console.error('Erreur création exercice:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Clôturer un exercice
router.put('/:id/cloture', authMiddleware, authorize('admin'), async (req, res) => {
    try {
        const exercice = await ExerciceComptable.findByPk(req.params.id);
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        
        if (exercice.cloture) {
            return res.status(400).json({ message: 'Exercice déjà clôturé' });
        }
        
        await exercice.update({ cloture: true });
        res.json(exercice);
    } catch (error) {
        console.error('Erreur clôture exercice:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Supprimer un exercice
router.delete('/:id', authMiddleware, authorize('admin'), async (req, res) => {
    try {
        const exercice = await ExerciceComptable.findByPk(req.params.id);
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        
        if (exercice.cloture) {
            return res.status(400).json({ message: 'Impossible de supprimer un exercice clôturé' });
        }
        
        await exercice.destroy();
        res.json({ message: 'Exercice supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression exercice:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router;