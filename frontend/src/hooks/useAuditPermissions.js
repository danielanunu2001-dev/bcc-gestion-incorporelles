// frontend/src/hooks/useAuditPermissions.js
import { useSelector } from 'react-redux';

const useAuditPermissions = () => {
  const { user } = useSelector(state => state.auth || { user: null });
  const role = user?.role || 'guest';
  
  // Seuls admin et auditeur ont accès à l'audit
  const canViewAudit = ['admin', 'auditeur'].includes(role);
  const canViewUsers = ['admin', 'auditeur'].includes(role);
  const canFilterByUser = ['admin', 'auditeur'].includes(role);
  
  return {
    canViewAudit,
    canViewUsers,
    canFilterByUser,
    role
  };
};

export default useAuditPermissions;