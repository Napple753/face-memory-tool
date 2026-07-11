"""
Final single-file HTML export.

Responsibilities (to implement):
- Load output-template/template.html and output-template/quiz.js
- Embed:
    - merged image as base64
    - member data (id, display/answer text, division, position/crop info,
      in-photo vs bottom-grid flag)
- Inline quiz.js content directly into the output HTML (no external <script src>)
- Return the completed HTML as a downloadable file to the frontend.
"""
