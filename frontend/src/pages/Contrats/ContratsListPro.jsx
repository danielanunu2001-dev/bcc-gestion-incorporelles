// frontend/src/pages/Contrats/ContratsListPro.jsx
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
  
  // États pour le modal PDF
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
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    actifs: 0,
    expirés: 0,
    bientotExpires: 0,
    montantTotal: 0,
    montantActifs: 0,
    contratsMois: 0
  });

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
      const res = await api.get('/contrats');
      if (res.data && Array.isArray(res.data)) {
        setContrats(res.data);
        const fournisseursList = [...new Set(res.data.map(c => c.fournisseur).filter(Boolean))];
        setFournisseurs(fournisseursList);
        calculerStats(res.data);
      } else {
        setContrats([]);
      }
    } catch (err) {
      console.error(err);
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

  const handleExportPDF = async () => {
    setLoadingPdf(true);
    try {
      const response = await api.get('/contrats/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPdfUrl(url);
      setShowPdfModal(true);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const appliquerFiltres = () => {
    let resultats = [...contrats];
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      resultats = resultats.filter(c =>
        c.numero_contrat?.toLowerCase().includes(searchLower) ||
        c.fournisseur?.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.statut !== 'tous') {
      const maintenant = new Date();
      const dans30Jours = new Date(maintenant.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (filters.statut === 'actif') resultats = resultats.filter(c => new Date(c.date_fin) > maintenant);
      else if (filters.statut === 'expire') resultats = resultats.filter(c => new Date(c.date_fin) <= maintenant);
      else if (filters.statut === 'bientot') resultats = resultats.filter(c => {
        const dateFin = new Date(c.date_fin);
        return dateFin > maintenant && dateFin <= dans30Jours;
      });
    }
    if (filters.fournisseur) resultats = resultats.filter(c => c.fournisseur === filters.fournisseur);
    if (filters.dateDebut) resultats = resultats.filter(c => new Date(c.date_debut) >= new Date(filters.dateDebut));
    if (filters.dateFin) resultats = resultats.filter(c => new Date(c.date_fin) <= new Date(filters.dateFin));
    if (filters.dateCreationDebut) resultats = resultats.filter(c => new Date(c.created_at) >= new Date(filters.dateCreationDebut));
    if (filters.dateCreationFin) resultats = resultats.filter(c => new Date(c.created_at) <= new Date(filters.dateCreationFin));
    if (filters.montantMin) resultats = resultats.filter(c => parseFloat(c.montant) >= parseFloat(filters.montantMin));
    if (filters.montantMax) resultats = resultats.filter(c => parseFloat(c.montant) <= parseFloat(filters.montantMax));
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
      search: '', statut: 'tous', fournisseur: '', dateDebut: '', dateFin: '',
      montantMin: '', montantMax: '', dateCreationDebut: '', dateCreationFin: ''
    });
  };

  const handleDelete = async (contratId) => {
    if (!can(['admin', 'juridique'])) {
      alert('Vous n\'avez pas les droits pour supprimer un contrat');
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contrat ?')) {
      try {
        await api.delete(`/contrats/${contratId}`);
        chargerContrats();
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const exportToCSV = () => {
    const headers = ['Numéro', 'Fournisseur', 'Date début', 'Date fin', 'Montant', 'Statut', 'Date création', 'Description'];
    const data = filteredContrats.map(c => [
      c.numero_contrat, c.fournisseur, formatDate(c.date_debut), formatDate(c.date_fin),
      formatCurrency(c.montant), getStatutInfo(c.date_fin).label, formatDateTime(c.created_at), c.description || ''
    ]);
    const csvContent = [headers.join(','), ...data.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contrats_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleDateString('fr-FR'); } catch { return 'Date invalide'; }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return 'Date invalide'; }
  };

  const formatCurrency = (value) => {
    if (!value) return '0 FC';
    try {
      return new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'CDF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    } catch {
      return `${value.toLocaleString()} FC`;
    }
  };

  const getStatutInfo = (dateFin) => {
    if (!dateFin) return { label: 'Non défini', color: '#6b7280', bg: '#f3f4f6', icon: FiInfo };
    const aujourdhui = new Date();
    const fin = new Date(dateFin);
    if (fin < aujourdhui) return { label: 'Expiré', color: '#dc2626', bg: '#fee2e2', icon: FiAlertCircle };
    const joursRestants = Math.ceil((fin - aujourdhui) / (1000 * 60 * 60 * 24));
    if (joursRestants < 30) return { label: `Expire bientôt (${joursRestants}j)`, color: '#f59e0b', bg: '#fef3c7', icon: FiTrendingDown };
    return { label: 'Actif', color: '#10b981', bg: '#dcfce7', icon: FiCheckCircle };
  };

  const paginatedContrats = filteredContrats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Styles modernes - TOUS LES TEXTES EN NOIR
  const modernStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-15px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .fade-up { animation: fadeInUp 0.4s ease-out; }
    .slide-in { animation: slideIn 0.3s ease-out; }
    .stat-card {
      transition: all 0.2s;
      border-radius: 20px;
      cursor: default;
    }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -12px rgba(0,0,0,0.15); }
    .btn-circle {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .badge-modern {
      padding: 4px 12px;
      border-radius: 30px;
      font-weight: 600;
      font-size: 0.7rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .table-modern {
      border-collapse: separate;
      border-spacing: 0 8px;
    }
    .table-modern tbody tr {
      background: white;
      border-radius: 16px;
      transition: all 0.2s;
    }
    .table-modern tbody tr:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      transform: scale(1.01);
    }
    .search-input {
      border-radius: 40px;
      padding: 0.6rem 1rem 0.6rem 2.5rem;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
    }
    /* TOUS LES TEXTES EN NOIR */
    body, .container-fluid, .card, .modal-content, .table, .text-muted, small, .form-label, .form-control, .form-select, .btn-outline-secondary {
      color: #000000 !important;
    }
    .text-muted {
      color: #000000 !important;
      opacity: 0.8;
    }
    .table-modern td, .table-modern th {
      color: #000000 !important;
    }
    .btn-outline-secondary {
      color: #000000 !important;
      border-color: #cbd5e1 !important;
    }
    .btn-outline-secondary:hover {
      background-color: #f8fafc !important;
      color: #000000 !important;
    }
    .form-control, .form-select {
      color: #000000 !important;
      background-color: #ffffff !important;
    }
    .form-control::placeholder {
      color: #6b7280 !important;
    }
    label {
      color: #000000 !important;
      font-weight: 500;
    }
  `;

  if (loading && contrats.length === 0) {
    return (
      <>
        <style>{modernStyles}</style>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
          <div className="text-center"><div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} /><p style={{ color: '#000000' }}>Chargement des contrats...</p></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center" style={{ backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
        <div className="alert alert-danger mx-auto" style={{ maxWidth: '500px', borderRadius: '20px', color: '#000000' }}>{error}</div>
      </div>
    );
  }

  return (
    <>
      <style>{modernStyles}</style>
      <div className="container-fluid fade-up" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="display-6 fw-bold mb-1" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              📑 Gestion des contrats
            </h1>
            <p style={{ color: '#000000', opacity: 0.7 }}>Suivi et gestion de tous les contrats</p>
          </div>
          {can(['admin', 'juridique']) && (
            <button onClick={() => navigate('/contrats/nouveau')} className="btn btn-success rounded-pill px-4 d-flex align-items-center gap-2 shadow-sm">
              <FiPlus /> Nouveau contrat
            </button>
          )}
        </div>

        {/* Cartes statistiques colorées */}
        <div className="row g-3 mb-4">
          <div className="col-md-2 col-6"><div className="stat-card p-3 text-center bg-white shadow-sm" style={{ borderLeft: '4px solid #1e3a8a', borderRadius: '20px' }}><FiFileText size={28} className="text-primary mb-2" /><div style={{ color: '#000000', fontSize: '0.75rem' }}>Total</div><div className="h3 fw-bold text-primary">{stats.total}</div></div></div>
          <div className="col-md-2 col-6"><div className="stat-card p-3 text-center bg-white shadow-sm" style={{ borderLeft: '4px solid #10b981', borderRadius: '20px' }}><FiCheckCircle size={28} className="text-success mb-2" /><div style={{ color: '#000000', fontSize: '0.75rem' }}>Actifs</div><div className="h3 fw-bold text-success">{stats.actifs}</div></div></div>
          <div className="col-md-2 col-6"><div className="stat-card p-3 text-center bg-white shadow-sm" style={{ borderLeft: '4px solid #f59e0b', borderRadius: '20px' }}><FiTrendingDown size={28} className="text-warning mb-2" /><div style={{ color: '#000000', fontSize: '0.75rem' }}>Expire bientôt</div><div className="h3 fw-bold text-warning">{stats.bientotExpires}</div></div></div>
          <div className="col-md-2 col-6"><div className="stat-card p-3 text-center bg-white shadow-sm" style={{ borderLeft: '4px solid #dc2626', borderRadius: '20px' }}><FiAlertCircle size={28} className="text-danger mb-2" /><div style={{ color: '#000000', fontSize: '0.75rem' }}>Expirés</div><div className="h3 fw-bold text-danger">{stats.expirés}</div></div></div>
          <div className="col-md-2 col-6"><div className="stat-card p-3 text-center bg-white shadow-sm" style={{ borderLeft: '4px solid #8b5cf6', borderRadius: '20px' }}><FiCalendar size={28} className="text-purple mb-2" /><div style={{ color: '#000000', fontSize: '0.75rem' }}>Créés ce mois</div><div className="h3 fw-bold text-purple">{stats.contratsMois}</div></div></div>
          <div className="col-md-2 col-6"><div className="stat-card p-3 text-center bg-white shadow-sm" style={{ borderLeft: '4px solid #10b981', borderRadius: '20px' }}><FiDollarSign size={28} className="text-success mb-2" /><div style={{ color: '#000000', fontSize: '0.75rem' }}>Montant total</div><div className="fw-bold text-success" style={{ fontSize: '1.1rem' }}>{formatCurrency(stats.montantTotal)}</div></div></div>
        </div>

        {/* Barre d'actions */}
        <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
          <div className="position-relative" style={{ flex: 1, minWidth: '250px' }}>
            <FiSearch className="position-absolute top-50 start-0 translate-middle-y ms-3" style={{ color: '#000000', opacity: 0.6 }} />
            <input type="text" name="search" value={filters.search} onChange={handleFilterChange} className="form-control search-input ps-5" placeholder="Rechercher par numéro, fournisseur..." />
            {filters.search && <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="position-absolute top-50 end-0 translate-middle-y me-3 btn btn-link text-muted p-0"><FiX /></button>}
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <button onClick={() => setShowFilters(!showFilters)} className={`btn ${showFilters ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill px-3`}><FiFilter /> Filtres</button>
            <button onClick={resetFilters} className="btn btn-outline-secondary rounded-pill px-3"><FiRefreshCw /> Réinitialiser</button>
            <button onClick={exportToCSV} className="btn btn-success rounded-pill px-3"><FiDownload /> CSV</button>
            <button onClick={handleExportPDF} className="btn btn-danger rounded-pill px-3" disabled={loadingPdf}><FiPrinter /> {loadingPdf ? 'Génération...' : 'PDF'}</button>
          </div>
        </div>

        {/* Panneau filtres */}
        {showFilters && (
          <div className="card shadow-sm border-0 rounded-4 p-3 mb-4 bg-white">
            <div className="row g-3">
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Statut</label><select name="statut" value={filters.statut} onChange={handleFilterChange} className="form-select rounded-3"><option value="tous">Tous</option><option value="actif">Actifs</option><option value="expire">Expirés</option><option value="bientot">Expire bientôt (30j)</option></select></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Fournisseur</label><select name="fournisseur" value={filters.fournisseur} onChange={handleFilterChange} className="form-select rounded-3"><option value="">Tous</option>{fournisseurs.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Date début après</label><input type="date" name="dateDebut" value={filters.dateDebut} onChange={handleFilterChange} className="form-control rounded-3" /></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Date fin avant</label><input type="date" name="dateFin" value={filters.dateFin} onChange={handleFilterChange} className="form-control rounded-3" /></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Créé après</label><input type="date" name="dateCreationDebut" value={filters.dateCreationDebut} onChange={handleFilterChange} className="form-control rounded-3" /></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Créé avant</label><input type="date" name="dateCreationFin" value={filters.dateCreationFin} onChange={handleFilterChange} className="form-control rounded-3" /></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Montant min (FC)</label><input type="number" name="montantMin" value={filters.montantMin} onChange={handleFilterChange} className="form-control rounded-3" placeholder="0" /></div>
              <div className="col-md-3"><label className="form-label fw-semibold" style={{ color: '#000000' }}>Montant max (FC)</label><input type="number" name="montantMax" value={filters.montantMax} onChange={handleFilterChange} className="form-control rounded-3" placeholder="1 000 000" /></div>
            </div>
          </div>
        )}

        {/* Résultats info */}
        <div className="d-flex align-items-center gap-2 mb-2" style={{ color: '#000000', fontSize: '0.875rem' }}><FiInfo /> {filteredContrats.length} contrat(s) trouvé(s)</div>

        {/* Liste des contrats */}
        {filteredContrats.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 shadow-sm"><FiFileText size={64} className="text-muted mb-3" style={{ color: '#000000', opacity: 0.5 }} /><h5 className="fw-semibold" style={{ color: '#000000' }}>Aucun contrat trouvé</h5><p style={{ color: '#000000', opacity: 0.7 }}>Aucun contrat ne correspond aux critères.</p>{can(['admin', 'juridique']) && <button onClick={() => navigate('/contrats/nouveau')} className="btn btn-primary rounded-pill"><FiPlus /> Créer un contrat</button>}</div>
        ) : (
          <>
            <div className="bg-white rounded-4 shadow-sm overflow-hidden">
              <table className="table-modern w-100">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th className="px-4 py-3" style={{ color: '#000000', fontWeight: '600' }}>Numéro</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Fournisseur</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Période</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Montant</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Statut</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Création</th>
                    <th style={{ color: '#000000', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContrats.map(contrat => {
                    const statut = getStatutInfo(contrat.date_fin);
                    const StatutIcon = statut.icon;
                    return (
                      <tr key={contrat.id} className="bg-white" style={{ transition: 'all 0.2s' }}>
                        <td className="px-4 py-3 fw-semibold" style={{ color: '#000000' }}>{contrat.numero_contrat}</td>
                        <td className="py-3"><div className="d-flex align-items-center gap-2" style={{ color: '#000000' }}><FiUser size={12} style={{ color: '#000000', opacity: 0.6 }} />{contrat.fournisseur}</div></td>
                        <td className="py-3"><div className="d-flex align-items-center gap-2" style={{ color: '#000000' }}><FiCalendar size={12} style={{ color: '#000000', opacity: 0.6 }} />{formatDate(contrat.date_debut)} → {formatDate(contrat.date_fin)}</div></td>
                        <td className="py-3"><span className="fw-semibold" style={{ color: '#1e3a8a' }}>{formatCurrency(contrat.montant)}</span></td>
                        <td className="py-3"><span className="badge-modern" style={{ backgroundColor: statut.bg, color: statut.color }}><StatutIcon size={12} /> {statut.label}</span></td>
                        <td className="py-3"><div className="d-flex align-items-center gap-2" style={{ color: '#000000' }}><FiClock size={12} style={{ color: '#000000', opacity: 0.6 }} />{formatDateTime(contrat.created_at)}</div></td>
                        <td className="py-3">
                          <div className="d-flex gap-2">
                            <button onClick={() => navigate(`/contrats/${contrat.id}`)} className="btn btn-outline-primary btn-circle" title="Voir"><FiEye size={16} /></button>
                            {can(['admin', 'juridique']) && (
                              <>
                                <button onClick={() => navigate(`/contrats/modifier/${contrat.id}`)} className="btn btn-outline-warning btn-circle" title="Modifier"><FiEdit size={16} /></button>
                                <button onClick={() => handleDelete(contrat.id)} className="btn btn-outline-danger btn-circle" title="Supprimer"><FiTrash2 size={16} /></button>
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
              <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="btn btn-outline-secondary rounded-pill px-3" style={{ color: '#000000' }}><FiChevronLeft /> Précédent</button>
                <span style={{ color: '#000000' }}>Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="btn btn-outline-secondary rounded-pill px-3" style={{ color: '#000000' }}>Suivant <FiChevronRight /></button>
              </div>
            )}
          </>
        )}

        {/* Modal PDF */}
        {showPdfModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050, backdropFilter: 'blur(4px)' }} onClick={() => { if (pdfUrl) window.URL.revokeObjectURL(pdfUrl); setShowPdfModal(false); }}>
            <div className="modal-dialog modal-dialog-centered modal-xl" onClick={e => e.stopPropagation()}>
              <div className="modal-content rounded-4 shadow-lg">
                <div className="modal-header bg-gradient-primary text-white" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                  <h5 className="modal-title text-white"><FiFileText className="me-2" /> Liste des contrats</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { if (pdfUrl) window.URL.revokeObjectURL(pdfUrl); setShowPdfModal(false); }}></button>
                </div>
                <div className="modal-body p-0" style={{ height: '65vh' }}>{pdfUrl && <iframe src={pdfUrl} title="PDF Contrats" className="w-100 h-100 border-0 rounded-bottom" />}</div>
                <div className="modal-footer border-0">
                  <button onClick={() => { if (pdfUrl) { const link = document.createElement('a'); link.href = pdfUrl; link.download = `contrats_${new Date().toISOString().split('T')[0]}.pdf`; link.click(); } }} className="btn btn-success rounded-pill"><FiDownload /> Télécharger</button>
                  <button onClick={() => { if (pdfUrl) window.open(pdfUrl, '_blank'); }} className="btn btn-primary rounded-pill"><FiPrinter /> Ouvrir</button>
                  <button onClick={() => { if (pdfUrl) window.URL.revokeObjectURL(pdfUrl); setShowPdfModal(false); }} className="btn btn-secondary rounded-pill">Fermer</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ContratsListPro;