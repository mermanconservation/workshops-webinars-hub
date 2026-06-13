# Plan: course platform — completion, imports, previews, image upload, quizzes

## 1. Lesson completion indicators + manual toggle
Already present in `CourseDetail.tsx`: each lesson row shows a `CheckCircle2`/`Circle` button that toggles completion via `markCourseLessonComplete`/`unmarkLessonComplete`, scoped to the entered email, with a progress bar and counter. No further code change needed; will polish wording ("Mark complete / Mark incomplete" tooltip + an explicit caption above the list explaining "Completion is saved per email — load your progress to resume").

## 2. JSON import validation (courses + single lesson)
- Add `zod` schemas: `CourseExportSchema` (version `"1.0"`, course block + lessons array + materials), `LessonImportSchema`.
- Add a `schemaVersion` field to **exports** going forward (default `"1.0"`).
- On import in `AdminPanel.tsx`:
  - Parse JSON, run `safeParse`, surface field-by-field error list in a destructive toast (first 3 issues + count).
  - Reject if `schemaVersion` missing or major mismatch; allow `1.x`.
  - Show a confirm dialog summarising "X lessons, Y materials — proceed?" before writing.
- Existing data is never overwritten silently: imports always **create new** rows (current behaviour) — confirmed.

## 3. Course-level materials preview UI (CourseDetail.tsx)
Replace the plain link rows with a card grid:
- **Images** (`type.startsWith('image')`): show `<img>` thumbnail (object-cover, 16:9), click → lightbox dialog.
- **PDFs**: show first-page thumbnail rendered with `pdfjs-dist` (`getDocument` → page 1 → canvas → dataURL, cached in component state). Click → modal containing a `<iframe src={url}#toolbar=1>` for native multi-page navigation.
- **Other** (docs, slides): existing icon card.
- Each card has a "Download" button (direct link with `download` attribute) alongside "Preview".

## 4. Lesson editor image upload with caption + auto-resize
Extend `src/components/RichTextEditor.tsx`:
- New toolbar button "Upload image" → hidden file input.
- Client-side resize via canvas: max 1600px on the longest edge, JPEG quality 0.85 (PNG kept for transparency).
- Upload through existing `uploadFile(file, 'lesson-images')` helper → returns public URL.
- Insert as `<figure><img src=...><figcaption>…</figcaption></figure>` (Tiptap Image extension + a lightweight `Figure` node via `Node.create` so captions are editable inline).
- Existing URL-image button retained.

## 5. Quizzes & exams
### DB (one migration)
- `course_quizzes` (course_id FK, lesson_id FK NULLABLE, kind `'lesson'|'final'`, title, pass_score int default 70, questions jsonb, created_at, updated_at).
- `quiz_attempts` (quiz_id FK, email lowercase, score int, passed bool, answers jsonb, created_at). Index `(quiz_id, email, created_at desc)`.
- Permissive public RLS read on quizzes (mirroring courses); inserts to attempts allowed for anyone (anon select+insert on attempts — needed for the cooldown check).
- GRANTs to `anon`, `authenticated`, `service_role`.

### Question payload (jsonb)
```json
[
  { "id": "q1", "type": "single", "prompt": "…", "options": ["a","b"], "answer": 0, "points": 1 },
  { "id": "q2", "type": "multiple", "prompt": "…", "options": ["a","b","c"], "answer": [0,2], "points": 2 },
  { "id": "q3", "type": "truefalse", "prompt": "…", "answer": true, "points": 1 },
  { "id": "q4", "type": "short", "prompt": "…", "answer": "Photosynthesis", "points": 1, "caseSensitive": false }
]
```

### Admin UI (`CoursesTab` → expanded course)
- New "Quizzes" sub-section listing existing quizzes (lesson-level grouped under each lesson + one "Final exam" slot).
- "Add quiz" form: kind (lesson dropdown of lessons or final exam), title, pass score, then dynamic question editor (add/remove/reorder, type selector, options for choice types, mark correct, points).
- Edit / delete via `adminRequest` against `course_quizzes`.

### Learner UI
- `CourseLesson.tsx`: after lesson content, if a `lesson` quiz exists → "Knowledge check" panel; ungraded but score shown; doesn't gate Next.
- `CourseDetail.tsx`: when all lessons complete, before the certificate block:
  - If a `final` quiz exists, show "Final exam — required to unlock certificate".
  - Render quiz; on submit compute score; insert `quiz_attempts` row.
  - **Pass (score ≥ pass_score)** → certificate block enabled.
  - **Fail** → block exam for 24h (query latest failed attempt by email, compute remaining time, show countdown). Client-side enforcement only (acceptable for this app's threat model; matches existing "permissive RLS" pattern).
- Certificate generation unchanged; only the gate changes.

### Files touched
- New: `src/components/QuizEditor.tsx`, `src/components/QuizRunner.tsx`, `src/lib/quiz.ts` (scoring + cooldown helpers + zod schemas).
- Edited: `src/pages/AdminPanel.tsx` (quiz section in course expander, import validation), `src/pages/CourseDetail.tsx` (preview UI + final-exam gate), `src/pages/CourseLesson.tsx` (lesson knowledge check), `src/components/RichTextEditor.tsx` (image upload), `src/lib/api.ts` (quiz read helpers).
- New migration: `course_quizzes`, `quiz_attempts` with GRANTs + RLS.
- Dependency adds: `zod` (likely already present), `pdfjs-dist`.

## Out of scope (will not be built unless asked)
- Server-side cooldown enforcement (client-side only, in line with rest of app).
- Question banks / randomisation.
- Per-question explanations or images inside quizzes (text-only prompts for now).
- Drag reorder for questions (up/down buttons, matching existing pattern).
- Backwards-conversion of older JSON exports without `schemaVersion`: import will refuse and the user re-exports.
