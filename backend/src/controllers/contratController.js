// backend/src/controllers/contratController.js

const { Contrat, Actif, AuditLog } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const moment = require('moment');

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

// ==================== FONCTION DE GÉNÉRATION DE FACTURE PROFESSIONNELLE ====================
const genererFactureContrat = async (contrat, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier de destination s'il n'existe pas
      const uploadDir = path.join(__dirname, '../../uploads/factures_contrats');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `facture_contrat_${contrat.numero_contrat.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(uploadDir, fileName);
      const relativePath = `/uploads/factures_contrats/${fileName}`;

      // Créer le document PDF
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- EN-TÊTE AVEC LOGO ---
      try {
        const logoPath = path.join(__dirname, '../../public/images/logo-bcc.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 45, { width: 100 });
        } else {
          doc.fontSize(10).text('BANQUE CENTRALE DU CONGO', 50, 50);
        }
      } catch (err) {
        console.warn('Logo introuvable');
      }

      doc.fontSize(18)
         .fillColor('#1e3a8a')
         .text('FACTURE DE CONTRAT', 0, 50, { align: 'center' });

      doc.moveDown();

      // --- INFORMATIONS CONTRAT ---
      doc.fontSize(10).fillColor('#000');
      doc.text(`N° Facture : FAC-${contrat.numero_contrat}`, { align: 'right' });
      doc.text(`Date d'émission : ${moment().format('DD/MM/YYYY')}`, { align: 'right' });
      doc.moveDown();

      // Coordonnées BCC
      doc.fontSize(9)
         .text('BANQUE CENTRALE DU CONGO', 50, doc.y)
         .text('Direction des Immobilisations', 50, doc.y)
         .text('Boulevard Colonel Tshatshi, Kinshasa/Gombe', 50, doc.y)
         .text('Tél : +243 123 456 789', 50, doc.y)
         .text('Email : immobilisations@bcc.cd', 50, doc.y);

      doc.moveDown();

      // --- DÉTAILS DU CONTRAT ---
      doc.fontSize(12).fillColor('#1e3a8a').text('Détails du contrat', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#000');

      doc.text(`Numéro de contrat : ${contrat.numero_contrat}`);
      doc.text(`Fournisseur : ${contrat.fournisseur}`);
      doc.text(`Type de contrat : ${contrat.type || 'Licence'}`);
      doc.text(`Période : ${moment(contrat.date_debut).format('DD/MM/YYYY')} → ${moment(contrat.date_fin).format('DD/MM/YYYY')}`);

      // Montants
      const montantHT = parseFloat(contrat.montant) || 0;
      const tva = montantHT * 0.16;
      const montantTTC = montantHT + tva;

      doc.moveDown();
      doc.text(`Montant HT : ${montantHT.toLocaleString()} CDF`);
      doc.text(`TVA (16%) : ${tva.toLocaleString()} CDF`);
      doc.fontSize(12).fillColor('#10b981').text(`Montant TTC : ${montantTTC.toLocaleString()} CDF`);
      doc.fillColor('#000');

      // Description
      if (contrat.description) {
        doc.moveDown();
        doc.fontSize(10).text('Description des prestations :', { underline: true });
        doc.text(contrat.description);
      }

      // --- PIED DE PAGE ---
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#666')
         .text('Cette facture fait office de justificatif de paiement.', { align: 'center' })
         .text('Conformément aux dispositions du Code des marchés publics.', { align: 'center' })
         .text(`Générée le ${moment().format('DD/MM/YYYY à HH:mm')}`, { align: 'center' });

      // Finaliser
      doc.end();

      stream.on('finish', () => {
        console.log(`✅ Facture générée: ${relativePath}`);
        resolve(relativePath);
      });

      stream.on('error', reject);
    } catch (error) {
      console.error('Erreur génération facture contrat:', error);
      reject(error);
    }
  });
};

// ==================== ROUTES PRINCIPALES ====================

/**
 * Récupérer TOUS les contrats (sans filtre)
 * GET /api/contrats
 */
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

/**
 * Récupérer tous les contrats d'un actif spécifique
 * GET /api/actifs/:actifId/contrats
 */
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

/**
 * Récupérer un contrat par son ID
 * GET /api/contrats/:id
 */
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

/**
 * Créer un nouveau contrat
 * POST /api/contrats ou POST /api/actifs/:id/contrats
 */
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

    // Création du contrat
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

    // ✅ GÉNÉRATION AUTOMATIQUE DE LA FACTURE
    let facturePath = null;
    try {
      facturePath = await genererFactureContrat(contrat, req.user);
      await contrat.update({ facture_pdf: facturePath });
      console.log(`📄 Facture générée pour contrat ${contrat.id} : ${facturePath}`);
    } catch (err) {
      console.error('⚠️ Erreur génération facture:', err.message);
    }

    // Log d'audit
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

/**
 * Mettre à jour un contrat
 * PUT /api/contrats/:id
 */
exports.updateContrat = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contrat = await Contrat.findByPk(id);
    if (!contrat) {
      return res.status(404).json({ message: 'Contrat non trouvé' });
    }

    // Sauvegarder les anciennes valeurs pour le log
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

/**
 * Supprimer un contrat
 * DELETE /api/contrats/:id
 */
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

/**
 * Upload d'un fichier pour un contrat (optionnel)
 * POST /api/contrats/:contratId/upload
 */
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

// ==================== ROUTES FACTURE ====================

/**
 * Récupérer les métadonnées de la facture d'un contrat
 * GET /api/contrats/:id/facture
 */
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

/**
 * Télécharger le PDF de la facture d'un contrat
 * GET /api/contrats/:id/facture/download
 */
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

/**
 * Régénérer la facture pour un contrat existant
 * POST /api/contrats/:id/regenerate-facture
 */
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

// ==================== EXPORT PDF ====================

/**
 * Exporter la liste des contrats en PDF
 * GET /api/contrats/export/pdf
 */
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
    
    // En-tête
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
    
    // En-têtes du tableau
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

// ==================== ROUTES COMPLÉMENTAIRES ====================

/**
 * Récupérer les contrats par actif (alias pour getContrats)
 * GET /api/contrats/actif/:actifId
 */
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

/**
 * Créer un contrat pour un actif spécifique
 * POST /api/contrats/actif/:actifId
 */
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

/**
 * Télécharger un fichier de contrat
 * GET /api/contrats/:contratId/fichier/:fichierId
 */
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

/**
 * Renouveler un contrat
 * POST /api/contrats/:id/renouveler
 */
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

/**
 * Résilier un contrat
 * POST /api/contrats/:id/resilier
 */
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