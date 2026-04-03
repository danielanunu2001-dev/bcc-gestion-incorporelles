import React from 'react';
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
  Cell
} from 'recharts';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6'];

const AmortissementChart = ({ actif, amortissements, type = 'line' }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Graphique en lignes (évolution)
  if (type === 'line') {
    const data = amortissements.map(am => ({
      annee: am.exercice,
      annuite: am.annuite,
      cumul: am.cumul_amortissements,
      valeurNette: am.valeur_nette
    }));

    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Évolution de la valeur nette</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="annee" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="valeurNette" 
              stroke="#2563eb" 
              name="Valeur nette"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="cumul" 
              stroke="#dc2626" 
              name="Cumul amortissements"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Graphique en barres (annuités par année)
  if (type === 'bar') {
    const data = amortissements.map(am => ({
      annee: am.exercice,
      annuite: am.annuite
    }));

    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Annuités d'amortissement par année</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="annee" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="annuite" fill="#16a34a" name="Annuité" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Graphique circulaire (répartition par type)
  if (type === 'pie') {
    // Grouper par type
    const data = [
      { name: 'Logiciels', value: actif?.type === 'logiciel' ? actif.cout_acquisition : 0 },
      { name: 'Brevets', value: actif?.type === 'brevet' ? actif.cout_acquisition : 0 },
      { name: 'Licences', value: actif?.type === 'licence' ? actif.cout_acquisition : 0 },
      { name: 'Fonds commercial', value: actif?.type === 'fonds_commercial' ? actif.cout_acquisition : 0 },
      { name: 'Autres', value: actif?.type === 'autres' ? actif.cout_acquisition : 0 }
    ].filter(item => item.value > 0);

    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Répartition par type d'actif</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

const styles = {
  container: {
    backgroundColor: 'var(--bg-card)',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: '1rem'
  }
};

export default AmortissementChart;