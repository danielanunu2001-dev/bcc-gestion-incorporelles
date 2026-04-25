import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeNotification } from '../../store/uiSlice';
import { FiX, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import 'bootstrap/dist/css/bootstrap.min.css';

const NotificationCenter = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui.notifications);

  useEffect(() => {
    notifications.forEach(notif => {
      if (notif.duration) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notif.id));
        }, notif.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, dispatch]);

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success':
        return <FiCheckCircle className="text-success" size={20} />;
      case 'error':
        return <FiAlertCircle className="text-danger" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-warning" size={20} />;
      case 'info':
        return <FiInfo className="text-info" size={20} />;
      default:
        return <FiInfo className="text-primary" size={20} />;
    }
  };

  const getNotificationClass = (type) => {
    switch(type) {
      case 'success':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-success';
      case 'error':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-danger';
      case 'warning':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-warning';
      case 'info':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-info';
      default:
        return 'border-start-0 border-top-0 border-end-0 border-4 border-primary';
    }
  };

  // Styles d'animation
  const animationStyles = `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
        max-height: 100px;
      }
      to {
        opacity: 0;
        max-height: 0;
        padding: 0;
        margin: 0;
      }
    }
    
    .notification-slide-in {
      animation: slideInRight 0.3s ease-out;
    }
    
    .notification-slide-out {
      animation: slideOutRight 0.3s ease-out forwards;
    }
    
    .notification-hover-lift {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .notification-hover-lift:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    @keyframes progressBar {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
    
    .notification-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background-color: rgba(255,255,255,0.7);
      border-radius: 0 0 0 8px;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div 
        className="position-fixed top-0 end-0 p-3 d-flex flex-column gap-3"
        style={{ zIndex: 1080, maxWidth: '380px' }}
      >
        {notifications.map((notif, index) => (
          <div
            key={notif.id}
            className={`notification-slide-in notification-hover-lift bg-white rounded-3 shadow-lg ${getNotificationClass(notif.type)}`}
            style={{ 
              minWidth: '280px',
              maxWidth: '380px',
              overflow: 'hidden',
              position: 'relative'
            }}
            role="alert"
          >
            <div className="d-flex align-items-start gap-3 p-3">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notif.type)}
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="flex-grow-1">
                    <strong className="small d-block mb-1 text-dark">
                      {notif.type === 'success' && 'Succès'}
                      {notif.type === 'error' && 'Erreur'}
                      {notif.type === 'warning' && 'Attention'}
                      {notif.type === 'info' && 'Information'}
                    </strong>
                    <p className="small text-secondary mb-0" style={{ wordBreak: 'break-word' }}>
                      {notif.message}
                    </p>
                  </div>
                  <button
                    onClick={() => dispatch(removeNotification(notif.id))}
                    className="btn btn-sm btn-link text-secondary p-0 flex-shrink-0"
                    style={{ marginTop: '-2px' }}
                    aria-label="Fermer"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Barre de progression pour la durée */}
            {notif.duration && (
              <div 
                className="notification-progress-bar"
                style={{
                  animation: `progressBar ${notif.duration}ms linear forwards`,
                  backgroundColor: 
                    notif.type === 'success' ? '#10b981' :
                    notif.type === 'error' ? '#ef4444' :
                    notif.type === 'warning' ? '#f59e0b' : '#3b82f6'
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// Version alternative avec positionnement personnalisable
export const NotificationCenterWithPosition = ({ position = 'top-right' }) => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui.notifications);

  useEffect(() => {
    notifications.forEach(notif => {
      if (notif.duration) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notif.id));
        }, notif.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, dispatch]);

  if (notifications.length === 0) return null;

  const getPositionStyles = () => {
    switch(position) {
      case 'top-left':
        return { top: 0, left: 0, right: 'auto' };
      case 'top-right':
        return { top: 0, right: 0, left: 'auto' };
      case 'bottom-left':
        return { bottom: 0, left: 0, top: 'auto', right: 'auto' };
      case 'bottom-right':
        return { bottom: 0, right: 0, top: 'auto', left: 'auto' };
      case 'top-center':
        return { top: 0, left: '50%', transform: 'translateX(-50%)', right: 'auto' };
      case 'bottom-center':
        return { bottom: 0, left: '50%', transform: 'translateX(-50%)', top: 'auto', right: 'auto' };
      default:
        return { top: 0, right: 0, left: 'auto' };
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success':
        return <FiCheckCircle className="text-success" size={20} />;
      case 'error':
        return <FiAlertCircle className="text-danger" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-warning" size={20} />;
      case 'info':
        return <FiInfo className="text-info" size={20} />;
      default:
        return <FiInfo className="text-primary" size={20} />;
    }
  };

  const getNotificationClass = (type) => {
    switch(type) {
      case 'success':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-success';
      case 'error':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-danger';
      case 'warning':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-warning';
      case 'info':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-info';
      default:
        return 'border-start-0 border-top-0 border-end-0 border-4 border-primary';
    }
  };

  const animationStyles = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideInBottom {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes progressBar {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    .notification-slide-in-top {
      animation: slideIn 0.3s ease-out;
    }
    
    .notification-slide-in-bottom {
      animation: slideInBottom 0.3s ease-out;
    }
    
    .notification-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      border-radius: 0 0 0 8px;
    }
  `;

  const isTopPosition = position.includes('top');
  const animationClass = isTopPosition ? 'notification-slide-in-top' : 'notification-slide-in-bottom';

  return (
    <>
      <style>{animationStyles}</style>
      <div 
        className="position-fixed p-3 d-flex flex-column gap-3"
        style={{ 
          zIndex: 1080, 
          maxWidth: '380px',
          ...getPositionStyles(),
          ...(position.includes('center') && { transform: 'translateX(-50%)' })
        }}
      >
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`${animationClass} bg-white rounded-3 shadow-lg ${getNotificationClass(notif.type)}`}
            style={{ 
              minWidth: '280px',
              maxWidth: '380px',
              overflow: 'hidden',
              position: 'relative'
            }}
            role="alert"
          >
            <div className="d-flex align-items-start gap-3 p-3">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notif.type)}
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="flex-grow-1">
                    <strong className="small d-block mb-1 text-dark">
                      {notif.type === 'success' && 'Succès'}
                      {notif.type === 'error' && 'Erreur'}
                      {notif.type === 'warning' && 'Attention'}
                      {notif.type === 'info' && 'Information'}
                    </strong>
                    <p className="small text-secondary mb-0">{notif.message}</p>
                  </div>
                  <button
                    onClick={() => dispatch(removeNotification(notif.id))}
                    className="btn btn-sm btn-link text-secondary p-0 flex-shrink-0"
                    aria-label="Fermer"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {notif.duration && (
              <div 
                className="notification-progress-bar"
                style={{
                  animation: `progressBar ${notif.duration}ms linear forwards`,
                  backgroundColor: 
                    notif.type === 'success' ? '#10b981' :
                    notif.type === 'error' ? '#ef4444' :
                    notif.type === 'warning' ? '#f59e0b' : '#3b82f6'
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

// Version avec gestion des piles de notifications
export const NotificationCenterStacked = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.ui.notifications);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    notifications.forEach(notif => {
      if (notif.duration && hoveredId !== notif.id) {
        const timer = setTimeout(() => {
          dispatch(removeNotification(notif.id));
        }, notif.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [notifications, dispatch, hoveredId]);

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success':
        return <FiCheckCircle className="text-success" size={20} />;
      case 'error':
        return <FiAlertCircle className="text-danger" size={20} />;
      case 'warning':
        return <FiAlertTriangle className="text-warning" size={20} />;
      case 'info':
        return <FiInfo className="text-info" size={20} />;
      default:
        return <FiInfo className="text-primary" size={20} />;
    }
  };

  const getNotificationClass = (type) => {
    switch(type) {
      case 'success':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-success';
      case 'error':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-danger';
      case 'warning':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-warning';
      case 'info':
        return 'border-start-0 border-top-0 border-end-0 border-4 border-info';
      default:
        return 'border-start-0 border-top-0 border-end-0 border-4 border-primary';
    }
  };

  const getStackPosition = (index) => {
    const offset = index * 10;
    return {
      transform: `translateY(${offset}px)`,
      zIndex: notifications.length - index,
      opacity: 1 - (index * 0.1)
    };
  };

  const animationStyles = `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes progressBar {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    .notification-stack-in {
      animation: slideInRight 0.3s ease-out;
    }
    
    .notification-progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      border-radius: 0 0 0 8px;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div 
        className="position-fixed top-0 end-0 p-3"
        style={{ zIndex: 1080, maxWidth: '380px' }}
      >
        {notifications.map((notif, index) => (
          <div
            key={notif.id}
            className={`notification-stack-in position-absolute bg-white rounded-3 shadow-lg ${getNotificationClass(notif.type)}`}
            style={{ 
              minWidth: '280px',
              maxWidth: '380px',
              overflow: 'hidden',
              position: 'absolute',
              top: 0,
              right: 0,
              marginRight: '1rem',
              marginTop: '0.5rem',
              ...getStackPosition(index)
            }}
            role="alert"
            onMouseEnter={() => setHoveredId(notif.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="d-flex align-items-start gap-3 p-3">
              <div className="flex-shrink-0 mt-1">
                {getNotificationIcon(notif.type)}
              </div>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="flex-grow-1">
                    <strong className="small d-block mb-1 text-dark">
                      {notif.type === 'success' && 'Succès'}
                      {notif.type === 'error' && 'Erreur'}
                      {notif.type === 'warning' && 'Attention'}
                      {notif.type === 'info' && 'Information'}
                    </strong>
                    <p className="small text-secondary mb-0">{notif.message}</p>
                  </div>
                  <button
                    onClick={() => dispatch(removeNotification(notif.id))}
                    className="btn btn-sm btn-link text-secondary p-0 flex-shrink-0"
                    aria-label="Fermer"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </div>
            
            {notif.duration && (
              <div 
                className="notification-progress-bar"
                style={{
                  animation: `progressBar ${notif.duration}ms linear forwards`,
                  backgroundColor: 
                    notif.type === 'success' ? '#10b981' :
                    notif.type === 'error' ? '#ef4444' :
                    notif.type === 'warning' ? '#f59e0b' : '#3b82f6'
                }}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default NotificationCenter;