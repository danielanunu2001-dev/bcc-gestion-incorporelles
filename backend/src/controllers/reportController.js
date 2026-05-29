const { Actif, Amortissement, Contrat, Depreciation, CategorieAmortissement, Mouvement, sequelize } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ==================== RAPPORTS DE BASE ====================

/**
 * État des immobilisations (format standard)
 */
exports.etatImmobilisations = async (req, res) => {
  try {
    const { dateArrete, groupePar } = req.query;
    const dateRef = dateArrete ? new Date(dateArrete) : new Date();

    // Si un regroupement est demandé, utiliser la version avec regroupement
    if (groupePar && ['categorie', 'localisation', 'affectation'].includes(groupePar)) {
      return await exports.etatImmobilisationsRegroupe(req, res);
    }

    // Version standard sans regroupement
    const actifs = await Actif.findAll({
      where: { actif: true },
      include: [
        {
          model: Amortissement,
          as: 'Amortissements',
          where: { exercice: { [Op.lte]: dateRef.getFullYear() } },
          required: false
        }
      ]
    });

    const result = actifs.map(a => {
      const amortissements = a.Amortissements || [];
      const cumul = amortissements.reduce((s, am) => s + parseFloat(am.annuite || 0), 0);
      const vnc = Math.max(parseFloat(a.cout_acquisition) - cumul, parseFloat(a.valeur_residuelle || 0));
      return {
        id: a.id,
        code: a.code,
        nom: a.nom,
        compte: a.compte_comptable || '205',
        date_acquisition: a.date_acquisition,
        valeur_brute: parseFloat(a.cout_acquisition),
        amortissements_cumules: cumul,
        valeur_nette: vnc,
        duree: a.duree_utile_ans,
        mode: a.mode_amortissement,
        localisation: a.localisation,
        affectation: a.affectation,
        categorie_id: a.categorie_id
      };
    });

    const totalBrut = result.reduce((s, r) => s + r.valeur_brute, 0);
    const totalAmort = result.reduce((s, r) => s + r.amortissements_cumules, 0);
    const totalNet = result.reduce((s, r) => s + r.valeur_nette, 0);

    res.json({
      date_arrete: dateRef,
      actifs: result,
      totaux: {
        valeur_brute: totalBrut,
        amortissements: totalAmort,
        valeur_nette: totalNet
      }
    });
  } catch (error) {
    console.error('Erreur etatImmobilisations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * État des immobilisations avec regroupement (par catégorie, localisation, affectation)
 */
exports.etatImmobilisationsRegroupe = async (req, res) => {
  try {
    const { groupePar = 'categorie', dateArrete = new Date() } = req.query;
    const dateRef = new Date(dateArrete);

    // Construire la clause de regroupement selon le paramètre
    let groupField;
    let attributes;
    let include = [];
    
    if (groupePar === 'categorie') {
      groupField = 'categorie_id';
      include = [{ model: CategorieAmortissement, as: 'categorie', attributes: ['id', 'nom_categorie'] }];
      attributes = [
        'categorie_id',
        [sequelize.fn('COUNT', sequelize.col('Actif.id')), 'nombre'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeur_brute'],
        [sequelize.col('categorie.id'), 'categorie_id'],
        [sequelize.col('categorie.nom_categorie'), 'categorie_nom']
      ];
    } else if (groupePar === 'localisation') {
      groupField = 'localisation';
      attributes = [
        'localisation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nombre'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeur_brute']
      ];
    } else if (groupePar === 'affectation') {
      groupField = 'affectation';
      attributes = [
        'affectation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nombre'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeur_brute']
      ];
    } else {
      return res.status(400).json({ message: 'Groupe non valide' });
    }

    const actifs = await Actif.findAll({
      where: { actif: true },
      include,
      attributes,
      group: groupePar === 'categorie' 
        ? ['categorie_id', 'categorie.id', 'categorie.nom_categorie']
        : [groupField],
      raw: true
    });

    // Pour la valeur nette, récupérer les derniers amortissements
    const actifsComplets = await Actif.findAll({
      where: { actif: true },
      include: [
        { 
          model: Amortissement, 
          as: 'Amortissements',
          where: { exercice: { [Op.lte]: dateRef.getFullYear() } },
          required: false,
          limit: 1, 
          order: [['exercice', 'DESC']] 
        },
        ...include
      ]
    });

    const result = actifs.map(g => {
      const matching = actifsComplets.filter(a => {
        if (groupePar === 'categorie') {
          const gCategorieId = g.categorie_id || g['categorie.id'];
          const aCategorieId = a.categorie_id;
          return gCategorieId === aCategorieId;
        } else if (groupePar === 'localisation') {
          return a.localisation === g.localisation;
        } else {
          return a.affectation === g.affectation;
        }
      });
      
      const valeurNette = matching.reduce((sum, a) => {
        const dernierAmort = a.Amortissements?.[0];
        return sum + (dernierAmort ? parseFloat(dernierAmort.valeur_nette) : parseFloat(a.cout_acquisition));
      }, 0);

      let libelle = groupePar === 'categorie' 
        ? (g.categorie_nom || g.nom_categorie || 'Non défini')
        : (g[groupField] || 'Non défini');

      return {
        groupe: libelle,
        nombre: parseInt(g.nombre),
        valeur_brute: parseFloat(g.valeur_brute) || 0,
        valeur_nette: valeurNette
      };
    });

    res.json({
      date_arrete: dateRef,
      groupe_par: groupePar,
      resultats: result,
      totaux: {
        nombre: result.reduce((s, r) => s + r.nombre, 0),
        valeur_brute: result.reduce((s, r) => s + r.valeur_brute, 0),
        valeur_nette: result.reduce((s, r) => s + r.valeur_nette, 0)
      }
    });
  } catch (error) {
    console.error('❌ Erreur etatImmobilisationsRegroupe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Tableau des amortissements par exercice
 */
exports.tableauAmortissements = async (req, res) => {
  try {
    const { exercice } = req.query;
    const annee = exercice || new Date().getFullYear();

    const amortissements = await Amortissement.findAll({
      where: { exercice: annee },
      include: [
        {
          model: Actif,
          as: 'Actif',
          attributes: ['id', 'code', 'nom', 'type', 'cout_acquisition', 'compte_comptable']
        }
      ],
      order: [['actif_id', 'ASC']]
    });

    const total = amortissements.reduce((s, a) => s + parseFloat(a.annuite || 0), 0);

    res.json({
      exercice: annee,
      total_dotations: total,
      amortissements: amortissements.map(a => ({
        actif_id: a.actif_id,
        actif_code: a.Actif?.code || 'N/A',
        actif_nom: a.Actif?.nom || 'N/A',
        type: a.Actif?.type,
        compte: a.Actif?.compte_comptable || '205',
        valeur_brute: parseFloat(a.Actif?.cout_acquisition || 0),
        annuite: parseFloat(a.annuite),
        cumul: parseFloat(a.cumul_amortissements),
        vnc: parseFloat(a.valeur_nette)
      }))
    });
  } catch (error) {
    console.error('Erreur tableauAmortissements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Fiche détaillée d'un actif
 */
exports.ficheActif = async (req, res) => {
  try {
    const { id } = req.params;
    const actif = await Actif.findByPk(id, {
      include: [
        {
          model: Amortissement,
          as: 'Amortissements',
          order: [['exercice', 'ASC']]
        },
        {
          model: Contrat,
          as: 'Contrats'
        },
        {
          model: Depreciation,
          as: 'Depreciations',
          order: [['date_test', 'DESC']]
        },
        {
          model: CategorieAmortissement,
          as: 'categorie'
        }
      ]
    });

    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    res.json(actif);
  } catch (error) {
    console.error('Erreur ficheActif:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== RAPPORTS ANALYTIQUES ====================

/**
 * État des immobilisations par catégorie
 */
exports.getEtatParCategorie = async (req, res) => {
  try {
    const actifs = await Actif.findAll({
      where: { actif: true },
      include: [{ model: CategorieAmortissement, as: 'categorie' }],
      attributes: [
        'categorie_id',
        [sequelize.fn('COUNT', sequelize.col('Actif.id')), 'nbActifs'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute']
      ],
      group: ['categorie_id', 'categorie.id', 'categorie.nom_categorie']
    });

    // Récupérer les valeurs nettes
    const actifsAvecAmort = await Actif.findAll({
      where: { actif: true },
      include: [
        { model: CategorieAmortissement, as: 'categorie' },
        { model: Amortissement, as: 'Amortissements', limit: 1, order: [['exercice', 'DESC']] }
      ]
    });

    const result = actifs.map(a => {
      const matching = actifsAvecAmort.filter(act => act.categorie_id === a.categorie_id);
      const valeurNette = matching.reduce((sum, act) => {
        const dernierAmort = act.Amortissements?.[0];
        return sum + (dernierAmort ? parseFloat(dernierAmort.valeur_nette) : parseFloat(act.cout_acquisition));
      }, 0);

      return {
        categorie_id: a.categorie_id,
        categorie_nom: a.categorie?.nom_categorie || 'Sans catégorie',
        nbActifs: parseInt(a.dataValues.nbActifs),
        valeurBrute: parseFloat(a.dataValues.valeurBrute) || 0,
        valeurNette
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur getEtatParCategorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * État des immobilisations par localisation
 */
exports.getEtatParLocalisation = async (req, res) => {
  try {
    const actifs = await Actif.findAll({
      where: { actif: true },
      attributes: [
        'localisation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nbActifs'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute']
      ],
      group: ['localisation']
    });

    // Récupérer les valeurs nettes
    const actifsAvecAmort = await Actif.findAll({
      where: { actif: true },
      include: [{ model: Amortissement, as: 'Amortissements', limit: 1, order: [['exercice', 'DESC']] }]
    });

    const result = actifs.map(a => {
      const matching = actifsAvecAmort.filter(act => act.localisation === a.localisation);
      const valeurNette = matching.reduce((sum, act) => {
        const dernierAmort = act.Amortissements?.[0];
        return sum + (dernierAmort ? parseFloat(dernierAmort.valeur_nette) : parseFloat(act.cout_acquisition));
      }, 0);

      return {
        localisation: a.localisation || 'Non spécifié',
        nbActifs: parseInt(a.dataValues.nbActifs),
        valeurBrute: parseFloat(a.dataValues.valeurBrute) || 0,
        valeurNette
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur getEtatParLocalisation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * État des immobilisations par service (affectation)
 */
exports.getEtatParService = async (req, res) => {
  try {
    const actifs = await Actif.findAll({
      where: { actif: true },
      attributes: [
        'affectation',
        [sequelize.fn('COUNT', sequelize.col('id')), 'nbActifs'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute']
      ],
      group: ['affectation']
    });

    // Récupérer les valeurs nettes
    const actifsAvecAmort = await Actif.findAll({
      where: { actif: true },
      include: [{ model: Amortissement, as: 'Amortissements', limit: 1, order: [['exercice', 'DESC']] }]
    });

    const result = actifs.map(a => {
      const matching = actifsAvecAmort.filter(act => act.affectation === a.affectation);
      const valeurNette = matching.reduce((sum, act) => {
        const dernierAmort = act.Amortissements?.[0];
        return sum + (dernierAmort ? parseFloat(dernierAmort.valeur_nette) : parseFloat(act.cout_acquisition));
      }, 0);

      return {
        affectation: a.affectation || 'Non affecté',
        nbActifs: parseInt(a.dataValues.nbActifs),
        valeurBrute: parseFloat(a.dataValues.valeurBrute) || 0,
        valeurNette
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Erreur getEtatParService:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== RAPPORTS SPÉCIFIQUES ====================

/**
 * Plan d'amortissement prévisionnel vs réalisé
 */
exports.planAmortissement = async (req, res) => {
  try {
    const { anneeDebut, anneeFin } = req.query;
    
    const actifs = await Actif.findAll({
      where: { actif: true },
      include: [{ model: Amortissement, as: 'Amortissements' }]
    });

    // Déterminer la plage d'années
    let minYear, maxYear;
    
    if (actifs.length > 0 && actifs.some(a => a.Amortissements && a.Amortissements.length > 0)) {
      const toutesAnnees = actifs.flatMap(a => a.Amortissements ? a.Amortissements.map(am => am.exercice) : []);
      minYear = anneeDebut ? parseInt(anneeDebut) : Math.min(...toutesAnnees);
      maxYear = anneeFin ? parseInt(anneeFin) : Math.max(...toutesAnnees);
    } else {
      minYear = anneeDebut ? parseInt(anneeDebut) : new Date().getFullYear();
      maxYear = anneeFin ? parseInt(anneeFin) : minYear + 5;
    }

    const result = [];
    for (let annee = minYear; annee <= maxYear; annee++) {
      const previsionnel = actifs.reduce((sum, a) => {
        const anneeAcquisition = new Date(a.date_acquisition).getFullYear();
        if (anneeAcquisition <= annee && annee < anneeAcquisition + a.duree_utile_ans) {
          return sum + (parseFloat(a.cout_acquisition) - parseFloat(a.valeur_residuelle || 0)) / a.duree_utile_ans;
        }
        return sum;
      }, 0);

      const realise = actifs.reduce((sum, a) => {
        const amort = a.Amortissements?.find(am => am.exercice === annee);
        return sum + (amort ? parseFloat(amort.annuite) : 0);
      }, 0);

      result.push({ annee, previsionnel, realise });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur planAmortissement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Suivi des investissements (budget vs réalisé)
 */
exports.suiviInvestissements = async (req, res) => {
  try {
    // ✅ Récupérer les paramètres de période
    const { annee_debut, annee_fin, type } = req.query;
    
    // Définir la période par défaut si non fournie
    const debut = annee_debut ? parseInt(annee_debut) : new Date().getFullYear() - 4;
    const fin = annee_fin ? parseInt(annee_fin) : new Date().getFullYear();
    
    console.log('📊 suiviInvestissements appelé avec:', { debut, fin, type });
    
    // ✅ Construire la condition WHERE avec la période
    let whereCondition = {};
    
    // Filtrer par période d'acquisition
    if (debut && fin) {
      whereCondition.date_acquisition = {
        [Op.between]: [`${debut}-01-01`, `${fin}-12-31`]
      };
    }
    
    // Filtrer par type d'investissement si spécifié
    if (type && type !== 'tous') {
      const typeMapping = {
        'equipement': ['materiel', 'vehicule'],
        'infrastructure': ['bâtiment', 'terrain'],
        'technologie': ['logiciel', 'licence', 'brevet'],
        'formation': ['autres'],
        'recherche': ['brevet']
      };
      const actifTypes = typeMapping[type] || [type];
      whereCondition.type = { [Op.in]: actifTypes };
    }
    
    // ✅ Récupérer les actifs sur la période
    const actifs = await Actif.findAll({
      where: whereCondition,
      attributes: ['id', 'code', 'nom', 'type', 'cout_acquisition', 'date_acquisition'],
      order: [['date_acquisition', 'ASC']]
    });
    
    console.log(`📊 ${actifs.length} actif(s) trouvé(s) pour la période ${debut}-${fin}`);
    
    // Grouper par année
    const investissementsParAnnee = {};
    for (let an = debut; an <= fin; an++) {
      investissementsParAnnee[an] = {
        annee: an,
        budget: 0,
        realise: 0,
        actifs: []
      };
    }
    
    for (const actif of actifs) {
      const annee = new Date(actif.date_acquisition).getFullYear();
      if (annee >= debut && annee <= fin) {
        const cout = parseFloat(actif.cout_acquisition) || 0;
        investissementsParAnnee[annee].budget += cout;
        investissementsParAnnee[annee].realise += cout;
        investissementsParAnnee[annee].actifs.push({
          id: actif.id,
          code: actif.code,
          nom: actif.nom,
          type: actif.type,
          cout: cout
        });
      }
    }
    
    // Convertir en tableau et filtrer les années avec données
    const result = Object.values(investissementsParAnnee).filter(item => item.budget > 0 || item.actifs.length > 0);
    
    // Retourner les résultats au format attendu par le frontend
    res.json({
      success: true,
      periode: { debut, fin },
      investissements: result,
      totaux: {
        budget_total: result.reduce((sum, r) => sum + r.budget, 0),
        realise_total: result.reduce((sum, r) => sum + r.realise, 0),
        nombre_annees: result.length,
        nombre_investissements: result.reduce((sum, r) => sum + r.actifs.length, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur suiviInvestissements:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des investissements',
      error: error.message 
    });
  }
};

/**
 * Alertes : fin de licence, échéance maintenance, bien non retrouvé
 */
exports.alertes = async (req, res) => {
  try {
    const aujourdhui = new Date();
    const dans30Jours = new Date(aujourdhui);
    dans30Jours.setDate(aujourdhui.getDate() + 30);
    const dans90Jours = new Date(aujourdhui);
    dans90Jours.setDate(aujourdhui.getDate() + 90);

    // Alertes fin de licence (actifs incorporels avec date_validite)
    const finLicence = await Actif.findAll({
      where: {
        type_immobilisation: 'incorporel',
        date_validite: { [Op.between]: [aujourdhui, dans30Jours] }
      },
      attributes: ['id', 'code', 'nom', 'date_validite']
    });

    // Alertes maintenance (via les mouvements de maintenance avec une date de fin)
    let maintenances = [];
    try {
      maintenances = await Mouvement.findAll({
        where: {
          type_mouvement: { [Op.in]: ['maintenance', 'reparation'] },
          date_fin: { [Op.between]: [aujourdhui, dans30Jours] }
        },
        include: [{ model: Actif, as: 'Actif', attributes: ['code', 'nom'] }]
      });
    } catch (e) {
      console.log('Modèle Mouvement non disponible ou structure différente');
      maintenances = [];
    }

    // Alertes échéances de contrats
    const echeancesContrats = await Contrat.findAll({
      where: {
        date_fin: {
          [Op.between]: [aujourdhui, dans90Jours]
        }
      },
      include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
    });

    // Alertes actifs avec état "réparation" ou "hors_service"
    const actifsEnMaintenance = await Actif.findAll({
      where: {
        actif: true,
        etat: ['reparation', 'hors_service']
      },
      attributes: ['id', 'code', 'nom', 'etat', 'localisation']
    });

    // Alertes bien non retrouvé (anomalies de type 'manquant' non résolues)
    const anomaliesNonResolues = [];

    res.json({
      finLicence: finLicence.map(a => ({
        actif: `${a.code} - ${a.nom}`,
        date: a.date_validite,
        type: 'Licence',
        priorite: 'haute'
      })),
      maintenance: maintenances.map(m => ({
        actif: m.Actif ? `${m.Actif.code} - ${m.Actif.nom}` : 'Actif inconnu',
        date: m.date_fin,
        type: 'Maintenance',
        priorite: 'moyenne'
      })),
      echeancesContrats: echeancesContrats.map(c => ({
        actif: c.Actif ? `${c.Actif.code} - ${c.Actif.nom}` : 'Actif inconnu',
        date: c.date_fin,
        type: 'Contrat',
        contrat_id: c.id,
        priorite: new Date(c.date_fin) < dans30Jours ? 'haute' : 'moyenne'
      })),
      actifsEnMaintenance: actifsEnMaintenance.map(a => ({
        actif: `${a.code} - ${a.nom}`,
        etat: a.etat,
        localisation: a.localisation,
        type: 'État',
        priorite: a.etat === 'hors_service' ? 'critique' : 'moyenne'
      })),
      anomalies: anomaliesNonResolues
    });
  } catch (error) {
    console.error('Erreur alertes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== EXPORTS ====================

/**
 * Export Excel des données
 */
exports.exportExcel = async (req, res) => {
  try {
    const { type, exercice } = req.query;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rapport');

    // Configuration des colonnes selon le type de rapport
    if (type === 'amortissements') {
      worksheet.columns = [
        { header: 'Code actif', key: 'code', width: 15 },
        { header: 'Nom actif', key: 'nom', width: 30 },
        { header: 'Exercice', key: 'exercice', width: 10 },
        { header: 'Annuité', key: 'annuite', width: 15 },
        { header: 'Cumul', key: 'cumul', width: 15 },
        { header: 'VNC', key: 'vnc', width: 15 }
      ];

      const annee = exercice || new Date().getFullYear();
      const amortissements = await Amortissement.findAll({
        where: { exercice: annee },
        include: [{ model: Actif, as: 'Actif', attributes: ['code', 'nom'] }]
      });

      amortissements.forEach(a => {
        worksheet.addRow({
          code: a.Actif?.code,
          nom: a.Actif?.nom,
          exercice: a.exercice,
          annuite: parseFloat(a.annuite),
          cumul: parseFloat(a.cumul_amortissements),
          vnc: parseFloat(a.valeur_nette)
        });
      });
    } else if (type === 'etat-immobilisations') {
      worksheet.columns = [
        { header: 'Code', key: 'code', width: 15 },
        { header: 'Nom', key: 'nom', width: 30 },
        { header: 'Date acquisition', key: 'date', width: 15 },
        { header: 'Valeur brute', key: 'valeurBrute', width: 15 },
        { header: 'Amortissements', key: 'amortissements', width: 15 },
        { header: 'VNC', key: 'vnc', width: 15 }
      ];

      const actifs = await Actif.findAll({
        where: { actif: true },
        include: [{ model: Amortissement, as: 'Amortissements' }]
      });

      actifs.forEach(a => {
        const cumul = (a.Amortissements || []).reduce((s, am) => s + parseFloat(am.annuite || 0), 0);
        worksheet.addRow({
          code: a.code,
          nom: a.nom,
          date: new Date(a.date_acquisition).toLocaleDateString(),
          valeurBrute: parseFloat(a.cout_acquisition),
          amortissements: cumul,
          vnc: parseFloat(a.cout_acquisition) - cumul
        });
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${type}-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erreur exportExcel:', error);
    res.status(500).json({ message: 'Erreur export Excel' });
  }
};

/**
 * Export PDF des données
 */
exports.exportPDF = async (req, res) => {
  try {
    const { type, id } = req.query;
    
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${type}-${Date.now()}.pdf`);

    doc.pipe(res);

    // Titre
    doc.fontSize(20).text(`Rapport ${type}`, { align: 'center' });
    doc.moveDown();

    if (type === 'fiche-actif' && id) {
      const actif = await Actif.findByPk(id, {
        include: [
          { model: Amortissement, as: 'Amortissements', order: [['exercice', 'ASC']] },
          { model: Contrat, as: 'Contrats' }
        ]
      });

      if (actif) {
        doc.fontSize(14).text(`Fiche actif: ${actif.code} - ${actif.nom}`);
        doc.moveDown();
        doc.fontSize(10).text(`Date acquisition: ${new Date(actif.date_acquisition).toLocaleDateString()}`);
        doc.text(`Valeur brute: ${parseFloat(actif.cout_acquisition).toLocaleString()} FC`);
        doc.text(`Durée: ${actif.duree_utile_ans} ans`);
        doc.text(`Mode: ${actif.mode_amortissement}`);
        doc.moveDown();

        // Tableau des amortissements
        if (actif.Amortissements?.length) {
          doc.fontSize(12).text('Plan d\'amortissement');
          doc.moveDown(0.5);
          
          actif.Amortissements.forEach(a => {
            doc.fontSize(9).text(
              `${a.exercice}: ${parseFloat(a.annuite).toLocaleString()} FC (Cumul: ${parseFloat(a.cumul_amortissements).toLocaleString()} FC, VNC: ${parseFloat(a.valeur_nette).toLocaleString()} FC)`
            );
          });
        }
      }
    } else if (type === 'etat-immobilisations') {
      const actifs = await Actif.findAll({
        where: { actif: true },
        include: [{ model: Amortissement, as: 'Amortissements' }]
      });

      doc.fontSize(14).text('État des immobilisations', { align: 'center' });
      doc.moveDown();

      let totalBrut = 0;
      let totalNet = 0;

      actifs.forEach((a, index) => {
        const cumul = (a.Amortissements || []).reduce((s, am) => s + parseFloat(am.annuite || 0), 0);
        const vnc = parseFloat(a.cout_acquisition) - cumul;
        totalBrut += parseFloat(a.cout_acquisition);
        totalNet += vnc;

        doc.fontSize(10).text(`${index + 1}. ${a.code} - ${a.nom}`);
        doc.fontSize(8).text(`   Valeur brute: ${parseFloat(a.cout_acquisition).toLocaleString()} FC`);
        doc.fontSize(8).text(`   VNC: ${vnc.toLocaleString()} FC`);
        doc.moveDown(0.5);
      });

      doc.moveDown();
      doc.fontSize(12).text(`Total valeur brute: ${totalBrut.toLocaleString()} FC`);
      doc.fontSize(12).text(`Total VNC: ${totalNet.toLocaleString()} FC`);
    }

    doc.end();
  } catch (error) {
    console.error('Erreur exportPDF:', error);
    res.status(500).json({ message: 'Erreur export PDF' });
  }
};

// ==================== ALIAS POUR COMPATIBILITÉ ====================

// Alias pour les fonctions appelées depuis d'autres fichiers
exports.getEtatParCategorie = exports.getEtatParCategorie;
exports.getEtatParLocalisation = exports.getEtatParLocalisation;
exports.getEtatParService = exports.getEtatParService;
exports.getAmortissementPrevisionnelVsRealise = exports.planAmortissement;
exports.getSuiviInvestissements = exports.suiviInvestissements;
exports.getAlertes = exports.alertes;