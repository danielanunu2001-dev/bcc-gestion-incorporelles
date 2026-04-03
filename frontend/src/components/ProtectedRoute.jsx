import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  console.log('ProtectedRoute - Auth:', isAuthenticated, 'User:', user);
  
  if (!isAuthenticated || !user) {
    console.log('ProtectedRoute: Non authentifié, redirection vers login');
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;