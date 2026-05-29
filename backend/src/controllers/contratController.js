// backend/src/controllers/contratController.js

const { Contrat, Actif, AuditLog } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { sequelize } = require('../models');

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

// ==================== FONCTION DE PARSAGE DES NOMBRES ====================
const parseFrenchNumber = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return value;
  
  let stringValue = String(value).trim();
  
  const hasFrenchThousandSeparator = stringValue.match(/\d+\.\d{3}/);
  const hasFrenchDecimalComma = stringValue.match(/,\d+$/);
  
  if (hasFrenchThousandSeparator || hasFrenchDecimalComma) {
    stringValue = stringValue.replace(/\./g, '');
    stringValue = stringValue.replace(/,/g, '.');
  } else {
    stringValue = stringValue.replace(/,/g, '');
  }
  
  const result = parseFloat(stringValue);
  return isNaN(result) ? null : result;
};

// ==================== FONCTION DE GÉNÉRATION DE FACTURE PROFESSIONNELLE ====================
const genererFactureContrat = async (contrat, user) => {
  try {
    const uploadDir = path.join(__dirname, '../../uploads/factures_contrats');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`📁 Dossier créé: ${uploadDir}`);
    }

    const safeNumero = contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_');
    const fileName = `facture_contrat_${safeNumero}_${Date.now()}.pdf`;
    const filePath = path.join(uploadDir, fileName);
    const relativePath = `/uploads/factures_contrats/${fileName}`;

    console.log(`📄 Génération facture: ${filePath}`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // En-tête
    doc.fontSize(16).fillColor('#1e3a8a').text('BANQUE CENTRALE DU CONGO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).fillColor('#000').text('FACTURE DE CONTRAT', { align: 'center' });
    doc.moveDown();

    // Informations facture
    doc.fontSize(10);
    doc.text(`N° Facture : FAC-${contrat.numero_contrat}`, { align: 'right' });
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown();

    // Infos contrat
    doc.text(`Contrat N° : ${contrat.numero_contrat}`);
    doc.text(`Fournisseur : ${contrat.fournisseur}`);
    doc.text(`Période : ${new Date(contrat.date_debut).toLocaleDateString('fr-FR')} → ${new Date(contrat.date_fin).toLocaleDateString('fr-FR')}`);
    doc.moveDown();

    // Montants
    const montantHT = parseFloat(contrat.montant) || 0;
    const tva = montantHT * 0.16;
    const montantTTC = montantHT + tva;

    doc.text(`Montant HT : ${montantHT.toLocaleString()} CDF`);
    doc.text(`TVA (16%) : ${tva.toLocaleString()} CDF`);
    doc.fontSize(12).fillColor('#10b981').text(`Montant TTC : ${montantTTC.toLocaleString()} CDF`);

    if (contrat.description) {
      doc.moveDown();
      doc.fontSize(10).fillColor('#000').text('Description :');
      doc.text(contrat.description);
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log(`✅ Facture générée: ${relativePath}`);
        resolve(relativePath);
      });
      stream.on('error', reject);
    });

  } catch (error) {
    console.error('❌ Erreur génération facture:', error);
    return null;
  }
};

// ==================== ROUTES PRINCIPALES ====================

exports.getAllContrats = async (req, res) => {
  try {
    console.log('🔍 getAllContrats appelé - utilisateur:', req.user?.id);
    
    const contrats = await Contrat.findAll({
      order: [['created_at', 'DESC']]
    });
    
    console.log(`✅ ${contrats.length} contrats trouvés en base`);
    res.json(contrats);
    
  } catch (error) {
    console.error('❌ Erreur getAllContrats:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

exports.getContrats = async (req, res) => {
  try {
    const actifId = req.actifId || req.params.actifId;
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }
    
    console.log(`🔍 getContrats appelé pour actifId: ${actifId}`);
    
    const contrats = await Contrat.findAll({
      where: { actif_id: actifId },
      order: [['date_fin', 'ASC']]
    });
    
    console.log(`✅ ${contrats.length} contrats trouvés pour cet actif`);
    res.json(contrats);
  } catch (error) {
    console.error('❌ Erreur getContrats:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getContratById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 getContratById appelé avec ID:', id);
    
    const contrat = await Contrat.findByPk(id);
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    console.log(`✅ Contrat trouvé: ${contrat.numero_contrat}`);
    res.json(contrat);
  } catch (error) {
    console.error('❌ Erreur getContratById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createContrat = async (req, res) => {
  try {
    const actifId = req.actifId || req.body.actif_id;
    if (!actifId) {
      return res.status(400).json({ message: 'actif_id requis' });
    }

    const { 
      numero_contrat, 
      fournisseur, 
      date_debut, 
      date_fin, 
      montant, 
      description, 
      type 
    } = req.body;

    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    const contrat = await Contrat.create({
      actif_id: actifId,
      numero_contrat,
      fournisseur,
      date_debut,
      date_fin,
      montant,
      description,
      type: type || 'licence',
      created_by: req.user.id
    });

    console.log(`✅ Contrat créé: ${contrat.numero_contrat}`);

    let facturePath = null;
    try {
      facturePath = await genererFactureContrat(contrat, req.user);
      await contrat.update({ facture_pdf: facturePath });
      console.log(`📄 Facture générée pour contrat ${contrat.id} : ${facturePath}`);
    } catch (err) {
      console.error('⚠️ Erreur génération facture:', err.message);
    }

    await logAction(
      req.user.id,
      'CONTRAT_CREATE',
      'contrats',
      contrat.id,
      null,
      { 
        numero_contrat, 
        fournisseur, 
        montant, 
        date_debut, 
        date_fin, 
        description,
        type,
        facture_generée: !!facturePath
      },
      req.ip
    );

    res.status(201).json({
      ...contrat.toJSON(),
      facture_generée: !!facturePath,
      facture_pdf: facturePath
    });
  } catch (error) {
    console.error('❌ Erreur createContrat:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.updateContrat = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contrat = await Contrat.findByPk(id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    const oldData = {
      numero_contrat: contrat.numero_contrat,
      fournisseur: contrat.fournisseur,
      montant: contrat.montant,
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin,
      description: contrat.description,
      type: contrat.type
    };

    await contrat.update({ ...updates, updated_by: req.user.id });
    
    console.log(`✅ Contrat mis à jour: ${contrat.numero_contrat}`);

    await logAction(
      req.user.id,
      'CONTRAT_UPDATE',
      'contrats',
      contrat.id,
      oldData,
      { 
        numero_contrat: contrat.numero_contrat,
        fournisseur: contrat.fournisseur,
        montant: contrat.montant,
        date_debut: contrat.date_debut,
        date_fin: contrat.date_fin,
        type: contrat.type
      },
      req.ip
    );

    res.json(contrat);
  } catch (error) {
    console.error('❌ Erreur updateContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.deleteContrat = async (req, res) => {
  try {
    const { id } = req.params;
    const contrat = await Contrat.findByPk(id);
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    const oldData = {
      numero_contrat: contrat.numero_contrat,
      fournisseur: contrat.fournisseur,
      montant: contrat.montant,
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin,
      type: contrat.type
    };
    
    await contrat.destroy();
    
    console.log(`✅ Contrat supprimé: ${id}`);

    await logAction(
      req.user.id,
      'CONTRAT_DELETE',
      'contrats',
      id,
      oldData,
      null,
      req.ip
    );

    res.json({ message: 'Contrat supprimé' });
  } catch (error) {
    console.error('❌ Erreur deleteContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ==================== FONCTIONS IA POUR LA CRÉATION ASSISTÉE DE CONTRATS ====================

/**
 * Fonction d'analyse IA des messages pour les contrats
 */
async function analyserMessageContrat(message, context = {}) {
  console.log('🔍 Analyse IA du message contrat:', message);
  
  const messageLower = message.toLowerCase();
  
  const draft = {
    numero_contrat: null,
    type: 'licence',
    objet: null,
    date_debut: null,
    date_fin: null,
    montant: null,
    devise_code: 'CDF',
    montant_cdf: null,
    fournisseur: null,
    description: message.substring(0, 500),
    periodicite: 'mensuelle',
    renouvellement_auto: false,
    preavis_jours: 30
  };
  
  // Extraction du numéro de contrat
  let numMatch = message.match(/contrat\s*(?:n°|numero|n\.?)?\s*:?\s*["']?([A-Z0-9\-]+)["']?/i);
  if (numMatch) {
    draft.numero_contrat = numMatch[1];
  } else {
    draft.numero_contrat = `CTR-${Math.floor(Math.random() * 10000)}`;
  }
  
  // Extraction du type de contrat
  if (messageLower.includes('licence') || messageLower.includes('license')) {
    draft.type = 'licence';
  } else if (messageLower.includes('maintenance')) {
    draft.type = 'maintenance';
  } else if (messageLower.includes('service') || messageLower.includes('prestation')) {
    draft.type = 'service';
  } else if (messageLower.includes('location') || messageLower.includes('leasing')) {
    draft.type = 'location';
  } else if (messageLower.includes('achat') || messageLower.includes('acquisition')) {
    draft.type = 'achat';
  } else {
    draft.type = 'licence';
  }
  
  // Extraction de l'objet
  const objetMatch = message.match(/objet\s*(?:du contrat)?\s*:?\s*["']?([^"'\n,]+)["']?/i);
  if (objetMatch) {
    draft.objet = objetMatch[1].trim();
  } else if (draft.type === 'licence') {
    draft.objet = 'Licence d\'utilisation de logiciel';
  } else if (draft.type === 'maintenance') {
    draft.objet = 'Contrat de maintenance';
  } else {
    draft.objet = 'Prestation de services';
  }
  
  // Extraction du fournisseur
  const fournisseurMatch = message.match(/(?:fournisseur|prestataire|contractant|avec|chez|de la part de)\s+["']?([A-Za-z0-9\s\-]+)["']?(?:\s+pour|\s+à|\s+le|$)/i);
  if (fournisseurMatch && fournisseurMatch[1].length < 50) {
    draft.fournisseur = fournisseurMatch[1].trim();
  }
  
  // Extraction du montant
  const montantPatterns = [
    /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(USD|EUR|GBP|CDF|FC|dollars|euros|livres|francs)/i,
    /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*[\$€£]/i,
    /(?:montant|prix|coût|valeur)\s*(?:de|d'|à)?\s*(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)(?:\s*(USD|EUR|GBP|CDF|FC))?/i
  ];
  
  for (const pattern of montantPatterns) {
    const match = message.match(pattern);
    if (match) {
      const montant = parseFrenchNumber(match[1]);
      if (montant && montant > 0) {
        draft.montant = montant;
        
        if (match[2]) {
          let devise = match[2].toUpperCase();
          if (devise === 'DOLLARS') devise = 'USD';
          if (devise === 'EUROS') devise = 'EUR';
          if (devise === 'LIVRES') devise = 'GBP';
          if (devise === 'FRANCS' || devise === 'FC') devise = 'CDF';
          draft.devise_code = devise;
        } else if (match[0].includes('$')) {
          draft.devise_code = 'USD';
        } else if (match[0].includes('€')) {
          draft.devise_code = 'EUR';
        } else if (match[0].includes('£')) {
          draft.devise_code = 'GBP';
        }
        
        // Conversion en CDF si nécessaire
        if (draft.devise_code !== 'CDF') {
          const TAUX = { 'USD': 2450, 'EUR': 2650, 'GBP': 3100 };
          const taux = TAUX[draft.devise_code] || 2450;
          draft.montant_cdf = montant * taux;
        } else {
          draft.montant_cdf = montant;
        }
        
        console.log(`💰 Montant extrait: ${montant} ${draft.devise_code} -> ${draft.montant_cdf} CDF`);
        break;
      }
    }
  }
  
  // Extraction des dates
  const datePatterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(?:du|le|début)\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,
    /(?:au|jusqu'au|fin)\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      let jour = match[1].padStart(2, '0');
      let mois = match[2].padStart(2, '0');
      let annee = match[3].length === 2 ? '20' + match[3] : match[3];
      const dateFormatee = `${annee}-${mois}-${jour}`;
      
      if (!draft.date_debut && (messageLower.includes('du') || messageLower.includes('début') || messageLower.includes('à partir de'))) {
        draft.date_debut = dateFormatee;
      } else if (!draft.date_fin && (messageLower.includes('au') || messageLower.includes('jusqu') || messageLower.includes('fin'))) {
        draft.date_fin = dateFormatee;
      } else if (!draft.date_debut) {
        draft.date_debut = dateFormatee;
      } else if (!draft.date_fin) {
        draft.date_fin = dateFormatee;
      }
    }
  }
  
  if (!draft.date_debut) {
    draft.date_debut = new Date().toISOString().split('T')[0];
  }
  
  if (!draft.date_fin) {
    const dateFin = new Date(draft.date_debut);
    dateFin.setFullYear(dateFin.getFullYear() + 1);
    draft.date_fin = dateFin.toISOString().split('T')[0];
  }
  
  console.log('✅ Draft contrat généré:', draft);
  return draft;
}

/**
 * ✅ 1. Générer un contrat via conversation avec l'IA
 * POST /api/contrats/ia/generate
 */
exports.generateContratWithAI = async (req, res) => {
  try {
    const { conversation, context } = req.body;
    
    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ 
        message: 'La conversation est requise et doit être un tableau' 
      });
    }

    const dernierMessageUser = conversation
      .filter(msg => msg.role === 'user')
      .pop();
    
    if (!dernierMessageUser) {
      return res.status(400).json({ 
        message: 'Aucun message utilisateur trouvé dans la conversation' 
      });
    }

    console.log('🤖 IA - Génération de contrat à partir de:', dernierMessageUser.content);

    const draft = await analyserMessageContrat(dernierMessageUser.content, context || {});
    
    res.json({
      success: true,
      message: "✅ J'ai analysé votre demande et généré un brouillon de contrat.",
      draft: {
        numero_contrat: draft.numero_contrat,
        type: draft.type,
        objet: draft.objet,
        date_debut: draft.date_debut,
        date_fin: draft.date_fin,
        montant: draft.montant,
        devise_code: draft.devise_code,
        montant_cdf: draft.montant_cdf,
        fournisseur: draft.fournisseur,
        description: draft.description,
        periodicite: draft.periodicite,
        renouvellement_auto: draft.renouvellement_auto,
        preavis_jours: draft.preavis_jours
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur generateContratWithAI:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération par IA',
      error: error.message 
    });
  }
};

/**
 * ✅ 2. Valider un brouillon de contrat avec l'IA
 * POST /api/contrats/ia/validate
 */
exports.validateContratDraft = async (req, res) => {
  try {
    const { draft } = req.body;
    
    if (!draft) {
      return res.status(400).json({ message: 'Brouillon requis' });
    }

    console.log('🤖 IA - Validation du brouillon de contrat:', draft.numero_contrat || 'Sans numéro');

    const anomalies = [];
    const warnings = [];
    
    if (!draft.numero_contrat || draft.numero_contrat.length < 3) {
      anomalies.push({
        field: 'numero_contrat',
        message: 'Le numéro de contrat doit contenir au moins 3 caractères',
        severity: 'high'
      });
    }
    
    if (!draft.fournisseur || draft.fournisseur.length < 2) {
      anomalies.push({
        field: 'fournisseur',
        message: 'Le fournisseur est requis',
        severity: 'high'
      });
    }
    
    if (!draft.date_debut) {
      anomalies.push({
        field: 'date_debut',
        message: 'La date de début est requise',
        severity: 'high'
      });
    }
    
    if (!draft.date_fin) {
      anomalies.push({
        field: 'date_fin',
        message: 'La date de fin est requise',
        severity: 'high'
      });
    }
    
    if (draft.date_debut && draft.date_fin) {
      const dateDebut = new Date(draft.date_debut);
      const dateFin = new Date(draft.date_fin);
      if (dateFin <= dateDebut) {
        anomalies.push({
          field: 'date_fin',
          message: 'La date de fin doit être postérieure à la date de début',
          severity: 'high'
        });
      }
    }
    
    const montant = parseFloat(draft.montant);
    if (!montant || montant <= 0) {
      anomalies.push({
        field: 'montant',
        message: 'Le montant doit être un nombre positif',
        severity: 'high'
      });
    }
    
    if (draft.devise_code && !['CDF', 'USD', 'EUR', 'GBP'].includes(draft.devise_code)) {
      warnings.push({
        field: 'devise_code',
        message: `Devise non standard: ${draft.devise_code}`,
        severity: 'low'
      });
    }
    
    const isValid = anomalies.filter(a => a.severity === 'high').length === 0;
    const score = Math.max(0, 100 - (anomalies.length * 15));
    
    res.json({
      is_valid: isValid,
      score: Math.min(100, score),
      anomalies: anomalies,
      warnings: warnings,
      message: isValid 
        ? '✅ Le brouillon de contrat est valide et prêt à être créé !' 
        : `⚠️ ${anomalies.length} anomalie(s) critique(s) détectée(s).`
    });
    
  } catch (error) {
    console.error('❌ Erreur validateContratDraft:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la validation du brouillon',
      error: error.message 
    });
  }
};

/**
 * ✅ 3. Suggérer des corrections pour un brouillon de contrat
 * POST /api/contrats/ia/suggest
 */
exports.suggestContratCorrections = async (req, res) => {
  try {
    const { draft, anomalies } = req.body;
    
    if (!draft) {
      return res.status(400).json({ message: 'Brouillon requis' });
    }
    
    const suggestions = [];
    
    if (!draft.numero_contrat) {
      const prefix = draft.type === 'licence' ? 'LIC' : draft.type === 'maintenance' ? 'MAI' : 'CTR';
      suggestions.push({
        field: 'numero_contrat',
        current_value: null,
        corrected_value: `${prefix}-${Math.floor(Math.random() * 10000)}`,
        suggestion: `Numéro de contrat généré automatiquement: ${prefix}-XXXX`,
        severity: 'medium',
        action: 'auto_fill'
      });
    }
    
    if (!draft.date_debut) {
      suggestions.push({
        field: 'date_debut',
        current_value: null,
        corrected_value: new Date().toISOString().split('T')[0],
        suggestion: 'Date de début: date du jour proposée',
        severity: 'medium',
        action: 'auto_fill'
      });
    }
    
    if (!draft.date_fin && draft.date_debut) {
      const dateFin = new Date(draft.date_debut);
      dateFin.setFullYear(dateFin.getFullYear() + 1);
      suggestions.push({
        field: 'date_fin',
        current_value: null,
        corrected_value: dateFin.toISOString().split('T')[0],
        suggestion: 'Date de fin proposée: 1 an après la date de début',
        severity: 'medium',
        action: 'auto_fill'
      });
    }
    
    if (draft.devise_code && draft.devise_code !== 'CDF' && !draft.montant_cdf) {
      const TAUX = { 'USD': 2450, 'EUR': 2650, 'GBP': 3100 };
      const taux = TAUX[draft.devise_code] || 2450;
      suggestions.push({
        field: 'montant_cdf',
        current_value: null,
        corrected_value: (draft.montant || 0) * taux,
        suggestion: `Conversion automatique: ${draft.montant || 0} ${draft.devise_code} = ${((draft.montant || 0) * taux).toLocaleString()} CDF`,
        severity: 'low',
        action: 'auto_fill'
      });
    }
    
    res.json({
      success: true,
      suggestions: suggestions,
      message: `${suggestions.length} suggestion(s) de correction disponibles`,
      auto_fixable: suggestions.filter(s => s.action === 'auto_fill').length
    });
    
  } catch (error) {
    console.error('❌ Erreur suggestContratCorrections:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération des suggestions',
      error: error.message 
    });
  }
};

/**
 * ✅ 4. Créer un contrat à partir d'un brouillon validé par l'IA
 * POST /api/contrats/ia/create-from-draft
 */
exports.createContratFromDraft = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { draft, actif_id } = req.body;
    
    if (!draft) {
      return res.status(400).json({ message: 'Brouillon requis' });
    }
    
    if (!actif_id) {
      return res.status(400).json({ message: 'actif_id requis' });
    }
    
    console.log('🤖 IA - Création de contrat à partir du brouillon:', draft.numero_contrat);
    
    const actif = await Actif.findByPk(actif_id);
    if (!actif) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Actif non trouvé' });
    }
    
    const contratData = {
      actif_id: actif_id,
      numero_contrat: draft.numero_contrat,
      fournisseur: draft.fournisseur,
      date_debut: draft.date_debut,
      date_fin: draft.date_fin,
      montant: draft.montant_cdf || draft.montant,
      description: draft.description || `Contrat ${draft.type} créé par assistant IA`,
      type: draft.type || 'licence',
      created_by: req.user.id
    };
    
    const contrat = await Contrat.create(contratData, { transaction });
    
    console.log(`✅ Contrat créé par IA: ${contrat.numero_contrat}`);
    
    let facturePath = null;
    try {
      facturePath = await genererFactureContrat(contrat, req.user);
      await contrat.update({ facture_pdf: facturePath }, { transaction });
      console.log(`📄 Facture générée pour contrat ${contrat.id}`);
    } catch (err) {
      console.error('⚠️ Erreur génération facture:', err.message);
    }
    
    await transaction.commit();
    
    await logAction(
      req.user.id,
      'CONTRAT_CREATE_IA',
      'contrats',
      contrat.id,
      null,
      contratData,
      req.ip
    );
    
    res.status(201).json({
      success: true,
      message: '✅ Contrat créé avec succès par l\'assistant IA !',
      contrat: {
        ...contrat.toJSON(),
        facture_generée: !!facturePath,
        facture_pdf: facturePath
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur createContratFromDraft:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création du contrat depuis le brouillon IA',
      error: error.message 
    });
  }
};

// ==================== AUTRES ROUTES EXISTANTES ====================

exports.uploadContratFile = async (req, res) => {
  try {
    const { contratId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni' });
    }

    const contrat = await Contrat.findByPk(contratId);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    const oldData = { fichier: contrat.fichier };
    
    contrat.fichier = req.file.path;
    await contrat.save();

    await logAction(
      req.user.id,
      'CONTRAT_UPLOAD',
      'contrats',
      contratId,
      oldData,
      { fichier: req.file.originalname, path: req.file.path },
      req.ip
    );
    
    res.json({ message: 'Fichier uploadé', fichier: contrat.fichier });
  } catch (error) {
    console.error('❌ Erreur uploadContratFile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.getFacture = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Récupération facture pour contrat: ${id}`);
    
    const contrat = await Contrat.findByPk(id, { 
      attributes: ['id', 'numero_contrat', 'facture_pdf', 'montant', 'fournisseur', 'date_debut', 'date_fin', 'description'] 
    });
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    if (!contrat.facture_pdf) {
      return res.status(404).json({ message: 'Aucune facture générée pour ce contrat' });
    }

    res.json({
      id: contrat.id,
      numero_contrat: contrat.numero_contrat,
      fichier_pdf: contrat.facture_pdf,
      nom_fichier: `facture_contrat_${contrat.numero_contrat}.pdf`,
      montant: contrat.montant,
      fournisseur: contrat.fournisseur,
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin,
      description: contrat.description
    });
  } catch (error) {
    console.error('Erreur getFacture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.downloadFacture = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 Téléchargement facture pour contrat: ${id}`);
    
    const contrat = await Contrat.findByPk(id);
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    if (!contrat.facture_pdf) {
      return res.status(404).json({ message: 'Aucune facture disponible pour ce contrat' });
    }

    const filePath = path.join(__dirname, '../..', contrat.facture_pdf);
    console.log(`📁 Chemin du fichier: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Fichier introuvable: ${filePath}`);
      return res.status(404).json({ message: 'Fichier PDF introuvable' });
    }

    res.download(filePath, `facture_contrat_${contrat.numero_contrat}.pdf`);
  } catch (error) {
    console.error('Erreur downloadFacture:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.regenerateFacture = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Régénération facture pour contrat: ${id}`);
    
    const contrat = await Contrat.findByPk(id);
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    if (contrat.facture_pdf) {
      const oldFilePath = path.join(__dirname, '../..', contrat.facture_pdf);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`🗑️ Ancienne facture supprimée: ${oldFilePath}`);
      }
    }
    
    const facturePath = await genererFactureContrat(contrat, req.user);
    
    await contrat.update({ facture_pdf: facturePath });
    
    await logAction(
      req.user.id,
      'CONTRAT_REGENERATE_FACTURE',
      'contrats',
      contrat.id,
      null,
      { facture_pdf: facturePath },
      req.ip
    );
    
    res.json({
      message: 'Facture régénérée avec succès',
      facture_pdf: facturePath
    });
    
  } catch (error) {
    console.error('❌ Erreur regenerateFacture:', error);
    res.status(500).json({ message: 'Erreur lors de la génération de la facture' });
  }
};

exports.exportContratsPDF = async (req, res) => {
  try {
    console.log('📄 Export PDF de la liste des contrats...');
    
    const contrats = await Contrat.findAll({
      order: [['created_at', 'DESC']]
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const fileName = `liste_contrats_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    doc.pipe(res);
    
    doc.fontSize(20).fillColor('#1e3a8a').text('LISTE DES CONTRATS', { align: 'center' });
    doc.moveDown(0.5);
    
    const dateGen = new Date().toLocaleDateString('fr-FR');
    doc.fontSize(10).fillColor('#666').text(`Généré le ${dateGen}`, { align: 'right' });
    doc.moveDown();
    
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    const actifs = contrats.filter(c => new Date(c.date_fin) > new Date()).length;
    const expires = contrats.filter(c => new Date(c.date_fin) <= new Date()).length;
    const montantTotal = contrats.reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
    
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Total contrats : ${contrats.length}`, 50, doc.y);
    doc.text(`Contrats actifs : ${actifs}`, 200, doc.y - 15);
    doc.text(`Contrats expirés : ${expires}`, 350, doc.y - 15);
    doc.text(`Montant total : ${montantTotal.toLocaleString()} CDF`, 50, doc.y + 5);
    doc.moveDown(2);
    
    const startY = doc.y;
    const rowHeight = 30;
    const colWidths = {
      numero: 100,
      fournisseur: 120,
      debut: 80,
      fin: 80,
      montant: 100,
      statut: 70
    };
    
    doc.fontSize(9).fillColor('#1f2937');
    doc.rect(50, startY, colWidths.numero, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.fillColor('#374151').text('N° Contrat', 55, startY + 8);
    
    doc.rect(50 + colWidths.numero, startY, colWidths.fournisseur, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.text('Fournisseur', 55 + colWidths.numero, startY + 8);
    
    doc.rect(50 + colWidths.numero + colWidths.fournisseur, startY, colWidths.debut, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.text('Début', 55 + colWidths.numero + colWidths.fournisseur, startY + 8);
    
    doc.rect(50 + colWidths.numero + colWidths.fournisseur + colWidths.debut, startY, colWidths.fin, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.text('Fin', 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut, startY + 8);
    
    doc.rect(50 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin, startY, colWidths.montant, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.text('Montant', 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin, startY + 8);
    
    doc.rect(50 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin + colWidths.montant, startY, colWidths.statut, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
    doc.text('Statut', 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin + colWidths.montant, startY + 8);
    
    let currentY = startY + rowHeight;
    let rowCount = 0;
    
    for (const contrat of contrats) {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        doc.rect(50, currentY, colWidths.numero, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fillColor('#374151').text('N° Contrat', 55, currentY + 8);
        doc.rect(50 + colWidths.numero, currentY, colWidths.fournisseur, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.text('Fournisseur', 55 + colWidths.numero, currentY + 8);
        doc.rect(50 + colWidths.numero + colWidths.fournisseur, currentY, colWidths.debut, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.text('Début', 55 + colWidths.numero + colWidths.fournisseur, currentY + 8);
        doc.rect(50 + colWidths.numero + colWidths.fournisseur + colWidths.debut, currentY, colWidths.fin, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.text('Fin', 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut, currentY + 8);
        doc.rect(50 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin, currentY, colWidths.montant, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.text('Montant', 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin, currentY + 8);
        doc.rect(50 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin + colWidths.montant, currentY, colWidths.statut, rowHeight).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.text('Statut', 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin + colWidths.montant, currentY + 8);
        currentY += rowHeight;
      }
      
      const bgColor = rowCount % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.fillColor(bgColor).rect(50, currentY, 500, rowHeight).fill();
      
      doc.fillColor('#111').fontSize(8);
      doc.text(contrat.numero_contrat.substring(0, 15), 55, currentY + 8);
      doc.text(contrat.fournisseur.substring(0, 20), 55 + colWidths.numero, currentY + 8);
      doc.text(new Date(contrat.date_debut).toLocaleDateString('fr-FR'), 55 + colWidths.numero + colWidths.fournisseur, currentY + 8);
      doc.text(new Date(contrat.date_fin).toLocaleDateString('fr-FR'), 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut, currentY + 8);
      doc.text(`${parseFloat(contrat.montant).toLocaleString()} FC`, 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin, currentY + 8);
      
      const maintenant = new Date();
      const estActif = new Date(contrat.date_fin) > maintenant;
      const statut = estActif ? 'Actif' : 'Expiré';
      const statutColor = estActif ? '#10b981' : '#ef4444';
      doc.fillColor(statutColor).text(statut, 55 + colWidths.numero + colWidths.fournisseur + colWidths.debut + colWidths.fin + colWidths.montant, currentY + 8);
      
      currentY += rowHeight;
      rowCount++;
    }
    
    doc.fillColor('#666').fontSize(8);
    doc.text(`Total : ${contrats.length} contrat(s)`, 50, currentY + 15);
    doc.text(`Montant total : ${montantTotal.toLocaleString()} CDF`, 50, currentY + 25);
    
    doc.end();
    
    console.log(`✅ PDF généré avec ${contrats.length} contrats`);
    
  } catch (error) {
    console.error('❌ Erreur exportContratsPDF:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};

exports.getContratsByActif = async (req, res) => {
  try {
    const { actifId } = req.params;
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }
    
    console.log(`🔍 getContratsByActif appelé pour actifId: ${actifId}`);
    
    const contrats = await Contrat.findAll({
      where: { actif_id: actifId },
      order: [['date_fin', 'ASC']]
    });
    
    console.log(`✅ ${contrats.length} contrats trouvés pour cet actif`);
    res.json(contrats);
  } catch (error) {
    console.error('❌ Erreur getContratsByActif:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createContratForActif = async (req, res) => {
  try {
    const { actifId } = req.params;
    
    if (!actifId) {
      return res.status(400).json({ message: 'actifId requis' });
    }

    const { 
      numero_contrat, 
      fournisseur, 
      date_debut, 
      date_fin, 
      montant, 
      description, 
      type 
    } = req.body;

    const actif = await Actif.findByPk(actifId);
    if (!actif) {
      return res.status(404).json({ message: 'Actif non trouvé' });
    }

    const contrat = await Contrat.create({
      actif_id: actifId,
      numero_contrat,
      fournisseur,
      date_debut,
      date_fin,
      montant,
      description,
      type: type || 'licence',
      created_by: req.user.id
    });

    console.log(`✅ Contrat créé: ${contrat.numero_contrat}`);

    let facturePath = null;
    try {
      facturePath = await genererFactureContrat(contrat, req.user);
      await contrat.update({ facture_pdf: facturePath });
      console.log(`📄 Facture générée pour contrat ${contrat.id} : ${facturePath}`);
    } catch (err) {
      console.error('⚠️ Erreur génération facture:', err.message);
    }

    await logAction(
      req.user.id,
      'CONTRAT_CREATE',
      'contrats',
      contrat.id,
      null,
      { 
        numero_contrat, 
        fournisseur, 
        montant, 
        date_debut, 
        date_fin, 
        description,
        type,
        facture_generée: !!facturePath
      },
      req.ip
    );

    res.status(201).json({
      ...contrat.toJSON(),
      facture_generée: !!facturePath,
      facture_pdf: facturePath
    });
  } catch (error) {
    console.error('❌ Erreur createContratForActif:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

exports.downloadContratFile = async (req, res) => {
  try {
    const { contratId } = req.params;
    const contrat = await Contrat.findByPk(contratId);
    
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    if (!contrat.fichier) {
      return res.status(404).json({ message: 'Aucun fichier associé' });
    }

    const filePath = path.join(__dirname, '../..', contrat.fichier);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier introuvable' });
    }

    res.download(filePath, `document_contrat_${contrat.numero_contrat}.pdf`);
  } catch (error) {
    console.error('Erreur downloadContratFile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.renouvelerContrat = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelle_date_fin, commentaire } = req.body;
    
    if (!nouvelle_date_fin) {
      return res.status(400).json({ message: 'Nouvelle date de fin requise' });
    }
    
    const contrat = await Contrat.findByPk(id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    const oldData = {
      date_fin: contrat.date_fin
    };
    
    await contrat.update({ 
      date_fin: nouvelle_date_fin,
      updated_by: req.user.id
    });
    
    await logAction(
      req.user.id,
      'CONTRAT_RENOUVELEMENT',
      'contrats',
      id,
      oldData,
      { nouvelle_date_fin, commentaire },
      req.ip
    );
    
    res.json({ 
      message: 'Contrat renouvelé avec succès', 
      contrat 
    });
  } catch (error) {
    console.error('Erreur renouvelerContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.resilierContrat = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif_resiliation, date_resiliation } = req.body;
    
    if (!motif_resiliation) {
      return res.status(400).json({ message: 'Motif de résiliation requis' });
    }
    
    const contrat = await Contrat.findByPk(id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }
    
    const oldData = {
      statut: contrat.statut,
      date_fin: contrat.date_fin
    };
    
    await contrat.update({ 
      statut: 'resilie',
      date_resiliation: date_resiliation || new Date(),
      motif_resiliation,
      updated_by: req.user.id
    });
    
    await logAction(
      req.user.id,
      'CONTRAT_RESILIATION',
      'contrats',
      id,
      oldData,
      { motif_resiliation, date_resiliation },
      req.ip
    );
    
    res.json({ 
      message: 'Contrat résilié avec succès', 
      contrat 
    });
  } catch (error) {
    console.error('Erreur resilierContrat:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};