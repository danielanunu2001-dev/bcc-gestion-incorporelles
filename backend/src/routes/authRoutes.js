// backend/src/routes/auth.routes.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, AuditLog } = require('../models');
const { authLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

/**
 * Journalisation des tentatives de connexion
 */
const logAuthAttempt = async (userId, email, success, ipAddress, userAgent, failureReason = null) => {
  try {
    await AuditLog.create({
      user_id: userId,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      table_name: 'auth',
      record_id: userId,
      new_data: { 
        email, 
        success, 
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: failureReason,
        timestamp: new Date().toISOString()
      },
      ip_address: ipAddress
    });
    console.log(`📝 Log auth: ${success ? 'Succès' : 'Échec'} pour ${email}`);
  } catch (error) {
    console.error('❌ Erreur lors du log auth:', error.message);
  }
};

/**
 * Vérification du statut du compte
 */
const checkAccountStatus = (user) => {
  if (!user.actif) {
    return { valid: false, message: 'Compte désactivé. Contactez l\'administrateur.' };
  }
  
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return { valid: false, message: `Compte temporairement verrouillé. Réessayez dans ${minutesLeft} minutes.` };
  }
  
  return { valid: true };
};

/**
 * Incrémentation du compteur de tentatives échouées
 */
const incrementFailedAttempts = async (user) => {
  const failedAttempts = (user.failed_login_attempts || 0) + 1;
  const updateData = { failed_login_attempts: failedAttempts };
  
  // Verrouiller le compte après 5 tentatives échouées
  if (failedAttempts >= 5) {
    const lockDuration = 15 * 60 * 1000; // 15 minutes
    updateData.locked_until = new Date(Date.now() + lockDuration);
    updateData.failed_login_attempts = 0;
    console.log(`🔒 Compte verrouillé pour 15 minutes: ${user.email}`);
  }
  
  await user.update(updateData);
  return failedAttempts;
};

/**
 * Réinitialisation du compteur de tentatives échouées
 */
const resetFailedAttempts = async (user) => {
  if (user.failed_login_attempts > 0 || user.locked_until) {
    await user.update({
      failed_login_attempts: 0,
      locked_until: null
    });
    console.log(`✅ Compteur de tentatives réinitialisé: ${user.email}`);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Connexion utilisateur
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log('🔐 Tentative de connexion:', email);

    // Validation des champs
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Format d\'email invalide' 
      });
    }

    // Recherche de l'utilisateur
    const user = await User.findOne({ where: { email } });

    if (!user) {
      await logAuthAttempt(null, email, false, ipAddress, userAgent, 'Utilisateur non trouvé');
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }

    console.log('✅ Utilisateur trouvé:', user.email, 'Rôle:', user.role);

    // Vérification du statut du compte
    const accountStatus = checkAccountStatus(user);
    if (!accountStatus.valid) {
      await logAuthAttempt(user.id, email, false, ipAddress, userAgent, accountStatus.message);
      return res.status(401).json({ 
        success: false,
        message: accountStatus.message 
      });
    }

    // Vérification du mot de passe
    let isValidPassword = false;
    let compareError = null;

    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log('🔑 Test bcrypt:', isValidPassword ? 'OK' : 'Échec');
    } catch (err) {
      compareError = err.message;
      console.log('⚠️ Erreur bcrypt:', err.message);
    }

    // Gestion des tentatives échouées
    if (!isValidPassword) {
      const attempts = await incrementFailedAttempts(user);
      const remainingAttempts = 5 - attempts;
      
      await logAuthAttempt(user.id, email, false, ipAddress, userAgent, 'Mot de passe incorrect');
      
      console.log('❌ Mot de passe incorrect pour:', email);
      return res.status(401).json({ 
        success: false,
        message: `Email ou mot de passe incorrect. Il vous reste ${remainingAttempts} tentative(s).`,
        remainingAttempts
      });
    }

    // Réinitialisation des tentatives échouées
    await resetFailedAttempts(user);

    // Mise à jour de la dernière connexion
    await user.update({
      last_login: new Date(),
      last_login_ip: ipAddress
    });

    // Création du token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        full_name: user.full_name
      },
      process.env.JWT_SECRET || 'votre_secret_temporaire',
      { expiresIn: '24h' }
    );

    // Configuration du cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction, // true en production avec HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    // Préparation de la réponse utilisateur
    const userResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      last_login: user.last_login
    };

    // Journalisation du succès
    await logAuthAttempt(user.id, email, true, ipAddress, userAgent);

    console.log('✅ Connexion réussie pour:', email);
    
    res.json({ 
      success: true,
      message: 'Connexion réussie',
      user: userResponse,
      token // Optionnel: pour le stockage localStorage côté frontend
    });

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur. Veuillez réessayer plus tard.' 
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion utilisateur
 * @access  Public
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (token && req.user) {
      // Optionnel: Ajouter le token à une blacklist Redis
      await logAuthAttempt(req.user.id, req.user.email, true, req.ip, req.headers['user-agent'], 'Déconnexion');
    }
    
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    res.json({ 
      success: true,
      message: 'Déconnexion réussie' 
    });
  } catch (error) {
    console.error('❌ Erreur logout:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la déconnexion' 
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Récupérer l'utilisateur connecté
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Non authentifié' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_temporaire');
    
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérification du statut du compte
    const accountStatus = checkAccountStatus(user);
    if (!accountStatus.valid) {
      return res.status(401).json({ 
        success: false,
        message: accountStatus.message 
      });
    }

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        actif: user.actif,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('❌ Erreur me:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalide' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Session expirée, veuillez vous reconnecter' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Rafraîchir le token JWT
 * @access  Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Non authentifié' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_temporaire');
    
    // Vérifier que l'utilisateur existe toujours
    const user = await User.findByPk(decoded.id);
    if (!user || !user.actif) {
      return res.status(401).json({ 
        success: false,
        message: 'Utilisateur non valide' 
      });
    }

    // Créer un nouveau token
    const newToken = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        full_name: user.full_name
      },
      process.env.JWT_SECRET || 'votre_secret_temporaire',
      { expiresIn: '24h' }
    );

    // Mettre à jour le cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ 
      success: true,
      message: 'Token rafraîchi avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur refresh:', error);
    res.status(401).json({ 
      success: false,
      message: 'Session expirée, veuillez vous reconnecter' 
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Changer le mot de passe
 * @access  Private
 */
router.post('/change-password', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Non authentifié' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_temporaire');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
      });
    }

    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier l'ancien mot de passe
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Mot de passe actuel incorrect' 
      });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await user.update({ password_hash: hashedPassword });
    
    await logAuthAttempt(user.id, user.email, true, req.ip, req.headers['user-agent'], 'Changement de mot de passe');

    res.json({ 
      success: true,
      message: 'Mot de passe modifié avec succès' 
    });
  } catch (error) {
    console.error('❌ Erreur change-password:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur lors du changement de mot de passe' 
    });
  }
});

module.exports = router;