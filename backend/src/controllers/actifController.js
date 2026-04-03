// backend/src/controllers/actifController.js

const { Actif, Devise, CategorieAmortissement, User, AuditLog, Amortissement, Contrat, Depreciation, Mouvement, Anomalie, Facture, TauxChange } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const TauxService = require('../services/tauxService');
const factureService = require('../services/factureService');
const path = require('path');
const fs = require('fs');

// ==================== UTILITAIRES ====================

/**
 * Valide et formate une date pour PostgreSQL
 */
const validateDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Si c'est la chaîne "Invalid date", retourner null
  if (dateValue === 'Invalid date') {
    console.warn('⚠️ Date invalide détectée, remplacée par null');
    return null;
  }
  
  // Si c'est déjà une date valide au format YYYY-MM-DD
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Essayer de convertir en Date
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    console.warn(`⚠️ Format de date invalide: ${dateValue}`);
    return null;
  }
  
  return date.toISOString().split('T')[0];
};

// ==================== FONCTION DE CONVERSION ====================

const convertToCDF = async (montantDevise, deviseCode, dateAcquisition) => {
    if (deviseCode === 'CDF') {
        return { montant_cdf: montantDevise, taux_utilise: 1, date_taux: dateAcquisition };
    }
    
    // Trouver la devise
    const devise = await Devise.findOne({ where: { code: deviseCode } });
    if (!devise) {
        throw new Error(`Devise ${deviseCode} non trouvée`);
    }
    
    // Chercher le taux à la date d'acquisition
    let taux = await TauxChange.findOne({
        where: {
            devise_id: devise.id,
            date_taux: dateAcquisition
        }
    });
    
    // Si pas de taux exact, prendre le dernier taux avant cette date
    if (!taux) {
        taux = await TauxChange.findOne({
            where: {
                devise_id: devise.id,
                date_taux: { [Op.lte]: dateAcquisition }
            },
            order: [['date_taux', 'DESC']]
        });
    }
    
    if (!taux) {
        throw new Error(`Aucun taux de change trouvé pour ${deviseCode} à la date ${dateAcquisition}`);
    }
    
    const tauxValue = parseFloat(taux.taux_cdf);
    const montantCDF = montantDevise * tauxValue;
    
    return {
        montant_cdf: montantCDF,
        taux_utilise: tauxValue,
        date_taux: taux.date_taux
    };
};

/**
 * Calcule l'amortissement (linéaire ou dégressif) pour un actif
 */
const calculerAmortissement = (actif) => {
  const { 
    cout_acquisition, 
    valeur_residuelle, 
    duree_utile_ans, 
    mode_amortissement,
    taux_amortissement 
  } = actif;
  
  const amortissements = [];
  const anneeBase = new Date(actif.date_acquisition).getFullYear();
  let valeurRestante = parseFloat(cout_acquisition);
  let cumul = 0;
  
  // Correction du taux pour dégressif
  let tauxEffectif = taux_amortissement ? parseFloat(taux_amortissement) : 100 / duree_utile_ans;
  
  // Coefficient dégressif (selon durée)
  let coefficient = 1;
  if (mode_amortissement === 'degressif') {
    if (duree_utile_ans <= 3) coefficient = 1.5;
    else if (duree_utile_ans <= 5) coefficient = 2;
    else coefficient = 2.5;
    tauxEffectif = tauxEffectif * coefficient;
  }
  
  console.log(`📊 Calcul amortissement ${mode_amortissement}:`);
  console.log(`   - Valeur: ${valeurRestante} FC`);
  console.log(`   - Durée: ${duree_utile_ans} ans`);
  console.log(`   - Taux effectif: ${tauxEffectif}%`);
  
  for (let i = 0; i < duree_utile_ans; i++) {
    let annuite = 0;
    let taux = 0;
    
    if (mode_amortissement === 'lineaire') {
      // Amortissement linéaire
      annuite = (valeurRestante - valeur_residuelle) / (duree_utile_ans - i);
      taux = (100 / (duree_utile_ans - i)).toFixed(2);
    } else {
      // Amortissement dégressif
      annuite = valeurRestante * (tauxEffectif / 100);
      taux = tauxEffectif.toFixed(2);
      
      // Calcul de l'amortissement linéaire restant
      const anneesRestantes = duree_utile_ans - i;
      const annuiteLineaire = (valeurRestante - valeur_residuelle) / anneesRestantes;
      
      // Si l'annuité dégressive devient inférieure à l'annuité linéaire
      if (annuite < annuiteLineaire) {
        // Passer au mode linéaire pour le reste
        for (let j = i; j < duree_utile_ans; j++) {
          const restes = duree_utile_ans - j;
          const annuiteLin = (valeurRestante - valeur_residuelle) / restes;
          const tauxLin = (100 / restes).toFixed(2);
          
          amortissements.push({
            exercice: anneeBase + j,
            annuite: parseFloat(annuiteLin.toFixed(2)),
            cumul_amortissements: cumul + annuiteLin,
            valeur_nette: valeurRestante - annuiteLin,
            taux: parseFloat(tauxLin)
          });
          cumul += annuiteLin;
          valeurRestante -= annuiteLin;
        }
        return amortissements;
      }
    }
    
    // Éviter de dépasser la valeur résiduelle
    if (valeurRestante - annuite < valeur_residuelle) {
      annuite = valeurRestante - valeur_residuelle;
      if (annuite < 0) annuite = 0;
    }
    
    cumul += annuite;
    valeurRestante -= annuite;
    
    amortissements.push({
      exercice: anneeBase + i,
      annuite: parseFloat(annuite.toFixed(2)),
      cumul_amortissements: parseFloat(cumul.toFixed(2)),
      valeur_nette: parseFloat(valeurRestante.toFixed(2)),
      taux: parseFloat(taux)
    });
    
    // Arrêter si valeur atteinte
    if (valeurRestante <= valeur_residuelle) break;
  }
  
  return amortissements;
};

/**
 * Calcule l'amortissement linéaire simple
 */
const calculerAmortissementLineaire = (cout, valeurResiduelle, duree) => {
  return (cout - valeurResiduelle) / duree;
};

/**
 * Génère le plan d'amortissement pour un actif
 */
const genererPlanAmortissement = async (actif, transaction) => {
  const amortissements = [];
  
  // Récupérer les paramètres
  const cout = parseFloat(actif.cout_acquisition);
  const valeurResiduelle = parseFloat(actif.valeur_residuelle || 0);
  const duree = actif.duree_utile_ans;
  const mode = actif.mode_amortissement;
  let taux = actif.taux_amortissement ? parseFloat(actif.taux_amortissement) : null;
  
  const anneeBase = new Date(actif.date_acquisition).getFullYear();
  
  console.log('=== GÉNÉRATION PLAN AMORTISSEMENT ===');
  console.log(`Actif: ${actif.code} - ${actif.nom}`);
  console.log(`Mode: ${mode}`);
  console.log(`Coût: ${cout} FC`);
  console.log(`Valeur résiduelle: ${valeurResiduelle} FC`);
  console.log(`Durée: ${duree} ans`);
  console.log(`Taux: ${taux}%`);
  
  let resultats = [];
  
  if (mode === 'lineaire') {
    // ========== AMORTISSEMENT LINÉAIRE ==========
    const annuite = (cout - valeurResiduelle) / duree;
    let cumul = 0;
    let vnc = cout;
    
    for (let i = 0; i < duree; i++) {
      cumul += annuite;
      vnc = cout - cumul;
      const tauxCalc = (100 / duree).toFixed(2);
      
      resultats.push({
        exercice: anneeBase + i,
        annuite: parseFloat(annuite.toFixed(2)),
        cumul_amortissements: parseFloat(cumul.toFixed(2)),
        valeur_nette: parseFloat(vnc.toFixed(2)),
        taux: parseFloat(tauxCalc)
      });
    }
  } 
  else if (mode === 'degressif') {
    // ========== AMORTISSEMENT DÉGRESSIF CORRIGÉ ==========
    
    // Calculer le coefficient selon la durée
    let coefficient = 1.5;
    if (duree <= 4) coefficient = 1.5;
    else if (duree <= 6) coefficient = 2;
    else coefficient = 2.5;
    
    // Calculer le taux dégressif
    const tauxLineaire = 100 / duree;
    let tauxDegressif = tauxLineaire * coefficient;
    
    // Utiliser le taux personnalisé s'il existe
    if (taux && taux > 0) {
      tauxDegressif = taux;
    }
    
    console.log(`Coefficient dégressif: ${coefficient}`);
    console.log(`Taux linéaire: ${tauxLineaire}%`);
    console.log(`Taux dégressif: ${tauxDegressif}%`);
    
    let vnc = cout;
    let cumul = 0;
    let passageLineaire = false;
    
    for (let i = 0; i < duree; i++) {
      let annuite = 0;
      let tauxActuel = 0;
      const anneesRestantes = duree - i;
      
      if (!passageLineaire) {
        // Calcul dégressif
        annuite = vnc * (tauxDegressif / 100);
        tauxActuel = tauxDegressif;
        
        // Calcul de l'annuité linéaire restante
        const annuiteLineaire = (vnc - valeurResiduelle) / anneesRestantes;
        
        // Vérifier si on doit passer au linéaire
        if (annuite <= annuiteLineaire) {
          passageLineaire = true;
          console.log(`Passage au linéaire à l'année ${i + 1}`);
          annuite = annuiteLineaire;
          tauxActuel = (100 / anneesRestantes);
        }
      }
      
      if (passageLineaire) {
        // Calcul linéaire pour les années restantes
        const anneesRest = duree - i;
        annuite = (vnc - valeurResiduelle) / anneesRest;
        tauxActuel = (100 / anneesRest);
      }
      
      // S'assurer de ne pas dépasser la valeur résiduelle
      if (vnc - annuite < valeurResiduelle) {
        annuite = vnc - valeurResiduelle;
      }
      
      cumul += annuite;
      vnc -= annuite;
      
      resultats.push({
        exercice: anneeBase + i,
        annuite: parseFloat(annuite.toFixed(2)),
        cumul_amortissements: parseFloat(cumul.toFixed(2)),
        valeur_nette: parseFloat(vnc.toFixed(2)),
        taux: parseFloat(tauxActuel.toFixed(2))
      });
      
      if (vnc <= valeurResiduelle) break;
    }
  }
  
  console.log('=== RÉSULTAT ===');
  console.table(resultats);
  
  // Sauvegarder en base
  for (const r of resultats) {
    amortissements.push({
      actif_id: actif.id,
      exercice: r.exercice,
      annuite: r.annuite,
      cumul_amortissements: r.cumul_amortissements,
      valeur_nette: r.valeur_nette,
      taux: r.taux
    });
  }
  
  await Amortissement.bulkCreate(amortissements, { transaction });
  return amortissements;
};

// ==================== FONCTION DE LOG ====================

const logAction = async (userId, action, tableName, recordId, oldData = null, newData = null, ipAddress = null, operationDate = null) => {
  try {
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
    return true;
  } catch (error) {
    console.error('❌ Erreur logAction:', error);
    return false;
  }
};

// ==================== ROUTE DE PRÉVISUALISATION DE CONVERSION ====================

exports.previewConversion = async (req, res) => {
    try {
        const { montant, devise, date } = req.query;
        
        if (!montant || !devise) {
            return res.status(400).json({ message: 'Montant et devise requis' });
        }
        
        if (devise === 'CDF') {
            return res.json({
                montant_original: parseFloat(montant),
                devise_originale: devise,
                montant_cdf: parseFloat(montant),
                taux_utilise: 1
            });
        }
        
        const conversion = await TauxService.convertToCDF(parseFloat(montant), devise, date || new Date().toISOString().split('T')[0]);
        
        res.json({
            montant_original: parseFloat(montant),
            devise_originale: devise,
            montant_cdf: conversion.montant_cdf,
            taux_utilise: conversion.taux_utilise,
            date_taux: conversion.date_taux
        });
    } catch (error) {
        console.error('Erreur conversion:', error);
        res.status(500).json({ message: error.message });
    }
};

// ==================== CRUD OPTIMISÉ AVEC NOUVEAUX CHAMPS ====================

/**
 * Récupérer tous les actifs avec filtres
 * ✅ AJOUT : Filtre typeImmobilisation (corporel / incorporel)
 */
exports.getAllActifs = async (req, res) => {
  try {
    const { 
      type, 
      statut, 
      recherche, 
      typeImmobilisation, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    const where = {};
    
    // ✅ AJOUT D'UN LOG DÉTAILLÉ
    console.log('🔍 === BACKEND - PARAMÈTRES REÇUS ===');
    console.log('type:', type);
    console.log('typeImmobilisation:', typeImmobilisation);
    console.log('statut:', statut);
    console.log('recherche:', recherche);
    
    // Filtre par type d'actif
    if (type) {
      where.type = type;
      console.log('✅ Filtre type appliqué:', type);
    }
    
    // ✅ Filtre par nature (corporel / incorporel)
    if (typeImmobilisation) {
      where.type_immobilisation = typeImmobilisation;
      console.log('✅ Filtre nature appliqué:', typeImmobilisation);
    } else {
      console.log('⚠️ Aucun filtre nature appliqué (typeImmobilisation est undefined)');
    }
    
    // Filtre par statut
    if (statut === 'actif') {
      where.actif = true;
    } else if (statut === 'inactif') {
      where.actif = false;
    }
    
    // Filtre par recherche textuelle
    if (recherche) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${recherche}%` } },
        { nom: { [Op.iLike]: `%${recherche}%` } },
        { numero_inventaire: { [Op.iLike]: `%${recherche}%` } }
      ];
    }
    
    console.log('🔍 Condition WHERE finale:', JSON.stringify(where, null, 2));
    
    const { count, rows } = await Actif.findAndCountAll({
      where,
      attributes: [
        'id', 'code', 'nom', 'type', 'date_acquisition',
        'cout_acquisition', 'actif', 'created_at',
        'numero_inventaire', 'etat', 'localisation', 'affectation',
        'type_immobilisation', 'date_validite',
        'valeur_residuelle', 'duree_utile_ans', 'mode_amortissement',
        'taux_amortissement'
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      raw: true
    });
    
    console.log(`✅ ${rows.length} actifs trouvés`);
    console.log(`   - Corporel: ${rows.filter(a => a.type_immobilisation === 'corporel').length}`);
    console.log(`   - Incorporel: ${rows.filter(a => a.type_immobilisation === 'incorporel').length}`);
    
    res.json({ total: count, page: parseInt(page), limit: parseInt(limit), actifs: rows });
  } catch (error) {
    console.error('❌ getAllActifs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Récupérer un actif par ID avec toutes ses relations
 */
exports.getActifById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined') {
      console.error('❌ ID invalide reçu:', id);
      return res.status(400).json({ message: 'ID actif invalide' });
    }
    
    console.log(`🔍 Recherche actif avec ID: ${id}`);

    const actif = await Actif.findByPk(id, {
      attributes: { exclude: ['created_by', 'updated_by'] },
      include: [
        { model: Amortissement, attributes: ['exercice', 'annuite', 'cumul_amortissements', 'valeur_nette'] },
        { model: Contrat, attributes: ['id', 'numero_contrat', 'fournisseur', 'date_fin', 'montant'] },
        { model: Depreciation, attributes: ['date_test', 'valeur_recouvrable', 'provision'] },
        { 
          model: CategorieAmortissement, 
          as: 'categorie', 
          attributes: ['id', 'code_categorie', 'nom_categorie', 'duree_vie_ans', 'mode_amortissement_defaut', 'compte_comptable_defaut'] 
        },
        { model: Facture, as: 'facture', attributes: ['id', 'numero_facture', 'date_emission', 'montant_ttc', 'fichier_pdf'] },
        { model: User, as: 'createur', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'modificateur', attributes: ['id', 'full_name', 'email'] },
        { model: Devise, as: 'devise', attributes: ['id', 'code', 'nom', 'symbole', 'taux_achat', 'taux_vente', 'taux_moyen'] }
      ]
    });
    
    if (!actif) {
      console.log(`⚠️ Actif non trouvé pour ID: ${id}`);
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    // Ajouter les informations de conversion
    const response = actif.toJSON();
    if (actif.montant_devise && actif.devise) {
        response.conversion = {
            montant_original: `${actif.montant_devise} ${actif.devise.code}`,
            montant_cdf: actif.cout_acquisition,
            taux_utilise: actif.taux_change_utilisation,
            date_acquisition: actif.date_acquisition
        };
    }
    
    console.log(`✅ Actif trouvé: ${actif.code}`);
    res.json(response);
  } catch (error) {
    console.error('❌ Erreur getActifById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Créer un nouvel actif avec tous les champs
 * ✅ AJOUT : Génération automatique de la facture
 */
exports.createActif = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      code, nom, type, date_acquisition, cout_acquisition,
      devise_code, valeur_residuelle, duree_utile_ans,
      mode_amortissement, description, fournisseur,
      numero_facture, categorie_id, numero_inventaire,
      marque, modele, numero_serie, localisation, etat,
      affectation, type_immobilisation, date_validite,
      nombre_utilisateurs, support, compte_comptable,
      taux_amortissement, devise_id, montant_devise, taux_change_utilisation
    } = req.body;

    // Validation des dates
    const validDateAcquisition = validateDate(date_acquisition);
    const validDateValidite = validateDate(date_validite);
    
    if (!validDateAcquisition) {
      return res.status(400).json({ message: 'La date d\'acquisition est invalide' });
    }

    // Vérifier si le code existe déjà
    const existing = await Actif.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Code déjà utilisé' });
    }

    // Calculer le taux si non fourni
    let tauxFinal = taux_amortissement;
    if (!tauxFinal && duree_utile_ans > 0) {
      if (mode_amortissement === 'lineaire') {
        tauxFinal = 100 / duree_utile_ans;
      } else if (mode_amortissement === 'degressif') {
        const tauxLineaire = 100 / duree_utile_ans;
        let coefficient = 1.5;
        if (duree_utile_ans <= 4) coefficient = 1.5;
        else if (duree_utile_ans <= 6) coefficient = 2;
        else coefficient = 2.5;
        tauxFinal = tauxLineaire * coefficient;
      }
    }

    // Gestion de la conversion de devise
    let coutCDF = cout_acquisition;
    let tauxUtilise = null;
    let montantDeviseOriginal = null;
    let deviseIdFinal = devise_id;
    let deviseCodeFinal = devise_code;

    if (devise_code && devise_code !== 'CDF') {
        const conversion = await convertToCDF(cout_acquisition, devise_code, validDateAcquisition);
        coutCDF = conversion.montant_cdf;
        tauxUtilise = conversion.taux_utilise;
        montantDeviseOriginal = cout_acquisition;
        
        // Récupérer l'ID de la devise si non fourni
        if (!deviseIdFinal) {
            const devise = await Devise.findOne({ where: { code: devise_code } });
            if (devise) deviseIdFinal = devise.id;
        }
    } else if (devise_code === 'CDF') {
        coutCDF = cout_acquisition;
        montantDeviseOriginal = null;
        tauxUtilise = null;
    }

    // Créer l'actif
    const actif = await Actif.create({
      code, nom, type, 
      date_acquisition: validDateAcquisition,
      cout_acquisition: coutCDF,
      montant_devise: montantDeviseOriginal,
      devise_id: deviseIdFinal,
      taux_change_utilisation: tauxUtilise,
      valeur_residuelle: valeur_residuelle || 0,
      duree_utile_ans,
      mode_amortissement,
      taux_amortissement: tauxFinal,
      description,
      compte_comptable: compte_comptable || '205',
      numero_inventaire, marque, modele, numero_serie, localisation,
      fournisseur, etat: etat || 'bon', affectation, type_immobilisation: type_immobilisation || 'incorporel',
      date_validite: validDateValidite,
      nombre_utilisateurs: nombre_utilisateurs || null,
      support: support || null,
      categorie_id: categorie_id || null,
      numero_facture,
      created_by: req.user.id, 
      updated_by: req.user.id, 
      actif: true
    }, { transaction });

    // Générer le plan d'amortissement
    await genererPlanAmortissement(actif, transaction);
    
    // ✅ GÉNÉRER LA FACTURE
    let facture = null;
    try {
      // Récupérer la devise pour la facture
      let deviseCodeFacture = 'CDF';
      if (deviseIdFinal) {
        const devise = await Devise.findByPk(deviseIdFinal);
        if (devise) deviseCodeFacture = devise.code;
      } else if (devise_code) {
        deviseCodeFacture = devise_code;
      }
      
      // Générer le PDF
      const cheminFacture = await factureService.genererFacture(actif, req.user, deviseCodeFacture);
      
      // Calculer les montants
      const montantHt = montantDeviseOriginal ? parseFloat(montantDeviseOriginal) : parseFloat(cout_acquisition);
      const tva = montantHt * 0.16; // TVA à 16%
      const montantTtc = montantHt + tva;
      
      // Créer l'enregistrement facture
      const numeroFactureGen = `FAC-${new Date().getFullYear()}-${actif.id.split('-')[0].toUpperCase()}`;
      
      facture = await Facture.create({
        numero_facture: numeroFactureGen,
        actif_id: actif.id,
        date_emission: new Date(),
        montant_ht: montantHt,
        montant_tva: tva,
        montant_ttc: montantTtc,
        devise: deviseCodeFacture,
        fichier_pdf: cheminFacture,
        created_by: req.user.id
      }, { transaction });
      
      console.log(`✅ Facture générée: ${numeroFactureGen}`);
    } catch (factureErr) {
      console.error('⚠️ Erreur lors de la génération de la facture:', factureErr.message);
      // On continue sans facture en cas d'erreur (ne pas bloquer la création de l'actif)
    }
    
    await transaction.commit();

    // Log d'audit
    await logAction(
      req.user.id,
      'CREATE',
      'actifs',
      actif.id,
      null,
      { code, nom, type, date_acquisition: validDateAcquisition, cout_acquisition: coutCDF, montant_devise: montantDeviseOriginal, devise_code, numero_facture },
      req.ip,
      new Date(validDateAcquisition)
    );

    const actifComplet = await Actif.findByPk(actif.id, {
      include: [
        { 
          model: CategorieAmortissement, 
          as: 'categorie',
          attributes: ['id', 'code_categorie', 'nom_categorie', 'duree_vie_ans', 'mode_amortissement_defaut']
        },
        { model: Devise, as: 'devise', attributes: ['id', 'code', 'nom', 'symbole', 'taux_achat', 'taux_vente', 'taux_moyen'] },
        { model: User, as: 'createur', attributes: ['id', 'full_name', 'email'] }
      ]
    });

    // Ajouter la facture dans la réponse si elle a été créée
    const responseData = actifComplet.toJSON();
    if (facture) {
      responseData.facture = facture;
    }
    
    // Ajouter les informations de conversion
    if (montantDeviseOriginal && devise_code) {
        responseData.conversion = {
            montant_original: `${montantDeviseOriginal} ${devise_code}`,
            montant_cdf: coutCDF,
            taux_utilise: tauxUtilise,
            date_acquisition: validDateAcquisition
        };
    }

    res.status(201).json(responseData);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ createActif:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Mettre à jour un actif
 */
exports.updateActif = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updateData = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) return res.status(404).json({ message: 'Actif non trouvé' });

    // Validation des dates dans les mises à jour
    if (updateData.date_acquisition) {
      updateData.date_acquisition = validateDate(updateData.date_acquisition);
    }
    if (updateData.date_validite) {
      updateData.date_validite = validateDate(updateData.date_validite);
    }

    const oldValues = {
      code: actif.code,
      nom: actif.nom,
      localisation: actif.localisation,
      affectation: actif.affectation,
      etat: actif.etat,
      date_validite: actif.date_validite,
      date_acquisition: actif.date_acquisition,
      cout_acquisition: actif.cout_acquisition
    };

    // Si le montant ou la devise change, recalculer
    if (updateData.cout_acquisition && updateData.devise_code) {
        if (updateData.devise_code !== 'CDF') {
            const conversion = await convertToCDF(
                updateData.cout_acquisition,
                updateData.devise_code,
                updateData.date_acquisition || actif.date_acquisition
            );
            updateData.cout_acquisition = conversion.montant_cdf;
            updateData.taux_change_utilisation = conversion.taux_utilise;
            updateData.montant_devise = updateData.cout_acquisition;
            
            const devise = await Devise.findOne({ where: { code: updateData.devise_code } });
            updateData.devise_id = devise ? devise.id : null;
        } else {
            updateData.cout_acquisition = updateData.cout_acquisition;
            updateData.montant_devise = null;
            updateData.devise_id = null;
            updateData.taux_change_utilisation = null;
        }
    }

    if (updateData.categorie_id && updateData.categorie_id !== actif.categorie_id) {
      const categorie = await CategorieAmortissement.findByPk(updateData.categorie_id);
      if (categorie) {
        updateData.duree_utile_ans = categorie.duree_vie_ans;
        updateData.mode_amortissement = categorie.mode_amortissement_defaut;
      }
    }

    updateData.updated_by = req.user.id;
    await actif.update(updateData, { transaction });

    const paramsChanged = 
      (updateData.cout_acquisition && updateData.cout_acquisition !== oldValues.cout_acquisition) ||
      (updateData.duree_utile_ans && updateData.duree_utile_ans !== actif.duree_utile_ans) ||
      (updateData.mode_amortissement && updateData.mode_amortissement !== actif.mode_amortissement) ||
      (updateData.valeur_residuelle !== undefined && updateData.valeur_residuelle !== actif.valeur_residuelle);

    if (paramsChanged) {
      await Amortissement.destroy({ where: { actif_id: id }, transaction });
      await genererPlanAmortissement(actif, transaction);
    }

    await transaction.commit();

    await logAction(
      req.user.id,
      'UPDATE',
      'actifs',
      actif.id,
      oldValues,
      updateData,
      req.ip,
      new Date()
    );

    const actifMaj = await Actif.findByPk(id, {
      include: [
        { 
          model: CategorieAmortissement, 
          as: 'categorie',
          attributes: ['id', 'code_categorie', 'nom_categorie', 'duree_vie_ans', 'mode_amortissement_defaut']
        },
        { model: Devise, as: 'devise', attributes: ['id', 'code', 'nom', 'symbole', 'taux_achat', 'taux_vente', 'taux_moyen'] }
      ]
    });

    res.json(actifMaj);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ updateActif:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Supprimer un actif
 */
exports.deleteActif = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const actif = await Actif.findByPk(id);
    
    if (!actif) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    const oldData = { ...actif.toJSON() };
    await actif.destroy({ transaction });
    await transaction.commit();

    await logAction(
      req.user.id,
      'DELETE',
      'actifs',
      id,
      oldData,
      null,
      req.ip,
      new Date()
    );

    res.json({ 
      message: 'Actif supprimé avec succès',
      id: id
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur deleteActif:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== AMORTISSEMENTS ====================

exports.getAmortissements = async (req, res) => {
  try {
    const { id } = req.params;
    const amortissements = await Amortissement.findAll({
      where: { actif_id: id },
      order: [['exercice', 'ASC']]
    });
    res.json(amortissements);
  } catch (error) {
    console.error('❌ getAmortissements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.recalculerAmortissements = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const actif = await Actif.findByPk(id);
    if (!actif) return res.status(404).json({ message: 'Actif non trouvé' });

    await Amortissement.destroy({ where: { actif_id: id }, transaction });
    await genererPlanAmortissement(actif, transaction);
    await transaction.commit();

    const nouveaux = await Amortissement.findAll({ 
      where: { actif_id: id }, 
      order: [['exercice', 'ASC']] 
    });
    
    await logAction(
      req.user.id,
      'RECALCUL',
      'actifs',
      id,
      null,
      { message: 'Recalcul des amortissements effectué' },
      req.ip,
      new Date()
    );
    
    res.json(nouveaux);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ recalculerAmortissements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== CONTRATS ====================

exports.getContrats = async (req, res) => {
  try {
    const { id } = req.params;
    const contrats = await Contrat.findAll({
      where: { actif_id: id },
      order: [['date_fin', 'ASC']]
    });
    res.json(contrats);
  } catch (error) {
    console.error('❌ getContrats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createContrat = async (req, res) => {
  try {
    const { id } = req.params;
    const contratData = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) return res.status(404).json({ message: 'Actif non trouvé' });

    const contrat = await Contrat.create({
      ...contratData,
      actif_id: id,
      created_by: req.user.id
    });

    await logAction(
      req.user.id,
      'CONTRAT_CREATE',
      'contrats',
      contrat.id,
      null,
      contratData,
      req.ip,
      new Date(contratData.date_debut)
    );

    res.status(201).json(contrat);
  } catch (error) {
    console.error('❌ createContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.updateContrat = async (req, res) => {
  try {
    const { contratId } = req.params;
    const updates = req.body;

    const contrat = await Contrat.findByPk(contratId);
    if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });

    const oldValues = {
      numero_contrat: contrat.numero_contrat,
      fournisseur: contrat.fournisseur,
      montant: contrat.montant
    };

    await contrat.update({ ...updates, updated_by: req.user.id });
    
    await logAction(
      req.user.id,
      'CONTRAT_UPDATE',
      'contrats',
      contratId,
      oldValues,
      updates,
      req.ip,
      new Date()
    );
    
    res.json(contrat);
  } catch (error) {
    console.error('❌ updateContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteContrat = async (req, res) => {
  try {
    const { contratId } = req.params;
    const contrat = await Contrat.findByPk(contratId);
    if (!contrat) return res.status(404).json({ message: 'Contrat non trouvé' });

    await contrat.destroy();
    
    await logAction(
      req.user.id,
      'CONTRAT_DELETE',
      'contrats',
      contratId,
      { numero_contrat: contrat.numero_contrat },
      null,
      req.ip,
      new Date()
    );
    
    res.json({ message: 'Contrat supprimé' });
  } catch (error) {
    console.error('❌ deleteContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== DÉPRÉCIATIONS ====================

exports.getDepreciations = async (req, res) => {
  try {
    const { id } = req.params;
    const depreciations = await Depreciation.findAll({
      where: { actif_id: id },
      order: [['date_test', 'DESC']]
    });
    res.json(depreciations);
  } catch (error) {
    console.error('❌ getDepreciations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createDepreciation = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { date_test, valeur_recouvrable, commentaire } = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) return res.status(404).json({ message: 'Actif non trouvé' });

    const dernierAmort = await Amortissement.findOne({
      where: { actif_id: id },
      order: [['exercice', 'DESC']]
    });

    const valeurComptable = dernierAmort ? dernierAmort.valeur_nette : actif.cout_acquisition;
    const provision = Math.max(0, valeurComptable - valeur_recouvrable);

    const depreciation = await Depreciation.create({
      actif_id: id,
      date_test,
      valeur_recouvrable,
      valeur_comptable: valeurComptable,
      provision,
      commentaire,
      created_by: req.user.id
    }, { transaction });

    if (provision > 0) {
      await actif.update({
        depreciation_actif: true,
        date_derniere_depreciation: date_test,
        montant_depreciation: provision
      }, { transaction });
    }

    await transaction.commit();

    await logAction(
      req.user.id,
      'DEPRECIATION',
      'actifs',
      id,
      { valeur_comptable: valeurComptable },
      { valeur_recouvrable, provision, commentaire },
      req.ip,
      new Date(date_test)
    );

    res.status(201).json(depreciation);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ createDepreciation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== SORTIES ====================

exports.enregistrerSortie = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { date_sortie, type_sortie, prix_cession, motif_sortie } = req.body;

    const actif = await Actif.findByPk(id);
    if (!actif) return res.status(404).json({ message: 'Actif non trouvé' });
    if (!actif.actif) return res.status(400).json({ message: 'Actif déjà inactif' });

    const dernierAmort = await Amortissement.findOne({
      where: { actif_id: id },
      order: [['exercice', 'DESC']]
    });

    const valeurNette = dernierAmort ? dernierAmort.valeur_nette : actif.cout_acquisition;
    const plusValue = (type_sortie === 'cession' && prix_cession) ? prix_cession - valeurNette : 0;

    const oldValues = {
      actif: actif.actif,
      valeur_nette: valeurNette
    };

    await actif.update({
      actif: false,
      date_sortie,
      type_sortie,
      prix_cession: prix_cession || null,
      plus_moins_value: plusValue,
      motif_sortie,
      updated_by: req.user.id
    }, { transaction });

    await transaction.commit();

    await logAction(
      req.user.id,
      'SORTIE',
      'actifs',
      id,
      oldValues,
      { date_sortie, type_sortie, prix_cession, plusValue, motif_sortie },
      req.ip,
      new Date(date_sortie)
    );

    res.json({
      message: 'Sortie enregistrée',
      actif: {
        id: actif.id,
        code: actif.code,
        nom: actif.nom,
        valeurNette,
        plusValue
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ enregistrerSortie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== RAPPORTS DE BASE ====================

exports.etatImmobilisations = async (req, res) => {
  try {
    const dateRef = req.query.date_arrete ? new Date(req.query.date_arrete) : new Date();

    const actifs = await Actif.findAll({
      where: { actif: true },
      include: [{
        model: Amortissement,
        as: 'Amortissements',
        where: { exercice: { [Op.lte]: dateRef.getFullYear() } },
        required: false
      }]
    });

    const etat = actifs.map(a => {
      const cumul = (a.Amortissements || []).reduce((s, am) => s + +am.annuite, 0);
      const vnc = Math.max(a.cout_acquisition - cumul, a.valeur_residuelle || 0);
      return {
        id: a.id, code: a.code, nom: a.nom, compte: a.compte_comptable || '205',
        date_acquisition: a.date_acquisition,
        valeur_brute: +a.cout_acquisition,
        amortissements_cumules: cumul,
        vnc,
        duree: a.duree_utile_ans,
        mode: a.mode_amortissement,
        depreciation: a.depreciation_actif,
        mt_depreciation: +a.montant_depreciation || 0
      };
    });

    const totals = etat.reduce((acc, a) => ({
      vb: acc.vb + a.valeur_brute,
      amort: acc.amort + a.amortissements_cumules,
      vnc: acc.vnc + a.vnc,
      depr: acc.depr + a.mt_depreciation
    }), { vb: 0, amort: 0, vnc: 0, depr: 0 });

    res.json({
      date_arrete: dateRef,
      total_valeur_brute: totals.vb,
      total_amortissements: totals.amort,
      total_vnc: totals.vnc,
      total_depreciations: totals.depr,
      actifs: etat
    });
  } catch (error) {
    console.error('❌ etatImmobilisations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.tableauAmortissements = async (req, res) => {
  try {
    const annee = req.query.exercice || new Date().getFullYear();

    const amortissements = await Amortissement.findAll({
      where: { exercice: annee },
      include: [{
        model: Actif,
        as: 'Actif',
        attributes: ['id', 'code', 'nom', 'type', 'cout_acquisition', 'compte_comptable']
      }],
      order: [['actif_id', 'ASC']]
    });

    res.json({
      exercice: annee,
      total_dotations: amortissements.reduce((s, a) => s + +a.annuite, 0),
      amortissements: amortissements.map(a => ({
        actif_id: a.actif_id,
        actif_code: a.Actif?.code || 'N/A',
        actif_nom: a.Actif?.nom || 'N/A',
        type: a.Actif?.type,
        compte: a.Actif?.compte_comptable || '205',
        valeur_brute: +a.Actif?.cout_acquisition || 0,
        annuite: +a.annuite,
        cumul: +a.cumul_amortissements,
        vnc: +a.valeur_nette
      }))
    });
  } catch (error) {
    console.error('❌ tableauAmortissements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalActifs, actifsActifs, totalValeurBrute, amortTotal, actifsAvecContrats] = await Promise.all([
      Actif.count(),
      Actif.count({ where: { actif: true } }),
      Actif.sum('cout_acquisition'),
      Amortissement.sum('annuite'),
      Actif.count({ include: [{ model: Contrat, as: 'Contrats', required: true }] })
    ]);

    res.json({
      total_actifs: totalActifs,
      actifs_actifs: actifsActifs,
      actifs_inactifs: totalActifs - actifsActifs,
      valeur_brute_totale: +totalValeurBrute || 0,
      amortissements_totaux: +amortTotal || 0,
      actifs_avec_contrats: actifsAvecContrats,
      taux_actifs_actifs: totalActifs ? ((actifsActifs / totalActifs) * 100).toFixed(2) + '%' : '0%'
    });
  } catch (error) {
    console.error('❌ getStats:', error);
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
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute'],
        [sequelize.fn('SUM', sequelize.col('valeur_nette')), 'valeurNette']
      ],
      group: ['categorie_id', 'categorie.id', 'categorie.nom_categorie']
    });

    const result = actifs.map(a => ({
      categorie_id: a.categorie_id,
      categorie_nom: a.categorie?.nom_categorie || 'Sans catégorie',
      nbActifs: parseInt(a.dataValues.nbActifs),
      valeurBrute: parseFloat(a.dataValues.valeurBrute) || 0,
      valeurNette: parseFloat(a.dataValues.valeurNette) || 0
    }));

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
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute'],
        [sequelize.fn('SUM', sequelize.col('valeur_nette')), 'valeurNette']
      ],
      group: ['localisation']
    });

    const result = actifs.map(a => ({
      localisation: a.localisation || 'Non spécifié',
      nbActifs: parseInt(a.dataValues.nbActifs),
      valeurBrute: parseFloat(a.dataValues.valeurBrute) || 0,
      valeurNette: parseFloat(a.dataValues.valeurNette) || 0
    }));

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
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'valeurBrute'],
        [sequelize.fn('SUM', sequelize.col('valeur_nette')), 'valeurNette']
      ],
      group: ['affectation']
    });

    const result = actifs.map(a => ({
      affectation: a.affectation || 'Non affecté',
      nbActifs: parseInt(a.dataValues.nbActifs),
      valeurBrute: parseFloat(a.dataValues.valeurBrute) || 0,
      valeurNette: parseFloat(a.dataValues.valeurNette) || 0
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur getEtatParService:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Plan d'amortissement prévisionnel vs réalisé
 */
exports.getAmortissementPrevisionnelVsRealise = async (req, res) => {
  try {
    const { annee_debut, annee_fin } = req.query;
    const debut = annee_debut || new Date().getFullYear();
    const fin = annee_fin || debut + 5;

    const actifs = await Actif.findAll({
      where: { actif: true },
      include: [{ model: Amortissement }]
    });

    const result = [];
    for (let an = debut; an <= fin; an++) {
      const annee = an;
      let previsionnel = 0;
      let realise = 0;
      actifs.forEach(actif => {
        const amort = actif.Amortissements?.find(a => a.exercice === annee);
        if (amort) {
          realise += parseFloat(amort.annuite);
          previsionnel += parseFloat(amort.annuite);
        }
      });
      result.push({ annee, previsionnel, realise });
    }
    res.json(result);
  } catch (error) {
    console.error('Erreur getAmortissementPrevisionnelVsRealise:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Suivi des investissements (budget vs réalisé)
 */
exports.getSuiviInvestissements = async (req, res) => {
  try {
    const actifs = await Actif.findAll({
      attributes: [
        [sequelize.fn('date_part', 'year', sequelize.col('date_acquisition')), 'annee'],
        [sequelize.fn('SUM', sequelize.col('cout_acquisition')), 'realise'],
      ],
      group: [sequelize.fn('date_part', 'year', sequelize.col('date_acquisition'))],
      order: [[sequelize.literal('annee'), 'ASC']]
    });

    const result = actifs.map(a => ({
      annee: parseInt(a.dataValues.annee),
      realise: parseFloat(a.dataValues.realise),
      budget: parseFloat(a.dataValues.realise) * 1.1
    }));

    res.json(result);
  } catch (error) {
    console.error('Erreur getSuiviInvestissements:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

/**
 * Alertes : fin de licence, échéance maintenance, bien non retrouvé
 */
exports.getAlertes = async (req, res) => {
  try {
    const now = new Date();
    const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dans90Jours = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // Alertes fin de licence (actifs incorporels avec date_validite)
    const finLicence = await Actif.findAll({
      where: {
        type_immobilisation: 'incorporel',
        date_validite: {
          [Op.between]: [now, dans30Jours]
        }
      },
      attributes: ['id', 'code', 'nom', 'date_validite']
    });

    let maintenance = [];
    try {
      maintenance = await Mouvement.findAll({
        where: {
          type_mouvement: { [Op.in]: ['maintenance', 'reparation'] },
          date_fin: { [Op.between]: [now, dans30Jours] }
        },
        include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
      });
    } catch (err) {
      console.log('⚠️ Modèle Mouvement non disponible:', err.message);
      maintenance = [];
    }

    let echeancesContrats = [];
    try {
      echeancesContrats = await Contrat.findAll({
        where: {
          date_fin: {
            [Op.between]: [now, dans90Jours]
          }
        },
        include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
      });
    } catch (err) {
      console.log('⚠️ Erreur récupération contrats:', err.message);
      echeancesContrats = [];
    }

    let nonRetrouve = [];
    try {
      nonRetrouve = await Anomalie.findAll({
        where: {
          type_anomalie: 'manquant',
          statut: { [Op.in]: ['signalé', 'en_cours'] }
        },
        include: [{ model: Actif, as: 'Actif', attributes: ['id', 'code', 'nom'] }]
      });
    } catch (err) {
      console.log('⚠️ Modèle Anomalie non disponible:', err.message);
      nonRetrouve = [];
    }

    const actifsEnMaintenance = await Actif.findAll({
      where: {
        actif: true,
        etat: { [Op.in]: ['reparation', 'hors_service'] }
      },
      attributes: ['id', 'code', 'nom', 'etat', 'localisation']
    });

    res.json({
      finLicence: finLicence.map(a => ({
        id: a.id,
        code: a.code,
        nom: a.nom,
        date: a.date_validite,
        type: 'licence',
        priorite: 'haute'
      })),
      maintenance: maintenance.map(m => ({
        id: m.Actif?.id,
        code: m.Actif?.code,
        nom: m.Actif?.nom,
        date: m.date_fin,
        type: 'maintenance',
        priorite: 'moyenne'
      })),
      echeancesContrats: echeancesContrats.map(c => ({
        id: c.Actif?.id,
        code: c.Actif?.code,
        nom: c.Actif?.nom,
        date: c.date_fin,
        type: 'contrat',
        contrat_id: c.id,
        priorite: new Date(c.date_fin) < dans30Jours ? 'haute' : 'moyenne'
      })),
      actifsEnMaintenance: actifsEnMaintenance.map(a => ({
        id: a.id,
        code: a.code,
        nom: a.nom,
        etat: a.etat,
        localisation: a.localisation,
        type: 'etat',
        priorite: a.etat === 'hors_service' ? 'critique' : 'moyenne'
      })),
      anomalies: nonRetrouve.map(a => ({
        id: a.Actif?.id,
        code: a.Actif?.code,
        nom: a.Actif?.nom,
        date: a.date_constat,
        type: 'manquant',
        priorite: 'haute'
      }))
    });
  } catch (error) {
    console.error('❌ Erreur getAlertes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== RECHERCHE PAR CODE ====================

/**
 * Récupérer un actif par son code ou numéro d'inventaire
 */
exports.getActifByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const actif = await Actif.findOne({
      where: {
        [Op.or]: [
          { code },
          { numero_inventaire: code }
        ]
      },
      include: [
        { model: Amortissement, limit: 1, order: [['exercice', 'DESC']] }
      ]
    });
    if (!actif) return res.status(404).json({ message: 'Actif non trouvé' });
    res.json(actif);
  } catch (error) {
    console.error('Erreur getActifByCode:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== GESTION DES FACTURES ====================

/**
 * Récupérer la facture d'un actif
 * GET /api/actifs/:id/facture
 */
exports.getFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const Facture = require('../models').Facture;
    const Actif = require('../models').Actif;
    const Devise = require('../models').Devise;
    
    // Récupérer l'actif avec sa devise
    const actif = await Actif.findByPk(id, {
      include: [
        { model: Devise, as: 'devise', attributes: ['code', 'nom', 'symbole'] }
      ],
      attributes: [
        'id', 'code', 'nom', 'date_acquisition', 
        'cout_acquisition', 'montant_devise', 
        'devise_id', 'taux_change_utilisation', 'numero_facture',
        'fournisseur', 'type_immobilisation'
      ]
    });
    
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    // Récupérer la facture si elle existe
    let facture = await Facture.findOne({ 
      where: { actif_id: id },
      raw: true
    });
    
    // ✅ CORRECTION : Utiliser la devise d'origine pour les montants
    const deviseCode = actif.devise?.code || 'CDF';
    const deviseSymbole = actif.devise?.symbole || 'FC';
    
    // Montant en devise d'origine (USD, EUR, etc.)
    const montantDeviseOrigine = actif.montant_devise || actif.cout_acquisition;
    const tauxChange = actif.taux_change_utilisation || 1;
    
    // Si la facture n'existe pas, créer une structure de facture virtuelle
    if (!facture) {
      facture = {
        numero_facture: actif.numero_facture || `FAC-${actif.code}`,
        date_emission: actif.date_acquisition,
        montant_ht: montantDeviseOrigine,
        montant_tva: montantDeviseOrigine * 0.16, // TVA à 16%
        montant_ttc: montantDeviseOrigine * 1.16,
        devise: deviseCode,
        taux_change_cdf: tauxChange,
        montant_cdf: actif.cout_acquisition
      };
    }
    
    // ✅ Ajouter les informations de conversion à la réponse
    const response = {
      ...facture,
      actif: {
        id: actif.id,
        code: actif.code,
        nom: actif.nom,
        fournisseur: actif.fournisseur,
        type: actif.type_immobilisation,
        date_acquisition: actif.date_acquisition
      },
      conversion: {
        devise_originale: deviseCode,
        symbole: deviseSymbole,
        montant_devise: montantDeviseOrigine,
        taux_change: tauxChange,
        montant_cdf: actif.cout_acquisition,
        date_taux: actif.date_acquisition
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Erreur getFacture:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de la facture',
      error: error.message 
    });
  }
};

/**
 * Télécharger la facture PDF d'un actif
 * GET /api/actifs/:id/facture/download
 */
exports.downloadFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const Facture = require('../models').Facture;
    const Actif = require('../models').Actif;
    const Devise = require('../models').Devise;
    const fs = require('fs');
    const path = require('path');
    
    // Récupérer l'actif avec sa devise
    const actif = await Actif.findByPk(id, {
      include: [
        { model: Devise, as: 'devise', attributes: ['code', 'nom', 'symbole'] }
      ]
    });
    
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    // Récupérer la facture
    let facture = await Facture.findOne({ where: { actif_id: id } });
    
    // Si la facture n'existe pas, en générer une virtuelle
    if (!facture) {
      const deviseCode = actif.devise?.code || 'CDF';
      const montantDevise = actif.montant_devise || actif.cout_acquisition;
      
      facture = {
        numero_facture: actif.numero_facture || `FAC-${actif.code}`,
        date_emission: actif.date_acquisition,
        montant_ht: montantDevise,
        montant_tva: montantDevise * 0.16,
        montant_ttc: montantDevise * 1.16,
        devise: deviseCode,
        taux_change_cdf: actif.taux_change_utilisation || 1,
        montant_cdf: actif.cout_acquisition,
        fichier_pdf: null
      };
    }
    
    // Si un fichier PDF existe, le télécharger
    if (facture.fichier_pdf && fs.existsSync(path.join(__dirname, '../..', facture.fichier_pdf))) {
      const filePath = path.join(__dirname, '../..', facture.fichier_pdf);
      return res.download(filePath, `${facture.numero_facture}.pdf`);
    }
    
    // Sinon, générer un PDF à la volée avec les bons montants
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Définir les en-têtes de réponse
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture_${actif.code}.pdf"`);
    
    doc.pipe(res);
    
    // En-tête de la facture
    doc.fontSize(20).fillColor('#10b981').text('BANQUE CENTRALE DU CONGO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#0f172a').text('FACTURE D\'ACQUISITION', { align: 'center' });
    doc.moveDown();
    
    // Informations de la facture
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Facture N°: ${facture.numero_facture}`, { align: 'right' });
    doc.text(`Date d'émission: ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();
    
    // Informations de l'actif
    doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'acquisition', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Actif: ${actif.code} - ${actif.nom}`);
    doc.text(`Fournisseur: ${actif.fournisseur || 'Non spécifié'}`);
    doc.text(`Date d'acquisition: ${new Date(actif.date_acquisition).toLocaleDateString('fr-FR')}`);
    doc.moveDown();
    
    // ✅ DÉTAILS FINANCIERS AVEC LA DEVISE D'ORIGINE
    doc.fontSize(12).fillColor('#0f172a').text('Détails financiers', { underline: true });
    doc.moveDown(0.5);
    
    // Tableau des montants
    const startY = doc.y;
    const col1X = 50;
    const col2X = 350;
    
    doc.fontSize(10).fillColor('#475569');
    doc.text('Description', col1X, startY);
    doc.text('Montant', col2X, startY);
    doc.moveDown();
    
    const rowY = doc.y;
    doc.text('Montant HT', col1X, rowY);
    doc.text(`${facture.montant_ht.toLocaleString()} ${facture.devise}`, col2X, rowY);
    doc.moveDown();
    
    doc.text(`TVA (16%)`, col1X, doc.y);
    doc.text(`${facture.montant_tva.toLocaleString()} ${facture.devise}`, col2X, doc.y);
    doc.moveDown();
    
    doc.fontSize(12).fillColor('#10b981');
    doc.text('TOTAL TTC', col1X, doc.y);
    doc.text(`${facture.montant_ttc.toLocaleString()} ${facture.devise}`, col2X, doc.y);
    doc.moveDown(2);
    
    // ✅ SECTION CONVERSION (si la devise n'est pas CDF)
    if (facture.devise !== 'CDF') {
      doc.fontSize(10).fillColor('#64748b');
      doc.text('Conversion en Francs Congolais:', col1X, doc.y);
      doc.text(`Taux de change appliqué: 1 ${facture.devise} = ${facture.taux_change_cdf.toLocaleString()} CDF`, col1X, doc.y + 15);
      doc.text(`Montant en CDF: ${facture.montant_cdf.toLocaleString()} CDF`, col1X, doc.y + 30);
      doc.moveDown(2);
    }
    
    // Pied de page
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('Document officiel - Banque Centrale du Congo', 50, 750, { align: 'center' });
    doc.text('www.bcc.cd', 50, 765, { align: 'center' });
    
    doc.end();
    
  } catch (error) {
    console.error('❌ Erreur downloadFacture:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

/**
 * Télécharger la facture PDF d'un actif
 * GET /api/actifs/:id/facture/download
 */
exports.downloadFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const Facture = require('../models').Facture;
    const fs = require('fs');
    const path = require('path');
    
    const facture = await Facture.findOne({ where: { actif_id: id } });
    
    if (!facture) {
      return res.status(404).json({ message: 'Facture non trouvée pour cet actif' });
    }
    
    const filePath = path.join(__dirname, '../..', facture.fichier_pdf);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier PDF introuvable' });
    }
    
    res.download(filePath, `${facture.numero_facture}.pdf`);
  } catch (error) {
    console.error('❌ Erreur downloadFacture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};