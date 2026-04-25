// frontend/src/components/Common/ResponsiveTable.jsx
import React, { useState } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';

export const ResponsiveTable = ({ 
  columns, 
  data, 
  mobileCardRenderer,
  onRowClick,
  sortable = false,
  searchable = false,
  pagination = false,
  itemsPerPage = 10,
  emptyMessage = "Aucune donnée disponible",
  className = ""
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fonction de tri
  const handleSort = (key) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Fonction de filtrage
  const filteredData = searchable && searchTerm
    ? data.filter(item => {
        return columns.some(col => {
          const value = item[col.dataIndex];
          if (value && typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm.toLowerCase());
          }
          if (value && typeof value === 'number') {
            return value.toString().includes(searchTerm);
          }
          return false;
        });
      })
    : data;

  // Fonction de tri des données
  const sortedData = sortConfig.key
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredData;

  // Pagination
  const paginatedData = pagination
    ? sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedData;
  
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Styles d'animation
  const animationStyles = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .responsive-table-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
    
    .responsive-table-hover {
      transition: all 0.2s ease-in-out;
    }
    
    .responsive-table-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `;

  // Rendu pour mobile (cartes)
  if (isMobile) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className={`container-fluid px-0 ${className}`}>
          {/* Barre de recherche mobile */}
          {searchable && (
            <div className="mb-3">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} className="text-secondary" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cartes mobiles */}
          <div className="row g-3">
            {paginatedData.length === 0 ? (
              <div className="col-12">
                <div className="text-center py-5 bg-light rounded-3">
                  <p className="text-muted mb-0">{emptyMessage}</p>
                </div>
              </div>
            ) : (
              paginatedData.map((item, index) => (
                <div key={index} className="col-12">
                  <div 
                    className={`card shadow-sm border-0 rounded-3 overflow-hidden responsive-table-fade-in responsive-table-hover ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick && onRowClick(item)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {mobileCardRenderer ? (
                      mobileCardRenderer(item)
                    ) : (
                      <div className="card-body p-3">
                        {columns.map((col, colIndex) => (
                          <div key={col.key} className="d-flex justify-content-between align-items-start mb-2 pb-1 border-bottom">
                            <span className="fw-semibold text-secondary small">{col.title}:</span>
                            <span className="text-dark text-end">
                              {col.render 
                                ? col.render(item[col.dataIndex], item)
                                : item[col.dataIndex] || <span className="text-muted fst-italic">—</span>
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination mobile */}
          {pagination && totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-2 mt-4">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </button>
              <span className="text-muted small">
                Page {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // Vue tableau pour tablette et desktop
  const isSmallScreen = isTablet;
  
  return (
    <>
      <style>{animationStyles}</style>
      <div className={`responsive-table-wrapper ${className}`}>
        {/* Barre d'outils */}
        {(searchable || sortable) && (
          <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
            {searchable && (
              <div className="flex-grow-1" style={{ maxWidth: isSmallScreen ? '100%' : '300px' }}>
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <Search size={16} className="text-secondary" />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  {searchTerm && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {sortable && sortConfig.key && (
              <div className="text-muted small">
                Tri par {columns.find(c => c.key === sortConfig.key)?.title} ({sortConfig.direction === 'asc' ? '↑' : '↓'})
              </div>
            )}
          </div>
        )}

        {/* Tableau responsive */}
        <div className="table-responsive rounded-3 border shadow-sm">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                {columns.map(col => (
                  <th 
                    key={col.key}
                    onClick={() => sortable && handleSort(col.dataIndex)}
                    style={{ 
                      cursor: sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap'
                    }}
                    className={sortable ? 'position-relative' : ''}
                  >
                    <div className="d-flex align-items-center gap-1">
                      {col.title}
                      {sortable && sortConfig.key === col.dataIndex && (
                        <span className="text-primary">
                          {sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-5">
                    <div className="text-muted">
                      <p className="mb-0">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr 
                    key={index}
                    onClick={() => onRowClick && onRowClick(item)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    className="responsive-table-hover"
                  >
                    {columns.map(col => (
                      <td key={col.key} className={col.className}>
                        {col.render 
                          ? col.render(item[col.dataIndex], item, index)
                          : item[col.dataIndex] !== undefined && item[col.dataIndex] !== null
                            ? item[col.dataIndex]
                            : <span className="text-muted fst-italic">—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination desktop */}
        {pagination && totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
            <div className="text-muted small">
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, sortedData.length)} sur {sortedData.length} résultats
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                «
              </button>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </button>
              <span className="px-3 py-1 bg-light rounded text-muted small align-self-center">
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </button>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                »
              </button>
            </div>
            <div className="d-flex align-items-center gap-2">
              <small className="text-muted">Lignes par page:</small>
              <select 
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={itemsPerPage}
                onChange={(e) => {
                  setCurrentPage(1);
                  // Note: itemsPerPage devrait être géré par le parent
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Version alternative avec élargissement des colonnes configurables
export const ResponsiveTableWithExpandable = ({ 
  columns, 
  data, 
  expandableRenderer,
  ...props 
}) => {
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRow = (index) => {
    if (expandedRows.includes(index)) {
      setExpandedRows(expandedRows.filter(i => i !== index));
    } else {
      setExpandedRows([...expandedRows, index]);
    }
  };

  const enhancedColumns = [
    ...columns,
    {
      key: 'expand',
      title: '',
      dataIndex: 'expand',
      render: (_, __, index) => (
        <button
          className="btn btn-sm btn-link text-secondary p-0"
          onClick={() => toggleRow(index)}
        >
          {expandedRows.includes(index) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )
    }
  ];

  const EnhancedMobileCardRenderer = (item, index) => {
    const isExpanded = expandedRows.includes(index);
    return (
      <div>
        {props.mobileCardRenderer ? props.mobileCardRenderer(item) : (
          <div className="card-body p-3">
            {columns.map(col => (
              <div key={col.key} className="d-flex justify-content-between align-items-start mb-2 pb-1 border-bottom">
                <span className="fw-semibold text-secondary small">{col.title}:</span>
                <span className="text-dark">
                  {col.render ? col.render(item[col.dataIndex], item) : item[col.dataIndex]}
                </span>
              </div>
            ))}
            <button
              className="btn btn-sm btn-outline-secondary w-100 mt-2"
              onClick={() => toggleRow(index)}
            >
              {isExpanded ? 'Masquer détails' : 'Voir détails'}
            </button>
          </div>
        )}
        {isExpanded && expandableRenderer && (
          <div className="card-footer bg-light p-3 border-top">
            {expandableRenderer(item)}
          </div>
        )}
      </div>
    );
  };

  return (
    <ResponsiveTable
      {...props}
      columns={enhancedColumns}
      data={data}
      mobileCardRenderer={(item, index) => EnhancedMobileCardRenderer(item, index)}
    />
  );
};

// Styles CSS supplémentaires (optionnels, pour les cas non couverts par Bootstrap)
const additionalStyles = `
  .cursor-pointer {
    cursor: pointer;
  }
  
  .responsive-table-wrapper {
    width: 100%;
  }
  
  /* Amélioration du scroll sur mobile */
  @media (max-width: 768px) {
    .table-responsive {
      -webkit-overflow-scrolling: touch;
    }
  }
  
  /* Animation de transition pour les rangées */
  .table tbody tr {
    transition: background-color 0.2s ease;
  }
  
  .table tbody tr:hover {
    background-color: rgba(13, 110, 253, 0.05);
  }
`;

// Injection des styles supplémentaires (optionnel)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = additionalStyles;
  document.head.appendChild(styleSheet);
}

export default ResponsiveTable;