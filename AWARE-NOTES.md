# AWARE research preview

## Access

This is a private functional test site, not an approved production research deployment.
The shared login supports the three requested student test profiles (`lb`, `gy`, `zf`) and the `Nicole` teacher profile. Password verification is server-side using salted PBKDF2 hashes. Session cookies are HttpOnly and student/teacher permissions are checked on every API request.

## Student workspace

- Source A and Source B are two reading texts assigned by the teacher.
- New writing sessions snapshot their source texts, task instructions, and interaction condition. Later teacher edits do not change an in-progress session.
- Drafts are autosaved to the database, with conflict detection for concurrent edits.
- Ask AI requires selected text in the writing editor. Appraisal-aware and generic self-monitoring profiles complete their checkpoint first; the direct profile opens EdUHK GenAI directly.
- Font family and size controls apply to selected text or subsequent typing. Saved drafts retain the five supported families and seven sizes; unsupported HTML attributes are removed server-side.
- Both checkpoints allow Return to writing or Continue to AI.
- EdUHK GenAI opens separately at https://genai.eduhk.hk/. Text is not automatically sent or copied.

## Teacher workspace

- Create/edit paired reading materials and task instructions.
- Assign a source set and interaction condition to each test student.
- Review saved writing, saved versions, checkpoint answers, Ask AI clicks, and external AI handoff events.
- Export a session's data as JSON.
- Teachers can review all study profiles; student endpoints return only that student's records and assignment.

## Research boundaries

The initial learning-analytics texts are marked demonstration excerpts, not the approximately 700-word study sources required by V16. Replace them with the approved sources before a study.

External GenAI prompts, replies, and actual model usage cannot be observed by this site. An AI handoff is a click/navigation record, not proof of a completed AI interaction. The teacher interface explicitly states this. Embedded AI integration and formal research data governance are separate work.

## Local verification

Use the existing package scripts for development/build and Drizzle migrations for schema changes. `scripts/verify-platform.mjs` and `scripts/verify-teacher.mjs` target localhost only and receive test passwords via environment variables. Test database contents are local and are not packaged into deployment.

The original supplied logo is preserved in `public/aware-logo-source.png`; the Logo component clips the surrounding whitespace without stretching or redrawing the mark.
