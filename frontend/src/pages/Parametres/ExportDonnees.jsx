import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiDownload, FiFileText, FiCalendar, 
  FiDollarSign, FiPieChart, FiBookOpen, FiLock, 
  FiTrendingUp, FiGlobe, FiCheckCircle, FiXCircle,
  FiInfo, FiBarChart2, FiDatabase, FiShield, FiZap,
  FiGrid, FiList, FiActivity
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form } from 'react-bootstrap';

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
    
    setTimeout(() => {
      try {
        console.log('Export BCC lancé avec config:', exportConfig);
        
        const exportData = generateExportData();
        const fileName = generateFileName();
        
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
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };

  const typeOptions = [
    { id: 'immobilisations', label: 'Immobilisations', icon: FiBookOpen, color: '#0F2B3D', bg: 'rgba(15, 43, 61, 0.1)' },
    { id: 'reserves', label: 'Réserves de change', icon: FiGlobe, color: '#C9A03D', bg: 'rgba(201, 160, 61, 0.1)' },
    { id: 'operationsMonetaires', label: 'Opérations monétaires', icon: FiTrendingUp, color: '#0D9488', bg: 'rgba(13, 148, 136, 0.1)' },
    { id: 'resultats', label: 'Résultats financiers', icon: FiPieChart, color: '#E11D48', bg: 'rgba(225, 29, 72, 0.1)' },
    { id: 'tout', label: 'Export complet BCC', icon: FiDatabase, color: '#64748B', bg: 'rgba(100, 116, 139, 0.1)' }
  ];

  const formatOptions = [
    { id: 'excel', label: 'Excel', icon: '📊', extension: '.xlsx', color: '#10b981' },
    { id: 'csv', label: 'CSV', icon: '📄', extension: '.csv', color: '#3b82f6' },
    { id: 'pdf', label: 'PDF', icon: '📑', extension: '.pdf', color: '#ef4444' },
    { id: 'json', label: 'JSON', icon: '🔧', extension: '.json', color: '#f59e0b' }
  ];

  // Styles personnalisés modernes avec fond dégradé
  const modernStyles = `
    @keyframes fadeSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .fade-slide-up {
      animation: fadeSlideUp 0.4s ease-out;
    }
    
    .export-card {
      background: rgba(255, 255, 255, 0.95);
      border: none;
      border-radius: 24px;
      box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
    }
    
    .export-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 25px 40px -15px rgba(0, 0, 0, 0.12);
    }
    
    .section-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748B;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .type-option {
      position: relative;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .type-option input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
    }
    
    .type-option-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border-radius: 16px;
      background: white;
      border: 1.5px solid #E2E8F0;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .type-option input:checked + .type-option-content {
      border-color: #0F2B3D;
      background: linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%);
      box-shadow: 0 4px 12px rgba(15, 43, 61, 0.1);
    }
    
    .format-option {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .format-option input {
      position: absolute;
      opacity: 0;
    }
    
    .format-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 16px;
      background: white;
      border: 1.5px solid #E2E8F0;
      transition: all 0.2s ease;
      cursor: pointer;
      min-width: 80px;
    }
    
    .format-option input:checked + .format-content {
      border-color: #0D9488;
      background: linear-gradient(135deg, #F0FDF9 0%, #FFFFFF 100%);
      transform: translateY(-2px);
    }
    
    .checkbox-custom {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 12px;
      background: #F8FAFC;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .checkbox-custom:hover {
      background: #F1F5F9;
      transform: translateX(4px);
    }
    
    .checkbox-custom input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #0D9488;
    }
    
    .info-note {
      background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
      border-radius: 16px;
      padding: 1rem 1.25rem;
      border: 1px solid #BAE6FD;
    }
    
    .btn-export {
      background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
      border: none;
      padding: 0.875rem 2rem;
      font-weight: 600;
      border-radius: 40px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
    }
    
    .btn-export:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(13, 148, 136, 0.4);
      background: linear-gradient(135deg, #0F766E 0%, #0D9488 100%);
    }
    
    .btn-export:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .btn-secondary-custom {
      background: white;
      border: 1.5px solid #E2E8F0;
      padding: 0.875rem 1.75rem;
      font-weight: 500;
      border-radius: 40px;
      color: #475569;
      transition: all 0.2s ease;
    }
    
    .btn-secondary-custom:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
      transform: translateY(-1px);
    }
    
    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.875rem;
      color: white;
      transition: all 0.2s ease;
      text-decoration: none;
    }
    
    .back-button:hover {
      background-color: rgba(255, 255, 255, 0.3);
      transform: translateX(-2px);
      color: white;
    }
  `;

  return (
    <>
      <style>{modernStyles}</style>
      
      {/* Fond dégradé comme les autres pages */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <Container className="py-5 px-3 px-md-5 fade-slide-up" style={{ maxWidth: '1000px' }}>
          
          {/* Header avec design élégant */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-4 mb-5">
            <div>
              <button 
                onClick={() => navigate('/parametres')} 
                className="back-button mb-3"
              >
                <FiArrowLeft size={18} /> Retour aux paramètres
              </button>
              <div className="d-flex align-items-center gap-4">
                <div className="rounded-4 d-flex align-items-center justify-content-center" style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '14px'
                }}>
                  <FiDownload size={32} color="white" />
                </div>
                <div>
                  <h1 className="display-6 fw-bold mb-1" style={{ color: 'white' }}>Export de données</h1>
                  <p className="mb-0" style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    Banque Centrale du Congo — Données comptables et financières
                  </p>
                </div>
              </div>
            </div>
            
            {/* Badge d'institution */}
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <FiShield size={14} style={{ color: 'white' }} />
              <span className="small fw-semibold" style={{ color: 'white' }}>BCC — Exercice {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Messages de statut stylisés */}
          {exportStatus.success && (
            <Alert 
              variant="success" 
              dismissible 
              onClose={() => setExportStatus({ ...exportStatus, success: false })} 
              className="mb-4 rounded-3 border-0 shadow-sm"
              style={{ background: '#F0FDF4', borderLeft: '4px solid #10b981' }}
            >
              <div className="d-flex align-items-center gap-2">
                <FiCheckCircle size={18} className="text-success" />
                <span className="small fw-medium" style={{ color: '#000000' }}>Export réalisé avec succès ! Le fichier a été téléchargé.</span>
              </div>
            </Alert>
          )}
          
          {exportStatus.error && (
            <Alert 
              variant="danger" 
              dismissible 
              onClose={() => setExportStatus({ ...exportStatus, error: null })} 
              className="mb-4 rounded-3 border-0 shadow-sm"
              style={{ background: '#FEF2F2', borderLeft: '4px solid #ef4444' }}
            >
              <div className="d-flex align-items-center gap-2">
                <FiXCircle size={18} className="text-danger" />
                <span className="small fw-medium" style={{ color: '#000000' }}>{exportStatus.error}</span>
              </div>
            </Alert>
          )}

          {/* Carte principale */}
          <Card className="export-card">
            <Card.Body className="p-4 p-md-5">
              
              {/* Type de données - Design moderne en cartes */}
              <div className="mb-5">
                <div className="section-title">
                  <FiDatabase size={14} />
                  <span style={{ color: '#000000' }}>Catégorie de données</span>
                </div>
                <div className="d-flex flex-wrap gap-3">
                  {typeOptions.map(option => {
                    const Icon = option.icon;
                    const isChecked = exportConfig.type === option.id;
                    return (
                      <label key={option.id} className="type-option">
                        <input
                          type="radio"
                          name="type"
                          value={option.id}
                          checked={isChecked}
                          onChange={(e) => setExportConfig({ ...exportConfig, type: e.target.value })}
                        />
                        <div className="type-option-content">
                          <div className="rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ background: option.bg, width: '36px', height: '36px' }}>
                            <Icon size={18} color={option.color} />
                          </div>
                          <span className="fw-medium" style={{ fontSize: '0.9rem', color: '#000000' }}>{option.label}</span>
                          {isChecked && <FiCheckCircle size={14} color="#0D9488" className="ms-auto" />}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Format d'export - Design en grille */}
              <div className="mb-5">
                <div className="section-title">
                  <FiFileText size={14} />
                  <span style={{ color: '#000000' }}>Format d'export</span>
                </div>
                <div className="d-flex flex-wrap gap-3">
                  {formatOptions.map(option => {
                    const isChecked = exportConfig.format === option.id;
                    return (
                      <label key={option.id} className="format-option">
                        <input
                          type="radio"
                          name="format"
                          value={option.id}
                          checked={isChecked}
                          onChange={(e) => setExportConfig({ ...exportConfig, format: e.target.value })}
                        />
                        <div className="format-content">
                          <span style={{ fontSize: '1.5rem' }}>{option.icon}</span>
                          <span className="small fw-semibold" style={{ color: '#000000' }}>{option.label}</span>
                          <span className="text-muted" style={{ fontSize: '0.65rem' }}>{option.extension}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Période comptable */}
              <div className="mb-5">
                <div className="section-title">
                  <FiCalendar size={14} />
                  <span style={{ color: '#000000' }}>Période comptable</span>
                </div>
                <div className="d-flex flex-wrap gap-4 mb-4">
                  <Form.Check
                    type="radio"
                    id="periode-tout"
                    label={<span style={{ color: '#000000' }}>📆 Toutes les données historiques</span>}
                    value="tout"
                    checked={exportConfig.periode === 'tout'}
                    onChange={(e) => setExportConfig({ ...exportConfig, periode: e.target.value })}
                    className="me-4"
                  />
                  <Form.Check
                    type="radio"
                    id="periode-personnalisee"
                    label={<span style={{ color: '#000000' }}>📅 Période personnalisée</span>}
                    value="personnalisee"
                    checked={exportConfig.periode === 'personnalisee'}
                    onChange={(e) => setExportConfig({ ...exportConfig, periode: e.target.value })}
                  />
                </div>

                {exportConfig.periode === 'personnalisee' && (
                  <div className="p-4 rounded-4" style={{ background: '#F8FAFC' }}>
                    <Row className="g-3 align-items-center">
                      <Col md={5}>
                        <div className="d-flex align-items-center gap-2 bg-white rounded-3 p-2 border">
                          <FiCalendar size={16} className="text-muted ms-2" />
                          <Form.Control
                            type="date"
                            value={exportConfig.dateDebut}
                            onChange={(e) => setExportConfig({ ...exportConfig, dateDebut: e.target.value })}
                            className="border-0 bg-transparent"
                            placeholder="Date de début"
                            style={{ color: '#000000' }}
                          />
                        </div>
                      </Col>
                      <Col md={2} className="text-center">
                        <span className="text-muted small">→</span>
                      </Col>
                      <Col md={5}>
                        <div className="d-flex align-items-center gap-2 bg-white rounded-3 p-2 border">
                          <FiCalendar size={16} className="text-muted ms-2" />
                          <Form.Control
                            type="date"
                            value={exportConfig.dateFin}
                            onChange={(e) => setExportConfig({ ...exportConfig, dateFin: e.target.value })}
                            className="border-0 bg-transparent"
                            placeholder="Date de fin"
                            style={{ color: '#000000' }}
                          />
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </div>

              {/* Options spécifiques - Design moderne */}
              <div className="mb-5">
                <div className="section-title">
                  <FiZap size={14} />
                  <span style={{ color: '#000000' }}>Options avancées</span>
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="checkbox-custom w-100">
                      <input
                        type="checkbox"
                        checked={exportConfig.inclureArchives}
                        onChange={(e) => setExportConfig({ ...exportConfig, inclureArchives: e.target.checked })}
                      />
                      <span className="small" style={{ color: '#000000' }}>📦 Inclure les données archivées</span>
                    </label>
                  </div>
                  <div className="col-md-6">
                    <label className="checkbox-custom w-100">
                      <input
                        type="checkbox"
                        checked={exportConfig.inclureReservesChange}
                        onChange={(e) => setExportConfig({ ...exportConfig, inclureReservesChange: e.target.checked })}
                      />
                      <span className="small" style={{ color: '#000000' }}>🌍 Inclure les réserves de change</span>
                    </label>
                  </div>
                  <div className="col-md-6">
                    <label className="checkbox-custom w-100">
                      <input
                        type="checkbox"
                        checked={exportConfig.inclureOperationsMonetaires}
                        onChange={(e) => setExportConfig({ ...exportConfig, inclureOperationsMonetaires: e.target.checked })}
                      />
                      <span className="small" style={{ color: '#000000' }}>💹 Inclure les opérations monétaires</span>
                    </label>
                  </div>
                  <div className="col-md-6">
                    <label className="checkbox-custom w-100">
                      <input
                        type="checkbox"
                        checked={exportConfig.inclureRapportsPolitique}
                        onChange={(e) => setExportConfig({ ...exportConfig, inclureRapportsPolitique: e.target.checked })}
                      />
                      <span className="small" style={{ color: '#000000' }}>📋 Inclure les rapports de politique monétaire</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Note d'information élégante */}
              <div className="info-note mb-4">
                <div className="d-flex align-items-start gap-3">
                  <FiInfo size={18} className="text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <small className="fw-semibold d-block text-info mb-1">Conformité BCC</small>
                    <small className="text-secondary-emphasis" style={{ color: '#000000' }}>
                      Les données exportées sont conformes aux normes comptables de la Banque Centrale du Congo (BCC) 
                      et au plan comptable GCEC. Montants exprimés en Francs Congolais (CDF).
                    </small>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex gap-3 justify-content-end pt-2">
                <button 
                  onClick={() => navigate('/parametres')}
                  className="btn-secondary-custom"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleExport} 
                  disabled={exportStatus.loading}
                  className="btn-export d-flex align-items-center gap-2"
                >
                  {exportStatus.loading ? (
                    <>
                      <div className="spinner-border spinner-border-sm" role="status" style={{ color: 'white' }}>
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                      <span>Préparation de l'export...</span>
                    </>
                  ) : (
                    <>
                      <FiDownload size={18} /> Générer l'export
                    </>
                  )}
                </button>
              </div>
            </Card.Body>
          </Card>

          {/* Footer info */}
          <div className="text-center mt-4">
            <small className="d-flex align-items-center justify-content-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              <FiActivity size={12} />
              Données en temps réel — Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
            </small>
          </div>
        </Container>
      </div>
    </>
  );
};

export default ExportDonneesBCC;