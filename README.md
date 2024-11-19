# Application de Transfert Twilio

Cette application permet de gérer les transferts d'appels Twilio vers différents numéros de téléphone via une interface web sécurisée.

## Prérequis

- Compte AWS avec accès CLI configuré
- Compte Twilio avec un workflow configuré
- Terraform installé (v1.0.0+)
- Node.js installé (v14+)
- AWS CLI installé et configuré

## Structure du Projet

```bash
project/
├── terraform
│ ├── main.tf
│ ├── variables.tf
│ ├── outputs.tf
│ └── terraform.tfvars
├── backend/
│ └── index.js
└── frontend/
├── index.html
├── style.css
└── script.js
```

## Déploiement

### 1. Configuration des variables

1. Créez une copie du fichier `terraform.tfvars.example`:

bash
cd terraform
cp terraform.tfvars.example terraform.tfvars

2. Remplissez les variables dans `terraform.tfvars`:

```hcl
twilio_account_sid  = "votre_sid"
twilio_auth_token   = "votre_token"
twilio_workflow_sid = "votre_workflow_sid"
app_password        = "mot_de_passe_initial"
project_name        = "twilio-transfer"
environment         = "prod"
phone_numbers       = [
                        "+14501234567",
                        "+14509876543",
                        "+14505555555",
                        "+14507777777"
                      ]
```

### 2. Préparation du backend

1. Installez les dépendances:
```bash
cd backend
npm init -y
npm install aws-sdk twilio
```

2. Créez le package pour Lambda:
```bash
zip -r ../terraform/index.js.zip index.js node_modules/
```

### 3. Déploiement avec Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 4. Configuration des numéros dans SSM

Utilisez AWS CLI pour ajouter les numéros de téléphone:

```bash
# Création des numéros de téléphone
aws ssm put-parameter \
    --name "/twilio-transfer/prod/phone_numbers" \
    --type "SecureString" \
    --value "[\"'+33123456789'\",\"'+33987654321'\",\"'+33555555555'\",\"'+33666666666'\"]"

# Vérification
aws ssm get-parameter \
    --name "/twilio-transfer/prod/phone_numbers" \
    --with-decryption
```

### 5. Déploiement du Frontend

1. Récupérez l'URL de l'API depuis les outputs Terraform:
```bash
terraform output api_url
```

2. Mettez à jour l'URL de l'API dans `frontend/script.js`

3. Déployez le frontend (exemple avec S3):
```bash
aws s3 sync frontend/ s3://votre-bucket-name/
```

## Tests

### 1. Test du Backend (Lambda)

Créez un fichier de test `test-event.json`:
```json
{
  "httpMethod": "POST",
  "body": "{\"password\":\"votre_mot_de_passe\",\"phoneNumber\":\"+33123456789\"}"
}
```

Testez la Lambda:
```bash
aws lambda invoke \
    --function-name twilio-transfer-manager \
    --payload file://test-event.json \
    response.json
```

### 2. Test des Paramètres SSM

```bash
# Test de lecture du mot de passe
aws ssm get-parameter \
    --name "/twilio-transfer/prod/app_password" \
    --with-decryption

# Test de lecture des numéros
aws ssm get-parameter \
    --name "/twilio-transfer/prod/phone_numbers" \
    --with-decryption
```

### 3. Test de l'API Gateway

```bash
# Test avec curl
curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"password":"votre_mot_de_passe","phoneNumber":"+33123456789"}' \
     https://votre-api-url/transfer

# Test de récupération des numéros
curl https://votre-api-url/transfer
```

### 4. Test du Frontend

1. Ouvrez l'application dans un navigateur
2. Testez la connexion avec le mot de passe
3. Vérifiez que les numéros sont bien chargés
4. Testez le changement de numéro de transfert

## Maintenance

### Mise à jour des numéros de téléphone

```bash
aws ssm put-parameter \
    --name "/twilio-transfer/prod/phone_numbers" \
    --type "SecureString" \
    --value "[\"'+33NOUVEAU1'\",\"'+33NOUVEAU2'\",\"'+33NOUVEAU3'\",\"'+33NOUVEAU4'\"]" \
    --overwrite
```

### Mise à jour du mot de passe

```bash
aws ssm put-parameter \
    --name "/twilio-transfer/prod/app_password" \
    --type "SecureString" \
    --value "nouveau_mot_de_passe" \
    --overwrite
```

## Nettoyage des ressources

Pour supprimer toutes les ressources créées:

```bash
# Suppression des paramètres SSM
aws ssm delete-parameter --name "/twilio-transfer/prod/phone_numbers"
aws ssm delete-parameter --name "/twilio-transfer/prod/app_password"

# Suppression de l'infrastructure
cd terraform
terraform destroy
```

## Dépannage

### Logs Lambda
```bash
aws logs filter-log-events \
    --log-group-name /aws/lambda/twilio-transfer-manager \
    --start-time $(date -v-1H +%s000)
```

### Test de connectivité Twilio
```bash
# Dans la console Lambda, utilisez ce code de test:
exports.handler({
    httpMethod: "GET",
    body: JSON.stringify({
        test: "connection"
    })
});
```

## Support

Pour tout problème ou question, veuillez créer une issue dans ce dépôt.
```

Ce README fournit une documentation complète pour :
1. Le déploiement étape par étape
2. La configuration des numéros dans SSM
3. Les tests de chaque composant
4. La maintenance et le dépannage
5. Le nettoyage des ressources

Vous pouvez l'adapter selon vos besoins spécifiques ou ajouter d'autres sections si nécessaire.

