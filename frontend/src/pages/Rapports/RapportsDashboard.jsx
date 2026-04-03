// src/pages/Rapports/RapportsDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPieChart, FiTrendingUp, FiDollarSign, 
  FiAlertCircle, FiClock 
} from 'react-icons/fi';

const RapportsDashboard = () => {
  const navigate = useNavigate();

  const styles = {
    container: {
      padding: '2rem',
    },
    title: {
      fontSize: '1.8rem',
      marginBottom: '2rem',
      color: '#1e3a8a',
    },
    cards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
    },
    card: {
      backgroundColor: 'var(--bg-card)',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      textAlign: 'center',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
    },
    iconWrapper: {
      marginBottom: '1rem',
    },
    cardTitle: {
      fontSize: '1.2rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: 'var(--text-primary)',
    },
    cardDescription: {
      fontSize: '0.9rem',
      color: 'var(--text-secondary)',
      lineHeight: '1.5',
    },
    sectionTitle: {
      fontSize: '1.2rem',
      fontWeight: '600',
      color: 'var(--text-primary)',
      marginBottom: '1rem',
      marginTop: '2rem',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tableau de bord des rapports</h1>
      
      {/* Section principale des rapports */}
      <h2 style={styles.sectionTitle}>Rapports disponibles</h2>
      <div style={styles.cards}>
        {/* Carte État des immobilisations */}
        <div style={styles.card} onClick={() => navigate('/rapports/etat-immobilisations')}>
          <div style={styles.iconWrapper}>
            <FiPieChart size={48} color="#2563eb" />
          </div>
          <h3 style={styles.cardTitle}>État des immobilisations</h3>
          <p style={styles.cardDescription}>
            Répartition par catégorie, localisation ou service. Valeurs brutes et nettes.
          </p>
        </div>

        {/* Carte Plan d'amortissement */}
        <div style={styles.card} onClick={() => navigate('/rapports/plan-amortissement')}>
          <div style={styles.iconWrapper}>
            <FiTrendingUp size={48} color="#10b981" />
          </div>
          <h3 style={styles.cardTitle}>Plan d'amortissement</h3>
          <p style={styles.cardDescription}>
            Comparaison prévisionnel vs réalisé. Détail par exercice.
          </p>
        </div>

        {/* Carte Suivi des investissements */}
        <div style={styles.card} onClick={() => navigate('/rapports/investissements')}>
          <div style={styles.iconWrapper}>
            <FiDollarSign size={48} color="#f59e0b" />
          </div>
          <h3 style={styles.cardTitle}>Suivi des investissements</h3>
          <p style={styles.cardDescription}>
            Budget vs réalisé par année. Évolution des investissements.
          </p>
        </div>

        {/* Carte Alertes */}
        <div style={styles.card} onClick={() => navigate('/rapports/alertes')}>
          <div style={styles.iconWrapper}>
            <FiClock size={48} color="#ef4444" />
          </div>
          <h3 style={styles.cardTitle}>Alertes</h3>
          <p style={styles.cardDescription}>
            Fin de licence, échéances maintenance, biens manquants.
          </p>
        </div>

        {/* Carte Rapport d'anomalies */}
        <div style={styles.card} onClick={() => navigate('/rapports/anomalies')}>
          <div style={styles.iconWrapper}>
            <FiAlertCircle size={48} color="#8b5cf6" />
          </div>
          <h3 style={styles.cardTitle}>Rapport d'anomalies</h3>
          <p style={styles.cardDescription}>
            Suivi des anomalies signalées, en cours et résolues.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RapportsDashboard;