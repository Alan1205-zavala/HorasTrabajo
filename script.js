// Variables globales
let registros = [];
let sesionActual = null;
let registrosFiltrados = [];
let actividadesDelDia = [];
let resumenDiario = '';

// Elementos DOM
const elementoHoraActual = document.getElementById('current-time');
const elementoFechaActual = document.getElementById('current-date');
const elementoHorasHoy = document.getElementById('horas-hoy');
const elementoHorasSemana = document.getElementById('horas-semana');
const elementoEstado = document.getElementById('estado');
const cuerpoTablaHistorial = document.querySelector('#tabla-historial tbody');
const modalEditar = document.getElementById('modal-editar');
const actividadesContainer = document.getElementById('actividades-container');
const notificacion = document.getElementById('notification');

// Clave para localStorage
const STORAGE_KEY = 'controlHorasData';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    actualizarHoraYFecha();
    setInterval(actualizarHoraYFecha, 1000);
    
    // Cargar datos guardados
    cargarDatos();
    
    // Event listeners
    document.getElementById('btn-iniciar').addEventListener('click', iniciarJornada);
    document.getElementById('btn-pausa').addEventListener('click', pausarJornada);
    document.getElementById('btn-finalizar').addEventListener('click', finalizarJornada);
    
    document.getElementById('btn-nueva-actividad').addEventListener('click', agregarNuevaActividad);
    document.getElementById('btn-guardar-todo').addEventListener('click', guardarTodasActividades);
    document.getElementById('btn-guardar-resumen').addEventListener('click', guardarResumen);
    
    document.getElementById('btn-filtrar').addEventListener('click', filtrarRegistros);
    document.getElementById('btn-limpiar-filtro').addEventListener('click', limpiarFiltro);
    
    document.getElementById('btn-exportar-pdf').addEventListener('click', exportarPDF);
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarExcel);
    document.getElementById('btn-respaldo').addEventListener('click', crearRespaldo);
    document.getElementById('btn-restaurar').addEventListener('click', () => document.getElementById('input-respaldo').click());
    document.getElementById('input-respaldo').addEventListener('change', restaurarRespaldo);
    
    document.getElementById('cerrar-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-guardar-cambios').addEventListener('click', guardarCambios);
    
    window.addEventListener('click', (e) => {
        if (e.target === modalEditar) cerrarModal();
    });
    
    // Guardar automáticamente antes de cerrar la página
    window.addEventListener('beforeunload', guardarDatos);
});

// Funciones de utilidad
function mostrarNotificacion(mensaje, tipo = 'success') {
    notificacion.textContent = mensaje;
    notificacion.className = `notification ${tipo}`;
    notificacion.style.display = 'block';
    
    setTimeout(() => {
        notificacion.style.display = 'none';
    }, 3000);
}

function obtenerFechaActual() {
    const ahora = new Date();
    // Usar toLocaleDateString con opciones específicas para evitar problemas de zona horaria
    return ahora.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Mexico_City' // Ajusta según tu zona horaria
    });
}

function obtenerFechaHoraActual() {
    const ahora = new Date();
    return {
        fecha: obtenerFechaActual(),
        hora: ahora.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'America/Mexico_City'
        })
    };
}

function actualizarHoraYFecha() {
    const ahora = new Date();
    elementoHoraActual.textContent = ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    elementoFechaActual.textContent = ahora.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Funciones de persistencia de datos
function guardarDatos() {
    const datos = {
        registros: registros,
        actividadesDelDia: actividadesDelDia,
        resumenDiario: resumenDiario,
        sesionActual: sesionActual,
        ultimaActualizacion: new Date().toISOString()
    };
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
        console.log('Datos guardados correctamente');
    } catch (error) {
        console.error('Error al guardar datos:', error);
        mostrarNotificacion('Error al guardar datos', 'error');
    }
}

function cargarDatos() {
    try {
        const datosGuardados = localStorage.getItem(STORAGE_KEY);
        
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            registros = datos.registros || [];
            actividadesDelDia = datos.actividadesDelDia || [];
            resumenDiario = datos.resumenDiario || '';
            sesionActual = datos.sesionActual || null;
            
            // Verificar si la sesión actual es del día de hoy
            const fechaHoy = obtenerFechaActual();
            if (sesionActual && sesionActual.fecha !== fechaHoy) {
                sesionActual = null;
            }
            
            mostrarNotificacion('Datos cargados correctamente');
        } else {
            registros = [];
            actividadesDelDia = [];
            resumenDiario = '';
            sesionActual = null;
        }
        
        actualizarEstado();
        actualizarEstadisticas();
        renderizarTablaHistorial();
        renderizarActividades();
        document.getElementById('resumen-diario').value = resumenDiario;
    } catch (error) {
        console.error('Error al cargar datos:', error);
        mostrarNotificacion('Error al cargar datos', 'error');
    }
}

// Funciones de actividades
function renderizarActividades() {
    actividadesContainer.innerHTML = '';
    
    actividadesDelDia.forEach((actividad, index) => {
        const actividadDiv = document.createElement('div');
        actividadDiv.className = 'activity-item';
        actividadDiv.innerHTML = `
            <input type="checkbox" class="activity-checkbox" ${actividad.completada ? 'checked' : ''} 
                   onchange="marcarActividadCompletada(${index}, this.checked)">
            <div class="activity-content">
                <input type="text" class="activity-text" value="${actividad.texto}" 
                       placeholder="Describe la actividad..." 
                       onchange="actualizarActividad(${index}, this.value)">
                <div class="activity-actions">
                    <button class="btn btn-danger" onclick="eliminarActividad(${index})">×</button>
                </div>
            </div>
        `;
        actividadesContainer.appendChild(actividadDiv);
    });
}

function agregarNuevaActividad() {
    actividadesDelDia.push({
        texto: '',
        completada: false,
        timestamp: new Date().toISOString()
    });
    renderizarActividades();
    guardarDatos();
    mostrarNotificacion('Nueva actividad agregada');
}

function actualizarActividad(index, nuevoTexto) {
    if (index >= 0 && index < actividadesDelDia.length) {
        actividadesDelDia[index].texto = nuevoTexto;
        actividadesDelDia[index].timestamp = new Date().toISOString();
        guardarDatos();
    }
}

function marcarActividadCompletada(index, completada) {
    if (index >= 0 && index < actividadesDelDia.length) {
        actividadesDelDia[index].completada = completada;
        guardarDatos();
    }
}

function eliminarActividad(index) {
    if (index >= 0 && index < actividadesDelDia.length) {
        actividadesDelDia.splice(index, 1);
        renderizarActividades();
        guardarDatos();
        mostrarNotificacion('Actividad eliminada');
    }
}

function guardarTodasActividades() {
    // Forzar guardado de todas las actividades
    const inputs = document.querySelectorAll('.activity-text');
    inputs.forEach((input, index) => {
        if (index < actividadesDelDia.length) {
            actividadesDelDia[index].texto = input.value;
        }
    });
    guardarDatos();
    mostrarNotificacion('Todas las actividades guardadas');
}

function guardarResumen() {
    resumenDiario = document.getElementById('resumen-diario').value;
    guardarDatos();
    mostrarNotificacion('Resumen guardado');
}

// Funciones principales de jornada laboral
function actualizarEstado() {
    if (sesionActual) {
        elementoEstado.textContent = 'Trabajando';
        elementoEstado.style.color = 'var(--success)';
    } else {
        elementoEstado.textContent = 'No iniciado';
        elementoEstado.style.color = 'var(--dark)';
    }
}

function iniciarJornada() {
    if (sesionActual) {
        mostrarNotificacion('Ya tienes una jornada iniciada', 'error');
        return;
    }
    
    const { fecha, hora } = obtenerFechaHoraActual();
    
    sesionActual = {
        id: Date.now(),
        fecha: fecha,
        inicio: hora,
        fin: null,
        actividades: actividadesDelDia.map(a => a.texto).filter(t => t.trim() !== ''),
        resumen: resumenDiario,
        timestamp: new Date().toISOString()
    };
    
    guardarDatos();
    actualizarEstado();
    mostrarNotificacion(`Jornada iniciada a las ${hora}`);
}

function pausarJornada() {
    if (!sesionActual) {
        mostrarNotificacion('No hay una jornada activa', 'error');
        return;
    }
    
    // En un sistema más avanzado, aquí podrías manejar pausas específicas
    mostrarNotificacion('Función de pausa/reanudación en desarrollo');
}

function finalizarJornada() {
    if (!sesionActual) {
        mostrarNotificacion('No hay una jornada activa para finalizar', 'error');
        return;
    }
    
    const { hora } = obtenerFechaHoraActual();
    
    // Actualizar actividades y resumen antes de finalizar
    guardarTodasActividades();
    guardarResumen();
    
    sesionActual.fin = hora;
    sesionActual.actividades = actividadesDelDia.map(a => a.texto).filter(t => t.trim() !== '');
    sesionActual.resumen = resumenDiario;
    
    // Agregar a registros
    registros.unshift(sesionActual);
    
    // Limpiar actividades del día para el próximo día
    actividadesDelDia = [];
    resumenDiario = '';
    document.getElementById('resumen-diario').value = '';
    
    sesionActual = null;
    
    guardarDatos();
    actualizarEstado();
    actualizarEstadisticas();
    renderizarTablaHistorial();
    renderizarActividades();
    
    mostrarNotificacion(`Jornada finalizada a las ${hora}`);
}

function actualizarEstadisticas() {
    const fechaHoy = obtenerFechaActual();
    
    // Calcular horas de hoy
    const registrosHoy = registros.filter(registro => registro.fecha === fechaHoy && registro.fin);
    
    let minutosTotalesHoy = 0;
    registrosHoy.forEach(registro => {
        const inicio = convertirHoraStringADate(registro.inicio);
        const fin = convertirHoraStringADate(registro.fin);
        const diferenciaMs = fin - inicio;
        minutosTotalesHoy += diferenciaMs / (1000 * 60);
    });
    
    const horasHoy = Math.floor(minutosTotalesHoy / 60);
    const minutosHoy = Math.floor(minutosTotalesHoy % 60);
    elementoHorasHoy.textContent = `${horasHoy}h ${minutosHoy}m`;
    
    // Calcular horas de la semana (últimos 7 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    
    const registrosSemana = registros.filter(registro => {
        const fechaRegistro = convertirFechaStringADate(registro.fecha);
        return fechaRegistro >= fechaLimite && registro.fin;
    });
    
    let minutosTotalesSemana = 0;
    registrosSemana.forEach(registro => {
        const inicio = convertirHoraStringADate(registro.inicio);
        const fin = convertirHoraStringADate(registro.fin);
        const diferenciaMs = fin - inicio;
        minutosTotalesSemana += diferenciaMs / (1000 * 60);
    });
    
    const horasSemana = Math.floor(minutosTotalesSemana / 60);
    const minutosSemana = Math.floor(minutosTotalesSemana % 60);
    elementoHorasSemana.textContent = `${horasSemana}h ${minutosSemana}m`;
}

function renderizarTablaHistorial() {
    cuerpoTablaHistorial.innerHTML = '';
    
    const registrosARenderizar = registrosFiltrados.length > 0 ? registrosFiltrados : registros;
    
    if (registrosARenderizar.length === 0) {
        cuerpoTablaHistorial.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px;">
                    No hay registros disponibles
                </td>
            </tr>
        `;
        return;
    }
    
    registrosARenderizar.forEach(registro => {
        if (!registro.fin) return;
        
        const fila = document.createElement('tr');
        
        // Calcular horas trabajadas
        const inicio = convertirHoraStringADate(registro.inicio);
        const fin = convertirHoraStringADate(registro.fin);
        const diferenciaMs = fin - inicio;
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        
        // Resumen de actividades (mostrar solo las primeras)
        const actividadesResumen = registro.actividades && registro.actividades.length > 0 
            ? registro.actividades.slice(0, 2).join(', ') + (registro.actividades.length > 2 ? '...' : '')
            : 'Sin actividades';
        
        fila.innerHTML = `
            <td>${registro.fecha}</td>
            <td>${registro.inicio}</td>
            <td>${registro.fin}</td>
            <td>${horas}h ${minutos}m</td>
            <td title="${registro.actividades ? registro.actividades.join('\n') : ''}">${actividadesResumen}</td>
            <td>
                <button class="action-btn btn-edit" data-id="${registro.id}">Editar</button>
                <button class="action-btn btn-delete" data-id="${registro.id}">Eliminar</button>
            </td>
        `;
        
        cuerpoTablaHistorial.appendChild(fila);
    });
    
    // Agregar event listeners a los botones de editar y eliminar
    document.querySelectorAll('.btn-edit').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            abrirModalEditar(id);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            eliminarRegistro(id);
        });
    });
}

function filtrarRegistros() {
    const fechaFiltro = document.getElementById('filtro-fecha').value;
    const mesFiltro = document.getElementById('filtro-mes').value;
    
    if (!fechaFiltro && !mesFiltro) {
        mostrarNotificacion('Selecciona una fecha o mes para filtrar', 'error');
        return;
    }
    
    registrosFiltrados = registros.filter(registro => {
        if (fechaFiltro) {
            // Convertir fecha del filtro al formato local
            const fechaFiltroObj = new Date(fechaFiltro);
            const fechaFiltroFormateada = fechaFiltroObj.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            return registro.fecha === fechaFiltroFormateada && registro.fin;
        }
        
        if (mesFiltro) {
            const [anio, mes] = mesFiltro.split('-');
            const registroMes = registro.fecha.split('/')[1];
            const registroAnio = registro.fecha.split('/')[2];
            return registroMes === mes && registroAnio === anio && registro.fin;
        }
        
        return false;
    });
    
    renderizarTablaHistorial();
    mostrarNotificacion(`Mostrando ${registrosFiltrados.length} registros`);
}

function limpiarFiltro() {
    document.getElementById('filtro-fecha').value = '';
    document.getElementById('filtro-mes').value = '';
    registrosFiltrados = [];
    renderizarTablaHistorial();
    mostrarNotificacion('Mostrando todos los registros');
}

function abrirModalEditar(id) {
    const registro = registros.find(r => r.id === id);
    if (!registro) return;
    
    document.getElementById('editar-id').value = registro.id;
    
    // Convertir la fecha al formato YYYY-MM-DD para el input date
    const [dia, mes, anio] = registro.fecha.split('/');
    document.getElementById('editar-fecha').value = `${anio}-${mes}-${dia}`;
    
    // Convertir la hora al formato HH:MM para el input time
    const [hora, modificador] = registro.inicio.split(' ');
    let [horas, minutos] = hora.split(':');
    
    if (modificador === 'p.m.' && horas < 12) {
        horas = parseInt(horas) + 12;
    } else if (modificador === 'a.m.' && horas == 12) {
        horas = 0;
    }
    
    document.getElementById('editar-inicio').value = `${horas.toString().padStart(2, '0')}:${minutos}`;
    
    if (registro.fin) {
        const [horaFin, modificadorFin] = registro.fin.split(' ');
        let [horasFin, minutosFin] = horaFin.split(':');
        
        if (modificadorFin === 'p.m.' && horasFin < 12) {
            horasFin = parseInt(horasFin) + 12;
        } else if (modificadorFin === 'a.m.' && horasFin == 12) {
            horasFin = 0;
        }
        
        document.getElementById('editar-fin').value = `${horasFin.toString().padStart(2, '0')}:${minutosFin}`;
    }
    
    document.getElementById('editar-actividades').value = registro.actividades ? registro.actividades.join('\n') : '';
    
    modalEditar.style.display = 'flex';
}

function cerrarModal() {
    modalEditar.style.display = 'none';
}

function guardarCambios() {
    const id = parseInt(document.getElementById('editar-id').value);
    const fecha = document.getElementById('editar-fecha').value;
    const hora_inicio = document.getElementById('editar-inicio').value;
    const hora_fin = document.getElementById('editar-fin').value;
    const actividades = document.getElementById('editar-actividades').value;
    
    if (!fecha || !hora_inicio) {
        mostrarNotificacion('Completa al menos la fecha y hora de inicio', 'error');
        return;
    }
    
    // Convertir la fecha al formato local
    const fechaObj = new Date(fecha);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    // Convertir la hora al formato local
    const horaInicioObj = new Date(`1970-01-01T${hora_inicio}`);
    const inicioFormateado = horaInicioObj.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    let finFormateado = '';
    if (hora_fin) {
        const horaFinObj = new Date(`1970-01-01T${hora_fin}`);
        finFormateado = horaFinObj.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
    
    const indiceRegistro = registros.findIndex(r => r.id === id);
    if (indiceRegistro !== -1) {
        registros[indiceRegistro].fecha = fechaFormateada;
        registros[indiceRegistro].inicio = inicioFormateado;
        registros[indiceRegistro].fin = finFormateado || registros[indiceRegistro].fin;
        registros[indiceRegistro].actividades = actividades.split('\n').filter(a => a.trim() !== '');
        
        guardarDatos();
        actualizarEstadisticas();
        renderizarTablaHistorial();
        cerrarModal();
        
        mostrarNotificacion('Registro actualizado correctamente');
    } else {
        mostrarNotificacion('Registro no encontrado', 'error');
    }
}

function eliminarRegistro(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
        return;
    }
    
    registros = registros.filter(registro => registro.id !== id);
    guardarDatos();
    actualizarEstadisticas();
    renderizarTablaHistorial();
    
    mostrarNotificacion('Registro eliminado correctamente');
}

// Funciones de exportación
function exportarPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(20);
        doc.text('Registro de Horas Laborales', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 105, 22, { align: 'center' });
        
        // Datos de la tabla
        const tableColumn = ["Fecha", "Inicio", "Fin", "Horas", "Actividades"];
        const tableRows = [];
        
        const registrosARenderizar = registrosFiltrados.length > 0 ? registrosFiltrados : registros;
        
        registrosARenderizar.forEach(registro => {
            if (!registro.fin) return;
            
            // Calcular horas trabajadas
            const inicio = convertirHoraStringADate(registro.inicio);
            const fin = convertirHoraStringADate(registro.fin);
            const diferenciaMs = fin - inicio;
            const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
            const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
            
            const registroData = [
                registro.fecha,
                registro.inicio,
                registro.fin,
                `${horas}h ${minutos}m`,
                registro.actividades ? registro.actividades.join(', ') : ''
            ];
            
            tableRows.push(registroData);
        });
        
        // Generar PDF
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [74, 111, 165] }
        });
        
        // Guardar PDF
        const fecha = new Date().toISOString().split('T')[0];
        doc.save(`registro-horas-${fecha}.pdf`);
        mostrarNotificacion('PDF exportado correctamente');
    } catch (error) {
        console.error('Error al exportar PDF:', error);
        mostrarNotificacion('Error al exportar a PDF', 'error');
    }
}

function exportarExcel() {
    try {
        // Preparar datos
        const datos = [];
        
        // Encabezados
        datos.push(['Fecha', 'Hora Inicio', 'Hora Fin', 'Horas Trabajadas', 'Actividades']);
        
        // Datos
        const registrosARenderizar = registrosFiltrados.length > 0 ? registrosFiltrados : registros;
        
        registrosARenderizar.forEach(registro => {
            if (!registro.fin) return;
            
            // Calcular horas trabajadas
            const inicio = convertirHoraStringADate(registro.inicio);
            const fin = convertirHoraStringADate(registro.fin);
            const diferenciaMs = fin - inicio;
            const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
            const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
            
            datos.push([
                registro.fecha,
                registro.inicio,
                registro.fin,
                `${horas}h ${minutos}m`,
                registro.actividades ? registro.actividades.join('; ') : ''
            ]);
        });
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(datos);
        
        // Añadir hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Registros de Horas');
        
        // Guardar archivo
        const fecha = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `registro-horas-${fecha}.xlsx`);
        mostrarNotificacion('Excel exportado correctamente');
    } catch (error) {
        console.error('Error al exportar Excel:', error);
        mostrarNotificacion('Error al exportar a Excel', 'error');
    }
}

function crearRespaldo() {
    try {
        const datos = {
            registros: registros,
            actividadesDelDia: actividadesDelDia,
            resumenDiario: resumenDiario,
            sesionActual: sesionActual,
            fechaRespaldo: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `respaldo-horas-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        
        mostrarNotificacion('Respaldo creado correctamente');
    } catch (error) {
        console.error('Error al crear respaldo:', error);
        mostrarNotificacion('Error al crear respaldo', 'error');
    }
}

function restaurarRespaldo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('¿Estás seguro de que quieres restaurar este respaldo? Se perderán los datos actuales.')) {
        event.target.value = ''; // Resetear el input
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = e.target.result;
            const datos = JSON.parse(contenido);
            
            // Validar que sea un respaldo válido
            if (!datos.registros || !Array.isArray(datos.registros)) {
                throw new Error('El archivo no es un respaldo válido');
            }
            
            // Restaurar datos
            registros = datos.registros || [];
            actividadesDelDia = datos.actividadesDelDia || [];
            resumenDiario = datos.resumenDiario || '';
            
            // Verificar sesión actual
            const fechaHoy = obtenerFechaActual();
            if (datos.sesionActual && datos.sesionActual.fecha === fechaHoy) {
                sesionActual = datos.sesionActual;
            } else {
                sesionActual = null;
            }
            
            // Actualizar interfaz
            actualizarEstado();
            actualizarEstadisticas();
            renderizarTablaHistorial();
            renderizarActividades();
            document.getElementById('resumen-diario').value = resumenDiario;
            
            // Guardar datos restaurados
            guardarDatos();
            
            event.target.value = ''; // Resetear el input
            mostrarNotificacion('Respaldo restaurado correctamente');
        } catch (error) {
            console.error('Error al restaurar respaldo:', error);
            mostrarNotificacion('Error al restaurar respaldo: ' + error.message, 'error');
            event.target.value = ''; // Resetear el input
        }
    };
    reader.readAsText(file);
}

// Funciones auxiliares
function convertirHoraStringADate(horaString) {
    const [hora, modificador] = horaString.split(' ');
    let [horas, minutos] = hora.split(':');
    
    horas = parseInt(horas);
    minutos = parseInt(minutos);
    
    if (modificador === 'p.m.' && horas < 12) {
        horas += 12;
    } else if (modificador === 'a.m.' && horas === 12) {
        horas = 0;
    }
    
    const fecha = new Date();
    fecha.setHours(horas, minutos, 0, 0);
    return fecha;
}

function convertirFechaStringADate(fechaString) {
    const [dia, mes, anio] = fechaString.split('/');
    return new Date(`${anio}-${mes}-${dia}`);
}