import json
import os
from typing import Annotated, List, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field, field_validator

load_dotenv()

MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash")
API_KEY = os.getenv("GOOGLE_API_KEY")
MAX_HISTORY_MESSAGES = 6


def extract_text(content: object) -> str:
    """Return visible text only, excluding provider content-block metadata."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block.get("text", "") if isinstance(block, dict) and block.get("type") == "text"
            else block if isinstance(block, str) else ""
            for block in content
        )
    return str(content)


class RecommendedBook(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    author: str = Field(min_length=1, max_length=100)
    summary: str = Field(min_length=40, max_length=500)
    genre: str = Field(min_length=1, max_length=40)
    vibe: str = Field(min_length=1, max_length=40)

    @field_validator("summary")
    @classmethod
    def summary_has_compact_length(cls, value: str) -> str:
        word_count = len(value.split())
        if not 40 <= word_count <= 60:
            raise ValueError("Book summaries must contain 40–60 words.")
        return value


class RecommendationPayload(BaseModel):
    books: list[RecommendedBook] = Field(min_length=3, max_length=3)


BOOK_RECOMMENDATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are Bryaxis, a precise book recommender. Return ONLY valid JSON—no markdown, prose outside JSON, or code fences.

Schema:
{{"books":[{{"title":"","author":"","summary":"","genre":"","vibe":""}}]}}

Rules: Return exactly 3 distinct, real published books unless the user explicitly asks for another count. Each summary is 40–60 words. genre and vibe are 1–4 words. Do not include ratings, covers, URLs, introductions, conclusions, or filler. Use the recent context to avoid repeating listed titles."""),
    ("human", """Recent context:
{history}

Request: {input}"""),
])


class BookState(TypedDict):
    messages: Annotated[List, add_messages]


def build_llm() -> ChatGoogleGenerativeAI:
    if not API_KEY:
        raise RuntimeError("Missing GOOGLE_API_KEY in the backend environment.")
    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        google_api_key=API_KEY,
        thinking_level="low",
        max_output_tokens=850,
        max_retries=0,
        response_mime_type="application/json",
    )


def _recent_history(messages: list) -> str:
    compact_messages = messages[:-1][-MAX_HISTORY_MESSAGES:]
    parts = []
    for message in compact_messages:
        if isinstance(message, HumanMessage):
            parts.append(f"User: {extract_text(message.content)[:500]}")
        elif isinstance(message, AIMessage):
            parts.append(f"Prior picks: {extract_text(message.content)[:500]}")
    return "\n".join(parts) or "None."


def recommend_book_node(state: BookState) -> BookState:
    messages = state["messages"]
    human_messages = [message for message in messages if isinstance(message, HumanMessage)]
    latest_input = extract_text(human_messages[-1].content) if human_messages else ""
    prompt = BOOK_RECOMMENDATION_PROMPT.invoke({
        "history": _recent_history(messages),
        "input": latest_input[:1000],
    })
    response = build_llm().invoke(prompt)
    raw_json = extract_text(response.content).strip()
    payload = RecommendationPayload.model_validate(json.loads(raw_json))
    titles = [book.title.casefold() for book in payload.books]
    if len(titles) != len(set(titles)):
        raise ValueError("Gemini returned duplicate book titles.")
    return {"messages": [AIMessage(content=payload.model_dump_json())]}


workflow = StateGraph(BookState)
workflow.add_node("recommend", recommend_book_node)
workflow.set_entry_point("recommend")
workflow.add_edge("recommend", END)
book_recommendation_graph = workflow.compile()
