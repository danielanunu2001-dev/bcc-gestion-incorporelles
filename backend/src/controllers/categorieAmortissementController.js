const { CategorieAmortissement, User } = require('../models');

// Récupérer toutes les catégories actives
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await CategorieAmortissement.findAll({
      where: { actif: true },
      order: [['code_categorie', 'ASC']]
    });
    res.json(categories);
  } catch (error) {
    console.error('Erreur getAllCategories:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer une catégorie par ID
exports.getCategorieById = async (req, res) => {
  try {
    const { id } = req.params;
    const categorie = await CategorieAmortissement.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });
    res.json(categorie);
  } catch (error) {
    console.error('Erreur getCategorieById:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Créer une catégorie
exports.createCategorie = async (req, res) => {
  try {
    const categorieData = req.body;
    categorieData.created_by = req.user.id;
    categorieData.updated_by = req.user.id;
    const categorie = await CategorieAmortissement.create(categorieData);
    res.status(201).json(categorie);
  } catch (error) {
    console.error('Erreur createCategorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour une catégorie
exports.updateCategorie = async (req, res) => {
  try {
    const { id } = req.params;
    const categorie = await CategorieAmortissement.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });
    await categorie.update({ ...req.body, updated_by: req.user.id });
    res.json(categorie);
  } catch (error) {
    console.error('Erreur updateCategorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Désactiver une catégorie (suppression logique)
exports.deleteCategorie = async (req, res) => {
  try {
    const { id } = req.params;
    const categorie = await CategorieAmortissement.findByPk(id);
    if (!categorie) return res.status(404).json({ message: 'Catégorie non trouvée' });
    await categorie.update({ actif: false, updated_by: req.user.id });
    res.json({ message: 'Catégorie désactivée' });
  } catch (error) {
    console.error('Erreur deleteCategorie:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};