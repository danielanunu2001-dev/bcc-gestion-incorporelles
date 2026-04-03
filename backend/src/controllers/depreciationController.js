// backend/src/controllers/depreciationController.js

const { Depreciation, Actif, User, AuditLog } = require('../models');
const { sequelize } = require('../models');

// ==================== UTILITAIRE DE LOG CORRIGÉ ====================
const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, req = null, operationDate = null) => {
  try {
    // ✅ Extraire l'IP correctement
    let ipAddress = null;
    if (req) {
      ipAddress = req.ip || 
                  req.connection?.remoteAddress || 
                  req.socket?.remoteAddress || 
                  (req.headers && req.headers['x-forwarded-for']?.split(',')[0]) || 
                  null;
    }
    
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress
    };
    
    if (operationDate) {
      logData.created_at = operationDate;
    }
    
    await AuditLog.create(logData);
    console.log(`✅ Log créé: ${action} sur ${tableName}/${recordId}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};

// ==================== ROUTES ====================

/**
 * Récupérer toutes les dépréciations d'un actif
 * GET /api/actifs/:actifId/depreciations
 */
exports.getDepreciations = async (req, res) => {
  try {
    // ✅ CORRECTION : Utiliser req.actifId (du middleware), pas req.params
    const { actifId } = req;
    
    console.log('🔍 getDepreciations appelé pour actif:', actifId);
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }
    
    const depreciations = await Depreciation.findAll({
      where: { actif_id: actifId },
      include: [{ 
        model: User, 
        as: 'createurDepreciation', 
        attributes: ['id', 'full_name', 'email'] 
      }],
      order: [['date_test', 'DESC']]
    });
    
    console.log(`✅ ${depreciations.length} dépréciations trouvées`);
    res.json(depreciations);
  } catch (error) {
    console.error('❌ Erreur getDepreciations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer une dépréciation par ID
 * GET /api/actifs/:actifId/depreciations/:id
 */
exports.getDepreciationById = async (req, res) => {
  try {
    const { id } = req.params;
    const { actifId } = req;  // ✅ CORRECTION : Utiliser req.actifId
    
    console.log('🔍 getDepreciationById appelé:', { actifId, depreciationId: id });
    
    const depreciation = await Depreciation.findOne({
      where: {
        id: id,
        actif_id: actifId
      },
      include: [{ model: User, as: 'createurDepreciation', attributes: ['id', 'full_name', 'email'] }]
    });
    
    if (!depreciation) {
      return res.status(404).json({ message: 'Dépréciation non trouvée' });
    }
    
    res.json(depreciation);
  } catch (error) {
    console.error('❌ Erreur getDepreciationById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Créer une nouvelle dépréciation
 * POST /api/actifs/:actifId/depreciations
 */
exports.createDepreciation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { actifId } = req;  // ✅ CORRECTION : Utiliser req.actifId
    const { date_test, valeur_recouvrable, commentaire } = req.body;

    const actif = await Actif.findByPk(actifId, { transaction });
    if (!actif) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    // Récupérer la valeur comptable (dernier amortissement ou coût d'acquisition)
    const dernierAmort = await Depreciation.sequelize.models.Amortissement.findOne({
      where: { actif_id: actifId },
      order: [['exercice', 'DESC']],
      transaction
    });

    const valeur_comptable = dernierAmort ? dernierAmort.valeur_nette : actif.cout_acquisition;
    const provision = Math.max(0, valeur_comptable - valeur_recouvrable);

    const depreciation = await Depreciation.create({
      actif_id: actifId,
      date_test,
      valeur_recouvrable,
      valeur_comptable,
      provision,
      commentaire,
      created_by: req.user.id
    }, { transaction });

    // Mettre à jour l'actif si provision > 0
    if (provision > 0) {
      await actif.update({
        depreciation_actif: true,
        date_derniere_depreciation: date_test,
        montant_depreciation: provision
      }, { transaction });
    }

    await transaction.commit();

    console.log(`✅ Dépréciation créée pour actif ${actifId}, provision: ${provision}`);

    // ✅ LOG D'AUDIT : Création de dépréciation
    await logAction(
      req.user.id,
      'DEPRECIATION_CREATE',
      'depreciations',
      depreciation.id,
      null,
      {
        actif_id: actifId,
        date_test,
        valeur_recouvrable,
        valeur_comptable,
        provision,
        commentaire
      },
      req,
      new Date(date_test)
    );

    // Recharger avec l'utilisateur
    const nouvelleDepreciation = await Depreciation.findByPk(depreciation.id, {
      include: [{ model: User, as: 'createurDepreciation', attributes: ['id', 'full_name', 'email'] }]
    });

    res.status(201).json(nouvelleDepreciation);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createDepreciation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Mettre à jour une dépréciation
 * PUT /api/actifs/:actifId/depreciations/:id
 */
exports.updateDepreciation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { actifId } = req;  // ✅ CORRECTION : Utiliser req.actifId
    const { date_test, valeur_recouvrable, commentaire } = req.body;

    const depreciation = await Depreciation.findOne({
      where: {
        id: id,
        actif_id: actifId
      },
      transaction
    });
    
    if (!depreciation) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Dépréciation non trouvée' });
    }

    // Sauvegarder les anciennes valeurs pour le log
    const oldData = {
      date_test: depreciation.date_test,
      valeur_recouvrable: depreciation.valeur_recouvrable,
      provision: depreciation.provision,
      commentaire: depreciation.commentaire
    };

    // Recalcul de la provision si nécessaire
    let updateData = { date_test, valeur_recouvrable, commentaire };
    if (valeur_recouvrable !== undefined && valeur_recouvrable !== depreciation.valeur_recouvrable) {
      const actif = await Actif.findByPk(actifId, { transaction });
      const dernierAmort = await Depreciation.sequelize.models.Amortissement.findOne({
        where: { actif_id: actifId },
        order: [['exercice', 'DESC']],
        transaction
      });
      const valeur_comptable = dernierAmort ? dernierAmort.valeur_nette : actif.cout_acquisition;
      updateData.provision = Math.max(0, valeur_comptable - valeur_recouvrable);
    }

    await depreciation.update(updateData, { transaction });

    await transaction.commit();

    console.log(`✅ Dépréciation mise à jour: ${id}`);

    // ✅ LOG D'AUDIT : Modification de dépréciation
    await logAction(
      req.user.id,
      'DEPRECIATION_UPDATE',
      'depreciations',
      id,
      oldData,
      {
        date_test: depreciation.date_test,
        valeur_recouvrable: depreciation.valeur_recouvrable,
        provision: depreciation.provision,
        commentaire: depreciation.commentaire
      },
      req,
      new Date()
    );

    res.json(depreciation);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur updateDepreciation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprimer une dépréciation
 * DELETE /api/actifs/:actifId/depreciations/:id
 */
exports.deleteDepreciation = async (req, res) => {
  try {
    console.log('========== DELETE DEPRECIATION ==========');
    console.log('📦 req.params:', req.params);
    console.log('📦 req.actifId:', req.actifId);
    console.log('📦 req.user:', req.user?.id);
    
    const { id } = req.params;
    const { actifId } = req;  // ✅ CORRECTION : Utiliser req.actifId
    
    console.log('📦 IDs extraits:', { actifId, depreciationId: id });
    
    if (!actifId || !id) {
      console.log('❌ IDs manquants:', { actifId, id });
      return res.status(400).json({ 
        message: 'IDs manquants', 
        actifId, 
        depreciationId: id 
      });
    }
    
    // Vérifier que la dépréciation existe
    const depreciation = await Depreciation.findOne({
      where: {
        id: id,
        actif_id: actifId
      }
    });
    
    if (!depreciation) {
      console.log('❌ Dépréciation non trouvée');
      return res.status(404).json({ message: 'Dépréciation non trouvée' });
    }
    
    console.log('✅ Dépréciation trouvée:', depreciation.id);
    
    const oldData = {
      date_test: depreciation.date_test,
      valeur_recouvrable: depreciation.valeur_recouvrable,
      provision: depreciation.provision,
      commentaire: depreciation.commentaire
    };
    
    await depreciation.destroy();
    
    // Log d'audit
    await logAction(
      req.user.id,
      'DEPRECIATION_DELETE',
      'depreciations',
      id,
      oldData,
      null,
      req,
      new Date()
    );
    
    console.log('✅ Dépréciation supprimée avec succès');
    res.json({ message: 'Dépréciation supprimée avec succès' });
    
  } catch (error) {
    console.error('❌ Erreur deleteDepreciation:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};