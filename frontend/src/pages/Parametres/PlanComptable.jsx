import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiArrowLeft, FiSave, FiBook, FiPlus, FiTrash2, FiEdit2, 
  FiCheckCircle, FiXCircle, FiRefreshCw, FiSearch, FiFilter,
  FiAlertCircle, FiDownload, FiCopy, FiFolder,
  FiList, FiGrid, FiUpload, FiSun, FiMoon, FiClock, FiUser,
  FiBarChart2, FiPieChart, FiTrendingUp, FiPrinter, FiShare2,
  FiLock, FiUnlock, FiStar, FiEye, FiEyeOff, FiLink
} from 'react-icons/fi';
import { debounce } from 'lodash';

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

  // Permissions
  const permissions = {
    admin: ['create', 'edit', 'delete', 'export', 'reset'],
    comptable: ['create', 'edit', 'export', 'reset'],
    auditeur: ['read', 'export'],
    viewer: ['read']
  };

  const can = useCallback((action) => {
    return permissions[userRole]?.includes(action) || false;
  }, [userRole]);

  // Chargement des données
  useEffect(() => {
    loadComptesFromLocalStorage();
  }, []);

  useEffect(() => {
    filterComptes();
  }, [comptes, searchTerm, filterActif, filterClasse]);

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
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.libelle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterActif === 'actif') {
      filtered = filtered.filter(c => c.actif);
    } else if (filterActif === 'inactif') {
      filtered = filtered.filter(c => !c.actif);
    }
    
    if (filterClasse !== 'all') {
      filtered = filtered.filter(c => c.classe === filterClasse);
    }
    
    if (immobilisationType !== 'all') {
      filtered = filtered.filter(c => 
        c.typeImmobilisation === immobilisationType || 
        (c.typeImmobilisation === undefined && c.classe === '2')
      );
    }
    
    setFilteredComptes(filtered);
  };

  const debouncedSearch = useCallback(debounce((value) => {
    setSearchTerm(value);
  }, 300), []);

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
    
    const newCompteData = { 
      id: newId, 
      ...newCompte, 
      niveau: newCompte.code.length,
      parentId: parent?.id || null,
      actif: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedComptes = [...comptes, newCompteData];
    setComptes(updatedComptes);
    localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
    setNewCompte({ code: '', libelle: '', classe: '2', nature: 'actif', description: '' });
    setSuccess('Compte ajouté avec succès');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEditCompte = (compte) => {
    setEditingId(compte.id);
    setEditingCompte({ code: compte.code, libelle: compte.libelle });
  };

  const handleSaveEdit = (id) => {
    const updatedComptes = comptes.map(c => 
      c.id === id ? { 
        ...c, 
        code: editingCompte.code, 
        libelle: editingCompte.libelle,
        updatedAt: new Date().toISOString()
      } : c
    );
    
    setComptes(updatedComptes);
    localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
    setEditingId(null);
    setSuccess('Compte modifié avec succès');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingCompte({ code: '', libelle: '' });
  };

  const handleToggleActif = (id) => {
    const updatedComptes = comptes.map(c => 
      c.id === id ? { ...c, actif: !c.actif, updatedAt: new Date().toISOString() } : c
    );
    setComptes(updatedComptes);
    localStorage.setItem('plan_comptable_bcc', JSON.stringify(updatedComptes));
    const newStatus = updatedComptes.find(c => c.id === id).actif ? 'activé' : 'désactivé';
    setSuccess(`Compte ${newStatus} avec succès`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteCompte = (id) => {
    const compte = comptes.find(c => c.id === id);
    const hasChildren = comptes.some(c => c.parentId === id);
    
    if (compte?.obligatoire) {
      setError('Ce compte est obligatoire et ne peut pas être supprimé');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (hasChildren) {
      setError('Ce compte a des sous-comptes. Supprimez-les d\'abord.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
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
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `plan_comptable_bcc_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  const handleExportCSV = () => {
    const headers = ['Code', 'Libellé', 'Classe', 'Nature', 'Statut'];
    const rows = comptes.map(c => [
      c.code,
      c.libelle,
      `Classe ${c.classe}`,
      c.nature,
      c.actif ? 'Actif' : 'Inactif'
    ]);
    
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
    total: comptes.length,
    actifs: comptes.filter(c => c.actif).length,
    classe1: comptes.filter(c => c.classe === '1').length,
    classe2: comptes.filter(c => c.classe === '2').length,
    classe3: comptes.filter(c => c.classe === '3').length,
    classe4: comptes.filter(c => c.classe === '4').length,
    classe5: comptes.filter(c => c.classe === '5').length,
    classe6: comptes.filter(c => c.classe === '6').length,
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
      <div key={compte.id} className="tree-item" style={{ marginLeft: level * 24 }}>
        <div className="tree-item-content" style={styles.treeItemContent}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {getComptesByParent(compte.id).length > 0 && (
              <button onClick={() => toggleExpand(compte.id)} style={styles.expandButton}>
                {expandedNodes[compte.id] ? '▼' : '▶'}
              </button>
            )}
            {getComptesByParent(compte.id).length === 0 && <div style={{ width: '24px' }} />}
            <div style={styles.compteInfo}>
              <span style={styles.compteCode}>{compte.code}</span>
              <span style={styles.compteLibelle}>{compte.libelle}</span>
              {compte.typeImmobilisation && (
                <span style={compte.typeImmobilisation === 'incorporelle' ? styles.incorporelleBadge : styles.corporelleBadge}>
                  {compte.typeImmobilisation === 'incorporelle' ? 'Incorporelle' : 'Corporelle'}
                </span>
              )}
              {compte.typeReserve && (
                <span style={styles.reserveBadge}>
                  {compte.typeReserve === 'change' ? 'Réserves de change' : 'Réserves monétaires'}
                </span>
              )}
              {compte.obligatoire && <span style={styles.obligatoireBadge}>Obligatoire</span>}
            </div>
          </div>
          <div style={styles.compteStatus}>
            <span style={compte.actif ? styles.activeBadge : styles.inactiveBadge}>
              {compte.actif ? 'Actif' : 'Inactif'}
            </span>
          </div>
          <div style={styles.treeActions}>
            {onSelectCompte && (
              <button onClick={() => onSelectCompte(compte)} style={styles.linkButton} title="Lier">
                <FiLink size={14} />
              </button>
            )}
            {can('edit') && (
              <>
                <button onClick={() => handleEditCompte(compte)} style={styles.editButtonSmall} title="Modifier">
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => handleToggleActif(compte.id)} style={compte.actif ? styles.deactivateButtonSmall : styles.activateButtonSmall}>
                  {compte.actif ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}
                </button>
              </>
            )}
            {can('delete') && !compte.obligatoire && (
              <button onClick={() => handleDeleteCompte(compte.id)} style={styles.deleteButtonSmall}>
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {expandedNodes[compte.id] && renderTree(compte.id, level + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, backgroundColor: darkMode ? 'var(--text-primary)' : 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/parametres')} style={styles.backButton}>
            <FiArrowLeft size={18} /> Retour
          </button>
          <div style={styles.headerInfo}>
            <div style={styles.iconWrapper}>
              <FiBook size={28} color="#10b981" />
            </div>
            <div>
              <h1 style={{ ...styles.title, color: darkMode ? 'var(--bg-primary)' : 'var(--text-primary)' }}>
                Plan Comptable - Banque Centrale du Congo
              </h1>
              <p style={styles.subtitle}>
                Référentiel comptable selon les normes de la BCC
              </p>
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setDarkMode(!darkMode)} style={styles.themeButton}>
            {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <button onClick={() => setShowDashboard(!showDashboard)} style={styles.dashboardButton}>
            <FiBarChart2 /> Dashboard
          </button>
          <button onClick={handleExportJSON} style={styles.exportButton}>
            <FiDownload /> JSON
          </button>
          <button onClick={handleExportCSV} style={styles.exportButton}>
            CSV
          </button>
          {can('reset') && (
            <button onClick={handleReset} style={styles.resetButton}>
              <FiRefreshCw /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div style={styles.errorMessage}>
          <FiXCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Dashboard */}
      {showDashboard && (
        <div style={styles.dashboardContainer}>
          <div style={styles.dashboardHeader}>
            <h3>Tableau de bord - Plan comptable BCC</h3>
            <button onClick={() => setShowDashboard(false)} style={styles.closeButton}>
              <FiXCircle />
            </button>
          </div>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total comptes</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.actifs}</div>
              <div style={styles.statLabel}>Comptes actifs</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.classe2}</div>
              <div style={styles.statLabel}>Immobilisations</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{stats.immobilisationsCorporelles}</div>
              <div style={styles.statLabel}>Corporelles</div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div style={styles.content}>
        {/* Ajout de compte */}
        {can('create') && (
          <div style={styles.addSection}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <FiPlus size={20} color="#10b981" />
              </div>
              <div>
                <h3 style={styles.sectionTitle}>Ajouter un compte BCC</h3>
                <p style={styles.sectionDescription}>Créez un nouveau compte comptable</p>
              </div>
            </div>
            <div style={styles.addForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Classe</label>
                <select
                  value={newCompte.classe}
                  onChange={(e) => setNewCompte({ ...newCompte, classe: e.target.value })}
                  style={styles.select}
                >
                  <option value="1">Classe 1 - Capitaux propres</option>
                  <option value="2">Classe 2 - Immobilisations</option>
                  <option value="3">Classe 3 - Stocks monétaires</option>
                  <option value="4">Classe 4 - Opérations État</option>
                  <option value="5">Classe 5 - Trésorerie</option>
                  <option value="6">Classe 6 - Charges</option>
                  <option value="7">Classe 7 - Produits</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Code</label>
                <input
                  type="text"
                  placeholder="Ex: 421"
                  value={newCompte.code}
                  onChange={(e) => setNewCompte({ ...newCompte, code: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Libellé</label>
                <input
                  type="text"
                  placeholder="Ex: Opérations de refinancement"
                  value={newCompte.libelle}
                  onChange={(e) => setNewCompte({ ...newCompte, libelle: e.target.value })}
                  style={{ ...styles.input, flex: 2 }}
                />
              </div>
              <button onClick={handleAddCompte} style={styles.addButton}>
                <FiPlus /> Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div style={styles.filtersSection}>
          <div style={styles.searchWrapper}>
            <FiSearch size={18} color="#94a3b8" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Rechercher..."
              onChange={(e) => debouncedSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterWrapper}>
            <FiFilter size={18} color="#94a3b8" />
            <select value={filterClasse} onChange={(e) => setFilterClasse(e.target.value)} style={styles.filterSelect}>
              <option value="all">Toutes classes</option>
              <option value="1">Classe 1</option>
              <option value="2">Classe 2</option>
              <option value="3">Classe 3</option>
              <option value="4">Classe 4</option>
              <option value="5">Classe 5</option>
              <option value="6">Classe 6</option>
              <option value="7">Classe 7</option>
            </select>
          </div>
          <div style={styles.filterWrapper}>
            <select value={filterActif} onChange={(e) => setFilterActif(e.target.value)} style={styles.filterSelect}>
              <option value="all">Tous statuts</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
          </div>
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('tree')} style={{ ...styles.viewButton, ...(viewMode === 'tree' ? styles.viewButtonActive : {}) }}>
              <FiFolder size={16} />
            </button>
            <button onClick={() => setViewMode('list')} style={{ ...styles.viewButton, ...(viewMode === 'list' ? styles.viewButtonActive : {}) }}>
              <FiList size={16} />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div style={styles.listSection}>
          <div style={styles.listHeader}>
            <h3 style={styles.listTitle}>{viewMode === 'tree' ? 'Structure hiérarchique' : 'Liste des comptes'}</h3>
            <span style={styles.listCount}>{filteredComptes.length} compte(s)</span>
          </div>
          
          {filteredComptes.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle size={48} color="#cbd5e1" />
              <h4>Aucun compte trouvé</h4>
            </div>
          ) : viewMode === 'tree' ? (
            <div style={styles.treeContainer} className="tree-container">
              {renderTree(null, 0)}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr><th style={styles.th}>Code</th><th style={styles.th}>Libellé</th><th style={styles.th}>Classe</th><th style={styles.th}>Statut</th><th style={styles.th}>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredComptes.map(compte => (
                    <tr key={compte.id} className="table-row" style={styles.tr}>
                      <td style={styles.td}>
                        {editingId === compte.id ? (
                          <input type="text" value={editingCompte.code} onChange={(e) => setEditingCompte({ ...editingCompte, code: e.target.value })} style={styles.editInput} />
                        ) : (
                          <span style={styles.code}>{compte.code}</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {editingId === compte.id ? (
                          <input type="text" value={editingCompte.libelle} onChange={(e) => setEditingCompte({ ...editingCompte, libelle: e.target.value })} style={{ ...styles.editInput, width: '100%' }} />
                        ) : (
                          compte.libelle
                        )}
                      </td>
                      <td style={styles.td}><span style={styles.classeBadge}>Classe {compte.classe}</span></td>
                      <td style={styles.td}>
                        <span style={compte.actif ? styles.activeBadge : styles.inactiveBadge}>
                          {compte.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          {editingId === compte.id ? (
                            <>
                              <button onClick={() => handleSaveEdit(compte.id)} style={styles.saveEditButton}><FiCheckCircle size={16} /></button>
                              <button onClick={handleCancelEdit} style={styles.cancelEditButton}><FiXCircle size={16} /></button>
                            </>
                          ) : (
                            <>
                              {onSelectCompte && <button onClick={() => onSelectCompte(compte)} style={styles.linkButtonList}><FiLink size={16} /></button>}
                              {can('edit') && <button onClick={() => handleEditCompte(compte)} style={styles.editButton}><FiEdit2 size={16} /></button>}
                              {can('edit') && <button onClick={() => handleToggleActif(compte.id)} style={compte.actif ? styles.deactivateButton : styles.activateButton}>{compte.actif ? <FiXCircle size={16} /> : <FiCheckCircle size={16} />}</button>}
                              {can('delete') && !compte.obligatoire && <button onClick={() => handleDeleteCompte(compte.id)} style={styles.deleteButton}><FiTrash2 size={16} /></button>}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '1rem', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  headerLeft: { flex: 1 },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', color: '#475569', marginBottom: '1rem' },
  headerInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  iconWrapper: { width: '56px', height: '56px', borderRadius: '14px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 0.25rem 0' },
  subtitle: { fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 },
  headerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  themeButton: { padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid #e5e7eb', borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#475569' },
  dashboardButton: { padding: '0.5rem 1rem', backgroundColor: '#8b5cf6', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  exportButton: { padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  resetButton: { padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' },
  successMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '10px', marginBottom: '1.5rem', color: '#065f46', fontSize: '0.875rem' },
  errorMessage: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '1.5rem', color: '#991b1b', fontSize: '0.875rem' },
  dashboardContainer: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  dashboardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  closeButton: { background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1rem', textAlign: 'center' },
  statValue: { fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981' },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-secondary)' },
  content: { backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  addSection: { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f1f5f9' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' },
  sectionIcon: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  sectionDescription: { fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' },
  addForm: { display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' },
  formGroup: { flex: 1, minWidth: '180px' },
  formLabel: { display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem' },
  input: { padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', width: '100%' },
  select: { padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', width: '100%', backgroundColor: 'var(--bg-card)' },
  addButton: { padding: '0.625rem 1.25rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: '42px' },
  filtersSection: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' },
  searchWrapper: { flex: 2, position: 'relative', minWidth: '250px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  searchInput: { width: '100%', padding: '0.625rem 0.625rem 0.625rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem' },
  filterWrapper: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' },
  filterSelect: { border: 'none', backgroundColor: 'transparent', fontSize: '0.875rem', cursor: 'pointer' },
  viewToggle: { display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', padding: '0.25rem' },
  viewButton: { padding: '0.375rem 0.625rem', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-secondary)' },
  viewButtonActive: { backgroundColor: 'var(--bg-card)', color: '#10b981', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  listSection: { marginTop: '1rem' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' },
  listTitle: { fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 },
  listCount: { fontSize: '0.75rem', color: 'var(--text-secondary)' },
  treeContainer: { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '0.5rem', maxHeight: '600px', overflowY: 'auto' },
  treeItemContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' },
  expandButton: { width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.75rem' },
  compteInfo: { flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  compteCode: { fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: '500', backgroundColor: '#e0f2fe', padding: '0.25rem 0.5rem', borderRadius: '6px', color: '#0369a1' },
  compteLibelle: { fontSize: '0.875rem', color: '#1e293b' },
  compteStatus: { marginRight: '1rem' },
  treeActions: { display: 'flex', gap: '0.25rem' },
  linkButton: { padding: '0.25rem', backgroundColor: '#e0f2fe', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#0369a1', display: 'inline-flex', alignItems: 'center' },
  editButtonSmall: { padding: '0.25rem', backgroundColor: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center' },
  activateButtonSmall: { padding: '0.25rem', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center' },
  deactivateButtonSmall: { padding: '0.25rem', backgroundColor: 'var(--text-secondary)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center' },
  deleteButtonSmall: { padding: '0.25rem', backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--bg-card)', display: 'inline-flex', alignItems: 'center' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', backgroundColor: '#f8fafc', borderBottom: '2px solid #e5e7eb', fontWeight: '600', fontSize: '0.75rem', color: '#475569' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1e293b' },
  code: { fontFamily: 'monospace', backgroundColor: 'var(--bg-primary)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' },
  classeBadge: { display: 'inline-block', backgroundColor: 'var(--border-color)', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500', color: '#475569' },
  reserveBadge: { display: 'inline-block', backgroundColor: '#fed7aa', color: '#9a3412', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  incorporelleBadge: { display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  corporelleBadge: { display: 'inline-block', backgroundColor: '#dcfce7', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  obligatoireBadge: { display: 'inline-block', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  activeBadge: { display: 'inline-block', backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  inactiveBadge: { display: 'inline-block', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '500' },
  actionButtons: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  editButton: { padding: '0.375rem', backgroundColor: '#f59e0b', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  deleteButton: { padding: '0.375rem', backgroundColor: '#ef4444', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  activateButton: { padding: '0.375rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  deactivateButton: { padding: '0.375rem', backgroundColor: 'var(--text-secondary)', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  linkButtonList: { padding: '0.375rem', backgroundColor: '#e0f2fe', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#0369a1' },
  saveEditButton: { padding: '0.375rem', backgroundColor: '#10b981', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  cancelEditButton: { padding: '0.375rem', backgroundColor: 'var(--text-secondary)', color: 'var(--bg-card)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  editInput: { padding: '0.375rem', border: '1px solid #10b981', borderRadius: '6px', fontSize: '0.875rem', width: '120px' },
  emptyState: { textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '12px' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px' },
  spinner: { width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }
};

// Ajout des animations
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .tree-item-content:hover { background-color: #f8fafc; }
    .table-row:hover { background-color: #f9fafb; }
  `;
  document.head.appendChild(styleSheet);
}

export default PlanComptableBCC;