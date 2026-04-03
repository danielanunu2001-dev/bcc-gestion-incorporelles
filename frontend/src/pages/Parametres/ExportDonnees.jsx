import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiDownload, FiFileText, FiCalendar, 
  FiDollarSign, FiPieChart, FiBookOpen, FiLock, 
  FiTrendingUp, FiGlobe, FiCheckCircle, FiXCircle
} from 'react-icons/fi';

const ExportDonneesBCC = () => {
  const navigate = useNavigate();
  const [exportConfig, setExportConfig] = useState({
    type: 'immobilisations',
    format: 'excel',
    periode: 'tout',
    dateDebut: '',
    dateFin: '',
    inclureArchives: false,
    inclureReservesChange: true,
    inclureOperationsMonetaires: true,
    inclureRapportsPolitique: false
  });

  const [exportStatus, setExportStatus] = useState({
    loading: false,
    success: false,
    error: null
  });

  const handleExport = () => {
    setExportStatus({ loading: true, success: false, error: null });
    
    // Simulation d'export avec délai
    setTimeout(() => {
      try {
        console.log('Export BCC lancé avec config:', exportConfig);
        
        // Création du contenu à exporter
        const exportData = generateExportData();
        const fileName = generateFileName();
        
        // Téléchargement selon le format
        downloadFile(exportData, fileName);
        
        setExportStatus({ loading: false, success: true, error: null });
        setTimeout(() => setExportStatus({ loading: false, success: false, error: null }), 3000);
      } catch (error) {
        setExportStatus({ loading: false, success: false, error: error.message });
        setTimeout(() => setExportStatus({ loading: false, success: false, error: null }), 3000);
      }
    }, 1500);
  };

  const generateExportData = () => {
    // Données simulées pour l'export
    const data = {
      date: new Date().toISOString(),
      institution: "Banque Centrale du Congo (BCC)",
      devise: "Francs Congolais (CDF)",
      type: exportConfig.type,
      periode: exportConfig.periode,
      donnees: {}
    };

    switch(exportConfig.type) {
      case 'immobilisations':
        data.donnees = {
          total: 125000000000,
          corporelles: 89000000000,
          incorporelles: 36000000000,
          details: [
            { code: '211', libelle: 'Terrains et bâtiments', valeur: 45000000000, amortissement: 5000000000 },
            { code: '215', libelle: 'Matériel de sécurité monétaire', valeur: 28000000000, amortissement: 3500000000 },
            { code: '218', libelle: 'Matériel de transport', valeur: 16000000000, amortissement: 2800000000 },
            { code: '205', libelle: 'Logiciels et systèmes', valeur: 36000000000, amortissement: 7200000000 }
          ]
        };
        break;
        
      case 'reserves':
        data.donnees = {
          reservesChange: 2450000000000,
          reservesMonetaires: 890000000000,
          or: 1560000000000,
          devises: 890000000000,
          evolution: [
            { annee: 2022, montant: 2100000000000 },
            { annee: 2023, montant: 2250000000000 },
            { annee: 2024, montant: 2450000000000 }
          ]
        };
        break;
        
      case 'operationsMonetaires':
        data.donnees = {
          refinancement: 1890000000000,
          tauxDirecteur: 11.5,
          encoursBillets: 3450000000000,
          operations: [
            { type: 'Appels d\'offres', montant: 890000000000, taux: 11.25 },
            { type: 'Facilités permanentes', montant: 450000000000, taux: 12.0 },
            { type: 'Reprise de liquidité', montant: 550000000000, taux: 11.0 }
          ]
        };
        break;
        
      case 'resultats':
        data.donnees = {
          exercice: 2024,
          produits: 185000000000,
          charges: 157000000000,
          resultat: 28000000000,
          reportANouveau: 19500000000,
          affectation: {
            reserves: 14000000000,
            dividendes: 8000000000,
            report: 6000000000
          }
        };
        break;
        
      default:
        data.donnees = {
          immobilisations: { total: 125000000000 },
          reserves: { reservesChange: 2450000000000 },
          operationsMonetaires: { refinancement: 1890000000000 }
        };
    }
    
    return data;
  };

  const generateFileName = () => {
    const date = new Date().toISOString().split('T')[0];
    const typeMap = {
      immobilisations: 'immobilisations_bcc',
      reserves: 'reserves_de_change_bcc',
      operationsMonetaires: 'operations_monetaires_bcc',
      resultats: 'resultats_financiers_bcc',
      tout: 'export_complet_bcc'
    };
    const typeFile = typeMap[exportConfig.type] || 'export_bcc';
    const format = exportConfig.format === 'excel' ? 'xlsx' : exportConfig.format;
    return `${typeFile}_${date}.${format}`;
  };

  const downloadFile = (data, fileName) => {
    // Simulation de téléchargement
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };

  const formatCurrency = (value) => {
    if (!value) return '0';
    return value.toLocaleString('fr-FR') + ' CDF';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/parametres')} style={styles.backButton}>
          <FiArrowLeft /> Retour
        </button>
        <div style={styles.headerInfo}>
          <div style={styles.iconWrapper}>
            <FiDownload size={28} color="#10b981" />
          </div>
          <div>
            <h1 style={styles.title}>Export de données - BCC</h1>
            <p style={styles.subtitle}>
              Export des données comptables et financières - Montants en Francs Congolais (CDF)
            </p>
          </div>
        </div>
      </div>

      {/* Message de statut */}
      {exportStatus.success && (
        <div style={styles.successMessage}>
          <FiCheckCircle size={20} />
          <span>Export réalisé avec succès !</span>
        </div>
      )}
      {exportStatus.error && (
        <div style={styles.errorMessage}>
          <FiXCircle size={20} />
          <span>{exportStatus.error}</span>
        </div>
      )}

      <div style={styles.content}>
        {/* Type de données BCC */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Type de données BCC</h3>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="type"
                value="immobilisations"
                checked={exportConfig.type === 'immobilisations'}
                onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
              />
              <FiBookOpen size={16} /> Immobilisations
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="type"
                value="reserves"
                checked={exportConfig.type === 'reserves'}
                onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
              />
              <FiGlobe size={16} /> Réserves de change
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="type"
                value="operationsMonetaires"
                checked={exportConfig.type === 'operationsMonetaires'}
                onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
              />
              <FiTrendingUp size={16} /> Opérations monétaires
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="type"
                value="resultats"
                checked={exportConfig.type === 'resultats'}
                onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
              />
              <FiPieChart size={16} /> Résultats financiers
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="type"
                value="tout"
                checked={exportConfig.type === 'tout'}
                onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
              />
              Export complet BCC
            </label>
          </div>
        </div>

        {/* Format d'export */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Format d'export</h3>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="format"
                value="excel"
                checked={exportConfig.format === 'excel'}
                onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
              />
              Excel (.xlsx)
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportConfig.format === 'csv'}
                onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
              />
              CSV
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={exportConfig.format === 'pdf'}
                onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
              />
              PDF
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="format"
                value="json"
                checked={exportConfig.format === 'json'}
                onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
              />
              JSON
            </label>
          </div>
        </div>

        {/* Période */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Période comptable</h3>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="periode"
                value="tout"
                checked={exportConfig.periode === 'tout'}
                onChange={(e) => setExportConfig({ ...exportConfig, periode: e.target.value })}
              />
              Toutes les données
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="periode"
                value="personnalisee"
                checked={exportConfig.periode === 'personnalisee'}
                onChange={(e) => setExportConfig({ ...exportConfig, periode: e.target.value })}
              />
              Période personnalisée
            </label>
          </div>

          {exportConfig.periode === 'personnalisee' && (
            <div style={styles.dateRange}>
              <div style={styles.dateInput}>
                <FiCalendar style={styles.dateIcon} />
                <input
                  type="date"
                  value={exportConfig.dateDebut}
                  onChange={(e) => setExportConfig({ ...exportConfig, dateDebut: e.target.value })}
                  style={styles.dateField}
                />
              </div>
              <span style={styles.dateSeparator}>au</span>
              <div style={styles.dateInput}>
                <FiCalendar style={styles.dateIcon} />
                <input
                  type="date"
                  value={exportConfig.dateFin}
                  onChange={(e) => setExportConfig({ ...exportConfig, dateFin: e.target.value })}
                  style={styles.dateField}
                />
              </div>
            </div>
          )}
        </div>

        {/* Options spécifiques BCC */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Options d'export BCC</h3>
          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={exportConfig.inclureArchives}
                onChange={(e) => setExportConfig({ ...exportConfig, inclureArchives: e.target.checked })}
              />
              Inclure les données archivées
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={exportConfig.inclureReservesChange}
                onChange={(e) => setExportConfig({ ...exportConfig, inclureReservesChange: e.target.checked })}
              />
              Inclure les réserves de change
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={exportConfig.inclureOperationsMonetaires}
                onChange={(e) => setExportConfig({ ...exportConfig, inclureOperationsMonetaires: e.target.checked })}
              />
              Inclure les opérations monétaires
            </label>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={exportConfig.inclureRapportsPolitique}
                onChange={(e) => setExportConfig({ ...exportConfig, inclureRapportsPolitique: e.target.checked })}
              />
              Inclure les rapports de politique monétaire
            </label>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button 
            onClick={handleExport} 
            style={styles.exportButton}
            disabled={exportStatus.loading}
          >
            {exportStatus.loading ? (
              <>
                <div style={styles.spinnerSmall}></div>
                Export en cours...
              </>
            ) : (
              <>
                <FiDownload /> Exporter
              </>
            )}
          </button>
          <button onClick={() => navigate('/parametres')} style={styles.cancelButton}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#475569'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  iconWrapper: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#d1fae5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#065f46',
    fontSize: '0.875rem'
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '10px',
    marginBottom: '1.5rem',
    color: '#991b1b',
    fontSize: '0.875rem'
  },
  content: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #f1f5f9'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '1rem'
  },
  radioGroup: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  dateRange: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    flexWrap: 'wrap'
  },
  dateInput: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    border: '1px solid #e2e8f0'
  },
  dateIcon: {
    color: '#94a3b8',
    marginRight: '0.5rem'
  },
  dateField: {
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '0.875rem'
  },
  dateSeparator: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#1e293b'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem'
  },
  exportButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569'
  },
  spinnerSmall: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'var(--bg-card)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  }
};

// Ajout des animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default ExportDonneesBCC;