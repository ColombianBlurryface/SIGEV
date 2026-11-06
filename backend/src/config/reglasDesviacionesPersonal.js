/**
 * Reglas de comparación y diagnóstico de desviaciones de personal (HU-25 · RF-32).
 *
 * Evalúa el personal realmente asignado a un evento (registrado mediante la HU-28)
 * contra los estándares requeridos calculados automáticamente por el sistema:
 *   - Meseros (HU-21 · RF-28, RN-04): 1 mesero por cada 20 asistentes (Math.ceil(asistentes / 20)).
 *   - Cocina (HU-22 / RN-05): 2 cocineros por cada 25 asistentes (Math.ceil(asistentes / 25) * 2).
 *
 * Cuando se detecta una desviación (en especial déficit de personal), genera un estado de alerta
 * y calcula la diferencia exacta por rol, permitiendo al responsable de logística tomar decisiones
 * correctivas oportunas.
 */
const { calcularMeseros, calcularCocineros } = require('./reglasPersonal');

/**
 * Calcula la desviación para un rol específico de personal.
 *
 * @param {'WAITERS'|'COOKS'} role - Identificador técnico del rol
 * @param {number} requiredCount - Estándar calculado por el sistema
 * @param {number} assignedCount - Personal efectivamente asignado (HU-28)
 * @param {number} asistentes - Total de asistentes del evento
 */
function calcularDesviacionRol(role, requiredCount, assignedCount, asistentes = 0) {
  const req = Number(requiredCount) || 0;
  const asg = Number(assignedCount) || 0;
  const difference = asg - req;
  const roleName = role === 'WAITERS' ? 'meseros' : 'cocineros';
  const roleSingular = role === 'WAITERS' ? 'mesero' : 'cocinero';
  const ratioText = role === 'WAITERS' ? '1 por cada 20 asistentes' : '2 por cada 25 asistentes';

  let status = 'OK';
  let message = 'La asignación cumple exactamente con el estándar requerido.';

  if (difference < 0) {
    status = 'DEFICIT';
    const missing = Math.abs(difference);
    message = missing === 1
      ? `Se requiere 1 ${roleSingular} adicional para cumplir el estándar (${ratioText}).`
      : `Se requieren ${missing} ${roleName} adicionales para cumplir el estándar (${ratioText}).`;
  } else if (difference > 0) {
    status = 'SURPLUS';
    message = `Hay ${difference} ${difference === 1 ? roleSingular : roleName} asignados por encima del estándar.`;
  }

  return {
    role,
    rol: role === 'WAITERS' ? 'mesero' : 'cocinero',
    nombre_rol: role === 'WAITERS' ? 'Meseros' : 'Cocineros',
    required_count: req,
    assigned_count: asg,
    difference,
    deficit: Math.max(0, -difference),
    excedente: Math.max(0, difference),
    status,
    message
  };
}

/**
 * Calcula el reporte diagnóstico integral de desviaciones de personal de un evento (HU-25 / RF-32).
 *
 * @param {number|string} eventoId - Identificador del evento
 * @param {number} asistentes - Cantidad de asistentes
 * @param {{ meseros?: number, cocineros?: number, WAITERS?: number, COOKS?: number }} asignados - Conteo de asignados
 */
function calcularDesviacionesPersonal(eventoId, asistentes, asignados = {}) {
  const numAsistentes = Number(asistentes) || 0;
  const requiredWaiters = calcularMeseros(numAsistentes);
  const requiredCooks = calcularCocineros(numAsistentes);

  const assignedWaiters = Number(asignados.meseros ?? asignados.WAITERS ?? 0);
  const assignedCooks = Number(asignados.cocineros ?? asignados.COOKS ?? 0);

  const waitersDev = calcularDesviacionRol('WAITERS', requiredWaiters, assignedWaiters, numAsistentes);
  const cooksDev = calcularDesviacionRol('COOKS', requiredCooks, assignedCooks, numAsistentes);

  const rolesBreakdown = [waitersDev, cooksDev];

  // has_deviations: true si existe al menos un rol en déficit
  const hasDeviations = rolesBreakdown.some((r) => r.status === 'DEFICIT');

  // overall_status: DEFICIT si al menos uno está en déficit,
  // SURPLUS si no hay déficit pero hay superávit,
  // COMPLIANT si todos los roles cumplen exactamente
  let overallStatus = 'COMPLIANT';
  if (rolesBreakdown.some((r) => r.status === 'DEFICIT')) {
    overallStatus = 'DEFICIT';
  } else if (rolesBreakdown.some((r) => r.status === 'SURPLUS')) {
    overallStatus = 'SURPLUS';
  }

  const totalRequired = requiredWaiters + requiredCooks;
  const totalAssigned = assignedWaiters + assignedCooks;
  const totalMissing = waitersDev.deficit + cooksDev.deficit;

  return {
    event_id: eventoId,
    evento_id: Number(eventoId) || eventoId,
    has_deviations: hasDeviations,
    overall_status: overallStatus,
    summary: {
      total_required: totalRequired,
      total_assigned: totalAssigned,
      total_missing: totalMissing
    },
    roles_breakdown: rolesBreakdown,
    // Alerta específica y directa para la pantalla de asignación de meseros (HU-25)
    alerta_meseros: {
      activa: waitersDev.status === 'DEFICIT',
      tipo: waitersDev.status.toLowerCase(),
      requeridos: requiredWaiters,
      asignados: assignedWaiters,
      diferencia: waitersDev.difference,
      faltantes: waitersDev.deficit,
      mensaje: waitersDev.status === 'DEFICIT'
        ? `Faltan ${waitersDev.deficit} ${waitersDev.deficit === 1 ? 'mesero' : 'meseros'} para cumplir con el estándar requerido para ${numAsistentes} asistentes (1 por cada 20 asistentes).`
        : waitersDev.status === 'OK'
          ? 'La dotación de meseros cumple con el estándar requerido (1 por cada 20 asistentes).'
          : `La dotación de meseros supera el estándar requerido (+${waitersDev.difference} ${waitersDev.difference === 1 ? 'mesero' : 'meseros'}).`
    }
  };
}

module.exports = {
  calcularDesviacionRol,
  calcularDesviacionesPersonal
};
