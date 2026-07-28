# Alessa IPS

Aplicación web para la gestión y generación de Informes Periódicos de Seguridad (IPS) en farmacovigilancia.

## Arquitectura

El proyecto está compuesto por tres servicios independientes que corren en paralelo:

| Servicio | Tecnología | Puerto por defecto | Responsabilidad |
|---|---|---|---|
| **Frontend** | React 19 + Vite + Tailwind | `5173` | Interfaz de usuario (SPA) |
| **Backend Node** | Express + PostgreSQL (`pg`) | `3000` | Auth, workspaces, casos IPS, roles, usuarios, Zotero, PGx |
| **Backend Python** | Flask | `5000` | Conversión de documentos, generación de `.docx`, procesamiento de Ficha Técnica, proxy a Claude/OpenAI |

Los tres se levantan juntos con un solo comando gracias a `concurrently`.

## Requisitos previos

- Node.js 18+ y npm
- Python 3.13 (o compatible con las dependencias de `backend/requirements.txt`)
- PostgreSQL (local o remoto)

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd "AlessaIPS v01"

# Frontend + orquestador raíz
npm install

# Backend Node
cd backend-node
npm install
cd ..

# Backend Python
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 2. Configurar variables de entorno

Copia la plantilla y completa con tus credenciales reales:

```bash
cp backend-node/.env.example backend-node/.env
```

Variables requeridas en `backend-node/.env`:

| Variable | Descripción |
|---|---|
| `DB_HOST` | Host de PostgreSQL |
| `DB_PORT` | Puerto de PostgreSQL (por defecto `5432`) |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de PostgreSQL |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `PORT` | Puerto del servidor Express (por defecto `3000`) |

> **Nunca subas el archivo `.env` real al repositorio** — ya está excluido en `.gitignore`.

### 3. Preparar la base de datos

Los scripts de migración e inicialización están en `backend-node/src/config/`:

```bash
cd backend-node
node src/config/create_db.js       # crea la base de datos si no existe
node src/config/init_db.js         # crea las tablas base
node src/config/migrate_workspaces.js
node src/config/migrate_to_workspaces.js
node src/config/migrate_ips_list.js
node src/config/migrate_ips_cases.js
node src/config/migrate_user_integrations.js
node src/config/add_metadata_column.js
node src/config/seed_all.js        # datos semilla (opcional)
node src/config/seed_clients.js    # clientes semilla (opcional)
cd ..
```

## Desarrollo

Levantar los tres servicios a la vez desde la raíz:

```bash
npm run dev
```

Esto ejecuta en paralelo:
- `npm run dev:frontend` → Vite en `http://localhost:5173`
- `npm run dev:backend` → Express en `http://localhost:3000`
- `npm run dev:python` → Flask en `http://127.0.0.1:5000`

También puedes levantar cada uno por separado si lo prefieres (ver `package.json` para los scripts individuales).

## Notas para despliegue en producción

- El frontend actualmente tiene **URLs hardcodeadas a `http://127.0.0.1:5000`** para llamar al backend Flask (en `SeccionE.jsx` y `SeccionF.jsx`). Antes de desplegar, estas deben reemplazarse por una variable de entorno de Vite (ej. `VITE_FLASK_API_URL`).
- `backend-node/src/services/api.js` define `API_URL` apuntando a `localhost:3000` — igualmente debe parametrizarse para producción.
- El backend Python es **esencial en producción** (no es solo una herramienta de desarrollo): genera los documentos `.docx` del IPS y procesa Fichas Técnicas.
- Las API keys de Claude/OpenAI se gestionan desde la pantalla de Configuración de la app y se guardan en `localStorage` del navegador (no en el servidor).

## Estructura del proyecto

```
AlessaIPS v01/
├── src/                  # Frontend React
├── backend-node/         # API Node/Express + PostgreSQL
│   └── src/config/       # Scripts de conexión, migración y seed de BD
├── backend/              # API Flask (generación de documentos)
└── public/               # Estáticos del frontend
```
