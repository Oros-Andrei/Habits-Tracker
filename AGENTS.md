# Instructions for future coding chats

Before working on this repository, read [KNOWLEDGE.md](KNOWLEDGE.md) for the application overview and data flow.

## User approval and change limits

- The user must approve every proposed change before any file is edited. First show the user the complete proposed change, including the code or a clear diff, and wait for explicit approval. Do not apply an unapproved change.
- After approval, make only the approved changes. Show the user every resulting change and the complete code diff.
- After any approved code edits, update `KNOWLEDGE.md` in the same task to document the code's changed behavior, structure, or data flow. This knowledge update is permitted as part of the approved code change.
- Add a concise code comment for each code change explaining why the change was made; keep each comment to no more than three lines.
- For new UI functionality, reuse existing components from `src/Components`—such as `Button`, `Dropdown`, `DatePicker`, and `TextBox`—when they fit. Extend a shared component if needed instead of introducing a native control or duplicate styling.
- For Cancel actions, use the shared `Button` component with the `Emoji.wiltedFlower` icon and the standard cancel styling.
- By default, only edits to existing application code under `src/` and `electron/` are permitted. Do not edit documentation, configuration, dependencies, generated output, assets, or other files unless the user specifically authorizes that scope.
- Do not stage, commit, or push Git changes. Do not create commits or push branches, even if asked as part of a broader implementation, unless the user explicitly changes this standing restriction.
- Do not make unrelated cleanup or formatting changes.
