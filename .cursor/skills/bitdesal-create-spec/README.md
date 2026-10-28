# bitdesal-create-spec

Turn a rough feature idea into a detailed, agent-ready spec through an interview,
then generate structured artifacts you can feed to an AI agent for incremental
implementation.

## What it does

1. **Interviews you** like a junior developer — asks clarifying questions, searches
   the codebase for existing components, and proposes concrete implementations.
2. **Builds a full spec** — layout, behavior, data, component reuse/modify/create
   decisions, and which component goes where.
3. **Splits the work into tasks** — small, ordered steps with acceptance criteria
   and dependencies.
4. **Generates artifacts** under `specs/<feature-slug>/`:
   - `spec.json` — structured spec for AI agents (primary)
   - `spec.html` — self-contained human-readable spec with embedded images
   - `images/` — reference screenshots and mockups

## Prerequisites

- Cursor project skill installed at `.cursor/skills/bitdesal-create-spec/`
- Python 3 (standard library only — no extra packages)

## How to invoke the skill

In Cursor chat, run the skill by name with a short feature description:

```text
/bitdesal-create-spec some explanation about the spec
```

If you omit the description, the agent will ask for a one-paragraph summary before
starting.

### Example prompts — starting a spec

**Basic**

```text
/bitdesal-create-spec I want to build a month view screen that shows a calendar
grid on top and an event list on the bottom, synced when you scroll or tap a day.
```

**With more context upfront**

```text
/bitdesal-create-spec Build a settings screen for notification preferences.
It should reuse WeelScaffold, live under ui/settings, and read/write via the
existing UserPreferencesRepository. Match the iOS settings layout I'll attach.
```

**Minimal (agent will ask follow-ups)**

```text
/bitdesal-create-spec
```

Then reply to the interview questions as they come. Attach screenshots or mockups
when the agent asks — they are saved to `specs/<feature-slug>/images/`.

## Interview flow (what to expect)

The agent follows nine steps:

1. Gather assets and base facts (screenshots, package, scaffold, endpoints)
2. Analyze screenshots and your explanation
3. Inventory existing components (reuse / modify / create new)
4. Interview macro structure (layout containers first)
5. Interview sections and details (zoom in progressively)
6. Interview behavior, data, and edge cases
7. Confirm completeness — you approve the summary
8. Break into incremental tasks
9. Generate `spec.json` and `spec.html`

Answer one topic at a time. When the agent proposes something (e.g. "two boxes
inside a Column, each with weight(1f)"), confirm or correct it.

## Output layout

After a completed interview:

```text
specs/
└── <feature-slug>/
    ├── spec.json          # Give this to the agent for implementation
    ├── spec.html          # Open in a browser for human review
    └── images/
        ├── ios-....png
        └── mockup-....png
```

Example from this repo:

```text
specs/month-view/
├── spec.json
├── spec.html
└── images/ios-month-view.png
```

## Using the spec in a new chat (empty context)

When starting implementation in a **fresh chat**, attach the JSON — not the HTML.

| File | Use |
|------|-----|
| `spec.json` | **Always** — primary source for the agent |
| `images/*.png` | When UI/layout parity matters |
| `spec.html` | Human review only; avoid for agent context (large, base64 images) |

### Example prompts — implementing from a spec

**Single task**

```text
Implement task T2 from @specs/month-view/spec.json

Follow the component decisions and acceptance criteria in the spec.
```

**Single task with visual reference**

```text
Implement task T4 from @specs/month-view/spec.json

Use @specs/month-view/images/ios-month-view.png for layout parity.
Match the component table in the spec (MonthDayBox, MiniDayDial).
```

**Full feature, one task at a time**

```text
Implement the Month View feature from @specs/month-view/spec.json
in order (T1 → T8). Start with T1 only; stop after each task for review.
```

**Full feature, agent picks up where you left off**

```text
Continue implementing @specs/month-view/spec.json.
Tasks T1–T3 are done. Start at T4.
```

**Quick orientation**

```text
Read @specs/month-view/spec.json and summarize the remaining tasks
and their dependencies before we start coding.
```

## Regenerating the HTML manually

If you edit `spec.json` by hand, regenerate the HTML from the repository root:

```bash
python3 .cursor/skills/bitdesal-create-spec/scripts/generate_spec_html.py \
  --spec specs/<feature-slug>/spec.json \
  --out specs/<feature-slug>/spec.html
```

Optional custom title:

```bash
python3 .cursor/skills/bitdesal-create-spec/scripts/generate_spec_html.py \
  --spec specs/month-view/spec.json \
  --out specs/month-view/spec.html \
  --title "Month View — Feature Spec"
```

## Skill file structure

```text
.cursor/skills/bitdesal-create-spec/
├── README.md              # This file
├── SKILL.md               # Agent instructions (loaded when skill is invoked)
├── reference.md           # Question bank and spec JSON schema
├── templates/
│   └── spec.example.json  # Example spec for the generator
└── scripts/
    └── generate_spec_html.py
```

## Tips

- **Be specific in answers.** "Reuse EventList but add scrollToDate via ViewModel"
  is better than "make the list work."
- **Attach iOS screenshots early.** They drive layout and interaction questions.
- **Confirm the Step 7 summary** before tasks are generated — that's your last
  chance to catch gaps cheaply.
- **Commit `spec.json` and images** if you want the spec available on every branch;
  HTML is optional to commit.
- **One task per agent session** works well for large features — each task in the
  JSON is self-contained with its own acceptance criteria.

## Related

- `bitdesal-create-review` — adds AI PR code review GitHub Action to a project
- Example generated spec: `specs/month-view/spec.html` (open in browser)
