"""
Final image composition.

Responsibilities (to implement):
- Given the group photo + list of missing members (with photos or none),
  build a bottom grid of thumbnails, sized to match in-photo face crops.
- Auto-fit row count based on how many are missing; expose the computed
  layout to the frontend for a check/adjust step before finalizing.
- Placeholder thumbnail (gray box + initials/name) for members with no photo.
- Merge group photo + bottom grid into a single final image (in-memory,
  passed to html_generator.py -- not written to disk as a separate file).
"""
