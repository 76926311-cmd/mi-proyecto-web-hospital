// js/consulta/consulta.js
import { sql } from '../config/neon-config.js';
import { exigirSesion, activarSalir } from '../auth/auth.js';

const usuario = exigirSesion();
activarSalir();

const cuerpo = document.getElementById('cuerpo-tabla');

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

try {
  const filas = await sql`
    SELECT id, codigo_seguimiento, numero_asegurado, nombre_paciente, sede, estado
    FROM citas WHERE id_usuario = ${usuario.id} ORDER BY fecha_registro DESC;
  `;
  document.getElementById('sin-registros').hidden = filas.length > 0;
  for (const f of filas) {
    const tr = document.createElement('tr');
    [f.codigo_seguimiento, f.numero_asegurado, f.nombre_paciente, f.sede, f.estado].forEach(t => tr.appendChild(celda(t)));
    const accion = document.createElement('td');
    const enlace = document.createElement('a');
    enlace.className = 'btn-mini';
    enlace.href = 'actualizar.html?id=' + encodeURIComponent(f.id);
    enlace.textContent = f.estado === 'registrado' ? 'Editar' : 'Ver';
    accion.appendChild(enlace);
    tr.appendChild(accion);
    cuerpo.appendChild(tr);
  }
} catch (error) {
  console.error(error);
  document.getElementById('sin-registros').hidden = false;
  document.getElementById('sin-registros').textContent = 'No se pudieron cargar tus registros.';
}
