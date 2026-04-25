import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEye, FiEdit, FiTrash2, FiFileText,
  FiCalendar, FiDollarSign, FiUser, FiSearch,
  FiFilter, FiX, FiDownload, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiClock,
  FiArchive, FiPrinter, FiInfo, FiCheckCircle,
  FiAlertCircle, FiTrendingUp, FiTrendingDown
} from 'react-icons/fi';

const ContratsListPro = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  
  // États pour les données
  const [contrats, setContrats] = useState([]);
  const [filteredContrats, setFilteredContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // ✅ États pour le modal PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    statut: 'tous',
    fournisseur: '',
    dateDebut: '',
    dateFin: '',
    montantMin: '',
    montantMax: '',
    dateCreationDebut: '',
    dateCreationFin: ''
  });
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // États pour les statistiques
  const [stats, setStats] = useState({
    total: 0,
    actifs: 0,
    expirés: 0,
    bientotExpires: 0,
    montantTotal: 0,
    montantActifs: 0,
    contratsMois: 0
  });

  // États pour l'affichage des filtres
  const [showFilters, setShowFilters] = useState(false);
  const [fournisseurs, setFournisseurs] = useState([]);

  useEffect(() => {
    chargerContrats();
  }, []);

  useEffect(() => {
    appliquerFiltres();
  }, [contrats, filters]);

  const chargerContrats = async () => {
    try {
      setLoading(true);
      console.log('📦 Chargement de tous les contrats...');
      
      const res = await api.get('/contrats');
      
      if (res.data && Array.isArray(res.data)) {
        setContrats(res.data);
        
        // Extraire la liste des fournisseurs uniques
        const fournisseursList = [...new Set(res.data.map(c => c.fournisseur).filter(Boolean))];
        setFournisseurs(fournisseursList);
        
        // Calculer les statistiques
        calculerStats(res.data);
      } else {
        setContrats([]);
      }
      
    } catch (err) {
      console.error('❌ Erreur chargement contrats:', err);
      setError('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const calculerStats = (data) => {
    const maintenant = new Date();
    const dans30Jours = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const actifs = data.filter(c => new Date(c.date_fin) > maintenant);
    const expirés = data.filter(c => new Date(c.date_fin) <= maintenant);
    const bientotExpires = data.filter(c => {
      const dateFin = new Date(c.date_fin);
      return dateFin > maintenant && dateFin <= dans30Jours;
    });
    const montantTotal = data.reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
    const montantActifs = actifs.reduce((sum, c) => sum + (parseFloat(c.montant) || 0), 0);
    
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const contratsMois = data.filter(c => new Date(c.created_at) >= debutMois).length;
    
    setStats({
      total: data.length,
      actifs: actifs.length,
      expirés: expirés.length,
      bientotExpires: bientotExpires.length,
      montantTotal,
      montantActifs,
      contratsMois
    });
  };

  // ✅ Fonction d'export PDF
  const handleExportPDF = async () => {
    setLoadingPdf(true);
    try {
      const response = await api.get('/contrats/export/pdf', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPdfUrl(url);
      setShowPdfModal(true);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const appliquerFiltres = () => {
    let resultats = [...contrats];

    // Filtre par recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      resultats = resultats.filter(c => 
        c.numero_contrat?.toLowerCase().includes(searchLower) ||
        c.fournisseur?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par statut
    if (filters.statut !== 'tous') {
      const maintenant = new Date();
      const dans30Jours = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (filters.statut === 'actif') {
        resultats = resultats.filter(c => new Date(c.date_fin) > maintenant);
      } else if (filters.statut === 'expire') {
        resultats = resultats.filter(c => new Date(c.date_fin) <= maintenant);
      } else if (filters.statut === 'bientot') {
        resultats = resultats.filter(c => {
          const dateFin = new Date(c.date_fin);
          return dateFin > maintenant && dateFin <= dans30Jours;
        });
      }
    }

    // Filtre par fournisseur
    if (filters.fournisseur) {
      resultats = resultats.filter(c => c.fournisseur === filters.fournisseur);
    }

    // Filtre par dates du contrat
    if (filters.dateDebut) {
      resultats = resultats.filter(c => new Date(c.date_debut) >= new Date(filters.dateDebut));
    }
    if (filters.dateFin) {
      resultats = resultats.filter(c => new Date(c.date_fin) <= new Date(filters.dateFin));
    }

    // Filtre par dates de création
    if (filters.dateCreationDebut) {
      resultats = resultats.filter(c => new Date(c.created_at) >= new Date(filters.dateCreationDebut));
    }
    if (filters.dateCreationFin) {
      resultats = resultats.filter(c => new Date(c.created_at) <= new Date(filters.dateCreationFin));
    }

    // Filtre par montant
    if (filters.montantMin) {
      resultats = resultats.filter(c => parseFloat(c.montant) >= parseFloat(filters.montantMin));
    }
    if (filters.montantMax) {
      resultats = resultats.filter(c => parseFloat(c.montant) <= parseFloat(filters.montantMax));
    }

    setFilteredContrats(resultats);
    setTotalPages(Math.ceil(resultats.length / itemsPerPage));
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      statut: 'tous',
      fournisseur: '',
      dateDebut: '',
      dateFin: '',
      montantMin: '',
      montantMax: '',
      dateCreationDebut: '',
      dateCreationFin: ''
    });
  };

  const handleDelete = async (contratId) => {
    // ✅ Le gestionnaire ne peut pas supprimer
    if (!can(['admin', 'juridique'])) {
      alert('Vous n\'avez pas les droits pour supprimer un contrat');
      return;
    }
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) {
      try {
        await api.delete(`/contrats/${contratId}`);
        chargerContrats();
      } catch (err) {
        console.error('❌ Erreur suppression:', err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Numéro', 'Fournisseur', 'Date début', 'Date fin', 
      'Montant', 'Statut', 'Date création', 'Description'
    ];
    
    const data = filteredContrats.map(c => [
      c.numero_contrat,
      c.fournisseur,
      formatDate(c.date_debut),
      formatDate(c.date_fin),
      formatCurrency(c.montant),
      getStatutInfo(c.date_fin).label,
      formatDateTime(c.created_at),
      c.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contrats_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return 'Date invalide';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR') + ' ' + 
             date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Date invalide';
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', {
        style: 'currency',
        currency: 'CDF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${value.toLocaleString()} FC`;
    }
  };

  const getStatutInfo = (dateFin) => {
    if (!dateFin) return { label: 'Non défini', color: 'var(--text-secondary)', bg: '#f3f4f6', icon: FiInfo };
    
    const aujourdhui = new Date();
    const fin = new Date(dateFin);
    
    if (fin < aujourdhui) {
      return { label: 'Expiré', color: '#ef4444', bg: '#fee2e2', icon: FiAlertCircle };
    }
    
    const joursRestants = Math.ceil((fin - aujourdhui) / (1000 * 60 * 60 * 24));
    if (joursRestants < 30) {
      return { label: 'Expire bientôt', color: '#f59e0b', bg: '#fed7aa', icon: FiTrendingDown };
    }
    
    return { label: 'Actif', color: '#10b981', bg: '#dcfce7', icon: FiCheckCircle };
  };

  const paginatedContrats = filteredContrats.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading && contrats.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des contrats...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* En-tête avec statistiques */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des contrats</h1>
          <p style={styles.subtitle}>Suivi et gestion de tous les contrats</p>
        </div>
        {/* ✅ Le gestionnaire ne peut PAS créer de contrat */}
        {can(['admin', 'juridique']) && (
          <button
            onClick={() => navigate('/contrats/nouveau')}
            style={styles.addButton}
          >
            <FiPlus /> Nouveau contrat
          </button>
        )}
      </div>

      {/* Cartes de statistiques */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FiFileText size={24} color="#1e3a8a" />
          <div>
            <span style={styles.statValue}>{stats.total}</span>
            <span style={styles.statLabel}>Total contrats</span>
          </div>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
          <FiCheckCircle size={24} color="#10b981" />
          <div>
            <span style={{ ...styles.statValue, color: '#10b981' }}>{stats.actifs}</span>
            <span style={styles.statLabel}>Contrats actifs</span>
          </div>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
          <FiTrendingDown size={24} color="#f59e0b" />
          <div>
            <span style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.bientotExpires}</span>
            <span style={styles.statLabel}>Expire bientôt</span>
          </div>
        </div>
        <div style={{ ...styles.statCard, backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
          <FiAlertCircle size={24} color="#ef4444" />
          <div>
            <span style={{ ...styles.statValue, color: '#ef4444' }}>{stats.expirés}</span>
            <span style={styles.statLabel}>Contrats expirés</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiCalendar size={24} color="#f59e0b" />
          <div>
            <span style={styles.statValue}>{stats.contratsMois}</span>
            <span style={styles.statLabel}>Créés ce mois</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <FiDollarSign size={24} color="#10b981" />
          <div>
            <span style={styles.statValue}>{formatCurrency(stats.montantTotal)}</span>
            <span style={styles.statLabel}>Montant total</span>
          </div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div style={styles.actionsBar}>
        <div style={styles.searchBox}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Rechercher par numéro, fournisseur..."
            style={styles.searchInput}
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              style={styles.clearButton}
            >
              <FiX />
            </button>
          )}
        </div>

        <div style={styles.actionButtons}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              ...styles.filterButton,
              backgroundColor: showFilters ? '#2563eb' : '#f3f4f6',
              color: showFilters ? 'var(--bg-card)' : 'var(--text-primary)'
            }}
          >
            <FiFilter /> Filtres
          </button>
          <button onClick={resetFilters} style={styles.resetButton}>
            <FiRefreshCw /> Réinitialiser
          </button>
          <button onClick={exportToCSV} style={styles.exportButton}>
            <FiDownload /> CSV
          </button>
          <button onClick={handleExportPDF} style={styles.pdfButton} disabled={loadingPdf}>
            <FiPrinter /> {loadingPdf ? 'Génération...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Panneau de filtres */}
      {showFilters && (
        <div style={styles.filtersPanel}>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Statut</label>
              <select
                name="statut"
                value={filters.statut}
                onChange={handleFilterChange}
                style={styles.filterSelect}
              >
                <option value="tous">Tous</option>
                <option value="actif">Actifs</option>
                <option value="expire">Expirés</option>
                <option value="bientot">Expire bientôt (30j)</option>
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Fournisseur</label>
              <select
                name="fournisseur"
                value={filters.fournisseur}
                onChange={handleFilterChange}
                style={styles.filterSelect}
              >
                <option value="">Tous</option>
                {fournisseurs.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date début après</label>
              <input
                type="date"
                name="dateDebut"
                value={filters.dateDebut}
                onChange={handleFilterChange}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Date fin avant</label>
              <input
                type="date"
                name="dateFin"
                value={filters.dateFin}
                onChange={handleFilterChange}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Créé après</label>
              <input
                type="date"
                name="dateCreationDebut"
                value={filters.dateCreationDebut}
                onChange={handleFilterChange}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Créé avant</label>
              <input
                type="date"
                name="dateCreationFin"
                value={filters.dateCreationFin}
                onChange={handleFilterChange}
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Montant min (FC)</label>
              <input
                type="number"
                name="montantMin"
                value={filters.montantMin}
                onChange={handleFilterChange}
                placeholder="0"
                style={styles.filterInput}
              />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Montant max (FC)</label>
              <input
                type="number"
                name="montantMax"
                value={filters.montantMax}
                onChange={handleFilterChange}
                placeholder="1 000 000"
                style={styles.filterInput}
              />
            </div>
          </div>
        </div>
      )}

      {/* Résultats */}
      <div style={styles.resultsInfo}>
        <p>
          <FiInfo size={14} style={{ marginRight: '0.5rem' }} />
          {filteredContrats.length} contrat(s) trouvé(s)
          {filters.search && ` pour "${filters.search}"`}
          {filters.statut !== 'tous' && ` (${filters.statut === 'actif' ? 'actifs' : filters.statut === 'expire' ? 'expirés' : 'expire bientôt'})`}
        </p>
      </div>

      {/* Liste des contrats */}
      {filteredContrats.length === 0 ? (
        <div style={styles.noData}>
          <FiFileText size={64} color="#d1d5db" />
          <h3>Aucun contrat trouvé</h3>
          <p>Aucun contrat ne correspond à vos critères de recherche.</p>
          {/* ✅ Le gestionnaire ne peut PAS créer de contrat */}
          {can(['admin', 'juridique']) && (
            <button onClick={() => navigate('/contrats/nouveau')} style={styles.createButton}>
              <FiPlus /> Créer un contrat
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHeader}>
                  <th style={styles.th}>Numéro</th>
                  <th style={styles.th}>Fournisseur</th>
                  <th style={styles.th}>Période</th>
                  <th style={styles.th}>Montant</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Création</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContrats.map((contrat) => {
                  const statut = getStatutInfo(contrat.date_fin);
                  const StatutIcon = statut.icon;
                  return (
                    <tr key={contrat.id} style={styles.tr}>
                      <td style={styles.td}>
                        <strong>{contrat.numero_contrat}</strong>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.fournisseurCell}>
                          <FiUser size={12} color='var(--text-secondary)' />
                          <span>{contrat.fournisseur}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.periodCell}>
                          <FiCalendar size={12} color='var(--text-secondary)' />
                          <span>{formatDate(contrat.date_debut)} → {formatDate(contrat.date_fin)}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.montantCell}>
                          {formatCurrency(contrat.montant)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: statut.bg,
                          color: statut.color
                        }}>
                          <StatutIcon size={10} style={{ marginRight: '4px' }} />
                          {statut.label}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.dateCreation}>
                          <FiClock size={12} />
                          <span>{formatDateTime(contrat.created_at)}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button
                            onClick={() => navigate(`/contrats/${contrat.id}`)}
                            style={styles.actionButton.view}
                            title="Voir détails"
                          >
                            <FiEye />
                          </button>
                          {/* ✅ Le gestionnaire ne peut PAS modifier de contrat */}
                          {can(['admin', 'juridique']) && (
                            <>
                              <button
                                onClick={() => navigate(`/contrats/modifier/${contrat.id}`)}
                                style={styles.actionButton.edit}
                                title="Modifier"
                              >
                                <FiEdit />
                              </button>
                              <button
                                onClick={() => handleDelete(contrat.id)}
                                style={styles.actionButton.delete}
                                title="Supprimer"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                disabled={currentPage === 1}
                style={styles.pageButton}
              >
                <FiChevronLeft /> Précédent
              </button>
              <span style={styles.pageInfo}>
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                disabled={currentPage === totalPages}
                style={styles.pageButton}
              >
                Suivant <FiChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* ✅ Modal PDF pour visualiser la liste des contrats */}
      {showPdfModal && (
        <div style={styles.modalOverlay} onClick={() => {
          if (pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
          }
          setShowPdfModal(false);
        }}>
          <div style={styles.modalPdfContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiFileText size={20} style={{ marginRight: '0.5rem' }} />
                Liste des contrats
              </h3>
              <button 
                onClick={() => {
                  if (pdfUrl) {
                    window.URL.revokeObjectURL(pdfUrl);
                  }
                  setShowPdfModal(false);
                }}
                style={styles.modalClose}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div style={styles.pdfContainer}>
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  style={styles.pdfIframe}
                  title="Liste des contrats PDF"
                />
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button 
                onClick={() => {
                  if (pdfUrl) {
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `liste_contrats_${new Date().toISOString().split('T')[0]}.pdf`;
                    link.click();
                  }
                }}
                style={styles.downloadButton}
              >
                <FiDownload /> Télécharger PDF
              </button>
              <button 
                onClick={() => {
                  if (pdfUrl) {
                    window.open(pdfUrl, '_blank');
                  }
                }}
                style={styles.printButton}
              >
                <FiPrinter /> Ouvrir dans un nouvel onglet
              </button>
              <button 
                onClick={() => {
                  if (pdfUrl) {
                    window.URL.revokeObjectURL(pdfUrl);
                  }
                  setShowPdfModal(false);
                }}
                style={styles.cancelButton}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== STYLES AMÉLIORÉS ====================

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: 'var(--bg-secondary)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '2rem',
    color: '#1e3a8a',
    margin: 0,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
  },
  addButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    ':hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    },
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s',
    ':hover': {
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      transform: 'translateY(-2px)',
    },
  },
  statValue: {
    display: 'block',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: '250px',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '0.95rem',
    backgroundColor: 'var(--bg-card)',
    transition: 'all 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#2563eb',
      boxShadow: '0 0 0 3px rgba(37,99,235,0.1)',
    },
  },
  clearButton: {
    position: 'absolute',
    right: '1rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '0.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '0.75rem 1rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
  },
  resetButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-primary)',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--border-color)',
    },
  },
  exportButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#059669',
    },
  },
  pdfButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#ef4444',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#dc2626',
    },
  },
  filtersPanel: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filterSelect: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
    backgroundColor: 'var(--bg-card)',
  },
  filterInput: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.9rem',
  },
  resultsInfo: {
    marginBottom: '1rem',
    padding: '0.5rem 0',
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  tableContainer: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '1rem 1.25rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
  },
  trHeader: {
    backgroundColor: '#f8fafc',
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'var(--bg-secondary)',
    },
  },
  td: {
    padding: '1rem 1.25rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
  },
  fournisseurCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  periodCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  montantCell: {
    fontWeight: '500',
    color: '#1e3a8a',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '600',
    gap: '4px',
  },
  dateCreation: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionButton: {
    view: {
      padding: '0.5rem',
      backgroundColor: '#3b82f6',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#2563eb',
      },
    },
    edit: {
      padding: '0.5rem',
      backgroundColor: '#f59e0b',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#d97706',
      },
    },
    delete: {
      padding: '0.5rem',
      backgroundColor: '#ef4444',
      color: 'var(--bg-card)',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#dc2626',
      },
    },
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '2rem',
  },
  pageButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f3f4f6',
      borderColor: '#d1d5db',
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
  },
  noData: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    color: '#9ca3af',
    border: '1px solid #e5e7eb',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '4rem',
  },
  spinner: {
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  createButton: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#1d4ed8',
    },
  },
  // ✅ Styles pour le modal PDF
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modalPdfContent: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '1.5rem',
    width: '90%',
    maxWidth: '1000px',
    height: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e5e7eb',
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e3a8a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '0.5rem',
    borderRadius: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: '#f3f4f6',
    },
  },
  pdfContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    marginTop: '0.5rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  pdfIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    borderRadius: '8px',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  downloadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#059669',
    },
  },
  printButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#2563eb',
    },
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#9ca3af',
    color: 'var(--bg-card)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--text-secondary)',
    },
  },
};

const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ContratsListPro;