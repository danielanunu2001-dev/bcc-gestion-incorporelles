const { Anomalie, Actif, User, sequelize } = require('../models');
const { Op } = require('sequelize');

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

    // Récupérer les anomalies sans includes
    const { count, rows } = await Anomalie.findAndCountAll({
      where,
      order: [['date_constat', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Enrichir manuellement
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
    
    // Statistiques par statut
    const parStatut = await Anomalie.findAll({
      attributes: ['statut', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['statut']
    });

    // Statistiques par type
    const parType = await Anomalie.findAll({
      attributes: ['type_anomalie', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['type_anomalie']
    });

    // Anomalies récentes (5 dernières)
    const recentes = await Anomalie.findAll({
      limit: 5,
      order: [['date_constat', 'DESC']],
      include: [{ model: Actif, as: 'actif', attributes: ['id', 'code', 'nom'] }]
    });

    // Anomalies non résolues
    const nonResolues = await Anomalie.count({
      where: {
        statut: { [Op.in]: ['signale', 'en_cours'] }
      }
    });

    // Anomalies résolues
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
 * Récupérer une anomalie par ID
 */
exports.getAnomalieById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'ID est valide (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    
    const anomalie = await Anomalie.findByPk(id);

    if (!anomalie) {
      return res.status(404).json({ message: 'Anomalie non trouvée' });
    }

    // Enrichir manuellement
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
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Créer une nouvelle anomalie
 */
exports.createAnomalie = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { 
      actif_id, 
      type_anomalie, 
      description, 
      date_constat, 
      localisation_constatee,
      photo,
      priorite,
      commentaire
    } = req.body;

    // Vérifier que l'actif existe
    const actif = await Actif.findByPk(actif_id);
    if (!actif) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    const anomalie = await Anomalie.create({
      actif_id,
      type_anomalie,
      description,
      date_constat: date_constat || new Date().toISOString().split('T')[0],
      localisation_constatee,
      photo,
      priorite: priorite || 'moyenne',
      statut: 'signale',
      created_by: req.user.id
    }, { transaction });

    await transaction.commit();

    // Récupérer l'anomalie créée avec ses relations
    const anomalieComplete = await Anomalie.findByPk(anomalie.id, {
      include: [
        { model: Actif, as: 'actif', attributes: ['id', 'code', 'nom'] },
        { model: User, as: 'createur', attributes: ['id', 'full_name'] }
      ]
    });

    res.status(201).json(anomalieComplete);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createAnomalie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Mettre à jour une anomalie
 */
exports.updateAnomalie = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updates = req.body;

    const anomalie = await Anomalie.findByPk(id);
    if (!anomalie) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Anomalie non trouvée' });
    }

    // Si le statut passe à "resolu", enregistrer la date de résolution et l'utilisateur
    if (updates.statut === 'resolu' && anomalie.statut !== 'resolu') {
      updates.date_resolution = new Date().toISOString().split('T')[0];
      updates.resolu_par = req.user.id;
    }

    await anomalie.update(updates, { transaction });
    await transaction.commit();

    res.json(anomalie);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur updateAnomalie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprimer une anomalie
 */
exports.deleteAnomalie = async (req, res) => {
  try {
    const { id } = req.params;
    const anomalie = await Anomalie.findByPk(id);

    if (!anomalie) {
      return res.status(404).json({ message: 'Anomalie non trouvée' });
    }

    await anomalie.destroy();
    res.json({ message: 'Anomalie supprimée' });
  } catch (error) {
    console.error('❌ Erreur deleteAnomalie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Exporter les anomalies (CSV/JSON)
 */
exports.exportAnomalies = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    console.log(`📊 Export anomalies - format: ${format}`);
    
    // Version simplifiée : récupérer les anomalies sans includes
    const anomalies = await Anomalie.findAll({
      order: [['date_constat', 'DESC']]
    });
    
    // Enrichir manuellement avec les données associées
    const enrichedAnomalies = await Promise.all(anomalies.map(async (anomalie) => {
      const data = anomalie.toJSON();
      
      // Récupérer l'actif
      if (data.actif_id) {
        const actif = await Actif.findByPk(data.actif_id, {
          attributes: ['code', 'nom']
        });
        data.actif = actif;
      }
      
      // Récupérer le créateur
      if (data.created_by) {
        const createur = await User.findByPk(data.created_by, {
          attributes: ['full_name']
        });
        data.createur = createur;
      }
      
      // Récupérer le résolveur
      if (data.resolu_par) {
        const resoluPar = await User.findByPk(data.resolu_par, {
          attributes: ['full_name']
        });
        data.resoluPar = resoluPar;
      }
      
      return data;
    }));

    if (format === 'csv') {
      // Format CSV
      const headers = [
        'ID', 'Actif Code', 'Actif Nom', 'Type', 'Description', 
        'Date constat', 'Localisation', 'Statut', 'Date résolution', 
        'Créé par', 'Résolu par', 'Créé le', 'Mis à jour le'
      ];
      
      const rows = enrichedAnomalies.map(a => [
        a.id,
        a.actif?.code || '',
        a.actif?.nom || '',
        a.type_anomalie,
        a.description,
        a.date_constat,
        a.localisation || '',
        a.statut,
        a.date_resolution || '',
        a.createur?.full_name || '',
        a.resoluPar?.full_name || '',
        a.created_at,
        a.updated_at
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=anomalies_${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csvContent);
    }

    // Format JSON par défaut
    res.json(enrichedAnomalies);
  } catch (error) {
    console.error('❌ Erreur exportAnomalies:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
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
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer le tableau de bord des anomalies
 */
exports.getDashboard = async (req, res) => {
  try {
    // Anomalies par statut
    const statsParStatut = await Anomalie.findAll({
      attributes: ['statut', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['statut']
    });

    // Anomalies par type
    const statsParType = await Anomalie.findAll({
      attributes: ['type_anomalie', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['type_anomalie']
    });

    // Anomalies par priorité
    const statsParPriorite = await Anomalie.findAll({
      attributes: ['priorite', [sequelize.fn('COUNT', '*'), 'count']],
      group: ['priorite'],
      order: [[sequelize.literal('priorite'), 'ASC']]
    });

    // Anomalies récentes (derniers 30 jours)
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
    res.status(500).json({ message: 'Erreur serveur' });
  }
};