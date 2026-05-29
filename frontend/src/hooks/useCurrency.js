// frontend/src/hooks/useCurrency.js
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const useCurrency = () => {
  const [devise, setDevise] = useState(() => {
    // Récupérer la préférence depuis le localStorage (non critique)
    return localStorage.getItem('user_preference_currency') || 'CDF';
  });
  
  const [taux, setTaux] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Récupérer les taux de change depuis le backend
  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/devises/taux');
      if (response.data && response.data.rates) {
        setTaux(response.data.rates);
        setLastUpdate(response.data.date || new Date().toISOString());
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (err) {
      console.error('Erreur récupération taux:', err);
      setError(err.response?.data?.message || 'Impossible de récupérer les taux de change');
      
      // Fallback avec taux par défaut
      setTaux({
        CDF: 1,
        USD: 2850,
        EUR: 3100,
        GBP: 3600
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Formater un montant dans la devise sélectionnée
  const formatCurrency = useCallback((amount, targetDevise = null) => {
    const target = targetDevise || devise;
    const montant = parseFloat(amount);
    
    if (isNaN(montant)) return `0 ${target}`;
    
    let convertedAmount = montant;
    
    // Conversion si nécessaire
    if (target === 'CDF') {
      // Si le montant est en devise étrangère, le convertir en CDF
      if (taux[devise] && devise !== 'CDF') {
        convertedAmount = montant * taux[devise];
      }
    } else if (target !== 'CDF') {
      // Convertir depuis CDF vers la devise cible
      if (taux[target]) {
        convertedAmount = montant / taux[target];
      }
    }
    
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: target === 'CDF' ? 'CDF' : target,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(convertedAmount).replace('CDF', 'FC');
  }, [devise, taux]);

  // Convertir un montant d'une devise à une autre
  const convert = useCallback((amount, from, to) => {
    const montant = parseFloat(amount);
    if (isNaN(montant)) return 0;
    
    if (from === to) return montant;
    
    // Conversion via CDF comme pivot
    let amountInCDF = montant;
    if (from !== 'CDF' && taux[from]) {
      amountInCDF = montant * taux[from];
    }
    
    if (to === 'CDF') {
      return amountInCDF;
    } else if (taux[to]) {
      return amountInCDF / taux[to];
    }
    
    return montant;
  }, [taux]);

  // Changer la devise d'affichage
  const changeDevise = useCallback((newDevise) => {
    setDevise(newDevise);
    localStorage.setItem('user_preference_currency', newDevise);
  }, []);

  // Rafraîchir les taux
  const refreshRates = useCallback(() => {
    fetchRates();
  }, [fetchRates]);

  // Charger les taux au montage
  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return {
    devise,
    taux,
    loading,
    error,
    lastUpdate,
    formatCurrency,
    convert,
    changeDevise,
    refreshRates
  };
};

export default useCurrency;