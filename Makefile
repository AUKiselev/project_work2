# Короткие команды для запуска стека.
# Все переменные берутся из корневого .env.

COMPOSE       := docker compose --env-file .env --project-directory .
DEV_FILES     := -f infra/docker/compose.base.yml -f infra/docker/dev/compose.yml
PROD_FILES    := -f infra/docker/compose.base.yml -f infra/docker/prod/compose.yml

.PHONY: help init dev prod down logs ps build restart-% sh-% clean

help:
	@echo "make init          — создать .env из .env.example"
	@echo "make dev           — поднять стек для разработки"
	@echo "make prod          — поднять стек для продакшена"
	@echo "make down          — остановить и удалить контейнеры"
	@echo "make logs          — логи всех сервисов"
	@echo "make ps            — статус контейнеров"
	@echo "make build         — пересобрать образы"
	@echo "make sh-<service>  — shell в контейнер (frontend/backend/postgres/traefik)"
	@echo "make clean         — удалить контейнеры и тома (ОСТОРОЖНО)"

init:
	@test -f .env || cp .env.example .env && echo ".env создан — заполни значения"

dev:
	$(COMPOSE) $(DEV_FILES) up -d --build

prod:
	$(COMPOSE) $(PROD_FILES) up -d --build

down:
	$(COMPOSE) $(DEV_FILES) down

logs:
	$(COMPOSE) $(DEV_FILES) logs -f

ps:
	$(COMPOSE) $(DEV_FILES) ps

build:
	$(COMPOSE) $(DEV_FILES) build

sh-%:
	$(COMPOSE) $(DEV_FILES) exec $* sh

clean:
	$(COMPOSE) $(DEV_FILES) down -v
