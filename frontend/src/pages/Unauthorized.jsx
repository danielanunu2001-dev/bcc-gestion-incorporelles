// frontend/src/pages/Unauthorized.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiArrowLeft } from 'react-icons/fi';

const Unauthorized = () => {
  const navigate = useNavigate();
  
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div className="text-center p-5 bg-white rounded-4 shadow-sm" style={{ maxWidth: '500px' }}>
        <div className="bg-danger bg-opacity-10 rounded-circle p-3 d-inline-flex mb-3">
          <FiShield size={48} className="text-danger" />
        </div>
        <h2 className="h4 fw-bold text-danger mb-2">Accès non autorisé</h2>
        <p className="text-muted mb-3">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft className="me-1" /> Retour
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            Aller au tableau de bord
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;