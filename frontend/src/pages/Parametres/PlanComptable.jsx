import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiArrowLeft, FiSave, FiBook, FiPlus, FiTrash2, FiEdit2, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiSearch, FiFilter,
  FiAlertCircle, FiDownload, FiCopy, FiFolder,
  FiList, FiGrid, FiUpload, FiSun, FiMoon, FiClock, FiUser,
  FiBarChart2, FiPieChart, FiTrendingUp, FiPrinter, FiShare2,
  FiLock, FiUnlock, FiStar, FiEye, FiEyeOff, FiLink,
  FiDatabase, FiShield, FiZap, FiInfo
} from 'react-icons/fi';
import { debounce } from 'lodash';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Modal, Table, Nav, Tab } from 'react-bootstrap';

// ============================================================================
// VERSION ET MIGRATION DES DONNÉES
// ============================================================================
const DATA_VERSION = '2.0.0';

// ============================================================================
// DONNÉES PAR DÉFAUT - PLAN COMPTABLE BCC
// ============================================================================

const DEFAULT_PLAN_COMPTABLE_BCC = [
  // CLASSE 1 - CAPITAUX PROPRES ET RÉSERVES
  { id: 1, code: '1', libelle: 'CAPITAUX PROPRES ET RÉSERVES', niveau: 1, parentId: null, classe: '1', nature: 'passif', actif: true, obligatoire: true, description: 'Capitaux propres de la Banque Centrale', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 2, code: '10', libelle: 'CAPITAL SOCIAL', niveau: 2, parentId: 1, classe: '1', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 3, code: '101', libelle: 'Capital social (État congolais)', niveau: 3, parentId: 2, classe: '1', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 4, code: '106', libelle: 'Réserves', niveau: 2, parentId: 1, classe: '1', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 5, code: '1061', libelle: 'Réserve légale', niveau: 3, parentId: 4, classe: '1', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 6, code: '1062', libelle: 'Réserve de change', niveau: 3, parentId: 4, classe: '1', nature: 'passif', actif: true, obligatoire: false, typeReserve: 'change', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 7, code: '1063', libelle: 'Réserve monétaire', niveau: 3, parentId: 4, classe: '1', nature: 'passif', actif: true, obligatoire: false, typeReserve: 'monetaire', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 8, code: '11', libelle: 'RÉSULTATS', niveau: 2, parentId: 1, classe: '1', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 9, code: '111', libelle: "Résultat de l'exercice", niveau: 3, parentId: 8, classe: '1', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },

  // CLASSE 2 - IMMOBILISATIONS
  { id: 20, code: '2', libelle: 'IMMOBILISATIONS', niveau: 1, parentId: null, classe: '2', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 21, code: '20', libelle: 'IMMOBILISATIONS INCORPORELLES', niveau: 2, parentId: 20, classe: '2', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 22, code: '205', libelle: "Logiciels et systèmes d'information", niveau: 3, parentId: 21, classe: '2', nature: 'actif', actif: true, obligatoire: true, typeImmobilisation: 'incorporelle', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 23, code: '21', libelle: 'IMMOBILISATIONS CORPORELLES', niveau: 2, parentId: 20, classe: '2', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 24, code: '211', libelle: 'Terrains et bâtiments institutionnels', niveau: 3, parentId: 23, classe: '2', nature: 'actif', actif: true, obligatoire: true, typeImmobilisation: 'corporelle', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 25, code: '215', libelle: 'Matériel de sécurité monétaire', niveau: 3, parentId: 23, classe: '2', nature: 'actif', actif: true, obligatoire: false, typeImmobilisation: 'corporelle', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },

  // CLASSE 3 - STOCKS MONÉTAIRES
  { id: 30, code: '3', libelle: 'STOCKS MONÉTAIRES ET DE SÉCURITÉ', niveau: 1, parentId: null, classe: '3', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 31, code: '31', libelle: 'Billets et monnaies en circulation', niveau: 2, parentId: 30, classe: '3', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 32, code: '32', libelle: 'Or et réserves de change', niveau: 2, parentId: 30, classe: '3', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },

  // CLASSE 4 - OPÉRATIONS AVEC L'ÉTAT
  { id: 40, code: '4', libelle: "OPÉRATIONS AVEC L'ÉTAT ET INSTITUTIONS", niveau: 1, parentId: null, classe: '4', nature: 'mixte', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 41, code: '41', libelle: "Créances sur l'État", niveau: 2, parentId: 40, classe: '4', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 42, code: '411', libelle: 'Avances au Trésor', niveau: 3, parentId: 41, classe: '4', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 43, code: '42', libelle: 'Créances sur les banques commerciales', niveau: 2, parentId: 40, classe: '4', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 44, code: '421', libelle: 'Opérations de refinancement', niveau: 3, parentId: 43, classe: '4', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 45, code: '43', libelle: 'Dettes envers les institutions financières internationales', niveau: 2, parentId: 40, classe: '4', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 46, code: '44', libelle: 'Dépôts des banques commerciales', niveau: 2, parentId: 40, classe: '4', nature: 'passif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },

  // CLASSE 5 - TRÉSORERIE
  { id: 50, code: '5', libelle: 'TRÉSORERIE BCC', niveau: 1, parentId: null, classe: '5', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 51, code: '52', libelle: 'Comptes bancaires', niveau: 2, parentId: 50, classe: '5', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 52, code: '521', libelle: 'Comptes en devises', niveau: 3, parentId: 51, classe: '5', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 53, code: '57', libelle: 'Caisse centrale', niveau: 2, parentId: 50, classe: '5', nature: 'actif', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },

  // CLASSE 6 - CHARGES
  { id: 60, code: '6', libelle: "CHARGES D'EXPLOITATION BCC", niveau: 1, parentId: null, classe: '6', nature: 'charge', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 61, code: '61', libelle: 'Frais de personnel', niveau: 2, parentId: 60, classe: '6', nature: 'charge', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 62, code: '62', libelle: 'Frais de sécurité monétaire', niveau: 2, parentId: 60, classe: '6', nature: 'charge', actif: true, obligatoire: false, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 63, code: '68', libelle: 'Dotations aux amortissements', niveau: 2, parentId: 60, classe: '6', nature: 'charge', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },

  // CLASSE 7 - PRODUITS
  { id: 70, code: '7', libelle: "PRODUITS D'EXPLOITATION BCC", niveau: 1, parentId: null, classe: '7', nature: 'produit', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 71, code: '71', libelle: 'Produits des opérations monétaires', niveau: 2, parentId: 70, classe: '7', nature: 'produit', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
  { id: 72, code: '72', libelle: 'Produits financiers (placements)', niveau: 2, parentId: 70, classe: '7', nature: 'produit', actif: true, obligatoire: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }
];

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const PlanComptableBCC = ({ onSelectCompte, selectedCompteId, immobilisationType = 'all' }) => {
  const navigate = useNavigate();
  const userRole = useSelector(state => state.auth?.user?.role) || 'admin';
  
  // États
  const [comptes, setComptes] = useState([]);
  const [filteredComptes, setFilteredComptes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActif, setFilterActif] = useState('all');
  const [filterClasse, setFilterClasse] = useState('all');
  const [viewMode, setViewMode] = useState('tree');
  const [expandedNodes, setExpandedNodes] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingCompte, setEditingCompte] = useState({ code: '', libelle: '' });
  const [darkMode, setDarkMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [newCompte, setNewCompte] = useState({ code: '', libelle: '', classe: '2', nature: 'actif', description: '' });
  const [activeTab, setActiveTab] = useState('comptes');

  // Permissions
  const permissions = {
    admin: ['create', 'edit', 'delete', 'export', 'reset'],
    comptable: ['create', 'edit', 'export', 'reset'],
    auditeur: ['read', 'export'],
    viewer: ['read']
  };

  const can = useCallback((action) => permissions[userRole]?.includes(action) || false, [userRole]);

  // Chargement des données
  useEffect(() => { loadComptesFromLocalStorage(); }, []);
  useEffect(() => { filterComptes(); }, [comptes, searchTerm, filterActif, filterClasse]);

  const loadComptesFromLocalStorage = () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('plan_comptable_bcc');
      if (saved) {
        setComptes(JSON.parse(saved));
      } else {
        setComptes(DEFAULT_PLAN_COMPTABLE_BCC);
        localStorage.setItem('plan_comptable_bcc', JSON.stringify(DEFAULT_PLAN_COMPTABLE_BCC));
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Impossible de charger le plan comptable');
    } finally {
      setLoading(false);
    }
  };

  const filterComptes = () => {
    let filtered = [...comptes];
    if (searchTerm) filtered = filtered.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()) || c.libelle.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterActif === 'actif') filtered = filtered.filter(c => c.actif);
    else if (filterActif === 'inactif') filtered = filtered.filter(c => !c.actif);
    if (filterClasse !== 'all') filtered = filtered.filter(c => c.classe === filterClasse);
    if (immobilisationType !== 'all') filtered = filtered.filter(c => c.typeImmobilisation === immobilisationType || (c.typeImmobilisation === undefined && c.classe === '2'));
    setFilteredComptes(filtered);
  };

  const debouncedSearch = useCallback(debounce((value) => setSearchTerm(value), 300), []);

  // CRUD Operations
  const handleAddCompte = () => {
    if (!newCompte.code || !newCompte.libelle) {
      setError('Veuillez remplir tous les champs');
      setTimeout(() => setError(''), 3000);
      return;
    }
    const newId = Math.max(...comptes.map(c => c.id), 0) + 1;
    const parentCode = newCompte.code.length > 1 ? newCompte.code.slice(0, -1) : null;
    const parent = comptes.find(c => c.code === parentCode);
    const newCompteData = { id: newId, ...newCompte, niveau: newCompte.code.length, parentId: parent?.id || null, actif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const updatedComptes = [...comptes, newCompteData];
    setComptes(updatedComptes);
    localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
    setNewCompte({ code: '', libelle: '', classe: '2', nature: 'actif', description: '' });
    setSuccess('Compte ajouté avec succès');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEditCompte = (compte) => { setEditingId(compte.id); setEditingCompte({ code: compte.code, libelle: compte.libelle }); };
  const handleSaveEdit = (id) => {
    const updatedComptes = comptes.map(c => c.id === id ? { ...c, code: editingCompte.code, libelle: editingCompte.libelle, updatedAt: new Date().toISOString() } : c);
    setComptes(updatedComptes);
    localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
    setEditingId(null);
    setSuccess('Compte modifié avec succès');
    setTimeout(() => setSuccess(''), 3000);
  };
  const handleCancelEdit = () => { setEditingId(null); setEditingCompte({ code: '', libelle: '' }); };
  const handleToggleActif = (id) => {
    const updatedComptes = comptes.map(c => c.id === id ? { ...c, actif: !c.actif, updatedAt: new Date().toISOString() } : c);
    setComptes(updatedComptes);
    localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
    setSuccess(`Compte ${updatedComptes.find(c => c.id === id).actif ? 'activé' : 'désactivé'} avec succès`);
    setTimeout(() => setSuccess(''), 3000);
  };
  const handleDeleteCompte = (id) => {
    const compte = comptes.find(c => c.id === id);
    const hasChildren = comptes.some(c => c.parentId === id);
    if (compte?.obligatoire) { setError('Ce compte est obligatoire et ne peut pas être supprimé'); setTimeout(() => setError(''), 3000); return; }
    if (hasChildren) { setError('Ce compte a des sous-comptes. Supprimez-les d\'abord.'); setTimeout(() => setError(''), 3000); return; }
    if (window.confirm(`Supprimer le compte ${compte.code} - ${compte.libelle} ?`)) {
      const updatedComptes = comptes.filter(c => c.id !== id);
      setComptes(updatedComptes);
      localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
      setSuccess('Compte supprimé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Export
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(comptes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `plan_comptable_bcc_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };
  const handleExportCSV = () => {
    const headers = ['Code', 'Libellé', 'Classe', 'Nature', 'Statut'];
    const rows = comptes.map(c => [c.code, c.libelle, `Classe ${c.classe}`, c.nature, c.actif ? 'Actif' : 'Inactif']);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `plan_comptable_bcc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const handleReset = () => {
    if (window.confirm('Réinitialiser le plan comptable BCC ?')) {
      setComptes(DEFAULT_PLAN_COMPTABLE_BCC);
      localStorage.setItem('plan_comptable_bcc', JSON.stringify(DEFAULT_PLAN_COMPTABLE_BCC));
      setSuccess('Plan comptable réinitialisé');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // Statistiques
  const stats = useMemo(() => ({
    total: comptes.length, actifs: comptes.filter(c => c.actif).length,
    classe1: comptes.filter(c => c.classe === '1').length, classe2: comptes.filter(c => c.classe === '2').length,
    classe3: comptes.filter(c => c.classe === '3').length, classe4: comptes.filter(c => c.classe === '4').length,
    classe5: comptes.filter(c => c.classe === '5').length, classe6: comptes.filter(c => c.classe === '6').length,
    classe7: comptes.filter(c => c.classe === '7').length,
    immobilisationsCorporelles: comptes.filter(c => c.typeImmobilisation === 'corporelle').length,
    immobilisationsIncorporelles: comptes.filter(c => c.typeImmobilisation === 'incorporelle').length
  }), [comptes]);

  // Rendu arborescent
  const getComptesByParent = (parentId) => filteredComptes.filter(c => c.parentId === parentId);
  const toggleExpand = (id) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  const renderTree = (parentId = null, level = 0) => {
    const children = getComptesByParent(parentId);
    if (children.length === 0) return null;
    return children.map(compte => (
      <div key={compte.id} className="ms-3">
        <div className="d-flex align-items-center justify-content-between p-2 rounded-2 hover-bg-light" style={{ marginLeft: level * 24 }}>
          <div className="d-flex align-items-center flex-grow-1 gap-2 flex-wrap">
            {getComptesByParent(compte.id).length > 0 && <Button variant="link" size="sm" onClick={() => toggleExpand(compte.id)} className="p-0 text-secondary">{expandedNodes[compte.id] ? '▼' : '▶'}</Button>}
            {getComptesByParent(compte.id).length === 0 && <div style={{ width: '24px' }} />}
            <code className="bg-info bg-opacity-25 px-2 py-1 rounded small">{compte.code}</code>
            <span className="small">{compte.libelle}</span>
            {compte.typeImmobilisation && <Badge bg={compte.typeImmobilisation === 'incorporelle' ? 'warning' : 'success'} className="bg-opacity-10 text-dark">{compte.typeImmobilisation === 'incorporelle' ? 'Incorporelle' : 'Corporelle'}</Badge>}
            {compte.typeReserve && <Badge bg="warning" className="bg-opacity-10 text-dark">{compte.typeReserve === 'change' ? 'Réserves de change' : 'Réserves monétaires'}</Badge>}
            {compte.obligatoire && <Badge bg="danger" className="bg-opacity-10 text-dark">Obligatoire</Badge>}
            <Badge bg={compte.actif ? 'success' : 'secondary'} className="bg-opacity-10 text-dark">{compte.actif ? 'Actif' : 'Inactif'}</Badge>
          </div>
          <div className="d-flex gap-1">
            {onSelectCompte && <Button variant="outline-info" size="sm" onClick={() => onSelectCompte(compte)} title="Lier"><FiLink size={14} /></Button>}
            {can('edit') && <Button variant="outline-warning" size="sm" onClick={() => handleEditCompte(compte)} title="Modifier"><FiEdit2 size={14} /></Button>}
            {can('edit') && <Button variant={compte.actif ? 'outline-secondary' : 'outline-success'} size="sm" onClick={() => handleToggleActif(compte.id)} title={compte.actif ? 'Désactiver' : 'Activer'}>{compte.actif ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}</Button>}
            {can('delete') && !compte.obligatoire && <Button variant="outline-danger" size="sm" onClick={() => handleDeleteCompte(compte.id)} title="Supprimer"><FiTrash2 size={14} /></Button>}
          </div>
        </div>
        {expandedNodes[compte.id] && renderTree(compte.id, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="success" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
        <p className="text-muted">Chargement du plan comptable BCC...</p>
      </Container>
    );
  }

  return (
    <Container fluid className={`py-4 px-3 px-md-4 ${darkMode ? 'bg-dark text-white' : 'bg-light'}`} style={{ minHeight: '100vh', transition: 'all 0.3s ease' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <Button variant="outline-secondary" onClick={() => navigate('/parametres')} className="mb-3 d-inline-flex align-items-center gap-2">
            <FiArrowLeft size={16} /> Retour
          </Button>
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-success bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <FiBook size={28} className="text-success" />
            </div>
            <div>
              <h1 className="h3 fw-bold mb-1">Plan Comptable - Banque Centrale du Congo</h1>
              <p className="text-muted small mb-0">Référentiel comptable selon les normes de la BCC</p>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-secondary" onClick={() => setDarkMode(!darkMode)} className="d-flex align-items-center gap-2">{darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}</Button>
          <Button variant="info" onClick={() => setShowDashboard(!showDashboard)} className="d-flex align-items-center gap-2"><FiBarChart2 size={16} /> Dashboard</Button>
          <Button variant="success" onClick={handleExportJSON} className="d-flex align-items-center gap-2"><FiDownload size={16} /> JSON</Button>
          <Button variant="success" onClick={handleExportCSV} className="d-flex align-items-center gap-2">CSV</Button>
          {can('reset') && <Button variant="danger" onClick={handleReset} className="d-flex align-items-center gap-2"><FiRefreshCw size={16} /> Réinitialiser</Button>}
        </div>
      </div>

      {/* Messages */}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3"><FiCheckCircle className="me-2" />{success}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3"><FiXCircle className="me-2" />{error}</Alert>}

      {/* Dashboard */}
      {showDashboard && (
        <Card className="border-0 shadow-sm rounded-3 mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="h6 fw-semibold mb-0">Tableau de bord - Plan comptable BCC</h3>
              <Button variant="link" onClick={() => setShowDashboard(false)} className="text-secondary p-0"><FiXCircle size={20} /></Button>
            </div>
            <Row className="g-3">
              <Col xs={6} md={3}><div className="bg-light rounded-3 p-3 text-center"><div className="h2 mb-0 text-success">{stats.total}</div><small className="text-muted">Total comptes</small></div></Col>
              <Col xs={6} md={3}><div className="bg-light rounded-3 p-3 text-center"><div className="h2 mb-0 text-success">{stats.actifs}</div><small className="text-muted">Comptes actifs</small></div></Col>
              <Col xs={6} md={3}><div className="bg-light rounded-3 p-3 text-center"><div className="h2 mb-0 text-primary">{stats.classe2}</div><small className="text-muted">Immobilisations</small></div></Col>
              <Col xs={6} md={3}><div className="bg-light rounded-3 p-3 text-center"><div className="h2 mb-0 text-warning">{stats.immobilisationsCorporelles}</div><small className="text-muted">Corporelles</small></div></Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Onglets */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-0">
          <Nav variant="tabs" defaultActiveKey="comptes" className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="comptes" onClick={() => setActiveTab('comptes')} className="d-flex align-items-center gap-2"><FiBook size={14} /> Comptes</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="ajout" onClick={() => setActiveTab('ajout')} className="d-flex align-items-center gap-2"><FiPlus size={14} /> Ajouter un compte</Nav.Link></Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {/* Ajout de compte */}
      {activeTab === 'ajout' && can('create') && (
        <Card className="border-0 shadow-sm rounded-3 mb-4">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="rounded-circle bg-success bg-opacity-10 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}><FiPlus size={20} className="text-success" /></div>
              <div><h3 className="h6 fw-semibold mb-0">Ajouter un compte BCC</h3><p className="small text-muted mb-0">Créez un nouveau compte comptable</p></div>
            </div>
            <Row className="g-3 align-items-end">
              <Col md={3}><Form.Group><Form.Label className="fw-semibold small text-muted">Classe</Form.Label><Form.Select value={newCompte.classe} onChange={(e) => setNewCompte({ ...newCompte, classe: e.target.value })}><option value="1">Classe 1 - Capitaux propres</option><option value="2">Classe 2 - Immobilisations</option><option value="3">Classe 3 - Stocks monétaires</option><option value="4">Classe 4 - Opérations État</option><option value="5">Classe 5 - Trésorerie</option><option value="6">Classe 6 - Charges</option><option value="7">Classe 7 - Produits</option></Form.Select></Form.Group></Col>
              <Col md={2}><Form.Group><Form.Label className="fw-semibold small text-muted">Code</Form.Label><Form.Control type="text" placeholder="Ex: 421" value={newCompte.code} onChange={(e) => setNewCompte({ ...newCompte, code: e.target.value })} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-semibold small text-muted">Libellé</Form.Label><Form.Control type="text" placeholder="Ex: Opérations de refinancement" value={newCompte.libelle} onChange={(e) => setNewCompte({ ...newCompte, libelle: e.target.value })} /></Form.Group></Col>
              <Col md={3}><Button variant="success" onClick={handleAddCompte} className="w-100 d-flex align-items-center justify-content-center gap-2"><FiPlus size={14} /> Ajouter</Button></Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Filtres */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body>
          <div className="d-flex gap-3 flex-wrap align-items-center">
            <div className="flex-grow-1" style={{ minWidth: '250px' }}>
              <InputGroup><InputGroup.Text className="bg-white border-end-0"><FiSearch className="text-muted" /></InputGroup.Text><Form.Control type="text" placeholder="Rechercher par code ou libellé..." onChange={(e) => debouncedSearch(e.target.value)} className="border-start-0" /></InputGroup>
            </div>
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border" style={{ backgroundColor: '#f8fafc' }}><FiFilter size={14} className="text-muted" /><Form.Select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} className="border-0 bg-transparent w-auto" style={{ fontSize: '0.875rem' }}><option value="all">Toutes classes</option><option value="1">Classe 1</option><option value="2">Classe 2</option><option value="3">Classe 3</option><option value="4">Classe 4</option><option value="5">Classe 5</option><option value="6">Classe 6</option><option value="7">Classe 7</option></Form.Select></div>
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border" style={{ backgroundColor: '#f8fafc' }}><Form.Select value={filterActif} onChange={(e) => setFilterActif(e.target.value)} className="border-0 bg-transparent w-auto" style={{ fontSize: '0.875rem' }}><option value="all">Tous statuts</option><option value="actif">Actifs</option><option value="inactif">Inactifs</option></Form.Select></div>
            <div className="btn-group" role="group"><Button variant={viewMode === 'tree' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setViewMode('tree')}><FiFolder size={14} /> Arborescence</Button><Button variant={viewMode === 'list' ? 'primary' : 'outline-secondary'} size="sm" onClick={() => setViewMode('list')}><FiList size={14} /> Liste</Button></div>
          </div>
        </Card.Body>
      </Card>

      {/* Liste des comptes */}
      <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
        <Card.Body className="p-0">
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h3 className="h6 fw-semibold mb-0">{viewMode === 'tree' ? 'Structure hiérarchique' : 'Liste des comptes'}</h3>
            <Badge bg="secondary" className="px-2 py-1">{filteredComptes.length} compte(s)</Badge>
          </div>
          
          {filteredComptes.length === 0 ? (
            <div className="text-center py-5"><FiAlertCircle size={48} className="text-muted opacity-50 mb-3" /><h5 className="text-muted">Aucun compte trouvé</h5></div>
          ) : viewMode === 'tree' ? (
            <div className="p-3" style={{ maxHeight: '600px', overflowY: 'auto' }}>{renderTree(null, 0)}</div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light"><tr><th>Code</th><th>Libellé</th><th>Classe</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredComptes.map(compte => (
                    <tr key={compte.id}>
                      <td>{editingId === compte.id ? <Form.Control type="text" size="sm" value={editingCompte.code} onChange={(e) => setEditingCompte({ ...editingCompte, code: e.target.value })} style={{ width: '100px' }} /> : <code className="bg-light px-2 py-1 rounded">{compte.code}</code>}</td>
                      <td>{editingId === compte.id ? <Form.Control type="text" size="sm" value={editingCompte.libelle} onChange={(e) => setEditingCompte({ ...editingCompte, libelle: e.target.value })} className="w-100" /> : compte.libelle}</td>
                      <td><Badge bg="secondary" className="bg-opacity-10 text-dark">Classe {compte.classe}</Badge></td>
                      <td><Badge bg={compte.actif ? 'success' : 'secondary'} className="bg-opacity-10 text-dark">{compte.actif ? 'Actif' : 'Inactif'}</Badge></td>
                      <td><div className="btn-group btn-group-sm">
                        {editingId === compte.id ? <><Button variant="success" onClick={() => handleSaveEdit(compte.id)}><FiCheckCircle size={14} /></Button><Button variant="secondary" onClick={handleCancelEdit}><FiXCircle size={14} /></Button></> : <>{onSelectCompte && <Button variant="outline-info" onClick={() => onSelectCompte(compte)}><FiLink size={14} /></Button>}{can('edit') && <Button variant="outline-warning" onClick={() => handleEditCompte(compte)}><FiEdit2 size={14} /></Button>}{can('edit') && <Button variant={compte.actif ? 'outline-secondary' : 'outline-success'} onClick={() => handleToggleActif(compte.id)}>{compte.actif ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}</Button>}{can('delete') && !compte.obligatoire && <Button variant="outline-danger" onClick={() => handleDeleteCompte(compte.id)}><FiTrash2 size={14} /></Button>}</>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Footer info */}
      <div className="text-center mt-3"><small className="text-muted d-flex align-items-center justify-content-center gap-2"><FiShield size={12} /> Plan comptable conforme aux normes BCC — Mise à jour en temps réel</small></div>
    </Container>
  );
};

export default PlanComptableBCC;