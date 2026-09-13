# Getting Started & Developer Setup

This guide provides step-by-step instructions for setting up the **Hooop** development environment locally.

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Python**: v3.10 or higher
- **Node.js**: v18 or higher (and `npm` v9+)
- **PostgreSQL Database**: A running PostgreSQL database (or [Supabase](https://supabase.com/) project)
- **Zernio API Key**: Active API key from Zernio for Instagram DM access

---

## Environment Variables Setup

### 1. Backend Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and update the values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres:password@localhost:5432/hooop
ZERNIO_API_KEY=zernio_live_key_xyz123
APP_MASTER_KEY=your-32-byte-fernet-master-key
JWT_SECRET=your-jwt-signing-secret
JWT_ALGORITHM=HS256
```

### 2. Frontend Configuration (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Running the Application Locally

### 1. Backend Server (FastAPI)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will be available at `http://localhost:8000`. API docs can be accessed at `http://localhost:8000/docs`.

---

### 2. Frontend Application (React + Vite)

1. Navigate to the `frontend/` directory in a new terminal:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173`.
