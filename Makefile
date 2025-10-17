.PHONY: help install migrate migrate-rollback run dev create-example-excel init-db install-fonts report

help:
	@echo "Доступные команды:"
	@echo "  make install            - Установка зависимостей"
	@echo "  make install-fonts      - Установка шрифтов для PDF отчетов"
	@echo "  make init-db            - Инициализация базы данных"
	@echo "  make migrate            - Применение миграций"
	@echo "  make migrate-rollback   - Откат миграций"
	@echo "  make run                - Запуск бота"
	@echo "  make create-example     - Создание примера Excel файла"
	@echo "  make report             - Генерация отчета за текущий месяц"

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

install-fonts:
	./scripts/install_fonts.sh

report:
	python scripts/generate_report.py

