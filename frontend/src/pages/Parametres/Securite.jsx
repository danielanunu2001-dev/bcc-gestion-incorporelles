import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiSave, FiShield, FiLock, FiClock, 
  FiEye, FiBell, FiMapPin, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiAlertTriangle, FiSmartphone, FiMail,
  FiZap, FiServer, FiDatabase, FiInfo
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner, Form, InputGroup, Nav, Tab } from 'react-bootstrap';

const Securite = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('authentification');
  const [settings, setSettings] = useState({
    deux_facteurs: false,
    deux_facteurs_method: 'email',
    session_timeout: 30,
    historique_connexions: true,
    notifications_connexion: true,
    ip_restriction: false,
    ip_whitelist: '',
    mdp_expiration: 90,
    tentative_connexion_max: 5,
    verrouillage_temporaire: 30
  });

  useEffect(() => {
    loadSettingsFromLocalStorage();
  }, []);

  const loadSettingsFromLocalStorage = () => {
    try {
      setLoading(true);
      const saved = localStorage.getItem('security_settings');
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch (err) {
      console.error('Erreur chargement paramètres:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      localStorage.setItem('security_settings', JSON.stringify(settings));
      setSuccess('Paramètres de sécurité enregistrés avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      setError('Erreur lors de l\'enregistrement des paramètres');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      deux_facteurs: false,
      deux_facteurs_method: 'email',
      session_timeout: 30,
      historique_connexions: true,
      notifications_connexion: true,
      ip_restriction: false,
      ip_whitelist: '',
      mdp_expiration: 90,
      tentative_connexion_max: 5,
      verrouillage_temporaire: 30
    });
  };

  const tabs = [
    { id: 'authentification', label: 'Authentification', icon: <FiLock size={14} /> },
    { id: 'session', label: 'Session', icon: <FiClock size={14} /> },
    { id: 'mdp', label: 'Mots de passe', icon: <FiShield size={14} /> },
    { id: 'surveillance', label: 'Surveillance', icon: <FiEye size={14} /> },
    { id: 'ip', label: 'Restriction IP', icon: <FiMapPin size={14} /> }
  ];

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
        <p className="text-muted">Chargement de vos paramètres de sécurité...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4 px-3 px-md-4" style={{ maxWidth: '1000px' }}>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
        <div>
          <Button variant="outline-secondary" onClick={() => navigate('/parametres')} className="mb-3 d-inline-flex align-items-center gap-2">
            <FiArrowLeft size={16} /> Retour
          </Button>
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-circle bg-primary bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px' }}>
              <FiShield size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="h3 fw-bold mb-1">Sécurité</h1>
              <p className="text-muted small mb-0">Gérez les paramètres de sécurité de votre compte</p>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={handleReset} className="d-flex align-items-center gap-2">
            <FiRefreshCw size={14} /> Réinitialiser
          </Button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3">
          <div className="d-flex align-items-center gap-2"><FiCheckCircle size={18} /><span>{success}</span></div>
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
          <div className="d-flex align-items-center gap-2"><FiXCircle size={18} /><span>{error}</span></div>
        </Alert>
      )}

      {/* Onglets */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-0">
          <Nav variant="tabs" defaultActiveKey="authentification" className="px-3 pt-2">
            {tabs.map(tab => (
              <Nav.Item key={tab.id}>
                <Nav.Link eventKey={tab.id} onClick={() => setActiveTab(tab.id)} className="d-flex align-items-center gap-2">
                  {tab.icon} {tab.label}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </Card.Body>
      </Card>

      <form onSubmit={handleSubmit}>
        
        {/* Authentification */}
        {activeTab === 'authentification' && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-circle bg-primary bg-opacity-10 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                  <FiLock size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="h6 fw-semibold mb-0">Authentification</h3>
                  <p className="small text-muted mb-0">Renforcez la sécurité de votre compte</p>
                </div>
              </div>
              
              <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-3" style={{ backgroundColor: '#f8fafc' }}>
                <Form.Check type="checkbox" id="deux_facteurs" name="deux_facteurs" checked={settings.deux_facteurs} onChange={handleChange} className="mt-1" />
                <label htmlFor="deux_facteurs" className="d-flex gap-2 flex-grow-1">
                  <FiShield size={16} className="text-primary flex-shrink-0" />
                  <div><strong className="d-block">Authentification à deux facteurs (2FA)</strong><small className="text-muted">Ajoute une couche de sécurité supplémentaire</small></div>
                </label>
              </div>

              {settings.deux_facteurs && (
                <div className="ms-4 ps-3 border-start ps-3">
                  <div className="d-flex gap-3">
                    <Form.Check type="radio" name="deux_facteurs_method" value="email" checked={settings.deux_facteurs_method === 'email'} onChange={handleChange} label={<><FiMail size={14} className="me-1" /> Par email</>} />
                    <Form.Check type="radio" name="deux_facteurs_method" value="sms" checked={settings.deux_facteurs_method === 'sms'} onChange={handleChange} label={<><FiSmartphone size={14} className="me-1" /> Par SMS</>} />
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Session */}
        {activeTab === 'session' && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-circle bg-warning bg-opacity-10 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                  <FiClock size={20} className="text-warning" />
                </div>
                <div>
                  <h3 className="h6 fw-semibold mb-0">Gestion des sessions</h3>
                  <p className="small text-muted mb-0">Contrôlez la durée et la sécurité de vos sessions</p>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <label className="fw-semibold small text-muted" style={{ minWidth: '220px' }}>Délai d'expiration de session</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="number" name="session_timeout" value={settings.session_timeout} onChange={handleChange} min="5" max="120" step="5" className="form-control" style={{ width: '80px' }} />
                  <span className="text-muted small">minutes d'inactivité avant déconnexion</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Politique des mots de passe */}
        {activeTab === 'mdp' && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-circle bg-success bg-opacity-10 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                  <FiShield size={20} className="text-success" />
                </div>
                <div>
                  <h3 className="h6 fw-semibold mb-0">Politique des mots de passe</h3>
                  <p className="small text-muted mb-0">Configurez les règles de sécurité des mots de passe</p>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
                <label className="fw-semibold small text-muted" style={{ minWidth: '220px' }}>Expiration du mot de passe</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="number" name="mdp_expiration" value={settings.mdp_expiration} onChange={handleChange} min="30" max="365" step="30" className="form-control" style={{ width: '80px' }} />
                  <span className="text-muted small">jours avant expiration</span>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
                <label className="fw-semibold small text-muted" style={{ minWidth: '220px' }}>Tentatives de connexion max</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="number" name="tentative_connexion_max" value={settings.tentative_connexion_max} onChange={handleChange} min="3" max="10" className="form-control" style={{ width: '80px' }} />
                  <span className="text-muted small">avant verrouillage</span>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <label className="fw-semibold small text-muted" style={{ minWidth: '220px' }}>Durée de verrouillage</label>
                <div className="d-flex align-items-center gap-2">
                  <input type="number" name="verrouillage_temporaire" value={settings.verrouillage_temporaire} onChange={handleChange} min="5" max="120" step="5" className="form-control" style={{ width: '80px' }} />
                  <span className="text-muted small">minutes après trop de tentatives</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Surveillance */}
        {activeTab === 'surveillance' && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-circle bg-info bg-opacity-10 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                  <FiEye size={20} className="text-info" />
                </div>
                <div>
                  <h3 className="h6 fw-semibold mb-0">Surveillance et alertes</h3>
                  <p className="small text-muted mb-0">Recevez des alertes sur l'activité de votre compte</p>
                </div>
              </div>
              
              <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-3" style={{ backgroundColor: '#f8fafc' }}>
                <Form.Check type="checkbox" id="historique_connexions" name="historique_connexions" checked={settings.historique_connexions} onChange={handleChange} className="mt-1" />
                <label htmlFor="historique_connexions" className="d-flex gap-2 flex-grow-1">
                  <FiClock size={16} className="text-info flex-shrink-0" />
                  <div><strong className="d-block">Historique des connexions</strong><small className="text-muted">Conserver l'historique complet des connexions</small></div>
                </label>
              </div>
              
              <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ backgroundColor: '#f8fafc' }}>
                <Form.Check type="checkbox" id="notifications_connexion" name="notifications_connexion" checked={settings.notifications_connexion} onChange={handleChange} className="mt-1" />
                <label htmlFor="notifications_connexion" className="d-flex gap-2 flex-grow-1">
                  <FiBell size={16} className="text-warning flex-shrink-0" />
                  <div><strong className="d-block">Alertes de connexion</strong><small className="text-muted">Notifier en cas de nouvelle connexion</small></div>
                </label>
              </div>
            </Card.Body>
          </Card>
        )}

        {/* Restriction IP */}
        {activeTab === 'ip' && (
          <Card className="border-0 shadow-sm rounded-3 mb-4">
            <Card.Body className="p-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="rounded-circle bg-danger bg-opacity-10 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                  <FiMapPin size={20} className="text-danger" />
                </div>
                <div>
                  <h3 className="h6 fw-semibold mb-0">Restriction IP</h3>
                  <p className="small text-muted mb-0">Limitez l'accès à des adresses IP spécifiques</p>
                </div>
              </div>
              
              <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-3" style={{ backgroundColor: '#f8fafc' }}>
                <Form.Check type="checkbox" id="ip_restriction" name="ip_restriction" checked={settings.ip_restriction} onChange={handleChange} className="mt-1" />
                <label htmlFor="ip_restriction" className="d-flex gap-2 flex-grow-1">
                  <FiMapPin size={16} className="text-danger flex-shrink-0" />
                  <div><strong className="d-block">Restriction par adresse IP</strong><small className="text-muted">Limiter l'accès à certaines IP seulement</small></div>
                </label>
              </div>

              {settings.ip_restriction && (
                <div className="ms-4 ps-3 border-start">
                  <Form.Label className="fw-semibold small text-muted">Liste blanche d'IP (une par ligne)</Form.Label>
                  <Form.Control as="textarea" name="ip_whitelist" value={settings.ip_whitelist} onChange={handleChange} placeholder="192.168.1.1&#10;10.0.0.1&#10;::1" rows="3" style={{ fontFamily: 'monospace' }} />
                  <small className="text-muted d-flex align-items-center gap-1 mt-1"><FiAlertTriangle size={12} /> Séparez chaque IP par un saut de ligne</small>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Actions */}
        <div className="d-flex gap-3 justify-content-end mt-3">
          <Button variant="secondary" onClick={() => navigate('/parametres')}>Annuler</Button>
          <Button variant="primary" type="submit" disabled={saving} className="d-flex align-items-center gap-2">
            {saving ? <><Spinner as="span" size="sm" animation="border" className="spinner-border-sm" /> Enregistrement...</> : <><FiSave size={14} /> Enregistrer</>}
          </Button>
        </div>
      </form>

      {/* Note d'information */}
      <div className="text-center mt-4">
        <small className="text-muted d-flex align-items-center justify-content-center gap-2">
          <FiShield size={12} /> Paramètres de sécurité — Recommandations selon les normes BCC
        </small>
      </div>
    </Container>
  );
};

export default Securite;