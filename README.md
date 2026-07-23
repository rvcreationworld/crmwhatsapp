# CallPulse Agent CRM

A comprehensive CRM and Telecalling system designed to streamline lead management, track call logs automatically via an Android agent, and provide a full-featured admin and telecaller portal.

## Features
- **Multi-Lead Management:** Manage Direct, Free, Bot, and Transferred leads seamlessly.
- **Automated Call Tracking:** Flutter-based Android application automatically syncs call logs (duration, status) back to the CRM.
- **Real-Time Dashboards:** Analytics for telecaller performance, lead conversion, and call volume.
- **Automated Workflows:** WhatsApp and SMS automation queues, template messaging, and Bot auto-assignment pools.
- **Role-Based Access Control:** Distinct portals and permissions for Admins and Telecallers.

## Technology Stack
- **Frontend:** React 19, Vite, TailwindCSS (v4)
- **Backend:** Node.js, Express, MySQL
- **Mobile Agent:** Flutter, Dart
- **Authentication:** JWT (JSON Web Tokens)

---

## Local Installation Steps

### Prerequisites
- Node.js (v18 or higher recommended)
- MySQL (v8.0 or higher)
- Flutter SDK (for mobile app development)

### 1. Database Setup
1. Create a MySQL database (e.g., `crm_db`).
2. Run the provided SQL migration files located in the root directory to set up the schema and seed initial data:
   ```bash
   mysql -u root -p crm_db < prod_schema.sql
   ```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` directory and configure the environment variables (see below).
4. Start the development server:
   ```bash
   npm run dev
   ```
*(Note: Repeat similar steps for `telepro2` if running the secondary backend).*

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend/` directory if required.
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## Environment Variables Required

Create a `.env` file in the **backend** directory with the following minimum configuration. **Never commit this file to version control.**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=your_database_name

# Security
JWT_SECRET=your_super_secret_jwt_key
```

---

## Build Commands

### Frontend Production Build
```bash
cd frontend
npm run build
```
This will generate optimized static assets in the `frontend/dist` directory.

### Mobile App Production Build (Android)
```bash
cd callpulse-agent-flutter
flutter build apk --release
```

---

## Production Deployment Steps

### 1. Backend (Node.js/Express)
1. Ensure the server has Node.js and PM2 installed.
2. Clone the repository and install dependencies: `npm install --production`.
3. Set up the production `.env` file on the server.
4. Start the application using PM2:
   ```bash
   pm2 start server.js --name "crm-backend"
   pm2 save
   ```
5. Configure Nginx or Apache as a reverse proxy to route traffic to your Node.js port (e.g., 5000).

### 2. Frontend (React/Vite)
1. Run `npm run build` locally or in your CI/CD pipeline.
2. Copy the contents of the `frontend/dist` folder to your web server's public html directory (e.g., `/var/www/html/crm-frontend`).
3. Configure your web server (Nginx/Apache) to serve the static files and fallback to `index.html` for client-side routing:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

### 3. Mobile App (CallPulse Agent)
1. Distribute the generated `app-release.apk` to your telecallers.
2. Ensure they grant necessary permissions (Call Logs, Phone State, Display over other apps, and disable battery optimization) for background syncing to function correctly.
