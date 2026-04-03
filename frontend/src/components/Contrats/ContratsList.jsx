import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

const ContratsList = ({ actifId, canEdit }) => {
  const [contrats, setContrats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchContrats();
  }, [actifId]);

  const fetchContrats = async () => {
    const res = await api.get(`/actifs/${actifId}/contrats`);
    setContrats(res.data);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce contrat ?')) {
      await api.delete(`/actifs/contrats/${id}`);
      fetchContrats();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3>Contrats associés</h3>
        {canEdit && (
          <button onClick={() => setShowForm(true)}><FiPlus /> Ajouter</button>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Fournisseur</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Montant</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {contrats.map(c => (
            <tr key={c.id}>
              <td>{c.numero_contrat}</td>
              <td>{c.fournisseur}</td>
              <td>{new Date(c.date_debut).toLocaleDateString()}</td>
              <td>{new Date(c.date_fin).toLocaleDateString()}</td>
              <td>{c.montant}</td>
              {canEdit && (
                <td>
                  <button onClick={() => setEditing(c)}><FiEdit /></button>
                  <button onClick={() => handleDelete(c.id)}><FiTrash2 /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Formulaire d'ajout/édition (à implémenter) */}
    </div>
  );
};

export default ContratsList;