/**
 * Middleware que protege una ruta con el token de sesión (JWT).
 *
 * Revisa que la petición traiga la cabecera "Authorization: Bearer <token>"
 * y que el token sea válido y no haya vencido. Si todo está bien, guarda los
 * datos del usuario en req.usuario y deja pasar la petición.
 *
 * Nota: por ahora no está aplicado a ninguna ruta (pendiente: proteger la API).
 */
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // La cabecera tiene la forma "Bearer <token>"; nos quedamos solo con el token
  const token = authHeader.split(' ')[1];

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { verificarToken };
