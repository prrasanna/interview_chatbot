# 🤖 AI Intern Task Allocation & Review Automation System

A full-stack, production-oriented AI platform to manage internship programs end-to-end — task allocation, voice explanations, automated emails, review meetings, and feedback narration.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** >= 18
- **MongoDB** running locally or a MongoDB Atlas URI
- (Optional) **Google Gemini API key** for real AI responses

### 2. Backend Setup
```bash
cd backend
npm install
# Edit .env — at minimum set MONGODB_URI and JWT_SECRET
# Then seed the database with sample data:
npm run seed
# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api/health

---

## 🔑 Demo Login Credentials (after seeding)

| Role   | Email                   | Password      |
|--------|-------------------------|---------------|
| Admin  | admin@company.com       | Admin@1234    |
| Mentor | rajesh@company.com      | Mentor@1234   |
| Intern | aarav@intern.com        | Intern@1234   |

---

## ⚙️ Environment Variables (backend/.env)

| Variable               | Description                               | Default          |
|------------------------|-------------------------------------------|------------------|
| `MONGODB_URI`          | MongoDB connection string                 | localhost/intern |
| `JWT_SECRET`           | Strong random secret for JWT signing      | **CHANGE THIS**  |
| `GEMINI_API_KEY`       | Google Gemini AI API key (optional)       | mock mode        |
| `MOCK_EMAIL`           | `true` = log emails to console only       | true             |
| `MOCK_CALENDAR`        | `true` = skip Google Calendar API         | true             |
| `SMTP_HOST/USER/PASS`  | Real email settings (when MOCK_EMAIL=false) | —              |
| `FRONTEND_URL`         | Frontend origin for CORS                  | http://localhost:5173 |

---

## 🏗️ Architecture

```
chatbot/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Business logic (auth, interns, tasks, meetings, reviews, assistant, dashboard)
│   ├── jobs/            # node-cron scheduler (deadline reminders, overdue alerts)
│   ├── middleware/       # JWT auth, Multer upload
│   ├── models/          # 13 Mongoose models
│   ├── routes/          # Express route files
│   ├── scripts/         # seed.js
│   ├── services/        # Gemini AI, Nodemailer email, Google Calendar
│   ├── templates/       # HTML email templates
│   ├── utils/           # asyncHandler, CSV parser
│   └── server.js        # Express entry point
└── frontend/
    ├── src/
    │   ├── api/          # Axios instance with JWT interceptor
    │   ├── components/   # AppLayout, VoiceAssistant
    │   ├── context/      # AuthContext
    │   └── pages/        # Admin / Mentor / Intern dashboards
    └── vite.config.js    # Proxy to backend
```

---

## 🤖 AI Features

| Feature | How |
|---|---|
| **Task explanation (voice)** | Gemini generates human-readable explanation → browser TTS reads it aloud |
| **Voice Q&A assistant** | Web Speech API captures voice → Gemini answers in context of intern's tasks/meetings → TTS speaks response |
| **AI feedback narration** | Mentor enters raw notes → Gemini polishes them into clear, structured feedback |
| **Smart task recommendations** | Gemini analyses intern's history and suggests next tasks |

> 🔒 The Gemini API key **never** leaves the backend. All AI calls are server-side proxied.

---

## 📧 Mock Mode (default — no real credentials needed)

- `MOCK_EMAIL=true` — emails are logged to console instead of being sent
- `MOCK_CALENDAR=true` — calendar events are mocked
- No `GEMINI_API_KEY` — AI responses use human-written fallbacks

---

## 🎙️ Voice Assistant Usage (Intern role)
1. Log in as an intern
2. Click the **🎙️ floating button** (bottom right)
3. Ask: *"What task is assigned to me?"*, *"When is my deadline?"*, *"Explain my task step by step"*
4. The AI responds in text and **speaks it aloud** via browser TTS
5. Click **🎤** to use voice input (Chrome/Edge recommended)
