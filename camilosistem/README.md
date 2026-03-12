# 🛒 CamiloSistem — Sistema de Gestión de Pedidos

Sistema de gestión de pedidos para tiendas, basado en el diagrama de procesos con flujo completo de cotizaciones, pedidos, facturas y entregas.

---

## 🚀 Cómo ejecutar

### Opción 1 — Abrir directamente (sin instalar nada)
1. Descomprime el ZIP
2. Abre `public/index.html` en tu navegador
3. ¡Listo! El sistema funciona completamente en el navegador.

### Opción 2 — Con servidor local (recomendado)
```bash
# Instalar dependencias
npm install

# Modo desarrollo con live-server
npm run dev
```

### Opción 3 — Compilar TypeScript
```bash
npm install
npm run build
```

---

## 🗂️ Estructura del Proyecto

```
camilosistem/
├── public/
│   └── index.html          ← Interfaz HTML completa (abrir aquí)
├── src/
│   ├── models/
│   │   └── types.ts        ← Modelos TypeScript del sistema
│   └── services/
│       └── OrderService.ts ← Lógica de negocio completa
├── package.json
├── tsconfig.json
└── README.md
```

---

## 👥 Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| 🚢 **Shipping Office** | Prepara la requisición inicial |
| 🛒 **Buyer Agent** | Gestiona RFQ y cotizaciones |
| 👔 **Supervisor** | Evalúa y aprueba solicitudes |
| 🏪 **Seller (Vendedor)** | Cotiza y procesa pedidos |
| 📬 **Receive Agent** | Confirma recepción del producto |

---

## 🔄 Flujo de Proceso

```
Shipping Office → Preparar Requisición
       ↓
Buyer Agent → Preparar RFQ
       ↓ (¿Necesita revisión?)
Supervisor → Evaluar y Aprobar/Rechazar
       ↓
Seller → Decidir si Cotiza
       ↓
Seller → Preparar Cotización Actual
       ↓
Buyer Agent → Analizar Respuesta
       ↓ (¿Cotización aceptable?)
Buyer Agent → Preparar Pedido
       ↓
Seller → Revisar Pedido (¿Aceptable?)
       ↓
Seller → Cumplir Pedido + Factura
       ↓
Seller → Recibir Pago
       ↓
Receive Agent → Confirmar Entrega ✅
```

---

## 🛠️ Tecnologías

- **TypeScript** — Modelos y lógica de negocio
- **HTML5 / CSS3 / JavaScript** — Interfaz de usuario
- **Google Fonts** — Tipografía (Syne + Space Mono)

---

*CamiloSistem © 2024 — Sistema de Gestión de Pedidos en Tiendas*
