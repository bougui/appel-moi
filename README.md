# Gestion des transferts d'appels

Application web pour gérer les transferts d'appels téléphoniques du Camp Paul B.

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

## Structure du projet

```bash
project/
├── terraform
│ ├── main.tf
│ ├── variables.tf
│ ├── outputs.tf
│ └── terraform.tfvars
├── backend/
│ └── index.js # Code Lambda
├── frontend/
│ ├── images/
│ │ └── background.jpg # Image de fond
│ ├── index.html
│ ├── script.js
│ └── style.css
├── terraform/
│ ├── main.tf
│ ├── variables.tf
│ ├── outputs.tf
│ └── terraform.tfvars
├── vercel.json          # Configuration Vercel
└── Makefile
```

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
