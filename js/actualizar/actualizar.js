// js/actualizar/actualizar.js
import { sql } from '../config/neon-config.js';
import { exigirSesion, activarSalir } from '../auth/auth.js';

const usuario = exigirSesion();
activarSalir();

const id = new URLSearchParams(window.location.search).get('id');
const form = document.getElementById('formActualizar');
const caja = document.getElementById('mensajeConfirmacion');
const aviso = document.getElementById('aviso');
const campos = form.querySelectorAll('input, select, button');

// El AND id_usuario evita editar el registro de otro cliente; el AND estado solo permite 'registrado'
export async function actualizarRegistro(id, datos) {
  await sql`
    UPDATE citas
    SET numero_asegurado = ${datos.numeroAsegurado}, nombre_paciente = ${datos.nombrePaciente}, sede = ${datos.sede}
    WHERE id = ${id} AND id_usuario = ${usuario.id} AND estado = 'registrado';
  `;
}

function validar(d) {
  if (!/^[0-9]{4}$/.test(d.numeroAsegurado)) return 'El número de asegurado debe tener 4 dígitos.';
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{3,100}$/.test(d.nombrePaciente)) return 'El nombre debe tener entre 3 y 100 letras.';
  if (d.sede === '') return 'Selecciona una sede.';
  return null;
}

function mostrar(html, error) {
  caja.className = 'confirmacion-card';
  caja.style.display = 'block';
  caja.style.borderColor = error ? '#b3382c' : '';
  caja.style.background = error ? '#fbe7e4' : '';
  caja.innerHTML = html;
}

function soloLectura(texto) {
  campos.forEach(c => { c.disabled = true; });
  document.getElementById('btn-guardar').hidden = true;
  aviso.hidden = false;
  aviso.textContent = texto;
}

try {
  const filas = await sql`SELECT * FROM citas WHERE id = ${id} AND id_usuario = ${usuario.id};`;
  if (filas.length === 0) {
    soloLectura('No se encontró la cita o no te pertenece.');
  } else {
    const c = filas[0];
    document.getElementById('numeroAsegurado').value = c.numero_asegurado;
    document.getElementById('nombrePaciente').value = c.nombre_paciente;
    document.getElementById('sedeHospital').value = c.sede;
    if (c.estado !== 'registrado') soloLectura('Esta cita ya fue atendida (estado: ' + c.estado + '). Solo lectura.');
  }
} catch (error) {
  console.error(error);
  soloLectura('No se pudo cargar la cita.');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = {
    numeroAsegurado: document.getElementById('numeroAsegurado').value.trim(),
    nombrePaciente: document.getElementById('nombrePaciente').value.trim(),
    sede: document.getElementById('sedeHospital').value
  };
  const error = validar(datos);
  if (error) { mostrar('<p style="color:#b3382c">' + error + '</p>', true); return; }
  try {
    await actualizarRegistro(id, datos);
    mostrar('<h3>Cita actualizada correctamente</h3>');
  } catch (err) {
    console.error(err);
    mostrar('<p style="color:#b3382c">No se pudo actualizar la cita.</p>', true);
  }
});
