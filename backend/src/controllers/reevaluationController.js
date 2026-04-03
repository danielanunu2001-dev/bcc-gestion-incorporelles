const { Reevaluation, Actif, Amortissement, User, AuditLog } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const actifController = require('./actifController');

// ==================== FONCTION DE LOG ====================
const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, req = null, operationDate = null) => {
  try {
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      // ✅ CORRECTION : Prendre l'IP, pas l'objet req complet
      ip_address: req ? (req.ip || req.connection?.remoteAddress || null) : null
    };
    
    if (operationDate) {
      logData.created_at = operationDate;
    }
    
    await AuditLog.create(logData);
    console.log(`✅ Log créé: ${action} sur ${tableName} (${recordId})`);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};


// ==================== RÉCUPÉRER LES RÉÉVALUATIONS ====================

/**
 * Récupérer toutes les réévaluations d'un actif
 */
exports.getReevaluations = async (req, res) => {
  try {
    const { actifId } = req;
    
    console.log(`🔍 Récupération des réévaluations pour l'actif: ${actifId}`);
    
    const reevaluations = await Reevaluation.findAll({
      where: { actif_id: actifId },
      include: [
        { 
          model: User, 
          as: 'createurReevaluation', 
          attributes: ['id', 'full_name', 'email'] 
        }
      ],
      order: [['date_reevaluation', 'DESC']]
    });
    
    console.log(`✅ ${reevaluations.length} réévaluation(s) trouvée(s)`);
    res.json(reevaluations);
  } catch (error) {
    console.error('❌ Erreur getReevaluations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== CRÉER UNE RÉÉVALUATION ====================

/**
 * Créer une nouvelle réévaluation
 */
exports.createReevaluation = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { actifId } = req;
    const reevaluationData = req.body;

    console.log('📦 Données reçues pour réévaluation:', reevaluationData);

    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    const dernierAmort = await Amortissement.findOne({
      where: { actif_id: actifId },
      order: [['exercice', 'DESC']]
    });
    
    const valeurActuelle = dernierAmort 
      ? parseFloat(dernierAmort.valeur_nette) 
      : parseFloat(actif.cout_acquisition);
    
    const nouvelleValeur = parseFloat(reevaluationData.valeur_apres);
    if (isNaN(nouvelleValeur) || nouvelleValeur <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: 'La nouvelle valeur doit être un nombre positif valide' 
      });
    }

    const plusValue = Math.max(0, nouvelleValeur - valeurActuelle);
    const moinsValue = Math.max(0, valeurActuelle - nouvelleValeur);

    // Créer la réévaluation
    const reevaluation = await Reevaluation.create({
      actif_id: actifId,
      date_reevaluation: reevaluationData.date_reevaluation || new Date().toISOString().split('T')[0],
      valeur_avant: valeurActuelle,
      valeur_apres: nouvelleValeur,
      plus_value: plusValue,
      moins_value: moinsValue,
      compte_reevaluation: reevaluationData.compte_reevaluation || '106',
      nouvelle_duree_ans: reevaluationData.nouvelle_duree_ans ? parseInt(reevaluationData.nouvelle_duree_ans) : null,
      nouveau_taux: reevaluationData.nouveau_taux ? parseFloat(reevaluationData.nouveau_taux) : null,
      commentaire: reevaluationData.commentaire || null,
      document_reference: reevaluationData.document_reference || null,
      created_by: req.user.id
    }, { transaction });

    console.log('✅ Réévaluation créée avec ID:', reevaluation.id);

    // Mettre à jour l'actif
    const updateData = {
      valeur_reevaluee: nouvelleValeur,
      date_derniere_reevaluation: reevaluationData.date_reevaluation || new Date().toISOString().split('T')[0],
    };
    
    if (plusValue > 0) {
      updateData.cumul_reevaluations = sequelize.literal(`COALESCE(cumul_reevaluations, 0) + ${plusValue}`);
    }
    
    if (reevaluationData.nouvelle_duree_ans) {
      updateData.duree_residuelle_ans = parseInt(reevaluationData.nouvelle_duree_ans);
    }
    
    await actif.update(updateData, { transaction });
    console.log('✅ Actif mis à jour avec les nouvelles valeurs');

    // Recalculer les amortissements si nécessaire
    if (plusValue > 0 || moinsValue > 0 || reevaluationData.nouvelle_duree_ans) {
      const anneeReevaluation = new Date(reevaluationData.date_reevaluation || new Date()).getFullYear();
      
      await Amortissement.destroy({
        where: {
          actif_id: actifId,
          exercice: { [Op.gte]: anneeReevaluation }
        },
        transaction
      });
      
      console.log(`🔄 Amortissements supprimés à partir de ${anneeReevaluation}`);
      
      if (typeof actifController.genererPlanAmortissement === 'function') {
        await actifController.genererPlanAmortissement(actif, transaction);
        console.log('✅ Nouveau plan d\'amortissement généré');
      } else {
        console.log('⚠️ Fonction genererPlanAmortissement non trouvée, calcul manuel...');
        await genererPlanAmortissementManuel(actif, transaction, anneeReevaluation);
      }
    }

    await transaction.commit();
    console.log('💾 Transaction committée avec succès');

    // ✅ AJOUT DU LOG D'AUDIT
    await logAction(
      req.user.id,
      'REEVALUATION',
      'actifs',
      actifId,
      { 
        valeur_avant: valeurActuelle,
        duree_avant: actif.duree_utile_ans,
        taux_avant: actif.taux_amortissement
      },
      {
        valeur_apres: nouvelleValeur,
        nouvelle_duree_ans: reevaluationData.nouvelle_duree_ans,
        nouveau_taux: reevaluationData.nouveau_taux,
        compte_reevaluation: reevaluationData.compte_reevaluation,
        document_reference: reevaluationData.document_reference,
        commentaire: reevaluationData.commentaire
      },
      req,
      new Date(reevaluationData.date_reevaluation) // ← Date de la réévaluation
    );

    const nouvelleReevaluation = await Reevaluation.findByPk(reevaluation.id, {
      include: [
        { 
          model: User, 
          as: 'createurReevaluation', 
          attributes: ['id', 'full_name', 'email'] 
        },
        {
          model: Actif,
          as: 'actif',
          attributes: ['id', 'code', 'nom']
        }
      ]
    });
    
    res.status(201).json(nouvelleReevaluation);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createReevaluation:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création de la réévaluation',
      error: error.message 
    });
  }
};

/**
 * Mettre à jour une réévaluation
 */
exports.updateReevaluation = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // ✅ CORRECTION : Utiliser reevaluationId
    const { reevaluationId } = req.params;
    const updates = req.body;

    const reevaluation = await Reevaluation.findByPk(reevaluationId);
    if (!reevaluation) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Réévaluation non trouvée' });
    }

    // Sauvegarder les anciennes valeurs
    const oldValues = {
      valeur_apres: reevaluation.valeur_apres,
      nouvelle_duree_ans: reevaluation.nouvelle_duree_ans,
      nouveau_taux: reevaluation.nouveau_taux,
      commentaire: reevaluation.commentaire
    };

    delete updates.id;
    delete updates.actif_id;
    delete updates.created_by;

    await reevaluation.update(updates, { transaction });
    await transaction.commit();

    // ✅ AJOUT DU LOG D'AUDIT
    await logAction(
      req.user.id,
      'REEVALUATION_UPDATE',
      'reevaluations',
      reevaluationId,
      oldValues,
      updates,
      req,
      new Date()
    );

    const reevaluationMaj = await Reevaluation.findByPk(reevaluationId, {
      include: [
        { 
          model: User, 
          as: 'createurReevaluation', 
          attributes: ['id', 'full_name', 'email'] 
        }
      ]
    });
    
    res.json(reevaluationMaj);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur updateReevaluation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


/**
 * Supprimer une réévaluation
 */
exports.deleteReevaluation = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // ✅ CORRECTION : Utiliser reevaluationId
    const { reevaluationId } = req.params;

    const reevaluation = await Reevaluation.findByPk(reevaluationId);
    if (!reevaluation) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Réévaluation non trouvée' });
    }

    const oldValues = {
      valeur_apres: reevaluation.valeur_apres,
      date_reevaluation: reevaluation.date_reevaluation
    };

    await reevaluation.destroy({ transaction });
    await transaction.commit();

    // ✅ AJOUT DU LOG D'AUDIT
    await logAction(
      req.user.id,
      'REEVALUATION_DELETE',
      'reevaluations',
      reevaluationId,
      oldValues,
      null,
      req,
      new Date()
    );

    res.json({ message: 'Réévaluation supprimée avec succès' });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur deleteReevaluation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// ✅ FONCTION DE SECOURS : Calcul manuel des amortissements (corrigée)
const genererPlanAmortissementManuel = async (actif, transaction, anneeReevaluation) => {
  const amortissements = [];
  
  const baseValue = actif.valeur_reevaluee || parseFloat(actif.cout_acquisition);
  const duree = actif.duree_residuelle_ans || actif.duree_utile_ans;
  
  console.log(`📊 Calcul manuel des amortissements: base=${baseValue}, durée=${duree} ans à partir de ${anneeReevaluation}`);

  const annuite = baseValue / duree;
  let cumul = 0;

  for (let i = 0; i < duree; i++) {
    const exercice = anneeReevaluation + i;
    cumul += annuite;
    const valeurNette = Math.max(baseValue - cumul, 0);
    
    amortissements.push({
      actif_id: actif.id,
      exercice,
      annuite,
      cumul_amortissements: cumul,
      valeur_nette: valeurNette
    });
  }
  
  await Amortissement.bulkCreate(amortissements, { transaction });
  console.log(`✅ ${amortissements.length} amortissements créés manuellement`);
};

// ==================== RÉCUPÉRER UNE RÉÉVALUATION PAR ID ====================

exports.getReevaluationById = async (req, res) => {
  try {
    // ✅ CORRECTION : Utiliser reevaluationId
    const { reevaluationId } = req.params;
    
    const reevaluation = await Reevaluation.findByPk(reevaluationId, {
      include: [
        { 
          model: User, 
          as: 'createurReevaluation', 
          attributes: ['id', 'full_name', 'email'] 
        },
        {
          model: Actif,
          as: 'actif',
          attributes: ['id', 'code', 'nom']
        }
      ]
    });
    
    if (!reevaluation) {
      return res.status(404).json({ message: 'Réévaluation non trouvée' });
    }
    
    res.json(reevaluation);
  } catch (error) {
    console.error('❌ Erreur getReevaluationById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};