import React from 'react';

export const formatAuditData = (data, type = 'new') => {
  if (!data || Object.keys(data).length === 0) return null;

  const isOld = type === 'old';
  const backgroundColor = isOld ? '#fee2e2' : '#dcfce7';
  const textColor = isOld ? '#b91c1c' : '#166534';
  const borderColor = isOld ? '#fecaca' : '#bbf7d0';

  const formatKey = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Objet complexe]';
      }
    }
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    return String(value);
  };

  // Création du conteneur principal
  const container = React.createElement(
    'div',
    {
      style: {
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '0.75rem',
        marginTop: '0.5rem'
      }
    },
    // En-tête
    React.createElement(
      'div',
      {
        style: {
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: textColor,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }
      },
      isOld ? '📄 Anciennes valeurs' : '✨ Nouvelles valeurs'
    ),
    // Tableau
    React.createElement(
      'table',
      {
        style: {
          width: '100%',
          fontSize: '0.75rem',
          borderCollapse: 'collapse',
          backgroundColor: 'transparent'
        }
      },
      React.createElement(
        'tbody',
        null,
        Object.entries(data).map(([key, value]) =>
          React.createElement(
            'tr',
            { key: key, style: { borderBottom: '1px solid #e5e7eb' } },
            React.createElement(
              'td',
              {
                style: {
                  padding: '0.5rem',
                  fontWeight: '600',
                  width: '35%',
                  color: '#374151',
                  verticalAlign: 'top'
                }
              },
              formatKey(key)
            ),
            React.createElement(
              'td',
              {
                style: {
                  padding: '0.5rem',
                  color: textColor,
                  wordBreak: 'break-word',
                  verticalAlign: 'top'
                }
              },
              formatValue(value)
            )
          )
        )
      )
    )
  );

  return container;
};