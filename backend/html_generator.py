"""
Final single-file HTML export.

Responsibilities:
- Load output-template/template.html and output-template/quiz.js
- Embed:
    - merged image as base64
    - member data (id, display/answer text, division, position/crop info,
      in-photo vs bottom-grid flag)
- Inline quiz.js content directly into the output HTML (no external <script src>)
- Return the completed HTML as a downloadable file to the frontend.
"""

import html
import json
import os

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "output-template")


def _no_script_close(payload: str) -> str:
    # Defensive: user-supplied text (names, quiz answers) could contain a
    # literal "</script>" and break out of the inline <script> block.
    return payload.replace("</", "<\\/")


def generate_html(title: str, composite_image_data_url: str, image_width: int, image_height: int, members: list[dict]) -> str:
    with open(os.path.join(TEMPLATE_DIR, "template.html"), "r", encoding="utf-8") as f:
        page = f.read()
    with open(os.path.join(TEMPLATE_DIR, "quiz.js"), "r", encoding="utf-8") as f:
        quiz_js = f.read()

    page = page.replace("__TITLE__", html.escape(title or "Face Memory"))
    page = page.replace("__IMAGE_DATA_URL__", composite_image_data_url)
    page = page.replace("__IMAGE_WIDTH__", json.dumps(image_width))
    page = page.replace("__IMAGE_HEIGHT__", json.dumps(image_height))
    page = page.replace("__MEMBER_DATA_JSON__", _no_script_close(json.dumps(members)))
    page = page.replace("__QUIZ_JS__", quiz_js)
    return page
