"""Миграция: добавление полей для фотографий в таблицу records"""


def up(cursor):
    """
    Добавление полей photo_url и photo_uploaded_at в таблицу records
    """
    cursor.execute("""
        ALTER TABLE records 
        ADD COLUMN photo_url TEXT,
        ADD COLUMN photo_uploaded_at TIMESTAMP;
        
        -- Индекс для быстрого поиска записей с фото
        CREATE INDEX idx_records_with_photo ON records(photo_url) 
        WHERE photo_url IS NOT NULL;
        
        -- Комментарии к полям
        COMMENT ON COLUMN records.photo_url IS 'URL фотографии в S3 хранилище';
        COMMENT ON COLUMN records.photo_uploaded_at IS 'Дата и время загрузки фотографии';
    """)


def down(cursor):
    """
    Откат миграции - удаление полей photo_url и photo_uploaded_at
    """
    cursor.execute("""
        DROP INDEX IF EXISTS idx_records_with_photo;
        
        ALTER TABLE records 
        DROP COLUMN IF EXISTS photo_url,
        DROP COLUMN IF EXISTS photo_uploaded_at;
    """)

