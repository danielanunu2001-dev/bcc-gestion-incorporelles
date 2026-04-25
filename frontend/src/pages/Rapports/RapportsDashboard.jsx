// src/pages/Rapports/RapportsDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import { 
  FiPieChart, FiTrendingUp, FiDollarSign, 
  FiAlertCircle, FiClock 
} from 'react-icons/fi';

const RapportsDashboard = () => {
  const navigate = useNavigate();
  const { isAuditeur, can } = usePermissions();

  // ✅ Définition des rapports avec leurs rôles autorisés
  const rapports = [
    {
      id: 'etat-immobilisations',
      title: 'État des immobilisations',
      description: 'Répartition par catégorie, localisation ou service. Valeurs brutes et nettes.',
      icon: <FiPieChart size={48} color="#2563eb" />,
      path: '/rapports/etat-immobilisations',
      roles: ['admin', 'comptable', 'auditeur', 'juridique', 'inventoriste', 'gestionnaire']
    },
    {
      id: 'plan-amortissement',
      title: 'Plan d\'amortissement',
      description: 'Comparaison prévisionnel vs réalisé. Détail par exercice.',
      icon: <FiTrendingUp size={48} color="#10b981" />,
      path: '/rapports/plan-amortissement',
      roles: ['admin', 'comptable', 'gestionnaire']  // ✅ AJOUT DE gestionnaire
    },
    {
      id: 'suivi-investissements',
      title: 'Suivi des investissements',
      description: 'Budget vs réalisé par année. Évolution des investissements.',
      icon: <FiDollarSign size={48} color="#f59e0b" />,
      path: '/rapports/investissements',
      roles: ['admin', 'comptable', 'gestionnaire']  // ✅ AJOUT DE gestionnaire
    },
    {
      id: 'alertes',
      title: 'Alertes',
      description: 'Fin de licence, échéances maintenance, biens manquants.',
      icon: <FiClock size={48} color="#ef4444" />,
      path: '/rapports/alertes',
      roles: ['admin', 'comptable', 'auditeur', 'gestionnaire']  // ✅ AJOUT DE gestionnaire
    },
    {
      id: 'anomalies',
      title: 'Rapport d\'anomalies',
      description: 'Suivi des anomalies signalées, en cours et résolues.',
      icon: <FiAlertCircle size={48} color="#8b5cf6" />,
      path: '/rapports/anomalies',
      roles: ['admin', 'comptable', 'auditeur', 'gestionnaire']  // ✅ AJOUT DE gestionnaire
    }
  ];

  // ✅ Filtrer les rapports selon le rôle de l'utilisateur
  const rapportsAccessibles = rapports.filter(rapport => can(rapport.roles));

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
    emptyState: {
      textAlign: 'center',
      padding: '3rem',
      backgroundColor: 'var(--bg-card)',
      borderRadius: '8px',
      color: 'var(--text-secondary)',
    },
  };

  // ✅ Gérer le survol avec JavaScript (car inline styles ne supportent pas :hover)
  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tableau de bord des rapports</h1>
      
      {/* Section principale des rapports */}
      <h2 style={styles.sectionTitle}>Rapports disponibles</h2>
      
      {rapportsAccessibles.length === 0 ? (
        <div style={styles.emptyState}>
          <FiAlertCircle size={48} color="#94a3b8" />
          <p style={{ marginTop: '1rem' }}>Aucun rapport disponible pour votre rôle.</p>
        </div>
      ) : (
        <div style={styles.cards}>
          {rapportsAccessibles.map((rapport) => (
            <div 
              key={rapport.id}
              style={styles.card}
              onClick={() => navigate(rapport.path)}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div style={styles.iconWrapper}>
                {rapport.icon}
              </div>
              <h3 style={styles.cardTitle}>{rapport.title}</h3>
              <p style={styles.cardDescription}>{rapport.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RapportsDashboard;