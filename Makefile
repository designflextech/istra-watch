.PHONY: help install migrate migrate-rollback run dev create-example-excel init-db

help:
	@echo "Доступные команды:"
	@echo "  make install            - Установка зависимостей"
	@echo "  make init-db            - Инициализация базы данных"
	@echo "  make migrate            - Применение миграций"
	@echo "  make migrate-rollback   - Откат миграций"
	@echo "  make run                - Запуск бота"
	@echo "  make create-example     - Создание примера Excel файла"

install:
	pip install -r requirements.txt

init-db:
	createdb istra_watch || true

migrate:
	python -m bot.migrations.run migrate

migrate-rollback:
	python -m bot.migrations.run rollback

run:
	python main.py

create-example:
	python scripts/create_example_excel.py

