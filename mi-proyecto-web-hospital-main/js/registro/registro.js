// js/registro/registro.js
import { sql } from '../config/neon-config.js';
import { exigirSesion, activarSalir } from '../auth/auth.js';

// ---------- Verificar sesión al cargar ----------
const usuario = exigirSesion();
activarSalir();

// ---------- Guardar en la base de datos ----------
// Guarda la cita en la tabla "citas" y devuelve el código de seguimiento
export async function guardarRegistro(datos) {
  const codigo = 'COD-' + Date.now().toString().slice(-8); // código de seguimiento simple

  const resultado = await sql`
    INSERT INTO citas (codigo_seguimiento, numero_asegurado, nombre_paciente, sede, id_usuario, estado)
    VALUES (${codigo}, ${datos.numeroAsegurado}, ${datos.nombrePaciente}, ${datos.sede}, ${usuario.id}, 'registrado')
    RETURNING codigo_seguimiento;
  `;

  return resultado[0].codigo_seguimiento;
}

// ---------- Validación en el cliente (antes del INSERT) ----------
function validar(datos) {
  if (!/^[0-9]{4}$/.test(datos.numeroAsegurado)) {
    return 'El número de asegurado debe tener 4 dígitos (solo números).';
  }
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]{3,100}$/.test(datos.nombrePaciente)) {
    return 'El nombre debe tener entre 3 y 100 letras, sin números ni símbolos.';
  }
  if (datos.sede === '') {
    return 'Selecciona una sede.';
  }
  return null; // todo correcto
}

// ---------- Formulario "Agendar cita" ----------
const form = document.getElementById('formAgendarCita');

if (form) {
  const caja = document.getElementById('mensajeConfirmacion');

  function mostrarError(texto) {
    caja.className = 'confirmacion-card';
    caja.style.display = 'block';
    caja.style.borderColor = '#b3382c';
    caja.style.background = '#fbe7e4';
    caja.innerHTML = '';
    const p = document.createElement('p');
    p.style.color = '#b3382c';
    p.textContent = texto;
    caja.appendChild(p);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const datos = {
      numeroAsegurado: document.getElementById('numeroAsegurado').value.trim(),
      nombrePaciente: document.getElementById('nombrePaciente').value.trim(),
      sede: document.getElementById('sedeHospital').value
    };

    // 1) Validar antes de intentar el INSERT
    const error = validar(datos);
    if (error) {
      mostrarError(error);
      return;
    }

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      // 2) Guardar y mostrar el código con la animación de confirmación
      const codigo = await guardarRegistro(datos);

      caja.className = 'confirmacion-card';
      caja.style.borderColor = '';
      caja.style.background = '';
      caja.style.display = 'block';
      caja.innerHTML = `
        <h3>Cita agendada correctamente</h3>
        <p>Guarda tu código de seguimiento:</p>
        <span class="codigo-destacado">${codigo}</span>
      `;
      form.reset();
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo agendar la cita. Intenta de nuevo.');
    } finally {
      boton.disabled = false;
    }
  });
}
