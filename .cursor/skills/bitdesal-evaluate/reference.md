# BitDesal Evaluate — Reference

## AI review issue shape (Weel / `ai_review.py`)

CI reviews emit JSON like:

```json
{
  "issues": [
    {
      "file": "app/src/main/java/.../Feature.kt",
      "line": 42,
      "severity": "error",
      "category": "bug",
      "title": "Short imperative title",
      "body": "Explanation and suggested fix"
    }
  ]
}
```

`severity`: `error` | `warning` | `suggestion`  
`category`: `bug` | `android_correctness` | `understandability` | `reusability`

Markdown PR comments often use emoji prefixes (🔴 🟡 🔵) — map them to the same
fields when parsing.

## Loading issues from GitHub

When the user gives a PR number (repo must be current):

```bash
gh pr view <number> --comments
gh api repos/{owner}/{repo}/pulls/<number>/comments
gh api repos/{owner}/{repo}/pulls/<number>/reviews
```

Prefer **inline review comments** and the latest **AI Code Review** bot comment.
Ignore dismissed or superseded threads when a newer bot run exists.

## Triage rubric

### Apply when

- The claim matches the code at the cited location (or obvious nearby code if
  line drifted).
- The fix is consistent with **AGENTS.md** (MVVM, manual DI, Compose patterns,
  no banned frameworks).
- The fix is **minimal** and scoped to the PR/feature under review.
- For `android_correctness`, the bot cites a real lifecycle, navigation, or
  threading mistake.

### Reject when

- **False positive** — e.g. `collectAsState` flagged but file is test/preview
  only; or “missing test” for trivial wiring.
- **Stale** — issue refers to code removed or rewritten on the branch.
- **Violates project choices** — Hilt, Navigation 3, XML screens, etc.
- **Over-engineering** — extract/helper requested with no duplication or spec.
- **Nit without rule** — style the repo does not enforce.
- **Spec conflict** — fix would break `specs/<feature>/` unless user confirms.

### Ask user when

- Product or UX ambiguity.
- Two valid designs (bot prefers one not chosen in spec).
- Severity `suggestion` that **changes behavior** beyond the PR scope.
- Security/privacy tradeoff.

### Already fixed when

- Diff or file clearly contains the suggested fix.
- A prior commit on the branch addresses the same root cause — cite it.

## Fix quality bar (same as normal agent work)

| Change type | Tests |
|-------------|--------|
| ViewModel / model / utils logic | Unit test in `app/src/test/...` |
| Screen / component behavior | Robolectric `*UiTest.kt` when feasible |
| Copy / drawable-only | Previews or existing UI tests if touched |

Do not add tests that only assert obvious wiring.

## Common bot themes in this repo

| Theme | Often valid? | Notes |
|-------|----------------|-------|
| `collectAsState` → `collectAsStateWithLifecycle` in production UI | Often yes | Previews/tests may differ |
| Navigation in `LaunchedEffect` without user intent | Often yes | Prefer callbacks / ViewModel |
| Missing `TestAppContainer` / fake in tests | Sometimes | Only if PR added untested logic |
| Extract to `utils/` | Sometimes | AGENTS.md: second caller or clear reuse |
| Manual `StateFlow` equality guard before `update` | Usually no | `update` already dedupes |

## Minimal fix examples

**Apply — lifecycle collection**

Bot: use `collectAsStateWithLifecycle` in a screen composable.  
Action: import lifecycle compose artifact, swap collector, keep preview as-is if
it uses different APIs.

**Reject — DI framework**

Bot: inject repository with Hilt.  
Action: reject; document manual `AppContainer` in summary.

**Ask — behavior change**

Bot: also handle timezone X in Month view.  
Action: ask; out of PR scope unless user confirms.

## Commits (one per resolved issue)

When verdict is **apply**, commit immediately after that issue’s fix (before
starting the next issue).

### Message format

Use the repo prefix style (`fix:`, `care:`, `test:`, etc.). Prefer **`fix:`**
for bugs and **android_correctness**; **`care:`** for clarity/reuse-only changes.

Subject line (≤ ~72 chars):

```text
fix: [AI review #N] Imperative summary matching the bot title
```

Body (HEREDOC for `git commit`):

```text
Resolves AI PR review issue #N: <title>

Category: <bug|android_correctness|understandability|reusability>
Severity: <error|warning|suggestion>
Location: <file>:<line> (or "see diff")

<One or two sentences: what was wrong and what we changed.>
```

### Example

```text
fix: [AI review #2] Collect uiState with lifecycle in WeekScreen

Resolves AI PR review issue #2: Use collectAsStateWithLifecycle in production UI

Category: android_correctness
Severity: warning
Location: app/.../WeekScreen.kt:48

Replace collectAsState with collectAsStateWithLifecycle for weekUiState.
```

### Git steps (per issue)

1. `git status` / `git diff` — stage only files for this issue.
2. `git commit` with the message above.
3. Note the short SHA for the Step 6 summary.
4. Never amend a failed hook run; fix and commit again.

### Local last-commit review

Each evaluate commit uses `[AI review #N]` in the subject. If the project
installed **bitdesal-review-last-commit**, the post-commit hook **always**
runs a local Fable review of that commit in chat (even when other commits would
use `[skip review]` or `WIP`).
