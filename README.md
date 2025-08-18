## API de Productos y Usuarios (Express + PostgreSQL)

API REST construida con Express, PostgreSQL y JWT. Implementa autenticación, autorización por roles y un CRUD de productos. Sigue una arquitectura limpia separando rutas, controladores, repositorios (acceso a datos) y utilidades.

### Tecnologías
- **Node.js / Express**: servidor HTTP y routing
- **PostgreSQL (`pg`)**: base de datos relacional
- **JWT**: autenticación basada en tokens
- **bcryptjs**: hash de contraseñas
- **morgan**: logging HTTP

### Arquitectura
- `routes/` define las rutas HTTP
- `controllers/` contiene la lógica de aplicación por endpoint
- `repositories/` consulta la base de datos con SQL
- `middlewares/` valida JWT y roles
- `db/` conexión y script de inicialización
- `utils/` utilidades (hash/compare de contraseñas)

Estructura relevante:
```
app.js
index.js
config.js
db/
  connection.js
  init.sql
repositories/
  products.repository.js
  users.repository.js
  roles.repository.js
controllers/
  auth.controllers.js
  products.controllers.js
  user.controller.js
middlewares/
  autJwt.js
  veritySignup.js
routes/
  auth.routes.js
  products.routes.js
  user.routes.js
```

### Requisitos
- Node.js 18+
- PostgreSQL 13+

### Configuración
Variables de entorno (crea un `.env` en la raíz o exporta en tu shell):
```
PORT=4000
JWT_SECRET=changeme-secret
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=tu_password
PGDATABASE=api_validator_db
```

Inicializa la base de datos (tablas y roles base):
```
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f db/init.sql
```

Instalación y arranque:
```
npm install
npm run dev
```

### Endpoints principales
- Autenticación (`/api/auth`)
  - `POST /signup` registra usuario (roles opcionales: `user`, `moderator`, `admin`)
  - `POST /signin` inicia sesión y devuelve `token`

- Productos (`/api/products`)
  - `GET /` lista productos
  - `GET /:productId` obtiene producto
  - `POST /` crea producto (requiere `Bearer <token>` y rol `moderator`)
  - `PUT /:productId` actualiza (requiere rol `admin`)
  - `DELETE /:productId` elimina (requiere rol `admin`)

- Usuarios (`/api/users`)
  - `POST /` crea usuario (requiere rol `admin`; valida duplicados)

Ejemplos rápidos (curl):
```
# Signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com","password":"secret"}'

# Signin
curl -X POST http://localhost:4000/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"secret"}'

# Listar productos
curl http://localhost:4000/api/products
```

### Seguridad y roles
- El token JWT se envía en `Authorization: Bearer <token>`
- Roles disponibles: `user`, `moderator`, `admin` (insertados por `db/init.sql` y verificados al inicio)

### Solución de problemas
- “client password must be a string”: define `PGPASSWORD` con un valor válido
- ECONNREFUSED: asegúrate de que PostgreSQL esté corriendo y `PGHOST/PGPORT` sean correctos
- Permisos: el usuario de PostgreSQL debe tener acceso a la base de datos `PGDATABASE`

### Notas
- La capa de datos usa SQL parametrizado para evitar inyección
- Las contraseñas se almacenan con hash `bcrypt`
