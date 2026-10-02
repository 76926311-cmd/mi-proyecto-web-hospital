// js/panel/panel.js
import { sql } from '../config/neon-config.js';
import { exigirSesion, activarSalir } from '../auth/auth.js';

const usuario = exigirSesion();

// Un cliente no puede entrar al panel: solo administrador o empleado
if (usuario.rol === 'cliente') {
  window.location.href = 'registro.html';
  throw new Error('Acceso solo para personal');
}
activarSalir();

// Consultar: todos los registros
export async function listarTodos() {
  return await sql`SELECT * FROM citas ORDER BY fecha_registro DESC;`;
}

// Crear: id_usuario queda en NULL (atención presencial o telefónica)
export async function crearRegistro(datos) {
  const codigo = 'COD-' + Date.now().toString().slice(-8);
  await sql`
    INSERT INTO citas (codigo_seguimiento, numero_asegurado, nombre_paciente, sede, estado)
    VALUES (${codigo}, ${datos.numeroAsegurado}, ${datos.nombrePaciente}, ${datos.sede}, 'registrado');
  `;
  return codigo;
}

// Actualizar: cualquier registro, incluye cambiar el estado
export async function actualizarComoPanel(id, datos) {
  await sql`
    UPDATE citas
    SET numero_asegurado = ${datos.numeroAsegurado}, nombre_paciente = ${datos.nombrePaciente},
        sede = ${datos.sede}, estado = ${datos.estado}
    WHERE id = ${id};
  `;
}

// Eliminar: la interfaz pide confirmación antes de llamar esta función
export async function eliminarRegistro(id) {
  await sql`DELETE FROM citas WHERE id = ${id};`;
}

// ---------- Interfaz ----------
const form = document.getElementById('formPanel');
const caja = document.getElementById('mensajeConfirmacion');
const cuerpo = document.getElementById('cuerpo-tabla');
const grupoEstado = document.getElementById('grupo-estado');
const btnGuardar = document.getElementById('btn-guardar');
const btnCancelar = document.getElementById('btn-cancelar');
let editandoId = null;

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

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function boton(texto, accion, peligro) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-mini' + (peligro ? ' peligro' : '');
  b.textContent = texto;
  b.addEventListener('click', accion);
  return b;
}

function salirEdicion() {
  editandoId = null;
  form.reset();
  grupoEstado.hidden = true;
  btnCancelar.hidden = true;
  btnGuardar.textContent = 'Crear cita';
  document.getElementById('titulo-form').textContent = 'Registrar cita (atención presencial)';
}

function editar(f) {
  editandoId = f.id;
  document.getElementById('numeroAsegurado').value = f.numero_asegurado;
  document.getElementById('nombrePaciente').value = f.nombre_paciente;
  document.getElementById('sedeHospital').value = f.sede;
  document.getElementById('estado').value = f.estado;
  grupoEstado.hidden = false;
  btnCancelar.hidden = false;
  btnGuardar.textContent = 'Guardar cambios';
  document.getElementById('titulo-form').textContent = 'Editar cita ' + f.codigo_seguimiento;
  form.scrollIntoView({ behavior: 'smooth' });
}

async function eliminar(f) {
  if (!confirm('¿Eliminar la cita ' + f.codigo_seguimiento + '? Esta acción no se puede deshacer.')) return;
  try {
    await eliminarRegistro(f.id);
    mostrar('<h3>Cita eliminada correctamente</h3>');
    await recargar();
  } catch (error) {
    console.error(error);
    mostrar('<p style="color:#b3382c">No se pudo eliminar la cita.</p>', true);
  }
}

async function recargar() {
  const filas = await listarTodos();
  cuerpo.replaceChildren();
  for (const f of filas) {
    const tr = document.createElement('tr');
    [f.codigo_seguimiento, f.numero_asegurado, f.nombre_paciente, f.sede, f.estado, f.id_usuario ?? 'Sin cliente']
      .forEach(t => tr.appendChild(celda(t)));
    const acciones = document.createElement('td');
    acciones.append(boton('Editar', () => editar(f)), ' ', boton('Eliminar', () => eliminar(f), true));
    tr.appendChild(acciones);
    cuerpo.appendChild(tr);
  }
}

btnCancelar.addEventListener('click', salirEdicion);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = {
    numeroAsegurado: document.getElementById('numeroAsegurado').value.trim(),
    nombrePaciente: document.getElementById('nombrePaciente').value.trim(),
    sede: document.getElementById('sedeHospital').value,
    estado: document.getElementById('estado').value
  };
  const error = validar(datos);
  if (error) { mostrar('<p style="color:#b3382c">' + error + '</p>', true); return; }
  try {
    if (editandoId === null) {
      const codigo = await crearRegistro(datos);
      mostrar('<h3>Cita creada correctamente</h3><span class="codigo-destacado">' + codigo + '</span>');
    } else {
      await actualizarComoPanel(editandoId, datos);
      mostrar('<h3>Cita actualizada correctamente</h3>');
    }
    salirEdicion();
    await recargar();
  } catch (err) {
    console.error(err);
    mostrar('<p style="color:#b3382c">No se pudo guardar la cita.</p>', true);
  }
});

try { await recargar(); } catch (error) { console.error(error); mostrar('<p style="color:#b3382c">No se pudieron cargar las citas.</p>', true); }
