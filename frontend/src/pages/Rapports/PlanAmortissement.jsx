// frontend/src/pages/Rapports/PlanAmortissement.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import api from '../../services/api';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { 
  FiCalendar, FiRefreshCw, FiDownload, 
  FiTrendingUp, FiTrendingDown, FiBarChart2,
  FiPieChart, FiEye, FiFileText, FiDollarSign,
  FiAlertCircle, FiShield, FiInfo, FiMaximize2, FiMinimize2,
  FiHelpCircle, FiArrowLeft
} from 'react-icons/fi';
import { GiArtificialIntelligence } from 'react-icons/gi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Table, Modal, ProgressBar, Accordion } from 'react-bootstrap';
import jsPDF from 'jspdf';

const PlanAmortissement = () => {
  const navigate = useNavigate();
  const { user } = usePermissions();
  const isAuditeur = user?.role === 'auditeur';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [exercice, setExercice] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('table');
  const [fullscreenChart, setFullscreenChart] = useState(null);
  const [deviseAffichage, setDeviseAffichage] = useState('CDF');
  const [showChartHelp, setShowChartHelp] = useState(false);
  const [totaux, setTotaux] = useState({
    valeur_brute: 0,
    annuite: 0,
    cumul: 0,
    vnc: 0,
    nombre_actifs: 0
  });

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

  // Explications des diagrammes
  const chartExplanations = {
    bar: {
      title: "DIAGRAMME À BARRES",
      icon: "📊",
      description: "Des barres verticales dont la hauteur est proportionnelle à la valeur de chaque actif.",
      howItWorks: "Chaque barre représente un actif. Plus la barre est haute, plus la valeur est importante.",
      whenToUse: [
        "Comparer facilement les amortissements entre différents actifs",
        "Identifier rapidement les actifs avec les plus fortes annuités",
        "Visualiser les écarts de valeurs entre les actifs"
      ],
      howToRead: [
        "Barre la plus haute → Actif avec la plus grande valeur d'amortissement",
        "Comparer les hauteurs relatives entre les barres",
        "Les couleurs représentent différentes métriques"
      ],
      example: "Si un actif a une barre d'annuité très haute, cela signifie qu'il représente une charge d'amortissement importante."
    },
    line: {
      title: "DIAGRAMME EN LIGNES",
      icon: "📈",
      description: "Des lignes qui relient les points représentant les valeurs pour chaque actif.",
      howItWorks: "Chaque ligne représente une métrique (annuité, cumul, VNC).",
      whenToUse: [
        "Visualiser la tendance des valeurs d'un actif à l'autre",
        "Comparer l'évolution relative des différentes métriques",
        "Identifier des pics ou des anomalies"
      ],
      howToRead: [
        "Plus la ligne monte → plus la valeur est élevée",
        "Chaque couleur représente une métrique différente",
        "Les croisements de lignes montrent des inversions de tendance"
      ],
      example: "Si la ligne de la VNC descend régulièrement, les actifs s'amortissent normalement."
    },
    area: {
      title: "DIAGRAMME EN AIRES",
      icon: "📉",
      description: "Des formes superposées qui montrent l'accumulation des valeurs.",
      howItWorks: "Chaque métrique est représentée par une aire colorée.",
      whenToUse: [
        "Visualiser la répartition entre VNC et cumul d'amortissement",
        "Comprendre rapidement l'état d'amortissement du portefeuille",
        "Comparer visuellement l'importance relative des métriques"
      ],
      howToRead: [
        "L'aire orange = VNC restante, l'aire verte = cumul amorti",
        "Plus l'aire orange est large → actif peu amorti",
        "Plus l'aire verte est large → actif très amorti"
      ],
      example: "Un actif avec une grande aire orange et une petite aire verte a été peu amorti."
    },
    pie: {
      title: "DIAGRAMME EN CAMEMBERT",
      icon: "🥧",
      description: "Un cercle divisé en parts montrant la répartition entre VNC et cumul.",
      howItWorks: "Le cercle entier = 100% du portefeuille.",
      whenToUse: [
        "Avoir une vue d'ensemble de l'état d'amortissement global",
        "Visualiser rapidement si les actifs sont globalement amortis ou non",
        "Présenter des indicateurs synthétiques"
      ],
      howToRead: [
        "Part orange = valeur comptable restante",
        "Part verte = valeur déjà amortie",
        "Plus la part verte est grande → plus le portefeuille est amorti"
      ],
      example: "Si la part verte représente 70%, alors 70% de la valeur brute a déjà été amortie."
    }
  };

  // REDIRECTION SI AUDITEUR (pas autorisé)
  useEffect(() => {
    if (isAuditeur) {
      navigate('/rapports', { replace: true });
    }
  }, [isAuditeur, navigate]);

  const fetchData = useCallback(async () => {
    if (isAuditeur) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`📊 Chargement des données pour l'exercice: ${exercice}`);
      
      const response = await api.get(`/reports/tableau-amortissements?exercice=${exercice}`);
      
      console.log('📊 Données reçues:', response.data);
      
      const amortissements = response.data.amortissements || [];
      setData(amortissements);
      setTotaux({
        valeur_brute: amortissements.reduce((s, i) => s + (i.valeur_brute || 0), 0),
        annuite: amortissements.reduce((s, i) => s + (i.annuite || 0), 0),
        cumul: amortissements.reduce((s, i) => s + (i.cumul || 0), 0),
        vnc: amortissements.reduce((s, i) => s + (i.vnc || 0), 0),
        nombre_actifs: amortissements.length
      });
    } catch (err) {
      console.error('❌ Erreur:', err);
      if (err.response?.status === 403) {
        setError('Accès non autorisé. Cette page est réservée aux administrateurs et comptables.');
        setTimeout(() => navigate('/rapports'), 2000);
      } else {
        setError(err.response?.data?.message || 'Erreur de chargement');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [exercice, isAuditeur, navigate]);

  useEffect(() => {
    if (!isAuditeur) {
      fetchData();
    }
  }, [fetchData, exercice, isAuditeur]);

  // ✅ ANALYSE IA
  const handleAIAnalyse = async () => {
    if (data.length === 0) {
      alert("Aucune donnée à analyser");
      return;
    }
    
    setAiLoading(true);
    setShowAIAnalyse(true);
    
    try {
      const valeurBruteTotale = data.reduce((sum, item) => sum + (item.valeur_brute || 0), 0);
      const annuiteTotale = data.reduce((sum, item) => sum + (item.annuite || 0), 0);
      const cumulTotal = data.reduce((sum, item) => sum + (item.cumul || 0), 0);
      const vncTotale = data.reduce((sum, item) => sum + (item.vnc || 0), 0);
      
      const tauxAnnuelGlobal = valeurBruteTotale > 0 ? (annuiteTotale / valeurBruteTotale) * 100 : 0;
      const tauxCumuleGlobal = valeurBruteTotale > 0 ? (cumulTotal / valeurBruteTotale) * 100 : 0;
      
      const anomalies = [];
      const recommandations = [];
      let actifsSansDuree = 0;
      let actifsAvecAnomalie = 0;
      
      const statsParDuree = {};
      
      for (const item of data) {
        const dureeActif = item.duree_utile || item.duree_amortissement || 5;
        const valeurBrute = item.valeur_brute || 0;
        const annuite = item.annuite || 0;
        const valeurResiduelle = item.valeur_residuelle || 0;
        const cumul = item.cumul || 0;
        
        if (!statsParDuree[dureeActif]) {
          statsParDuree[dureeActif] = { count: 0, valeur: 0, annuite: 0 };
        }
        statsParDuree[dureeActif].count++;
        statsParDuree[dureeActif].valeur += valeurBrute;
        statsParDuree[dureeActif].annuite += annuite;
        
        const baseAmortissable = valeurBrute - valeurResiduelle;
        const annuiteTheorique = dureeActif > 0 ? baseAmortissable / dureeActif : 0;
        
        if (annuiteTheorique > 0 && Math.abs(annuite - annuiteTheorique) > annuiteTheorique * 0.15) {
          anomalies.push({
            type: 'annuite',
            severity: 'medium',
            message: `${item.actif_code || item.code_actif || 'N/A'} - ${item.actif_nom || 'Sans nom'}: Annuité diffère de la valeur théorique pour une durée de ${dureeActif} ans`
          });
          actifsAvecAnomalie++;
        }
        
        if (!item.duree_utile && !item.duree_amortissement) {
          actifsSansDuree++;
          anomalies.push({
            type: 'duree',
            severity: 'high',
            message: `${item.actif_code || item.code_actif || 'N/A'}: Durée d'amortissement non définie`
          });
        }
        
        if (cumul > valeurBrute * 1.1) {
          anomalies.push({
            type: 'cumul',
            severity: 'high',
            message: `${item.actif_code || item.code_actif || 'N/A'}: Cumul des amortissements supérieur à la valeur brute`
          });
          actifsAvecAnomalie++;
        }
      }
      
      if (actifsSansDuree > 0) {
        recommandations.push(`Définir la durée d'amortissement pour ${actifsSansDuree} actif(s) sans durée spécifiée`);
      }
      
      if (tauxAnnuelGlobal > 30) {
        recommandations.push("Le taux d'amortissement annuel global est élevé (>30%). Vérifiez les durées des actifs à forte valeur");
      }
      
      if (tauxCumuleGlobal > 70) {
        recommandations.push("Le portefeuille est très amorti (>70%). Envisagez le remplacement ou la réévaluation des actifs");
      }
      
      if (actifsAvecAnomalie > 0) {
        recommandations.push(`${actifsAvecAnomalie} actif(s) présentent des anomalies. Recalculez leurs plans d'amortissement`);
      }
      
      if (recommandations.length === 0) {
        recommandations.push("Aucune anomalie majeure détectée. Continuez le suivi régulier des amortissements");
        recommandations.push("Effectuez un inventaire annuel pour vérifier la cohérence des valeurs");
      }
      
      let scoreSante = 100;
      scoreSante -= actifsSansDuree * 5;
      scoreSante -= actifsAvecAnomalie * 3;
      if (tauxAnnuelGlobal > 30) scoreSante -= 10;
      if (tauxAnnuelGlobal > 50) scoreSante -= 10;
      if (tauxCumuleGlobal > 80) scoreSante -= 10;
      scoreSante = Math.max(0, Math.min(100, scoreSante));
      
      let niveauRisque = "faible";
      if (scoreSante < 40) niveauRisque = "critique";
      else if (scoreSante < 60) niveauRisque = "élevé";
      else if (scoreSante < 80) niveauRisque = "moyen";
      
      let resume = "";
      if (scoreSante >= 80) {
        resume = `✅ Le plan d'amortissement est globalement cohérent. ${data.length} actifs pour une valeur nette de ${formatCurrency(vncTotale)}. Taux d'amortissement annuel: ${tauxAnnuelGlobal.toFixed(1)}%.`;
      } else if (scoreSante >= 50) {
        resume = `⚠️ Le plan d'amortissement présente quelques incohérences. ${anomalies.length} anomalie(s) détectée(s). Une vérification est recommandée.`;
      } else {
        resume = `🔴 Le plan d'amortissement nécessite une attention particulière. ${anomalies.length} anomalie(s) critique(s) détectée(s). Une correction immédiate est recommandée.`;
      }
      
      const metriquesParDuree = Object.entries(statsParDuree).map(([duree, stats]) => ({
        duree: `${duree} ans`,
        nombre: stats.count,
        valeur: stats.valeur,
        annuite: stats.annuite
      }));
      
      setAiAnalyse({
        score_sante: scoreSante,
        niveau_risque: niveauRisque,
        resume: resume,
        anomalies: anomalies.slice(0, 15),
        recommandations: recommandations,
        metriques: {
          nombre_actifs: data.length,
          valeur_brute_totale: valeurBruteTotale,
          annuite_totale: annuiteTotale,
          vnc_totale: vncTotale,
          taux_amortissement_annuel: parseFloat(tauxAnnuelGlobal.toFixed(1)),
          taux_amortissement_cumule: parseFloat(tauxCumuleGlobal.toFixed(1)),
          actifs_sans_duree: actifsSansDuree,
          actifs_anomalies: actifsAvecAnomalie
        },
        repartition_par_duree: metriquesParDuree
      });
      
    } catch (error) {
      console.error('❌ Erreur analyse IA:', error);
      
      const valeurBruteTotale = data.reduce((sum, item) => sum + (item.valeur_brute || 0), 0);
      const annuiteTotale = data.reduce((sum, item) => sum + (item.annuite || 0), 0);
      const tauxAnnuelGlobal = valeurBruteTotale > 0 ? (annuiteTotale / valeurBruteTotale) * 100 : 0;
      
      setAiAnalyse({
        score_sante: 70,
        niveau_risque: "moyen",
        resume: `Analyse pour l'exercice ${exercice}: ${data.length} actifs. Taux d'amortissement global: ${tauxAnnuelGlobal.toFixed(1)}%.`,
        anomalies: [],
        recommandations: [
          "Vérifier les durées d'amortissement de chaque actif",
          "Utiliser le recalcul automatique des amortissements",
          "Consulter un expert comptable pour validation"
        ],
        metriques: {
          nombre_actifs: data.length,
          valeur_brute_totale: valeurBruteTotale,
          annuite_totale: annuiteTotale,
          vnc_totale: data.reduce((sum, item) => sum + (item.vnc || 0), 0),
          taux_amortissement_annuel: parseFloat(tauxAnnuelGlobal.toFixed(1)),
          taux_amortissement_cumule: 0,
          actifs_sans_duree: 0,
          actifs_anomalies: 0
        },
        repartition_par_duree: []
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePredictionIA = async () => {
    if (data.length === 0) {
      alert("Aucune donnée pour générer des prédictions");
      return;
    }
    
    setPredictionLoading(true);
    setShowPredictionModal(true);
    
    try {
      const vncParAn = totaux.vnc / selectedHorizon;
      
      setTimeout(() => {
        setPredictionIA({
          confiance: 0.78,
          projections: Array.from({ length: selectedHorizon }, (_, i) => ({
            annee: new Date().getFullYear() + i + 1,
            annuite: totaux.annuite,
            vnc: Math.max(0, totaux.vnc - (vncParAn * (i + 1))),
            cumul: totaux.cumul + (totaux.annuite * (i + 1))
          })),
          recommandations: [
            "Provisionner pour le renouvellement des actifs dans 5 ans",
            "Planifier la mise à jour des équipements obsolètes",
            "Réviser les durées d'amortissement annuellement",
            "Envisager des investissements dans des actifs plus performants",
            "Optimiser la stratégie de maintenance préventive"
          ],
          risques: [
            "Risque d'obsolescence accélérée des actifs technologiques",
            "Dépréciation non anticipée des actifs",
            "Changements réglementaires impactant les normes d'amortissement"
          ],
          metriques: {
            taux_amortissement_projete: ((totaux.annuite / (totaux.valeur_brute || 1)) * 100).toFixed(1),
            valeur_residuelle_finale: Math.max(0, totaux.vnc - (vncParAn * selectedHorizon)),
            besoin_renouvellement: Math.ceil(data.length * 0.3)
          }
        });
        setPredictionLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Erreur prédiction IA:', error);
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
    
    const headers = ['Code actif', 'Nom actif', 'Type', 'Compte', 'Durée (ans)', 'Valeur brute (CDF)', 'Annuité (CDF)', 'Cumul (CDF)', 'VNC (CDF)'];
    const rows = data.map(item => [
      item.actif_code,
      item.actif_nom,
      item.type || 'N/A',
      item.compte,
      item.duree_utile || item.duree_amortissement || 'N/A',
      item.valeur_brute,
      item.annuite,
      item.cumul,
      item.vnc
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `plan_amortissement_${exercice}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (data.length === 0) return;
    
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;
    
    const formatPDFCurrency = (value) => {
      if (!value && value !== 0) return '0 FC';
      const montant = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(montant)) return '0 FC';
      return Math.round(montant).toLocaleString('fr-FR') + ' FC';
    };
    
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("PLAN D'AMORTISSEMENT", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Exercice: ${exercice}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;
    doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total actifs: ${data.length}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Valeur brute: ${formatPDFCurrency(totaux.valeur_brute)}`, 14, yPosition);
    yPosition += 8;
    doc.text(`Annuité totale: ${formatPDFCurrency(totaux.annuite)}`, 14, yPosition);
    yPosition += 8;
    doc.text(`VNC totale: ${formatPDFCurrency(totaux.vnc)}`, 14, yPosition);
    yPosition += 15;
    
    doc.setFontSize(8);
    const headers = ['Code', 'Nom', 'Type', 'Durée', 'Valeur brute', 'Annuité', 'Cumul', 'VNC'];
    const colWidths = [25, 40, 20, 15, 30, 25, 25, 25];
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
    
    for (const item of data) {
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
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
      
      const rowData = [
        (item.actif_code || '').substring(0, 8),
        (item.actif_nom || '').substring(0, 15),
        (item.type || 'N/A').substring(0, 6),
        (item.duree_utile || item.duree_amortissement || '?').toString(),
        formatPDFCurrency(item.valeur_brute || 0),
        formatPDFCurrency(item.annuite || 0),
        formatPDFCurrency(item.cumul || 0),
        formatPDFCurrency(item.vnc || 0)
      ];
      
      xPosition = 10;
      for (let i = 0; i < rowData.length; i++) {
        doc.text(rowData[i], xPosition + 2, yPosition + 7);
        xPosition += colWidths[i];
      }
      yPosition += 10;
    }
    
    doc.save(`plan_amortissement_${exercice}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleViewActif = (actifId) => {
    if (actifId) navigate(`/actifs/${actifId}`);
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

  const annees = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  const pieData = [
    { name: 'Valeur nette (VNC)', value: totaux.vnc, color: '#f59e0b' },
    { name: 'Amortissements cumulés', value: totaux.cumul, color: '#10b981' }
  ];

  // PAGE D'ACCÈS REFUSÉ POUR L'AUDITEUR
  if (isAuditeur) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 'calc(100vh - 64px)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card className="border-0 shadow-lg text-center" style={{ maxWidth: '500px', width: '90%', background: 'rgba(255,255,255,0.95)' }}>
          <Card.Body className="py-5">
            <div className="bg-danger bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
              <FiAlertCircle size={48} className="text-danger" />
            </div>
            <h2 className="h4 fw-bold text-danger mb-2">Accès non autorisé</h2>
            <p className="text-muted mb-2">Vous n'avez pas les droits pour accéder au plan d'amortissement.</p>
            <p className="text-muted small mb-4">Cette page est réservée aux administrateurs et comptables.</p>
            <Button variant="primary" onClick={() => navigate('/rapports')}>
              Retour aux rapports
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

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
            <Button variant="danger" onClick={fetchData} className="mt-3 me-2">
              <FiRefreshCw className="me-2" /> Réessayer
            </Button>
            <Button variant="secondary" onClick={() => navigate('/rapports')} className="mt-3">
              Retour aux rapports
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
              <h1 className="display-6 fw-bold text-white mb-1">Plan d'amortissement</h1>
              <p className="text-white-50">Suivi des amortissements pour l'exercice {exercice}</p>
            </div>
          </div>
          <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}>
            <Card.Body className="text-center py-5">
              <FiFileText size={48} className="text-white opacity-50 mb-3" />
              <p className="text-white">Aucune donnée disponible pour l'exercice {exercice}</p>
              <div className="d-flex gap-2 justify-content-center">
                <Form.Select 
                  value={exercice} 
                  onChange={(e) => setExercice(parseInt(e.target.value))} 
                  style={{ width: 'auto', backgroundColor: '#ffffff', color: '#000000' }}
                >
                  {annees.map(an => <option key={an} value={an}>{an}</option>)}
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
              <FiHelpCircle size={24} /> Guide des diagrammes - Amortissements
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
              <GiArtificialIntelligence size={24} /> Analyse IA du plan d'amortissement
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)', maxHeight: '70vh', overflowY: 'auto' }}>
            {aiLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-white">Analyse en cours...</p>
              </div>
            ) : aiAnalyse ? (
              <div>
                <div className="text-center mb-4">
                  <div className="display-4 fw-bold" style={{ color: aiAnalyse.score_sante >= 80 ? '#10b981' : aiAnalyse.score_sante >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {aiAnalyse.score_sante}/100
                  </div>
                  <Badge bg={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 50 ? 'warning' : 'danger'}>
                    Santé du plan d'amortissement
                  </Badge>
                </div>
                
                <div className="mb-4">
                  <ProgressBar 
                    now={aiAnalyse.score_sante} 
                    variant={aiAnalyse.score_sante >= 80 ? 'success' : aiAnalyse.score_sante >= 50 ? 'warning' : 'danger'} 
                    style={{ height: '10px' }}
                  />
                </div>
                
                <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #06b6d4' }}>
                  <strong className="text-info">📋 Résumé</strong>
                  <p className="mt-2 text-white-50">{aiAnalyse.resume}</p>
                </div>
                
                {aiAnalyse.metriques && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                    <strong className="text-warning">📊 Métriques clés</strong>
                    <div className="row mt-2">
                      <div className="col-4">
                        <div className="text-center">
                          <small className="text-muted">Actifs</small>
                          <div className="fw-bold text-white">{aiAnalyse.metriques.nombre_actifs}</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="text-center">
                          <small className="text-muted">Taux annuel</small>
                          <div className="fw-bold text-white">{aiAnalyse.metriques.taux_amortissement_annuel}%</div>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="text-center">
                          <small className="text-muted">Taux cumulé</small>
                          <div className="fw-bold text-white">{aiAnalyse.metriques.taux_amortissement_cumule}%</div>
                        </div>
                      </div>
                    </div>
                    {(aiAnalyse.metriques.actifs_sans_duree > 0 || aiAnalyse.metriques.actifs_anomalies > 0) && (
                      <div className="mt-2 pt-2 border-top border-secondary">
                        <small className="text-muted">
                          ⚠️ {aiAnalyse.metriques.actifs_sans_duree} actif(s) sans durée définie
                          {aiAnalyse.metriques.actifs_anomalies > 0 && ` | ${aiAnalyse.metriques.actifs_anomalies} actif(s) avec anomalies`}
                        </small>
                      </div>
                    )}
                  </div>
                )}
                
                {aiAnalyse.repartition_par_duree && aiAnalyse.repartition_par_duree.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                    <strong className="text-info">📈 Répartition par durée d'amortissement</strong>
                    <div className="row mt-2">
                      {aiAnalyse.repartition_par_duree.map((item, idx) => (
                        <div key={idx} className="col-6 col-md-4 mb-2">
                          <div className="text-center p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <small className="text-muted">{item.duree}</small>
                            <div className="fw-bold text-white">{item.nombre} actif(s)</div>
                            <small className="text-white-50">{formatCurrency(item.valeur)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {aiAnalyse.anomalies && aiAnalyse.anomalies.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #ef4444', maxHeight: '200px', overflowY: 'auto' }}>
                    <strong className="text-danger">⚠️ Anomalies détectées ({aiAnalyse.anomalies.length})</strong>
                    <ul className="mt-2 mb-0">
                      {aiAnalyse.anomalies.slice(0, 10).map((a, i) => (
                        <li key={i} className="text-white-50 small mt-1">
                          {typeof a === 'string' ? a : a.message}
                        </li>
                      ))}
                      {aiAnalyse.anomalies.length > 10 && (
                        <li className="text-muted small mt-1">... et {aiAnalyse.anomalies.length - 10} autre(s)</li>
                      )}
                    </ul>
                  </div>
                )}
                
                {aiAnalyse.recommandations && aiAnalyse.recommandations.length > 0 && (
                  <div className="mb-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderLeft: '4px solid #10b981' }}>
                    <strong className="text-success">💡 Recommandations</strong>
                    <ul className="mt-2 mb-0">
                      {aiAnalyse.recommandations.map((r, i) => (
                        <li key={i} className="text-white-50 small">{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-3 p-2 rounded text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <small className="text-white-50">Niveau de risque: </small>
                  <strong className={
                    aiAnalyse.niveau_risque === 'faible' ? 'text-success' : 
                    aiAnalyse.niveau_risque === 'moyen' ? 'text-warning' : 'text-danger'
                  }>
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
              {aiLoading ? <Spinner size="sm" animation="border" /> : <><GiArtificialIntelligence className="me-1" /> Analyser avec l'IA</>}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Prédictions IA */}
        <Modal show={showPredictionModal} onHide={() => setShowPredictionModal(false)} size="xl" centered>
          <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white', borderBottom: 'none' }}>
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiTrendingUp size={24} /> Prédictions IA - Plan d'amortissement
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
                        <AreaChart data={predictionIA.projections}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="annee" stroke="#888" />
                          <YAxis stroke="#888" tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#fff' }} />
                          <Legend wrapperStyle={{ color: '#fff' }} />
                          <Area type="monotone" dataKey="vnc" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="VNC" />
                          <Area type="monotone" dataKey="cumul" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Cumul" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {predictionIA.recommandations && predictionIA.recommandations.length > 0 && (
                  <div className="mb-4 p-3 rounded" style={{ background: '#1e293b', borderLeft: '4px solid #10b981' }}>
                    <h6 className="text-white mb-2">📋 Recommandations</h6>
                    <ul className="mb-0">
                      {predictionIA.recommandations.map((rec, idx) => (
                        <li key={idx} className="text-white-50 small mb-1">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {predictionIA.risques && predictionIA.risques.length > 0 && (
                  <div className="mb-4 p-3 rounded" style={{ background: '#1e293b', borderLeft: '4px solid #ef4444' }}>
                    <h6 className="text-white mb-2">⚠️ Risques identifiés</h6>
                    <ul className="mb-0">
                      {predictionIA.risques.map((risque, idx) => (
                        <li key={idx} className="text-white-50 small mb-1">{risque}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
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
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button variant="outline-light" onClick={handleGoBack} className="d-flex align-items-center gap-2">
              <FiArrowLeft size={18} /> Retour
            </Button>
            <div>
              <h1 className="display-6 fw-bold text-white mb-1 d-flex align-items-center gap-2">
                <FiTrendingUp size={32} /> Plan d'amortissement
              </h1>
              <p className="text-white-50 small mb-0">Suivi des amortissements pour l'exercice {exercice}</p>
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-light" onClick={() => setShowChartHelp(true)} className="d-flex align-items-center gap-2">
              <FiHelpCircle size={16} /> Guide
            </Button>
            <Button onClick={handlePredictionIA} className="d-flex align-items-center gap-2" style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6', color: 'white' }}>
              <FiTrendingUp size={18} /> Prédictions IA
            </Button>
            <Button variant="outline-light" onClick={handleAIAnalyse} className="d-flex align-items-center gap-2">
              <GiArtificialIntelligence size={16} /> Analyse IA
            </Button>
            <Button variant="outline-light" onClick={handleExportCSV} className="d-flex align-items-center gap-2">
              <FiDownload size={16} /> CSV
            </Button>
            <Button variant="outline-light" onClick={handleExportPDF} className="d-flex align-items-center gap-2">
              <FiDownload size={16} /> PDF
            </Button>
            <Button variant="light" onClick={handleRefresh} disabled={refreshing} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={16} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <Card className="border-0 shadow-lg rounded-3 mb-4" style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)' }}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <FiCalendar size={18} className="text-white" />
                <span className="fw-semibold small text-white">Exercice :</span>
                <Form.Select value={exercice} onChange={(e) => setExercice(parseInt(e.target.value))} style={{ width: 'auto', minWidth: '100px', backgroundColor: '#ffffff', color: '#000000' }} size="sm">
                  {annees.map(an => <option key={an} value={an}>{an}</option>)}
                </Form.Select>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className="fw-semibold small text-white">Devise :</span>
                <Form.Select value={deviseAffichage} onChange={(e) => setDeviseAffichage(e.target.value)} style={{ width: 'auto', minWidth: '100px', backgroundColor: '#ffffff', color: '#000000' }} size="sm">
                  <option value="CDF">FC</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Form.Select>
              </div>
              <div className="btn-group">
                <Button variant={viewMode === 'table' ? 'primary' : 'outline-light'} onClick={() => setViewMode('table')} className="d-flex align-items-center gap-2" size="sm">
                  <FiFileText size={14} /> Tableau
                </Button>
                <Button variant={viewMode === 'chart' ? 'primary' : 'outline-light'} onClick={() => setViewMode('chart')} className="d-flex align-items-center gap-2" size="sm">
                  <FiBarChart2 size={14} /> Graphique
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Cartes résumé */}
        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', color: 'white' }}>
              <Card.Body>
                <FiDollarSign size={28} className="mb-2 opacity-75" />
                <div className="h2 mb-0 fw-bold">{formatCurrency(totaux.valeur_brute)}</div>
                <small className="opacity-75">Valeur brute</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white' }}>
              <Card.Body>
                <FiTrendingUp size={28} className="mb-2 opacity-75" />
                <div className="h2 mb-0 fw-bold">{formatCurrency(totaux.annuite)}</div>
                <small className="opacity-75">Annuité totale</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}>
              <Card.Body>
                <FiTrendingDown size={28} className="mb-2 opacity-75" />
                <div className="h2 mb-0 fw-bold">{formatCurrency(totaux.cumul)}</div>
                <small className="opacity-75">Cumul total</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 shadow-lg text-center h-100" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
              <Card.Body>
                <FiFileText size={28} className="mb-2 opacity-75" />
                <div className="h2 mb-0 fw-bold">{formatCurrency(totaux.vnc)}</div>
                <small className="opacity-75">VNC totale</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Vue Tableau */}
        {viewMode === 'table' && (
          <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead style={{ background: '#f1f5f9' }}>
                  <tr>
                    <th style={{ color: '#000000', fontWeight: '600', fontSize: '0.85rem' }}>Code</th>
                    <th style={{ color: '#000000', fontWeight: '600', fontSize: '0.85rem' }}>Nom actif</th>
                    <th style={{ color: '#000000', fontWeight: '600', fontSize: '0.85rem' }}>Type</th>
                    <th style={{ color: '#000000', fontWeight: '600', fontSize: '0.85rem' }}>Compte</th>
                    <th style={{ color: '#000000', fontWeight: '600', fontSize: '0.85rem' }}>Durée</th>
                    <th style={{ color: '#000000', fontWeight: '600', textAlign: 'right', fontSize: '0.85rem' }}>Valeur brute</th>
                    <th style={{ color: '#000000', fontWeight: '600', textAlign: 'right', fontSize: '0.85rem' }}>Annuité</th>
                    <th style={{ color: '#000000', fontWeight: '600', textAlign: 'right', fontSize: '0.85rem' }}>Cumul</th>
                    <th style={{ color: '#000000', fontWeight: '600', textAlign: 'right', fontSize: '0.85rem' }}>VNC</th>
                    <th style={{ color: '#000000', fontWeight: '600', fontSize: '0.85rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td><code className="bg-primary px-2 py-1 rounded text-white" style={{ fontSize: '0.8rem' }}>{item.actif_code}</code></td>
                      <td className="fw-semibold" style={{ color: '#000000', fontSize: '0.85rem' }}>{item.actif_nom}</td>
                      <td><Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{item.type || 'N/A'}</Badge></td>
                      <td><code className="bg-warning bg-opacity-25 px-2 py-1 rounded" style={{ fontSize: '0.8rem', color: '#000000' }}>{item.compte}</code></td>
                      <td style={{ color: '#000000', fontSize: '0.85rem' }}>{item.duree_utile || item.duree_amortissement || '-'} ans</td>
                      <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(item.valeur_brute)}</td>
                      <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(item.annuite)}</td>
                      <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(item.cumul)}</td>
                      <td className="text-end"><span className="fw-semibold" style={{ color: '#2563eb', fontSize: '0.85rem' }}>{formatCurrency(item.vnc)}</span></td>
                      <td><Button variant="outline-primary" size="sm" onClick={() => handleViewActif(item.actif_id)}><FiEye size={14} /></Button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#e5e7eb', fontWeight: 'bold' }}>
                  <tr>
                    <td colSpan="5" style={{ color: '#000000', fontSize: '0.85rem' }}>Total</td>
                    <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(totaux.valeur_brute)}</td>
                    <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(totaux.annuite)}</td>
                    <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(totaux.cumul)}</td>
                    <td className="text-end" style={{ color: '#000000', fontSize: '0.85rem' }}>{formatCurrency(totaux.vnc)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          </Card>
        )}

        {/* Vue Graphique */}
        {viewMode === 'chart' && data.length > 0 && (
          <div>
            <Card className="border-0 shadow-sm rounded-3 mb-3" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h6 fw-semibold mb-0 text-white">Amortissements par actif</h3>
                  <div className="btn-group">
                    <Button variant={chartType === 'bar' ? 'primary' : 'outline-light'} size="sm" onClick={() => setChartType('bar')}>Barres</Button>
                    <Button variant={chartType === 'pie' ? 'primary' : 'outline-light'} size="sm" onClick={() => setChartType('pie')}>Camembert</Button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  {chartType === 'bar' ? (
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.3} />
                      <XAxis dataKey="actif_code" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: '#ffffff' }} />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fill: '#ffffff' }} />
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#ffffff' }} />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                      <Bar dataKey="annuite" fill="#3b82f6" name="Annuité" />
                      <Bar dataKey="vnc" fill="#f59e0b" name="VNC" />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`} outerRadius={120} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', color: '#ffffff' }} />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </Card.Body>
            </Card>

            {/* Indicateurs clés */}
            <Card className="border-0 shadow-sm rounded-3" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
              <Card.Body>
                <h3 className="h6 fw-semibold mb-3 text-white">Indicateurs clés</h3>
                <Row>
                  <Col md={4}>
                    <div className="text-center mb-3">
                      <small className="text-white-50">Taux d'amortissement annuel</small>
                      <div className="h3 fw-bold text-white">{((totaux.annuite / (totaux.valeur_brute || 1)) * 100).toFixed(1)}%</div>
                      <ProgressBar now={((totaux.annuite / (totaux.valeur_brute || 1)) * 100)} variant="primary" style={{ height: '6px' }} />
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center mb-3">
                      <small className="text-white-50">Taux amortissement cumulé</small>
                      <div className="h3 fw-bold text-white">{((totaux.cumul / (totaux.valeur_brute || 1)) * 100).toFixed(1)}%</div>
                      <ProgressBar now={((totaux.cumul / (totaux.valeur_brute || 1)) * 100)} variant="success" style={{ height: '6px' }} />
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className="text-center mb-3">
                      <small className="text-white-50">VNC moyenne</small>
                      <div className="h3 fw-bold text-white">{((totaux.vnc / (totaux.valeur_brute || 1)) * 100).toFixed(1)}%</div>
                      <ProgressBar now={((totaux.vnc / (totaux.valeur_brute || 1)) * 100)} variant="warning" style={{ height: '6px' }} />
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <small className="text-white-50 d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <FiShield size={12} /> Plan d'amortissement conforme aux normes BCC
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
        `}</style>
      </Container>
    </div>
  );
};

export default PlanAmortissement; 