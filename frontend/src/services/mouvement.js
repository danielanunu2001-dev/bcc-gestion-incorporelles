import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useParams } from 'react-router-dom';

const MouvementsList = () => {
  const { id } = useParams();
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'transfert',
    date: new Date().toISOString().split('T')[0],
    description: '',
    details: {}
  });

  useEffect(() => {
    fetchMouvements();
  }, []);

  const fetchMouvements = async () => {
    try {
      const res = await api.get(`/actifs/${id}/mouvements`);
      setMouvements(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/actifs/${id}/mouvements`, formData);
      setShowForm(false);
      fetchMouvements();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h3>Historique des mouvements</h3>
      <button onClick={() => setShowForm(!showForm)}>Nouveau mouvement</button>
      {showForm && (
        <form onSubmit={handleSubmit}>
          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
            <option value="entree">Entrée</option>
            <option value="transfert">Transfert</option>
            <option value="maintenance">Maintenance</option>
            <option value="sortie">Sortie</option>
          </select>
          <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          <input type="text" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          {/* Ajouter des champs dynamiques selon le type */}
          <button type="submit">Enregistrer</button>
        </form>
      )}
      {loading ? <p>Chargement...</p> : (
        <ul>
          {mouvements.map(m => (
            <li key={m.id}>
              {m.type} - {m.date} - {m.description} (par {m.createur?.full_name})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};