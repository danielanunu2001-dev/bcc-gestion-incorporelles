import { useSelector } from 'react-redux';

/**
 * Hook personnalisé pour gérer les permissions basées sur le rôle de l'utilisateur.
 * @returns {Object} - Objet avec des fonctions et booléens pour vérifier les droits.
 */
const usePermissions = () => {
  const user = useSelector((state) => state.auth.user);
  const role = user?.role;

  /**
   * Vérifie si le rôle actuel fait partie de la liste autorisée.
   * @param {Array<string>} allowedRoles - Liste des rôes autorisés (ex: ['admin', 'comptable'])
   * @returns {boolean}
   */
  const can = (allowedRoles) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  const isAdmin = role === 'admin';
  const isComptable = role === 'comptable';
  const isJuridique = role === 'juridique';
  const isInformatique = role === 'informatique';
  const isAuditeur = role === 'auditeur';
  const isGestionnaire = role === 'gestionnaire';

  return {
    can,
    isAdmin,
    isComptable,
    isJuridique,
    isInformatique,
    isAuditeur,
    isGestionnaire,
    role
  };
};

export default usePermissions;