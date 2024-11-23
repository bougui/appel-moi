# Gestion des transferts d'appels

## Déploiement

### Frontend (Vercel)
Le frontend est déployé automatiquement sur Vercel :
- Branch `main` → Production (`camp-paul-b.vercel.app`)
- Branch `vercel-dev` → Développement (`vercel-dev-camp-paul-b.vercel.app`)

Pour développer :

```bash
# Créer une branche de dev
git checkout -b vercel-dev

# Faire les modifications
# ... modifier les fichiers ...

# Commit et push pour déployer en dev
git add .
git commit -m "vos changements"
git push origin vercel-dev

# Une fois testé, merger en production
git checkout main
git merge vercel-dev
git push origin main
```

### Backend (AWS)
```bash
make deploy-backend
```

## Structure du projet
```
.
├── frontend/          # Déployé sur Vercel
├── backend/           # Déployé sur AWS Lambda
├── terraform/         # Infrastructure AWS
└── vercel.json        # Configuration Vercel
```

## Architecture

- **Frontend** : Hébergé sur Vercel.com (contenu statique)
- **Backend** : AWS Lambda + API Gateway
- **Configuration** : AWS Systems Manager Parameter Store

## Prérequis

- AWS CLI configuré avec les accès appropriés
- Terraform v1.0+
- Make
- Node.js et Vercel CLI
- Une image de fond (à placer dans `frontend/images/background.jpg`)

## Configuration

1. Copiez `terraform.tfvars.example` vers `terraform.tfvars` et ajustez les variables :

```hcl
project_name         = "votre-projet"
environment          = "prod"
aws_region          = "ca-central-1"
project_description = "Gestion des transferts d'appels pour le Camp Paul B"
frontend_url        = "https://votre-projet.vercel.app"
```

2. Placez votre image de fond dans `frontend/images/background.jpg`


## Déploiement

1. **Backend (AWS)** :
```bash
make deploy-backend
```

2. **Frontend (Vercel)** :
```bash
npx vercel --prod
```

## Variables SSM requises

Les variables suivantes doivent être configurées dans AWS Systems Manager Parameter Store :
- `/{project_name}/{environment}/app_username`
- `/{project_name}/{environment}/app_password`

## Commandes Make disponibles

```bash
# Déployer le backend
make deploy-backend

# Générer la configuration frontend et déployer sur Vercel
make deploy-frontend

# Détruire l'infrastructure AWS
make destroy

# Initialiser Terraform
make init
```

## Fonctionnalités

- Interface de connexion sécurisée
- Gestion des transferts d'appels
- Support des notifications SMS
- Interface responsive avec fond personnalisé
- Messages de confirmation et d'erreur

## Makefile

Le Makefile automatise plusieurs tâches :

- Gestion des déploiements backend et frontend
- Injection des variables d'environnement
- Configuration dynamique du frontend
- Synchronisation avec S3
- Gestion des paramètres SSM

Principales variables du Makefile :
```makefile
PROJECT_NAME := nom-du-projet
ENVIRONMENT := prod
AWS_REGION := ca-central-1
```

## Sécurité

- Authentification requise
- Stockage sécurisé des credentials dans SSM
- CORS configuré pour le domaine Vercel
- HTTPS automatique via Vercel

## Support

Pour toute question ou problème, contactez l'équipe de maintenance.

```

Ce README :
1. Reflète la structure actuelle du projet
2. Inclut les nouvelles fonctionnalités (image de fond, etc.)
3. Détaille les commandes Make
4. Explique la configuration requise
5. Fournit une documentation complète pour les nouveaux développeurs
```
