import { createBrowserRouter, Navigate, redirect } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';

// Pages principales
import Dashboard from '../pages/Dashboard/Dashboard';
import ActifList from '../pages/Actifs/ActifList';
import ActifDetail from '../pages/Actifs/ActifDetail';
import ActifForm from '../pages/Actifs/ActifForm';
import AmortissementsPage from '../pages/Amortissements/AmortissementsPage';
import AuditList from '../components/Audit/AuditList';
import Utilisateurs from '../pages/Utilisateurs/Utilisateurs';
import CategoriesAmortissement from '../pages/Categories/CategoriesAmortissement';

// Pages de rapports
import Rapports from '../pages/Rapports/Rapports';
import RapportsDashboard from '../pages/Rapports/RapportsDashboard';
import RapportAnomalies from '../pages/Rapports/RapportAnomalies';
import EtatImmobilisations from '../pages/Rapports/EtatImmobilisations';
import PlanAmortissement from '../pages/Rapports/PlanAmortissement';
import SuiviInvestissements from '../pages/Rapports/SuiviInvestissements';
import Alertes from '../pages/Rapports/Alertes';

// ✅ Pages Utilisateurs détaillées (avec formulaire)
import UtilisateursList from '../pages/Utilisateurs/UtilisateursList';
import UtilisateurDetail from '../pages/Utilisateurs/UtilisateurDetail';
import UtilisateurForm from '../pages/Utilisateurs/UtilisateurForm';

// ✅ Page Mon Profil (utilisateur connecté)
import MonProfil from '../pages/Profil/MonProfil';

// Page Inventaire
import Inventaire from '../pages/Inventaire/Inventaire';

// Pages de paramètres
import Parametres from '../pages/Parametres';
import Notifications from '../pages/Parametres/Notifications';
import Securite from '../pages/Parametres/Securite';
import PlanComptable from '../pages/Parametres/PlanComptable';
import ExercicesComptables from '../pages/Parametres/ExercicesComptables';
import ArchiveLegale from '../pages/Parametres/ArchiveLegale';
import PisteAudit from '../pages/Parametres/PisteAudit';
import ExportDonnees from '../pages/Parametres/ExportDonnees';
import NotificationMail from '../pages/Parametres/NotificationMail';

// ✅ Page Taux de change (gestion multi-devises)
import TauxChange from '../pages/Parametres/TauxChange';

// Pages pour les contrats
import Contrats from '../pages/Contrats/Contrats';
import ContratsListPro from '../pages/Contrats/ContratsListPro';
import ContratDetail from '../pages/Contrats/ContratDetail';
import ContratForm from '../pages/Contrats/ContratForm';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'mon-profil',
        element: <MonProfil />,
      },
      {
        path: 'actifs',
        children: [
          {
            index: true,
            element: <ActifList />,
          },
          {
            path: 'nouveau',
            element: <ActifForm />,
          },
          {
            path: ':id',
            element: <ActifDetail />,
          },
          {
            path: 'modifier/:id',
            element: <ActifForm />,
          },
          // Route pour résoudre le problème de boucle infinie
          {
            path: ':id/amortissements/calculer',
            loader: ({ params }) => {
              return redirect(`/amortissements/${params.id}`);
            },
            element: null,
          },
        ],
      },
      {
        path: 'amortissements/:id',
        element: <AmortissementsPage />,
      },
      {
        path: 'audit',
        element: <AuditList />,
      },
      // ✅ Routes Utilisateurs complètes
      {
        path: 'utilisateurs',
        children: [
          {
            index: true,
            element: <UtilisateursList />,
          },
          {
            path: 'nouveau',
            element: <UtilisateurForm />,
          },
          {
            path: 'modifier/:id',
            element: <UtilisateurForm />,
          },
          {
            path: ':id',
            element: <UtilisateurDetail />,
          },
        ],
      },
      // ✅ ROUTES CONTRATS GLOBALES (AVEC LE NOUVEAU COMPOSANT)
      {
        path: 'contrats',
        children: [
          {
            index: true,
            element: <ContratsListPro />,
          },
          {
            path: ':contratId',
            element: <ContratDetail />,
          },
          {
            path: 'modifier/:contratId',
            element: <ContratForm />,
          },
          {
            path: 'nouveau',
            element: <ContratForm />,
          },
        ],
      },
      // Routes pour les contrats liés à un actif spécifique (composant standard)
      {
        path: 'actifs/:id/contrats',
        children: [
          {
            index: true,
            element: <Contrats />,
          },
          {
            path: 'nouveau',
            element: <ContratForm />,
          },
          {
            path: ':contratId',
            element: <ContratDetail />,
          },
          {
            path: 'modifier/:contratId',
            element: <ContratForm />,
          },
        ],
      },
      // ✅ Routes de rapports complètes
      {
        path: 'rapports',
        children: [
          {
            index: true,
            element: <RapportsDashboard />,
          },
          {
            path: 'liste',
            element: <Rapports />,
          },
          {
            path: 'anomalies',
            element: <RapportAnomalies />,
          },
          {
            path: 'etat-immobilisations',
            element: <EtatImmobilisations />,
          },
          {
            path: 'plan-amortissement',
            element: <PlanAmortissement />,
          },
          {
            path: 'investissements',
            element: <SuiviInvestissements />,
          },
          {
            path: 'alertes',
            element: <Alertes />,
          },
          // ✅ Routes simplifiées pour compatibilité
          {
            path: 'immobilisations',
            element: <Navigate to="etat-immobilisations" replace />,
          },
          {
            path: 'amortissements',
            element: <Navigate to="plan-amortissement" replace />,
          },
        ],
      },
      {
        path: 'categories-amortissement',
        element: <CategoriesAmortissement />,
      },
      {
        path: 'inventaire',
        element: <Inventaire />,
      },
      // ✅ Routes pour les paramètres AVEC TAUX DE CHANGE
      {
        path: 'parametres',
        element: <Parametres />,
        children: [
          {
            index: true,
            element: <Navigate to="notifications" replace />,
          },
          {
            path: 'notifications',
            element: <Notifications />,
          },
          {
            path: 'securite',
            element: <Securite />,
          },
          {
            path: 'plan-comptable',
            element: <PlanComptable />,
          },
          {
            path: 'exercices-comptables',
            element: <ExercicesComptables />,
          },
          {
            path: 'archive-legale',
            element: <ArchiveLegale />,
          },
          {
            path: 'piste-audit',
            element: <PisteAudit />,
          },
          {
            path: 'export-donnees',
            element: <ExportDonnees />,
          },
          {
            path: 'notification-mail',
            element: <NotificationMail />,
          },
          // ✅ NOUVEAU : Gestion des taux de change (multi-devises)
          {
            path: 'taux-change',
            element: <TauxChange />,
          },
        ],
      },
    ],
  },
  // Redirection : /users → /utilisateurs
  {
    path: '/users',
    element: <Navigate to="/utilisateurs" replace />,
  },
  // Route catch-all avec replace pour éviter les boucles
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);