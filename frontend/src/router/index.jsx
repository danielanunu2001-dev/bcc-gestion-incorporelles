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

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'mon-profil', element: <MonProfil /> },
      {
        path: 'actifs',
        children: [
          { index: true, element: <ActifList /> },
          { path: 'nouveau', element: <ActifForm /> },
          { path: ':id', element: <ActifDetail /> },
          { path: 'modifier/:id', element: <ActifForm /> },
          {
            path: ':id/amortissements/calculer',
            loader: ({ params }) => redirect(`/amortissements/${params.id}`),
            element: null,
          },
        ],
      },
      { path: 'amortissements/:id', element: <AmortissementsPage /> },
      { path: 'audit', element: <AdvancedAuditViewer /> },
      {
        path: 'utilisateurs',
        children: [
          { index: true, element: <UtilisateursList /> },
          { path: 'nouveau', element: <UtilisateurForm /> },
          { path: 'modifier/:id', element: <UtilisateurForm /> },
          { path: ':id', element: <UtilisateurDetail /> },
        ],
      },
      {
        path: 'contrats',
        children: [
          { index: true, element: <ContratsListPro /> },
          { path: ':contratId', element: <ContratDetail /> },
          { path: 'modifier/:contratId', element: <ContratForm /> },
          { path: 'nouveau', element: <ContratForm /> },
        ],
      },
      {
        path: 'actifs/:id/contrats',
        children: [
          { index: true, element: <Contrats /> },
          { path: 'nouveau', element: <ContratForm /> },
          { path: ':contratId', element: <ContratDetail /> },
          { path: 'modifier/:contratId', element: <ContratForm /> },
        ],
      },
      {
        path: 'rapports',
        children: [
          { index: true, element: <RapportsDashboard /> },
          { path: 'liste', element: <Rapports /> },
          { path: 'anomalies', element: <RapportAnomalies /> },
          { path: 'etat-immobilisations', element: <EtatImmobilisations /> },
          { path: 'plan-amortissement', element: <PlanAmortissement /> },
          { path: 'investissements', element: <SuiviInvestissements /> },
          { path: 'alertes', element: <Alertes /> },
          { path: 'immobilisations', element: <Navigate to="etat-immobilisations" replace /> },
          { path: 'amortissements', element: <Navigate to="plan-amortissement" replace /> },
        ],
      },
      { path: 'categories-amortissement', element: <CategoriesAmortissement /> },
      { path: 'inventaire', element: <Inventaire /> },
      {
        path: 'parametres',
        element: <Parametres />,
        children: [
          { index: true, element: <Navigate to="notifications" replace /> },
          { path: 'notifications', element: <Notifications /> },
          { path: 'securite', element: <Securite /> },
          { path: 'plan-comptable', element: <PlanComptable /> },
          { path: 'exercices-comptables', element: <ExercicesComptables /> },
          { path: 'archive-legale', element: <ArchiveLegale /> },
          { path: 'piste-audit', element: <PisteAudit /> },
          { path: 'export-donnees', element: <ExportDonnees /> },
          { path: 'notification-mail', element: <NotificationMail /> },
          { path: 'taux-change', element: <TauxChange /> },
        ],
      },
    ],
  },
  { path: '/users', element: <Navigate to="/utilisateurs" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);