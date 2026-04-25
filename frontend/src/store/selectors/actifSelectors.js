// store/selectors/actifSelectors.js
import { createSelector } from '@reduxjs/toolkit';

// ==================== SÉLECTEURS DE BASE ====================

/**
 * Sélecteur racine pour l'état des actifs
 */
export const selectActifsState = state => state.actifs;

/**
 * Sélecteur pour la liste des actifs (référence stable)
 */
export const selectActifs = state => state.actifs?.actifs || [];

/**
 * Sélecteur pour l'état de chargement (valeur primitive)
 */
export const selectActifsLoading = state => state.actifs?.loading || false;

/**
 * Sélecteur pour l'erreur (valeur primitive ou null)
 */
export const selectActifsError = state => state.actifs?.error || null;

/**
 * Sélecteur pour le message de succès
 */
export const selectActifsSuccess = state => state.actifs?.success || null;

/**
 * Sélecteur pour l'actif courant
 */
export const selectActifCourant = state => state.actifs?.actifCourant || null;

/**
 * Sélecteur pour les amortissements
 */
export const selectAmortissements = state => state.actifs?.amortissements || [];

/**
 * Sélecteur pour les filtres du slice
 */
export const selectActifsFiltres = state => state.actifs?.filtres || {};

// ==================== SÉLECTEURS UI ====================

/**
 * Sélecteur pour l'état UI
 */
export const selectUiState = state => state.ui || {};

/**
 * Sélecteur pour les filtres des actifs dans l'UI
 */
export const selectActifsFiltersRaw = state => state.ui?.filters?.actifs || {};

/**
 * Compteur de filtres actifs (valeur primitive)
 */
export const selectActiveFiltersCount = createSelector(
  [selectActifsFiltersRaw],
  (filters) => {
    return Object.values(filters).filter(v => v && v !== '' && v !== 0).length;
  }
);

// ==================== PAGINATION MÉMOÏSÉE ====================

/**
 * Sélecteur de pagination mémoïsé
 * Retourne un objet stable uniquement quand les valeurs changent
 */
export const selectActifsPagination = createSelector(
  [selectActifsState],
  (actifsState) => {
    const page = actifsState?.pagination?.page ?? 1;
    const limit = actifsState?.pagination?.limit ?? 20;
    const total = actifsState?.pagination?.total ?? 0;
    const totalPages = Math.ceil(total / limit);
    
    return { page, limit, total, totalPages };
  }
);

// ==================== SÉLECTEUR FILTRÉ COMPLET ====================

/**
 * ✅ SÉLECTEUR PRINCIPAL - Filtre les actifs selon tous les critères
 * Utilise createSelector pour la mémoïsation automatique
 */
export const selectFilteredActifs = createSelector(
  [selectActifs, selectActifsFiltersRaw],
  (actifs, filters) => {
    if (!actifs || actifs.length === 0) return [];

    let result = actifs;

    // 🔍 Filtre par recherche (nom + description)
    if (filters.recherche) {
      const search = filters.recherche.toLowerCase().trim();
      result = result.filter(a =>
        a.nom?.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search)
      );
    }

    // 🔢 Filtre par code
    if (filters.code) {
      const code = filters.code.toLowerCase().trim();
      result = result.filter(a =>
        a.code?.toLowerCase().includes(code)
      );
    }

    // 📂 Filtre par type
    if (filters.type && filters.type !== '') {
      result = result.filter(a => a.type === filters.type);
    }

    // 📊 Filtre par statut
    if (filters.statut && filters.statut !== '') {
      switch (filters.statut) {
        case 'actif':
          result = result.filter(a => a.actif === true);
          break;
        case 'inactif':
          result = result.filter(a => a.actif === false);
          break;
        case 'amorti':
          result = result.filter(a => {
            const vnc = a.valeur_nette ?? a.cout_acquisition ?? 0;
            const valeurResiduelle = a.valeur_residuelle ?? 0;
            return vnc <= valeurResiduelle;
          });
          break;
        default:
          break;
      }
    }

    // 🏭 Filtre par nature (corporel/incorporel)
    if (filters.typeImmobilisation && filters.typeImmobilisation !== '') {
      result = result.filter(a => a.type_immobilisation === filters.typeImmobilisation);
    }

    // 📈 Filtre par mode d'amortissement
    if (filters.mode && filters.mode !== '') {
      result = result.filter(a => a.mode_amortissement === filters.mode);
    }

    // 📅 Filtre par période d'acquisition
    if (filters.dateDebut) {
      const debut = new Date(filters.dateDebut);
      debut.setHours(0, 0, 0, 0);
      result = result.filter(a => {
        const dateAcq = new Date(a.date_acquisition);
        return dateAcq >= debut;
      });
    }
    if (filters.dateFin) {
      const fin = new Date(filters.dateFin);
      fin.setHours(23, 59, 59, 999);
      result = result.filter(a => {
        const dateAcq = new Date(a.date_acquisition);
        return dateAcq <= fin;
      });
    }

    // 💰 Filtre par montant d'acquisition
    if (filters.montantMin && filters.montantMin !== '') {
      const min = parseFloat(filters.montantMin);
      if (!isNaN(min)) {
        result = result.filter(a => (a.cout_acquisition ?? 0) >= min);
      }
    }
    if (filters.montantMax && filters.montantMax !== '') {
      const max = parseFloat(filters.montantMax);
      if (!isNaN(max)) {
        result = result.filter(a => (a.cout_acquisition ?? 0) <= max);
      }
    }

    // ⏱️ Filtre par durée d'utilité
    if (filters.dureeMin && filters.dureeMin !== '') {
      const min = parseInt(filters.dureeMin, 10);
      if (!isNaN(min)) {
        result = result.filter(a => (a.duree_utile_ans ?? 0) >= min);
      }
    }
    if (filters.dureeMax && filters.dureeMax !== '') {
      const max = parseInt(filters.dureeMax, 10);
      if (!isNaN(max)) {
        result = result.filter(a => (a.duree_utile_ans ?? 0) <= max);
      }
    }

    return result;
  }
);

// ==================== STATISTIQUES DÉTAILLÉES ====================

/**
 * Statistiques complètes des actifs filtrés
 */
export const selectActifsStats = createSelector(
  [selectFilteredActifs, selectActifs],
  (filtered, all) => {
    // Calculs pour les actifs filtrés
    const total = filtered.length;
    const corporel = filtered.filter(a => a.type_immobilisation === 'corporel').length;
    const incorporel = filtered.filter(a => a.type_immobilisation === 'incorporel').length;
    const nonDefini = filtered.filter(a => !a.type_immobilisation).length;
    
    const actifsActifs = filtered.filter(a => a.actif === true).length;
    const actifsInactifs = filtered.filter(a => a.actif === false).length;
    const actifsAmortis = filtered.filter(a => {
      const vnc = a.valeur_nette ?? a.cout_acquisition ?? 0;
      return vnc <= (a.valeur_residuelle ?? 0);
    }).length;
    
    const valeurBruteTotale = filtered.reduce((s, a) => s + (a.cout_acquisition ?? 0), 0);
    const valeurNetteTotale = filtered.reduce((s, a) => s + (a.valeur_nette ?? a.cout_acquisition ?? 0), 0);
    
    // Répartition par type
    const repartitionParType = {};
    filtered.forEach(a => {
      const type = a.type || 'non_defini';
      repartitionParType[type] = (repartitionParType[type] || 0) + 1;
    });
    
    // Répartition par statut
    const repartitionParStatut = {
      actif: actifsActifs,
      inactif: actifsInactifs,
      amorti: actifsAmortis
    };
    
    return {
      total,
      totalAll: all.length,
      corporel,
      incorporel,
      nonDefini,
      actifsActifs,
      actifsInactifs,
      actifsAmortis,
      valeurBruteTotale,
      valeurNetteTotale,
      repartitionParType,
      repartitionParStatut,
      tauxActifs: total ? ((actifsActifs / total) * 100).toFixed(1) : 0,
      tauxAmortis: total ? ((actifsAmortis / total) * 100).toFixed(1) : 0
    };
  }
);

// ==================== STATISTIQUES SIMPLES (VALEURS PRIMITIVES) ====================

export const selectTotalActifs = createSelector(
  [selectFilteredActifs],
  (filtered) => filtered.length
);

export const selectTotalValeurBrute = createSelector(
  [selectFilteredActifs],
  (filtered) => filtered.reduce((s, a) => s + (a.cout_acquisition ?? 0), 0)
);

export const selectTotalValeurNette = createSelector(
  [selectFilteredActifs],
  (filtered) => filtered.reduce((s, a) => s + (a.valeur_nette ?? a.cout_acquisition ?? 0), 0)
);

// ==================== SÉLECTEUR DE TRI AVEC SUPPORT MULTI-CLÉS ====================

/**
 * Factory de sélecteur de tri - supporte le tri par plusieurs clés
 * @param {string} sortKey - Clé de tri principale
 * @param {string} sortDirection - Direction 'asc' ou 'desc'
 * @param {string} secondarySortKey - Clé de tri secondaire (optionnel)
 */
export const makeSelectSortedActifs = (secondarySortKey = 'nom') => {
  return createSelector(
    [selectFilteredActifs, (_, sortKey, sortDirection) => ({ sortKey, sortDirection })],
    (filteredActifs, { sortKey, sortDirection }) => {
      if (!filteredActifs?.length || !sortKey) return filteredActifs;
      
      return [...filteredActifs].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        // Gestion des types spéciaux
        if (sortKey === 'date_acquisition') {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        } else if (sortKey === 'cout_acquisition' || sortKey === 'valeur_nette') {
          aVal = parseFloat(aVal || 0);
          bVal = parseFloat(bVal || 0);
        } else if (sortKey === 'duree_utile_ans') {
          aVal = parseInt(aVal || 0, 10);
          bVal = parseInt(bVal || 0, 10);
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        // Comparaison principale
        if (aVal === bVal && secondarySortKey) {
          // Si égalité, utiliser la clé secondaire
          let aSec = a[secondarySortKey];
          let bSec = b[secondarySortKey];
          if (typeof aSec === 'string') {
            aSec = aSec.toLowerCase();
            bSec = bSec.toLowerCase();
          }
          return sortDirection === 'asc' 
            ? (aSec > bSec ? 1 : -1)
            : (aSec < bSec ? 1 : -1);
        }
        
        return sortDirection === 'asc' 
          ? (aVal > bVal ? 1 : -1)
          : (aVal < bVal ? 1 : -1);
      });
    }
  );
};

// ==================== SÉLECTEUR DE TRI SIMPLE (POUR COMPATIBILITÉ) ====================

export const makeSelectSimpleSortedActifs = () => {
  return createSelector(
    [selectFilteredActifs, (_, sortKey, sortDirection) => ({ sortKey, sortDirection })],
    (filteredActifs, { sortKey, sortDirection }) => {
      if (!filteredActifs?.length || !sortKey) return filteredActifs;
      
      return [...filteredActifs].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        if (sortKey === 'date_acquisition') {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        } else if (sortKey === 'cout_acquisition' || sortKey === 'valeur_nette') {
          aVal = parseFloat(aVal || 0);
          bVal = parseFloat(bVal || 0);
        } else if (sortKey === 'duree_utile_ans') {
          aVal = parseInt(aVal || 0, 10);
          bVal = parseInt(bVal || 0, 10);
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal === bVal) return 0;
        return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
    }
  );
};

// ==================== SÉLECTEURS DE RECHERCHE SPÉCIFIQUES ====================

/**
 * Recherche par nom
 */
export const selectActifsByNom = (searchTerm) => createSelector(
  [selectActifs],
  (actifs) => {
    if (!searchTerm || searchTerm === '') return actifs;
    const term = searchTerm.toLowerCase().trim();
    return actifs.filter(a => a.nom?.toLowerCase().includes(term));
  }
);

/**
 * Recherche par code
 */
export const selectActifsByCode = (code) => createSelector(
  [selectActifs],
  (actifs) => {
    if (!code || code === '') return actifs;
    const searchCode = code.toLowerCase().trim();
    return actifs.filter(a => a.code?.toLowerCase().includes(searchCode));
  }
);

/**
 * Filtre par plage de montant
 */
export const makeSelectActifsByMontantRange = () => createSelector(
  [selectActifs, (_, min, max) => ({ min, max })],
  (actifs, { min, max }) => {
    let result = actifs;
    if (min && min !== '') {
      const minVal = parseFloat(min);
      if (!isNaN(minVal)) result = result.filter(a => (a.cout_acquisition ?? 0) >= minVal);
    }
    if (max && max !== '') {
      const maxVal = parseFloat(max);
      if (!isNaN(maxVal)) result = result.filter(a => (a.cout_acquisition ?? 0) <= maxVal);
    }
    return result;
  }
);

/**
 * Filtre par plage de durée
 */
export const makeSelectActifsByDureeRange = () => createSelector(
  [selectActifs, (_, min, max) => ({ min, max })],
  (actifs, { min, max }) => {
    let result = actifs;
    if (min && min !== '') {
      const minVal = parseInt(min, 10);
      if (!isNaN(minVal)) result = result.filter(a => (a.duree_utile_ans ?? 0) >= minVal);
    }
    if (max && max !== '') {
      const maxVal = parseInt(max, 10);
      if (!isNaN(maxVal)) result = result.filter(a => (a.duree_utile_ans ?? 0) <= maxVal);
    }
    return result;
  }
);

// ==================== SÉLECTEURS POUR GRAPHIQUES ====================

/**
 * Données pour graphique de répartition par type
 */
export const selectChartDataByType = createSelector(
  [selectFilteredActifs],
  (filtered) => {
    const repartition = {};
    filtered.forEach(a => {
      const type = a.type || 'Autres';
      repartition[type] = (repartition[type] || 0) + 1;
    });
    return Object.entries(repartition).map(([name, value]) => ({ name, value }));
  }
);

/**
 * Données pour graphique d'évolution des valeurs
 */
export const selectChartEvolutionData = createSelector(
  [selectFilteredActifs],
  (filtered) => {
    const parAnnee = {};
    filtered.forEach(a => {
      if (a.date_acquisition) {
        const annee = new Date(a.date_acquisition).getFullYear();
        if (!parAnnee[annee]) {
          parAnnee[annee] = { acquisitions: 0, valeurBrute: 0, valeurNette: 0 };
        }
        parAnnee[annee].acquisitions++;
        parAnnee[annee].valeurBrute += a.cout_acquisition ?? 0;
        parAnnee[annee].valeurNette += a.valeur_nette ?? a.cout_acquisition ?? 0;
      }
    });
    return Object.entries(parAnnee)
      .map(([annee, data]) => ({ annee: parseInt(annee, 10), ...data }))
      .sort((a, b) => a.annee - b.annee);
  }
);

// ==================== SÉLECTEUR DE VALIDATION ====================

/**
 * Vérifie si des filtres sont actifs
 */
export const selectHasActiveFilters = createSelector(
  [selectActifsFiltersRaw],
  (filters) => {
    return Object.values(filters).some(v => v && v !== '' && v !== 0);
  }
);

// ==================== EXPORTS PAR DÉFAUT ====================

export default {
  selectActifs,
  selectActifsLoading,
  selectActifsError,
  selectActifsSuccess,
  selectActifCourant,
  selectAmortissements,
  selectActifsFiltres,
  selectActifsFiltersRaw,
  selectActiveFiltersCount,
  selectActifsPagination,
  selectFilteredActifs,
  selectActifsStats,
  selectTotalActifs,
  selectTotalValeurBrute,
  selectTotalValeurNette,
  makeSelectSortedActifs,
  makeSelectSimpleSortedActifs,
  selectActifsByNom,
  selectActifsByCode,
  makeSelectActifsByMontantRange,
  makeSelectActifsByDureeRange,
  selectChartDataByType,
  selectChartEvolutionData,
  selectHasActiveFilters
};