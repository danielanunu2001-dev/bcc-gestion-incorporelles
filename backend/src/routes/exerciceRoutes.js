// backend/src/routes/exerciceRoutes.js

const express = require('express');
const router = express.Router();
const { ExerciceComptable, Actif, Contrat, Amortissement, Document, AuditLog } = require('../models');
const { Op } = require('sequelize');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorize');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

// ==================== ROUTES EXISTANTES ====================

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
        
        // Log d'audit
        await AuditLog.create({
            user_id: req.user.id,
            action: 'CREATE',
            table_name: 'exercices',
            record_id: exercice.id,
            new_data: { annee, date_debut, date_fin },
            ip_address: req.ip,
            action_date: new Date()
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
        
        const { date_cloture, date_approbation, resultat, report_a_nouveau, observations, reserves_change, operations_refinancement, rapport_politique_monetaire } = req.body;
        
        await exercice.update({
            cloture: true,
            date_cloture: date_cloture || new Date(),
            date_approbation: date_approbation || null,
            resultat: resultat || 0,
            report_a_nouveau: report_a_nouveau || 0,
            observations: observations || null,
            reserves_change: reserves_change || 0,
            operations_refinancement: operations_refinancement || 0,
            rapport_politique_monetaire: rapport_politique_monetaire || null
        });
        
        // Log d'audit
        await AuditLog.create({
            user_id: req.user.id,
            action: 'CLOTURE',
            table_name: 'exercices',
            record_id: exercice.id,
            old_data: { cloture: false },
            new_data: { cloture: true, resultat, report_a_nouveau },
            ip_address: req.ip,
            action_date: new Date()
        });
        
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
        
        const oldData = { ...exercice.toJSON() };
        await exercice.destroy();
        
        // Log d'audit
        await AuditLog.create({
            user_id: req.user.id,
            action: 'DELETE',
            table_name: 'exercices',
            record_id: req.params.id,
            old_data: oldData,
            ip_address: req.ip,
            action_date: new Date()
        });
        
        res.json({ message: 'Exercice supprimé avec succès' });
    } catch (error) {
        console.error('Erreur suppression exercice:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ==================== NOUVELLES ROUTES ====================

/**
 * Vérifier les conditions préalables à la clôture d'un exercice
 * POST /api/exercices/:id/verifier-pre-cloture
 */
router.post('/:id/verifier-pre-cloture', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const { id } = req.params;
        const exercice = await ExerciceComptable.findByPk(id);
        
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        
        const anomalies = [];
        let peutCloturer = true;
        
        // 1. Vérifier les actifs non amortis
        const actifsNonAmortis = await Actif.count({
            where: { 
                actif: true,
                duree_utile_ans: { [Op.gt]: 0 }
            }
        });
        if (actifsNonAmortis > 0) {
            anomalies.push({ message: `${actifsNonAmortis} actif(s) non entièrement amortis`, severity: 'warning' });
        }
        
        // 2. Vérifier les contrats expirés
        const contratsExpires = await Contrat.count({
            where: { 
                date_fin: { [Op.lt]: new Date() }
            }
        });
        if (contratsExpires > 0) {
            anomalies.push({ message: `${contratsExpires} contrat(s) expiré(s) non traités`, severity: 'warning' });
        }
        
        // 3. Vérifier si le résultat est renseigné
        if (!exercice.resultat && exercice.resultat !== 0) {
            anomalies.push({ message: 'Résultat de l\'exercice non renseigné', severity: 'error' });
            peutCloturer = false;
        }
        
        res.json({ 
            peutCloturer, 
            anomalies,
            resultatActuel: exercice.resultat,
            reportANouveauActuel: exercice.report_a_nouveau
        });
    } catch (error) {
        console.error('Erreur vérification pré-clôture:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Générer les états financiers d'un exercice
 * GET /api/exercices/:id/etats-financiers?format=pdf
 */
router.get('/:id/etats-financiers', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const { id } = req.params;
        const { format = 'pdf' } = req.query;
        
        const exercice = await ExerciceComptable.findByPk(id);
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        
        // Récupérer les données financières
        const actifs = await Actif.findAll();
        const amortissements = await Amortissement.findAll({ 
            where: { exercice: exercice.annee } 
        });
        
        const totalActifs = actifs.reduce((sum, a) => sum + (a.cout_acquisition || 0), 0);
        const totalAmortissements = amortissements.reduce((sum, a) => sum + (a.annuite || 0), 0);
        const valeurNette = totalActifs - totalAmortissements;
        
        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=etats_financiers_${exercice.annee}.pdf`);
            
            doc.pipe(res);
            
            doc.fontSize(18).fillColor('#1e3a8a').text('ÉTATS FINANCIERS', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).fillColor('#000').text(`Exercice ${exercice.annee}`, { align: 'center' });
            doc.text(`Banque Centrale du Congo`, { align: 'center' });
            doc.moveDown();
            doc.text(`Période: ${new Date(exercice.date_debut).toLocaleDateString('fr-FR')} - ${new Date(exercice.date_fin).toLocaleDateString('fr-FR')}`, { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(14).fillColor('#1e3a8a').text('BILAN', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#000');
            doc.text(`Total des actifs: ${totalActifs.toLocaleString()} CDF`, 50, doc.y);
            doc.text(`Total des amortissements: ${totalAmortissements.toLocaleString()} CDF`, 50, doc.y + 15);
            doc.text(`Valeur nette comptable: ${valeurNette.toLocaleString()} CDF`, 50, doc.y + 30);
            doc.moveDown(3);
            
            doc.fontSize(14).fillColor('#1e3a8a').text('COMPTE DE RÉSULTAT', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#000');
            doc.text(`Résultat de l'exercice: ${(exercice.resultat || 0).toLocaleString()} CDF`, 50, doc.y);
            doc.text(`Report à nouveau: ${(exercice.report_a_nouveau || 0).toLocaleString()} CDF`, 50, doc.y + 15);
            
            doc.end();
        } else if (format === 'xlsx') {
            const workbook = XLSX.utils.book_new();
            
            const bilanData = [
                ['LIBELLÉ', 'MONTANT (CDF)'],
                ['ACTIFS', ''],
                ['Total des actifs', totalActifs],
                ['Amortissements cumulés', totalAmortissements],
                ['Valeur nette comptable', valeurNette],
                ['', ''],
                ['RÉSULTAT', ''],
                ['Résultat de l\'exercice', exercice.resultat || 0],
                ['Report à nouveau', exercice.report_a_nouveau || 0],
                ['Réserves de change', exercice.reserves_change || 0],
                ['Opérations refinancement', exercice.operations_refinancement || 0]
            ];
            
            const wsBilan = XLSX.utils.aoa_to_sheet(bilanData);
            wsBilan['!cols'] = [{ wch: 40 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(workbook, wsBilan, 'États Financiers');
            
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=etats_financiers_${exercice.annee}.xlsx`);
            return res.send(excelBuffer);
        }
        
    } catch (error) {
        console.error('Erreur génération états financiers:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Générer le rapport annuel PDF
 * POST /api/exercices/:annee/generer-rapport
 */
router.post('/:annee/generer-rapport', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const { annee } = req.params;
        const exercice = await ExerciceComptable.findOne({ where: { annee } });
        
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        
        const uploadDir = path.join(process.cwd(), 'uploads/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Rapport_Annuel_BCC_${annee}.pdf`);
        
        doc.pipe(res);
        
        doc.fontSize(22).fillColor('#1e3a8a').text('RAPPORT ANNUEL', { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).fillColor('#000').text(`Exercice ${annee}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Banque Centrale du Congo`, { align: 'center' });
        doc.text(`Direction des Immobilisations`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).fillColor('#666').text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(14).fillColor('#1e3a8a').text('1. SYNTHÈSE DE L\'EXERCICE', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        doc.text(`Période: ${new Date(exercice.date_debut).toLocaleDateString('fr-FR')} - ${new Date(exercice.date_fin).toLocaleDateString('fr-FR')}`);
        doc.text(`Statut: ${exercice.cloture ? 'Clôturé' : 'En cours'}`);
        doc.text(`Résultat: ${(exercice.resultat || 0).toLocaleString()} CDF`);
        doc.text(`Report à nouveau: ${(exercice.report_a_nouveau || 0).toLocaleString()} CDF`);
        
        if (exercice.reserves_change) {
            doc.text(`Réserves de change: ${exercice.reserves_change.toLocaleString()} CDF`);
        }
        if (exercice.operations_refinancement) {
            doc.text(`Opérations de refinancement: ${exercice.operations_refinancement.toLocaleString()} CDF`);
        }
        
        if (exercice.observations) {
            doc.moveDown();
            doc.fontSize(14).fillColor('#1e3a8a').text('2. OBSERVATIONS', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#000');
            const splitObs = doc.splitTextToSize(exercice.observations, 450);
            doc.text(splitObs);
        }
        
        doc.end();
        
        // Sauvegarder le document dans la base de données
        const filePath = path.join(uploadDir, `Rapport_Annuel_BCC_${annee}.pdf`);
        
        // Attendre que le PDF soit généré
        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
        
        // Vérifier si le fichier a été créé
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            await Document.create({
                nom_fichier: `Rapport_Annuel_BCC_${annee}.pdf`,
                chemin_fichier: `uploads/documents/Rapport_Annuel_BCC_${annee}.pdf`,
                type_fichier: 'application/pdf',
                taille_fichier: stats.size,
                description: `Rapport annuel BCC ${annee}`,
                date_upload: new Date(),
                created_by: req.user.id
            }).catch(err => console.error('Erreur sauvegarde document:', err));
        }
        
    } catch (error) {
        console.error('Erreur génération rapport:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Générer les états financiers après clôture
 * POST /api/exercices/:id/generer-etats-financiers
 */
router.post('/:id/generer-etats-financiers', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const { id } = req.params;
        const exercice = await ExerciceComptable.findByPk(id);
        
        if (!exercice) {
            return res.status(404).json({ message: 'Exercice non trouvé' });
        }
        
        const filename = `Etats_Financiers_${exercice.annee}.pdf`;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        
        const uploadDir = path.join(process.cwd(), 'uploads/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filePath = path.join(uploadDir, filename);
        const writeStream = fs.createWriteStream(filePath);
        
        doc.pipe(writeStream);
        
        doc.fontSize(20).fillColor('#1e3a8a').text('ÉTATS FINANCIERS', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).fillColor('#000').text(`Exercice ${exercice.annee}`, { align: 'center' });
        doc.text(`Banque Centrale du Congo`, { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(12).fillColor('#1e3a8a').text('CERTIFICATION', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#000');
        doc.text(`Je soussigné, certifie que les présents états financiers sont conformes aux registres comptables de la Banque Centrale du Congo pour l'exercice clos le ${new Date(exercice.date_fin).toLocaleDateString('fr-FR')}.`);
        doc.moveDown();
        doc.text(`Fait à Kinshasa, le ${new Date().toLocaleDateString('fr-FR')}`);
        doc.text(`Le Directeur Général`);
        
        doc.end();
        
        await new Promise((resolve) => {
            writeStream.on('finish', resolve);
        });
        
        const stats = fs.statSync(filePath);
        await Document.create({
            nom_fichier: filename,
            type_fichier: 'application/pdf',
            taille_fichier: stats.size,
            description: `États financiers certifiés BCC ${exercice.annee}`,
            date_upload: new Date(),
            created_by: req.user.id
        });
        
        res.json({ 
            success: true, 
            message: `États financiers de l'exercice ${exercice.annee} générés avec succès`,
            filename 
        });
        
    } catch (error) {
        console.error('Erreur génération états financiers:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Récupérer les rapports financiers
 * GET /api/rapports/financiers
 */
router.get('/rapports/financiers', authMiddleware, authorize('admin', 'comptable'), async (req, res) => {
    try {
        const rapports = await Document.findAll({
            where: { 
                description: { [Op.or]: [
                    { [Op.like]: '%Rapport annuel%' },
                    { [Op.like]: '%États financiers%' }
                ]}
            },
            order: [['date_upload', 'DESC']]
        });
        res.json(rapports);
    } catch (error) {
        console.error('Erreur récupération rapports:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;