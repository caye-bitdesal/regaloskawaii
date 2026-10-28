# BitDesal Create Spec — Reference

Detailed interview material and the spec JSON schema. Read this when running the
interview or before generating the artifact.

## Interview Principles

- One topic at a time. Resolve the current layer before going deeper.
- Always propose a concrete implementation and an example answer.
- Restate what you understood from images before asking how to build it.
- Track open questions; do not move on while a blocking one is unanswered.
- Big picture first, then details, then states and edge cases.

## Question Bank

### Round 1 — Assets and base facts

- Can you give me screenshots of how the feature looks in iOS?
- Can you give me screenshots of how the feature looks as a mockup?
- What should the parent package for this feature be named?
- Describe the general behavior of the feature.
- Is this feature using any endpoint? List them out.
- If the feature uses a scaffold, provide the name of the scaffold.

### Round 1.5 — Existing components

Run before designing the UI. Search the project, then for each relevant candidate
ask: reuse, modify, or create new?

- Found `X` that looks like the row in your mockup. Reuse it, modify it, or build
  a new one?
- If modify: what exactly should change (props, layout, states)?
- If create new: what should the new component be named and where should it live?
- Are there design-system widgets (buttons, cards, dialogs) you want enforced
  here instead of custom ones?

#### How to search

- `Glob` for likely files: `**/ui/components/**/*.kt`, `**/*Card*.kt`,
  `**/*Row*.kt`, `**/*Dialog*.kt`, `**/*Button*.kt`.
- `Grep` for `@Composable` declarations near the feature area.
- `SemanticSearch` with questions like "Where is the reusable list row component?"
- Confirm each candidate's real signature/props by reading the file before
  proposing reuse or modification.

### Round 2 — Macro structure

- How many main sections does the screen have, and how are they divided?
- How should the top-level layout be implemented? (example answer: "two boxes
  inside a Column, each with weight(1f)")
- Is there a scaffold, top bar, bottom bar, or floating action button?
- Is the screen scrollable as a whole, or does each section scroll on its own?

### Round 3 — Sections and details

- For section X, what does it contain?
- How are the items arranged (list, grid, row, pager)?
- What does a single item look like, and which existing component does it reuse?
- What are the spacing, alignment, and sizing rules that matter?

### Round 4 — Behavior, data, edge cases

- What happens on tap / long press / swipe for each interactive element?
- Where does navigation go from here, and what is passed along?
- What are the loading, empty, and error states?
- How does each endpoint map to the UI? When is it called?
- How should persistence be handled (Room, in-memory, cache)?
- What validation and edge cases must be handled that the mockups do not show?

## Task Breakdown Guidance

Split into the smallest tasks that still produce a reviewable result. A good
order is usually:

1. Package, navigation entry, and empty screen scaffold.
2. Static UI for the macro structure.
3. Each section's UI, one task per section.
4. Data layer: models, repository, endpoint wiring.
5. ViewModel / state and wiring UI to data.
6. Interactions, navigation, and edge-case states.
7. Persistence.

Each task needs: a short title, a focused spec, acceptance criteria, and
dependencies on earlier task ids.

## Spec JSON Schema

The generator (`scripts/generate_spec_html.py`) reads this shape. All fields are
optional except `feature_name`; arrays may be empty. Image `path` values are
resolved relative to the JSON file location.

```json
{
  "feature_name": "Habit Dashboard",
  "feature_slug": "habit-dashboard",
  "parent_package": "com.example.app.feature.habits",
  "scaffold": "HabitDashboardScaffold",
  "summary": "One-paragraph overview of the feature.",
  "overview": "Longer description. Supports **bold**, lists, and `code`.",
  "images": [
    { "kind": "ios", "caption": "iOS reference", "path": "images/ios-home.png" },
    { "kind": "mockup", "caption": "Mockup", "path": "images/mockup.png" }
  ],
  "components": [
    {
      "name": "HabitRow",
      "location": "app/.../ui/components/HabitRow.kt",
      "decision": "reuse",
      "usage": "Each row in the habit list.",
      "notes": "Optional: what changes if decision is modify, or details if create."
    }
  ],
  "structure": "Markdown describing the macro layout.",
  "sections": [
    {
      "title": "Top summary",
      "description": "What it contains and how it is arranged.",
      "behavior": "Interactions, states, navigation.",
      "components": ["ProgressRing"]
    }
  ],
  "endpoints": [
    {
      "name": "Get habits",
      "method": "GET",
      "path": "/api/habits",
      "notes": "Called on screen load; drives the list."
    }
  ],
  "persistence": "Markdown describing storage strategy.",
  "tasks": [
    {
      "id": "T1",
      "title": "Create package and navigation entry",
      "spec": "Focused, self-contained spec for an agent.",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "dependencies": [],
      "components": ["HabitRow"]
    }
  ]
}
```

### Components field

- `decision` must be one of `reuse`, `modify`, or `create`.
- `location` is the file path for existing components, or the intended path for
  new ones.
- `usage` is the short "where it goes" description shown to the builder.
- Section and task `components` are arrays of component `name`s that reference
  entries in the top-level `components` list, telling the builder which component
  to use where.

### Supported lightweight markdown

The generator renders a small markdown subset in text fields (`summary`,
`overview`, `structure`, section `description`/`behavior`, `persistence`, task
`spec`): headings (`#`–`####`), unordered lists (`-` / `*`), ordered lists,
fenced code blocks, inline `` `code` ``, and `**bold**`. Everything else is
treated as paragraphs and HTML-escaped.
