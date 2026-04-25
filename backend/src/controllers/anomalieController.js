const { Anomalie, Actif, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');

/**
 * Vérifier si une chaîne est un UUID
 */
const isUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Récupérer toutes les anomalies (version simplifiée sans includes complexes)
 */
exports.getAllAnomalies = async (req, res) => {
  try {
    const { page = 1, limit = 20, statut, type } = req.query;
    const where = {};

    if (statut) where.statut = statut;
    if (type) where.type_anomalie = type;

    console.log('🔍 getAllAnomalies - Filtres:', { page, limit, statut, type });

    const { count, rows } = await Anomalie.findAndCountAll({
      where,
      order: [['date_constat', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const enrichedRows = await Promise.all(rows.map(async (anomalie) => {
      const data = anomalie.toJSON();
      
      if (data.actif_id) {
        const actif = await Actif.findByPk(data.actif_id, {
          attributes: ['id', 'code', 'nom']
        });
        data.actif = actif;
      }
      
      if (data.created_by) {
        const createur = await User.findByPk(data.created_by, {
          attributes: ['id', 'full_name']
        });
        data.createur = createur;
      }
      
      if (data.resolu_par) {
        const resoluPar = await User.findByPk(data.resolu_par, {
          attributes: ['id', 'full_name']
        });
        data.resoluPar = resoluPar;
      }
      
      return data;
    }));

    console.log(`✅ ${enrichedRows.length} anomalies trouvées`);
    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), anomalies: enrichedRows });
  } catch (error) {
    console.error('❌ Erreur getAllAnomalies:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Récupérer les statistiques des anomalies
 */
exports.getStats = async (req, res) => {
  try {
    console.log('📊 getStats anomalies appelé');
    
    const total = await Anomalie.count();
    
    const parStatut = await Anomalie.findAll({
      attributes: ['statut', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['statut']
    });

    const parType = await Anomalie.findAll({
      attributes: ['type_anomalie', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['type_anomalie']
    });

    const recentes = await Anomalie.findAll({
      limit: 5,
      order: [['date_constat', 'DESC']],
      include: [{ model: Actif, as: 'actif', attributes: ['id', 'code', 'nom'] }]
    });

    const nonResolues = await Anomalie.count({
      where: {
        statut: { [Op.in]: ['signale', 'en_cours'] }
      }
    });

    const resolues = await Anomalie.count({
      where: { statut: 'resolu' }
    });

    const result = {
      total,
      nonResolues,
      resolues,
      parStatut: parStatut.map(s => ({ statut: s.statut, count: parseInt(s.dataValues.count) })),
      parType: parType.map(t => ({ type: t.type_anomalie, count: parseInt(t.dataValues.count) })),
      recentes
    };

    console.log('✅ Stats anomalies:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur getStats:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Récupérer une anomalie par ID (accepte UUID et ID numérique)
 */
exports.getAnomalieById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let anomalie;
    
    if (isUUID(id)) {
      anomalie = await Anomalie.findByPk(id);
    } else {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        return res.status(400).json({ message: 'ID invalide' });
      }
      anomalie = await Anomalie.findByPk(numericId);
    }

    if (!anomalie) {
      return res.status(404).json({ message: 'Anomalie non trouvée' });
    }

    const data = anomalie.toJSON();
    
    if (data.actif_id) {
      const actif = await Actif.findByPk(data.actif_id, {
        attributes: ['id', 'code', 'nom']
      });
      data.actif = actif;
    }
    
    if (data.created_by) {
      const createur = await User.findByPk(data.created_by, {
        attributes: ['id', 'full_name']
      });
      data.createur = createur;
    }
    
    if (data.resolu_par) {
      const resoluPar = await User.findByPk(data.resolu_par, {
        attributes: ['id', 'full_name']
      });
      data.resoluPar = resoluPar;
    }

    res.json(data);
  } catch (error) {
    console.error('❌ Erreur getAnomalieById:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Créer une nouvelle anomalie - VERSION SIMPLIFIÉE SANS RÉCUPÉRATION DES RELATIONS
 */
exports.createAnomalie = async (req, res) => {
  let transaction;
  try {
    console.log('📝 createAnomalie - Body reçu:', JSON.stringify(req.body, null, 2));
    
    const { 
      actif_id, 
      type_anomalie, 
      description, 
      date_constat, 
      localisation_constatee,
      photo,
      priorite
    } = req.body;

    // Validation rigoureuse
    if (!actif_id) {
      console.error('❌ actif_id manquant');
      return res.status(400).json({ 
        success: false,
        message: 'L\'identifiant de l\'actif est requis' 
      });
    }

    if (!type_anomalie) {
      console.error('❌ type_anomalie manquant');
      return res.status(400).json({ 
        success: false,
        message: 'Le type d\'anomalie est requis' 
      });
    }

    // Démarrer la transaction
    transaction = await sequelize.transaction();
    console.log('✅ Transaction démarrée');

    // Vérifier que l'actif existe
    console.log('🔍 Recherche de l\'actif avec ID:', actif_id);
    
    const actif = await Actif.findByPk(actif_id);
    
    if (!actif) {
      console.error('❌ Actif non trouvé pour ID:', actif_id);
      if (transaction && transaction.finished !== 'commit') {
        await transaction.rollback();
      }
      return res.status(404).json({ 
        success: false,
        message: `Actif non trouvé avec l'identifiant: ${actif_id}` 
      });
    }

    console.log('✅ Actif trouvé:', actif.id, actif.code);

    // Préparer les données
    const anomalieData = {
      actif_id: actif.id,
      type_anomalie: type_anomalie,
      description: description || '',
      date_constat: date_constat || new Date().toISOString().split('T')[0],
      statut: 'signale',
      created_by: req.user?.id || null
    };

    // Ajouter les champs optionnels s'ils existent dans la table
    if (localisation_constatee) anomalieData.localisation_constatee = localisation_constatee;
    if (photo) anomalieData.photo = photo;
    if (priorite) anomalieData.priorite = priorite;

    console.log('📝 Création anomalie avec données:', anomalieData);

    // Créer l'anomalie
    const anomalie = await Anomalie.create(anomalieData, { transaction });

    // Valider la transaction
    await transaction.commit();
    console.log('✅ Transaction commitée avec succès');

    // Retourner l'anomalie créée (sans les relations pour éviter l'erreur)
    res.status(201).json({ 
      success: true,
      message: 'Anomalie signalée avec succès',
      data: anomalie
    });
    
  } catch (error) {
    console.error('❌ Erreur createAnomalie:', error);
    
    // Rollback uniquement si la transaction existe et n'est pas déjà terminée
    if (transaction && transaction.finished !== 'commit') {
      try {
        await transaction.rollback();
        console.log('✅ Rollback effectué');
      } catch (rollbackError) {
        console.error('❌ Erreur lors du rollback:', rollbackError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la création de l\'anomalie',
      error: error.message
    });
  }
};

/**
 * Mettre à jour une anomalie
 */
exports.updateAnomalie = async (req, res) => {
  let transaction;
  try {
    const { id } = req.params;
    const updates = req.body;

    transaction = await sequelize.transaction();

    let anomalie;
    if (isUUID(id)) {
      anomalie = await Anomalie.findByPk(id);
    } else {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        if (transaction && transaction.finished !== 'commit') await transaction.rollback();
        return res.status(400).json({ message: 'ID invalide' });
      }
      anomalie = await Anomalie.findByPk(numericId);
    }

    if (!anomalie) {
      if (transaction && transaction.finished !== 'commit') await transaction.rollback();
      return res.status(404).json({ message: 'Anomalie non trouvée' });
    }

    if (updates.statut === 'resolu' && anomalie.statut !== 'resolu') {
      updates.date_resolution = new Date().toISOString().split('T')[0];
      updates.resolu_par = req.user?.id || null;
    }

    await anomalie.update(updates, { transaction });
    await transaction.commit();

    res.json({ success: true, message: 'Anomalie mise à jour', data: anomalie });
  } catch (error) {
    if (transaction && transaction.finished !== 'commit') {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('❌ Erreur lors du rollback:', rollbackError);
      }
    }
    console.error('❌ Erreur updateAnomalie:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Supprimer une anomalie
 */
exports.deleteAnomalie = async (req, res) => {
  try {
    const { id } = req.params;
    
    let anomalie;
    if (isUUID(id)) {
      anomalie = await Anomalie.findByPk(id);
    } else {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        return res.status(400).json({ message: 'ID invalide' });
      }
      anomalie = await Anomalie.findByPk(numericId);
    }

    if (!anomalie) {
      return res.status(404).json({ message: 'Anomalie non trouvée' });
    }

    await anomalie.destroy();
    res.json({ success: true, message: 'Anomalie supprimée' });
  } catch (error) {
    console.error('❌ Erreur deleteAnomalie:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * EXPORT PDF des anomalies - Version qui s'ouvre dans l'application (inline)
 */
exports.exportAnomaliesPDF = async (req, res) => {
  try {
    console.log('📊 Export anomalies en PDF - VERSION TEST...');
    
    // Récupérer les paramètres de filtre
    const { statut, type, startDate, endDate } = req.query;
    const where = {};
    
    if (statut) where.statut = statut;
    if (type) where.type_anomalie = type;
    if (startDate) where.date_constat = { [Op.gte]: startDate };
    if (endDate) where.date_constat = { ...where.date_constat, [Op.lte]: endDate };
    
    // Récupérer les anomalies SANS enrichissement
    const anomalies = await Anomalie.findAll({
      where,
      order: [['date_constat', 'DESC']]
    });
    
    console.log(`📊 ${anomalies.length} anomalies récupérées`);
    
    // Créer le document PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=anomalies_${new Date().toISOString().split('T')[0]}.pdf`);
    
    doc.pipe(res);

    // En-tête
    doc.fontSize(20).fillColor('#1e3a8a').text('Rapport des anomalies', { align: 'center' });
    doc.moveDown(0.5);
    
    doc.fontSize(10).fillColor('#666');
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, { align: 'right' });
    doc.moveDown();
    
    // Statistiques
    const total = anomalies.length;
    doc.fontSize(12).fillColor('#1e3a8a').text('Synthèse', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#333');
    doc.text(`📊 Total des anomalies: ${total}`);
    doc.moveDown();
    
    // Liste des anomalies
    if (anomalies.length > 0) {
      doc.addPage();
      doc.fontSize(14).fillColor('#1e3a8a').text('Détail des anomalies', { align: 'center', underline: true });
      doc.moveDown();
      
      let yPosition = doc.y;
      const pageHeight = doc.page.height - 100;
      
      for (let i = 0; i < anomalies.length; i++) {
        const a = anomalies[i];
        
        if (yPosition > pageHeight) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(10).font('Helvetica-Bold').text(`${i + 1}. ${a.type_anomalie || 'N/A'}`, 50, yPosition);
        doc.fontSize(9).font('Helvetica');
        doc.text(`ID Actif: ${a.actif_id || 'N/A'}`, 50, yPosition + 15);
        doc.text(`Description: ${(a.description || '').substring(0, 80)}`, 50, yPosition + 30);
        doc.text(`Date: ${a.date_constat ? new Date(a.date_constat).toLocaleDateString('fr-FR') : 'N/A'}`, 50, yPosition + 45);
        doc.text(`Statut: ${a.statut || 'N/A'}`, 50, yPosition + 60);
        
        yPosition += 90;
      }
    } else {
      doc.fontSize(12).fillColor('#666').text('Aucune anomalie trouvée avec les filtres sélectionnés.', { align: 'center' });
    }
    
    doc.end();
    
    console.log(`✅ Export PDF TEST terminé: ${anomalies.length} anomalies exportées`);
  } catch (error) {
    console.error('❌ Erreur exportAnomaliesPDF:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de l\'export PDF', 
      error: error.message 
    });
  }
};

/**
 * Récupérer les anomalies non résolues pour les alertes
 */
exports.getAnomaliesNonResolues = async (req, res) => {
  try {
    const anomalies = await Anomalie.findAll({
      where: {
        statut: { [Op.in]: ['signale', 'en_cours'] }
      },
      include: [
        { 
          model: Actif, 
          as: 'actif', 
          attributes: ['id', 'code', 'nom', 'localisation'] 
        },
        { 
          model: User, 
          as: 'createur', 
          attributes: ['id', 'full_name'] 
        }
      ],
      order: [
        ['priorite', 'DESC'],
        ['date_constat', 'ASC']
      ]
    });

    res.json(anomalies);
  } catch (error) {
    console.error('❌ Erreur getAnomaliesNonResolues:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Récupérer le tableau de bord des anomalies
 */
exports.getDashboard = async (req, res) => {
  try {
    const statsParStatut = await Anomalie.findAll({
      attributes: ['statut', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['statut']
    });

    const statsParType = await Anomalie.findAll({
      attributes: ['type_anomalie', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['type_anomalie']
    });

    const statsParPriorite = await Anomalie.findAll({
      attributes: ['priorite', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['priorite'],
      order: [[sequelize.literal('priorite'), 'ASC']]
    });

    const trenteJoursAvant = new Date();
    trenteJoursAvant.setDate(trenteJoursAvant.getDate() - 30);

    const anomaliesRecentes = await Anomalie.findAll({
      where: {
        date_constat: { [Op.gte]: trenteJoursAvant }
      },
      include: [
        { model: Actif, as: 'actif', attributes: ['code', 'nom'] },
        { model: User, as: 'createur', attributes: ['full_name'] }
      ],
      order: [['date_constat', 'DESC']],
      limit: 10
    });

    res.json({
      statsParStatut,
      statsParType,
      statsParPriorite,
      anomaliesRecentes,
      total: await Anomalie.count(),
      nonResolues: await Anomalie.count({ where: { statut: { [Op.in]: ['signale', 'en_cours'] } } })
    });
  } catch (error) {
    console.error('❌ Erreur getDashboard:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};