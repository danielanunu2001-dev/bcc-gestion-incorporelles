import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  FiBell, FiShield, FiBook, FiCalendar, FiArchive,
  FiEye, FiDownload, FiMail
} from 'react-icons/fi';

const Parametres = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Notifications',
      description: 'Gérer les préférences de notification',
      icon: <FiBell size={32} color="#2563eb" />,
      path: 'notifications',
    },
    {
      title: 'Sécurité',
      description: 'Paramètres de sécurité et authentification',
      icon: <FiShield size={32} color="#10b981" />,
      path: 'securite',
    },
    {
      title: 'Plan comptable GCEC',
      description: 'Configuration du plan comptable',
      icon: <FiBook size={32} color="#f59e0b" />,
      path: 'plan-comptable',
    },
    {
      title: 'Exercices comptables',
      description: 'Gestion des exercices fiscaux',
      icon: <FiCalendar size={32} color="#ef4444" />,
      path: 'exercices-comptables',
    },
    {
      title: 'Archive légale',
      description: 'Archivage des documents légaux',
      icon: <FiArchive size={32} color="#8b5cf6" />,
      path: 'archive-legale',
    },
    {
      title: 'Piste d\'audit',
      description: 'Configuration de la piste d\'audit',
      icon: <FiEye size={32} color="#ec4899" />,
      path: 'piste-audit',
    },
    {
      title: 'Export de données',
      description: 'Paramètres d\'export des données',
      icon: <FiDownload size={32} color="#14b8a6" />,
      path: 'export-donnees',
    },
    {
      title: 'Notification mail',
      description: 'Configuration des emails',
      icon: <FiMail size={32} color="#f97316" />,
      path: 'notification-mail',
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Paramètres</h1>
      </div>
      <div style={styles.grid}>
        {sections.map((item, index) => (
          <div
            key={index}
            style={styles.card}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <h3 style={styles.cardTitle}>{item.title}</h3>
            <p style={styles.cardDescription}>{item.description}</p>
          </div>
        ))}
      </div>
      {/* ✅ TRÈS IMPORTANT : C'est ici que les sous-routes s'affichent */}
      <Outlet />
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, boxShadow 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '1rem 0 0.5rem',
    color: '#111',
  },
  cardDescription: {
    fontSize: '0.9rem',
    color: '#666',
    margin: 0,
  },
};

export default Parametres;