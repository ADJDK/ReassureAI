
import os
import json

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from openai import OpenAI

# Load environment variables
load_dotenv()

# OpenRouter configuration
API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "nvidia/nemotron-3-ultra-550b-a55b:free"
)

# FastAPI application
app = FastAPI(title="ReassureAI Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter client
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY or "missing-api-key"
)


# Request model
class GenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    situation: str = Field(min_length=1, max_length=5000)
    format: str = "mixed"
    tone: str = "Affectionate"
    language: str = "English"
    length: str = "Medium"
    emoji: str = "Minimal"
    capitalization: str = "normal"

    message_count: int = Field(
        default=3,
        alias="messageCount",
        ge=1,
        le=10
    )

    writing_style: str = Field(
        default="Natural",
        alias="writingStyle"
    )

    additional_preferences: str = Field(
        default="",
        alias="additionalPreferences"
    )

    writing_sample: str = Field(
        default="",
        alias="writingSample"
    )

    selected_preset: str = Field(
        default="",
        alias="selectedPreset"
    )


# Routes
@app.get("/")
def home():
    return {"message": "ReassureAI Backend is running!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# Build AI prompt
def build_prompt(request: GenerateRequest, correction=""):

    format_instructions = {
        "mixed": (
            "Alternate between short messages and paragraphs. "
            "Start with a short message, then a paragraph, "
            "then a short message, continuing this pattern."
        ),
        "separate": (
            "Every message must be a separate short message. "
            "Do not generate paragraphs."
        ),
        "paragraph": (
            "Every message must be a complete, natural paragraph."
        ),
        "custom": (
            "Use a natural mixture of short messages and paragraphs."
        )
    }

    format_instruction = format_instructions.get(
        request.format.lower(),
        format_instructions["mixed"]
    )

    prompt = f"""
You are ReassureAI, an intelligent relationship communication assistant.

Your job is to write PERSONALIZED messages based on the user's
actual situation.

USER'S SITUATION:
{request.situation}

USER'S PREFERENCES:
Preset: {request.selected_preset}
Tone: {request.tone}
Language: {request.language}
Format: {request.format}
Length: {request.length}
Emoji preference: {request.emoji}
Capitalization: {request.capitalization}
Writing style: {request.writing_style}
Additional preferences: {request.additional_preferences}
Writing sample: {request.writing_sample}

STRICT GENERATION RULES:

1. EXACT COUNT:
Generate EXACTLY {request.message_count} messages.
Not more. Not fewer.
The messages array must contain exactly {request.message_count} objects.

2. SITUATION UNDERSTANDING:
Understand the user's situation before writing.
Every message must be relevant to the specific situation.
Address the actual issue, feelings, or concern described.
Do not produce generic relationship messages that could
be used for any unrelated situation.
Do not ignore important details from the situation.

3. VARIETY:
Create different, meaningful messages.
Avoid repeating the same idea in different words.
Do not use generic filler messages just to increase the count.
Each message should contribute something different.

4. NATURAL COMMUNICATION:
Sound like a real person texting their partner.
Avoid robotic, overly formal, dramatic, or artificial language.
Do not invent relationship facts or events.
Avoid manipulation, guilt-tripping, blame, and pressure.
Respect the other person's feelings and boundaries.

5. FORMAT:
{format_instruction}

6. LANGUAGE:
Write entirely in the requested language: {request.language}.
If Tanglish is requested, use natural Tamil-English conversation.
Do not randomly switch languages.

7. LENGTH:
Follow the requested length: {request.length}.
Short messages should be concise.
Paragraphs should have enough detail without unnecessary repetition.

8. STYLE:
Follow the capitalization preference.
Follow the emoji preference.
Use the writing sample as a style reference when provided,
without copying it word for word.

FINAL CHECK BEFORE RESPONDING:
- Count the objects in the messages array.
- Confirm there are exactly {request.message_count}.
- Confirm every message addresses the user's situation.
- Confirm there are no duplicate or repetitive messages.
- Confirm the requested format is followed.

Return ONLY valid JSON in this structure:

{{
    "messages": [
        {{
            "type": "short",
            "text": "Your message here"
        }}
    ]
}}

The example above illustrates the structure only.
You must return exactly {request.message_count} messages.
"""

    if correction:
        prompt += f"""

IMPORTANT CORRECTION:
Your previous response was invalid.

{correction}

Generate the complete corrected JSON response now.
"""

    return prompt


# Validate AI response
def validate_response(data, request):

    if not isinstance(data, dict):
        raise ValueError("Response must be a JSON object.")

    messages = data.get("messages")

    if not isinstance(messages, list):
        raise ValueError("Messages must be a list.")

    expected_count = request.message_count
    actual_count = len(messages)

    if actual_count != expected_count:
        raise ValueError(
            f"Expected exactly {expected_count} messages, "
            f"but received {actual_count}."
        )

    allowed_types = {"short", "paragraph"}

    for index, message in enumerate(messages):

        if not isinstance(message, dict):
            raise ValueError(f"Message {index + 1} is invalid.")

        message_type = message.get("type")
        message_text = message.get("text")

        if message_type not in allowed_types:
            raise ValueError(
                f"Message {index + 1} has an invalid type."
            )

        if not isinstance(message_text, str) or not message_text.strip():
            raise ValueError(
                f"Message {index + 1} has empty text."
            )

        message["text"] = message_text.strip()

        # Enforce the selected format
        selected_format = request.format.lower()

        if selected_format == "separate":
            message["type"] = "short"

        elif selected_format == "paragraph":
            message["type"] = "paragraph"

        elif selected_format == "mixed":
            expected_type = (
                "short" if index % 2 == 0 else "paragraph"
            )

            if message_type != expected_type:
                raise ValueError(
                    f"Message {index + 1} must be "
                    f"of type {expected_type}."
                )

    return {"messages": messages}


# Main generation endpoint
@app.post("/api/generate")
def generate_messages(request: GenerateRequest):

    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenRouter API key is missing from .env"
        )

    correction = ""

    # Try twice: first generation + one correction attempt
    for attempt in range(2):

        try:
            prompt = build_prompt(request, correction)

            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are ReassureAI. You write highly "
                            "personalized relationship messages. "
                            "Follow instructions exactly and return "
                            "valid JSON only."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.95,
                max_tokens=2000
            )

            result = response.choices[0].message.content

            if not result:
                raise ValueError("AI returned an empty response.")

            data = json.loads(result)

            # Validate exact count, format and message content
            validated_data = validate_response(data, request)

            print(
                f"Generated {len(validated_data['messages'])} "
                f"messages successfully."
            )

            return validated_data

        except Exception as error:

            print(
                f"Generation attempt {attempt + 1} failed:",
                str(error)
            )

            correction = str(error)

    raise HTTPException(
        status_code=502,
        detail=(
            "AI could not generate the requested number of "
            "valid messages. Please try again."
        )
    )
