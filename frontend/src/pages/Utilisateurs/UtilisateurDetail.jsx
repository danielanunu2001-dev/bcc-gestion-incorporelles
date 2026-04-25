import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import { getUserRecentActivity, getUserAuditLogs } from '../../services/auditService';
import {
  FiUser, FiMail, FiShield, FiCalendar,
  FiClock, FiEdit, FiTrash2, FiArrowLeft,
  FiActivity, FiFileText, FiRefreshCw,
  FiChevronLeft, FiChevronRight, FiSearch,
  FiX, FiEye, FiInfo, FiShieldOff, FiCheckCircle,
  FiAlertCircle, FiLogOut, FiServer, FiCamera,
  FiUpload, FiImage
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, Table, Modal, Nav, Tab, ProgressBar } from 'react-bootstrap';

const UtilisateurDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { can, user: currentUser } = usePermissions();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  
  // État pour l'activité récente
  const [activities, setActivities] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // État pour les logs d'audit (admin uniquement)
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ action: '', table_name: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // États pour la photo de profil
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isAdmin = can(['admin']);
  const canEditProfile = isAdmin || currentUser?.id === parseInt(id);

  useEffect(() => {
    chargerUtilisateur();
  }, [id]);

  useEffect(() => {
    if (user && activeTab === 'activite') {
      chargerActiviteRecente();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user && activeTab === 'audit' && isAdmin) {
      chargerAuditLogs();
    }
  }, [user, activeTab, pagination.page, filters]);

  const chargerUtilisateur = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const chargerActiviteRecente = async () => {
    try {
      setLoadingActivity(true);
      const data = await getUserRecentActivity(id, 20);
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error('Erreur chargement activité:', err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const chargerAuditLogs = async () => {
    try {
      setLoadingAudit(true);
      const data = await getUserAuditLogs(id, {
        page: pagination.page,
        limit: 20,
        action: filters.action,
        table_name: filters.table_name
      });
      if (data.success) {
        setAuditLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
      }
    } catch (err) {
      console.error('Erreur chargement logs audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/users/${id}`);
      navigate('/utilisateurs');
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
    setShowDeleteModal(false);
  };

  const handleRefresh = () => {
    if (activeTab === 'activite') {
      chargerActiviteRecente();
    } else if (activeTab === 'audit') {
      chargerAuditLogs();
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ action: '', table_name: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  // ==================== FONCTIONS POUR LA PHOTO DE PROFIL ====================
  
  // Ouvrir la galerie
  const handleOpenGallery = () => {
    fileInputRef.current.click();
  };

  // Ouvrir l'appareil photo
  const handleOpenCamera = () => {
    cameraInputRef.current.click();
  };

  // Gérer la sélection du fichier
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      processImage(file);
    }
  };

  // Traiter l'image sélectionnée
  const processImage = (file) => {
    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      setPhotoError('Veuillez sélectionner une image valide (JPEG, PNG, GIF)');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setPhotoError('');
    setSelectedImage(file);

    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload de la photo
  const handleUploadPhoto = async () => {
    if (!selectedImage) return;

    setUploadingPhoto(true);
    setPhotoError('');

    const formData = new FormData();
    formData.append('photo', selectedImage);

    try {
      const response = await api.post(`/users/${id}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success || response.data.photo_url) {
        // Mettre à jour l'utilisateur avec la nouvelle photo
        setUser(prev => ({ ...prev, photo_url: response.data.photo_url }));
        setShowPhotoModal(false);
        setSelectedImage(null);
        setImagePreview(null);
        // Réinitialiser les inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
      }
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Erreur lors de l\'upload de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Supprimer la photo
  const handleDeletePhoto = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer votre photo de profil ?')) return;

    setUploadingPhoto(true);
    try {
      await api.delete(`/users/${id}/photo`);
      setUser(prev => ({ ...prev, photo_url: null }));
      setShowPhotoModal(false);
    } catch (err) {
      setPhotoError(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getRoleVariant = (role) => {
    const variants = {
      'admin': 'danger',
      'comptable': 'primary',
      'auditeur': 'warning',
      'juridique': 'success',
      'informatique': 'info',
      'inventoriste': 'purple',
      'gestionnaire': 'secondary'
    };
    return variants[role] || 'secondary';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'admin': <FiShield size={14} />,
      'comptable': <FiServer size={14} />,
      'auditeur': <FiEye size={14} />,
      'juridique': <FiCheckCircle size={14} />,
      'informatique': <FiServer size={14} />,
      'inventoriste': <FiSearch size={14} />,
      'gestionnaire': <FiUser size={14} />
    };
    return icons[role] || <FiUser size={14} />;
  };

  const getActionVariant = (action) => {
    const variants = {
      'CREATE': 'success',
      'UPDATE': 'warning',
      'DELETE': 'danger'
    };
    return variants[action] || 'secondary';
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREATE': 'Création',
      'UPDATE': 'Modification',
      'DELETE': 'Suppression'
    };
    return labels[action] || action;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'à l\'instant';
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours} h`;
    if (days < 7) return `il y a ${days} j`;
    return formatDate(date);
  };

  const getEntityName = (tableName) => {
    const names = {
      'users': 'Utilisateur',
      'actifs': 'Actif',
      'contrats': 'Contrat',
      'categories_amortissement': 'Catégorie',
      'audit_logs': 'Log'
    };
    return names[tableName] || tableName;
  };

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    .spin { animation: spin 1s linear infinite; }
    .photo-hover {
      transition: all 0.3s ease;
    }
    .photo-hover:hover {
      opacity: 0.85;
      transform: scale(1.02);
    }
    .camera-icon {
      transition: all 0.2s ease;
    }
    .camera-icon:hover {
      transform: scale(1.1);
    }
  `;

  if (loading) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p className="text-muted">Chargement...</p>
          </div>
        </Container>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="py-5 text-center">
          <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
            <Card.Body className="py-5">
              <FiUser size={48} className="text-danger mb-3" />
              <p className="text-danger">{error || 'Utilisateur non trouvé'}</p>
              <Button variant="primary" onClick={() => navigate('/utilisateurs')}>
                Retour à la liste
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1200px' }}>
        
        {/* Modal de suppression utilisateur */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiTrash2 size={18} /> Confirmer la suppression
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong className="text-danger">"{user?.full_name}"</strong> ?</p>
            <p className="text-muted small mb-0">Cette action est irréversible et supprimera toutes les données associées.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleDelete}>Confirmer la suppression</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal détails log */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
          <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiInfo size={18} /> Détails du log
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedLog && (
              <div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Action</span>
                  <Badge bg={getActionVariant(selectedLog.action)} className="bg-opacity-10 text-dark">
                    {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Table</span>
                  <span>{getEntityName(selectedLog.table_name)}</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">ID enregistrement</span>
                  <code className="bg-light px-2 py-1 rounded">{selectedLog.record_id}</code>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">Date</span>
                  <span>{formatDate(selectedLog.created_at)}</span>
                </div>
                <div className="d-flex justify-content-between py-2 border-bottom">
                  <span className="text-muted">IP</span>
                  <code className="bg-light px-2 py-1 rounded">{selectedLog.ip_address || '-'}</code>
                </div>
                {selectedLog.old_data && (
                  <div className="mt-3">
                    <strong className="d-block mb-2">Anciennes données</strong>
                    <pre className="bg-light p-3 rounded-3 small" style={{ maxHeight: '200px', overflow: 'auto', fontSize: '11px' }}>
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div className="mt-3">
                    <strong className="d-block mb-2">Nouvelles données</strong>
                    <pre className="bg-light p-3 rounded-3 small" style={{ maxHeight: '200px', overflow: 'auto', fontSize: '11px' }}>
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Fermer</Button>
          </Modal.Footer>
        </Modal>

        {/* Modal pour la photo de profil */}
        <Modal show={showPhotoModal} onHide={() => { setShowPhotoModal(false); setSelectedImage(null); setImagePreview(null); setPhotoError(''); }} centered size="md">
          <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiCamera size={18} /> Photo de profil
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center mb-4">
              {/* Prévisualisation */}
              {imagePreview ? (
                <div className="position-relative d-inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Prévisualisation" 
                    className="rounded-circle border shadow-sm"
                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  />
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="position-absolute bottom-0 end-0 rounded-circle p-1"
                    style={{ width: '30px', height: '30px' }}
                    onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                  >
                    <FiX size={16} />
                  </Button>
                </div>
              ) : (
                <div 
                  className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto border shadow-sm"
                  style={{ width: '150px', height: '150px', cursor: 'pointer' }}
                  onClick={handleOpenGallery}
                >
                  {user?.photo_url ? (
                    <img 
                      src={user.photo_url} 
                      alt={user.full_name} 
                      className="rounded-circle w-100 h-100"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <FiUser size={60} className="text-muted" />
                  )}
                </div>
              )}
            </div>

            {/* Boutons d'upload */}
            <div className="d-flex justify-content-center gap-3 mb-3">
              <Button 
                variant="outline-primary" 
                onClick={handleOpenGallery}
                className="d-flex align-items-center gap-2"
              >
                <FiImage size={16} /> Galerie
              </Button>
              <Button 
                variant="outline-success" 
                onClick={handleOpenCamera}
                className="d-flex align-items-center gap-2"
              >
                <FiCamera size={16} /> Appareil photo
              </Button>
            </div>

            {/* Inputs cachés */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="d-none"
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileSelect}
              className="d-none"
            />

            {/* Message d'erreur */}
            {photoError && (
              <Alert variant="danger" className="mt-3 small py-2">
                <FiAlertCircle size={14} className="me-1" /> {photoError}
              </Alert>
            )}

            {/* Bouton de suppression si l'utilisateur a déjà une photo */}
            {user?.photo_url && !imagePreview && (
              <div className="text-center mt-3">
                <Button 
                  variant="outline-danger" 
                  size="sm" 
                  onClick={handleDeletePhoto}
                  disabled={uploadingPhoto}
                >
                  <FiTrash2 size={14} className="me-1" /> Supprimer la photo
                </Button>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowPhotoModal(false); setSelectedImage(null); setImagePreview(null); setPhotoError(''); }}>
              Annuler
            </Button>
            {selectedImage && (
              <Button variant="primary" onClick={handleUploadPhoto} disabled={uploadingPhoto}>
                {uploadingPhoto ? <><Spinner size="sm" className="me-2" /> Envoi...</> : 'Enregistrer'}
              </Button>
            )}
          </Modal.Footer>
        </Modal>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <Button variant="outline-secondary" onClick={() => navigate('/utilisateurs')} className="mb-3 d-inline-flex align-items-center gap-2">
              <FiArrowLeft size={16} /> Retour
            </Button>
            <h1 className="h3 fw-bold mb-1">Détail de l'utilisateur</h1>
          </div>
          {can(['admin']) && (
            <div className="d-flex gap-2">
              <Button variant="warning" onClick={() => navigate(`/utilisateurs/modifier/${id}`)} className="d-flex align-items-center gap-2">
                <FiEdit size={14} /> Modifier
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteModal(true)} className="d-flex align-items-center gap-2">
                <FiTrash2 size={14} /> Supprimer
              </Button>
            </div>
          )}
        </div>

        {/* Onglets */}
        <Card className="border-0 shadow-sm rounded-3 mb-4">
          <Card.Body className="p-0">
            <Nav variant="tabs" defaultActiveKey="info" className="px-3 pt-2">
              <Nav.Item>
                <Nav.Link eventKey="info" onClick={() => setActiveTab('info')} className="d-flex align-items-center gap-2">
                  <FiUser size={14} /> Informations
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="activite" onClick={() => setActiveTab('activite')} className="d-flex align-items-center gap-2">
                  <FiActivity size={14} /> Activité récente
                </Nav.Link>
              </Nav.Item>
              {isAdmin && (
                <Nav.Item>
                  <Nav.Link eventKey="audit" onClick={() => setActiveTab('audit')} className="d-flex align-items-center gap-2">
                    <FiFileText size={14} /> Logs d'audit
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>
          </Card.Body>
        </Card>

        {/* Rafraîchir */}
        {(activeTab === 'activite' || activeTab === 'audit') && (
          <div className="d-flex justify-content-end mb-3">
            <Button variant="outline-secondary" size="sm" onClick={handleRefresh} className="d-flex align-items-center gap-2">
              <FiRefreshCw size={14} /> Rafraîchir
            </Button>
          </div>
        )}

        {/* Onglet Informations */}
        {activeTab === 'info' && (
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-4 mb-4 pb-3 border-bottom">
                {/* Photo de profil avec bouton de modification */}
                <div className="position-relative">
                  <div 
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold photo-hover"
                    style={{ width: '80px', height: '80px', fontSize: '2rem', cursor: canEditProfile ? 'pointer' : 'default', overflow: 'hidden' }}
                    onClick={() => canEditProfile && setShowPhotoModal(true)}
                  >
                    {user?.photo_url ? (
                      <img 
                        src={user.photo_url} 
                        alt={user.full_name} 
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      user.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {canEditProfile && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="position-absolute bottom-0 end-0 rounded-circle p-1 camera-icon"
                      style={{ width: '28px', height: '28px', fontSize: '12px' }}
                      onClick={() => setShowPhotoModal(true)}
                    >
                      <FiCamera size={12} />
                    </Button>
                  )}
                </div>
                <div>
                  <h2 className="h3 fw-bold mb-1">{user.full_name}</h2>
                  <p className="text-muted mb-2">{user.email}</p>
                  <Badge bg={getRoleVariant(user.role)} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: `var(--bs-${getRoleVariant(user.role)})` }}>
                    {getRoleIcon(user.role)} {user.role}
                  </Badge>
                </div>
              </div>

              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                    <FiCalendar size={20} className="text-primary mt-1" />
                    <div><span className="text-muted small d-block">Créé le</span><strong>{formatDate(user.created_at)}</strong></div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                    <FiClock size={20} className="text-warning mt-1" />
                    <div><span className="text-muted small d-block">Dernière modification</span><strong>{formatDate(user.updated_at)}</strong></div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                    <FiMail size={20} className="text-success mt-1" />
                    <div><span className="text-muted small d-block">Email vérifié</span><strong>{user.email_verified ? 'Oui' : 'Non'}</strong></div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-start gap-3 p-3 bg-light rounded-3">
                    <FiShield size={20} className="text-info mt-1" />
                    <div><span className="text-muted small d-block">Statut</span><strong>{user.actif ? 'Actif' : 'Inactif'}</strong></div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}

        {/* Onglet Activité récente */}
        {activeTab === 'activite' && (
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body>
              <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                <FiActivity size={16} /> Activité récente de {user.full_name}
              </h3>
              
              {loadingActivity ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" size="sm" className="mb-2" />
                  <p className="text-muted small">Chargement de l'activité...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FiActivity size={48} className="opacity-50 mb-3" />
                  <p>Aucune activité récente</p>
                </div>
              ) : (
                <div className="vstack gap-2">
                  {activities.map((activity) => (
                    <div key={activity.id} className="d-flex gap-3 p-3 bg-light rounded-3">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px', backgroundColor: `${activity.color}20`, color: activity.color }}>
                        <span>{activity.icon}</span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                          <span className="fw-semibold small">{activity.description}</span>
                          <small className="text-muted">{formatRelativeTime(activity.created_at)}</small>
                        </div>
                        <div className="d-flex gap-2 small text-muted">
                          <Badge bg="secondary" className="bg-opacity-10 text-dark">{getEntityName(activity.entity_type)}</Badge>
                          {activity.ip_address && <span><FiServer size={10} /> {activity.ip_address}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Onglet Logs d'audit */}
        {activeTab === 'audit' && isAdmin && (
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body>
              <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                <FiFileText size={16} /> Logs d'audit de {user.full_name}
              </h3>

              {/* Filtres */}
              <div className="d-flex gap-2 mb-3">
                <Button variant="outline-secondary" size="sm" onClick={() => setShowFilters(!showFilters)} className="d-flex align-items-center gap-2">
                  <FiSearch size={12} /> {showFilters ? 'Masquer filtres' : 'Afficher filtres'}
                </Button>
                {(filters.action || filters.table_name) && (
                  <Button variant="outline-danger" size="sm" onClick={resetFilters} className="d-flex align-items-center gap-2">
                    <FiX size={12} /> Réinitialiser
                  </Button>
                )}
              </div>

              {showFilters && (
                <div className="bg-light p-3 rounded-3 mb-3">
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label className="fw-semibold small text-muted">Action</Form.Label>
                      <Form.Select value={filters.action} onChange={(e) => handleFilterChange('action', e.target.value)}>
                        <option value="">Toutes</option>
                        <option value="CREATE">Création</option>
                        <option value="UPDATE">Modification</option>
                        <option value="DELETE">Suppression</option>
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="fw-semibold small text-muted">Table</Form.Label>
                      <Form.Select value={filters.table_name} onChange={(e) => handleFilterChange('table_name', e.target.value)}>
                        <option value="">Toutes</option>
                        <option value="users">Utilisateurs</option>
                        <option value="actifs">Actifs</option>
                        <option value="contrats">Contrats</option>
                        <option value="categories_amortissement">Catégories</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </div>
              )}

              {loadingAudit ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" size="sm" className="mb-2" />
                  <p className="text-muted small">Chargement des logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FiFileText size={48} className="opacity-50 mb-3" />
                  <p>Aucun log d'audit trouvé</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Action</th>
                          <th>Table</th>
                          <th>IP</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="text-nowrap small">{formatDate(log.created_at)}</td>
                            <td><Badge bg={getActionVariant(log.action)} className="bg-opacity-10 text-dark">{getActionLabel(log.action)}</Badge></td>
                            <td>{getEntityName(log.table_name)}</td>
                            <td><code className="small bg-light px-2 py-1 rounded">{log.ip_address || '-'}</code></td>
                            <td><Button variant="outline-primary" size="sm" onClick={() => viewLogDetails(log)} title="Voir détails"><FiEye size={14} /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="d-flex justify-content-center gap-3 mt-4 pt-2">
                      <Button variant="outline-secondary" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
                        <FiChevronLeft /> Précédent
                      </Button>
                      <span className="align-self-center small text-muted">Page {pagination.page} sur {pagination.totalPages}</span>
                      <Button variant="outline-secondary" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
                        Suivant <FiChevronRight />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Footer info */}
        <div className="text-center mt-4">
          <small className="text-muted d-flex align-items-center justify-content-center gap-2">
            <FiShield size={12} /> Données sécurisées — Conformité RGPD
          </small>
        </div>
      </Container>
    </>
  );
};

export default UtilisateurDetail;