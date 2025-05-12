"""
LLM (OpenAI GPT) Command Parser Module

Provides a function to parse natural language video editing commands using the OpenAI API.

- Uses environment variable OPENAI_API_KEY for authentication.
- Returns a structured command dict compatible with EditOperation/CompoundOperation.

"""
import os
from typing import Optional, Dict, Any
import openai
import logging

LOG_FILE = os.path.join(os.path.dirname(__file__), 'llm_parser.log')
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)

# Example system prompt for the LLM
SYSTEM_PROMPT = (
    "You are an expert video editing command parser. "
    "Given a user's natural language command, output a JSON object with: "
    "type (e.g., CUT, TRIM, JOIN, ADD_TEXT, etc.), target (clip name or None), and parameters (dict). "
    "If the command is compound, return a list of such objects. "
    "If the command is ambiguous, return type: 'UNKNOWN' and include the raw command."
)


def parse_command_with_llm(command_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse a natural language command using OpenAI GPT API.

    Args:
        command_text (str): The user's command.

    Returns:
        dict or None: Structured command dict, or None if parsing fails.
    """
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY environment variable not set.")
    openai.api_key = OPENAI_API_KEY
    prompt = (
        f"{SYSTEM_PROMPT}\n"
        f"User command: {command_text}\n"
        "Output JSON:"
    )
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"User command: {command_text}\nOutput JSON:"}
            ],
            temperature=0.0,
            max_tokens=256,
        )
        content = response["choices"][0]["message"]["content"].strip()
        import json
        try:
            # If the response is a code block, strip it
            if content.startswith("```") and content.endswith("```"):
                content = content.split("\n", 1)[-1].rsplit("```", 1)[0]
            result = json.loads(content)
            logging.info(f"LLM parsed command successfully: {result}")
            return result
        except Exception as json_err:
            logging.error(f"JSON decode error for LLM response: {content}\nError: {json_err}")
            return None
    except Exception as api_err:
        logging.error(f"OpenAI API error: {api_err}")
        return None
