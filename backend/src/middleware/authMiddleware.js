const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  console.log(`🔐 [AUTH] Début - ${req.method} ${req.path}`);

  try {
    let token = null;

    // 1. Essayer de récupérer le token du cookie
    token = req.cookies?.token;
    console.log(`[AUTH] Token depuis cookie: ${token ? 'présent' : 'absent'}`);

    // 2. Si pas de cookie, essayer le header Authorization
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log(`[AUTH] Token depuis header: ${token ? 'présent' : 'absent'}`);
      }
    }

    if (!token) {
      console.log(`[AUTH] ❌ Aucun token trouvé - ${Date.now() - startTime}ms`);
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Vérifier le token
    console.log(`[AUTH] Vérification du token JWT...`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'MaCleJWT_TresLongue_Complexe_Secrete_1234567890!@#ABCDEF');
    console.log(`[AUTH] ✅ Token valide pour user ID: ${decoded.id}`);

    // Récupérer l'utilisateur avec un timeout explicite
    console.log(`[AUTH] Recherche utilisateur en base de données...`);
    const user = await Promise.race([
      User.findByPk(decoded.id),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout DB après 5 secondes')), 5000)
      )
    ]);

    if (!user) {
      console.log(`[AUTH] ❌ Utilisateur non trouvé - ${Date.now() - startTime}ms`);
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    console.log(`[AUTH] ✅ Utilisateur trouvé: ${user.email} (${user.role})`);
    console.log(`[AUTH] ✅ Authentification réussie - ${Date.now() - startTime}ms`);

    // Ajouter l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    console.error(`[AUTH] ❌ Erreur après ${Date.now() - startTime}ms:`, error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    if (error.message.includes('Timeout')) {
      return res.status(500).json({ message: 'Erreur base de données - timeout' });
    }
    
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

module.exports = authMiddleware;