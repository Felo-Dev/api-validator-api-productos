# E-commerce Microservices Platform

> Plataforma de e-commerce construida con microservicios, API Gateway, Redis y PostgreSQL. Diseñada para ser escalable, segura y facil de mantener.

[![Node.js](https://img.shields.io/badge/Node.js-20+-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Vitest](https://img.shields.io/badge/Vitest-729B1B?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)

---

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Servicios](#servicios)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Facturacion (CFDI)](#facturacion-cfdi)
- [Base de datos](#base-de-datos)
- [Comunicacion entre servicios](#comunicacion-entre-servicios)
- [Seguridad](#seguridad)
- [Desarrollo local](#desarrollo-local)
- [Docker](#docker)
- [Tests](#tests)
- [Scripts disponibles](#scripts-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Troubleshooting](#troubleshooting)

---

## Arquitectura

```
                         INTERNET
                             |
                  [ API GATEWAY :4000 ]
                  | Routing, Auth, Rate Limit |
                             |
            +----------------+----------------+----------------+
            |                |                |                |
     [ AUTH :4001 ]  [ PRODUCTS :4002 ] [ ORDERS :4003 ] [ BILLING :4005 ]
     | Signup     |  | Products       | | Orders       | | Invoices     |
     | Signin     |  | Inventory      | | Cart         | | CFDI 4.0     |
     | Users/Roles|  | Categories     | | Checkout     | | Fiscal Data  |
     +------------+  +----------------+ +--------------+ | SAT Catalogs |
                                                         +--------------+
                                               |
                                        [ NOTIFICATION :4004 ]
                                        | Email, Webhooks, Push |

          [ PostgreSQL :5432 ]      [ Redis :6379 ]
          | Users, Products,        | Cache, Pub/Sub,   |
          | Orders, Cart, Invoices  | Rate Limit, Sess. |
```

### Flujo de una peticion

1. **Cliente** envia `POST /api/orders` al **Gateway** (:4000)
2. **Gateway** valida JWT, inyecta `X-User-Id` y reenvia al **Order Service** (:4003)
3. **Order Service** crea la orden en PostgreSQL dentro de una transaccion
4. **Order Service** publica evento `order.created` y `order.paid` en **Redis Pub/Sub**
5. **Notification Service** recibe el evento y envia email de confirmacion
6. **Billing Service** recibe `order.paid`, obtiene datos fiscales del usuario y genera automaticamente una factura borrador
7. El usuario puede timbrar la factura via `POST /api/invoices/:id/stamp` generando un CFDI 4.0 con UUID del SAT

---

## Servicios

| Servicio | Puerto | Stack | Descripcion |
|----------|--------|-------|-------------|
| **Gateway** | `4000` | Express, http-proxy-middleware | Router central, auth, rate limiting, CORS |
| **Auth Service** | `4001` | Express, JWT, bcrypt | Registro, login, refresh tokens, gestion de usuarios y roles |
| **Product Service** | `4002` | Express, PostgreSQL | CRUD productos, categorias, inventario, busqueda, filtros (con tasa de IVA por producto) |
| **Order Service** | `4003` | Express, PostgreSQL | Ordenes, carrito, checkout, transacciones |
| **Notification Service** | `4004` | Express, Redis Pub/Sub | Listener de eventos, emails, webhooks |
| **Billing Service** | `4005` | Express, PostgreSQL | Facturacion CFDI 4.0, timbrado, cancelacion, datos fiscales, catalogos SAT |

### Shared Package (`@ecommerce/shared`)

Libreria compartida entre todos los servicios:

| Modulo | Export |
|--------|--------|
| `config.js` | `loadConfig()`, `loadDbConfig()` |
| `errors.js` | `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `PaymentError`, `RateLimitError` |
| `redis.js` | `getRedisClient()`, `closeRedis()` |
| `eventBus.js` | `EventBus`, `EVENTS`, `eventBus` singleton |
| `validators.js` | Zod schemas + `validate()`, `validateQuery()`, `validateParams()` |
| `response.js` | `success()`, `created()`, `paginated()`, `error()` |
| `logger.js` | `createLogger(serviceName)` |

---

## Quick Start

### Opcion A: Docker (recomendado)

```bash
# 1. Clonar y entrar al proyecto
cd api-validator-api-productos

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Iniciar todo con Docker
docker compose up -d

# 5. Verificar que todo esta corriendo
curl http://localhost:4000/health

# Ver logs en tiempo real
docker compose logs -f
```

### Opcion B: Desarrollo local

```bash
# 1. Asegurate de tener PostgreSQL y Redis corriendo
#    PostgreSQL: localhost:5432
#    Redis:      localhost:6379

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp .env.example .env

# 4. Iniciar servicios en terminales separadas
npm run dev:gateway        # Terminal 1
npm run dev:auth           # Terminal 2
npm run dev:products       # Terminal 3
npm run dev:orders         # Terminal 4
npm run dev:notifications  # Terminal 5
npm run dev:billing        # Terminal 6
```

---

## API Reference

Todos los endpoints se acceden a traves del **Gateway** en `http://localhost:4000`.

### Autenticacion

| Method | Endpoint | Auth | Body | Descripcion |
|--------|----------|------|------|-------------|
| `POST` | `/api/auth/signup` | No | `{username, email, password}` | Registrar nuevo usuario |
| `POST` | `/api/auth/signin` | No | `{email, password}` | Iniciar sesion |
| `POST` | `/api/auth/refresh` | No | `{refreshToken}` | Renovar access token |
| `POST` | `/api/auth/logout` | No | `{refreshToken}` | Invalidar refresh token |

**Ejemplo -- Registro:**

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "Secure123!"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "username": "john_doe", "email": "john@example.com" },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Productos

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `GET` | `/api/products` | No | Listar productos (paginacion + filtros) |
| `GET` | `/api/products/:id` | No | Obtener producto por ID |
| `POST` | `/api/products` | moderator | Crear producto |
| `PUT` | `/api/products/:id` | admin | Actualizar producto |
| `DELETE` | `/api/products/:id` | admin | Eliminar producto |
| `POST` | `/api/products/upload-image` | Si | Subir imagen de producto |

**Query parameters para `GET /api/products`:**

| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| `page` | number | `1` | Pagina |
| `limit` | number | `20` | Items por pagina (max 100) |
| `category` | string | - | Filtrar por categoria |
| `search` | string | - | Buscar en nombre y descripcion |
| `minPrice` | number | - | Precio minimo |
| `maxPrice` | number | - | Precio maximo |
| `sortBy` | string | `created_at` | `name`, `price`, `stock`, `created_at` |
| `sortOrder` | string | `desc` | `asc` o `desc` |

**Ejemplo -- Busqueda con filtros:**

```bash
curl "http://localhost:4000/api/products?page=1&limit=10&category=Electronics&search=laptop&minPrice=100&maxPrice=2000&sortBy=price&sortOrder=asc"
```

### Categorias

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `GET` | `/api/categories` | No | Listar todas las categorias |
| `GET` | `/api/categories/:id` | No | Obtener categoria por ID |
| `GET` | `/api/categories/slug/:slug` | No | Obtener categoria por slug |
| `POST` | `/api/categories` | admin | Crear categoria |
| `PUT` | `/api/categories/:id` | admin | Actualizar categoria |
| `DELETE` | `/api/categories/:id` | admin | Eliminar categoria |

### Carrito

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `GET` | `/api/cart` | Si | Ver mi carrito |
| `POST` | `/api/cart/items` | Si | Agregar item al carrito |
| `PUT` | `/api/cart/items/:productId` | Si | Actualizar cantidad |
| `DELETE` | `/api/cart/items/:productId` | Si | Quitar item del carrito |
| `POST` | `/api/cart/checkout` | Si | Checkout completo del carrito |

### Ordenes

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `GET` | `/api/orders` | Si | Listar mis ordenes |
| `GET` | `/api/orders/:id` | Si | Detalle de una orden |
| `POST` | `/api/orders` | Si | Crear orden |
| `POST` | `/api/orders/:id/cancel` | Si | Cancelar orden (si esta pending/processing) |

**Body para crear orden:**

```json
{
  "items": [
    { "productId": 1, "quantity": 2, "price": 29.99 },
    { "productId": 5, "quantity": 1, "price": 49.99 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "paymentMethod": "credit_card",
  "notes": "Entregar antes de las 5pm"
}
```

### Utilidades

| Method | Endpoint | Descripcion |
|--------|----------|-------------|
| `GET` | `/` | Info del API |
| `GET` | `/health` | Health check de todos los servicios |

---

## Facturacion (CFDI)

Sistema de facturacion electronica (CFDI 4.0) conforme al SAT de Mexico. Soporta creacion, timbrado (simulado), cancelacion y descarga de XML.

### Datos Fiscales del Usuario

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `GET` | `/api/fiscal-data` | Si | Obtener mis datos fiscales |
| `PUT` | `/api/fiscal-data` | Si | Crear o actualizar datos fiscales |
| `POST` | `/api/fiscal-data` | Si | Crear datos fiscales (alias de PUT) |
| `DELETE` | `/api/fiscal-data` | Si | Eliminar datos fiscales |

**Ejemplo -- Registrar datos fiscales:**

```bash
curl -X PUT http://localhost:4000/api/fiscal-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "rfc": "XAXX010101000",
    "legalName": "Juan Perez Lopez",
    "taxRegime": "612",
    "cfdiUsage": "G03",
    "address": {
      "street": "Av. Reforma 123",
      "city": "Ciudad de Mexico",
      "state": "CDMX",
      "zipCode": "06600",
      "country": "Mexico"
    }
  }'
```

### Facturas

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `POST` | `/api/invoices` | Si | Crear factura (manual o desde orden) |
| `GET` | `/api/invoices` | Si | Listar facturas (paginado + filtros) |
| `GET` | `/api/invoices/:id` | Si | Obtener factura con conceptos |
| `PUT` | `/api/invoices/:id` | Si | Editar factura (antes de timbrar) |
| `POST` | `/api/invoices/:id/stamp` | Si | Timbrar CFDI 4.0 |
| `POST` | `/api/invoices/:id/cancel` | Si | Cancelar CFDI |
| `GET` | `/api/invoices/:id/xml` | Si | Descargar XML del CFDI |
| `GET` | `/api/invoices/:id/pdf` | Si | Vista HTML para imprimir |

**Query parameters para `GET /api/invoices`:**

| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| `page` | number | `1` | Pagina |
| `limit` | number | `20` | Items por pagina (max 100) |
| `status` | string | - | Filtrar por estado: `pending`, `stamped`, `canceled` |
| `dateFrom` | string | - | Fecha inicial (ISO 8601) |
| `dateTo` | string | - | Fecha final (ISO 8601) |

**Ejemplo -- Crear factura:**

```bash
curl -X POST http://localhost:4000/api/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "orderId": 1,
    "paymentForm": "99",
    "paymentMethod": "PPD",
    "cfdiUsage": "G03",
    "items": [
      {
        "description": "Laptop Pro 15",
        "quantity": 1,
        "unitPrice": 25000.00,
        "ivaRate": 16.00
      }
    ]
  }'
```

**Ejemplo -- Timbrar factura:**

```bash
curl -X POST http://localhost:4000/api/invoices/1/stamp \
  -H "Authorization: Bearer <token>"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cfdi_uuid": "a1b2c3d4-...",
    "cfdi_status": "stamped",
    "cfdi_stamped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

### Catalogos SAT

| Method | Endpoint | Auth | Descripcion |
|--------|----------|------|-------------|
| `GET` | `/api/catalogs/tax-regimes` | No | Listar regimenes fiscales SAT |
| `GET` | `/api/catalogs/cfdi-usages` | No | Listar usos de CFDI SAT |
| `GET` | `/api/catalogs/sat-products` | No | Buscar productos/servicios SAT |
| `GET` | `/api/catalogs/sat-units` | No | Listar unidades de medida SAT |

---

## Base de datos

## Base de datos

### Esquema

```
users                      products                   orders
+----------------+         +------------------------+   +------------------+
| id             |         | id                     |   | id               |
| username       |         | name                   |   | user_id          |
| email          |         | description            |   | subtotal         |
| password       |         | category               |   | tax              |
| first_name     |         | price                  |   | shipping_cost    |
| last_name      |         | compare_at_price       |   | total            |
| deleted_at     |         | stock                  |   | shipping_address |
| created_at     |         | reserved_stock         |   | payment_method   |
| updated_at     |         | sku                    |   | status           |
+----------------+         | images (jsonb)         |   | notes            |
                           | tags (jsonb)           |   | created_at       |
categories                 | is_active              |   | updated_at       |
+----------------+         | tax_rate               |   +------------------+
| id             |         | created_at             |
| name           |         | updated_at             |   order_items
| slug           |         +------------------------+   +------------------+
| description    |                                    | id               |
| parent_id      |         carts                      | order_id         |
| created_at     |         +----------------+         | product_id       |
| updated_at     |         | id             |         | quantity         |
+----------------+         | user_id        |         | price            |
                           | created_at     |         | total            |
                           +----------------+         +------------------+
                           cart_items
                           +----------------+         invoices
                           | id             |         +-----------------------+
                           | cart_id        |         | id                    |
                           | product_id     |         | user_id               |
                           | quantity       |         | order_id              |
                           +----------------+         | invoice_serie/folio   |
                                                      | rfc_emisor/receptor   |
                           user_fiscal_data           | legal_name            |
                           +----------------+         | tax_regime            |
                           | id             |         | cfdi_usage            |
                           | user_id        |         | payment_form/method   |
                           | rfc            |         | subtotal, iva, total  |
                           | legal_name     |         | cfdi_uuid             |
                           | tax_regime     |         | cfdi_xml              |
                           | cfdi_usage     |         | cfdi_status           |
                           | address (jsonb)|         | notes                 |
                           +----------------+         +-----------------------+

                                                      invoice_items
                                                      +-----------------------+
                                                      | id                    |
                                                      | invoice_id            |
                                                      | description           |
                                                      | quantity, unit_price  |
                                                      | iva_rate, iva_amount  |
                                                      | ieps_rate, ieps_amount|
                                                      | total                 |
                                                      +-----------------------+
```

### Inicializar base de datos

```bash
# Con Docker (auto-inicializa al levantar el contenedor)
docker compose up -d postgres

# Manual
psql -h localhost -U postgres -d ecommerce_db -f db/init.sql
```

---

## Comunicacion entre servicios

Los servicios se comunican de forma **asincrona** mediante **Redis Pub/Sub**.

### Publicar un evento

```javascript
import { eventBus, EVENTS } from '@ecommerce/shared';

// Cuando se crea una orden
await eventBus.publish(EVENTS.ORDER_CREATED, {
  orderId: 123,
  userId: 456,
  total: 159.97,
});
```

### Suscribirse a un evento

```javascript
// En el Notification Service
await eventBus.subscribe(EVENTS.ORDER_CREATED, async (data) => {
  await sendOrderConfirmationEmail(data.orderId);
  await notifyWarehouse(data.orderId);
});

// En el Product Service
await eventBus.subscribe(EVENTS.ORDER_CREATED, async (data) => {
  // Reservar stock de los productos en la orden
  for (const item of data.items) {
    await productRepo.reserveStock(item.productId, item.quantity);
  }
});
```

### Eventos disponibles

| Evento | Publicado por | Escuchado por | Descripcion |
|--------|---------------|---------------|-------------|
| `order.created` | Order Service | Notification, Product | Nueva orden creada |
| `order.cancelled` | Order Service | Notification, Product | Orden cancelada (liberar stock) |
| `order.paid` | Order Service | Notification, Billing | Pago confirmado (genera factura) |
| `product.created` | Product Service | Notification | Nuevo producto |
| `product.updated` | Product Service | Notification | Producto actualizado |
| `product.deleted` | Product Service | Notification | Producto eliminado |
| `inventory.low` | Product Service | Notification, Admin | Stock bajo umbral |
| `payment.success` | Order Service | Notification | Pago exitoso (Stripe) |
| `payment.failed` | Order Service | Notification, Order | Pago fallido |
| `invoice.created` | Billing Service | Notification | Factura creada |
| `invoice.stamped` | Billing Service | Notification | CFDI timbrado exitosamente |
| `invoice.cancelled` | Billing Service | Notification | CFDI cancelado |

---

## Seguridad

| Capa | Implementacion |
|------|----------------|
| **Transporte** | HTTPS (en produccion), Helmet security headers |
| **Autenticacion** | JWT access token (15min) + refresh token (7d) |
| **Contraseñas** | bcrypt salt rounds 12 |
| **Validacion** | Zod en todos los endpoints |
| **XSS** | sanitize-html en middleware global |
| **SQL Injection** | Queries parametrizadas (pg placeholders) |
| **Rate Limit** | Redis-backed: 200 req/15min general, 20 req/15min auth |
| **CORS** | Configurado por variable de entorno |
| **Tokens** | Blacklist en logout + revocacion automatica por expiracion |

---

## Desarrollo local

### Requisitos

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm o yarn

### Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar y configurar variables de entorno
cp .env.example .env

# 3. Crear base de datos
createdb ecommerce_db

# 4. Ejecutar schema
psql -h localhost -U postgres -d ecommerce_db -f db/init.sql

# 5. Iniciar servicios
npm run dev:gateway
npm run dev:auth
npm run dev:products
npm run dev:orders
npm run dev:notifications
npm run dev:billing
```

### Workflow recomendado

```bash
# Terminal 1 -- Gateway
npm run dev:gateway

# Terminal 2 -- Product Service
npm run dev:products

# Terminal 3 -- Order Service
npm run dev:orders

# Terminal 4 -- Testing
curl http://localhost:4000/health
```

---

## Docker

### Levantar todo el stack

```bash
# Iniciar todos los servicios
docker compose up -d

# Ver logs
docker compose logs -f

# Ver logs de un servicio especifico
docker compose logs -f product-service

# Detener todo
docker compose down

# Detener y borrar volumenes (pierde datos)
docker compose down -v
```

### Servicios en Docker

| Contenedor | Imagen | Puerto |
|------------|--------|--------|
| `gateway` | `gateway:latest` | `4000:4000` |
| `auth-service` | `auth-service:latest` | `4001:4001` |
| `product-service` | `product-service:latest` | `4002:4002` |
| `order-service` | `order-service:latest` | `4003:4003` |
| `notification-service` | `notification-service:latest` | `4004:4004` |
| `billing-service` | `billing-service:latest` | `4005:4005` |
| `postgres` | `postgres:16-alpine` | `5432:5432` |
| `redis` | `redis:7-alpine` | `6379:6379` |

### Health checks

```bash
# Gateway
curl http://localhost:4000/health

# Servicios individuales
curl http://localhost:4001/health   # Auth
curl http://localhost:4002/health   # Products
curl http://localhost:4003/health   # Orders
curl http://localhost:4004/health   # Notifications
curl http://localhost:4005/health   # Billing
```

---

## Tests

```bash
# Ejecutar todos los tests
npm test

# Tests de un servicio especifico
npm run test --workspace=product-service
npm run test --workspace=order-service

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:coverage
```

### Tests incluidos

| Archivo | Servicio | Que prueba |
|---------|----------|------------|
| `shared/tests/*.test.js` | Shared | Zod schemas (products, orders, categories) |
| `product-service/tests/*.test.js` | Product | Product y pagination schemas |
| `order-service/tests/*.test.js` | Order | Order y cart item schemas |
| `tests/sanitize.test.js` | Shared | XSS sanitization |
| `tests/integration.test.js` | Gateway | Endpoints, security headers, CORS, 404 |

---

## Scripts disponibles

```bash
# Desarrollo
npm run dev              # Todos los servicios
npm run dev:gateway      # Solo Gateway
npm run dev:auth         # Solo Auth Service
npm run dev:products     # Solo Product Service
npm run dev:orders       # Solo Order Service
npm run dev:notifications # Solo Notification Service
npm run dev:billing       # Solo Billing Service (facturacion CFDI)

# Tests
npm test                 # Todos los tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con coverage

# Docker
npm run docker:up        # docker compose up -d
npm run docker:down      # docker compose down
npm run docker:db:init   # Inicializar DB schema
npm run docker:seed      # Poblar con datos de ejemplo

# Base de datos
npm run db:migrate       # Ejecutar migraciones
npm run db:migrate:down  # Revertir ultima migracion
npm run db:migrate:create # Crear nueva migracion
npm run db:seed          # Seed data local
```

---

## Variables de entorno

### Gateway

| Variable | Requerida | Default | Descripcion |
|----------|-----------|---------|-------------|
| `PORT` | No | `4000` | Puerto del gateway |
| `JWT_SECRET` | Si | - | Secreto para firmar JWT |
| `AUTH_SERVICE_URL` | No | `http://localhost:4001` | URL del auth service |
| `PRODUCT_SERVICE_URL` | No | `http://localhost:4002` | URL del product service |
| `ORDER_SERVICE_URL` | No | `http://localhost:4003` | URL del order service |
| `REDIS_HOST` | No | `localhost` | Host de Redis |
| `REDIS_PORT` | No | `6379` | Puerto de Redis |

### Product Service

| Variable | Requerida | Default | Descripcion |
|----------|-----------|---------|-------------|
| `PORT` | No | `4002` | Puerto del servicio |
| `PRODUCT_DB_HOST` | No | `localhost` | Host de PostgreSQL |
| `PRODUCT_DB_PORT` | No | `5432` | Puerto de PostgreSQL |
| `PRODUCT_DB_USER` | No | `postgres` | Usuario de PostgreSQL |
| `PRODUCT_DB_PASSWORD` | No | `postgres` | Contrasena de PostgreSQL |
| `PRODUCT_DB_DATABASE` | No | `ecommerce_db` | Nombre de la BD |
| `REDIS_HOST` | No | `localhost` | Host de Redis |

### Order Service

| Variable | Requerida | Default | Descripcion |
|----------|-----------|---------|-------------|
| `PORT` | No | `4003` | Puerto del servicio |
| `ORDER_DB_*` | No | *(mismo que Product)* | Conexion a PostgreSQL |

### Billing Service

| Variable | Requerida | Default | Descripcion |
|----------|-----------|---------|-------------|
| `PORT` | No | `4005` | Puerto del servicio |
| `BILLING_DB_HOST` | No | `localhost` | Host de PostgreSQL |
| `BILLING_DB_PORT` | No | `5432` | Puerto de PostgreSQL |
| `BILLING_DB_USER` | No | `postgres` | Usuario de PostgreSQL |
| `BILLING_DB_PASSWORD` | No | `postgres` | Contrasena de PostgreSQL |
| `BILLING_DB_DATABASE` | No | `ecommerce_db` | Nombre de la BD |
| `BILLING_EMISOR_RFC` | No | `XAXX010101000` | RFC del emisor (negocio) |
| `BILLING_EMISOR_NOMBRE` | No | `Mi Empresa` | Razon social del emisor |
| `BILLING_EMISOR_REGIMEN` | No | `601` | Regimen fiscal del emisor |
| `BILLING_EMISOR_CP` | No | `00000` | Codigo postal del emisor |

---

## Estructura del proyecto

```
api-validator-api-productos/
|
|-- package.json                    # Root workspace config
|-- docker-compose.yml              # Orquestacion de todos los servicios
|-- .env.example                    # Variables de entorno de ejemplo
|
|-- shared/                         # @ecommerce/shared -- libreria compartida
|   |-- package.json
|   +-- src/
|       |-- index.js                # Exporta todo
|       |-- config.js               # Configuracion con validacion
|       |-- errors.js               # Clases de error personalizadas
|       |-- redis.js                # Cliente Redis singleton
|       |-- eventBus.js             # Pub/Sub con eventos predefinidos
|       |-- validators.js           # Zod schemas + middleware factories
|       |-- response.js             # Helpers de respuesta HTTP
|       +-- logger.js               # Logger con prefijo de servicio
|
|-- gateway/                        # API Gateway
|   |-- package.json
|   +-- src/
|       |-- index.js                # Entry point + graceful shutdown
|       +-- app.js                  # Express app + proxy routes
|
|-- services/
|   |-- auth-service/               # Autenticacion y usuarios
|   |   |-- package.json
|   |   +-- src/
|   |       |-- index.js
|   |       +-- app.js
|   |
|   |-- product-service/            # Productos, categorias, inventario
|   |   |-- package.json
|   |   |-- vitest.config.js
|   |   |-- src/
|   |   |   |-- index.js            # Entry point + schema init
|   |   |   |-- app.js              # Express app
|   |   |   |-- db/
|   |   |   |   |-- connection.js
|   |   |   |   +-- index.js
|   |   |   |-- routes/
|   |   |   |   +-- index.js
|   |   |   |-- controllers/
|   |   |   |   +-- products.controller.js
|   |   |   +-- repositories/
|   |   |       |-- products.repository.js
|   |   |       +-- categories.repository.js
|   |   +-- tests/
|   |       +-- validators.test.js
|   |
|   |-- order-service/              # Ordenes, carrito, checkout
|   |   |-- package.json
|   |   |-- vitest.config.js
|   |   |-- src/
|   |   |   |-- index.js
|   |   |   |-- app.js
|   |   |   |-- db/
|   |   |   |-- routes/
|   |   |   |   +-- index.js
|   |   |   |-- controllers/
|   |   |   |   +-- orders.controller.js
|   |   |   +-- repositories/
|   |   |       +-- orders.repository.js
|   |   +-- tests/
|   |       +-- validators.test.js
|   |
|   |-- notification-service/       # Escucha eventos y notifica
|   |   |-- package.json
|   |   +-- src/
|   |       +-- index.js
|   |
|   +-- billing-service/            # Facturacion CFDI 4.0 (SAT Mexico)
|       |-- package.json
|       |-- vitest.config.js
|       |-- Dockerfile
|       +-- src/
|           |-- index.js            # Entry point + schema init (6 tablas fiscales)
|           |-- app.js              # Express app
|           |-- db/
|           |   |-- connection.js
|           |   +-- index.js
|           |-- routes/
|           |   +-- index.js        # 16 endpoints de facturacion
|           |-- controllers/
|           |   |-- invoices.controller.js
|           |   |-- fiscal.controller.js
|           |   +-- catalogs.controller.js
|           |-- repositories/
|           |   |-- invoices.repository.js
|           |   +-- fiscal.repository.js
|           |-- services/
|           |   |-- tax.service.js  # Calculo de IVA, IEPS, retenciones
|           |   |-- cfdi.service.js # Generacion XML CFDI 4.0 + timbrado
|           |   +-- pdf.service.js  # Template HTML de factura
|           +-- data/
|               |-- tax-regimes.json  # 19 regimenes fiscales SAT
|               |-- cfdi-usages.json  # 42 usos de CFDI SAT
|               +-- sat-codes.json    # 100+ codigos SAT
|
+-- [legacy code -- API v2]         # Codigo anterior (referencia)
    |-- app.js
    |-- controllers/
    |-- repositories/
    |-- routes/
    |-- middlewares/
    |-- db/
    |-- utils/
    +-- tests/
```

---

## Troubleshooting

### Error: `Missing required env vars: JWT_SECRET`

```bash
cp .env.example .env
# Asegurate de que JWT_SECRET este definido en .env
```

### Error: `ECONNREFUSED` en PostgreSQL

```bash
# Verificar que PostgreSQL esta corriendo
docker compose up -d postgres

# O si usas PostgreSQL local
pg_isready -h localhost -p 5432
```

### Error: `Redis Client Error`

```bash
# Verificar que Redis esta corriendo
docker compose up -d redis

# O si usas Redis local
redis-cli ping  # debe responder "PONG"
```

### Error: `la autentificacion password fallo para el usuario "postgres"`

```bash
# En .env, asegurate de que PGPASSWORD coincida con tu contrasena real
PGPASSWORD=tu_contrasena_real
```

### Error: `Service unavailable` en un endpoint

```bash
# Verificar que el servicio correspondiente esta corriendo
curl http://localhost:4002/health  # Product service
curl http://localhost:4003/health  # Order service
curl http://localhost:4005/health  # Billing service

# Ver logs del servicio
docker compose logs product-service
```

### Reset completo

```bash
# Parar todo, borrar datos y reiniciar
docker compose down -v
docker compose up -d
```

---

## Changelog

### v3.1.0 -- Facturacion CFDI
- Billing Service con facturacion electronica CFDI 4.0 (SAT Mexico)
- Datos fiscales de usuario (RFC, regimen, uso CFDI, direccion fiscal)
- Creacion, timbrado, cancelacion y descarga de XML/PDF de facturas
- Generacion de XML CFDI 4.0 con complemento de timbre fiscal digital
- Calculo de impuestos: IVA (16%, 8%, 0%, exento), IEPS, retenciones ISR/IVA
- Catalogos SAT: regimenes fiscales, usos CFDI, productos/servicios, unidades
- Auto-generacion de factura al recibir evento `order.paid`
- Tasa de IVA configurable por producto (`tax_rate`)
- Gateway con rutas `/api/invoices`, `/api/fiscal-data`, `/api/catalogs`

### v3.0.0 -- Microservicios
- Migracion de monolito a microservicios
- API Gateway con proxy y auth forwarding
- Redis Pub/Sub para comunicacion entre servicios
- Product service con inventario y categorias
- Order service con carrito y checkout
- Notification service como listener de eventos
- Shared package con utilidades comunes
- Docker Compose para orquestacion completa

### v2.1.0 -- Monolito mejorado
- Validacion con Zod
- Security headers (helmet), CORS, rate limiting
- JWT refresh tokens + logout
- Soft delete + audit log
- Swagger docs
- XSS sanitization
- pino-http logging
- Graceful shutdown

---

## Contribuir

1. Fork el repositorio
2. Crear branch de feature (`git checkout -b feature/nuevo-feature`)
3. Commit cambios (`git commit -m 'feat: agregar nuevo feature'`)
4. Push al branch (`git push origin feature/nuevo-feature`)
5. Abrir Pull Request

---

## Licencia

ISC

---

Hecho con Node.js, Express, PostgreSQL y Redis
