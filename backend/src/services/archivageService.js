// backend/src/services/archivageService.js

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { AuditLog, Actif, Contrat, Exercice } = require('../models');
const { Op } = require('sequelize');

class ArchivageService {
  
  constructor() {
    this.archivePath = path.join(process.cwd(), 'archives');
    this.retentionDays = 365 * 10; // 10 ans de conservation
  }
  
  // Créer une archive légale
  async creerArchiveLegale(periode, userId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `archive_bcc_${periode.debut}_${periode.fin}_${timestamp}.zip`;
    const archiveFilePath = path.join(this.archivePath, archiveName);
    
    // Créer le dossier d'archives s'il n'existe pas
    if (!fs.existsSync(this.archivePath)) {
      fs.mkdirSync(this.archivePath, { recursive: true });
    }
    
    const output = fs.createWriteStream(archiveFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', async () => {
        // Log d'archivage
        await AuditLog.create({
          user_id: userId,
          action: 'ARCHIVE_LEGALE',
          table_name: 'archives',
          new_data: { archiveName, taille: archive.pointer() },
          action_date: new Date()
        });
        
        resolve({
          success: true,
          archiveName,
          taille: archive.pointer(),
          chemin: archiveFilePath
        });
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      // Ajouter les données à archiver
      this.ajouterDonneesArchive(archive, periode);
      archive.finalize();
    });
  }
  
  async ajouterDonneesArchive(archive, periode) {
    // Récupérer et ajouter les actifs de la période
    const actifs = await Actif.findAll({
      where: {
        created_at: { [Op.between]: [new Date(periode.debut), new Date(periode.fin)] }
      }
    });
    archive.append(JSON.stringify(actifs, null, 2), { name: `actifs_${periode.debut}_${periode.fin}.json` });
    
    // Récupérer et ajouter les contrats
    const contrats = await Contrat.findAll({
      where: {
        created_at: { [Op.between]: [new Date(periode.debut), new Date(periode.fin)] }
      }
    });
    archive.append(JSON.stringify(contrats, null, 2), { name: `contrats_${periode.debut}_${periode.fin}.json` });
    
    // Récupérer et ajouter les exercices
    const exercices = await Exercice.findAll({
      where: {
        date_cloture: { [Op.between]: [new Date(periode.debut), new Date(periode.fin)] }
      }
    });
    archive.append(JSON.stringify(exercices, null, 2), { name: `exercices_${periode.debut}_${periode.fin}.json` });
    
    // Récupérer et ajouter les logs d'audit
    const logs = await AuditLog.findAll({
      where: {
        action_date: { [Op.between]: [new Date(periode.debut), new Date(periode.fin)] }
      }
    });
    archive.append(JSON.stringify(logs, null, 2), { name: `audit_logs_${periode.debut}_${periode.fin}.json` });
    
    // Ajouter un fichier de métadonnées
    const metadata = {
      date_creation: new Date().toISOString(),
      periode_archivee: periode,
      nombre_actifs: actifs.length,
      nombre_contrats: contrats.length,
      nombre_exercices: exercices.length,
      nombre_logs: logs.length,
      retention_ans: 10
    };
    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });
  }
  
  // Nettoyer les archives expirées (plus de 10 ans)
  async nettoyerArchives() {
    const dateLimite = new Date();
    dateLimite.setFullYear(dateLimite.getFullYear() - 10);
    
    const fichiers = fs.readdirSync(this.archivePath);
    let supprimes = 0;
    
    for (const fichier of fichiers) {
      const chemin = path.join(this.archivePath, fichier);
      const stats = fs.statSync(chemin);
      
      if (stats.mtime < dateLimite) {
        fs.unlinkSync(chemin);
        supprimes++;
      }
    }
    
    return { supprimes, message: `${supprimes} archive(s) supprimée(s)` };
  }
}

module.exports = new ArchivageService();