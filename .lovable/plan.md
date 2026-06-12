## Scope

Major upgrade to the Courses platform: rich lesson editor, per-lesson pages, JSON import/export, improved material management, and verification tightening.

## 1. Course-level materials (Admin)

In `AdminPanel.tsx` courses tab:
- Accept all file types (`image/*`, `application/pdf`, `.ppt,.pptx,.key,.odp`, plus docs). Show icon per type (Image, FileText for PDF, Presentation for slides, File fallback).
- Each material row: Up/Down arrows, **Edit title** (inline input toggle), **Delete** button. Order persisted to `materials` JSONB array order.
- Same controls already exist for lesson materials — unify component `<MaterialList>` and reuse.

## 2. Rich lesson visual editor

- Add `@tiptap/react` + starter-kit + extensions (link, image, underline, list, heading, code-block, placeholder).
- Replace lesson `description` textarea with a Tiptap WYSIWYG toolbar (H1/H2/H3, bold, italic, underline, bullet list, ordered list, link, image-by-URL, quote, code, undo/redo).
- Store HTML in existing `description` column (already TEXT). Render via `dangerouslySetInnerHTML` with `prose` Tailwind class on public page.

## 3. JSON lesson + course export/import

- New "Import JSON Lesson" button in admin course expander: paste JSON `{title, description, video_url, materials[]}` → inserts a lesson at next `order_index`.
- New "Export Course JSON" button: downloads `{course, lessons[]}` as `.json` file (browser blob).
- New "Import Course JSON" button on courses tab: creates course + lessons in one go (uses edge function admin insert).

## 4. Per-lesson full page

- New route `/course/:courseId/lesson/:lessonIndex` → page `CourseLesson.tsx`.
- Shows single lesson at full width: video, rich-HTML body, materials, prev/next buttons.
- "Next lesson" button **auto-marks current lesson complete** (if email known) before navigating.
- Manual "Mark complete" toggle still available.
- On `CourseDetail.tsx`, lesson list links to per-lesson pages; final lesson "Next" routes back to course page with certificate ready.

## 5. Certificate verification consistency

- Course completion certificate already saves a `certificate_verifications` row — confirm `verifyCertificate` reads it. Add UI link in completion banner: "Your certificate code: CR-XXXX". Verification page already exists at `/verify`.
- Ensure QR on PDF links to `/verify?code=...` (already does via certificate.ts) — verified.

## Technical details

- New file: `src/components/RichTextEditor.tsx` (Tiptap wrapper with toolbar).
- New file: `src/components/MaterialManager.tsx` (shared up/down/edit/delete list).
- New file: `src/pages/CourseLesson.tsx` + route in `App.tsx`.
- Edits: `AdminPanel.tsx`, `CourseDetail.tsx`, `api.ts` (helpers for course lesson update).
- Dependencies: `@tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-underline @tiptap/extension-placeholder`.
- No DB migrations needed — `description` (text), `materials` (jsonb), `order_index` (int) already exist.
- Auto-complete on Next: calls `markCourseLessonComplete` silently if not already completed; failure non-blocking.

## Out of scope

- Drag-and-drop reorder (keeping up/down per existing project pattern).
- Lesson-level rich-editor migration of *existing* plain-text descriptions (they'll render as plain text inside prose container, still fine).
