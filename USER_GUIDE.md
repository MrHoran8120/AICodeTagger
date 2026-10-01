# Using AI Code Tagger

## Tagging AI-generated code

1. Select the pasted AI-generated code in the editor.
2. Run **Tag AI Code** — right-click the selection and choose it from the context menu, or open the Command Palette (`Ctrl+Shift+P`) and search for it. You can assign your own keyboard shortcut for it under File → Preferences → Keyboard Shortcuts if you want one.
3. Fill in the form:

   | Field | Notes |
   | --- | --- |
   | Student name | Pre-filled if your teacher set it up; otherwise type it in. |
   | AI engine | Pick from ChatGPT, Claude, Copilot, Gemini, or Other (type a custom name). |
   | Prompt | The prompt you used to generate the code. |
   | Description | A short note on what the code does. |

   Pressing `Esc` at any step cancels the whole thing — nothing is inserted and nothing is logged.
4. The extension wraps your selection in a comment pair carrying a tag number, such as `AI-1001`:

   ```python
   # AI-START AI-1001
   def rotate_slide(index, direction):
       ...
   # AI-END AI-1001
   ```

   Tag numbers always go up (`AI-1001`, `AI-1002`, ...) and never repeat.
5. A row is appended to `ai-log.csv` in the project root (created automatically if it doesn't exist yet), recording the tag, your details, and which file it's in.

Tagged blocks get a subtle highlight in the editor so you can see at a glance what's AI-generated.

### When tagging is refused

- **No selection** — select the code first.
- **Unsupported file type** — JSON, plain text, Markdown, and similar files can't be tagged, since a comment there could break the file or wouldn't be recognised as one.
- **Overlapping an existing tag** — you can't tag a selection that overlaps a block that's already tagged (no nested tags).

### Supported languages

| Comment style | Languages |
| --- | --- |
| `//` | JavaScript, TypeScript, Java, C, C++, C#, PHP, Go, Swift, Kotlin, Rust |
| `#` | Python, Ruby, shell scripts |
| `--` | SQL |
| `<!-- -->` | HTML, XML |
| `/* */` | CSS |

## Editing a tag

Put your cursor inside a tagged block and run **Edit AI Tag** (or run it from the Command Palette and pick the tag from a list). The same form reopens, pre-filled with what you entered before — update any field and it rewrites that row in `ai-log.csv`. The comments in your code and the tag number itself don't change.

## Removing a tag

Put your cursor inside a tagged block (or pick it from the Command Palette list) and run **Remove AI Tag**. After you confirm, both comments are removed and the matching row is deleted from `ai-log.csv`. The code itself is left untouched — only the wrapper comments go.

## Validating tags

Run **Validate AI Tags** from the Command Palette. It checks the whole project and reports:

- any `AI-START` without a matching `AI-END` (or vice versa),
- any tag in your code that has no row in `ai-log.csv`,
- any row in `ai-log.csv` that has no matching tag in the code.

Results appear in the **"AI Tagger"** output channel (View → Output, then select "AI Tagger" from the dropdown). If everything's consistent, it just says "All AI tags are valid."

## Notes and limits

- The prompt field is a single-line input box — keep it brief, or jot a short summary rather than pasting the full prompt text.
- Line numbers aren't recorded in `ai-log.csv` — only the tag, your details, the file, and a timestamp. The tag itself (e.g. `AI-1001`) is what uniquely identifies a block; use it to find things, not line position.
- `ai-log.csv` is a plain CSV file — it opens fine in Excel or any text editor, and sits in your repo alongside your commit history.
