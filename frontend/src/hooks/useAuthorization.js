// frontend/src/hooks/useAuthorization.js
import { useSelector } from 'react-redux';
import { useSession } from './useSession';

export const useAuthorization = () => {
  const { user: reduxUser } = useSelector((state) => state.auth || {});
  const { session } = useSession();
  const user = reduxUser || session;
  
  const hasRole = (roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };
  
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    const userPermissions = user.permissions || [];
    return userPermissions.includes(permission);
  };
  
  const isAuthenticated = () => {
    return !!user;
  };
  
  const getUser = () => user;
  
  const getRole = () => user?.role || null;
  
  return {
    hasRole,
    hasPermission,
    isAuthenticated,
    getUser,
    getRole,
    user
  };
};

export default useAuthorization;