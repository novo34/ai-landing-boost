# AutomAI SaaS - Monorepo

SaaS multi-tenant para automatización de marketing con IA.

## Configuración de Variables de Entorno

### Backend (apps/api)

1. Copiar el archivo de ejemplo:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

2. Editar `apps/api/.env` y configurar las variables:
   - `DATABASE_URL`: URL de conexión a MySQL
   - `JWT_SECRET`: Secreto para JWT (generar con `openssl rand -base64 32`)
   - `JWT_REFRESH_SECRET`: Secreto para refresh tokens
   - `FRONTEND_URL`: URL del frontend para CORS
   - **Stripe:** Ver [Configuración de Stripe](docs/CONFIGURACION-STRIPE.md) para variables completas

### Frontend (apps/web)

1. Copiar el archivo de ejemplo:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

2. Editar `apps/web/.env` y configurar:
   - `NEXT_PUBLIC_API_URL`: URL del backend API
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Publishable key de Stripe (ver [Configuración de Stripe](docs/CONFIGURACION-STRIPE.md))

### Generar Secretos Seguros

Para generar secretos seguros para JWT:

```bash
# JWT_SECRET
openssl rand -base64 32

# JWT_REFRESH_SECRET
openssl rand -base64 32
```

## Configuración de Servicios Externos

### Stripe (Billing)

Para configurar Stripe completo (checkout, portal, webhooks), ver la guía detallada:

📖 **[Configuración de Stripe - Guía Completa](docs/CONFIGURACION-STRIPE.md)**

Esta guía incluye:
- Configuración en Stripe Dashboard
- Variables de entorno necesarias
- Configuración de webhooks
- Testing local con Stripe CLI
- Troubleshooting común

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
