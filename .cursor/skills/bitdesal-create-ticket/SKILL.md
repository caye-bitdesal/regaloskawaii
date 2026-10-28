---
name: bitdesal-create-ticket
description: >-
  Drafts a well-structured GitHub issue from a short user description, asks
  clarifying questions for unknowns, then creates the issue with gh. Invoked
  via /bitdesal-create-ticket. Use when the user runs that command or asks to
  create a GitHub ticket/issue with a proper description.
disable-model-invocation: true
---

# /bitdesal-create-ticket

Turn a short description into a polished GitHub issue body, confirm with the
user, then create the issue via `gh`.

Invoke with: `/bitdesal-create-ticket` plus a quick description.

## Workflow

1. **Ingest** — Read the user's quick description. Infer type: `feature`, `bug`,
   or `chore` (default `feature` if unclear).
2. **Ask unknowns** — Before drafting, ask every missing question from the
   checklist below. Do not invent product decisions, acceptance criteria, or
   scope. Batch questions in one message. Skip only what the user already
   answered clearly.
3. **Draft** — Produce Title + Body in chat (copy/paste ready). Do **not** write
   files into the project.
4. **Confirm** — Show the draft and ask for approval / edits.
5. **Create** — After approval, run `gh issue create` (see Create step). Return
   the issue URL.

## Questions checklist

Ask only what is still unknown:

| Area | Ask when missing |
|------|------------------|
| Title | Short, imperative issue title |
| Type | feature / bug / chore |
| Repo | If not obvious from cwd (`gh repo view --json nameWithOwner -q .nameWithOwner`) |
| Problem / context | Why this matters; current behavior or gap |
| Goals / non-goals | What is in / out of scope |
| Proposed approach | Preferred solution direction (if any) |
| Acceptance criteria | How we know it is done |
| Labels / assignees / milestone | Only if the user cares |
| Resources | Links, specs, docs, screenshots |

For **bugs**, also ask: repro steps, expected vs actual, severity/frequency,
affected surfaces (screen/API/version).

For **chores**, also ask: why now, risk if delayed, migration/cleanup notes.

## Body template

Stick to this structure. Adapt section *content* by type; keep headings and
emoji unless the user asks otherwise. Omit a section only if it truly does not
apply after Q&A (e.g. no Resources).

```markdown
📝 Description

<1–3 short paragraphs: context + why this change matters>

🚩 Current Problems

_<Problem name>:_ <concrete pain, failure mode, or limitation>
_<Problem name>:_ <...>

🛠 Proposed Solution

<Approach in plain language. Optional short before/after or code snippets.>

🏗 Implementation Plan

_<Step name>:_
    <bullets or nested details>

✅ Acceptance Criteria

<Verifiable outcomes — not tasks. Prefer measurable / testable statements.>

🔗 Resources

[Title](url)
```

### Type adaptations (keep the same skeleton)

- **Feature**: Problems = current gaps/limitations; Solution = proposed design;
  Plan = implementation steps.
- **Bug**: Problems = failure modes / impact; Solution = fix approach (or
  investigation plan if unknown); add repro under Description or Problems
  (`Steps to Reproduce`, Expected, Actual) without renaming the main headings
  unless needed for clarity.
- **Chore**: Problems = debt/risk of delay; Solution = cleanup approach;
  Plan = migration/removal steps.

### Style rules

- Use `_Label:_` for bold-ish emphasis in problem/plan lines (matches common
  GitHub paste style from the example).
- Prefer concrete names (APIs, files, routes) over vague claims.
- Code samples: short before/after when they clarify; otherwise skip.
- Acceptance criteria: checklist-style sentences the PR can verify.
- Do not create or save `.md` files in the repo for this output.

## Create step

After the user approves the draft:

```bash
gh issue create \
  --title "<approved title>" \
  --body "$(cat <<'EOF'
<approved body exactly as confirmed>
EOF
)"
```

Optional flags only if the user requested them: `--label`, `--assignee`,
`--milestone`, `--project`.

Requirements:

- Run from the correct repo (or pass `--repo owner/name`).
- Needs `all` / network permissions for `gh`.
- Never create the issue before explicit approval of the draft.
- After create, paste the returned URL and stop (unless the user asks for edits).

If `gh` fails (auth, wrong repo), report the error and offer the body again for
manual paste.

## Example

**User:** "We should move navigation to type-safe routes"

**Agent asks** (unknowns only): title, scope (which graphs), non-goals, AC,
deps/versions, resources.

**Then drafts** Title + Body using the template, confirms, then `gh issue create`.

For a full sample body matching the preferred style, see [example.md](example.md).
