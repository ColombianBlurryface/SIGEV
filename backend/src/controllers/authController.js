const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * Controlador de autenticación.
 *
 * Solo maneja el inicio de sesión: no existe endpoint de registro.
 * Los usuarios se crean directo en la base de datos con src/scripts/crearUsuario.js.
 */

/**
 * POST /api/auth/login
 * Recibe { usuario, password }. Si las credenciales son correctas devuelve un
 * token JWT (válido por 8 horas) y los datos básicos del usuario.
 */
const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'usuario y password son obligatorios' });
    }

    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true',
      [usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Se usa el mismo mensaje para usuario inexistente y contraseña incorrecta,
    // así no se revela cuáles usuarios existen.
    const usuarioEncontrado = resultado.rows[0];
    // La contraseña nunca se guarda en texto plano: se compara contra su hash (bcrypt)
    const passwordValido = await bcrypt.compare(password, usuarioEncontrado.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // El token lleva el id, el usuario y el rol; el frontend lo envía en cada petición
    const token = jwt.sign(
      { id: usuarioEncontrado.id, usuario: usuarioEncontrado.usuario, rol: usuarioEncontrado.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuarioEncontrado.id,
        nombre_completo: usuarioEncontrado.nombre_completo,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión', detalle: error.message });
  }
};

module.exports = { login };
