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

  const animationStyles = `
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-slide-up {
      animation: fadeSlideUp 0.4s ease-out;
    }
    .form-control-white {
      background-color: rgba(255,255,255,0.9) !important;
      color: #000000 !important;
    }
    .form-control-white::placeholder {
      color: #6c757d !important;
    }
    .nav-tabs-custom {
      border-bottom: none !important;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border-radius: 12px 12px 0 0;
      padding: 0.5rem 1rem 0 1rem;
    }
    .nav-tabs-custom .nav-link {
      color: rgba(255,255,255,0.7) !important;
      border: none !important;
      background: transparent !important;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    .nav-tabs-custom .nav-link:hover {
      color: white !important;
      background: rgba(255,255,255,0.1) !important;
      border-radius: 8px 8px 0 0;
    }
    .nav-tabs-custom .nav-link.active {
      color: white !important;
      background: rgba(255,255,255,0.2) !important;
      border-bottom: 2px solid white !important;
      border-radius: 8px 8px 0 0;
    }
  `;

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
      <>
        <style>{animationStyles}</style>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
          <Container className="py-5 text-center fade-slide-up">
            <Spinner animation="border" variant="light" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
            <p style={{ color: 'white' }}>Chargement de vos paramètres de sécurité...</p>
          </Container>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationStyles}</style>
      
      {/* Fond dégradé comme les autres pages */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh' }}>
        <Container className="py-4 px-3 px-md-4 fade-slide-up" style={{ maxWidth: '1000px' }}>
          
          {/* Header */}
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
            <div>
              <Button variant="light" onClick={() => navigate('/parametres')} className="mb-3 d-inline-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
                <FiArrowLeft size={16} /> Retour
              </Button>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <FiShield size={28} color="white" />
                </div>
                <div>
                  <h1 className="h3 fw-bold mb-1" style={{ color: 'white' }}>Sécurité</h1>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Gérez les paramètres de sécurité de votre compte</p>
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button variant="light" onClick={handleReset} className="d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
                <FiRefreshCw size={14} /> Réinitialiser
              </Button>
            </div>
          </div>

          {/* Messages */}
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3" style={{ backgroundColor: '#d1fae5', borderColor: '#10b981', color: '#065f46' }}>
              <div className="d-flex align-items-center gap-2"><FiCheckCircle size={18} /><span>{success}</span></div>
            </Alert>
          )}
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' }}>
              <div className="d-flex align-items-center gap-2"><FiXCircle size={18} /><span>{error}</span></div>
            </Alert>
          )}

          {/* Onglets avec nouvelle couleur */}
          <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ backgroundColor: 'transparent', overflow: 'hidden' }}>
            <Card.Body className="p-0">
              <Nav variant="tabs" defaultActiveKey="authentification" className="nav-tabs-custom">
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
              <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-primary bg-opacity-25 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                      <FiLock size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <h3 className="h6 fw-semibold mb-0" style={{ color: 'white' }}>Authentification</h3>
                      <p className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Renforcez la sécurité de votre compte</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <Form.Check type="checkbox" id="deux_facteurs" name="deux_facteurs" checked={settings.deux_facteurs} onChange={handleChange} className="mt-1" style={{ color: 'white' }} />
                    <label htmlFor="deux_facteurs" className="d-flex gap-2 flex-grow-1" style={{ color: 'white' }}>
                      <FiShield size={16} className="flex-shrink-0" style={{ color: 'white' }} />
                      <div><strong className="d-block" style={{ color: 'white' }}>Authentification à deux facteurs (2FA)</strong><small style={{ color: 'rgba(255,255,255,0.7)' }}>Ajoute une couche de sécurité supplémentaire</small></div>
                    </label>
                  </div>

                  {settings.deux_facteurs && (
                    <div className="ms-4 ps-3 border-start ps-3" style={{ borderLeftColor: 'rgba(255,255,255,0.3)' }}>
                      <div className="d-flex gap-3">
                        <Form.Check type="radio" name="deux_facteurs_method" value="email" checked={settings.deux_facteurs_method === 'email'} onChange={handleChange} label={<span style={{ color: 'white' }}><FiMail size={14} className="me-1" /> Par email</span>} />
                        <Form.Check type="radio" name="deux_facteurs_method" value="sms" checked={settings.deux_facteurs_method === 'sms'} onChange={handleChange} label={<span style={{ color: 'white' }}><FiSmartphone size={14} className="me-1" /> Par SMS</span>} />
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Session */}
            {activeTab === 'session' && (
              <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-warning bg-opacity-25 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                      <FiClock size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <h3 className="h6 fw-semibold mb-0" style={{ color: 'white' }}>Gestion des sessions</h3>
                      <p className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Contrôlez la durée et la sécurité de vos sessions</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <label className="fw-semibold small" style={{ minWidth: '220px', color: 'white' }}>Délai d'expiration de session</label>
                    <div className="d-flex align-items-center gap-2">
                      <input type="number" name="session_timeout" value={settings.session_timeout} onChange={handleChange} min="5" max="120" step="5" className="form-control" style={{ width: '80px', color: '#000000', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>minutes d'inactivité avant déconnexion</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Politique des mots de passe */}
            {activeTab === 'mdp' && (
              <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-success bg-opacity-25 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                      <FiShield size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <h3 className="h6 fw-semibold mb-0" style={{ color: 'white' }}>Politique des mots de passe</h3>
                      <p className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Configurez les règles de sécurité des mots de passe</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
                    <label className="fw-semibold small" style={{ minWidth: '220px', color: 'white' }}>Expiration du mot de passe</label>
                    <div className="d-flex align-items-center gap-2">
                      <input type="number" name="mdp_expiration" value={settings.mdp_expiration} onChange={handleChange} min="30" max="365" step="30" className="form-control" style={{ width: '80px', color: '#000000', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>jours avant expiration</span>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3 flex-wrap mb-3">
                    <label className="fw-semibold small" style={{ minWidth: '220px', color: 'white' }}>Tentatives de connexion max</label>
                    <div className="d-flex align-items-center gap-2">
                      <input type="number" name="tentative_connexion_max" value={settings.tentative_connexion_max} onChange={handleChange} min="3" max="10" className="form-control" style={{ width: '80px', color: '#000000', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>avant verrouillage</span>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <label className="fw-semibold small" style={{ minWidth: '220px', color: 'white' }}>Durée de verrouillage</label>
                    <div className="d-flex align-items-center gap-2">
                      <input type="number" name="verrouillage_temporaire" value={settings.verrouillage_temporaire} onChange={handleChange} min="5" max="120" step="5" className="form-control" style={{ width: '80px', color: '#000000', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>minutes après trop de tentatives</span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Surveillance */}
            {activeTab === 'surveillance' && (
              <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-info bg-opacity-25 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                      <FiEye size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <h3 className="h6 fw-semibold mb-0" style={{ color: 'white' }}>Surveillance et alertes</h3>
                      <p className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Recevez des alertes sur l'activité de votre compte</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <Form.Check type="checkbox" id="historique_connexions" name="historique_connexions" checked={settings.historique_connexions} onChange={handleChange} className="mt-1" style={{ color: 'white' }} />
                    <label htmlFor="historique_connexions" className="d-flex gap-2 flex-grow-1" style={{ color: 'white' }}>
                      <FiClock size={16} className="flex-shrink-0" style={{ color: 'white' }} />
                      <div><strong className="d-block" style={{ color: 'white' }}>Historique des connexions</strong><small style={{ color: 'rgba(255,255,255,0.7)' }}>Conserver l'historique complet des connexions</small></div>
                    </label>
                  </div>
                  
                  <div className="d-flex align-items-start gap-3 p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <Form.Check type="checkbox" id="notifications_connexion" name="notifications_connexion" checked={settings.notifications_connexion} onChange={handleChange} className="mt-1" style={{ color: 'white' }} />
                    <label htmlFor="notifications_connexion" className="d-flex gap-2 flex-grow-1" style={{ color: 'white' }}>
                      <FiBell size={16} className="flex-shrink-0" style={{ color: 'white' }} />
                      <div><strong className="d-block" style={{ color: 'white' }}>Alertes de connexion</strong><small style={{ color: 'rgba(255,255,255,0.7)' }}>Notifier en cas de nouvelle connexion</small></div>
                    </label>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Restriction IP */}
            {activeTab === 'ip' && (
              <Card className="border-0 shadow-sm rounded-3 mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <div className="rounded-circle bg-danger bg-opacity-25 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                      <FiMapPin size={20} style={{ color: 'white' }} />
                    </div>
                    <div>
                      <h3 className="h6 fw-semibold mb-0" style={{ color: 'white' }}>Restriction IP</h3>
                      <p className="small" style={{ color: 'rgba(255,255,255,0.7)' }}>Limitez l'accès à des adresses IP spécifiques</p>
                    </div>
                  </div>
                  
                  <div className="d-flex align-items-start gap-3 p-3 rounded-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <Form.Check type="checkbox" id="ip_restriction" name="ip_restriction" checked={settings.ip_restriction} onChange={handleChange} className="mt-1" style={{ color: 'white' }} />
                    <label htmlFor="ip_restriction" className="d-flex gap-2 flex-grow-1" style={{ color: 'white' }}>
                      <FiMapPin size={16} className="flex-shrink-0" style={{ color: 'white' }} />
                      <div><strong className="d-block" style={{ color: 'white' }}>Restriction par adresse IP</strong><small style={{ color: 'rgba(255,255,255,0.7)' }}>Limiter l'accès à certaines IP seulement</small></div>
                    </label>
                  </div>

                  {settings.ip_restriction && (
                    <div className="ms-4 ps-3 border-start" style={{ borderLeftColor: 'rgba(255,255,255,0.3)' }}>
                      <Form.Label className="fw-semibold small" style={{ color: 'white' }}>Liste blanche d'IP (une par ligne)</Form.Label>
                      <Form.Control as="textarea" name="ip_whitelist" value={settings.ip_whitelist} onChange={handleChange} placeholder="192.168.1.1&#10;10.0.0.1&#10;::1" rows="3" style={{ fontFamily: 'monospace', color: '#000000', backgroundColor: 'rgba(255,255,255,0.9)' }} />
                      <small className="d-flex align-items-center gap-1 mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}><FiAlertTriangle size={12} /> Séparez chaque IP par un saut de ligne</small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Actions */}
            <div className="d-flex gap-3 justify-content-end mt-3">
              <Button variant="light" onClick={() => navigate('/parametres')} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}>Annuler</Button>
              <Button variant="primary" type="submit" disabled={saving} className="d-flex align-items-center gap-2" style={{ backgroundColor: '#0d6efd', borderColor: '#0d6efd', color: 'white' }}>
                {saving ? <><Spinner as="span" size="sm" animation="border" className="spinner-border-sm" /> Enregistrement...</> : <><FiSave size={14} /> Enregistrer</>}
              </Button>
            </div>
          </form>

          {/* Note d'information */}
          <div className="text-center mt-4">
            <small className="d-flex align-items-center justify-content-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <FiShield size={12} /> Paramètres de sécurité — Recommandations selon les normes BCC
            </small>
          </div>
        </Container>
      </div>
    </>
  );
};

export default Securite;