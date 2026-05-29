const aiService = require('./aiService'); // ton service existant pour appeler Mistral
const TauxService = require('./tauxService');
const { Actif, Devise, CategorieAmortissement } = require('../models');

class AIValidationService {
  /**
   * Valide les données d'un actif et retourne les anomalies + suggestions
   */
  static async validerActif(donnees) {
    const prompt = `
      Tu es un expert comptable spécialisé en immobilisations. Analyse les données suivantes d'un actif et détecte les anomalies ou incohérences possibles.
      
      Données :
      - Code: ${donnees.code || 'non fourni'}
      - Nom: ${donnees.nom || 'non fourni'}
      - Type: ${donnees.type || 'non fourni'}
      - Date acquisition: ${donnees.date_acquisition || 'non fournie'}
      - Coût acquisition (CDF): ${donnees.cout_acquisition || 'non fourni'}
      - Devise: ${donnees.devise_code || 'CDF'}
      - Montant devise: ${donnees.montant_devise || 'non fourni'}
      - Durée utile (ans): ${donnees.duree_utile_ans || 'non fournie'}
      - Mode amortissement: ${donnees.mode_amortissement || 'non fourni'}
      - Taux amortissement: ${donnees.taux_amortissement || 'calculé automatiquement'}
      - Valeur résiduelle: ${donnees.valeur_residuelle || 0}
      - Type immobilisation: ${donnees.type_immobilisation || 'non fourni'}
      - Date validité (si incorporel): ${donnees.date_validite || 'non fournie'}
      
      Réponds au format JSON suivant :
      {
        "anomalies": ["liste des anomalies détectées"],
        "suggestions": ["liste des corrections suggérées"],
        "donnees_corrigees": {
          // les champs corrigés (uniquement ceux à modifier)
        },
        "confiance": 0-100
      }
      
      Sois strict sur les règles comptables : la valeur nette ne doit pas être négative, le taux d'amortissement doit être cohérent avec la durée, etc.
    `;
    
    const reponse = await aiService.ask(prompt); // à adapter selon ton aiService
    let result;
    try {
      result = JSON.parse(reponse);
    } catch(e) {
      result = { anomalies: ["Erreur parsing IA"], suggestions: [], donnees_corrigees: {}, confiance: 0 };
    }
    return result;
  }

  /**
   * Génère une fiche d'actif complète à partir d'une description textuelle
   */
  static async genererActifDepuisDescription(description, userId) {
    const prompt = `
      Tu es un expert comptable. À partir de la description suivante, génère une fiche d'actif complète et cohérente avec les règles comptables (GCEC).
      
      Description : "${description}"
      
      Réponds au format JSON suivant :
      {
        "code": "code unique proposé",
        "nom": "nom de l'actif",
        "type": "logiciel|brevet|licence|fonds_commercial|materiel|vehicule|bâtiment|terrain|autres",
        "date_acquisition": "YYYY-MM-DD",
        "cout_acquisition": nombre (en CDF),
        "devise_code": "CDF|USD|EUR|GBP|CNY",
        "montant_devise": nombre (si devise différente de CDF),
        "duree_utile_ans": nombre,
        "mode_amortissement": "lineaire|degressif",
        "taux_amortissement": nombre (en %),
        "valeur_residuelle": nombre,
        "type_immobilisation": "corporel|incorporel",
        "date_validite": "YYYY-MM-DD ou null",
        "fournisseur": "nom du fournisseur si mentionné",
        "numero_facture": "numéro si mentionné",
        "localisation": "localisation si mentionnée",
        "description": "description complète"
      }
      
      Si certaines informations ne sont pas dans la description, utilise des valeurs par défaut raisonnables (ex: durée 5 ans, mode linéaire, etc.).
    `;
    
    const reponse = await aiService.ask(prompt);
    let fiche;
    try {
      fiche = JSON.parse(reponse);
    } catch(e) {
      throw new Error("L'IA n'a pas pu générer une fiche valide");
    }
    
    // Enrichir avec les données de référence (catégories, taux de change)
    if (fiche.devise_code && fiche.devise_code !== 'CDF') {
      const conversion = await TauxService.convertToCDF(fiche.montant_devise || fiche.cout_acquisition, fiche.devise_code, fiche.date_acquisition);
      fiche.cout_acquisition = conversion.montant_cdf;
      fiche.taux_change_utilisation = conversion.taux_utilise;
    }
    
    // Suggérer une catégorie d'amortissement si possible
    const categorie = await CategorieAmortissement.findOne({
      where: { duree_vie_ans: fiche.duree_utile_ans }
    });
    if (categorie) {
      fiche.categorie_id = categorie.id;
    }
    
    return fiche;
  }
}

module.exports = AIValidationService;