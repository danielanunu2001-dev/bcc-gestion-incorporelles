import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import usePermissions from '../../hooks/usePermissions';
import {
  FiPlus, FiEdit2, FiTrash2, FiUser, FiMail,
  FiCalendar, FiShield, FiRefreshCw, FiSearch,
  FiX, FiCheck, FiAlertCircle
} from 'react-icons/fi';

const UtilisateursList = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'gestionnaire'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roles = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'comptable', label: 'Comptable' },
    { value: 'juridique', label: 'Juridique' },
    { value: 'informatique', label: 'Informatique' },
    { value: 'auditeur', label: 'Auditeur' },
    { value: 'inventoriste', label: 'Inventoriste' },
    { value: 'gestionnaire', label: 'Gestionnaire' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (user) => {
    setEditing(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      role: user.role
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Supprimer l'utilisateur "${name}" ?`)) {
      try {
        await api.delete(`/users/${id}`);
        setSuccess('Utilisateur supprimé');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Erreur lors de la suppression');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.email || !formData.full_name || (!editing && !formData.password)) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      if (editing) {
        const data = { ...formData };
        if (!data.password) delete data.password;
        await api.put(`/users/${editing.id}`, data);
        setSuccess('Utilisateur modifié');
      } else {
        await api.post('/users', formData);
        setSuccess('Utilisateur créé');
      }

      setShowForm(false);
      setEditing(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      password: '',
      role: 'gestionnaire'
    });
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const getRoleBadge = (role) => {
    const colors = {
      'admin': { bg: '#fee2e2', color: '#b91c1c' },
      'comptable': { bg: '#dbeafe', color: '#1e40af' },
      'juridique': { bg: '#dcfce7', color: '#166534' },
      'informatique': { bg: '#fef9c3', color: '#854d0e' },
      'auditeur': { bg: '#f1f5f9', color: '#334155' },
      'inventoriste': { bg: '#f3e8ff', color: '#6b21a8' },
      'gestionnaire': { bg: '#ffe4e6', color: '#9f1239' }
    };
    const style = colors[role] || { bg: '#e5e7eb', color: '#1e293b' };
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {roles.find(r => r.value === role)?.label || role}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Gestion des utilisateurs</h1>
          <p style={styles.subtitle}>
            {users.length} utilisateur(s) enregistré(s)
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={fetchUsers} style={styles.iconButton} title="Rafraîchir">
            <FiRefreshCw />
          </button>
          {can(['admin']) && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={styles.primaryButton}
            >
              <FiPlus /> Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <FiAlertCircle /> {error}
        </div>
      )}
      {success && (
        <div style={styles.successMessage}>
          <FiCheck /> {success}
        </div>
      )}

      {/* Barre de recherche */}
      <div style={styles.searchBar}>
        <FiSearch style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Rechercher par nom, email ou rôle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={styles.clearButton}>
            <FiX />
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && can(['admin']) && (
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h3 style={styles.formTitle}>
              {editing ? 'Modifier' : 'Nouvel'} utilisateur
            </h3>
            <button onClick={resetForm} style={styles.closeButton}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Nom complet <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Jean Dupont"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@exemple.com"
                  style={styles.input}
                  required
                />
              </div>

              {!editing && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Mot de passe <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    style={styles.input}
                    required={!editing}
                    minLength="6"
                  />
                </div>
              )}

              {editing && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nouveau mot de passe (optionnel)</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Laisser vide pour ne pas modifier"
                    style={styles.input}
                    minLength="6"
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Rôle <span style={styles.required}>*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton} disabled={saving}>
                <FiCheck /> {saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Créer')}
              </button>
              <button type="button" onClick={resetForm} style={styles.cancelButton}>
                <FiX /> Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau des utilisateurs */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Chargement...</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          {filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <FiUser size={48} color="#94a3b8" />
              <p style={styles.emptyText}>
                {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur'}
              </p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nom</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Rôle</th>
                  <th style={styles.th}>Date création</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userName}>
                        <FiUser style={styles.userIcon} />
                        {user.full_name}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.userEmail}>
                        <FiMail style={styles.emailIcon} />
                        {user.email}
                      </div>
                    </td>
                    <td style={styles.td}>{getRoleBadge(user.role)}</td>
                    <td style={styles.td}>
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          onClick={() => handleEdit(user)}
                          style={styles.actionButton}
                          disabled={!can(['admin'])}
                          title="Modifier"
                        >
                          <FiEdit2 />
                        </button>
                        {user.id !== 'votre-id' && (
                          <button
                            onClick={() => handleDelete(user.id, user.full_name)}
                            style={styles.actionButton}
                            disabled={!can(['admin'])}
                            title="Supprimer"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
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
    fontSize: '1.75rem',
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
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  searchIcon: {
    color: '#94a3b8',
    marginRight: '0.75rem'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '0.95rem',
    padding: '0.5rem 0',
    backgroundColor: 'transparent'
  },
  clearButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer'
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  formTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    cursor: 'pointer',
    color: '#94a3b8'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1e293b'
  },
  required: {
    color: '#ef4444'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff'
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff'
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  saveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e5e7eb',
    color: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem'
  },
  tableContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'auto',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '700px'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: '#475569'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '1rem',
    color: '#1e293b'
  },
  userName: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  userIcon: {
    color: '#64748b'
  },
  userEmail: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  emailIcon: {
    color: '#64748b'
  },
  actions: {
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
  loadingContainer: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
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
    padding: '3rem'
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: '1rem'
  }
};

export default UtilisateursList;