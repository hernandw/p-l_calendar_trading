# 📈 P&L Calendar, Multicuenta & Options Trading Journal

Un diario de trading profesional, visual e interactivo para opciones financieras y acciones. Diseñado para monitorear el **P&L real**, la **curva de capital de cuenta (Equity Curve)**, **comisiones del broker**, **gestión multicuenta** y estadísticas oficiales bajo las métricas de **Charles Schwab / Thinkorswim**.

Construido como una Single Page Application (SPA) en **HTML5, Tailwind CSS y JavaScript Vanilla**, sin servidores externos: tus datos se mantienen **100% privados y seguros** en el almacenamiento local de tu navegador (`localStorage`), con opción de descarga de respaldos en formato JSON.

---

## 📸 Capturas de Pantalla & Recorrido Visual

### 1. Vista Mensual (P&L Calendar)
Calendario operativo de **lunes a viernes** con colores pastel diferenciados para ganancias y pérdidas, conteo de trades cerrados y el identificador dinámico **Today** que resalta exclusivamente en el día en curso del sistema:

<p align="center">
  <img src="screenshots/01-calendar-month.png" alt="Vista Mensual del Calendario" width="600" style="border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
</p>

---

### 2. Modo Dark & Light Integrado
Alterna en un clic entre una interfaz limpia en tonos claros y un **Dark Mode estilo Fintech/OLED**, diseñado para sesiones de trading prolongadas con alto contraste y fatiga visual mínima:

<p align="center">
  <img src="screenshots/02-dark-light-mode.png" alt="Modo Oscuro y Claro" width="600" style="border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
</p>

---

### 3. Pestaña de Capital Real & Balance de Cuenta
Control estricto de dinero real: diferencia el rendimiento de tus trades de los movimientos bancarios. Registra depósitos y retiros con selector de fecha interactivo, edición directa de montos y cálculo del saldo real exacto en el broker:

<p align="center">
  <img src="screenshots/03-capital-account.png" alt="Pestaña Capital y Flujos de Dinero" width="600" style="border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
</p>

---

### 4. Pestaña de Comisiones & Impacto Operativo
Mide el "Fee Drag" (arrastre de comisiones): calcula el número total de contratos cerrados, el total pagado en comisiones a tu broker y la comparación entre tu ganancia bruta y la ganancia neta líquida:

<p align="center">
  <img src="screenshots/04-commissions-view.png" alt="Pestaña de Comisiones por Ticker" width="600" style="border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
</p>

---

### 5. Resumen de Desempeño por Ticker (Compañías)
Tarjetas organizadas con **insignias cromáticas personalizadas** (`SPY`, `TSLA`, `NVDA`, `AMD`, `QQQ`), porcentaje de acierto (**Win Rate %**), volumen de contratos, capital invertido y desglose de trades ganadores vs perdedores:

<p align="center">
  <img src="screenshots/05-tickers-analytics.png" alt="Estadísticas por Ticker" width="600" style="border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
</p>

---

### 6. Soporte Multicuenta & Transferencias
Administra múltiples portafolios de forma independiente (ej. *Charles Schwab Margin*, *Webull Cash*, *Interactive Brokers*). Si tienes 2 o más cuentas, puedes transferir saldo entre ellas con un clic:

<p align="center">
  <img src="screenshots/06-multi-account.png" alt="Gestor de Cuentas y Transferencias" width="600" style="border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);">
</p>

---

## 🚀 Nuevas Mejoras y Funcionalidades

### 🏦 Arquitectura Multicuenta Aislada
- **Múltiples Brokers:** Crea cuentas separadas definiendo Broker, Número de cuenta (ej. `XXXX7484`) y Tipo de cuenta (`Margin`, `Cash`, `IRA`, `Fondeo`).
- **Aislamiento Total:** Las operaciones, el saldo de capital, las comisiones y los archivos CSV se procesan de forma exclusiva para la cuenta activa sin mezclar números.
- **Transferencias entre Cuentas:** Si posees dos o más cuentas registradas, se habilita un botón en la pestaña *Capital* para traspasar fondos entre brokers, generando el retiro y depósito correspondientes con la misma fecha.

### 💰 Control de Capital Real & Flujos Bancarios
- **Diferenciación entre P&L y Capital:** El crecimiento real de tu portafolio no depende solo de ganar trades, sino de controlar cuánto capital arriesgas, cuánto depositas y cuánto retiras.
- **Fórmula de Balance en Vivo:**
  $$\text{Saldo Real de Cuenta} = (\sum \text{Depósitos} - \sum \text{Retiros}) + \text{P\&L Neto Acumulado}$$
- **Edición Completa:** Modifica montos, conceptos o fechas haciendo clic directamente sobre el registro o usando el selector de calendario interactivo.

### 🧾 Análisis de Comisiones y Descuento Real
- **Cálculo por Contrato:** Multiplica el volumen de contratos operados por una tarifa personalizable (por defecto `$1.30` por contrato *round-trip* / compra y venta).
- **Métricas Bruto vs. Neto:** Revela qué porcentaje de tus ganancias brutas se queda el broker en comisiones.

### ⚖️ Detección Real de *Wash Sales* (Charles Schwab)
- **Desglose Operativo:** Los reportes de Schwab a menudo colocan `$0.00` en operaciones perdedoras por normas fiscales del IRS (*Disallowed Loss*). El importador inteligente detecta estas pérdidas y las registra en rojo en tu calendario, asegurando que tu ratio de acierto (**W/L**) refleje la realidad de tu operativa.
- **Cálculo Exacto de DTE:** Compara la fecha de apertura (`Opened Date`) con la de expiración para etiquetar automáticamente contratos `0DTE`, `1DTE`, `2DTE`, etc.

### 💾 Backup y Restauración en JSON
- **Descargar Backup:** Exporta un archivo `.json` con todas tus cuentas, operaciones, movimientos de capital y ajustes en un solo clic.
- **Restaurar:** Carga un archivo de respaldo previo para migrar o sincronizar tu diario en cualquier computadora sin perder datos.

---

## 📊 Métricas Oficiales de Charles Schwab

La barra inferior calcula en tiempo real:

1. **Ganancia Neta:** Resultado limpio de todas las operaciones del periodo.
2. **Relación Ganancia / Pérdida (Velocímetro Schwab):**
   $$\text{Relación G/P} = \frac{\text{Ganancias Brutas}}{\text{Ganancias Brutas} + \vert{}\text{Pérdidas Brutas}\vert{}} \times 100$$
3. **Totales G / P:** Sumatoria independiente de las operaciones ganadoras frente a las perdedoras.
4. **Acierto Trades:** Porcentaje de acierto y conteo de trades ganados vs total de operaciones.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 semántico**
- **[Tailwind CSS (CDN)](https://tailwindcss.com/):** Diseño responsivo, paleta cromática por ticker y soporte completo de modo oscuro (`dark:`).
- **[Lucide Icons](https://lucide.dev/):** Iconografía moderna con alineación centrada en todas las pestañas.
- **[PapaParse](https://www.papaparse.com/):** Procesamiento en el cliente de reportes CSV de brokers (`Gain/Loss` y `Transactions`).
- **JavaScript Vanilla (ES6+):** Código modularizado, ejecución reactiva y persistencia en `localStorage`.

---

## 📂 Archivos CSV Compatibles

El importador reconoce automáticamente dos tipos de reportes exportados de Charles Schwab:

1. **Gain/Loss Realized Details (`GainLoss_Realized_Details.csv`):**
   - Extrae símbolo, strike, CALL/PUT, número de contratos, fecha de apertura y cierre, y P&L neto real.
2. **Transactions History (`Transactions.csv`):**
   - Extrae transferencias bancarias ACH, depósitos y retiros hacia tu cuenta bancaria para mantener el balance al día.

