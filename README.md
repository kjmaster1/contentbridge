# ContentBridge

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)
![Celery](https://img.shields.io/badge/Celery-Distributed_Task_Queue-37814A?logo=celery)
![Redis](https://img.shields.io/badge/Redis-Pub%2FSub-DC382D?logo=redis)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

ContentBridge is a unified, read-only analytics platform designed for content creators. It seamlessly integrates with external platforms (YouTube, Twitch) via OAuth2 to aggregate time-series engagement data, audience growth metrics, and top-performing content into a single, clean dashboard.

## Key Features
* **Unified Dashboard:** View aggregated cross-platform metrics (Total Audience, Lifetime Views, Engagement Rates) in one place.
* **Historical Growth Tracking:** Visualize audience growth over time with interactive, responsive charts.
* **Top Content Ranking:** Automatically ranks historical content by engagement and viewership.
* **Asynchronous Synchronization:** Deep historical data fetches run in the background without blocking the user interface.
* **Real-time Notifications:** Users are notified via WebSockets the moment background synchronization tasks complete.

---

## System Architecture & Tech Stack

ContentBridge was built with a strong focus on separation of concerns, scalability, and non-blocking I/O.

### Frontend (Client-Side)
* **React + TypeScript + Vite:** Component-driven UI ensuring strict type safety and modularity.
* **Tailwind CSS:** Utility-first styling for a highly responsive, modern glassmorphism design.
* **Recharts:** High-performance SVG charting for time-series data.
* **Custom Hooks:** Business logic (API fetching, WebSocket management) is abstracted away from UI components into custom React Hooks (`useDashboardData`, `useWebSocket`).

### Backend (API Layer)
* **FastAPI:** High-performance asynchronous API framework handling routing, OAuth2 callbacks, and WebSocket connections.
* **SQLAlchemy (Alembic):** ORM managing relational data models (Creators, Connections, Snapshots, Content).
* **Strategy Pattern (OOP):** Platform integrations (YouTube, Twitch) inherit from an abstract `BasePlatform` class, making the addition of future platforms (TikTok, Instagram) seamless and predictable.
* **Asynchronous I/O:** Third-party API calls utilize `httpx.AsyncClient` with safeguarded pagination loops to ensure the FastAPI event loop is never blocked.

### Background Processing (Worker Layer)
* **Celery & Redis:** Long-running tasks (like fetching a creator's entire video history) are offloaded to distributed Celery workers.
* **Event-Driven WebSockets:** When a Celery worker finishes syncing data, it publishes a message to a Redis Pub/Sub channel. The FastAPI server listens to this channel and pushes a real-time WebSocket notification to the connected client.

---

## Getting Started (Docker)

The entire stack is containerized for an effortless developer experience.

### Prerequisites
1. **Docker & Docker Compose** installed on your machine.
2. OAuth2 Developer Credentials for YouTube (Google Cloud Console) and Twitch (Twitch Developer Console).

### 1. Environment Configuration

You will need to configure environment variables for both the backend and the frontend.

**Backend Configuration:**
Create a `.env` file in the `backend/` directory:

```env
# backend/.env

# --- Security ---
# Generate a random string for this (e.g., openssl rand -hex 32)
SECRET_KEY=your_secret_jwt_signing_key_here

# --- Database & Redis ---
# Default SQLite for local dev, or swap to PostgreSQL
DATABASE_URL=sqlite:///./contentbridge.db
REDIS_URL=redis://redis:6379/0

# --- Frontend ---
FRONTEND_URL=http://localhost:5173

# --- YouTube OAuth ---
GOOGLE_CLIENT_ID=your_youtube_client_id
GOOGLE_CLIENT_SECRET=your_youtube_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/youtube/callback

# --- Twitch OAuth ---
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
TWITCH_REDIRECT_URI=http://localhost:8000/auth/twitch/callback
```

**Frontend Configuration:**
Create a `.env` file in the `frontend/` directory:

```env
# frontend/.env

# The URL of your FastAPI backend
VITE_API_URL=http://localhost:8000

# The URL of your FastAPI backend WebSocket connection
VITE_WS_URL=ws://localhost:8000/ws
```

### 2. Run the Stack
Navigate to the root directory of the project and run:

```bash
docker compose up --build
```

This single command will:
1. Spin up a **Redis** container.
2. Build and start the **FastAPI Backend** (available at `http://localhost:8000`).
3. Build and start the **Celery Worker** to process background syncs.
4. Build and start the **Vite React Frontend** (available at `http://localhost:5173`).

---

## Roadmap & Future Improvements

While ContentBridge is fully functional, software is never truly finished. If this project were scaled for production, the following architectural improvements would be prioritized:

1. **WebSocket Security Enhancement (Ticket System):** 
   * *Current State:* WebSockets are authenticated via a JWT passed as a query parameter.
   * *Improvement:* Migrate to a Redis-backed "ticket" system. The frontend will request a short-lived, single-use ticket via a secure HTTP POST request and use that ticket to establish the WebSocket connection. This prevents long-lived JWTs from appearing in reverse proxy (Nginx/Traefik) access logs.
2. **Comprehensive Automated Testing:**
    * Implement `pytest` for the backend API and Celery tasks, specifically mocking the `httpx` platform services to test third-party data normalization without making live network requests.
    * Implement `Vitest` and `React Testing Library` for frontend component snapshot and behavior testing.
3. **Expand Platform Integrations:**
    * Finalize the `TikTokPlatform` service class and implement Instagram Graph API integrations utilizing the existing abstract `BasePlatform` architecture.

---

## Contributing

As this is currently a personal portfolio project, direct pull requests are not actively being merged. However, technical feedback, code reviews, and architectural discussions are highly welcomed! Feel free to open an issue if you spot a bug or have a suggestion for optimization.

## License

This project is open-source and available under the **MIT License**.
