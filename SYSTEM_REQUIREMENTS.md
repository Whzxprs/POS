# Documento de Requerimientos y Especificaciones Técnicas
**Proyecto:** Sistema Integral de Gestión Restaurantera (ERP / RMS)
**Visión:** Un sistema construido desde la perspectiva operativa, diseñado para facilitar el flujo de trabajo de cada área (FOH y BOH), automatizar cálculos críticos, evitar fugas de dinero y maximizar la rentabilidad del restaurante.

---

## 1. Módulo FOH (Front of House) - Salón y Servicio
### 1.1. Gestión de Mesas (Floor Management)
- **Editor de Mapas Dinámico:** El capitán puede arrastrar, crear, modificar, unir y separar mesas al vuelo dependiendo de la demanda (Ej. Unir mesa 12 y 13 para un evento).
- **Asignación de Zonas:** Asignación visual de qué mesero atiende qué mesas, balanceando la carga de trabajo.
- **Reservaciones y Eventos:** Registro de nombre, pax (personas), restricciones dietéticas, alergias, requerimientos de montaje y descripción del motivo.
- **Estados en Tiempo Real:** Indicadores visuales (Verde=Libre, Amarillo=Ordenando, Rojo=Comiendo, Gris=Cobrando) controlados por eventos de base de datos.

### 1.2. Punto de Venta (POS) y Comandas
- **Comandas Multicursos:** Separación explícita por tiempos (Primer tiempo, Segundo tiempo, Postres) permitiendo al mesero o capitán disparar ("Cantar") el siguiente tiempo a cocina.
- **Cobro Avanzado:** División de cuentas por persona o por monto exacto, propinas, descuentos autorizados y métodos de pago mixtos.

---

## 2. Módulo BOH (Back of House) - Producción y Brigada
### 2.1. Sistema KDS (Kitchen / Bar Display System)
- **Ruteo por Estaciones:** Una sola comanda se divide automáticamente. Las bebidas van a la tablet de Barra, la carne a la Parrilla, y la ensalada a Fría.
- **Sincronización de Tiempos:** La estación de caliente no empieza a cocinar el corte hasta que se cante el tiempo, pero la interfaz le avisa "Prepárate, viene un Ribeye de la Mesa 4".
- **Balanceo de Carga en Barra:** Asignación automática "Round-Robin" (equitativa) de tickets entre los bartenders en turno.
- **Sub-Área de Producción:** KDS separado para Mise en place (Manejo de salsas, jarabes, batching de coctelería) fuera del servicio al cliente.

---

## 3. Módulo de Inventario, Almacén y Compras
### 3.1. Multialmacén y Control de Stock (Par Levels)
- El sistema se divide en **Almacén Global**, **Sub-Almacén Cocina** y **Sub-Almacén Barra**.
- Cada área tiene un "Stock Actual", "Mínimo" y "Máximo" (*Par Level*).
- **Control Antirrobo:** Si la barra tiene configurado un máximo de 5 botellas de Campari y ya tiene 4, el sistema le impide pedir más de 1 botella al Almacén Global.

### 3.2. Sistema de Requisiciones Internas
- Interfaz (app tablet) para Chef Ejecutivo y Jefe de Barra para solicitar transferencias desde el Almacén Global con un solo clic basado en faltantes.

### 3.3. Módulo de Proveedores y Órdenes de Compra Automáticas
- Directorio de proveedores con días de entrega, tiempos de espera (*lead times*) y contacto.
- **Automatización de Compras:** Cuando el Almacén Global baja de su Mínimo de un insumo, el sistema redacta una Orden de Compra (PO) automáticamente. El gerente solo da un clic en "Aprobar y Enviar" y se manda por email.

### 3.4. Control de Mermas (Shrinkage)
- Registro obligatorio y categorizado de mermas (Caducidad, Error de empleado, Prueba).
- Alerta al administrador si las mermas rebasan el presupuesto.

---

## 4. Ingeniería de Menú y Costeo
### 4.1. Rendimiento y Masa Drenada
- El sistema procesa insumos crudos. Ej: Se compran 5kg de lomo, pero tras limpiar grasa el rendimiento (*yield*) es 80%. El sistema calcula el *Costo Neto* utilizable automáticamente.
### 4.2. Constructor de Recetas y Subrecetas
- Se anidan subrecetas (Ej. El plato "Pasta" requiere 100g de "Salsa Pomodoro", y la salsa es una subreceta de tomates, ajo, etc.).
- **Calculadora de Food Cost Dinámica:** Si el precio del limón sube en Compras, el *Beverage Cost* de todas las recetas que usan limón sube en tiempo real, alertando al gerente.

---

## 5. Recursos Humanos (HR) y Portal de Empleados
### 5.1. Dashboard Gerencial
- Creación de horarios y turnos (matutino, vespertino, doble) por estación.
- Control de faltas, retardos y horas extras para cálculo pre-nómina.
### 5.2. App del Personal (Mobile Portal)
- Interfaz PWA adaptada a teléfonos celulares.
- El empleado puede ver su horario semanal.
- Flujo de solicitudes de vacaciones, días de descanso o incapacidades enviadas al gerente para aprobación.

---

## 6. Business Intelligence (Dashboard Administrativo)
- Exclusivo para el Propietario/Gerente General.
- Gráficos en tiempo real:
  - Ventas por hora / Mapa de calor de afluencia.
  - Labor Cost (%) vs Ventas.
  - Alertas Críticas (Productos agotados, mermas inusuales).
- Aprobaciones críticas centralizadas (Cambio de precios de menú, aprobación de vacaciones, órdenes de compra).

---

## 7. Arquitectura Tecnológica
- **Infraestructura Cloud:** Sistema alojado en la nube para acceso remoto desde cualquier dispositivo.
- **Frontend:** React + Next.js (Altamente Responsivo PWA).
- **Backend/Database:** PostgreSQL vía Supabase.
- **Realtime:** WebSockets nativos de Postgres (Supabase Realtime) para actualizaciones instantáneas de KDS, Inventario y Alertas sin recargar páginas.
- **Seguridad (RBAC):** Row Level Security estricto para evitar que un mesero acceda a los costos o apruebe órdenes de compra.
