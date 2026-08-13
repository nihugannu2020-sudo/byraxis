import logging
import os
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel, Field

from graph import book_recommendation_graph, extract_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Bryaxis API")
frontend_origins = os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in frontend_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)


class ChatResponse(BaseModel):
    reply: str
    recommendations: list[object] = Field(default_factory=list)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    messages = [
        HumanMessage(content=message.content) if message.role == "user" else AIMessage(content=message.content)
        for message in request.messages
    ]
    if not isinstance(messages[-1], HumanMessage):
        raise HTTPException(status_code=422, detail="The last message must be from the user.")
    try:
        result = book_recommendation_graph.invoke({"messages": messages})
        reply = extract_text(result["messages"][-1].content).strip()
        if not reply:
            raise RuntimeError("The model returned no visible text.")
        return ChatResponse(reply=reply)
    except HTTPException:
        raise
    except Exception as error:
        logger.exception("Book recommendation request failed")
        if "RESOURCE_EXHAUSTED" in str(error) or "429" in str(error):
            raise HTTPException(
                status_code=429,
                detail="Bryaxis has reached the Gemini request limit. Please try again in a minute.",
            )
        raise HTTPException(status_code=503, detail="Bryaxis is temporarily unavailable.")
