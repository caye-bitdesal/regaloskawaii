---
name: bitdesal-create-spec
description: Builds a feature spec through an interview, then generates a self-contained HTML spec artifact with embedded images and incremental tasks. Use when the user runs /bitdesal-create-spec with a feature explanation or asks to create a spec by interview.
disable-model-invocation: true
---

# BitDesal Create Spec

Use this skill to turn a rough feature idea into a detailed, agent-ready spec by
interviewing the user, then producing a single self-contained HTML artifact that
contains the full spec, the reference images, and the feature broken into small
incremental tasks.

## Invocation

```text
/bitdesal-create-spec some explanation about the spec
```

The text after the command is the initial feature explanation. If it is missing,
ask the user for a one-paragraph description before starting.

## Role and Tone

Act like a junior developer who must implement this feature and cannot start
until everything is clear. Be curious, literal, and slightly cautious: surface
assumptions, propose a concrete implementation, and ask the user to confirm or
correct it. Never invent requirements silently — when unsure, ask.

## Interview Workflow

Copy this checklist and track progress:

```text
Spec Progress:
- [ ] Step 1: Gather assets and base facts
- [ ] Step 2: Analyze screenshots and explanation
- [ ] Step 3: Inventory existing components
- [ ] Step 4: Interview macro structure
- [ ] Step 5: Interview sections and details
- [ ] Step 6: Interview behavior, data, edge cases
- [ ] Step 7: Confirm completeness
- [ ] Step 8: Break into incremental tasks
- [ ] Step 9: Generate the HTML artifact
```

### Step 1: Gather assets and base facts

Ask these first (the question bank is in [reference.md](reference.md)):

- Can you give me screenshots of how the feature looks in iOS?
- Can you give me screenshots of how the feature looks as a mockup?
- What should the parent package for this feature be named?
- Describe the general behavior of the feature.
- Is this feature using any endpoint? List them out.
- If the feature uses a scaffold, provide the name of the scaffold.

Save every screenshot the user provides into `specs/<feature-slug>/images/` and
record the path plus a short caption for each. You will reference these paths in
the spec JSON later.

### Step 2: Analyze screenshots and explanation

Read the screenshots and the explanation, then describe back what you see so the
user can correct you. State the visual hierarchy you observe before asking how to
build it.

### Step 3: Inventory existing components

Before designing the UI, search the project for components that could already
cover what the feature needs. Use `Grep`/`Glob`/`SemanticSearch` to find likely
candidates (for this Android project, look for `@Composable` functions, files
under `ui/components/`, design-system widgets, reusable rows/cards/dialogs).

For every candidate that is relevant, show it to the user and ask which action
to take:

- **Reuse** — use it as-is.
- **Modify** — adapt it (capture exactly what must change).
- **Create new** — it does not fit; build a new component (capture its name).

Record each decision: component name, file location, decision, and what it is
used for. If the user wants a brand-new component, capture its intended name and
where it should live. This inventory drives the "which component goes where"
mapping in the final spec. See [reference.md](reference.md) for search tips.

### Step 4: Interview macro structure (big picture first)

Start with the largest building blocks, propose an implementation, and give an
example answer so the user can answer quickly. Example:

> It seems the screen has 2 main sections divided by a horizontal bar. How do you
> want me to implement this? (example answer: "two boxes inside a Column, each
> with weight(1f)")

Keep questions at the layout/container level until the overall structure is
agreed.

### Step 5: Interview sections and details (zoom in progressively)

Once the macro structure is clear, go section by section. For each section ask
what it contains, how items are arranged, and which components are used. For each
section, explicitly name which inventoried components (reused, modified, or new)
go where, so the builder has no ambiguity. Move from container → list/grid →
individual item → states.

### Step 6: Interview behavior, data, and edge cases

Cover interactions, navigation, loading/empty/error states, persistence, and how
each listed endpoint maps to the UI. Ask about validation and edge cases the
mockups do not show.

### Step 7: Confirm completeness

Summarize the full feature back to the user in your own words, including the
component decisions. Ask explicitly: "Is anything missing or wrong before I split
this into tasks?" Only continue when the user confirms.

### Step 8: Break into incremental tasks

Split the feature into small, ordered tasks. Each task must be independently
feedable to an AI agent with enough context to execute it without re-reading the
whole spec. For each task capture: a short title, a focused spec, acceptance
criteria, dependencies on earlier tasks, and the specific components it should
reuse, modify, or create. Order them so an agent can do them one by one until the
feature is complete.

### Step 9: Generate the HTML artifact

1. Write the collected information into a spec JSON file (schema and example in
   [reference.md](reference.md), sample at `templates/spec.example.json`). Save it
   at `specs/<feature-slug>/spec.json`.
2. Run the generator from the repository root:

```bash
python3 .cursor/skills/bitdesal-create-spec/scripts/generate_spec_html.py \
  --spec specs/<feature-slug>/spec.json \
  --out specs/<feature-slug>/spec.html
```

3. Open the generated HTML path for the user and confirm the images rendered.

The generator embeds every image as base64, so the resulting HTML is a single
portable file. Image paths in the JSON are resolved relative to the JSON file.

## Output Goal

The final artifact is one HTML file that:

- Explains the whole feature with enough detail to minimize agent errors.
- Shows the reference images (iOS and mockups) inline.
- Lists endpoints, scaffold, persistence, and section breakdown.
- Lists existing/new components with the reuse/modify/create decision and tells
  the builder which component goes where (per section and per task).
- Contains the incremental task list, each with its own small spec and
  acceptance criteria.

## Notes

- Ask one focused topic at a time; do not dump the whole question bank at once.
- Prefer concrete proposals with example answers over open-ended questions.
- Always search the project for existing components before proposing new ones,
  and never silently invent a new component when one already exists.
- Do not commit generated files unless the user explicitly asks.
- Use a lowercase, hyphenated `<feature-slug>` derived from the feature name.
- The generator has no third-party dependencies; it uses the Python standard
  library only.
