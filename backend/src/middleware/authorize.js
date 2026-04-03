/**
 * Middleware pour vérifier si l'utilisateur a un rôle parmi ceux autorisés.
 * @param  {...string} roles - Liste des rôles autorisés (ex: 'admin', 'comptable')
 * @returns {function} Middleware Express
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit pour votre rôle' });
    }
    next();
  };
};

module.exports = authorize;