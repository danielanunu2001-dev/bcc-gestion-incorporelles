import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeNotification } from '../../store/uiSlice';

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

  return (
    <div style={styles.container}>
      {notifications.map(notif => (
        <div
          key={notif.id}
          style={{
            ...styles.notification,
            ...styles[notif.type]
          }}
        >
          <span>{notif.message}</span>
          <button
            onClick={() => dispatch(removeNotification(notif.id))}
            style={styles.closeButton}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  notification: {
    padding: '12px 20px',
    borderRadius: '4px',
    color: 'var(--bg-card)',
    minWidth: '300px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  success: {
    backgroundColor: '#10b981'
  },
  error: {
    backgroundColor: '#ef4444'
  },
  warning: {
    backgroundColor: '#f59e0b'
  },
  info: {
    backgroundColor: '#3b82f6'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'var(--bg-card)',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 5px'
  }
};

export default NotificationCenter;