// frontend/src/store/actifSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import actifService from '../services/actif';
import api from '../services/api';

// ==================== ACTIONS ASYNCHRONES ====================

// ✅ Action pour récupérer les actifs avec TOUS les filtres
export const fetchActifs = createAsyncThunk(
  'actifs/fetchActifs',
  async (params = {}, { rejectWithValue }) => {
    try {
      console.log('📤 fetchActifs appelé avec params:', params);
      
      // Nettoyer les paramètres vides
      const cleanParams = {};
      
      // Filtres textuels
      if (params.recherche) cleanParams.recherche = params.recherche;
      if (params.code) cleanParams.code = params.code;
      if (params.type) cleanParams.type = params.type;
      if (params.typeImmobilisation) cleanParams.typeImmobilisation = params.typeImmobilisation;
      if (params.statut) cleanParams.statut = params.statut;
      if (params.mode) cleanParams.mode = params.mode;
      
      // Filtres de période
      if (params.dateDebut) cleanParams.dateDebut = params.dateDebut;
      if (params.dateFin) cleanParams.dateFin = params.dateFin;
      
      // Filtres numériques
      if (params.montantMin !== undefined && params.montantMin !== '') cleanParams.montantMin = params.montantMin;
      if (params.montantMax !== undefined && params.montantMax !== '') cleanParams.montantMax = params.montantMax;
      if (params.dureeMin !== undefined && params.dureeMin !== '') cleanParams.dureeMin = params.dureeMin;
      if (params.dureeMax !== undefined && params.dureeMax !== '') cleanParams.dureeMax = params.dureeMax;
      
      // Pagination
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      
      console.log('📤 Envoi vers API:', cleanParams);
      
      const response = await api.get('/actifs', { params: cleanParams });
      return response.data;
    } catch (error) {
      console.error('❌ fetchActifs - Erreur:', error);
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors du chargement des actifs');
    }
  }
);

export const fetchActifById = createAsyncThunk(
  'actifs/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      if (!id || id === 'dashboard' || id.length < 10) {
        console.warn('⚠️ ID invalide pour fetchActifById:', id);
        return rejectWithValue('ID invalide');
      }
      
      const response = await actifService.getById(id);
      return response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors du chargement de l\'actif');
    }
  }
);

export const createActif = createAsyncThunk(
  'actifs/create',
  async (actifData, { rejectWithValue }) => {
    try {
      const response = await actifService.create(actifData);
      return response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors de la création');
    }
  }
);

export const updateActif = createAsyncThunk(
  'actifs/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      if (!id || id === 'dashboard' || id.length < 10) {
        console.warn('⚠️ ID invalide pour updateActif:', id);
        return rejectWithValue('ID invalide');
      }
      
      const response = await actifService.update(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors de la modification');
    }
  }
);

export const deleteActif = createAsyncThunk(
  'actifs/deleteActif',
  async (id, { rejectWithValue }) => {
    console.log('📡 deleteActif - ID reçu:', id);
    
    try {
      const response = await api.delete(`/actifs/${id}`);
      console.log('✅ deleteActif - Réponse:', response.data);
      return id;
    } catch (error) {
      console.error('❌ deleteActif - Erreur:', error);
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  }
);

export const fetchAmortissements = createAsyncThunk(
  'actifs/fetchAmortissements',
  async (actifId, { rejectWithValue }) => {
    try {
      if (!actifId || actifId === 'dashboard' || actifId.length < 10) {
        console.warn('⚠️ ID invalide pour fetchAmortissements:', actifId);
        return rejectWithValue('ID invalide');
      }
      
      const response = await actifService.getAmortissements(actifId);
      return { actifId, amortissements: response };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Erreur lors du chargement des amortissements');
    }
  }
);

// ==================== ÉTAT INITIAL ====================

const initialState = {
  actifs: [],
  actifCourant: null,
  amortissements: [],
  loading: false,
  error: null,
  success: null,
  filtres: {},
  statistiques: {
    totalActifs: 0,
    totalFiltres: 0,
    valeurBrute: 0,
    valeurNette: 0,
    actifsRecents: [],
    repartitionParType: {},
    repartitionParNature: {}
  }
};

// ==================== SLICE ====================

const actifSlice = createSlice({
  name: 'actifs',
  initialState,
  reducers: {
    clearMessages: (state) => {
      state.error = null;
      state.success = null;
    },
    updateFiltres: (state, action) => {
      state.filtres = { ...state.filtres, ...action.payload };
    },
    resetFiltres: (state) => {
      state.filtres = {};
    },
    resetActifCourant: (state) => {
      state.actifCourant = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // ===== FETCH ALL ACTIFS =====
      .addCase(fetchActifs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActifs.fulfilled, (state, action) => {
        state.loading = false;
        
        // Extraction sécurisée des données
        const payload = action.payload;
        let list = [];
        
        if (Array.isArray(payload)) {
          list = payload;
        } else if (payload?.data && Array.isArray(payload.data)) {
          list = payload.data;
        } else if (payload?.actifs && Array.isArray(payload.actifs)) {
          list = payload.actifs;
        } else if (payload?.rows && Array.isArray(payload.rows)) {
          list = payload.rows;
        }

        state.actifs = list;
        
        // ✅ Calcul des statistiques détaillées
        const totalValeurBrute = list.reduce((sum, a) => sum + Number(a?.cout_acquisition || 0), 0);
        const totalValeurNette = list.reduce((sum, a) => sum + Number(a?.valeur_nette || a?.cout_acquisition || 0), 0);
        
        // Répartition par type
        const repartitionParType = {};
        list.forEach(a => {
          const type = a?.type || 'non_defini';
          repartitionParType[type] = (repartitionParType[type] || 0) + 1;
        });
        
        // Répartition par nature
        const repartitionParNature = {
          corporel: list.filter(a => a?.type_immobilisation === 'corporel').length,
          incorporel: list.filter(a => a?.type_immobilisation === 'incorporel').length,
          non_defini: list.filter(a => !a?.type_immobilisation).length
        };
        
        const actifsRecents = [...list]
          .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
          .slice(0, 5);

        state.statistiques = {
          totalActifs: list.length,
          totalFiltres: list.length,
          valeurBrute: totalValeurBrute,
          valeurNette: totalValeurNette,
          actifsRecents,
          repartitionParType,
          repartitionParNature
        };
      })
      .addCase(fetchActifs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Erreur lors du chargement';
      })
      
      // ===== FETCH ACTIF BY ID =====
      .addCase(fetchActifById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActifById.fulfilled, (state, action) => {
        state.loading = false;
        state.actifCourant = action.payload;
      })
      .addCase(fetchActifById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== CREATE ACTIF =====
      .addCase(createActif.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(createActif.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.actifs = [action.payload, ...state.actifs];
          state.actifCourant = action.payload;
          
          // Mise à jour des stats
          const totalValeurNette = state.actifs.reduce((sum, a) => sum + Number(a?.valeur_nette || a?.cout_acquisition || 0), 0);
          state.statistiques = {
            ...state.statistiques,
            totalActifs: state.actifs.length,
            valeurNette: totalValeurNette
          };
        }
        state.success = 'Actif créé avec succès';
      })
      .addCase(createActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== UPDATE ACTIF =====
      .addCase(updateActif.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(updateActif.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          const index = state.actifs.findIndex(a => a?.id === action.payload.id);
          if (index !== -1) {
            state.actifs[index] = action.payload;
          }
          state.actifCourant = action.payload;
          
          const totalValeurNette = state.actifs.reduce((sum, a) => sum + Number(a?.valeur_nette || a?.cout_acquisition || 0), 0);
          state.statistiques = {
            ...state.statistiques,
            valeurNette: totalValeurNette
          };
        }
        state.success = 'Actif modifié avec succès';
      })
      .addCase(updateActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== DELETE ACTIF =====
      .addCase(deleteActif.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = null;
      })
      .addCase(deleteActif.fulfilled, (state, action) => {
        state.loading = false;
        state.actifs = state.actifs.filter(a => a?.id !== action.payload);
        
        if (state.actifCourant?.id === action.payload) {
          state.actifCourant = null;
        }
        
        const totalValeurNette = state.actifs.reduce((sum, a) => sum + Number(a?.valeur_nette || a?.cout_acquisition || 0), 0);
        state.statistiques = {
          ...state.statistiques,
          totalActifs: state.actifs.length,
          valeurNette: totalValeurNette,
          actifsRecents: [...state.actifs]
            .sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
            .slice(0, 5)
        };
        
        state.success = 'Actif supprimé avec succès';
      })
      .addCase(deleteActif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== FETCH AMORTISSEMENTS =====
      .addCase(fetchAmortissements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAmortissements.fulfilled, (state, action) => {
        state.loading = false;
        state.amortissements = action.payload.amortissements || [];
      })
      .addCase(fetchAmortissements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// ==================== SÉLECTEURS MÉMOÏSÉS ====================

/**
 * Sélecteur de base pour récupérer la liste des actifs
 */
export const selectActifs = (state) => state.actifs?.actifs || [];

/**
 * Sélecteur pour récupérer l'état de chargement
 */
export const selectActifsLoading = (state) => state.actifs?.loading || false;

/**
 * Sélecteur pour récupérer l'erreur
 */
export const selectActifsError = (state) => state.actifs?.error || null;

/**
 * Sélecteur pour récupérer le succès
 */
export const selectActifsSuccess = (state) => state.actifs?.success || null;

/**
 * Sélecteur pour récupérer l'actif courant
 */
export const selectActifCourant = (state) => state.actifs?.actifCourant || null;

/**
 * Sélecteur pour récupérer les amortissements
 */
export const selectAmortissements = (state) => state.actifs?.amortissements || [];

/**
 * Sélecteur pour récupérer les filtres
 */
export const selectActifsFiltres = (state) => state.actifs?.filtres || {};

/**
 * Sélecteur pour récupérer les statistiques
 */
export const selectActifsStatistiques = (state) => state.actifs?.statistiques || {
  totalActifs: 0,
  totalFiltres: 0,
  valeurBrute: 0,
  valeurNette: 0,
  actifsRecents: [],
  repartitionParType: {},
  repartitionParNature: {}
};

/**
 * Sélecteur mémoïsé pour le nombre total d'actifs
 */
export const selectTotalActifs = (state) => state.actifs?.statistiques?.totalActifs || 0;

/**
 * Sélecteur mémoïsé pour la valeur brute totale
 */
export const selectValeurBruteTotale = (state) => state.actifs?.statistiques?.valeurBrute || 0;

/**
 * Sélecteur mémoïsé pour la valeur nette totale
 */
export const selectValeurNetteTotale = (state) => state.actifs?.statistiques?.valeurNette || 0;

/**
 * Sélecteur mémoïsé pour les actifs récents
 */
export const selectActifsRecents = (state) => state.actifs?.statistiques?.actifsRecents || [];

/**
 * Sélecteur mémoïsé pour la répartition par type
 */
export const selectRepartitionParType = (state) => state.actifs?.statistiques?.repartitionParType || {};

/**
 * Sélecteur mémoïsé pour la répartition par nature
 */
export const selectRepartitionParNature = (state) => state.actifs?.statistiques?.repartitionParNature || {
  corporel: 0,
  incorporel: 0,
  non_defini: 0
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par type
 */
export const selectActifsByType = (type) => (state) => {
  const actifs = selectActifs(state);
  if (!type || type === 'tous' || type === '') return actifs;
  return actifs.filter(actif => actif.type === type);
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par nature
 */
export const selectActifsByNature = (nature) => (state) => {
  const actifs = selectActifs(state);
  if (!nature || nature === 'tous' || nature === '') return actifs;
  return actifs.filter(actif => actif.type_immobilisation === nature);
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par statut
 */
export const selectActifsByStatut = (statut) => (state) => {
  const actifs = selectActifs(state);
  if (!statut || statut === 'tous' || statut === '') return actifs;
  
  if (statut === 'actif') return actifs.filter(a => a.actif === true);
  if (statut === 'inactif') return actifs.filter(a => a.actif === false);
  if (statut === 'amorti') return actifs.filter(a => {
    const vnc = a.valeur_nette || a.cout_acquisition;
    return vnc <= (a.valeur_residuelle || 0);
  });
  
  return actifs;
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par mode d'amortissement
 */
export const selectActifsByMode = (mode) => (state) => {
  const actifs = selectActifs(state);
  if (!mode || mode === 'tous' || mode === '') return actifs;
  return actifs.filter(actif => actif.mode_amortissement === mode);
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par recherche textuelle
 */
export const selectActifsBySearch = (searchTerm) => (state) => {
  const actifs = selectActifs(state);
  if (!searchTerm || searchTerm === '') return actifs;
  const term = searchTerm.toLowerCase();
  return actifs.filter(actif => 
    actif.nom?.toLowerCase().includes(term) ||
    actif.code?.toLowerCase().includes(term) ||
    actif.numero_inventaire?.toLowerCase().includes(term) ||
    actif.description?.toLowerCase().includes(term)
  );
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par plage de montant
 */
export const selectActifsByMontant = (min, max) => (state) => {
  const actifs = selectActifs(state);
  let result = [...actifs];
  
  if (min && min !== '') {
    const minVal = parseFloat(min);
    result = result.filter(a => (a.cout_acquisition || 0) >= minVal);
  }
  if (max && max !== '') {
    const maxVal = parseFloat(max);
    result = result.filter(a => (a.cout_acquisition || 0) <= maxVal);
  }
  
  return result;
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par plage de durée
 */
export const selectActifsByDuree = (min, max) => (state) => {
  const actifs = selectActifs(state);
  let result = [...actifs];
  
  if (min && min !== '') {
    const minVal = parseInt(min, 10);
    result = result.filter(a => (a.duree_utile_ans || 0) >= minVal);
  }
  if (max && max !== '') {
    const maxVal = parseInt(max, 10);
    result = result.filter(a => (a.duree_utile_ans || 0) <= maxVal);
  }
  
  return result;
};

/**
 * Sélecteur mémoïsé pour filtrer les actifs par période
 */
export const selectActifsByPeriode = (dateDebut, dateFin) => (state) => {
  const actifs = selectActifs(state);
  let result = [...actifs];
  
  if (dateDebut) {
    const debut = new Date(dateDebut);
    debut.setHours(0, 0, 0, 0);
    result = result.filter(a => new Date(a.date_acquisition) >= debut);
  }
  if (dateFin) {
    const fin = new Date(dateFin);
    fin.setHours(23, 59, 59, 999);
    result = result.filter(a => new Date(a.date_acquisition) <= fin);
  }
  
  return result;
};

/**
 * Sélecteur combiné pour tous les filtres (utile pour le débogage)
 */
export const selectActifsAvecFiltres = (filtres) => (state) => {
  let result = selectActifs(state);
  
  if (filtres.recherche) {
    const search = filtres.recherche.toLowerCase();
    result = result.filter(a => 
      a.nom?.toLowerCase().includes(search) ||
      a.code?.toLowerCase().includes(search)
    );
  }
  if (filtres.code) {
    const code = filtres.code.toLowerCase();
    result = result.filter(a => a.code?.toLowerCase().includes(code));
  }
  if (filtres.type && filtres.type !== '') {
    result = result.filter(a => a.type === filtres.type);
  }
  if (filtres.statut && filtres.statut !== '') {
    if (filtres.statut === 'actif') result = result.filter(a => a.actif === true);
    else if (filtres.statut === 'inactif') result = result.filter(a => a.actif === false);
  }
  if (filtres.mode && filtres.mode !== '') {
    result = result.filter(a => a.mode_amortissement === filtres.mode);
  }
  if (filtres.typeImmobilisation && filtres.typeImmobilisation !== '') {
    result = result.filter(a => a.type_immobilisation === filtres.typeImmobilisation);
  }
  if (filtres.dateDebut) {
    const debut = new Date(filtres.dateDebut);
    debut.setHours(0, 0, 0, 0);
    result = result.filter(a => new Date(a.date_acquisition) >= debut);
  }
  if (filtres.dateFin) {
    const fin = new Date(filtres.dateFin);
    fin.setHours(23, 59, 59, 999);
    result = result.filter(a => new Date(a.date_acquisition) <= fin);
  }
  if (filtres.montantMin && filtres.montantMin !== '') {
    const min = parseFloat(filtres.montantMin);
    result = result.filter(a => (a.cout_acquisition || 0) >= min);
  }
  if (filtres.montantMax && filtres.montantMax !== '') {
    const max = parseFloat(filtres.montantMax);
    result = result.filter(a => (a.cout_acquisition || 0) <= max);
  }
  if (filtres.dureeMin && filtres.dureeMin !== '') {
    const min = parseInt(filtres.dureeMin, 10);
    result = result.filter(a => (a.duree_utile_ans || 0) >= min);
  }
  if (filtres.dureeMax && filtres.dureeMax !== '') {
    const max = parseInt(filtres.dureeMax, 10);
    result = result.filter(a => (a.duree_utile_ans || 0) <= max);
  }
  
  return result;
};

// ==================== EXPORTS ====================

export const { clearMessages, updateFiltres, resetFiltres, resetActifCourant } = actifSlice.actions;
export default actifSlice.reducer;