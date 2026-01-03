-- Pre-migration: Add slug values to Centers before unique constraint is added
UPDATE "Center" SET "slug" = 'default-' || "id" WHERE "slug" IS NULL OR "slug" = '';
