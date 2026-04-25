import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../../store/usersSlice';
import {
  FiUsers, FiPlus, FiEdit2, FiTrash2, FiUser,
  FiSearch, FiRefreshCw, FiEye, FiMail, FiCalendar, FiClock, FiShield,
  FiFilter, FiX, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import api from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Modal } from 'react-bootstrap';

const UtilisateursList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector((state) => state.auth || { user: null });
  const role = currentUser?.role || 'guest';
  const canViewUsers = ['admin'].includes(role);
  
  const { users, loading, error } = useSelector((state) => state.users);
  
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (canViewUsers) {
      dispatch(fetchUsers());
    }
  }, [dispatch, canViewUsers]);

  useEffect(() => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/users/${userToDelete.id}`);
      if (canViewUsers) {
        dispatch(fetchUsers());
      }
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
    setShowDeleteModal(false);
    setUserToDelete(null);
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
      'admin': <FiShield size={12} />,
      'comptable': <FiCheckCircle size={12} />,
      'auditeur': <FiEye size={12} />,
      'juridique': <FiShield size={12} />,
      'informatique': <FiUser size={12} />,
      'inventoriste': <FiUser size={12} />,
      'gestionnaire': <FiUser size={12} />
    };
    return icons[role] || <FiUser size={12} />;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
    .fade-in { animation: fadeIn 0.3s ease-out; }
    .spin { animation: spin 1s linear infinite; }
    .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  `;

  if (!canViewUsers) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="py-5">
          <Card className="border-0 shadow-sm text-center bg-danger bg-opacity-10">
            <Card.Body className="py-5">
              <FiShield size={48} className="text-danger mb-3" />
              <h2 className="text-danger">Accès non autorisé</h2>
              <p className="text-muted">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
              <p className="text-muted small">Cette section est réservée aux administrateurs.</p>
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </>
    );
  }

  if (loading && users.length === 0) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p className="text-muted">Chargement des utilisateurs...</p>
          </div>
        </Container>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      <Container fluid className="py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '1200px' }}>
        
        {/* Modal de confirmation suppression */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton className="bg-danger text-white">
            <Modal.Title className="d-flex align-items-center gap-2">
              <FiTrash2 size={18} /> Confirmer la suppression
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong className="text-danger">"{userToDelete?.full_name}"</strong> ?</p>
            <p className="text-muted small mb-0">Cette action est irréversible et supprimera toutes les données associées.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Annuler</Button>
            <Button variant="danger" onClick={confirmDelete}>Confirmer la suppression</Button>
          </Modal.Footer>
        </Modal>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="h2 fw-bold text-primary mb-1 d-flex align-items-center gap-2">
              <FiUsers size={28} /> Gestion des utilisateurs
            </h1>
            <p className="text-muted small mb-0">
              {filteredUsers.length} utilisateur(s) sur {users.length}
            </p>
          </div>
          <div className="d-flex gap-2">
            <div className="btn-group" role="group">
              <Button 
                variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'} 
                size="sm" 
                onClick={() => setViewMode('grid')}
                className="d-flex align-items-center gap-1"
              >
                🃏 Cartes
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'primary' : 'outline-secondary'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="d-flex align-items-center gap-1"
              >
                📋 Liste
              </Button>
            </div>
            <Button variant="outline-secondary" size="sm" onClick={() => dispatch(fetchUsers())} className="d-flex align-items-center gap-1">
              <FiRefreshCw size={14} />
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/utilisateurs/nouveau')} className="d-flex align-items-center gap-2">
              <FiPlus size={14} /> Nouvel utilisateur
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <Alert variant="danger" dismissible className="mb-3">
            <div className="d-flex align-items-center gap-2">
              <FiAlertCircle size={18} />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        {/* Filtres */}
        <Card className="border-0 shadow-sm rounded-3 mb-4">
          <Card.Body className="p-3">
            <div className="d-flex gap-3 flex-wrap align-items-center">
              <div className="flex-grow-1" style={{ minWidth: '250px' }}>
                <InputGroup>
                  <InputGroup.Text className="bg-white border-end-0">
                    <FiSearch className="text-muted" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0"
                  />
                  {searchTerm && (
                    <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                      <FiX size={14} />
                    </Button>
                  )}
                </InputGroup>
              </div>
              <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 border" style={{ backgroundColor: '#f8fafc' }}>
                <FiFilter size={14} className="text-muted" />
                <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="border-0 bg-transparent w-auto" style={{ fontSize: '0.875rem' }}>
                  <option value="">Tous les rôles</option>
                  <option value="admin">Administrateur</option>
                  <option value="comptable">Comptable</option>
                  <option value="auditeur">Auditeur</option>
                  <option value="juridique">Juridique</option>
                  <option value="informatique">Informatique</option>
                  <option value="inventoriste">Inventoriste</option>
                  <option value="gestionnaire">Gestionnaire</option>
                </Form.Select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Vue Grille */}
        {viewMode === 'grid' && (
          <Row className="g-4">
            {filteredUsers.map((user) => (
              <Col key={user.id} xs={12} md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-3 h-100 card-hover">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="btn-group">
                        <Button variant="outline-warning" size="sm" onClick={() => navigate(`/utilisateurs/modifier/${user.id}`)} title="Modifier">
                          <FiEdit2 size={14} />
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(user)} title="Supprimer">
                          <FiTrash2 size={14} />
                        </Button>
                        <Button variant="outline-primary" size="sm" onClick={() => navigate(`/utilisateurs/${user.id}`)} title="Voir détails">
                          <FiEye size={14} />
                        </Button>
                      </div>
                    </div>
                    <h5 className="h6 fw-semibold mb-1" style={{ color: '#ffffff' }}>{user.full_name}</h5>
                    <div className="d-flex align-items-center gap-1 small mb-2" style={{ color: '#ffffff' }}>
                      <FiMail size={12} style={{ color: '#ffffff' }} /> <span style={{ color: '#ffffff' }}>{user.email}</span>
                    </div>
                    <Badge bg={getRoleVariant(user.role)} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1 mb-3" style={{ color: `var(--bs-${getRoleVariant(user.role)})` }}>
                      {getRoleIcon(user.role)} {user.role}
                    </Badge>
                    <div className="border-top pt-2 mt-2">
                      <div className="d-flex align-items-center gap-2 small mb-1" style={{ color: '#ffffff' }}>
                        <FiCalendar size={12} style={{ color: '#ffffff' }} /> Créé le <span style={{ color: '#ffffff' }}>{formatDate(user.created_at)}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 small" style={{ color: '#ffffff' }}>
                        <FiClock size={12} style={{ color: '#ffffff' }} /> Modifié le <span style={{ color: '#ffffff' }}>{formatDate(user.updated_at)}</span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Vue Liste */}
        {viewMode === 'list' && (
          <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Date création</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                            {user.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="fw-semibold" style={{ color: '#ffffff' }}>{user.full_name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#ffffff' }}>{user.email}</td>
                      <td>
                        <Badge bg={getRoleVariant(user.role)} className="bg-opacity-10 d-inline-flex align-items-center gap-1 px-2 py-1" style={{ color: `var(--bs-${getRoleVariant(user.role)})` }}>
                          {getRoleIcon(user.role)} {user.role}
                        </Badge>
                      </td>
                      <td style={{ color: '#ffffff' }}>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Button variant="outline-warning" onClick={() => navigate(`/utilisateurs/modifier/${user.id}`)} title="Modifier">
                            <FiEdit2 size={14} />
                          </Button>
                          <Button variant="outline-danger" onClick={() => handleDeleteClick(user)} title="Supprimer">
                            <FiTrash2 size={14} />
                          </Button>
                          <Button variant="outline-primary" onClick={() => navigate(`/utilisateurs/${user.id}`)} title="Voir détails">
                            <FiEye size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {filteredUsers.length === 0 && !loading && (
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body className="text-center py-5">
              <FiUsers size={48} className="text-muted opacity-50 mb-3" />
              <p className="text-muted">Aucun utilisateur trouvé</p>
            </Card.Body>
          </Card>
        )}

        {/* Footer info */}
        <div className="text-center mt-4">
          <small className="text-muted d-flex align-items-center justify-content-center gap-2">
            <FiShield size={12} /> Gestion sécurisée — Conformité RGPD
          </small>
        </div>
      </Container>
    </>
  );
};

export default UtilisateursList;