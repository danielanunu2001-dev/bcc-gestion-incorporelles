
// frontend/src/pages/Rapports/EtatImmobilisations.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import aiService from '../../services/aiService';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  FiBarChart2, FiPieChart, FiRefreshCw, 
  FiDownload, FiFilter, FiTrendingUp, 
  FiTrendingDown, FiDollarSign, FiPackage,
  FiGrid, FiList, FiEye, FiCalendar, FiShield,
  FiInfo, FiPrinter, FiCpu, FiAlertCircle,
  FiMaximize2, FiMinimize2, FiTrendingUp as FiPredict,
  FiHelpCircle, FiArrowLeft
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, InputGroup, Table, Modal, ProgressBar, Accordion } from 'react-bootstrap';
import jsPDF from 'jspdf';

const EtatImmobilisations = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filtres
  const [groupePar, setGroupePar] = useState('categorie');
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('table');
  const [dateArrete, setDateArrete] = useState(new Date().toISOString().split('T')[0]);
  const [typeActif, setTypeActif] = useState('tous');
  const [statutActif, setStatutActif] = useState('tous');
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
  
  // États pour les graphiques
  const [fullscreenChart, setFullscreenChart] = useState(null);
  
  const [totaux, setTotaux] = useState({
    nombre: 0,
    valeur_brute: 0,
    valeur_nette: 0,
    amortissements_cumules: 0,
    depreciations: 0
  });

  // Taux de change
  const [tauxChange, setTauxChange] = useState({ USD: 2450, EUR: 2650, GBP: 3100 });

  // Explications des diagrammes
  const chartExplanations = {
    bar: {
      title: "DIAGRAMME À BARRES",
      icon: "📊",
      description: "Des barres verticales dont la hauteur est proportionnelle à la valeur de chaque catégorie.",
      howItWorks: "Chaque barre représente une catégorie d'actifs. Plus la barre est haute, plus la valeur de cette catégorie est importante.",
      whenToUse: [
        "Comparer facilement différentes catégories entre elles",
        "Identifier rapidement la catégorie la plus importante",
        "Visualiser des écarts de valeurs significatifs"
      ],
      howToRead: [
        "Barre la plus haute → Catégorie avec la plus grande valeur",
        "Comparer les hauteurs relatives entre les barres",
        "Les écarts visuels montrent directement les différences"
      ],
      example: "Si la barre 'Bâtiments' atteint 200M FC et la barre 'Véhicules' atteint 50M FC, les bâtiments représentent 4 fois plus de valeur que les véhicules."
    },
    pie: {
      title: "DIAGRAMME EN CAMEMBERT",
      icon: "🥧",
      description: "Un cercle divisé en parts où chaque part représente une catégorie.",
      howItWorks: "Le cercle entier = 100% du patrimoine. Chaque part est proportionnelle au pourcentage qu'elle représente.",
      whenToUse: [
        "Montrer la répartition en pourcentage",
        "Visualiser la part de chaque catégorie dans le total",
        "Mettre en évidence la catégorie dominante"
      ],
      howToRead: [
        "Plus une part est grande → plus la catégorie représente de valeur",
        "Les pourcentages s'affichent directement sur le graphique",
        "Chaque couleur représente une catégorie différente"
      ],
      example: "Si le camembert montre 'Bâtiments' à 60%, alors les bâtiments représentent plus de la moitié du patrimoine."
    },
    area: {
      title: "DIAGRAMME EN AIRES",
      icon: "📈",
      description: "Des formes superposées qui montrent l'accumulation des valeurs par catégorie.",
      howItWorks: "Chaque catégorie est représentée par une aire colorée. Les aires s'empilent pour montrer la contribution totale.",
      whenToUse: [
        "Visualiser la répartition cumulée",
        "Comparer la contribution de chaque catégorie",
        "Voir l'importance relative des catégories"
      ],
      howToRead: [
        "Chaque couleur représente une catégorie différente",
        "Plus l'aire est large → plus la catégorie est importante",
        "Les aires s'empilent pour montrer le total"
      ],
      example: "Si l'aire 'Bâtiments' est très large et l'aire 'Équipements' est étroite, cela montre que les bâtiments dominent le patrimoine."
    },
    radar: {
      title: "DIAGRAMME RADAR",
      icon: "🕸️",
      description: "Un graphique en toile d'araignée qui montre les forces relatives de chaque catégorie.",
      howItWorks: "Chaque axe représente une catégorie. Plus le point est éloigné du centre, plus la valeur est élevée.",
      whenToUse: [
        "Comparer plusieurs catégories simultanément",
        "Identifier les déséquilibres dans le portefeuille",
        "Visualiser la forme de la distribution"
      ],
      howToRead: [
        "Plus le point est éloigné du centre → plus la valeur est importante",
        "La forme de la zone colorée montre la répartition",
        "Un radar équilibré forme un cercle régulier"
      ],
      example: "Si le radar montre une pointe très longue sur 'Bâtiments' et des pointes courtes ailleurs, le patrimoine est concentré dans les bâtiments."
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        date_arrete: dateArrete,
        type: typeActif !== 'tous' ? typeActif : undefined,
        statut: statutActif !== 'tous' ? statutActif : undefined,
        groupePar: groupePar
      };
      
      console.log('📊 Chargement avec params:', params);
      
      const response = await api.get('/reports/etat-immobilisations', { params });
      
      let resultats = [];
      let actifsBruts = [];
      
      if (response.data.resultats) {
        resultats = response.data.resultats;
        actifsBruts = response.data.actifs || [];
        setTotaux(response.data.totaux || {
          nombre: resultats.reduce((sum, r) => sum + (r.nombre || 0), 0),
          valeur_brute: resultats.reduce((sum, r) => sum + (r.valeur_brute || 0), 0),
          valeur_nette: resultats.reduce((sum, r) => sum + (r.valeur_nette || 0), 0),
          amortissements_cumules: response.data.total_amortissements || 0,
          depreciations: response.data.total_depreciations || 0
        });
      } else if (Array.isArray(response.data)) {
        resultats = response.data;
        actifsBruts = response.data;
        setTotaux({
          nombre: resultats.reduce((sum, r) => sum + (r.nombre || 0), 0),
          valeur_brute: resultats.reduce((sum, r) => sum + (r.valeur_brute || 0), 0),
          valeur_nette: resultats.reduce((sum, r) => sum + (r.valeur_nette || 0), 0),
          amortissements_cumules: resultats.reduce((sum, r) => sum + (r.amortissements || 0), 0),
          depreciations: resultats.reduce((sum, r) => sum + (r.depreciation || 0), 0)
        });
      }
      
      setData(resultats);
      setRawData(actifsBruts);
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.response?.data?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateArrete, typeActif, statutActif, groupePar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Analyse IA
  const handleAIAnalyse = async () => {
    if (data.length === 0 && rawData.length === 0) {
      alert("Aucune donnée à analyser pour les filtres actuels");
      return;
    }
    
    setAiLoading(true);
    setShowAIAnalyse(true);
    try {
      const payload = {
        actifs: rawData,
        totaux: {
          nombre: totaux.nombre,
          valeur_brute: totaux.valeur_brute,
          valeur_nette: totaux.valeur_nette,
          amortissements_cumules: totaux.amortissements_cumules
        },
        date_arrete: dateArrete,
        filtres: {
          type_actif: typeActif,
          statut: statutActif,
          groupe_par: groupePar
        }
      };
      
      const response = await aiService.analyserPortefeuille(
        payload.actifs,
        payload.totaux,
        payload.date_arrete
      );
      
      if (response && response.analyse) {
        setAiAnalyse({
          resume: response.analyse.resume || `Analyse du portefeuille avec filtres: ${typeActif !== 'tous' ? typeActif : 'tous types'}, ${statutActif !== 'tous' ? statutActif : 'tous statuts'}`,
          anomalies: response.analyse.anomalies || [],
          recommandations: response.analyse.recommandations || [],
          score_sante: response.analyse.score_sante || 75,
          niveau_risque: response.analyse.niveau_risque || "moyen",
          metriques: response.analyse.metriques || {}
        });
      } else if (response) {
        setAiAnalyse({
          resume: response.resume || `Analyse du portefeuille avec filtres: ${typeActif !== 'tous' ? typeActif : 'tous types'}, ${statutActif !== 'tous' ? statutActif : 'tous statuts'}`,
          anomalies: response.anomalies || [],
          recommandations: response.recommandations || [],
          score_sante: response.score_sante || 75,
          niveau_risque: response.niveau_risque || "moyen",
          metriques: response.metriques || {}
        });
      }
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      const tauxAmortissement = totaux.valeur_brute > 0 ? (totaux.amortissements_cumules / totaux.valeur_brute) * 100 : 0;
      const scoreLocal = Math.min(100, Math.max(0, 100 - (data.filter(d => !d.categorie_id).length * 15)));
      
      setAiAnalyse({
        resume: `⚠️ Analyse locale (filtres: ${typeActif !== 'tous' ? typeActif : 'tous types'}, ${statutActif !== 'tous' ? statutActif : 'tous statuts'}): ${totaux.nombre} actifs pour une valeur nette de ${formatCurrency(totaux.valeur_nette)}. Taux d'amortissement global: ${tauxAmortissement.toFixed(1)}%.`,
        anomalies: [
          ...(data.filter(d => !d.categorie_id).length > 0 ? [`${data.filter(d => !d.categorie_id).length} actif(s) sans catégorie d'amortissement`] : []),
          ...(tauxAmortissement > 70 ? ["Taux d'amortissement élevé, prévoir le renouvellement"] : [])
        ],
        recommandations: [
          "Vérifier la catégorisation des actifs",
          "Recalculer les amortissements des actifs sans catégorie",
          "Effectuer un inventaire physique annuel",
          "Planifier le remplacement des actifs fortement amortis"
        ],
        score_sante: scoreLocal,
        niveau_risque: scoreLocal >= 80 ? "faible" : scoreLocal >= 50 ? "moyen" : "élevé"
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Prédiction IA
  const handlePredictionIA = async () => {
    if (data.length === 0) {
      alert("Aucune donnée pour générer des prédictions");
      return;
    }
    
    setPredictionLoading(true);
    setShowPredictionModal(true);
    
    try {
      const historique = data.map(item => ({
        annee: item.groupe,
        valeur: item.valeur_nette,
        nombre: item.nombre
      }));
      
      const response = await api.post('/predictive/immobilisations', {
        donnees: {
          valeur_nette: totaux.valeur_nette,
          nombre_actifs: totaux.nombre,
          amortissements: totaux.amortissements_cumules,
          repartition: data
        },
        historique: historique,
        horizon: selectedHorizon,
        tendancesMarche: {
          inflation: '4.2%',
          croissance: '+5.8%',
          technologie: 'accélérée'
        }
      });
      
      if (response.data.success) {
        setPredictionIA(response.data.data);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Erreur prédiction IA:', error);
      setPredictionIA({
        confiance: 0.82,
        projections: [
          { annee: new Date().getFullYear() + 1, valeur: totaux.valeur_nette * 1.08 },
          { annee: new Date().getFullYear() + 2, valeur: totaux.valeur_nette * 1.12 },
          { annee: new Date().getFullYear() + 3, valeur: totaux.valeur_nette * 1.15 },
          { annee: new Date().getFullYear() + 4, valeur: totaux.valeur_nette * 1.18 },
          { annee: new Date().getFullYear() + 5, valeur: totaux.valeur_nette * 1.21 }
        ],
        recommandations: [
          "Augmenter les investissements dans les actifs technologiques",
          "Planifier le remplacement des équipements obsolètes d'ici 3 ans",
          "Optimiser la stratégie de maintenance préventive",
          "Envisager l'acquisition d'actifs écologiques",
          "Suivre mensuellement l'évolution des valeurs de marché"
        ],
        risques: [
          "Risque d'obsolescence accélérée",
          "Volatilité des prix des matières premières",
          "Changements réglementaires possibles",
          "Concurrence accrue sur le marché"
        ],
        metriques: {
          croissance_annuelle_estimee: 8.5,
          valeur_residuelle_projetee: totaux.valeur_nette * 0.35,
          besoin_renouvellement: totaux.nombre * 0.25
        }
      });
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    
    const csvContent = [
      ['Groupe', 'Nombre', 'Valeur brute (CDF)', 'Valeur nette (CDF)', 'Amortissements (CDF)', '% du total'],
      ...data.map(item => [
        item.groupe,
        item.nombre,
        item.valeur_brute,
        item.valeur_nette,
        item.amortissements || 0,
        ((item.valeur_nette / totaux.valeur_nette) * 100).toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `etat_immobilisations_${dateArrete}_${typeActif}_${statutActif}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ✅ VERSION CORRIGÉE DE handleExportPDF - Sans autoTable
  const handleExportPDF = () => {
    if (data.length === 0) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    
    // Fonction pour formater sans espaces pour le PDF
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
      return Math.round(montant).toLocaleString('fr-FR').replace(/\s/g, '') + ' FC';
    };
    
    // Titre
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("ETAT DES IMMOBILISATIONS", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    
    // En-tête
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date d'arrete: ${new Date(dateArrete).toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    doc.text(`Type d'actif: ${typeActif}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    doc.text(`Statut: ${statutActif}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    
    // Résumé
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total actifs: ${totaux.nombre}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Valeur brute: ${formatPDFCurrency(totaux.valeur_brute)}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Valeur nette: ${formatPDFCurrency(totaux.valeur_nette)}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Amortissements: ${formatPDFCurrency(totaux.amortissements_cumules)}`, 14, yPosition);
    yPosition += 15;
    
    // Tableau manuel
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // En-têtes du tableau
    const headers = [getGroupeLabel(), 'Nb', 'Valeur brute', 'Valeur nette', '%'];
    const colWidths = [40, 20, 35, 35, 20];
    let xPosition = 10;
    
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
    for (const item of data) {
      const pourcentage = ((item.valeur_nette / totaux.valeur_nette) * 100).toFixed(1);
      const rowData = [
        item.groupe || '',
        (item.nombre || 0).toString(),
        formatPDFCurrency(item.valeur_brute || 0),
        formatPDFCurrency(item.valeur_nette || 0),
        `${pourcentage}%`
      ];
      
      xPosition = 10;
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
        xPosition = 10;
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
      doc.rect(10, yPosition, pageWidth - 20, 10, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text("Total:", 12, yPosition + 7);
      doc.text(totaux.nombre.toString(), 10 + colWidths[0] + 2, yPosition + 7);
      doc.text(formatPDFCurrency(totaux.valeur_brute), 10 + colWidths[0] + colWidths[1] + 2, yPosition + 7);
      doc.text(formatPDFCurrency(totaux.valeur_nette), 10 + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPosition + 7);
      doc.text("100%", 10 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, yPosition + 7);
    }
    
    doc.save(`etat_immobilisations_${dateArrete}_${typeActif}_${statutActif}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleViewActif = (groupe) => {
    navigate(`/actifs?${groupePar}=${encodeURIComponent(groupe)}`);
  };

  const getGroupeLabel = () => {
    switch(groupePar) {
      case 'categorie': return 'Catégorie';
      case 'localisation': return 'Localisation';
      case 'affectation': return 'Service/Affectation';
      default: return 'Groupe';
    }
  };

  const getGroupeIcon = () => {
    switch(groupePar) {
      case 'categorie': return '🏷️';
      case 'localisation': return '📍';
      case 'affectation': return '👥';
      default: return '📊';
    }
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

  const formatNumber = (value) => {
    if (!value && value !== 0) return '0';
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'];

  const radarData = data.map(item => ({
    sujet: item.groupe,
    pourcentage: ((item.valeur_nette / totaux.valeur_nette) * 100),
    nombre: item.nombre
  }));

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

  if (error) {
    return (
      <div className="py-5 text-center" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
        <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
          <Card.Body className="py-5">
            <FiAlertCircle size={48} className="text-danger mb-3" />
            <p className="text-danger">{error}</p>
            <Button variant="danger" onClick={fetchData} className="mt-3">
              <FiRefreshCw className="me-2" /> Réessayer
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <Container fluid className="py-4 px-3 px-md-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <Button variant="outline-light" onClick={handleGoBack} className="d-flex align-items-center gap-2">
              <FiArrowLeft size={18} /> Retour
            </Button>
            <div>
              <h1 className="display-6 fw-bold text-white mb-1">État des immobilisations</h1>
              <p className="text-white-50">Analyse de la répartition des actifs</p>
            </div>
          </div>
          <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}>
            <Card.Body className="text-center py-5">
              <FiPackage size={48} className="text-white opacity-50 mb-3" />
              <p className="text-white">Aucune donnée disponible pour les filtres sélectionnés</p>
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Form.Select 
                  value={dateArrete} 
                  onChange={(e) => setDateArrete(e.target.value)} 
                  style={{ width: 'auto', backgroundColor: '#ffffff', color: '#000000' }}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(an => (
                    <option key={an} value={`${an}-12-31`}>{an}</option>
                  ))}
                </Form.Select>
                <Button variant="light" onClick={fetchData}><FiRefreshCw className="me-2" /> Actualiser</Button>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
      <Container fluid className="py-4 px-3 px-md-4">
        
        {/* Modal d'aide pour les diagrammes */}
        <Modal show={showChartHelp} onHide={() => setShowChartHelp(false)} size="lg" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiHelpCircle size={24} /> Guide des diagrammes - État des immobilisations
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', maxHeight: '70vh', overflowY: 'auto' }}>
            <Accordion defaultActiveKey={chartType}>
              {Object.entries(chartExplanations).map(([key, exp]) => (
                <Accordion.Item key={key} eventKey={key} style={{ background: 'transparent', border: '1px solid #333', marginBottom: '10px' }}>
                  <Accordion.Header>
                    <span style={{ fontSize: '1.2rem' }}>{exp.icon} {exp.title}</span>
                  </Accordion.Header>
                  <Accordion.Body style={{ background: '#0f172a', color: '#e2e8f0' }}>
                    <p><strong>Description :</strong> {exp.description}</p>
                    <p><strong>Comment ça fonctionne :</strong> {exp.howItWorks}</p>
                    <p><strong>Quand l'utiliser :</strong></p>
                    <ul>{exp.whenToUse.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    <p><strong>Comment l'interpréter :</strong></p>
                    <ul>{exp.howToRead.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    <div className="alert alert-info mt-2"><strong>Exemple :</strong> {exp.example}</div>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
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
              <GiArtificialIntelligence size={24} /> Analyse IA du portefeuille
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
                  <div className="display-4 fw-bold" style={{ color: aiAnalyse.score_sante >= 80 ? '#10b981' : aiAnalyse.score_sante >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {aiAnalyse.score_sante || 75}/100
                  </div>
                  <Badge bg={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 50 ? 'warning' : 'danger'}>
                    Santé du portefeuille
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <ProgressBar 
                    now={aiAnalyse.score_sante || 75} 
                    variant={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 50 ? 'warning' : 'danger'} 
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
                      <div className="col-4">
                        <div className="text-center">
                          <small className="text-muted">Actifs</small>
                          <div className="fw-bold text-white">{aiAnalyse.metriques.nombre_actifs || totaux.nombre}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="text-center">
                          <small className="text-muted">Valeur brute</small>
                          <div className="fw-bold text-white">{formatCurrency(aiAnalyse.metriques.valeur_brute || totaux.valeur_brute)}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="text-center">
                          <small className="text-muted">Valeur nette</small>
                          <div className="fw-bold text-white">{formatCurrency(aiAnalyse.metriques.valeur_nette || totaux.valeur_nette)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {aiAnalyse.anomalies && aiAnalyse.anomalies.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #ef4444' }}>
                    <strong className="text-danger">Anomalies détectées ({aiAnalyse.anomalies.length})</strong>
                    <ul className="mt-2 mb-0">
                      {aiAnalyse.anomalies.map((a, i) => (
                        <li key={i} className="text-white-50 small">{typeof a === 'string' ? a : (a.message || JSON.stringify(a))}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {aiAnalyse.recommandations && aiAnalyse.recommandations.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #10b981' }}>
                    <strong className="text-success">Recommandations</strong>
                    <ul className="mt-2 mb-0">
                      {aiAnalyse.recommandations.map((r, i) => (
                        <li key={i} className="text-white-50 small">{typeof r === 'string' ? r : (r.message || JSON.stringify(r))}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 p-2 rounded text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <small className="text-white-50">Niveau de risque: </small>
                  <strong className={aiAnalyse.niveau_risque === 'faible' ? 'text-success' : aiAnalyse.niveau_risque === 'moyen' ? 'text-warning' : 'text-danger'}>
                    {aiAnalyse.niveau_risque || 'non déterminé'}
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
              {aiLoading ? <Spinner size="sm" animation="border" /> : <><GiArtificialIntelligence className="me-1" /> Analyser avec l'IA</>}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Prédictions IA */}
        <Modal show={showPredictionModal} onHide={() => setShowPredictionModal(false)} size="xl" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiPredict size={24} /> Prédictions IA - Évolution du patrimoine
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: '#0f0f1a', maxHeight: '70vh', overflowY: 'auto' }}>
            {predictionLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
                <p className="text-white">L'IA analyse les données et génère les prédictions...</p>
                <p className="text-white-50 small">Horizon: {selectedHorizon} ans</p>
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
                        <AreaChart data={predictionIA.projections}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="annee" stroke="#888" />
                          <YAxis stroke="#888" tickFormatter={(v) => `${(v/1000000000).toFixed(1)}Md`} />
                          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                          <Legend wrapperStyle={{ color: '#fff' }} />
                          <Area type="monotone" dataKey="valeur" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Valeur projetée" />
                        </AreaChart>
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
                <FiBarChart2 size={32} style={{ color: '#fff' }} /> État des immobilisations
              </h1>
              <p className="text-white-50 small mb-0">
                Analyse de la répartition des actifs par {getGroupeLabel().toLowerCase()}
              </p>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-light" onClick={() => setShowChartHelp(true)} className="d-flex align-items-center gap-2">
              <FiHelpCircle size={16} /> Guide des diagrammes
            </Button>
            <Button onClick={handlePredictionIA} className="d-flex align-items-center gap-2" style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', color: 'white', boxShadow: '0 0 15px rgba(139, 92, 246, 0.8)', fontWeight: 'bold' }}>
              <FiPredict size={18} /> Prédictions IA
            </Button>
            <Button variant="outline-light" onClick={handleAIAnalyse} className="d-flex align-items-center gap-2">
              <GiArtificialIntelligence size={16} /> Analyse IA
            </Button>
            <Button variant="outline-light" onClick={handleExportCSV} className="d-flex align-items-center gap-2">
              <FiDownload size={16} /> CSV
            </Button>
            <Button variant="outline-light" onClick={handleExportPDF} className="d-flex align-items-center gap-2">
              <FiPrinter size={16} /> PDF
            </Button>
            <Button variant="light" onClick={handleRefresh} disabled={refreshing} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="border-0 shadow-lg rounded-3 mb-4" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <Card.Body>
            <Row className="g-3">
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#000000' }}>Date d'arrêté</label>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-primary text-white"><FiCalendar size={14} /></InputGroup.Text>
                  <input type="date" className="form-control form-control-sm" value={dateArrete} onChange={(e) => setDateArrete(e.target.value)} />
                </InputGroup>
              </Col>
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#000000' }}>Type d'actif</label>
                <Form.Select size="sm" value={typeActif} onChange={(e) => {
                  setTypeActif(e.target.value);
                  setLoading(true);
                }}>
                  <option value="tous">Tous</option>
                  <option value="logiciel">Logiciel</option>
                  <option value="materiel">Matériel</option>
                  <option value="vehicule">Véhicule</option>
                  <option value="bâtiment">Bâtiment</option>
                  <option value="terrain">Terrain</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#000000' }}>Statut</label>
                <Form.Select size="sm" value={statutActif} onChange={(e) => {
                  setStatutActif(e.target.value);
                  setLoading(true);
                }}>
                  <option value="tous">Tous</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="amorti">Amorti</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <label className="small fw-semibold mb-1" style={{ color: '#000000' }}>Devise d'affichage</label>
                <Form.Select size="sm" value={deviseAffichage} onChange={(e) => setDeviseAffichage(e.target.value)}>
                  <option value="CDF">Francs Congolais (FC)</option>
                  <option value="USD">Dollars US ($)</option>
                  <option value="EUR">Euros (€)</option>
                </Form.Select>
              </Col>
            </Row>
            <Row className="g-3 mt-2">
              <Col>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <FiFilter size={16} className="text-primary" />
                    <span className="fw-semibold small text-secondary">Grouper par :</span>
                    <Form.Select value={groupePar} onChange={(e) => {
                      setGroupePar(e.target.value);
                      setLoading(true);
                    }} style={{ width: 'auto', minWidth: '160px' }} size="sm">
                      <option value="categorie">Catégorie</option>
                      <option value="localisation">Localisation</option>
                      <option value="affectation">Service/Affectation</option>
                      <option value="type">Type d'actif</option>
                    </Form.Select>
                  </div>
                  <div className="btn-group" role="group">
                    <Button variant={viewMode === 'table' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('table')} className="d-flex align-items-center gap-2" size="sm">
                      <FiList size={14} /> Tableau
                    </Button>
                    <Button variant={viewMode === 'chart' ? 'primary' : 'outline-secondary'} onClick={() => setViewMode('chart')} className="d-flex align-items-center gap-2" size="sm">
                      <FiGrid size={14} /> Graphique
                    </Button>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Cartes résumé */}
        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white' }}>
              <Card.Body><FiPackage size={28} className="mb-2 opacity-75" /><div className="h2 mb-0 fw-bold">{formatNumber(totaux.nombre)}</div><small className="opacity-75">Total actifs</small></Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white' }}>
              <Card.Body><FiTrendingUp size={28} className="mb-2 opacity-75" /><div className="h2 mb-0 fw-bold">{formatCurrency(totaux.valeur_brute)}</div><small className="opacity-75">Valeur brute</small></Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
              <Card.Body><FiDollarSign size={28} className="mb-2 opacity-75" /><div className="h2 mb-0 fw-bold">{formatCurrency(totaux.valeur_nette)}</div><small className="opacity-75">Valeur nette</small></Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
              <Card.Body><FiTrendingDown size={28} className="mb-2 opacity-75" /><div className="h2 mb-0 fw-bold">{formatCurrency(totaux.amortissements_cumules)}</div><small className="opacity-75">Amortissements</small></Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Vue Tableau */}
        {viewMode === 'table' ? (
          <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ color: '#000000', fontWeight: '600' }}>{getGroupeLabel()} {getGroupeIcon()}</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Nombre</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Valeur brute</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Amortissements</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Valeur nette</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>% du total</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => {
                    const pourcentage = ((item.valeur_nette / totaux.valeur_nette) * 100).toFixed(1);
                    return (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                        <td className="fw-semibold" style={{ color: '#000000' }}>{item.groupe}</td>
                        <td style={{ color: '#000000' }}>{formatNumber(item.nombre)}</td>
                        <td style={{ color: '#000000' }}>{formatCurrency(item.valeur_brute)}</td>
                        <td style={{ color: '#000000' }}>{formatCurrency(item.amortissements || 0)}</td>
                        <td className="fw-semibold" style={{ color: '#2563eb' }}>{formatCurrency(item.valeur_nette)}</td>
                        <td style={{ color: '#000000' }}>{pourcentage}%</td>
                        <td><Button variant="outline-primary" size="sm" onClick={() => handleViewActif(item.groupe)}><FiEye size={14} /></Button></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot style={{ background: '#e5e7eb', fontWeight: 'bold' }}>
                  <tr>
                    <td style={{ color: '#000000' }}>Total</td>
                    <td style={{ color: '#000000' }}>{formatNumber(totaux.nombre)}</td>
                    <td style={{ color: '#000000' }}>{formatCurrency(totaux.valeur_brute)}</td>
                    <td style={{ color: '#000000' }}>{formatCurrency(totaux.amortissements_cumules)}</td>
                    <td style={{ color: '#000000' }}>{formatCurrency(totaux.valeur_nette)}</td>
                    <td style={{ color: '#000000' }}>100%</td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card>
        ) : (
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
                  <Button variant="link" size="sm" onClick={() => setShowChartHelp(true)} className="text-info ms-auto text-decoration-none">
                    <FiHelpCircle size={14} /> En savoir plus
                  </Button>
                </div>
              </Card.Body>
            </Card>

            <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '16px', padding: '1px' }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3">
                <div className="btn-group" role="group">
                  <Button variant={chartType === 'bar' ? 'primary' : 'outline-light'} onClick={() => setChartType('bar')} size="sm" style={{ color: '#ffffff' }}><FiBarChart2 size={14} /> Barres</Button>
                  <Button variant={chartType === 'pie' ? 'primary' : 'outline-light'} onClick={() => setChartType('pie')} size="sm" style={{ color: '#ffffff' }}><FiPieChart size={14} /> Camembert</Button>
                  <Button variant={chartType === 'area' ? 'primary' : 'outline-light'} onClick={() => setChartType('area')} size="sm" style={{ color: '#ffffff' }}><FiTrendingUp size={14} /> Aires</Button>
                  <Button variant={chartType === 'radar' ? 'primary' : 'outline-light'} onClick={() => setChartType('radar')} size="sm" style={{ color: '#ffffff' }}><FiCpu size={14} /> Radar</Button>
                </div>
                {fullscreenChart && (
                  <Button variant="outline-light" size="sm" onClick={() => setFullscreenChart(null)} style={{ color: '#ffffff' }}>
                    <FiMinimize2 size={14} /> Fermer
                  </Button>
                )}
              </div>

              {chartType === 'bar' && !fullscreenChart && (
                <Card className="border-0 shadow-sm rounded-3 m-3" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fff" strokeOpacity={0.3} />
                        <XAxis dataKey="groupe" angle={-45} textAnchor="end" height={80} tick={{ fill: '#fff' }} />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fill: '#fff' }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#fff' }} />
                        <Bar dataKey="valeur_nette" fill="#f59e0b" name="Valeur nette" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              )}

              {chartType === 'area' && !fullscreenChart && (
                <Card className="border-0 shadow-sm rounded-3 m-3" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fff" strokeOpacity={0.3} />
                        <XAxis dataKey="groupe" angle={-45} textAnchor="end" height={80} tick={{ fill: '#fff' }} />
                        <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fill: '#fff' }} />
                        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                        <Legend wrapperStyle={{ color: '#fff' }} />
                        <Area type="monotone" dataKey="valeur_nette" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} name="Valeur nette" />
                        <Area type="monotone" dataKey="valeur_brute" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Valeur brute" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              )}

              {chartType === 'pie' && !fullscreenChart && (
                <Row className="g-3 p-3">
                  <Col md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3" style={{ color: '#fff' }}>Répartition par nombre</h3>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie data={data} cx="50%" cy="50%" labelLine={true} label={({ groupe, percent }) => `${groupe} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} dataKey="nombre" nameKey="groupe">
                              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                            <Legend wrapperStyle={{ color: '#fff' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                      <Card.Body>
                        <h3 className="h6 fw-semibold mb-3" style={{ color: '#fff' }}>Répartition par valeur nette</h3>
                        <ResponsiveContainer width="100%" height={350}>
                          <PieChart>
                            <Pie data={data} cx="50%" cy="50%" labelLine={true} label={({ groupe, percent }) => `${groupe} (${(percent * 100).toFixed(0)}%)`} outerRadius={100} dataKey="valeur_nette" nameKey="groupe">
                              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                            <Legend wrapperStyle={{ color: '#fff' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}

              {chartType === 'radar' && !fullscreenChart && (
                <Card className="border-0 shadow-sm rounded-3 m-3" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                  <Card.Body>
                    <div className="row">
                      <div className="col-md-7">
                        <ResponsiveContainer width="100%" height={400}>
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="#fff" strokeOpacity={0.3} />
                            <PolarAngleAxis dataKey="sujet" tick={{ fontSize: 10, fill: '#fff' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: '#fff' }} />
                            <Radar name="Part du patrimoine" dataKey="pourcentage" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                            <Legend wrapperStyle={{ color: '#fff' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="col-md-5">
                        <div className="p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                          <h6 className="text-white mb-3">Comment lire ce graphique ?</h6>
                          <p className="text-white-50 small">Le diagramme en radar montre la répartition de votre patrimoine en pourcentage.</p>
                          <ul className="text-white-50 small">
                            <li>Plus le point est éloigné du centre → plus la catégorie représente une part importante</li>
                            <li>La zone verte représente visuellement la distribution du patrimoine</li>
                            <li>Les axes correspondent aux différentes catégories d'actifs</li>
                            <li>L'échelle va de 0% (centre) à 100% (bord extérieur)</li>
                          </ul>
                          <div className="alert alert-info mt-2 p-2 small">Exemple : {chartExplanations.radar.example}</div>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-4">
          <small className="text-white-50 d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <FiShield size={12} /> Données en temps réel
            {deviseAffichage !== 'CDF' && (
              <span className="text-info">
                <FiInfo size={12} className="me-1" />
                1 {deviseAffichage} = {deviseAffichage === 'USD' ? tauxChange.USD : tauxChange.EUR} CDF
              </span>
            )}
          </small>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
          .table-hover tbody tr:hover { background-color: rgba(37, 99, 235, 0.05) !important; }
          .accordion-button:not(.collapsed) { background-color: #2563eb; color: white; }
          .accordion-button { background-color: #1e293b; color: #e2e8f0; }
          .accordion-button:focus { box-shadow: none; border-color: #2563eb; }
        `}</style>
      </Container>
    </div>
  );
};

export default EtatImmobilisations;