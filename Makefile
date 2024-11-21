# Lecture du project_name depuis terraform.tfvars
PROJECT_NAME := $(shell awk -F'=' '/project_name/ {gsub(/"/, "", $$2); gsub(/[ \t]/, "", $$2); print $$2}' terraform/terraform.tfvars)
AWS_REGION := ca-central-1
ENVIRONMENT := prod

# Vérification que PROJECT_NAME n'est pas vide
ifeq ($(PROJECT_NAME),)
$(error PROJECT_NAME n'a pas pu être lu depuis terraform.tfvars)
endif

# Couleurs pour les messages
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

.PHONY: all deploy deploy-backend deploy-frontend clean help debug

# Commande par défaut
all: deploy

# Déploiement complet
deploy: deploy-backend deploy-frontend
	@echo "${GREEN}Déploiement complet terminé!${NC}"

# Ajouter après les variables existantes
BACKEND_SOURCES := backend/index.js backend/package.json backend/node_modules
TERRAFORM_SOURCES := $(shell find terraform -type f -name "*.tf" -o -name "*.tfvars")

# Remplacer l'ancienne règle deploy-backend par celles-ci
terraform/index.js.zip: $(BACKEND_SOURCES)
	@echo "${YELLOW}Mise à jour du zip backend...${NC}"
	cd backend && zip -ur ../terraform/index.js.zip index.js package.json node_modules/

deploy-backend: terraform/index.js.zip $(TERRAFORM_SOURCES)
	@echo "${YELLOW}Déploiement du backend...${NC}"
	cd terraform && terraform init && terraform apply -auto-approve

# Déploiement du frontend (S3)
deploy-frontend:
	@echo "${YELLOW}Création de la configuration frontend...${NC}"
	$(eval API_URL=$(shell cd terraform && terraform output -raw api_url))
	$(eval PROJECT_DESC=$(shell cd terraform && terraform output -raw project_description))
	@echo "const API_URL = '${API_URL}';" > frontend/config.js
	@echo "const PROJECT_NAME = '${PROJECT_NAME}';" >> frontend/config.js
	@echo "const PROJECT_DESCRIPTION = '${PROJECT_DESC}';" >> frontend/config.js
	@echo "${YELLOW}Déploiement du frontend...${NC}"
	aws s3 sync frontend/ s3://$(PROJECT_NAME)/ \
		--delete \
		--cache-control "no-cache,no-store,must-revalidate" \
		--region $(AWS_REGION)

# Nettoyage
clean:
	@echo "${GREEN}Nettoyage...${NC}"
	rm -f terraform/index.js.zip
	cd terraform && terraform destroy -auto-approve

# Debug
debug:
	@echo "PROJECT_NAME: $(PROJECT_NAME)"

# Aide
help:
	@echo "Commandes disponibles:"
	@echo "  make              - Déploie tout (backend et frontend)"
	@echo "  make deploy       - Même chose que 'make'"
	@echo "  make deploy-backend  - Déploie uniquement le backend"
	@echo "  make deploy-frontend - Déploie uniquement le frontend"
	@echo "  make clean        - Nettoie et détruit l'infrastructure"
	@echo "  make debug        - Affiche les variables"
	@echo "  make help         - Affiche cette aide" 