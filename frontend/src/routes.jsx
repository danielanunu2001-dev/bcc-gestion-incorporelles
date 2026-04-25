import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';
import Login from '../pages/Login/Login';

// Pages principales
import Dashboard from '../pages/Dashboard/Dashboard';
import ActifsList from '../pages/Actifs/ActifsList';
import ActifDetail from '../pages/Actifs/ActifDetail';
import ActifForm from '../pages/Actifs/ActifForm';
import Amortissements from '../pages/Amortissements/Amortissements';
import Audit from '../pages/Audit/Audit';
import Utilisateurs from '../pages/Utilisateurs/Utilisateurs';
import Contrats from '../pages/Contrats/Contrats';
import CategoriesAmortissement from '../pages/Categories/CategoriesAmortissement';
import Rapports from '../pages/Rapports/Rapports';
import Parametres from '../pages/Parametres/Parametres';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'actifs',
        children: [
          { index: true, element: <ActifsList /> },
          { path: 'nouveau', element: <ActifForm /> },
          { path: ':id', element: <ActifDetail /> },
          { path: 'modifier/:id', element: <ActifForm /> },
        ],
      },
      {
        path: 'amortissements',
        element: <Amortissements />,
      },
      {
        path: 'audit',
        element: <Audit />,
      },
      {
        path: 'utilisateurs',
        element: <Utilisateurs />,
      },
      {
        path: 'contrats',
        element: <Contrats />,
      },
      {
        path: 'categories-amortissement',
        element: <CategoriesAmortissement />,
      },
      {
        path: 'rapports',
        element: <Rapports />,
      },
      {
        path: 'parametres',
        element: <Parametres />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);