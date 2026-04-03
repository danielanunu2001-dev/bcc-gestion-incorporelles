// backend/src/controllers/mouvementController.js

const { Mouvement, Actif, User, AuditLog } = require('../models');
const { Op } = require('sequelize');

// ==================== UTILITAIRE DE LOG ====================
const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, ipAddress = null) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      ip_address: ipAddress
    });
    console.log(`✅ Log créé: ${action} sur ${tableName}/${recordId}`);
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};

/**
 * Récupérer tous les mouvements d'un actif
 */
exports.getMouvements = async (req, res) => {
  try {
    const { actifId } = req;
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }
    
    const mouvements = await Mouvement.findAll({
      where: { actif_id: actifId },
      include: [
        { model: User, as: 'createur', attributes: ['id', 'full_name'] },
        { model: User, as: 'validateur', attributes: ['id', 'full_name'] }
      ],
      order: [['date_mouvement', 'DESC']]
    });
    
    res.json(mouvements);
  } catch (error) {
    console.error('❌ Erreur getMouvements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer un mouvement par ID
 */
exports.getMouvementById = async (req, res) => {
  try {
    const actifId = req.actifId;
    const { mouvementId } = req.params;
    
    if (!actifId || !mouvementId) {
      return res.status(400).json({ message: 'IDs manquants' });
    }
    
    const mouvement = await Mouvement.findOne({
      where: {
        id: mouvementId,
        actif_id: actifId
      },
      include: [
        { model: User, as: 'createur', attributes: ['id', 'full_name'] },
        { model: User, as: 'validateur', attributes: ['id', 'full_name'] }
      ]
    });
    
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    res.json(mouvement);
  } catch (error) {
    console.error('❌ Erreur getMouvementById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Créer un nouveau mouvement
 */
exports.createMouvement = async (req, res) => {
  try {
    const actifId = req.actifId;
    const mouvementData = req.body;
    
    console.log('📦 Données reçues pour mouvement:', mouvementData);
    
    // Vérifier que l'actif existe
    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    // Construction des données
    const dataToCreate = {
      actif_id: actifId,
      type_mouvement: mouvementData.type_mouvement,
      date_mouvement: mouvementData.date_mouvement,
      description: mouvementData.description || 'Aucune description',
      statut: 'brouillon',
      created_by: req.user.id
    };
    
    // Ajouter les champs optionnels
    if (mouvementData.localisation_source) dataToCreate.localisation_source = mouvementData.localisation_source;
    if (mouvementData.localisation_destination) dataToCreate.localisation_destination = mouvementData.localisation_destination;
    if (mouvementData.nouvel_etat) dataToCreate.nouvel_etat = mouvementData.nouvel_etat;
    if (mouvementData.nouvelle_localisation) dataToCreate.nouvelle_localisation = mouvementData.nouvelle_localisation;
    if (mouvementData.nouvelle_affectation) dataToCreate.nouvelle_affectation = mouvementData.nouvelle_affectation;
    if (mouvementData.provenance) dataToCreate.provenance = mouvementData.provenance;
    if (mouvementData.document_reference) dataToCreate.document_reference = mouvementData.document_reference;
    if (mouvementData.cout_maintenance) dataToCreate.cout_maintenance = mouvementData.cout_maintenance;
    if (mouvementData.fournisseur_maintenance) dataToCreate.fournisseur_maintenance = mouvementData.fournisseur_maintenance;
    if (mouvementData.duree_maintenance) dataToCreate.duree_maintenance = mouvementData.duree_maintenance;
    if (mouvementData.prix_cession) dataToCreate.prix_cession = mouvementData.prix_cession;
    if (mouvementData.acquereur) dataToCreate.acquereur = mouvementData.acquereur;
    if (mouvementData.plus_moins_value) dataToCreate.plus_moins_value = mouvementData.plus_moins_value;
    
    console.log('📦 Données à créer:', JSON.stringify(dataToCreate, null, 2));
    
    const mouvement = await Mouvement.create(dataToCreate);
    
    console.log('✅ Mouvement créé:', mouvement.id);

    // ✅ LOG D'AUDIT : Création de mouvement
    await logAction(
      req.user.id,
      'MOUVEMENT_CREATE',
      'mouvements',
      mouvement.id,
      null,
      {
        type_mouvement: mouvement.type_mouvement,
        date_mouvement: mouvement.date_mouvement,
        description: mouvement.description,
        statut: mouvement.statut
      },
      req.ip
    );
    
    res.status(201).json(mouvement);
    
  } catch (error) {
    console.error('❌ Erreur createMouvement:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

/**
 * Mettre à jour un mouvement
 */
exports.updateMouvement = async (req, res) => {
  try {
    const actifId = req.actifId;
    const { mouvementId } = req.params;
    const updates = req.body;
    
    if (!actifId || !mouvementId) {
      return res.status(400).json({ message: 'IDs manquants' });
    }
    
    const mouvement = await Mouvement.findOne({
      where: {
        id: mouvementId,
        actif_id: actifId
      }
    });
    
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    // Ne pas modifier un mouvement déjà validé
    if (mouvement.statut === 'valide') {
      return res.status(400).json({ message: 'Impossible de modifier un mouvement validé' });
    }
    
    // Sauvegarder les anciennes valeurs
    const oldData = {
      type_mouvement: mouvement.type_mouvement,
      date_mouvement: mouvement.date_mouvement,
      description: mouvement.description,
      statut: mouvement.statut
    };
    
    await mouvement.update({ ...updates, updated_by: req.user.id });
    
    // ✅ LOG D'AUDIT : Modification de mouvement
    await logAction(
      req.user.id,
      'MOUVEMENT_UPDATE',
      'mouvements',
      mouvementId,
      oldData,
      {
        type_mouvement: mouvement.type_mouvement,
        date_mouvement: mouvement.date_mouvement,
        description: mouvement.description
      },
      req.ip
    );
    
    res.json(mouvement);
  } catch (error) {
    console.error('❌ Erreur updateMouvement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Valider un mouvement
 */
exports.validerMouvement = async (req, res) => {
  try {
    const actifId = req.actifId;
    const { mouvementId } = req.params;
    
    if (!actifId || !mouvementId) {
      return res.status(400).json({ message: 'IDs manquants' });
    }
    
    const mouvement = await Mouvement.findOne({
      where: {
        id: mouvementId,
        actif_id: actifId
      }
    });
    
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    if (mouvement.statut === 'valide') {
      return res.status(400).json({ message: 'Ce mouvement est déjà validé' });
    }
    
    const oldData = { statut: mouvement.statut };
    
    await mouvement.update({
      statut: 'valide',
      date_validation: new Date(),
      valide_par: req.user.id,
      updated_by: req.user.id
    });
    
    // Mettre à jour l'actif si nécessaire
    await mettreAJourActif(actifId, mouvement);
    
    // ✅ LOG D'AUDIT : Validation de mouvement
    await logAction(
      req.user.id,
      'MOUVEMENT_VALIDER',
      'mouvements',
      mouvementId,
      oldData,
      { statut: 'valide' },
      req.ip
    );
    
    res.json({ message: 'Mouvement validé avec succès', mouvement });
  } catch (error) {
    console.error('❌ Erreur validerMouvement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Annuler un mouvement
 */
exports.annulerMouvement = async (req, res) => {
  try {
    const actifId = req.actifId;
    const { mouvementId } = req.params;
    
    if (!actifId || !mouvementId) {
      return res.status(400).json({ message: 'IDs manquants' });
    }
    
    const mouvement = await Mouvement.findOne({
      where: {
        id: mouvementId,
        actif_id: actifId
      }
    });
    
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    if (mouvement.statut === 'valide') {
      return res.status(400).json({ message: 'Impossible d\'annuler un mouvement validé' });
    }
    
    const oldData = { statut: mouvement.statut };
    
    await mouvement.update({
      statut: 'annule',
      date_annulation: new Date(),
      annule_par: req.user.id,
      updated_by: req.user.id
    });
    
    // ✅ LOG D'AUDIT : Annulation de mouvement
    await logAction(
      req.user.id,
      'MOUVEMENT_ANNULER',
      'mouvements',
      mouvementId,
      oldData,
      { statut: 'annule' },
      req.ip
    );
    
    res.json({ message: 'Mouvement annulé avec succès', mouvement });
  } catch (error) {
    console.error('❌ Erreur annulerMouvement:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprimer un mouvement
 */
exports.deleteMouvement = async (req, res) => {
  try {
    const actifId = req.actifId;
    const { mouvementId } = req.params;
    
    console.log('🗑️ Suppression mouvement:', { actifId, mouvementId });
    
    if (!actifId || !mouvementId) {
      return res.status(400).json({ message: 'IDs manquants' });
    }
    
    const mouvement = await Mouvement.findOne({
      where: {
        id: mouvementId,
        actif_id: actifId
      }
    });
    
    if (!mouvement) {
      return res.status(404).json({ message: 'Mouvement non trouvé' });
    }
    
    // Empêcher la suppression d'un mouvement déjà validé
    if (mouvement.statut === 'valide') {
      return res.status(400).json({ message: 'Impossible de supprimer un mouvement validé' });
    }
    
    const oldData = {
      type_mouvement: mouvement.type_mouvement,
      date_mouvement: mouvement.date_mouvement,
      description: mouvement.description,
      statut: mouvement.statut
    };
    
    await mouvement.destroy();
    
    console.log('✅ Mouvement supprimé avec succès');

    // ✅ LOG D'AUDIT : Suppression de mouvement
    await logAction(
      req.user.id,
      'MOUVEMENT_DELETE',
      'mouvements',
      mouvementId,
      oldData,
      null,
      req.ip
    );
    
    res.json({ message: 'Mouvement supprimé avec succès' });
    
  } catch (error) {
    console.error('❌ Erreur deleteMouvement:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

/**
 * Fonction utilitaire pour mettre à jour l'actif selon le mouvement
 */
async function mettreAJourActif(actifId, mouvement) {
  try {
    const actif = await Actif.findByPk(actifId);
    if (!actif) return;
    
    // Mettre à jour l'affectation si changement
    if (mouvement.nouvelle_affectation) {
      await actif.update({ affectation: mouvement.nouvelle_affectation });
    }
    
    // Mettre à jour la localisation si changement
    if (mouvement.nouvelle_localisation) {
      await actif.update({ localisation: mouvement.nouvelle_localisation });
    }
    
    // Mettre à jour l'état si changement
    if (mouvement.nouvel_etat) {
      await actif.update({ etat: mouvement.nouvel_etat });
    }
    
    console.log(`✅ Actif ${actifId} mis à jour suite au mouvement`);
  } catch (error) {
    console.error('❌ Erreur mise à jour actif:', error);
  }
}