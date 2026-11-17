ALTER TABLE inmueble ADD COLUMN beneficio_cuenta VARCHAR(30)
    CHECK (beneficio_cuenta IN ('Jubilados', 'Discapacidad', 'Tarifa social'));
