import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../../store/usersSlice';
import {
  FiUsers, FiPlus, FiEdit2, FiTrash2, FiUser,
  FiSearch, FiRefreshCw, FiEye, FiMail, FiCalendar, FiClock
} from 'react-icons/fi';
import api from '../../services/api';

const UtilisateursList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // ✅ Correction : utiliser 'users' au lieu de 'allUsers'
  const { users, loading, error } = useSelector((state) => state.users);
  
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    // ✅ Correction : utiliser fetchUsers au lieu de fetchAllUsers
    dispatch(fetchUsers());
  }, [dispatch]);

  useEffect(() => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);

  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Supprimer l'utilisateur "${nom}" ?`)) return;
    try {
      await api.delete(`/users/${id}`);
      // ✅ Correction : utiliser fetchUsers
      dispatch(fetchUsers());
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      'admin': { bg: '#fee2e2', color: '#b91c1c' },
      'comptable': { bg: '#dbeafe', color: '#1e40af' },
      'auditeur': { bg: '#fef3c7', color: '#92400e' },
      'juridique': { bg: '#dcfce7', color: '#166534' },
      'informatique': { bg: '#e0f2fe', color: '#0369a1' },
      'inventoriste': { bg: '#f3e8ff', color: '#6b21a8' },
      'gestionnaire': { bg: '#f1f5f9', color: '#334155' }
    };
    const style = colors[role] || colors['gestionnaire'];
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {role}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && users.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des utilisateurs</h1>
          <p style={styles.subtitle}>
            {filteredUsers.length} utilisateur(s) sur {users.length}
          </p>
        </div>
        <div style={styles.headerActions}>
          {/* ✅ Correction : utiliser fetchUsers */}
          <button onClick={() => dispatch(fetchUsers())} style={styles.iconButton}>
            <FiRefreshCw />
          </button>
          <button
            onClick={() => navigate('/utilisateurs/nouveau')}
            style={styles.primaryButton}
          >
            <FiPlus /> Nouvel utilisateur
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          ❌ {error}
        </div>
      )}

      {/* Filtres */}
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">Tous les rôles</option>
          <option value="admin">Administrateur</option>
          <option value="comptable">Comptable</option>
          <option value="auditeur">Auditeur</option>
          <option value="juridique">Juridique</option>
          <option value="informatique">Informatique</option>
          <option value="inventoriste">Inventoriste</option>
          <option value="gestionnaire">Gestionnaire</option>
        </select>
      </div>

      {/* Liste des utilisateurs en cartes */}
      <div style={styles.grid}>
        {filteredUsers.map((user) => (
          <div key={user.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.avatar}>
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={styles.cardActions}>
                <button
                  onClick={() => navigate(`/utilisateurs/modifier/${user.id}`)}
                  style={styles.actionButton}
                  title="Modifier"
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(user.id, user.full_name)}
                  style={styles.actionButton}
                  title="Supprimer"
                >
                  <FiTrash2 size={14} />
                </button>
                <button
                  onClick={() => navigate(`/utilisateurs/${user.id}`)}
                  style={styles.actionButton}
                  title="Voir détails"
                >
                  <FiEye size={14} />
                </button>
              </div>
            </div>

            <h3 style={styles.userName}>{user.full_name}</h3>
            <div style={styles.userEmail}>
              <FiMail size={12} /> {user.email}
            </div>

            <div style={styles.userRole}>
              {getRoleBadge(user.role)}
            </div>

            <div style={styles.userMeta}>
              <div style={styles.metaItem}>
                <FiCalendar size={12} />
                <span>Créé le {formatDate(user.created_at)}</span>
              </div>
              <div style={styles.metaItem}>
                <FiClock size={12} />
                <span>Modifié le {formatDate(user.updated_at)}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && !loading && (
          <div style={styles.emptyState}>
            <FiUsers size={48} color="#94a3b8" />
            <p style={styles.emptyText}>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  iconButton: {
    padding: '0.5rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b'
  },
  primaryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  filtersBar: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap'
  },
  searchBox: {
    flex: 1,
    position: 'relative',
    minWidth: '300px'
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.95rem',
    backgroundColor: '#ffffff'
  },
  filterSelect: {
    padding: '0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    minWidth: '200px',
    color: '#1e293b'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  actionButton: {
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#64748b',
    transition: 'all 0.2s'
  },
  userName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  userEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '1rem'
  },
  userRole: {
    marginBottom: '1rem'
  },
  userMeta: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1rem',
    marginTop: '1rem'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem'
  },
  spinner: {
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #2563eb',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    gridColumn: '1 / -1'
  },
  emptyText: {
    color: '#64748b',
    marginTop: '1rem'
  }
};

export default UtilisateursList;