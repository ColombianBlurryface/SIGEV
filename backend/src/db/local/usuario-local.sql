-- =============================================================================
-- SIGEV: usuario SOLO para la base local de desarrollo (docker compose)
-- =============================================================================
-- Usuario: dev    Contraseña: local1234
-- Se crea únicamente en la base local que levanta docker-compose.yml. Nunca se carga en QA ni en
-- producción: allí los usuarios los crea el administrador con src/scripts/crearUsuario.js.
-- =============================================================================
INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
VALUES ('dev', '$2b$10$7FB75qMDkRWJy6KdnCzILeIP9X5wemRBtU4Fkao69UodG50W3Tjfm', 'Usuario de desarrollo local', 'admin')
ON CONFLICT (usuario) DO NOTHING;
