# Lecture du project_name depuis terraform.tfvars
PROJECT_NAME := $(shell awk -F'=' '/project_name/ {gsub(/"/, "", $$2); gsub(/[ \t]/, "", $$2); print $$2}' terraform/terraform.tfvars)
AWS_REGION := ca-central-1

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

# Déploiement du backend (Terraform)
deploy-backend:
	@echo "${YELLOW}Déploiement du backend...${NC}"
	cd backend && zip -r ../terraform/index.js.zip index.js package.json node_modules/
	cd terraform && terraform init && terraform apply -auto-approve

# Déploiement du frontend (S3)
deploy-frontend:
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