const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const router = express.Router();

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Tentative de connexion:', email);

    // Validation de base
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Chercher l'utilisateur
    const user = await User.findOne({ where: { email } });

    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    console.log('✅ Utilisateur trouvé:', user.email, 'Rôle:', user.role);

    // Vérifier le mot de passe
    let isValidPassword = false;

    // Test avec bcrypt d'abord
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('🔑 Test bcrypt:', isValidPassword ? 'OK' : 'Échec');
    } catch (err) {
      console.log('⚠️ Erreur bcrypt:', err.message);
    }

    // Fallback pour le debug (À SUPPRIMER EN PRODUCTION)
    if (!isValidPassword && password === 'admin123') {
      isValidPassword = true;
      console.log('⚠️ Connexion avec mot de passe en clair (debug)');
    }

    if (!isValidPassword) {
      console.log('❌ Mot de passe incorrect pour:', email);
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'votre_secret_temporaire',
      { expiresIn: '24h' }
    );

    // Mettre le token dans un cookie HTTP-only
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // true en production avec HTTPS
      sameSite: 'lax', // ← important pour les requêtes cross-origin
      maxAge: 24 * 60 * 60 * 1000 // 24 heures
    });

    // Retourner les infos utilisateur (sans le mot de passe)
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    console.log('✅ Connexion réussie pour:', email);
    res.json({ user: userResponse, token }); // Optionnel: renvoyer aussi le token pour le stockage localStorage

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Déconnexion
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Déconnexion réussie' });
});

// Récupérer l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_temporaire');
    
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    console.error('❌ Erreur me:', error);
    res.status(401).json({ message: 'Token invalide' });
  }
});

module.exports = router;