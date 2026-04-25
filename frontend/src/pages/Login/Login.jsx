import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from '../../store/authSlice';
import { 
  FiLock, FiMail, FiLogIn, FiShield, FiEye, FiEyeOff,
  FiAlertCircle, FiCheckCircle, FiBriefcase
} from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔄 Tentative de connexion...');

    try {
      const resultAction = await dispatch(login({ email, password }));
      
      if (login.fulfilled.match(resultAction)) {
        console.log('✅ Connexion réussie:', resultAction.payload);
        navigate('/dashboard', { replace: true });
      } else {
        setError(resultAction.payload || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      console.error('❌ Échec connexion:', err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Animation styles
  const animationStyles = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }
    .login-fade-in {
      animation: fadeIn 0.5s ease-out;
    }
    .login-shimmer {
      background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
      background-size: 1000px 100%;
      animation: shimmer 2s infinite;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ 
        backgroundColor: '#f0f2f5',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div className="login-fade-in" style={{ width: '100%', maxWidth: '450px' }}>
          
          {/* Carte principale */}
          <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
            
            {/* En-tête avec logo BCC */}
            <div className="text-center pt-4 pb-2" style={{ backgroundColor: '#ffffff' }}>
              <div className="mx-auto mb-3 d-flex align-items-center justify-content-center">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 d-flex align-items-center justify-content-center" style={{ width: '70px', height: '70px' }}>
                  <FiShield size={36} className="text-primary" />
                </div>
              </div>
              <h2 className="h3 fw-bold text-primary mb-1">Banque Centrale du Congo</h2>
              <p className="text-muted small mb-0">Gestion des Incorporelles</p>
              <div className="position-relative mt-2 mx-auto" style={{ width: '50px', height: '3px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
            </div>

            {/* Corps du formulaire */}
            <div className="card-body p-4 pt-3">
              
              {/* Message d'erreur */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2 mb-3" role="alert">
                  <FiAlertCircle size={16} />
                  <span className="small flex-grow-1">{error}</span>
                  <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close" onClick={() => setError('')}></button>
                </div>
              )}

              {/* Formulaire */}
              <form onSubmit={handleSubmit}>
                
                {/* Champ Email */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small text-secondary d-flex align-items-center gap-1">
                    <FiMail size={14} /> Adresse email
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <FiMail size={16} className="text-muted" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-control border-start-0"
                      placeholder="exemple@bcc.cd"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Champ Mot de passe */}
                <div className="mb-4">
                  <label className="form-label fw-semibold small text-secondary d-flex align-items-center gap-1">
                    <FiLock size={14} /> Mot de passe
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">
                      <FiLock size={16} className="text-muted" />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-control border-start-0"
                      placeholder="********"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary border-start-0"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ borderLeft: 'none' }}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Bouton de connexion */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                  style={{ fontSize: '1rem', transition: 'all 0.2s' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <FiLogIn size={18} /> SE CONNECTER
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Pied de page */}
            <div className="card-footer bg-white border-top-0 text-center pb-4">
              <small className="text-muted">
                &copy; {new Date().getFullYear()} Banque Centrale du Congo
              </small>
              <div className="mt-1">
                <small className="text-muted">Système de Gestion des Immobilisations</small>
              </div>
            </div>
          </div>

          {/* Version et statut */}
          <div className="text-center mt-3">
            <small className="text-white-50 d-flex align-items-center justify-content-center gap-2">
              <span className="badge bg-light text-dark opacity-75">v2.0.0</span>
              <span className="badge bg-success bg-opacity-50 text-white">● Système opérationnel</span>
            </small>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;