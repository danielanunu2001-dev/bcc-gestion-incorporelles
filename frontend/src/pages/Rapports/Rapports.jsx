import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPieChart, FiTrendingUp, FiDollarSign, FiAlertCircle, FiTrendingDown } from 'react-icons/fi';

const Rapports = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'etat-immobilisations',
      titre: 'État des immobilisations',
      description: 'Par catégorie, localisation ou service',
      icon: <FiPieChart size={24} />,
      couleur: '#2563eb',
      path: '/rapports/etat-immobilisations'
    },
    {
      id: 'plan-amortissement',
      titre: 'Plan d\'amortissement',
      description: 'Prévisionnel et réalisé',
      icon: <FiTrendingUp size={24} />,
      couleur: '#16a34a',
      path: '/rapports/plan-amortissement'
    },
    {
      id: 'investissements',
      titre: 'Suivi des investissements',
      description: 'Budget vs réalisé',
      icon: <FiDollarSign size={24} />,
      couleur: '#f59e0b',
      path: '/rapports/investissements'
    },
    {
      id: 'alertes',
      titre: 'Alertes',
      description: 'Fin de licence, maintenance, anomalies',
      icon: <FiAlertCircle size={24} />,
      couleur: '#dc2626',
      path: '/rapports/alertes'
    },
    {
      id: 'rapport-amortissements',
      titre: 'Rapport des amortissements',
      description: 'Analyse détaillée des amortissements par actif',
      icon: <FiTrendingDown size={24} />,
      couleur: '#8b5cf6',
      path: '/rapports/rapport-amortissements'
    }
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Rapports et tableaux de bord</h1>
      <div style={styles.grid}>
        {sections.map(section => (
          <div
            key={section.id}
            style={styles.card}
            onClick={() => navigate(section.path)}
          >
            <div style={{ ...styles.cardIcon, backgroundColor: `${section.couleur}10`, color: section.couleur }}>
              {section.icon}
            </div>
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{section.titre}</h3>
              <p style={styles.cardDescription}>{section.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    fontSize: '1.75rem',
    color: 'var(--text-primary)',
    marginBottom: '2rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid #e5e7eb'
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 0.25rem 0'
  },
  cardDescription: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    margin: 0
  }
};

export default Rapports;