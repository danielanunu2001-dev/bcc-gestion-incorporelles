// src/pages/Rapports/RapportImmobilisations.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { FiPieChart } from 'react-icons/fi';

const RapportImmobilisations = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/rapports/etat-immobilisations');
      setData(res.data);
    } catch (error) {
      console.error('Erreur chargement rapport immobilisations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Rapport des immobilisations</h1>
      <div style={styles.content}>
        <FiPieChart size={48} color="#2563eb" />
        <p>Contenu du rapport à venir...</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: '2rem',
    color: '#1e3a8a',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
};

export default RapportImmobilisations;