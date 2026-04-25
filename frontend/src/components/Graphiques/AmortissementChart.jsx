// frontend/src/components/Charts/AmortissementChart.jsx
import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  ComposedChart,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { FiInfo, FiTrendingUp, FiTrendingDown, FiBarChart2, FiPieChart } from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

// Palette de couleurs professionnelle
const COLORS = {
  primary: '#2563eb',
  secondary: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  amber: '#d97706',
  emerald: '#059669'
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.danger,
  COLORS.warning,
  COLORS.purple,
  COLORS.cyan,
  COLORS.pink,
  COLORS.indigo
];

// Formateur de monnaie professionnel
const formatCurrency = (value, compact = false) => {
  if (value === undefined || value === null) return '0 FC';
  
  if (compact) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Md FC`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M FC`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)} k FC`;
    return `${value.toLocaleString()} FC`;
  }
  
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Tooltip personnalisé professionnel
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white p-3 rounded-3 shadow-lg border" style={{ minWidth: '200px' }}>
      <p className="fw-bold text-dark mb-2" style={{ margin: 0 }}>
        {label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="d-flex justify-content-between mb-1" style={{ color: entry.color }}>
          <span className="me-3">{entry.name}:</span>
          <strong>{formatter ? formatter(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
};

// Légende personnalisée
const CustomLegend = ({ payload }) => {
  return (
    <div className="d-flex justify-content-center gap-4 flex-wrap mt-3">
      {payload.map((entry, index) => (
        <div key={index} className="d-flex align-items-center gap-2">
          <div style={{ width: '12px', height: '12px', backgroundColor: entry.color, borderRadius: '2px' }} />
          <span className="small text-secondary">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Animation styles
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
  }
  
  .chart-fade-in {
    animation: fadeInUp 0.4s ease-out;
  }
  
  .stat-card-hover {
    transition: all 0.2s ease;
  }
  
  .stat-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  .tab-active {
    animation: pulse 0.3s ease-out;
  }
`;

const AmortissementChart = ({ actif, amortissements, type = 'line' }) => {
  const [activeTab, setActiveTab] = useState(type);
  
  // Calcul des données enrichies
  const chartData = useMemo(() => {
    if (!amortissements || amortissements.length === 0) return [];
    
    let cumul = 0;
    return amortissements.map((am, index) => {
      cumul += am.annuite;
      const valeurResiduelle = actif?.valeur_residuelle || 0;
      const tauxAmortissement = (am.annuite / actif?.cout_acquisition) * 100;
      
      return {
        annee: am.exercice,
        annuite: am.annuite,
        cumulAmortissements: cumul,
        valeurNette: am.valeur_nette,
        tauxAmortissement: parseFloat(tauxAmortissement.toFixed(2)),
        pourcentageAmorti: ((cumul / actif?.cout_acquisition) * 100).toFixed(1),
        annuiteProjetee: index < amortissements.length - 1 ? amortissements[index + 1]?.annuite : 0,
        ecartAmortissement: index > 0 ? am.annuite - amortissements[index - 1].annuite : 0
      };
    });
  }, [amortissements, actif]);

  // Statistiques globales
  const stats = useMemo(() => {
    if (!amortissements || amortissements.length === 0 || !actif) return null;
    
    const totalAmorti = amortissements.reduce((sum, am) => sum + am.annuite, 0);
    const valeurResiduelle = actif.valeur_residuelle || 0;
    const pourcentageAmorti = (totalAmorti / actif.cout_acquisition) * 100;
    const resteAmortir = actif.cout_acquisition - totalAmorti - valeurResiduelle;
    const dureeRestante = actif.duree_utile_ans - amortissements.length;
    
    return {
      totalAmorti,
      pourcentageAmorti: pourcentageAmorti.toFixed(1),
      resteAmortir: Math.max(0, resteAmortir),
      dureeRestante: Math.max(0, dureeRestante),
      annuiteMoyenne: totalAmorti / amortissements.length,
      maxAnnuite: Math.max(...amortissements.map(am => am.annuite)),
      minAnnuite: Math.min(...amortissements.map(am => am.annuite))
    };
  }, [amortissements, actif]);

  // Graphique d'évolution linéaire
  const renderLineChart = () => {
    const data = chartData;
    
    return (
      <div className="chart-fade-in">
        {/* Cartes statistiques */}
        <div className="row g-3 p-4 bg-light border-bottom">
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm stat-card-hover h-100">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">📉</span>
                <div>
                  <div className="small text-muted text-uppercase">Valeur nette actuelle</div>
                  <div className="h5 mb-0 fw-bold text-primary">{formatCurrency(data[data.length - 1]?.valeurNette || 0)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm stat-card-hover h-100">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">📊</span>
                <div>
                  <div className="small text-muted text-uppercase">Pourcentage amorti</div>
                  <div className="h5 mb-0 fw-bold text-warning">{stats?.pourcentageAmorti || 0}%</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm stat-card-hover h-100">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">⏰</span>
                <div>
                  <div className="small text-muted text-uppercase">Durée restante</div>
                  <div className="h5 mb-0 fw-bold text-info">{stats?.dureeRestante || 0} ans</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="card border-0 shadow-sm stat-card-hover h-100">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">💰</span>
                <div>
                  <div className="small text-muted text-uppercase">Annuité moyenne</div>
                  <div className="h5 mb-0 fw-bold text-success">{formatCurrency(stats?.annuiteMoyenne || 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Graphique */}
        <div className="p-4">
          <div className="d-flex align-items-center gap-2 pb-3 mb-3 border-bottom">
            <FiTrendingDown className="text-primary" />
            <span className="fw-semibold text-dark">Évolution de la valeur nette comptable</span>
            <span className="small text-muted ms-auto">Décroissance linéaire sur la durée d'utilité</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="annee" 
                label={{ value: 'Années', position: 'insideBottom', offset: -10 }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                yAxisId="left"
                tickFormatter={(value) => formatCurrency(value, true)}
                label={{ value: 'Montant (FC)', angle: -90, position: 'insideLeft' }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}%`}
                label={{ value: 'Pourcentage', angle: 90, position: 'insideRight' }}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              <Legend content={<CustomLegend />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="valeurNette"
                fill={COLORS.primary + '20'}
                stroke={COLORS.primary}
                name="Valeur nette"
                strokeWidth={2}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulAmortissements"
                stroke={COLORS.danger}
                name="Cumul amortissements"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pourcentageAmorti"
                stroke={COLORS.warning}
                name="% Amorti"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Insight box */}
        <div className="m-4 p-3 bg-info bg-opacity-10 rounded-3 border border-info">
          <div className="d-flex gap-3">
            <FiInfo className="text-info flex-shrink-0 mt-1" size={20} />
            <div>
              <strong className="text-info">📈 Analyse</strong>
              <p className="small text-info-emphasis mb-0 mt-1">
                La valeur nette de l'actif diminue linéairement sur sa durée de vie. 
                Actuellement, <strong>{stats?.pourcentageAmorti}%</strong> de l'actif est amorti, 
                il reste <strong>{formatCurrency(stats?.resteAmortir || 0, true)}</strong> à amortir 
                sur <strong>{stats?.dureeRestante} ans</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Graphique en barres
  const renderBarChart = () => {
    const data = chartData;
    
    return (
      <div className="chart-fade-in">
        <div className="row g-3 p-4 bg-light border-bottom">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm stat-card-hover">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">📈</span>
                <div>
                  <div className="small text-muted text-uppercase">Annuité max</div>
                  <div className="h5 mb-0 fw-bold text-danger">{formatCurrency(stats?.maxAnnuite || 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm stat-card-hover">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">📉</span>
                <div>
                  <div className="small text-muted text-uppercase">Annuité min</div>
                  <div className="h5 mb-0 fw-bold text-success">{formatCurrency(stats?.minAnnuite || 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm stat-card-hover">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <span className="display-6">⚖️</span>
                <div>
                  <div className="small text-muted text-uppercase">Annuité moyenne</div>
                  <div className="h5 mb-0 fw-bold text-primary">{formatCurrency(stats?.annuiteMoyenne || 0, true)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="d-flex align-items-center gap-2 pb-3 mb-3 border-bottom">
            <FiBarChart2 className="text-primary" />
            <span className="fw-semibold text-dark">Annuités d'amortissement par année</span>
            <span className="small text-muted ms-auto">Répartition des dotations aux amortissements</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="annee" label={{ value: 'Années', position: 'insideBottom', offset: -10 }} />
              <YAxis tickFormatter={(value) => formatCurrency(value, true)} label={{ value: 'Montant (FC)', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              <Legend />
              <Bar dataKey="annuite" fill={COLORS.secondary} name="Annuité" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.annuite === stats?.maxAnnuite ? COLORS.warning : COLORS.secondary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="m-4 p-3 bg-info bg-opacity-10 rounded-3 border border-info">
          <div className="d-flex gap-3">
            <FiInfo className="text-info flex-shrink-0 mt-1" size={20} />
            <div>
              <strong className="text-info">📊 Analyse des annuités</strong>
              <p className="small text-info-emphasis mb-0 mt-1">
                L'annuité moyenne est de <strong>{formatCurrency(stats?.annuiteMoyenne || 0, true)}</strong>.
                {stats?.maxAnnuite > stats?.annuiteMoyenne * 1.1 && 
                  ` Une année particulièrement élevée a été enregistrée en ${data.find(d => d.annuite === stats?.maxAnnuite)?.annee}.`}
                {actif?.mode_amortissement === 'degressif' && 
                  ` Le mode dégressif explique la décroissance des annuités dans le temps.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Graphique circulaire (CAMEMBERT CORRIGÉ)
  const renderPieChart = () => {
    if (!actif) return null;
    
    const totalAmorti = stats?.totalAmorti || 0;
    const valeurResiduelle = actif.valeur_residuelle || 0;
    const valeurNette = chartData[chartData.length - 1]?.valeurNette || 0;
    
    // Données correctes pour un camembert : décomposition de la valeur brute
    // Valeur brute = Amortissements cumulés + Valeur nette
    const pieData = [
      { name: 'Amortissements cumulés', value: totalAmorti, color: COLORS.danger },
      { name: 'Valeur nette restante', value: valeurNette, color: COLORS.warning }
    ].filter(item => item.value > 0);
    
    return (
      <div className="chart-fade-in">
        <div className="p-4">
          <div className="d-flex align-items-center gap-2 pb-3 mb-3 border-bottom">
            <FiPieChart className="text-primary" />
            <span className="fw-semibold text-dark">Composition de la valeur de l'actif</span>
            <span className="small text-muted ms-auto">Répartition entre amortissements et valeur nette</span>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="m-4 p-3 bg-info bg-opacity-10 rounded-3 border border-info">
          <div className="d-flex gap-3">
            <FiInfo className="text-info flex-shrink-0 mt-1" size={20} />
            <div>
              <strong className="text-info">🥧 Analyse de la composition</strong>
              <p className="small text-info-emphasis mb-0 mt-1">
                La valeur brute de <strong>{formatCurrency(actif.cout_acquisition)}</strong> est composée à 
                <strong> {stats?.pourcentageAmorti}% d'amortissements</strong> et 
                <strong> {((valeurNette / actif.cout_acquisition) * 100).toFixed(1)}% de valeur nette restante</strong>.
                {valeurResiduelle > 0 && ` La valeur résiduelle est de ${formatCurrency(valeurResiduelle)} (${((valeurResiduelle / actif.cout_acquisition) * 100).toFixed(1)}%).`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!amortissements || amortissements.length === 0) {
    return (
      <div className="text-center py-5 bg-light rounded-3">
        <div className="text-muted">
          <div className="display-4 mb-3">📊</div>
          <p className="mb-1">Aucune donnée d'amortissement disponible</p>
          <p className="small text-secondary mb-0">Les amortissements seront calculés automatiquement après la création de l'actif</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <div className="card shadow-sm border-0 rounded-3 overflow-hidden">
        {/* En-tête avec onglets */}
        <div className="p-4 pb-0 border-bottom">
          <h3 className="h5 fw-semibold text-primary mb-3">📊 Analyse des amortissements</h3>
          <div className="d-flex gap-2 border-bottom mb-0">
            <button
              onClick={() => setActiveTab('line')}
              className={`btn btn-sm d-flex align-items-center gap-2 rounded-0 border-0 ${activeTab === 'line' ? 'btn-primary' : 'btn-link text-secondary'}`}
              style={{ 
                padding: '0.75rem 1.25rem',
                borderBottom: activeTab === 'line' ? '2px solid #2563eb' : 'none',
                marginBottom: '-1px'
              }}
            >
              <FiTrendingDown size={14} /> Évolution
            </button>
            <button
              onClick={() => setActiveTab('bar')}
              className={`btn btn-sm d-flex align-items-center gap-2 rounded-0 border-0 ${activeTab === 'bar' ? 'btn-primary' : 'btn-link text-secondary'}`}
              style={{ 
                padding: '0.75rem 1.25rem',
                borderBottom: activeTab === 'bar' ? '2px solid #2563eb' : 'none',
                marginBottom: '-1px'
              }}
            >
              <FiBarChart2 size={14} /> Annuités
            </button>
            <button
              onClick={() => setActiveTab('pie')}
              className={`btn btn-sm d-flex align-items-center gap-2 rounded-0 border-0 ${activeTab === 'pie' ? 'btn-primary' : 'btn-link text-secondary'}`}
              style={{ 
                padding: '0.75rem 1.25rem',
                borderBottom: activeTab === 'pie' ? '2px solid #2563eb' : 'none',
                marginBottom: '-1px'
              }}
            >
              <FiPieChart size={14} /> Composition
            </button>
          </div>
        </div>

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'line' && renderLineChart()}
        {activeTab === 'bar' && renderBarChart()}
        {activeTab === 'pie' && renderPieChart()}
      </div>
    </>
  );
};

export default AmortissementChart;