// Quiz + browse logic for the final deliverable HTML.
// Gets inlined into template.html by html_generator.py at export time.
//
// To implement:
// - Mode A: render MEMBER_DATA onto the image (hover popups), text search
//   that highlights matching face/thumbnail.
// - Mode B: division checkboxes (+ select all) -> build quiz pool ->
//   show one face crop at a time -> reveal answer -> remembered/forgot ->
//   "forgot" re-enters the pool, shuffled, not shown next immediately ->
//   loop until pool empty -> completion screen -> restart.
// - No progress persistence (resets on reload), per spec.
