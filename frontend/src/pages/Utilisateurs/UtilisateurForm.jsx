import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiSave, FiX, FiUser, FiMail, FiLock,
  FiShield, FiArrowLeft, FiAlertCircle,
  FiCheckCircle, FiEye, FiEyeOff, FiInfo
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';

const UtilisateurForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { can } = usePermissions();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'gestionnaire',
    password: '',
    confirm_password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      chargerUtilisateur();
    }
  }, [id]);

  const chargerUtilisateur = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${id}`);
      setFormData({
        full_name: res.data.full_name,
        email: res.data.email,
        role: res.data.role,
        password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.full_name?.trim()) {
      errors.full_name = 'Le nom complet est requis';
    }

    if (!formData.email?.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email invalide';
    }

    if (!isEditMode && !formData.password) {
      errors.password = 'Le mot de passe est requis';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      } else if (formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Les mots de passe ne correspondent pas';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role
      };

      if (formData.password) {
        dataToSend.password = formData.password;
      }

      if (isEditMode) {
        await api.put(`/users/${id}`, dataToSend);
        setSuccess('Utilisateur modifié avec succès');
      } else {
        await api.post('/users', dataToSend);
        setSuccess('Utilisateur créé avec succès');
      }

      setTimeout(() => navigate('/utilisateurs'), 2000);
    } catch (err) {
      console.error('Erreur complète:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const backendErrors = {};
        err.response.data.errors.forEach(e => {
          backendErrors[e.param] = e.msg;
        });
        setValidationErrors(backendErrors);
      } else {
        setError('Une erreur est survenue lors de l\'enregistrement');
      }
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'admin', label: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', variant: 'danger', icon: <FiShield size={14} /> },
    { value: 'comptable', label: 'Comptable', description: 'Gestion des actifs et amortissements', variant: 'primary', icon: <FiCheckCircle size={14} /> },
    { value: 'auditeur', label: 'Auditeur', description: 'Consultation seule + accès aux logs', variant: 'warning', icon: <FiEye size={14} /> },
    { value: 'juridique', label: 'Juridique', description: 'Gestion des contrats et aspects légaux', variant: 'success', icon: <FiShield size={14} /> },
    { value: 'informatique', label: 'Informatique', description: 'Gestion du parc informatique', variant: 'info', icon: <FiShield size={14} /> },
    { value: 'inventoriste', label: 'Inventoriste', description: 'Inventaire physique avec application mobile', variant: 'purple', icon: <FiShield size={14} /> },
    { value: 'gestionnaire', label: 'Gestionnaire', description: 'Gestion courante des actifs', variant: 'secondary', icon: <FiUser size={14} /> }
  ];

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.3s ease-out; }
  `;

  if (!can(['admin'])) {
    return (
      <>
        <style>{animationStyles}</style>
        <Container className="py-5">
          <Card className="border-0 shadow-sm text-center bg-danger bg-opacity-10">
            <Card.Body className="py-5">
              <FiShield size={48} className="text-danger mb-3" />
              <h2 className="text-danger">Accès refusé</h2>
              <p className="text-muted">Vous n'avez pas les droits pour accéder à cette page.</p>
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
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
      <Container className="py-4 px-3 px-md-4 fade-in" style={{ maxWidth: '800px' }}>
        
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <Button variant="outline-secondary" onClick={() => navigate('/utilisateurs')} className="d-flex align-items-center gap-2">
            <FiArrowLeft size={16} /> Retour
          </Button>
          <h1 className="h3 fw-bold mb-0">
            {isEditMode ? 'Modifier un utilisateur' : 'Nouvel utilisateur'}
          </h1>
        </div>

        {/* Messages */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
            <div className="d-flex align-items-center gap-2">
              <FiAlertCircle size={18} />
              <span>{error}</span>
            </div>
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3">
            <div className="d-flex align-items-center gap-2">
              <FiCheckCircle size={18} />
              <span>{success} Redirection...</span>
            </div>
          </Alert>
        )}

        {/* Formulaire */}
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Body className="p-4">
            <form onSubmit={handleSubmit}>
              
              {/* Informations générales */}
              <div className="mb-4 pb-3 border-bottom">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiUser size={16} className="text-primary" /> Informations générales
                </h3>
                
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold d-flex align-items-center gap-1">
                    Nom complet <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Jean Dupont"
                    isInvalid={!!validationErrors.full_name}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.full_name}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold d-flex align-items-center gap-1">
                    <FiMail size={14} /> Email <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jean.dupont@bcc.cd"
                    isInvalid={!!validationErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </div>

              {/* Rôle et permissions */}
              <div className="mb-4 pb-3 border-bottom">
                <h3 className="h6 fw-semibold mb-3 d-flex align-items-center gap-2">
                  <FiShield size={16} className="text-primary" /> Rôle et permissions
                </h3>
                
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Rôle <span className="text-danger">*</span></Form.Label>
                  <Form.Select name="role" value={formData.role} onChange={handleChange}>
                    {roles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Form.Select>
                  <div className="mt-2 p-2 bg-light rounded-2">
                    <small className="text-muted d-flex align-items-center gap-2">
                      <FiInfo size={12} />
                      {roles.find(r => r.value === formData.role)?.description}
                    </small>
                  </div>
                </Form.Group>
              </div>

              {/* Mot de passe */}
              <div className="mb-4">
                <h3 className="h6 fw-semibold mb-2 d-flex align-items-center gap-2">
                  <FiLock size={16} className="text-primary" /> {isEditMode ? 'Changer le mot de passe' : 'Mot de passe'}
                </h3>
                <p className="small text-muted mb-3">
                  {isEditMode 
                    ? 'Laissez vide pour conserver le mot de passe actuel'
                    : 'Le mot de passe doit contenir au moins 6 caractères'}
                </p>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    {isEditMode ? 'Nouveau mot de passe' : 'Mot de passe'}
                    {!isEditMode && <span className="text-danger ms-1">*</span>}
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      isInvalid={!!validationErrors.password}
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="d-flex align-items-center"
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </Button>
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.password}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">
                    Confirmer le mot de passe
                    {!isEditMode && <span className="text-danger ms-1">*</span>}
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      isInvalid={!!validationErrors.confirm_password}
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="d-flex align-items-center"
                    >
                      {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </Button>
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.confirm_password}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </div>

              {/* Boutons */}
              <div className="d-flex gap-3 justify-content-end pt-3 border-top">
                <Button variant="secondary" onClick={() => navigate('/utilisateurs')} disabled={loading} className="d-flex align-items-center gap-2">
                  <FiX size={14} /> Annuler
                </Button>
                <Button type="submit" variant="success" disabled={loading} className="d-flex align-items-center gap-2">
                  {loading ? (
                    <>
                      <Spinner as="span" size="sm" animation="border" className="spinner-border-sm" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <FiSave size={14} /> {isEditMode ? 'Modifier' : 'Créer'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>

        {/* Footer info */}
        <div className="text-center mt-3">
          <small className="text-muted d-flex align-items-center justify-content-center gap-2">
            <FiShield size={12} /> Les mots de passe sont cryptés et stockés de manière sécurisée
          </small>
        </div>
      </Container>
    </>
  );
};

export default UtilisateurForm;