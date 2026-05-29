// frontend/src/router.js

import { createBrowserRouter, Navigate, redirect } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';
import Login from '../pages/Login/Login';
import Dashboard from '../pages/Dashboard/Dashboard';
import ActifList from '../pages/Actifs/ActifList';
import ActifDetail from '../pages/Actifs/ActifDetail';
import ActifForm from '../pages/Actifs/ActifForm';
import AmortissementsPage from '../pages/Amortissements/AmortissementsPage';
import AdvancedAuditViewer from '../components/Audit/AdvancedAuditViewer';
import CategoriesAmortissement from '../pages/Categories/CategoriesAmortissement';
import Rapports from '../pages/Rapports/Rapports';
import RapportsDashboard from '../pages/Rapports/RapportsDashboard';
import RapportAnomalies from '../pages/Rapports/RapportAnomalies';
import EtatImmobilisations from '../pages/Rapports/EtatImmobilisations';
import PlanAmortissement from '../pages/Rapports/PlanAmortissement';
import SuiviInvestissements from '../pages/Rapports/SuiviInvestissements';
import Alertes from '../pages/Rapports/Alertes';
import UtilisateursList from '../pages/Utilisateurs/UtilisateursList';
import UtilisateurDetail from '../pages/Utilisateurs/UtilisateurDetail';
import UtilisateurForm from '../pages/Utilisateurs/UtilisateurForm';
import MonProfil from '../pages/Profil/MonProfil';
import Inventaire from '../pages/Inventaire/Inventaire';
import Parametres from '../pages/Parametres';
import Notifications from '../pages/Parametres/Notifications';
import Securite from '../pages/Parametres/Securite';
import PlanComptable from '../pages/Parametres/PlanComptable';
import ExercicesComptables from '../pages/Parametres/ExercicesComptables';
import ArchiveLegale from '../pages/Parametres/ArchiveLegale';
import PisteAudit from '../pages/Parametres/PisteAudit';
import ExportDonnees from '../pages/Parametres/ExportDonnees';
import NotificationMail from '../pages/Parametres/NotificationMail';
import TauxChange from '../pages/Parametres/TauxChange';
import Contrats from '../pages/Contrats/Contrats';
import ContratsListPro from '../pages/Contrats/ContratsListPro';
import ContratDetail from '../pages/Contrats/ContratDetail';
import ContratForm from '../pages/Contrats/ContratForm';
import ConformiteDashboard from '../pages/Conformite/ConformiteDashboard';
import Unauthorized from '../pages/Unauthorized';

// ==================== DÉFINITION DES PERMISSIONS PAR ROUTE ====================
const routePermissions = {
  // Routes accessibles à tous les utilisateurs authentifiés
  dashboard: { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire', 'informatique', 'juridique', 'inventoriste'] },
  'mon-profil': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire', 'informatique', 'juridique', 'inventoriste'] },
  
  // Routes Actifs
  'actifs': { roles: ['admin', 'comptable', 'gestionnaire', 'auditeur', 'informatique'] },
  'actifs/nouveau': { roles: ['admin', 'comptable', 'gestionnaire'] },
  'actifs/:id': { roles: ['admin', 'comptable', 'gestionnaire', 'auditeur', 'informatique', 'juridique'] },
  'actifs/modifier/:id': { roles: ['admin', 'comptable', 'gestionnaire'] },
  
  // Routes Amortissements
  'amortissements/:id': { roles: ['admin', 'comptable', 'gestionnaire', 'auditeur'] },
  
  // Routes Audit (restreint)
  'audit': { roles: ['admin', 'auditeur'] },
  
  // Routes Utilisateurs (admin uniquement)
  'utilisateurs': { roles: ['admin'] },
  'utilisateurs/nouveau': { roles: ['admin'] },
  'utilisateurs/modifier/:id': { roles: ['admin'] },
  'utilisateurs/:id': { roles: ['admin'] },
  
  // Routes Contrats
  'contrats': { roles: ['admin', 'comptable', 'gestionnaire', 'juridique'] },
  'contrats/nouveau': { roles: ['admin', 'comptable', 'gestionnaire', 'juridique'] },
  'contrats/:contratId': { roles: ['admin', 'comptable', 'gestionnaire', 'juridique'] },
  'contrats/modifier/:contratId': { roles: ['admin', 'comptable', 'gestionnaire', 'juridique'] },
  
  // Routes Rapports
  'rapports': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire'] },
  'rapports/liste': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire'] },
  'rapports/anomalies': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire'] },
  'rapports/etat-immobilisations': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire'] },
  'rapports/plan-amortissement': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire'] },
  'rapports/investissements': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire'] },
  'rapports/alertes': { roles: ['admin', 'comptable', 'auditeur', 'gestionnaire', 'inventoriste'] },
  
  // Routes Catégories
  'categories-amortissement': { roles: ['admin', 'comptable'] },
  
  // Routes Inventaire
  'inventaire': { roles: ['admin', 'comptable', 'inventoriste', 'gestionnaire'] },
  
  // Routes Paramètres (admin uniquement)
  'parametres': { roles: ['admin'] },
  'parametres/notifications': { roles: ['admin'] },
  'parametres/securite': { roles: ['admin'] },
  'parametres/plan-comptable': { roles: ['admin', 'comptable'] },
  'parametres/exercices-comptables': { roles: ['admin', 'comptable'] },
  'parametres/archive-legale': { roles: ['admin', 'auditeur'] },
  'parametres/piste-audit': { roles: ['admin', 'auditeur'] },
  'parametres/export-donnees': { roles: ['admin'] },
  'parametres/notification-mail': { roles: ['admin'] },
  'parametres/taux-change': { roles: ['admin', 'comptable'] },
  
  // Routes Conformité
  'conformite': { roles: ['admin', 'auditeur', 'comptable'] },
};

// ==================== FONCTION POUR OBTENIR LES RÔLES D'UNE ROUTE ====================
const getRouteRoles = (pathname) => {
  // Nettoyer le pathname
  const cleanPath = pathname.replace(/^\//, '').replace(/\/$/, '');
  
  // Recherche exacte
  if (routePermissions[cleanPath]) {
    return routePermissions[cleanPath].roles;
  }
  
  // Recherche par pattern (pour les routes avec paramètres)
  for (const [pattern, config] of Object.entries(routePermissions)) {
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(cleanPath)) {
      return config.roles;
    }
  }
  
  // Rôles par défaut pour les routes non spécifiées
  return ['admin', 'comptable', 'gestionnaire', 'auditeur', 'informatique', 'juridique', 'inventoriste'];
};

// ==================== LOADER AVEC VÉRIFICATION DES PERMISSIONS ====================
const createProtectedLoader = (requiredRoles = null) => {
  return async ({ request, params }) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Obtenir les rôles requis pour cette route
    const roles = requiredRoles || getRouteRoles(pathname);
    
    // Stocker les permissions dans le loader pour les utiliser dans le composant
    return { requiredRoles: roles };
  };
};

// ==================== CONFIGURATION DES ROUTES ====================
export const router = createBrowserRouter([
  // Route publique
  { path: '/login', element: <Login /> },
  
  // Route non autorisée
  { path: '/unauthorized', element: <Unauthorized /> },
  
  // Routes protégées
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      // Dashboard
      { 
        index: true, 
        element: <Navigate to="dashboard" replace /> 
      },
      { 
        path: 'dashboard', 
        element: <Dashboard />,
        loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire', 'informatique', 'juridique', 'inventoriste'])
      },
      
      // Profil
      { 
        path: 'mon-profil', 
        element: <MonProfil />,
        loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire', 'informatique', 'juridique', 'inventoriste'])
      },
      
      // Actifs
      {
        path: 'actifs',
        children: [
          { 
            index: true, 
            element: <ActifList />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'auditeur', 'informatique'])
          },
          { 
            path: 'nouveau', 
            element: <ActifForm />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire'])
          },
          { 
            path: ':id', 
            element: <ActifDetail />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'auditeur', 'informatique', 'juridique'])
          },
          { 
            path: 'modifier/:id', 
            element: <ActifForm />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire'])
          },
          {
            path: ':id/amortissements/calculer',
            loader: ({ params }) => redirect(`/amortissements/${params.id}`),
            element: null,
          },
        ],
      },
      
      // Amortissements
      { 
        path: 'amortissements/:id', 
        element: <AmortissementsPage />,
        loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'auditeur'])
      },
      
      // Audit (restreint)
      { 
        path: 'audit', 
        element: <AdvancedAuditViewer />,
        loader: createProtectedLoader(['admin', 'auditeur'])
      },
      
      // Utilisateurs (admin uniquement)
      {
        path: 'utilisateurs',
        children: [
          { 
            index: true, 
            element: <UtilisateursList />,
            loader: createProtectedLoader(['admin'])
          },
          { 
            path: 'nouveau', 
            element: <UtilisateurForm />,
            loader: createProtectedLoader(['admin'])
          },
          { 
            path: 'modifier/:id', 
            element: <UtilisateurForm />,
            loader: createProtectedLoader(['admin'])
          },
          { 
            path: ':id', 
            element: <UtilisateurDetail />,
            loader: createProtectedLoader(['admin'])
          },
        ],
      },
      
      // Contrats
      {
        path: 'contrats',
        children: [
          { 
            index: true, 
            element: <ContratsListPro />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
          { 
            path: ':contratId', 
            element: <ContratDetail />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
          { 
            path: 'modifier/:contratId', 
            element: <ContratForm />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
          { 
            path: 'nouveau', 
            element: <ContratForm />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
        ],
      },
      
      // Contrats liés à un actif
      {
        path: 'actifs/:id/contrats',
        children: [
          { 
            index: true, 
            element: <Contrats />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
          { 
            path: 'nouveau', 
            element: <ContratForm />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
          { 
            path: ':contratId', 
            element: <ContratDetail />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
          { 
            path: 'modifier/:contratId', 
            element: <ContratForm />,
            loader: createProtectedLoader(['admin', 'comptable', 'gestionnaire', 'juridique'])
          },
        ],
      },
      
      // Rapports
      {
        path: 'rapports',
        children: [
          { 
            index: true, 
            element: <RapportsDashboard />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire'])
          },
          { 
            path: 'liste', 
            element: <Rapports />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire'])
          },
          { 
            path: 'anomalies', 
            element: <RapportAnomalies />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire'])
          },
          { 
            path: 'etat-immobilisations', 
            element: <EtatImmobilisations />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire'])
          },
          { 
            path: 'plan-amortissement', 
            element: <PlanAmortissement />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire'])
          },
          { 
            path: 'investissements', 
            element: <SuiviInvestissements />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire'])
          },
          { 
            path: 'alertes', 
            element: <Alertes />,
            loader: createProtectedLoader(['admin', 'comptable', 'auditeur', 'gestionnaire', 'inventoriste'])
          },
          { 
            path: 'immobilisations', 
            element: <Navigate to="etat-immobilisations" replace /> 
          },
          { 
            path: 'amortissements', 
            element: <Navigate to="plan-amortissement" replace /> 
          },
        ],
      },
      
      // Catégories d'amortissement
      { 
        path: 'categories-amortissement', 
        element: <CategoriesAmortissement />,
        loader: createProtectedLoader(['admin', 'comptable'])
      },
      
      // Inventaire
      { 
        path: 'inventaire', 
        element: <Inventaire />,
        loader: createProtectedLoader(['admin', 'comptable', 'inventoriste', 'gestionnaire'])
      },
      
      // Paramètres (admin uniquement)
      {
        path: 'parametres',
        element: <Parametres />,
        loader: createProtectedLoader(['admin']),
        children: [
          { index: true, element: <Navigate to="notifications" replace /> },
          { path: 'notifications', element: <Notifications /> },
          { path: 'securite', element: <Securite /> },
          { 
            path: 'plan-comptable', 
            element: <PlanComptable />,
            loader: createProtectedLoader(['admin', 'comptable'])
          },
          { 
            path: 'exercices-comptables', 
            element: <ExercicesComptables />,
            loader: createProtectedLoader(['admin', 'comptable'])
          },
          { 
            path: 'archive-legale', 
            element: <ArchiveLegale />,
            loader: createProtectedLoader(['admin', 'auditeur'])
          },
          { 
            path: 'piste-audit', 
            element: <PisteAudit />,
            loader: createProtectedLoader(['admin', 'auditeur'])
          },
          { 
            path: 'export-donnees', 
            element: <ExportDonnees />,
            loader: createProtectedLoader(['admin'])
          },
          { 
            path: 'notification-mail', 
            element: <NotificationMail />,
            loader: createProtectedLoader(['admin'])
          },
          { 
            path: 'taux-change', 
            element: <TauxChange />,
            loader: createProtectedLoader(['admin', 'comptable'])
          },
        ],
      },
      
      // Conformité BCC
      { 
        path: 'conformite', 
        element: <ConformiteDashboard />,
        loader: createProtectedLoader(['admin', 'auditeur', 'comptable'])
      },
    ],
  },
  
  // Redirections
  { path: '/users', element: <Navigate to="/utilisateurs" replace /> },
  { path: '/actifs/:id/amortissements', element: <Navigate to="/amortissements/:id" replace /> },
  
  // Route par défaut (404)
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default router;