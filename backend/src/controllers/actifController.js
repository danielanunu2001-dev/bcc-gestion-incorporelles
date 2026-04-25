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
  
  if (dateValue === 'Invalid date') {
    console.warn('⚠️ Date invalide détectée, remplacée par null');
    return null;
  }
  
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) {
    console.warn(`⚠️ Format de date invalide: ${dateValue}`);
    return null;
  }
  
  return date.toISOString().split('T')[0];
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
  
  let tauxEffectif = taux_amortissement ? parseFloat(taux_amortissement) : 100 / duree_utile_ans;
  
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
      annuite = (valeurRestante - valeur_residuelle) / (duree_utile_ans - i);
      taux = (100 / (duree_utile_ans - i)).toFixed(2);
    } else {
      annuite = valeurRestante * (tauxEffectif / 100);
      taux = tauxEffectif.toFixed(2);
      
      const anneesRestantes = duree_utile_ans - i;
      const annuiteLineaire = (valeurRestante - valeur_residuelle) / anneesRestantes;
      
      if (annuite < annuiteLineaire) {
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
    let coefficient = 1.5;
    if (duree <= 4) coefficient = 1.5;
    else if (duree <= 6) coefficient = 2;
    else coefficient = 2.5;
    
    const tauxLineaire = 100 / duree;
    let tauxDegressif = tauxLineaire * coefficient;
    
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
        annuite = vnc * (tauxDegressif / 100);
        tauxActuel = tauxDegressif;
        
        const annuiteLineaire = (vnc - valeurResiduelle) / anneesRestantes;
        
        if (annuite <= annuiteLineaire) {
          passageLineaire = true;
          console.log(`Passage au linéaire à l'année ${i + 1}`);
          annuite = annuiteLineaire;
          tauxActuel = (100 / anneesRestantes);
        }
      }
      
      if (passageLineaire) {
        const anneesRest = duree - i;
        annuite = (vnc - valeurResiduelle) / anneesRest;
        tauxActuel = (100 / anneesRest);
      }
      
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
      ip_address: ipAddress,
      action_date: operationDate || new Date()
    };
    
    if (operationDate) {
      logData.created_at = operationDate;
    }
    
    await AuditLog.create(logData);
    console.log(`✅ Log créé: ${action} sur ${tableName} (${recordId}) à ${new Date().toLocaleString('fr-FR')}`);
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
        
        console.log('🔍 previewConversion reçu:', { montant, devise, date });
        
        if (!montant || !devise) {
            return res.status(400).json({ 
                message: 'Montant et devise requis',
                montant_recu: montant,
                devise_recue: devise
            });
        }
        
        const montantNum = parseFloat(montant);
        if (isNaN(montantNum) || montantNum <= 0) {
            return res.status(400).json({ 
                message: 'Montant invalide',
                montant_recu: montant
            });
        }
        
        const conversion = await TauxService.convertToCDF(montantNum, devise, date);
        
        res.json({
            montant_original: montantNum,
            devise_originale: devise,
            montant_cdf: conversion.montant_cdf,
            taux_utilise: conversion.taux_utilise,
            date_taux: conversion.date_taux
        });
        
    } catch (error) {
        console.error('❌ Erreur previewConversion:', error);
        const { montant, devise } = req.query;
        const montantNum = parseFloat(montant) || 0;
        const tauxFallback = TauxService.getTauxParDefaut(devise || 'USD');
        
        res.json({
            montant_original: montantNum,
            devise_originale: devise || 'CDF',
            montant_cdf: montantNum * tauxFallback,
            taux_utilise: tauxFallback,
            date_taux: new Date().toISOString().split('T')[0],
            avertissement: 'Taux par défaut utilisé'
        });
    }
};

// ==================== CRUD OPTIMISÉ AVEC NOUVEAUX CHAMPS ====================

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
    
    console.log('🔍 === BACKEND - PARAMÈTRES REÇUS ===');
    console.log('type:', type);
    console.log('typeImmobilisation:', typeImmobilisation);
    console.log('statut:', statut);
    console.log('recherche:', recherche);
    
    if (type) {
      where.type = type;
      console.log('✅ Filtre type appliqué:', type);
    }
    
    if (typeImmobilisation) {
      where.type_immobilisation = typeImmobilisation;
      console.log('✅ Filtre nature appliqué:', typeImmobilisation);
    } else {
      console.log('⚠️ Aucun filtre nature appliqué (typeImmobilisation est undefined)');
    }
    
    if (statut === 'actif') {
      where.actif = true;
    } else if (statut === 'inactif') {
      where.actif = false;
    }
    
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
        { model: Facture, as: 'facture', attributes: ['id', 'numero_facture', 'date_emission', 'montant_ht', 'montant_tva', 'montant_ttc', 'fichier_pdf', 'devise'] },
        { model: User, as: 'createur', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'modificateur', attributes: ['id', 'full_name', 'email'] },
        { model: Devise, as: 'devise', attributes: ['id', 'code', 'nom', 'symbole', 'taux_achat', 'taux_vente', 'taux_moyen'] }
      ]
    });
    
    if (!actif) {
      console.log(`⚠️ Actif non trouvé pour ID: ${id}`);
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    const response = actif.toJSON();
    if (actif.montant_devise && actif.devise) {
        response.conversion = {
            montant_original: `${actif.montant_devise} ${actif.devise.code}`,
            montant_cdf: actif.cout_acquisition,
            taux_utilise: actif.taux_change_utilisation,
            date_acquisition: actif.date_acquisition
        };
    }
    
    console.log(`✅ Actif trouvé: ${actif.code} - Taux: ${actif.taux_change_utilisation || 'non défini'}`);
    res.json(response);
  } catch (error) {
    console.error('❌ Erreur getActifById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getActifByCode = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      console.error('❌ Code QR manquant');
      return res.status(400).json({ message: 'Code QR requis' });
    }
    
    console.log(`🔍 Recherche actif par code QR: ${code}`);
    
    const actif = await Actif.findOne({
      where: {
        [Op.or]: [
          { code: code },
          { numero_inventaire: code }
        ],
        actif: true
      },
      include: [
        { 
          model: Amortissement, 
          as: 'Amortissements',
          limit: 1,
          order: [['exercice', 'DESC']],
          required: false
        },
        { 
          model: CategorieAmortissement, 
          as: 'categorie',
          attributes: ['id', 'code_categorie', 'nom_categorie']
        },
        { 
          model: Devise, 
          as: 'devise',
          attributes: ['id', 'code', 'nom', 'symbole']
        }
      ]
    });
    
    if (!actif) {
      console.log(`⚠️ Aucun actif trouvé pour le code: ${code}`);
      return res.status(404).json({ 
        message: 'Actif non trouvé',
        code_recherche: code 
      });
    }
    
    const dernierAmort = actif.Amortissements?.[0];
    const valeurNette = dernierAmort 
      ? parseFloat(dernierAmort.valeur_nette) 
      : parseFloat(actif.cout_acquisition);
    
    console.log(`✅ Actif trouvé: ${actif.code} - ${actif.nom}`);
    
    res.json({
      id: actif.id,
      code: actif.code,
      nom: actif.nom,
      type: actif.type,
      type_immobilisation: actif.type_immobilisation,
      date_acquisition: actif.date_acquisition,
      cout_acquisition: parseFloat(actif.cout_acquisition),
      valeur_nette: valeurNette,
      localisation: actif.localisation,
      affectation: actif.affectation,
      etat: actif.etat,
      numero_inventaire: actif.numero_inventaire,
      marque: actif.marque,
      modele: actif.modele,
      numero_serie: actif.numero_serie,
      fournisseur: actif.fournisseur,
      categorie: actif.categorie,
      devise: actif.devise,
      date_validite: actif.date_validite
    });
    
  } catch (error) {
    console.error('❌ Erreur getActifByCode:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la recherche par code',
      error: error.message 
    });
  }
};

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

    const validDateAcquisition = validateDate(date_acquisition);
    const validDateValidite = validateDate(date_validite);
    
    if (!validDateAcquisition) {
      return res.status(400).json({ message: 'La date d\'acquisition est invalide' });
    }

    const existing = await Actif.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ message: 'Code déjà utilisé' });
    }

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

    let coutCDF = cout_acquisition;
    let tauxUtilise = taux_change_utilisation;
    let montantDeviseOriginal = montant_devise;
    let deviseIdFinal = devise_id;
    let deviseCodeFinal = devise_code;

    // CONVERSION AVEC LOGS DE DÉBOGAGE
    if (devise_code && devise_code !== 'CDF') {
        console.log(`💱 Conversion: ${montant_devise || cout_acquisition} ${devise_code} -> CDF (date: ${validDateAcquisition})`);
        
        if (montant_devise && !cout_acquisition) {
            const conversion = await TauxService.convertToCDF(montant_devise, devise_code, validDateAcquisition);
            coutCDF = conversion.montant_cdf;
            tauxUtilise = conversion.taux_utilise;
            montantDeviseOriginal = montant_devise;
            console.log(`✅ Résultat conversion: ${montant_devise} ${devise_code} = ${coutCDF} CDF (taux: ${tauxUtilise})`);
        } else if (cout_acquisition) {
            const conversion = await TauxService.convertToCDF(cout_acquisition, devise_code, validDateAcquisition);
            coutCDF = conversion.montant_cdf;
            tauxUtilise = conversion.taux_utilise;
            montantDeviseOriginal = cout_acquisition;
            console.log(`✅ Résultat conversion: ${cout_acquisition} ${devise_code} = ${coutCDF} CDF (taux: ${tauxUtilise})`);
        }
        
        if (!deviseIdFinal) {
            const devise = await Devise.findOne({ where: { code: devise_code } });
            if (devise) deviseIdFinal = devise.id;
        }
    } else if (devise_code === 'CDF') {
        console.log(`💰 Devise CDF, pas de conversion nécessaire`);
        montantDeviseOriginal = cout_acquisition;
        tauxUtilise = 1;
    }

    if (!coutCDF || coutCDF <= 0) {
      return res.status(400).json({ message: 'Le coût d\'acquisition est requis et doit être positif' });
    }

    console.log(`📝 Création actif: ${code} - ${nom}`);
    console.log(`   - Montant devise: ${montantDeviseOriginal} ${devise_code || 'CDF'}`);
    console.log(`   - Montant CDF: ${coutCDF}`);
    console.log(`   - Taux change: ${tauxUtilise || 1}`);

    const actif = await Actif.create({
      code, nom, type, 
      date_acquisition: validDateAcquisition,
      cout_acquisition: coutCDF,
      montant_devise: montantDeviseOriginal,
      devise_id: deviseIdFinal,
      taux_change_utilisation: tauxUtilise || 1,
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

    await genererPlanAmortissement(actif, transaction);
    
    let facture = null;
    try {
      let deviseCodeFacture = 'CDF';
      if (deviseIdFinal) {
        const devise = await Devise.findByPk(deviseIdFinal);
        if (devise) deviseCodeFacture = devise.code;
      } else if (devise_code) {
        deviseCodeFacture = devise_code;
      }
      
      const cheminFacture = await factureService.genererFacture(actif, req.user, deviseCodeFacture);
      
      const montantHt = montantDeviseOriginal ? parseFloat(montantDeviseOriginal) : parseFloat(cout_acquisition || coutCDF);
      const tva = Math.round(montantHt * 0.16);
      const montantTtc = montantHt + tva;
      
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
      
      console.log(`✅ Facture générée: ${numeroFactureGen} | HT=${montantHt} ${deviseCodeFacture} | TVA=${tva} | TTC=${montantTtc}`);
    } catch (factureErr) {
      console.error('⚠️ Erreur lors de la génération de la facture:', factureErr.message);
    }
    
    await transaction.commit();

    await logAction(
      req.user.id,
      'CREATE',
      'actifs',
      actif.id,
      null,
      { code, nom, type, date_acquisition: validDateAcquisition, cout_acquisition: coutCDF, montant_devise: montantDeviseOriginal, devise_code, taux_utilise: tauxUtilise },
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

    const responseData = actifComplet.toJSON();
    if (facture) {
      responseData.facture = facture;
    }
    
    if (montantDeviseOriginal && devise_code) {
        responseData.conversion = {
            montant_original: `${montantDeviseOriginal} ${devise_code}`,
            montant_cdf: coutCDF,
            taux_utilise: tauxUtilise,
            date_acquisition: validDateAcquisition
        };
    }

    console.log(`✅ Actif créé avec succès: ${code} - Taux: ${tauxUtilise}`);
    res.status(201).json(responseData);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ createActif:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.updateActif = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('📝 updateActif - ID:', id);
    console.log('📝 updateActif - Données reçues:', JSON.stringify(updateData, null, 2));

    const actif = await Actif.findByPk(id);
    if (!actif) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    if (updateData.date_acquisition) {
      updateData.date_acquisition = validateDate(updateData.date_acquisition);
    }
    if (updateData.date_validite !== undefined) {
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
      cout_acquisition: actif.cout_acquisition,
      taux_change_utilisation: actif.taux_change_utilisation
    };

    if (updateData.devise_code && updateData.devise_code !== 'CDF') {
      if (updateData.montant_devise && parseFloat(updateData.montant_devise) > 0) {
        try {
          const conversion = await TauxService.convertToCDF(
            parseFloat(updateData.montant_devise),
            updateData.devise_code,
            updateData.date_acquisition || actif.date_acquisition
          );
          updateData.cout_acquisition = conversion.montant_cdf;
          updateData.taux_change_utilisation = conversion.taux_utilise;
          console.log(`✅ Conversion: ${updateData.montant_devise} ${updateData.devise_code} = ${updateData.cout_acquisition} CDF (taux: ${conversion.taux_utilise})`);
        } catch (convError) {
          console.error('❌ Erreur conversion:', convError.message);
        }
      }
    } else if (updateData.devise_code === 'CDF') {
      updateData.montant_devise = null;
      updateData.taux_change_utilisation = 1;
    }

    if (updateData.categorie_id && updateData.categorie_id !== actif.categorie_id) {
      const categorie = await CategorieAmortissement.findByPk(updateData.categorie_id);
      if (categorie) {
        updateData.duree_utile_ans = categorie.duree_vie_ans;
        updateData.mode_amortissement = categorie.mode_amortissement_defaut;
      }
    }

    updateData.updated_by = req.user.id;
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('📝 Mise à jour finale:', JSON.stringify(updateData, null, 2));
    
    await actif.update(updateData, { transaction });

    const paramsChanged = 
      (updateData.cout_acquisition && parseFloat(updateData.cout_acquisition) !== parseFloat(oldValues.cout_acquisition)) ||
      (updateData.duree_utile_ans && parseInt(updateData.duree_utile_ans) !== actif.duree_utile_ans) ||
      (updateData.mode_amortissement && updateData.mode_amortissement !== actif.mode_amortissement) ||
      (updateData.valeur_residuelle !== undefined && parseFloat(updateData.valeur_residuelle) !== parseFloat(actif.valeur_residuelle));

    if (paramsChanged) {
      console.log('📊 Recalcul des amortissements...');
      await Amortissement.destroy({ where: { actif_id: id }, transaction });
      await genererPlanAmortissement(actif, transaction);
      
      const facture = await Facture.findOne({ where: { actif_id: id } });
      if (facture) {
        const nouveauMontantHt = actif.montant_devise || actif.cout_acquisition;
        const nouvelleTva = Math.round(nouveauMontantHt * 0.16);
        const nouveauMontantTtc = nouveauMontantHt + nouvelleTva;
        
        await facture.update({
          montant_ht: nouveauMontantHt,
          montant_tva: nouvelleTva,
          montant_ttc: nouveauMontantTtc
        }, { transaction });
        console.log(`✅ Facture mise à jour: HT=${nouveauMontantHt}, TVA=${nouvelleTva}, TTC=${nouveauMontantTtc}`);
      }
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

    console.log('✅ Actif mis à jour avec succès');
    res.json(actifMaj);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ updateActif - ERREUR:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erreur serveur', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

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

exports.getAlertes = async (req, res) => {
  try {
    const now = new Date();
    const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dans90Jours = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

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

// ==================== GESTION DES FACTURES ====================

exports.getFacture = async (req, res) => {
  try {
    const { id } = req.params;
    
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
    
    let facture = await Facture.findOne({ 
      where: { actif_id: id },
      raw: true
    });
    
    const deviseCode = actif.devise?.code || 'CDF';
    const deviseSymbole = actif.devise?.symbole || 'FC';
    const montantDeviseOrigine = actif.montant_devise || actif.cout_acquisition;
    const tauxChange = actif.taux_change_utilisation || TauxService.getTauxParDefaut(deviseCode);
    
    // ✅ Correction du calcul des montants
    const montantHt = parseFloat(montantDeviseOrigine);
    const montantTva = Math.round(montantHt * 0.16);
    const montantTtc = montantHt + montantTva;  // ← CORRECTION ICI
    
    if (!facture) {
      facture = {
        numero_facture: actif.numero_facture || `FAC-${actif.code}`,
        date_emission: actif.date_acquisition,
        montant_ht: montantHt,
        montant_tva: montantTva,
        montant_ttc: montantTtc,  // ← CORRECTION ICI
        devise: deviseCode,
        taux_change_cdf: tauxChange,
        montant_cdf: actif.cout_acquisition,
        nom_fichier: null,
        est_disponible: false
      };
    }
    
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
    
    // ✅ Forcer les bonnes valeurs dans la réponse
    response.montant_ht = montantHt;
    response.montant_tva = montantTva;
    response.montant_ttc = montantTtc;
    
    console.log(`💰 Facture: HT=${montantHt} ${deviseCode}, TVA=${montantTva}, TTC=${montantTtc}`);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Erreur getFacture:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de la facture',
      error: error.message 
    });
  }
};

exports.downloadFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const PDFDocument = require('pdfkit');
    
    console.log(`📄 Génération de facture pour actif: ${id}`);
    
    const actif = await Actif.findByPk(id, {
      include: [
        { model: Devise, as: 'devise', attributes: ['code', 'nom', 'symbole'] },
        { model: User, as: 'createur', attributes: ['id', 'full_name'] }
      ]
    });
    
    if (!actif) {
      console.log(`❌ Actif non trouvé: ${id}`);
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    let facture = await Facture.findOne({ where: { actif_id: id } });
    
    const deviseCode = actif.devise?.code || 'CDF';
    const montantDevise = actif.montant_devise || actif.cout_acquisition;
    const tauxChange = actif.taux_change_utilisation || TauxService.getTauxParDefaut(deviseCode);
    const montantTVA = Math.round(montantDevise * 0.16);
    const montantTTC = montantDevise + montantTVA;
    
    if (!facture) {
      const numeroFacture = `FAC-${actif.code}-${new Date().getFullYear()}`;
      facture = await Facture.create({
        numero_facture: numeroFacture,
        actif_id: actif.id,
        date_emission: new Date(),
        montant_ht: montantDevise,
        montant_tva: montantTVA,
        montant_ttc: montantTTC,
        devise: deviseCode,
        fichier_pdf: null,
        created_by: req.user.id
      });
      console.log(`✅ Facture créée en base: ${numeroFacture}`);
    }
    
    const fileName = `facture_${actif.code}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    
    doc.fontSize(20).fillColor('#10b981').text('BANQUE CENTRALE DU CONGO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).fillColor('#0f172a').text('FACTURE D\'ACQUISITION', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Facture N°: ${facture.numero_facture}`, { align: 'right' });
    doc.text(`Date d'émission: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.text(`Généré par: ${req.user?.full_name || 'Système'}`, { align: 'right' });
    doc.moveDown();
    
    doc.fontSize(12).fillColor('#0f172a').text('Détails de l\'acquisition', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Actif: ${actif.code} - ${actif.nom}`);
    doc.text(`Type: ${actif.type_immobilisation === 'incorporel' ? 'Incorporel' : 'Corporel'}`);
    doc.text(`Fournisseur: ${actif.fournisseur || 'Non spécifié'}`);
    doc.text(`Date d'acquisition: ${new Date(actif.date_acquisition).toLocaleDateString('fr-FR')}`);
    doc.moveDown();
    
    doc.fontSize(12).fillColor('#0f172a').text('Détails financiers', { underline: true });
    doc.moveDown(0.5);
    
    const col1X = 50;
    const col2X = 350;
    
    doc.fontSize(10).fillColor('#475569');
    doc.text('Description', col1X, doc.y);
    doc.text('Montant', col2X, doc.y);
    doc.moveDown();
    
    doc.text('Montant HT', col1X, doc.y);
    doc.text(`${montantDevise.toLocaleString()} ${deviseCode}`, col2X, doc.y);
    doc.moveDown();
    
    doc.text(`TVA (16%)`, col1X, doc.y);
    doc.text(`${montantTVA.toLocaleString()} ${deviseCode}`, col2X, doc.y);
    doc.moveDown();
    
    doc.fontSize(12).fillColor('#10b981');
    doc.text('TOTAL TTC', col1X, doc.y);
    doc.text(`${montantTTC.toLocaleString()} ${deviseCode}`, col2X, doc.y);
    doc.moveDown(2);
    
    if (deviseCode !== 'CDF') {
      doc.fontSize(10).fillColor('#64748b');
      doc.text('Conversion en Francs Congolais:', 50, doc.y);
      doc.text(`Taux de change appliqué: 1 ${deviseCode} = ${tauxChange.toLocaleString()} CDF`, 50, doc.y + 15);
      doc.text(`Montant équivalent: ${actif.cout_acquisition.toLocaleString()} CDF`, 50, doc.y + 30);
      doc.moveDown(2);
    }
    
    const pageHeight = doc.page.height;
    doc.fontSize(8).fillColor('#94a3b8');
    doc.text('Document officiel - Banque Centrale du Congo', 50, pageHeight - 50, { align: 'center' });
    doc.text('www.bcc.cd', 50, pageHeight - 40, { align: 'center' });
    doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')}`, 50, pageHeight - 30, { align: 'center' });
    
    doc.end();
    
    console.log(`✅ PDF généré et envoyé: ${fileName}`);
    
  } catch (error) {
    console.error('❌ Erreur downloadFacture:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Erreur lors de la génération de la facture',
        error: error.message 
      });
    }
  }
};