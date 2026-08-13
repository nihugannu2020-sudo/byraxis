# Bryaxis

React/Vite is the user interface. FastAPI owns the API boundary, and the Python
LangGraph workflow is the only AI and recommendation workflow. No Kaggle book
dataset is used.

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and add `GOOGLE_API_KEY`.
2. Install and start the backend:

   ```bash
   cd backend
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   .venv/bin/uvicorn main:app --reload --port 8000
   ```

3. In another terminal, install and start the frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The frontend API URL defaults to `http://localhost:8000`; override it with
`frontend/.env` using `VITE_API_URL` if needed. The Gemini key must remain in
`backend/.env` only.

## API

- `GET /health` returns `{ "status": "ok" }`.
- `POST /chat` accepts a `messages` array with `user` and `assistant` roles,
  converts it to LangChain messages, and returns clean `{ "reply": "..." }` JSON.
