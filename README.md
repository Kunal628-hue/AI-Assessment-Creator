# VedaAI — AI Assessment Creator

An AI-powered assessment creation platform that helps teachers generate structured question papers using Google Gemini AI. Built with Next.js, Express, MongoDB, Redis, BullMQ, and WebSocket for real-time updates.

## 🏗️ Architecture

```
AI-Assessment-Creator/
├── frontend/          # Next.js + TypeScript (Port 3000)
├── backend/           # Express + TypeScript (Port 5000)
├── shared/            # Shared TypeScript types
├── docker-compose.yml # MongoDB + Redis
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker (for MongoDB & Redis)
- Gemini API Key (optional for mock mode)

### 1. Start Infrastructure
```bash
docker-compose up -d
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App
Visit [http://localhost:3000](http://localhost:3000)

## ✨ Features

- **Assignment Creation** — Multi-section form with validation, file upload, question config
- **AI Question Generation** — Structured prompts sent to Gemini for high-quality question papers
- **Real-time Updates** — WebSocket-powered progress tracking
- **Structured Output** — Exam-style paper with sections, difficulty badges, marks
- **PDF Download** — Print-optimized question paper layout
- **Background Processing** — BullMQ job queue for async generation

## 🔧 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, TypeScript, Zustand, WebSocket |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Cache/Queue | Redis, BullMQ |
| AI | Google Gemini API |
| Real-time | WebSocket (ws) |

## 📝 Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vedaai
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_key_here
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws
```