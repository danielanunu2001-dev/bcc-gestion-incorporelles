# 🏦 BCC - Gestion des Immobilisations Incorporelles

## 📋 Description

Application web de gestion des immobilisations (actifs incorporels et corporels) pour la Banque Commerciale du Congo (BCC).

### Fonctionnalités principales

- ✅ Gestion complète des actifs (création, modification, suppression)
- ✅ Amortissements linéaires et dégressifs
- ✅ Gestion des contrats (maintenance, licence, assurance)
- ✅ Réévaluations et dépréciations (normes IFRS)
- ✅ Suivi des mouvements (transfert, maintenance, cession)
- ✅ Gestion documentaire (upload de fichiers)
- ✅ Tableau de bord analytique
- ✅ Rapports personnalisés (Excel, PDF)
- ✅ Journal d'audit complet
- ✅ Gestion multi-utilisateurs avec rôles et permissions

---

## 👥 RÔLES ET PERMISSIONS

### 1. ADMINISTRATEUR (admin)
**Accès complet** - Toutes les fonctionnalités

| Module | Actions |
|--------|---------|
| Actifs | ✅ Créer, Modifier, Supprimer, Consulter |
| Contrats | ✅ Créer, Modifier, Supprimer, Consulter |
| Amortissements | ✅ Calculer, Recalculer |
| Réévaluations | ✅ Créer, Modifier, Supprimer |
| Dépréciations | ✅ Créer, Modifier, Supprimer |
| Mouvements | ✅ Créer, Valider, Supprimer |
| Documents | ✅ Uploader, Télécharger, Supprimer |
| Utilisateurs | ✅ Créer, Modifier, Supprimer |
| Audit | ✅ Consultation complète |
| Rapports | ✅ Tous les rapports |
| Export | ✅ Excel, PDF |

---

### 2. COMPTABLE (comptable)
**Gestion financière** - Focus sur les aspects comptables

| Module | Actions |
|--------|---------|
| Actifs | ✅ Créer, Modifier, Consulter |
| Amortissements | ✅ Calculer, Recalculer |
| Réévaluations | ✅ Créer, Modifier |
| Dépréciations | ✅ Créer, Modifier |
| Contrats | ✅ Consulter |
| Mouvements | ✅ Créer, Consulter |
| Documents | ✅ Uploader, Télécharger |
| Rapports | ✅ Tous les rapports financiers |
| Export | ✅ Excel, PDF |
| Suppression | ❌ Ne peut pas supprimer |
| Utilisateurs | ❌ Ne peut pas gérer |

---

### 3. AUDITEUR (auditeur)
**Contrôle et vérification** - Consultation seule

| Module | Actions |
|--------|---------|
| Actifs | ✅ Consultation uniquement |
| Amortissements | ✅ Consultation |
| Contrats | ✅ Consultation |
| Réévaluations | ✅ Consultation |
| Dépréciations | ✅ Consultation |
| Mouvements | ✅ Consultation |
| Audit | ✅ Consultation complète |
| Rapports | ✅ Tous les rapports |
| Export | ✅ Excel, PDF |
| Création/Modification | ❌ Interdit |

---

### 4. JURIDIQUE (juridique)
**Gestion des contrats** - Focus légal

| Module | Actions |
|--------|---------|
| Contrats | ✅ Créer, Modifier, Supprimer, Consulter |
| Documents | ✅ Uploader, Télécharger |
| Actifs | ✅ Consultation |
| Amortissements | ❌ Non accessible |
| Réévaluations | ❌ Non accessible |
| Dépréciations | ❌ Non accessible |
| Création actifs | ❌ Interdit |

---

### 5. INFORMATIQUE (informatique)
**Gestion technique** - Focus matériel et maintenance

| Module | Actions |
|--------|---------|
| Actifs | ✅ Consultation |
| Mouvements | ✅ Créer (maintenance, transfert) |
| Documents | ✅ Uploader, Télécharger |
| Contrats | ✅ Consultation |
| Amortissements | ❌ Non accessible |
| Création actifs | ❌ Interdit |

---

### 6. INVENTORISTE (inventoriste)
**Gestion terrain** - Focus inventaire physique

| Module | Actions |
|--------|---------|
| Actifs | ✅ Consultation + QR code |
| Inventaire | ✅ Consultation |
| Mouvements | ✅ Créer (entrée/sortie) |
| Contrats | ❌ Non accessible |
| Amortissements | ❌ Non accessible |
| Création actifs | ❌ Interdit |

---

## 🚀 INSTALLATION

### Prérequis

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### 1. Cloner le projet

```bash
git clone https://github.com/votre-repo/bcc-gestion-incorporelles.git
cd bcc-gestion-incorporelles

bcc-gestion-incorporelles/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Contrôleurs
│   │   ├── models/           # Modèles Sequelize
│   │   ├── routes/           # Routes API
│   │   ├── middleware/       # Middlewares (auth, upload)
│   │   ├── config/           # Configuration
│   │   └── utils/            # Utilitaires
│   ├── uploads/              # Fichiers uploadés
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # Pages React
│   │   ├── components/       # Composants réutilisables
│   │   ├── store/            # Redux store
│   │   ├── services/         # Services API
│   │   └── hooks/            # Hooks personnalisés
│   └── package.json
└── README.md

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Créer la base de données
sudo -u postgres psql
CREATE DATABASE bcc_gestion;
\q


# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_NAME=bcc_gestion

# JWT
JWT_SECRET=MaCleJWT_TresLongue_Complexe_Secrete_1234567890

# Serveur
PORT=5000
NODE_ENV=development

# Frontend
FRONTEND_URL=http://localhost:5173


# Backend (dans un terminal)
cd backend
npm run dev

# Frontend (dans un autre terminal)
cd frontend
npm run dev




---

## 📁 **Comment utiliser ce fichier**

1. **Crée le fichier** à la racine de ton projet
2. **Ouvre VS Code**
3. **Copie-colle** tout le contenu ci-dessus
4. **Sauvegarde** le fichier

```bash
# Dans le terminal, à la racine du projet
touch README.md
# ou
echo "# BCC - Gestion des Immobilisations" > README.md
# puis colle le contenu