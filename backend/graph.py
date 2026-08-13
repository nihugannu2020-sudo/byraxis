import os
from typing import Annotated, List, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

load_dotenv()

MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3.5-flash")
API_KEY = os.getenv("GOOGLE_API_KEY")


def extract_text(content: object) -> str:
    """Return visible text only, excluding provider content-block metadata."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text", "")
                if isinstance(text, str):
                    text_parts.append(text)
            elif isinstance(block, str):
                text_parts.append(block)
        return "".join(text_parts)
    return str(content)


BOOK_RECOMMENDATION_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """
You are Bryaxis, an expert and highly personalized book recommendation assistant.

Your PRIMARY JOB is to recommend REAL BOOKS that match what the reader is asking for.

IMPORTANT RULES:
1. When the user asks for book recommendations, provide 3-5 actual book recommendations.
2. Every recommendation must contain a book title, author, why it matches, and a short vibe/genre description.
3. Use the conversation history, including follow-ups such as "give me another one", "something darker", or "more like that".
4. Do not repeatedly recommend exact same books within a conversation unless specifically asked.
5. Prefer real, published books and real authors. Never invent a title or author.
6. If a request is extremely vague, ask one short clarification question; otherwise recommend books immediately.
7. Be warm, friendly, and slightly playful, but prioritize useful recommendations.
8. Match genre, mood, themes, reading difficulty, pace, atmosphere, favorite authors/books, tropes, and requested characters or creatures.

For recommendations, use this format:
📚 Here are some picks for you:

1. **Book Title** — Author
   - Why: Explain briefly why this book matches the user's request.
   - Vibe: Describe the mood/genre/atmosphere.

Provide 3, 4, or 5 picks as appropriate, then finish with one short follow-up question.
"""),
    ("human", """CONVERSATION HISTORY:
{history}

LATEST USER MESSAGE:
{input}

Use BOTH the conversation history and the latest user message to produce the most relevant response."""),
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
        max_output_tokens=4096,
        max_retries=0,
    )


def recommend_book_node(state: BookState) -> BookState:
    messages = state["messages"]
    human_messages = [message for message in messages if isinstance(message, HumanMessage)]
    latest_input = extract_text(human_messages[-1].content) if human_messages else ""
    history_parts = []
    for message in messages[:-1]:
        if isinstance(message, HumanMessage):
            history_parts.append(f"User: {extract_text(message.content)}")
        elif isinstance(message, AIMessage):
            history_parts.append(f"Bryaxis: {extract_text(message.content)}")
    history = "\n".join(history_parts) or "No previous conversation."
    prompt = BOOK_RECOMMENDATION_PROMPT.invoke({"history": history, "input": latest_input})
    response = build_llm().invoke(prompt)
    clean_response = extract_text(response.content).strip()
    if not clean_response:
        clean_response = "I couldn't generate a recommendation right now. Please try again."
    return {"messages": [AIMessage(content=clean_response)]}


workflow = StateGraph(BookState)
workflow.add_node("recommend", recommend_book_node)
workflow.set_entry_point("recommend")
workflow.add_edge("recommend", END)
book_recommendation_graph = workflow.compile()
