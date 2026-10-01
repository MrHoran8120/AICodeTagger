# AI Code Tagger

A VS Code extension for classrooms that lets students tag AI-generated code the moment they paste it in, and keeps a log the teacher can review later.

## Why

Tagged AI code earns no credit for complexity, though integration and explanation can still be rewarded. Untagged code is assumed to be the student's own work, checked by questioning rather than an AI detector. Tagging takes a few seconds: select the pasted code, run one command, fill in a short form.

## What it does

- Wraps a selection of AI-generated code in `AI-START` / `AI-END` comments, matched to the file's language (`//`, `#`, `--`, `<!-- -->`, or `/* */`).
- Logs one row per tagged block — student name, AI engine, prompt, description, file, timestamp — to `ai-log.csv` in the project root.
- Lets students edit or remove a tag later, and validate that every tag in the code matches a row in the CSV (and vice versa).

## Get started

- **Installing the extension** — see `INSTALL.md`, for teachers setting it up or students installing it themselves.
- **Using the extension** — see `USER_GUIDE.md` for the day-to-day workflow: tagging, editing, removing, and validating tags.

## Scope

Version 1 only produces the tags and the `ai-log.csv` register — there's no teacher-side triage, marking, or stripping tool. The teacher uses the register however they choose.
