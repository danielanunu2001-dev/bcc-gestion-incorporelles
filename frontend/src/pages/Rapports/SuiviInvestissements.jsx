// frontend/src/pages/Rapports/SuiviInvestissements.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  FiTrendingUp, FiDollarSign, FiPieChart, FiBarChart2,
  FiCalendar, FiRefreshCw, FiDownload,
  FiAlertCircle, FiCheckCircle, FiXCircle,
  FiShield, FiInfo, FiMaximize2, FiMinimize2,
  FiHelpCircle, FiArrowLeft
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Table, ProgressBar, Modal, Accordion } from 'react-bootstrap';
import jsPDF from 'jspdf';

const SuiviInvestissements = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anneeDebut, setAnneeDebut] = useState(2021);
  const [anneeFin, setAnneeFin] = useState(2025);
  const [typeInvestissement, setTypeInvestissement] = useState('tous');
  const [viewMode, setViewMode] = useState('graph');
  const [chartType, setChartType] = useState('bar');
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [deviseAffichage, setDeviseAffichage] = useState('CDF');
  const [showChartHelp, setShowChartHelp] = useState(false);

  // États IA
  const [showAIAnalyse, setShowAIAnalyse] = useState(false);
  const [aiAnalyse, setAiAnalyse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  
  // États pour les prédictions IA
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predictionIA, setPredictionIA] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState(5);

  // Taux de change
  const [tauxChange, setTauxChange] = useState({ USD: 2450, EUR: 2650, GBP: 3100 });

  // Types d'investissement disponibles
  const typesInvestissement = [
    { value: 'tous', label: 'Tous les types' },
    { value: 'equipement', label: 'Équipement' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'technologie', label: 'Technologie' },
    { value: 'formation', label: 'Formation' },
    { value: 'recherche', label: 'Recherche & Développement' }
  ];

  // Explications des diagrammes
  const chartExplanations = {
    bar: {
      title: "DIAGRAMME À BARRES",
      icon: "📊",
      description: "Des barres verticales comparant le budget prévisionnel et le réalisé pour chaque année.",
      howItWorks: "Chaque année a deux barres : une pour le budget (orange) et une pour le réalisé (vert).",
      whenToUse: [
        "Comparer visuellement budget et réalisé année par année",
        "Identifier rapidement les écarts importants",
        "Visualiser les tendances sur plusieurs années"
      ],
      howToRead: [
        "Barre orange = Budget prévisionnel",
        "Barre verte = Montant réalisé",
        "Plus l'écart entre les barres est grand, plus l'écart budgétaire est important"
      ],
      example: "Si la barre verte est plus basse que la barre orange, l'investissement est sous-budgété."
    },
    pie: {
      title: "DIAGRAMME EN CAMEMBERT",
      icon: "🥧",
      description: "Un cercle montrant la répartition entre budget total et réalisé total.",
      howItWorks: "Le cercle entier = 100% de la valeur. Deux parts : budget total et réalisé total.",
      whenToUse: [
        "Avoir une vue d'ensemble sur toute la période",
        "Visualiser rapidement le taux de réalisation global",
        "Présenter un résumé synthétique"
      ],
      howToRead: [
        "Part orange = Budget total sur la période",
        "Part verte = Réalisé total",
        "Plus la part verte est proche de la part orange, meilleure est la performance"
      ],
      example: "Si la part verte représente 80% du cercle, alors 80% du budget total a été réalisé."
    }
  };

  // Fonction pour charger les données
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Chargement des investissements:', { 
        annee_debut: anneeDebut, 
        annee_fin: anneeFin, 
        type: typeInvestissement !== 'tous' ? typeInvestissement : undefined 
      });
      
      const response = await api.get('/reports/suivi-investissements', { 
        params: { 
          annee_debut: anneeDebut,
          annee_fin: anneeFin,
          type: typeInvestissement !== 'tous' ? typeInvestissement : undefined
        } 
      });
      
      console.log('Réponse API:', response.data);
      
      let investissements = [];
      
      if (response.data) {
        if (response.data.investissements && Array.isArray(response.data.investissements)) {
          investissements = response.data.investissements;
        } else if (response.data.actifs && Array.isArray(response.data.actifs)) {
          const actifsParAnnee = {};
          for (const actif of response.data.actifs) {
            let anneeActif;
            if (actif.date_acquisition) {
              anneeActif = new Date(actif.date_acquisition).getFullYear();
            } else {
              anneeActif = response.data.annee || new Date().getFullYear();
            }
            
            if (anneeActif >= anneeDebut && anneeActif <= anneeFin) {
              if (!actifsParAnnee[anneeActif]) {
                actifsParAnnee[anneeActif] = { budget: 0, realise: 0, actifs: [] };
              }
              const cout = parseFloat(actif.cout_acquisition || actif.cout || 0);
              actifsParAnnee[anneeActif].budget += cout;
              actifsParAnnee[anneeActif].realise += cout;
              actifsParAnnee[anneeActif].actifs.push(actif);
            }
          }
          for (const [annee, itemData] of Object.entries(actifsParAnnee)) {
            investissements.push({
              annee: parseInt(annee),
              budget: itemData.budget,
              realise: itemData.realise,
              type: 'actif',
              projet: `${itemData.actifs.length} actif(s) acquis`,
              actifs: itemData.actifs
            });
          }
        } else if (response.data.annee && (response.data.budget !== undefined || response.data.realise !== undefined)) {
          investissements = [{
            annee: response.data.annee,
            budget: response.data.budget || 0,
            realise: response.data.realise || 0,
            type: 'global',
            projet: `Total investissements ${response.data.annee}`,
            actifs: response.data.actifs || []
          }];
        } else if (Array.isArray(response.data)) {
          investissements = response.data;
        }
      }
      
      // Ajouter les années manquantes
      const yearsInData = new Set(investissements.map(i => i.annee));
      for (let an = anneeDebut; an <= anneeFin; an++) {
        if (!yearsInData.has(an)) {
          investissements.push({
            annee: an,
            budget: 0,
            realise: 0,
            type: 'aucun',
            projet: `Aucun investissement en ${an}`,
            actifs: []
          });
        }
      }
      
      investissements.sort((a, b) => a.annee - b.annee);
      
      setData(investissements);
      setFilteredData(investissements);
      
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError(err.response?.data?.message || 'Erreur de chargement');
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  }, [anneeDebut, anneeFin, typeInvestissement]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculer les totaux
  const totalBudget = filteredData.reduce((sum, d) => sum + (d.budget || 0), 0);
  const totalRealise = filteredData.reduce((sum, d) => sum + (d.realise || 0), 0);
  const tauxGlobal = totalBudget > 0 ? (totalRealise / totalBudget) * 100 : 0;
  const ecartTotal = totalBudget - totalRealise;
  const estSousBudget = ecartTotal >= 0;

  // Analyse IA
  const handleAIAnalyse = async () => {
    if (filteredData.length === 0) {
      alert("Aucune donnée à analyser");
      return;
    }
    
    setAiLoading(true);
    setShowAIAnalyse(true);
    
    setTimeout(() => {
      const anomalies = [];
      const recommandations = [];
      
      if (tauxGlobal > 110) {
        anomalies.push(`Taux de réalisation global élevé: ${tauxGlobal.toFixed(1)}% (dépassement de ${(tauxGlobal - 100).toFixed(1)}%)`);
        recommandations.push("Revoir les prévisions budgétaires");
      } else if (tauxGlobal < 70) {
        anomalies.push(`Taux de réalisation global faible: ${tauxGlobal.toFixed(1)}% (sous-consommation de ${(100 - tauxGlobal).toFixed(1)}%)`);
        recommandations.push("Analyser les causes des investissements non réalisés");
      }
      
      const anneeEcartMax = filteredData.reduce((max, d) => {
        const ecart = Math.abs((d.budget || 0) - (d.realise || 0));
        return ecart > max.ecart ? { annee: d.annee, ecart } : max;
      }, { annee: null, ecart: 0 });
      
      if (anneeEcartMax.annee && anneeEcartMax.ecart > 0) {
        anomalies.push(`Écart maximal constaté en ${anneeEcartMax.annee}: ${formatCurrency(anneeEcartMax.ecart)}`);
        recommandations.push(`Examiner les causes des écarts significatifs en ${anneeEcartMax.annee}`);
      }
      
      const anneesDepassement = filteredData.filter(d => d.realise > d.budget);
      if (anneesDepassement.length > 0) {
        anomalies.push(`${anneesDepassement.length} année(s) avec dépassement budgétaire`);
        recommandations.push("Renforcer le contrôle budgétaire");
      }
      
      let scoreSante = 100;
      scoreSante -= anomalies.length * 10;
      scoreSante -= Math.abs(tauxGlobal - 95) / 2;
      scoreSante = Math.max(0, Math.min(100, Math.floor(scoreSante)));
      
      setAiAnalyse({
        score_sante: scoreSante,
        niveau_risque: scoreSante >= 80 ? "faible" : scoreSante >= 60 ? "moyen" : "élevé",
        resume: `Analyse des investissements sur la période ${anneeDebut}-${anneeFin} (${filteredData.length} année(s)). Budget total: ${formatCurrency(totalBudget)}, Réalisé total: ${formatCurrency(totalRealise)}, Taux: ${tauxGlobal.toFixed(1)}%.`,
        anomalies: anomalies.length > 0 ? anomalies : ["Aucune anomalie majeure détectée"],
        recommandations: recommandations.length > 0 ? recommandations : [
          "Maintenir un suivi trimestriel des investissements",
          "Comparer les réalisations avec les objectifs stratégiques",
          "Analyser la rentabilité des investissements"
        ],
        metriques: {
          budget_total: totalBudget,
          realise_total: totalRealise,
          taux_global: parseFloat(tauxGlobal.toFixed(1)),
          nombre_annees: filteredData.length,
          periode_debut: anneeDebut,
          periode_fin: anneeFin
        }
      });
      
      setAiLoading(false);
    }, 1000);
  };

  // Prédiction IA
  const handlePredictionIA = async () => {
    if (filteredData.length === 0) {
      alert("Aucune donnée pour générer des prédictions");
      return;
    }
    
    setPredictionLoading(true);
    setShowPredictionModal(true);
    
    setTimeout(() => {
      const croissanceEstimee = 6.5;
      const moyenneBudget = totalBudget / filteredData.length;
      const moyenneRealise = totalRealise / filteredData.length;
      const currentYear = new Date().getFullYear();
      
      setPredictionIA({
        confiance: 0.85,
        projections: Array.from({ length: selectedHorizon }, (_, i) => ({
          annee: currentYear + i + 1,
          budget: moyenneBudget * Math.pow(1 + croissanceEstimee / 100, i + 1),
          realise: moyenneRealise * Math.pow(1 + croissanceEstimee / 100, i + 1),
          taux: 95 + (i * 1)
        })),
        recommandations: [
          "Augmenter les investissements dans les secteurs à forte croissance",
          "Renforcer le suivi trimestriel des écarts budgétaires",
          "Diversifier les sources de financement des projets",
          "Prioriser les projets à retour sur investissement rapide",
          "Mettre en place une veille économique proactive"
        ],
        risques: [
          "Risque de dépassement budgétaire sur les grands projets",
          "Volatilité des prix des matières premières",
          "Changements réglementaires imprévus",
          "Concurrence accrue sur les appels d'offres"
        ],
        metriques: {
          croissance_annuelle_estimee: croissanceEstimee,
          budget_moyen_annuel: moyenneBudget,
          realise_moyen_annuel: moyenneRealise
        }
      });
      
      setPredictionLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    
    const csvContent = [
      ['Année', 'Budget (CDF)', 'Réalisé (CDF)', 'Écart (CDF)', 'Taux (%)'],
      ...filteredData.map(item => [
        item.annee,
        item.budget || 0,
        item.realise || 0,
        (item.budget || 0) - (item.realise || 0),
        item.budget ? (((item.realise || 0) / (item.budget || 1)) * 100).toFixed(1) : 0
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `suivi_investissements_${anneeDebut}_${anneeFin}_${typeInvestissement}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (filteredData.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    
    // Fonction interne pour formater sans espaces pour le PDF
    const formatPDFCurrency = (value) => {
      if (!value && value !== 0) return '0 FC';
      const montant = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(montant)) return '0 FC';
      
      if (deviseAffichage === 'USD') {
        const taux = tauxChange.USD || 2450;
        return Math.round(montant / taux) + ' USD';
      } else if (deviseAffichage === 'EUR') {
        const taux = tauxChange.EUR || 2650;
        return Math.round(montant / taux) + ' EUR';
      }
      // Format sans espaces pour le PDF
      return Math.round(montant).toLocaleString('fr-FR').replace(/\s/g, '') + ' FC';
    };
    
    // Titre
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("SUIVI DES INVESTISSEMENTS", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    
    // En-tête
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Periode: ${anneeDebut} - ${anneeFin}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    doc.text(`Type: ${typeInvestissement === 'tous' ? 'Tous' : typesInvestissement.find(t => t.value === typeInvestissement)?.label || typeInvestissement}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    
    // Résumé
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nombre d'investissements: ${filteredData.length}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Budget total: ${formatPDFCurrency(totalBudget)}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Realise total: ${formatPDFCurrency(totalRealise)}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Taux de realisation global: ${tauxGlobal.toFixed(1)}%`, 14, yPosition);
    yPosition += 15;
    
    // Tableau manuel
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    // En-têtes du tableau
    const headers = ['Annee', 'Budget', 'Realise', 'Taux'];
    const colWidths = [30, 50, 50, 30];
    let xPosition = 14;
    
    doc.setFillColor(37, 99, 235);
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, index) => {
      doc.rect(xPosition, yPosition, colWidths[index], 10, 'F');
      doc.text(header, xPosition + 2, yPosition + 7);
      xPosition += colWidths[index];
    });
    
    yPosition += 10;
    doc.setTextColor(0, 0, 0);
    
    // Données
    for (const item of filteredData) {
      const taux = item.budget ? (item.realise / item.budget) * 100 : 0;
      const rowData = [
        item.annee.toString(),
        formatPDFCurrency(item.budget || 0),
        formatPDFCurrency(item.realise || 0),
        `${taux.toFixed(1)}%`
      ];
      
      xPosition = 14;
      for (let i = 0; i < rowData.length; i++) {
        doc.text(rowData[i], xPosition + 2, yPosition + 7);
        xPosition += colWidths[i];
      }
      yPosition += 10;
      
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
        // Réafficher les en-têtes sur la nouvelle page
        doc.setFillColor(37, 99, 235);
        doc.setTextColor(255, 255, 255);
        xPosition = 14;
        headers.forEach((header, index) => {
          doc.rect(xPosition, yPosition, colWidths[index], 10, 'F');
          doc.text(header, xPosition + 2, yPosition + 7);
          xPosition += colWidths[index];
        });
        yPosition += 10;
        doc.setTextColor(0, 0, 0);
      }
    }
    
    // Total
    if (yPosition < 280) {
      yPosition += 5;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPosition, pageWidth - 28, 10, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text("Total:", 16, yPosition + 7);
      doc.text(formatPDFCurrency(totalBudget), 14 + colWidths[0] + 2, yPosition + 7);
      doc.text(formatPDFCurrency(totalRealise), 14 + colWidths[0] + colWidths[1] + 2, yPosition + 7);
      doc.text(`${tauxGlobal.toFixed(1)}%`, 14 + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPosition + 7);
    }
    
    doc.save(`suivi_investissements_${anneeDebut}_${anneeFin}_${typeInvestissement}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '0 FC';
    try {
      const montant = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(montant)) return '0 FC';
      
      if (deviseAffichage === 'USD') {
        const taux = tauxChange.USD || 2450;
        return `$${(montant / taux).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      } else if (deviseAffichage === 'EUR') {
        const taux = tauxChange.EUR || 2650;
        return `€${(montant / taux).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
      return `${Math.round(montant).toLocaleString()} FC`;
    } catch {
      return `${Math.round(value || 0).toLocaleString()} FC`;
    }
  };

  const getTauxRealisationColor = (taux) => {
    if (taux >= 110) return '#ef4444';
    if (taux >= 100) return '#f59e0b';
    if (taux >= 80) return '#10b981';
    if (taux >= 50) return '#06b6d4';
    return '#64748b';
  };

  const getTauxRealisationIcon = (taux) => {
    if (taux >= 110) return <FiXCircle size={16} className="text-danger" />;
    if (taux >= 100) return <FiAlertCircle size={16} className="text-warning" />;
    if (taux >= 80) return <FiCheckCircle size={16} className="text-success" />;
    return <FiTrendingUp size={16} className="text-secondary" />;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark p-3 rounded-3 shadow-lg border" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
          <p className="fw-semibold mb-2 text-white">Année {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, margin: '0.25rem 0' }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const COLORS = ['#f59e0b', '#10b981'];

  // Agrégation par année
  const dataByYear = [...filteredData].sort((a, b) => a.annee - b.annee);

  const pieData = filteredData.length > 0 ? [
    { name: 'Budget total', value: totalBudget, color: '#f59e0b' },
    { name: 'Réalisé total', value: totalRealise, color: '#10b981' }
  ] : [];

  const formatYAxis = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}Md`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-center">
          <Spinner animation="border" variant="light" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <p className="text-white">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
      <Container fluid className="py-4 px-3 px-md-4">
        
        {/* Modal d'aide */}
        <Modal show={showChartHelp} onHide={() => setShowChartHelp(false)} size="lg" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiHelpCircle size={24} /> Guide des diagrammes
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', maxHeight: '70vh', overflowY: 'auto' }}>
            <Accordion defaultActiveKey={chartType}>
              <Accordion.Item eventKey="bar" style={{ background: 'transparent', border: '1px solid #333', marginBottom: '10px' }}>
                <Accordion.Header>
                  <span style={{ fontSize: '1.2rem' }}>{chartExplanations.bar.icon} {chartExplanations.bar.title}</span>
                </Accordion.Header>
                <Accordion.Body style={{ background: '#0f172a', color: '#e2e8f0' }}>
                  <p><strong>Description :</strong> {chartExplanations.bar.description}</p>
                  <p><strong>Comment ça fonctionne :</strong> {chartExplanations.bar.howItWorks}</p>
                  <p><strong>Quand l'utiliser :</strong></p>
                  <ul>{chartExplanations.bar.whenToUse.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  <p><strong>Comment l'interpréter :</strong></p>
                  <ul>{chartExplanations.bar.howToRead.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  <div className="alert alert-info mt-2"><strong>Exemple :</strong> {chartExplanations.bar.example}</div>
                </Accordion.Body>
              </Accordion.Item>

              <Accordion.Item eventKey="pie" style={{ background: 'transparent', border: '1px solid #333', marginBottom: '10px' }}>
                <Accordion.Header>
                  <span style={{ fontSize: '1.2rem' }}>{chartExplanations.pie.icon} {chartExplanations.pie.title}</span>
                </Accordion.Header>
                <Accordion.Body style={{ background: '#0f172a', color: '#e2e8f0' }}>
                  <p><strong>Description :</strong> {chartExplanations.pie.description}</p>
                  <p><strong>Comment ça fonctionne :</strong> {chartExplanations.pie.howItWorks}</p>
                  <p><strong>Quand l'utiliser :</strong></p>
                  <ul>{chartExplanations.pie.whenToUse.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  <p><strong>Comment l'interpréter :</strong></p>
                  <ul>{chartExplanations.pie.howToRead.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  <div className="alert alert-info mt-2"><strong>Exemple :</strong> {chartExplanations.pie.example}</div>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Modal.Body>
          <Modal.Footer style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', borderTop: '1px solid #333' }}>
            <Button variant="secondary" onClick={() => setShowChartHelp(false)}>Fermer</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Analyse IA */}
        <Modal show={showAIAnalyse} onHide={() => setShowAIAnalyse(false)} size="lg" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <GiArtificialIntelligence size={24} /> Analyse IA des investissements
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
            {aiLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-white">Analyse en cours...</p>
              </div>
            ) : aiAnalyse ? (
              <div>
                <div className="text-center mb-4">
                  <div className="display-4 fw-bold" style={{ color: aiAnalyse.score_sante >= 80 ? '#10b981' : aiAnalyse.score_sante >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {aiAnalyse.score_sante}/100
                  </div>
                  <Badge bg={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 60 ? 'warning' : 'danger'}>
                    Performance budgétaire
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <ProgressBar 
                    now={aiAnalyse.score_sante} 
                    variant={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 60 ? 'warning' : 'danger'} 
                    style={{ height: '10px' }}
                  />
                </div>
                
                <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #06b6d4' }}>
                  <strong className="text-info">Résumé</strong>
                  <p className="mt-2 text-white-50">{aiAnalyse.resume}</p>
                </div>
                
                {aiAnalyse.metriques && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                    <strong className="text-warning">Métriques clés</strong>
                    <div className="row mt-2">
                      <div className="col-6">
                        <small className="text-muted">Budget total</small>
                        <div className="fw-bold text-white">{formatCurrency(aiAnalyse.metriques.budget_total)}</div>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Réalisé total</small>
                        <div className="fw-bold text-white">{formatCurrency(aiAnalyse.metriques.realise_total)}</div>
                      </div>
                      <div className="col-6 mt-2">
                        <small className="text-muted">Taux global</small>
                        <div className="fw-bold" style={{ color: getTauxRealisationColor(aiAnalyse.metriques.taux_global) }}>
                          {aiAnalyse.metriques.taux_global}%
                        </div>
                      </div>
                      <div className="col-6 mt-2">
                        <small className="text-muted">Période</small>
                        <div className="fw-bold text-white">{aiAnalyse.metriques.periode_debut} - {aiAnalyse.metriques.periode_fin}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {aiAnalyse.anomalies && aiAnalyse.anomalies.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #ef4444' }}>
                    <strong className="text-danger">Points d'attention ({aiAnalyse.anomalies.length})</strong>
                    <ul className="mt-2 mb-0">
                      {aiAnalyse.anomalies.map((a, i) => (
                        <li key={i} className="text-white-50 small">
                          {typeof a === 'string' ? a : (a.message || JSON.stringify(a))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {aiAnalyse.recommandations && aiAnalyse.recommandations.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #10b981' }}>
                    <strong className="text-success">Recommandations</strong>
                    <ul className="mt-2 mb-0">
                      {aiAnalyse.recommandations.map((r, i) => (
                        <li key={i} className="text-white-50 small">
                          {typeof r === 'string' ? r : (r.message || JSON.stringify(r))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 p-2 rounded text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <small className="text-white-50">Niveau de risque: </small>
                  <strong className={aiAnalyse.niveau_risque === 'faible' ? 'text-success' : aiAnalyse.niveau_risque === 'moyen' ? 'text-warning' : 'text-danger'}>
                    {aiAnalyse.niveau_risque}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="text-center text-white-50">Cliquez sur "Analyser" pour générer un rapport IA</p>
            )}
          </Modal.Body>
          <Modal.Footer style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', borderTop: '1px solid #333' }}>
            <Button variant="secondary" onClick={() => setShowAIAnalyse(false)}>Fermer</Button>
            <Button variant="primary" onClick={handleAIAnalyse} disabled={aiLoading} className="d-flex align-items-center gap-2">
              {aiLoading ? <Spinner size="sm" animation="border" /> : <><GiArtificialIntelligence className="me-1" /> Analyser</>}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Prédictions IA */}
        <Modal show={showPredictionModal} onHide={() => setShowPredictionModal(false)} size="xl" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiTrendingUp size={24} /> Prédictions IA
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: '#0f0f1a', maxHeight: '70vh', overflowY: 'auto' }}>
            {predictionLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
                <p className="text-white">Génération des prédictions...</p>
              </div>
            ) : predictionIA ? (
              <div>
                <div className="text-center mb-4">
                  <div className="display-4 fw-bold" style={{ color: '#10b981' }}>
                    {(predictionIA.confiance * 100).toFixed(0)}%
                  </div>
                  <div className="text-white-50 small">Niveau de confiance</div>
                  <ProgressBar now={predictionIA.confiance * 100} variant="success" className="mt-2" style={{ height: '6px' }} />
                </div>

                {predictionIA.projections && predictionIA.projections.length > 0 && (
                  <div className="mb-4">
                    <h6 className="text-white mb-3">Projection sur {selectedHorizon} ans</h6>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={predictionIA.projections}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="annee" stroke="#888" />
                          <YAxis stroke="#888" tickFormatter={(v) => `${(v/1000000000).toFixed(1)}Md`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                          <Legend wrapperStyle={{ color: '#fff' }} />
                          <Bar dataKey="budget" fill="#f59e0b" name="Budget" />
                          <Bar dataKey="realise" fill="#10b981" name="Réalisé" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {predictionIA.recommandations && predictionIA.recommandations.length > 0 && (
                  <div className="mb-4 p-3 rounded" style={{ background: '#1e293b', borderLeft: '4px solid #10b981' }}>
                    <h6 className="text-white mb-2">Recommandations</h6>
                    <ul className="mb-0">
                      {predictionIA.recommandations.map((rec, idx) => (
                        <li key={idx} className="text-white-50 small mb-1">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {predictionIA.risques && predictionIA.risques.length > 0 && (
                  <div className="mb-4 p-3 rounded" style={{ background: '#1e293b', borderLeft: '4px solid #ef4444' }}>
                    <h6 className="text-white mb-2">Risques identifiés</h6>
                    <ul className="mb-0">
                      {predictionIA.risques.map((risque, idx) => (
                        <li key={idx} className="text-white-50 small mb-1">{risque}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {predictionIA.metriques && Object.keys(predictionIA.metriques).length > 0 && (
                  <div className="row mt-3">
                    <div className="col-12"><h6 className="text-white mb-3">Métriques projetées</h6></div>
                    <div className="col-md-4 col-6 mb-2">
                      <div className="p-2 rounded" style={{ background: '#1e293b' }}>
                        <small className="text-white-50 d-block">Croissance annuelle</small>
                        <strong className="text-white">{predictionIA.metriques.croissance_annuelle_estimee}%</strong>
                      </div>
                    </div>
                    <div className="col-md-4 col-6 mb-2">
                      <div className="p-2 rounded" style={{ background: '#1e293b' }}>
                        <small className="text-white-50 d-block">Budget moyen</small>
                        <strong className="text-white">{formatCurrency(predictionIA.metriques.budget_moyen_annuel)}</strong>
                      </div>
                    </div>
                    <div className="col-md-4 col-6 mb-2">
                      <div className="p-2 rounded" style={{ background: '#1e293b' }}>
                        <small className="text-white-50 d-block">Réalisé moyen</small>
                        <strong className="text-white">{formatCurrency(predictionIA.metriques.realise_moyen_annuel)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5">
                <FiAlertCircle size={48} className="text-warning mb-3" />
                <p className="text-white">Impossible de générer les prédictions</p>
                <Button variant="primary" onClick={handlePredictionIA}>Réessayer</Button>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer style={{ background: '#0f0f1a', borderTop: '1px solid #333' }}>
            <div className="d-flex justify-content-between w-100 align-items-center">
              <div className="d-flex gap-2">
                <Form.Label className="text-white small mb-0">Horizon:</Form.Label>
                <Form.Select size="sm" value={selectedHorizon} onChange={(e) => setSelectedHorizon(parseInt(e.target.value))} style={{ width: '80px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }}>
                  <option value={3}>3 ans</option>
                  <option value={5}>5 ans</option>
                  <option value={10}>10 ans</option>
                </Form.Select>
              </div>
              <div>
                <Button variant="secondary" onClick={() => setShowPredictionModal(false)} className="me-2">Fermer</Button>
                <Button variant="primary" onClick={handlePredictionIA} disabled={predictionLoading}>
                  <FiRefreshCw className={`me-1 ${predictionLoading ? 'spin' : ''}`} /> Rafraîchir
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Modal>
        
        {/* Header avec bouton retour */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-light" onClick={handleGoBack} className="d-flex align-items-center gap-2">
              <FiArrowLeft size={18} /> Retour
            </Button>
            <div>
              <h1 className="display-6 fw-bold text-white mb-1 d-flex align-items-center gap-2">
                <FiTrendingUp size={32} /> Suivi des investissements
              </h1>
              <p className="text-white-50 small mb-0">Analyse comparative des budgets et réalisés</p>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-light" onClick={() => setShowChartHelp(true)} className="d-flex align-items-center gap-2">
              <FiHelpCircle size={16} /> Guide
            </Button>
            <Button onClick={handlePredictionIA} className="d-flex align-items-center gap-2" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', border: 'none' }}>
              <FiTrendingUp size={16} /> Prédictions
            </Button>
            <Button variant="outline-light" onClick={handleAIAnalyse} className="d-flex align-items-center gap-2">
              <GiArtificialIntelligence size={16} /> Analyse IA
            </Button>
            <Button variant="outline-light" onClick={handleExportCSV} disabled={filteredData.length === 0} className="d-flex align-items-center gap-2">
              <FiDownload size={14} /> CSV
            </Button>
            <Button variant="outline-light" onClick={handleExportPDF} disabled={filteredData.length === 0} className="d-flex align-items-center gap-2">
              <FiDownload size={14} /> PDF
            </Button>
            <Button variant="light" onClick={handleRefresh} disabled={loading} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={14} className={loading ? 'spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="border-0 shadow-lg rounded-3 mb-4" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}>
          <Card.Body>
            <Row className="g-3">
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#ffffff' }}>Année début</label>
                <Form.Select value={anneeDebut} onChange={(e) => setAnneeDebut(parseInt(e.target.value))} style={{ backgroundColor: '#ffffff', color: '#000000' }} size="sm">
                  {Array.from({ length: 10 }, (_, i) => 2020 + i).map(an => <option key={an} value={an}>{an}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#ffffff' }}>Année fin</label>
                <Form.Select value={anneeFin} onChange={(e) => setAnneeFin(parseInt(e.target.value))} style={{ backgroundColor: '#ffffff', color: '#000000' }} size="sm">
                  {Array.from({ length: 10 }, (_, i) => 2020 + i).map(an => <option key={an} value={an}>{an}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#ffffff' }}>Type</label>
                <Form.Select value={typeInvestissement} onChange={(e) => setTypeInvestissement(e.target.value)} style={{ backgroundColor: '#ffffff', color: '#000000' }} size="sm">
                  {typesInvestissement.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#ffffff' }}>Devise</label>
                <Form.Select value={deviseAffichage} onChange={(e) => setDeviseAffichage(e.target.value)} style={{ backgroundColor: '#ffffff', color: '#000000' }} size="sm">
                  <option value="CDF">FC</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </Form.Select>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col>
                <div className="btn-group" role="group">
                  <Button variant={viewMode === 'graph' ? 'primary' : 'outline-light'} onClick={() => setViewMode('graph')} size="sm" style={{ color: '#ffffff' }}>
                    <FiBarChart2 size={14} /> Graphique
                  </Button>
                  <Button variant={viewMode === 'table' ? 'primary' : 'outline-light'} onClick={() => setViewMode('table')} size="sm" style={{ color: '#ffffff' }}>
                    <FiPieChart size={14} /> Tableau
                  </Button>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Cartes statistiques */}
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
              <Card.Body><FiDollarSign size={28} className="mb-2 opacity-75" /><div className="h2 mb-0 fw-bold">{formatCurrency(totalBudget)}</div><small>Budget total</small></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white' }}>
              <Card.Body><FiTrendingUp size={28} className="mb-2 opacity-75" /><div className="h2 mb-0 fw-bold">{formatCurrency(totalRealise)}</div><small>Réalisé total</small></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
              <Card.Body><div className="h2 mb-0 fw-bold">{formatCurrency(Math.abs(ecartTotal))}</div><small>Écart total</small><Badge bg="light" text="dark" className="mt-2">{estSousBudget ? 'Sous-budget' : 'Dépassement'}</Badge></Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
              <Card.Body><div className="d-flex align-items-center justify-content-center gap-2 mb-2">{getTauxRealisationIcon(tauxGlobal)}<div className="h2 mb-0 fw-bold">{tauxGlobal.toFixed(1)}%</div></div><small>Taux de réalisation</small><ProgressBar className="mt-2" style={{ height: '6px', background: 'rgba(255,255,255,0.3)' }}><ProgressBar variant="light" now={Math.min(100, tauxGlobal)} style={{ borderRadius: '3px' }} /></ProgressBar></Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Contenu principal */}
        {filteredData.length > 0 ? (
          viewMode === 'graph' ? (
            <div>
              <Card className="border-0 shadow-sm rounded-3 mb-3" style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)' }}>
                <Card.Body className="py-2">
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: '1.5rem' }}>{chartExplanations[chartType]?.icon || '📊'}</span>
                      <strong className="text-white">{chartExplanations[chartType]?.title || 'Diagramme'}</strong>
                    </div>
                    <div className="vr text-white-50"></div>
                    <p className="text-white-50 small mb-0">{chartExplanations[chartType]?.description}</p>
                    <Button variant="link" size="sm" onClick={() => setShowChartHelp(true)} className="text-info ms-auto"><FiHelpCircle size={14} /> En savoir plus</Button>
                  </div>
                </Card.Body>
              </Card>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <div className="btn-group">
                  <Button variant={chartType === 'bar' ? 'primary' : 'outline-light'} onClick={() => setChartType('bar')} size="sm" style={{ color: '#ffffff' }}><FiBarChart2 size={14} /> Barres</Button>
                  <Button variant={chartType === 'pie' ? 'primary' : 'outline-light'} onClick={() => setChartType('pie')} size="sm" style={{ color: '#ffffff' }}><FiPieChart size={14} /> Camembert</Button>
                </div>
                {fullscreenChart && <Button variant="outline-light" size="sm" onClick={() => setFullscreenChart(null)}><FiMinimize2 size={14} /> Fermer</Button>}
              </div>

              {chartType === 'bar' && (
                <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="h6 fw-semibold mb-0" style={{ color: '#ffffff' }}>Budget vs Réalisé</h3>
                      <Button variant="link" size="sm" onClick={() => setFullscreenChart('bar')} className="p-0" style={{ color: '#ffffff' }}><FiMaximize2 size={14} /></Button>
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={dataByYear} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.2} />
                        <XAxis dataKey="annee" stroke="#ffffff" tick={{ fill: '#ffffff' }} />
                        <YAxis stroke="#ffffff" tickFormatter={formatYAxis} tick={{ fill: '#ffffff' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ color: '#ffffff' }} />
                        <Bar dataKey="budget" fill="#f59e0b" name="Budget" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="realise" fill="#10b981" name="Réalisé" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              )}

              {chartType === 'pie' && (
                <Row className="g-3">
                  <Col md={6}>
                    <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <Card.Body>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`} outerRadius={100} dataKey="value" nameKey="name">
                              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#ffffff' }} />
                            <Legend wrapperStyle={{ color: '#ffffff'} } />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3" style={{ color: '#ffffff' }}>Indicateurs</h3>
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1"><small style={{ color: '#ffffff' }}>Taux de réalisation</small><strong style={{ color: getTauxRealisationColor(tauxGlobal) }}>{tauxGlobal.toFixed(1)}%</strong></div>
                          <ProgressBar now={Math.min(100, tauxGlobal)} variant="warning" style={{ height: '8px' }} />
                        </div>
                        <div className="mb-3">
                          <div className="d-flex justify-content-between mb-1"><small style={{ color: '#ffffff' }}>Performance</small><strong className={estSousBudget ? 'text-success' : 'text-danger'}>{estSousBudget ? 'Sous-budget' : 'Dépassement'}</strong></div>
                        </div>
                        <div><div className="d-flex justify-content-between mb-1"><small style={{ color: '#ffffff' }}>Années analysées</small><strong className="text-primary">{dataByYear.length}</strong></div></div>
                        <div className="mt-3 pt-2 border-top"><small className="text-white-50">Période: {anneeDebut} - {anneeFin}</small></div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-sm rounded-3 overflow-hidden" style={{ background: '#ffffff' }}>
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead style={{ background: '#f1f5f9' }}>
                    <tr>
                      <th style={{ color: '#000000' }}>Année</th>
                      <th style={{ color: '#000000', textAlign: 'right' }}>Budget</th>
                      <th style={{ color: '#000000', textAlign: 'right' }}>Réalisé</th>
                      <th style={{ color: '#000000', textAlign: 'right' }}>Écart</th>
                      <th style={{ color: '#000000' }}>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataByYear.map((item, index) => {
                      const taux = item.budget ? (item.realise / item.budget) * 100 : 0;
                      const isOverBudget = item.realise > item.budget;
                      return (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                          <td style={{ color: '#000000' }}>{item.annee}</td>
                          <td style={{ color: '#000000', textAlign: 'right' }}>{formatCurrency(item.budget)}</td>
                          <td style={{ color: '#000000', textAlign: 'right' }}>{formatCurrency(item.realise)}</td>
                          <td style={{ color: '#000000', textAlign: 'right' }}>{isOverBudget ? '+' : '-'}{formatCurrency(Math.abs(item.budget - item.realise))}</td>
                          <td><div className="d-flex align-items-center gap-2"><div className="progress flex-grow-1" style={{ height: '8px', backgroundColor: '#e2e8f0' }}><div className="progress-bar bg-warning" style={{ width: `${Math.min(100, taux)}%` }} /></div><span style={{ color: '#000000' }}>{taux.toFixed(1)}%</span></div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                    <tr>
                      <td style={{ color: '#000000' }}>Total</td>
                      <td style={{ color: '#000000', textAlign: 'right' }}>{formatCurrency(totalBudget)}</td>
                      <td style={{ color: '#000000', textAlign: 'right' }}>{formatCurrency(totalRealise)}</td>
                      <td style={{ color: '#000000', textAlign: 'right' }}>{totalRealise > totalBudget ? '+' : '-'}{formatCurrency(Math.abs(totalBudget - totalRealise))}</td>
                      <td><div className="d-flex align-items-center gap-2"><div className="progress flex-grow-1" style={{ height: '8px', backgroundColor: '#e2e8f0' }}><div className="progress-bar bg-warning" style={{ width: `${Math.min(100, tauxGlobal)}%` }} /></div><span style={{ color: '#000000' }}>{tauxGlobal.toFixed(1)}%</span></div></td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </Card>
          )
        ) : (
          <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
            <Card.Body className="text-center py-5">
              <FiAlertCircle size={48} className="text-white opacity-50 mb-3" />
              <h5 className="text-white">Aucune donnée disponible</h5>
              <Button variant="outline-light" className="mt-3" onClick={() => { setAnneeDebut(2021); setAnneeFin(2025); setTypeInvestissement('tous'); fetchData(); }}>Réinitialiser</Button>
            </Card.Body>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <small className="text-white-50"><FiShield size={12} /> Données en temps réel — Suivi BCC</small>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
      </Container>
    </div>
  );
};

export default SuiviInvestissements;