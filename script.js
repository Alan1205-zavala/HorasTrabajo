// Variables globales
let db = null;
let registros = [];
let sesionActual = null;
let registrosFiltrados = [];

// Elementos DOM
const elementoHoraActual = document.getElementById('current-time');
const elementoHorasHoy = document.getElementById('horas-hoy');
const elementoHorasSemana = document.getElementById('horas-semana');
const elementoEstado = document.getElementById('estado');
const elementoActividades = document.getElementById('actividades');
const cuerpoTablaHistorial = document.querySelector('#tabla-historial tbody');
const modalEditar = document.getElementById('modal-editar');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    actualizarHoraActual();
    setInterval(actualizarHoraActual, 1000);
    
    // Inicializar la base de datos
    inicializarBaseDeDatos();
    
    // Event listeners
    document.getElementById('btn-iniciar').addEventListener('click', iniciarJornada);
    document.getElementById('btn-pausa').addEventListener('click', pausarJornada);
    document.getElementById('btn-finalizar').addEventListener('click', finalizarJornada);
    document.getElementById('btn-guardar-actividades').addEventListener('click', guardarActividades);
    
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
});

// Funciones de base de datos
async function inicializarBaseDeDatos() {
    try {
        // Intentar cargar sql.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        // Crear o cargar la base de datos
        const dataLocal = localStorage.getItem('baseDeDatos');
        
        if (dataLocal) {
            // Cargar base de datos existente
            const buffer = Uint8Array.from(JSON.parse(dataLocal)).buffer;
            db = new SQL.Database(new Uint8Array(buffer));
        } else {
            // Crear nueva base de datos
            db = new SQL.Database();
            
            // Crear tabla de registros
            db.run(`
                CREATE TABLE registros (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    fecha TEXT NOT NULL,
                    hora_inicio TEXT NOT NULL,
                    hora_fin TEXT,
                    actividades TEXT,
                    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            guardarBaseDeDatos();
        }
        
        // Cargar datos
        cargarDatos();
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        alert('Error al inicializar la base de datos. Usando almacenamiento local como respaldo.');
        
        // Usar localStorage como respaldo
        const datosLocal = localStorage.getItem('registros');
        if (datosLocal) {
            registros = JSON.parse(datosLocal);
        }
        
        actualizarEstadisticas();
        renderizarTablaHistorial();
    }
}

function guardarBaseDeDatos() {
    if (db) {
        const data = db.export();
        const arrayData = Array.from(new Uint8Array(data));
        localStorage.setItem('baseDeDatos', JSON.stringify(arrayData));
    }
}

function cargarDatos() {
    if (!db) return;
    
    try {
        // Obtener todos los registros
        const result = db.exec("SELECT * FROM registros ORDER BY fecha DESC, hora_inicio DESC");
        
        if (result.length > 0) {
            registros = result[0].values.map(row => ({
                id: row[0],
                fecha: row[1],
                hora_inicio: row[2],
                hora_fin: row[3],
                actividades: row[4],
                creado_en: row[5],
                actualizado_en: row[6]
            }));
        } else {
            registros = [];
        }
        
        // Encontrar sesión activa del día
        const hoy = new Date().toLocaleDateString('es-ES');
        sesionActual = registros.find(registro => 
            registro.fecha === hoy && registro.hora_fin === null) || null;
        
        // Cargar actividades del día actual si existen
        const registroHoy = registros.find(registro => 
            registro.fecha === hoy && registro.actividades);
            
        if (registroHoy) {
            elementoActividades.value = registroHoy.actividades || '';
        } else {
            elementoActividades.value = '';
        }
        
        actualizarEstado();
        actualizarEstadisticas();
        renderizarTablaHistorial();
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}

// Funciones principales
function actualizarHoraActual() {
    const ahora = new Date();
    elementoHoraActual.textContent = ahora.toLocaleTimeString();
}

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
        alert('Ya tienes una jornada iniciada.');
        return;
    }
    
    const ahora = new Date();
    const hora_inicio = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const fecha = ahora.toLocaleDateString('es-ES');
    
    try {
        if (db) {
            // Insertar en la base de datos
            db.run(
                "INSERT INTO registros (fecha, hora_inicio) VALUES (?, ?)",
                [fecha, hora_inicio]
            );
            
            guardarBaseDeDatos();
            
            // Obtener el ID del último registro insertado
            const result = db.exec("SELECT last_insert_rowid()");
            const nuevoId = result[0].values[0][0];
            
            sesionActual = {
                id: nuevoId,
                fecha: fecha,
                hora_inicio: hora_inicio,
                hora_fin: null,
                actividades: ''
            };
            
            registros.unshift(sesionActual);
        } else {
            // Respaldo con localStorage
            const nuevoRegistro = {
                id: Date.now(),
                fecha: fecha,
                hora_inicio: hora_inicio,
                hora_fin: null,
                actividades: '',
                creado_en: new Date().toISOString(),
                actualizado_en: new Date().toISOString()
            };
            
            sesionActual = nuevoRegistro;
            registros.unshift(nuevoRegistro);
            localStorage.setItem('registros', JSON.stringify(registros));
        }
        
        actualizarEstado();
        alert('Jornada iniciada a las ' + hora_inicio);
    } catch (error) {
        console.error('Error al iniciar jornada:', error);
        alert('Error al iniciar la jornada: ' + error.message);
    }
}

function pausarJornada() {
    if (!sesionActual) {
        alert('No hay una jornada activa para pausar.');
        return;
    }
    
    alert('Función de pausa en desarrollo. Por ahora, usa "Finalizar Jornada" al terminar.');
}

function finalizarJornada() {
    if (!sesionActual) {
        alert('No hay una jornada activa para finalizar.');
        return;
    }
    
    const ahora = new Date();
    const hora_fin = ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Guardar actividades antes de finalizar
    const actividades = elementoActividades.value;
    
    try {
        if (db) {
            // Actualizar en la base de datos
            db.run(
                "UPDATE registros SET hora_fin = ?, actividades = ? WHERE id = ?",
                [hora_fin, actividades, sesionActual.id]
            );
            
            guardarBaseDeDatos();
            
            // Actualizar localmente
            sesionActual.hora_fin = hora_fin;
            sesionActual.actividades = actividades;
        } else {
            // Respaldo con localStorage
            sesionActual.hora_fin = hora_fin;
            sesionActual.actividades = actividades;
            localStorage.setItem('registros', JSON.stringify(registros));
        }
        
        alert('Jornada finalizada a las ' + hora_fin);
        sesionActual = null;
        actualizarEstado();
        actualizarEstadisticas();
        renderizarTablaHistorial();
    } catch (error) {
        console.error('Error al finalizar jornada:', error);
        alert('Error al finalizar la jornada: ' + error.message);
    }
}

function guardarActividades() {
    if (!sesionActual) {
        alert('Inicia una jornada primero para guardar actividades.');
        return;
    }
    
    const actividades = elementoActividades.value;
    
    try {
        if (db) {
            // Actualizar en la base de datos
            db.run(
                "UPDATE registros SET actividades = ? WHERE id = ?",
                [actividades, sesionActual.id]
            );
            
            guardarBaseDeDatos();
            
            // Actualizar localmente
            sesionActual.actividades = actividades;
        } else {
            // Respaldo con localStorage
            sesionActual.actividades = actividades;
            localStorage.setItem('registros', JSON.stringify(registros));
        }
        
        alert('Actividades guardadas correctamente.');
    } catch (error) {
        console.error('Error al guardar actividades:', error);
        alert('Error al guardar actividades: ' + error.message);
    }
}

function actualizarEstadisticas() {
    // Calcular horas de hoy
    const hoy = new Date().toLocaleDateString('es-ES');
    const registrosHoy = registros.filter(registro => 
        registro.fecha === hoy && registro.hora_fin);
    
    let minutosTotalesHoy = 0;
    registrosHoy.forEach(registro => {
        const inicio = convertirHoraStringADate(registro.hora_inicio);
        const fin = convertirHoraStringADate(registro.hora_fin);
        const diferenciaMs = fin - inicio;
        minutosTotalesHoy += diferenciaMs / (1000 * 60);
    });
    
    const horasHoy = Math.floor(minutosTotalesHoy / 60);
    const minutosHoy = Math.floor(minutosTotalesHoy % 60);
    elementoHorasHoy.textContent = `${horasHoy}h ${minutosHoy}m`;
    
    // Calcular horas de la semana
    const semanaPasada = new Date();
    semanaPasada.setDate(semanaPasada.getDate() - 7);
    
    const registrosSemana = registros.filter(registro => {
        const fechaRegistro = new Date(registro.fecha.split('/').reverse().join('-'));
        return fechaRegistro >= semanaPasada && registro.hora_fin;
    });
    
    let minutosTotalesSemana = 0;
    registrosSemana.forEach(registro => {
        const inicio = convertirHoraStringADate(registro.hora_inicio);
        const fin = convertirHoraStringADate(registro.hora_fin);
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
    
    registrosARenderizar.forEach(registro => {
        if (!registro.hora_fin) return;
        
        const fila = document.createElement('tr');
        
        // Calcular horas trabajadas
        const inicio = convertirHoraStringADate(registro.hora_inicio);
        const fin = convertirHoraStringADate(registro.hora_fin);
        const diferenciaMs = fin - inicio;
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        
        fila.innerHTML = `
            <td>${registro.fecha}</td>
            <td>${registro.hora_inicio}</td>
            <td>${registro.hora_fin}</td>
            <td>${horas}h ${minutos}m</td>
            <td>${registro.actividades || '-'}</td>
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
            const id = e.target.dataset.id;
            abrirModalEditar(id);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            eliminarRegistro(id);
        });
    });
}

function filtrarRegistros() {
    const fechaFiltro = document.getElementById('filtro-fecha').value;
    if (!fechaFiltro) {
        alert('Por favor, selecciona una fecha para filtrar.');
        return;
    }
    
    // Convertir la fecha del filtro al formato local
    const objetoFecha = new Date(fechaFiltro);
    const fechaFiltroFormateada = objetoFecha.toLocaleDateString('es-ES');
    
    registrosFiltrados = registros.filter(registro => 
        registro.fecha === fechaFiltroFormateada && registro.hora_fin);
    
    renderizarTablaHistorial();
}

function limpiarFiltro() {
    document.getElementById('filtro-fecha').value = '';
    registrosFiltrados = [];
    renderizarTablaHistorial();
}

function abrirModalEditar(id) {
    const registro = registros.find(r => r.id == id);
    if (!registro) return;
    
    document.getElementById('editar-id').value = registro.id;
    
    // Convertir la fecha al formato YYYY-MM-DD para el input date
    const [dia, mes, anio] = registro.fecha.split('/');
    document.getElementById('editar-fecha').value = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    
    // Convertir la hora al formato HH:MM para el input time
    const [hora, modificador] = registro.hora_inicio.split(' ');
    let [horas, minutos] = hora.split(':');
    
    if (modificador === 'p.m.' && horas < 12) {
        horas = parseInt(horas) + 12;
    } else if (modificador === 'a.m.' && horas == 12) {
        horas = 0;
    }
    
    document.getElementById('editar-inicio').value = `${horas.toString().padStart(2, '0')}:${minutos}`;
    
    if (registro.hora_fin) {
        const [horaFin, modificadorFin] = registro.hora_fin.split(' ');
        let [horasFin, minutosFin] = horaFin.split(':');
        
        if (modificadorFin === 'p.m.' && horasFin < 12) {
            horasFin = parseInt(horasFin) + 12;
        } else if (modificadorFin === 'a.m.' && horasFin == 12) {
            horasFin = 0;
        }
        
        document.getElementById('editar-fin').value = `${horasFin.toString().padStart(2, '0')}:${minutosFin}`;
    }
    
    document.getElementById('editar-actividades').value = registro.actividades || '';
    
    modalEditar.style.display = 'flex';
}

function cerrarModal() {
    modalEditar.style.display = 'none';
}

function guardarCambios() {
    const id = document.getElementById('editar-id').value;
    const fecha = document.getElementById('editar-fecha').value;
    const hora_inicio = document.getElementById('editar-inicio').value;
    const hora_fin = document.getElementById('editar-fin').value;
    const actividades = document.getElementById('editar-actividades').value;
    
    if (!fecha || !hora_inicio) {
        alert('Por favor, completa al menos la fecha y hora de inicio.');
        return;
    }
    
    // Convertir la fecha al formato local
    const objetoFecha = new Date(fecha);
    const fechaFormateada = objetoFecha.toLocaleDateString('es-ES');
    
    // Convertir la hora al formato local
    const objetoHoraInicio = new Date(`1970-01-01T${hora_inicio}`);
    const inicioFormateado = objetoHoraInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    let finFormateado = '';
    if (hora_fin) {
        const objetoHoraFin = new Date(`1970-01-01T${hora_fin}`);
        finFormateado = objetoHoraFin.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    
    try {
        if (db) {
            // Actualizar en la base de datos
            db.run(
                "UPDATE registros SET fecha = ?, hora_inicio = ?, hora_fin = ?, actividades = ? WHERE id = ?",
                [fechaFormateada, inicioFormateado, finFormateado, actividades, id]
            );
            
            guardarBaseDeDatos();
            
            // Actualizar localmente
            const indiceRegistro = registros.findIndex(r => r.id == id);
            if (indiceRegistro !== -1) {
                registros[indiceRegistro].fecha = fechaFormateada;
                registros[indiceRegistro].hora_inicio = inicioFormateado;
                registros[indiceRegistro].hora_fin = finFormateado || registros[indiceRegistro].hora_fin;
                registros[indiceRegistro].actividades = actividades;
            }
        } else {
            // Respaldo con localStorage
            const indiceRegistro = registros.findIndex(r => r.id == id);
            if (indiceRegistro !== -1) {
                registros[indiceRegistro].fecha = fechaFormateada;
                registros[indiceRegistro].hora_inicio = inicioFormateado;
                registros[indiceRegistro].hora_fin = finFormateado || registros[indiceRegistro].hora_fin;
                registros[indiceRegistro].actividades = actividades;
                localStorage.setItem('registros', JSON.stringify(registros));
            }
        }
        
        cerrarModal();
        alert('Registro actualizado correctamente.');
        actualizarEstadisticas();
        renderizarTablaHistorial();
    } catch (error) {
        console.error('Error al actualizar registro:', error);
        alert('Error al actualizar el registro: ' + error.message);
    }
}

function eliminarRegistro(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este registro?')) {
        return;
    }
    
    try {
        if (db) {
            // Eliminar de la base de datos
            db.run("DELETE FROM registros WHERE id = ?", [id]);
            guardarBaseDeDatos();
            
            // Eliminar localmente
            registros = registros.filter(registro => registro.id != id);
        } else {
            // Respaldo con localStorage
            registros = registros.filter(registro => registro.id != id);
            localStorage.setItem('registros', JSON.stringify(registros));
        }
        
        alert('Registro eliminado correctamente.');
        actualizarEstadisticas();
        renderizarTablaHistorial();
    } catch (error) {
        console.error('Error al eliminar registro:', error);
        alert('Error al eliminar el registro: ' + error.message);
    }
}

function exportarPDF() {
    try {
        // Crear PDF con jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(20);
        doc.text('Registro de Horas Laborales', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
        
        // Datos de la tabla
        const tableColumn = ["Fecha", "Inicio", "Fin", "Horas", "Actividades"];
        const tableRows = [];
        
        const registrosARenderizar = registrosFiltrados.length > 0 ? registrosFiltrados : registros;
        
        registrosARenderizar.forEach(registro => {
            if (!registro.hora_fin) return;
            
            // Calcular horas trabajadas
            const inicio = convertirHoraStringADate(registro.hora_inicio);
            const fin = convertirHoraStringADate(registro.hora_fin);
            const diferenciaMs = fin - inicio;
            const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
            const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
            
            const registroData = [
                registro.fecha,
                registro.hora_inicio,
                registro.hora_fin,
                `${horas}h ${minutos}m`,
                registro.actividades || ''
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
        doc.save('registro-horas.pdf');
        alert('PDF exportado correctamente.');
    } catch (error) {
        console.error('Error al exportar PDF:', error);
        alert('Error al exportar a PDF: ' + error.message);
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
            if (!registro.hora_fin) return;
            
            // Calcular horas trabajadas
            const inicio = convertirHoraStringADate(registro.hora_inicio);
            const fin = convertirHoraStringADate(registro.hora_fin);
            const diferenciaMs = fin - inicio;
            const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
            const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
            
            datos.push([
                registro.fecha,
                registro.hora_inicio,
                registro.hora_fin,
                `${horas}h ${minutos}m`,
                registro.actividades || ''
            ]);
        });
        
        // Crear libro de trabajo
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(datos);
        
        // Añadir hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Registros de Horas');
        
        // Guardar archivo
        XLSX.writeFile(wb, 'registro-horas.xlsx');
        alert('Excel exportado correctamente.');
    } catch (error) {
        console.error('Error al exportar Excel:', error);
        alert('Error al exportar a Excel: ' + error.message);
    }
}

function crearRespaldo() {
    try {
        if (db) {
            // Crear respaldo de la base de datos SQLite
            const data = db.export();
            const arrayData = Array.from(new Uint8Array(data));
            
            const blob = new Blob([JSON.stringify(arrayData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `respaldo-horas-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } else {
            // Crear respaldo del localStorage
            const datos = localStorage.getItem('registros');
            const blob = new Blob([datos], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `respaldo-horas-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }
        
        alert('Respaldo creado correctamente.');
    } catch (error) {
        console.error('Error al crear respaldo:', error);
        alert('Error al crear respaldo: ' + error.message);
    }
}

function restaurarRespaldo(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('¿Estás seguro de que quieres restaurar este respaldo? Se perderán los datos actuales.')) {
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = e.target.result;
            
            if (db) {
                // Restaurar base de datos SQLite
                const arrayData = JSON.parse(contenido);
                const buffer = new Uint8Array(arrayData).buffer;
                
                db.close();
                db = new SQL.Database(new Uint8Array(buffer));
                guardarBaseDeDatos();
            } else {
                // Restaurar localStorage
                localStorage.setItem('registros', contenido);
            }
            
            // Recargar datos
            cargarDatos();
            alert('Respaldo restaurado correctamente.');
        } catch (error) {
            console.error('Error al restaurar respaldo:', error);
            alert('Error al restaurar respaldo: ' + error.message);
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