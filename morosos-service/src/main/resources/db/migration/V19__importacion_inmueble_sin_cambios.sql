ALTER TABLE importacion_inmueble
    ADD COLUMN IF NOT EXISTS sin_cambios INT NOT NULL DEFAULT 0;
