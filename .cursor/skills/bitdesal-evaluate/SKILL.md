---
name: bitdesal-evaluate
description: Triage AI PR review issues, verify against the codebase and AGENTS.md, apply minimal fixes for valid findings, and create one git commit per resolved issue. Use when the user runs /bitdesal-evaluate or pastes issues from the BitDesal AI code review (or similar PR bot).
disable-model-invocation: true
---

# BitDesal Evaluate

Use this skill after an AI PR review. Collect the reported issues, decide which
ones are **valid and worth fixing**, then implement **only those** with the
smallest correct diff — **one git commit per resolved issue**.

## Invocation

```text
/bitdesal-evaluate
```

With optional context on the same message:

```text
/bitdesal-evaluate PR #123
/bitdesal-evaluate
[paste issues or JSON here]
```

If the user did not provide issues yet, **ask for them explicitly** before
triaging:

- Paste the review comment body, issue list, or JSON from CI (see
  [reference.md](reference.md) for the `ai_review.py` schema).
- Or give a **PR number / URL** so you can load comments with `gh` (read-only
  fetch is fine; do not push unless the user asks).

Do not invent issues. Do not fix anything until each item has been triaged.

## Role and Tone

Act like a senior reviewer on this repo:

- Skeptical of the bot — many comments are suggestions or false positives.
- Literal about **file, line, and claim** — open the code and verify.
- Prefer **AGENTS.md** and existing patterns over generic Android advice.
- Fix only what survives triage; leave a clear paper trail for skipped items.

## Workflow Checklist

Copy and track progress:

```text
Evaluate Progress:
- [ ] Step 1: Collect and normalize issues
- [ ] Step 2: Triage each issue (valid / invalid / needs user)
- [ ] Step 3: Plan fixes (one commit per apply item)
- [ ] Step 4: For each apply issue — fix, then commit
- [ ] Step 5: Run targeted tests (final pass)
- [ ] Step 6: Deliver summary to user
```

### Step 1: Collect and normalize issues

Build a numbered list. For each item capture at minimum:

| Field | Notes |
|-------|--------|
| `id` | 1, 2, 3… |
| `title` | Short label |
| `file` | Repo-relative path, or `—` if global |
| `line` | Optional; may be stale after new commits |
| `severity` | error / warning / suggestion (if known) |
| `body` | Full text + suggested fix |

If the input is unstructured prose, parse into this shape and show the user your
interpretation before triaging.

### Step 2: Triage each issue

For **every** issue, read the relevant code (and tests). Assign exactly one
verdict:

| Verdict | Meaning |
|---------|---------|
| **apply** | Correct, actionable, aligned with repo rules — fix in Step 4 |
| **reject** | Wrong, outdated, out of scope, or conflicts with AGENTS.md / spec |
| **ask** | Plausible but product/architecture choice — stop and ask the user |
| **already_fixed** | Addressed on current branch; cite commit or lines |

Use the rubric in [reference.md](reference.md). When triaging:

- Re-check **line numbers** against current files (bot lines are often stale).
- Prefer **one pass with evidence** over assuming the bot is right.
- Do **not** apply refactors the user did not request via a valid issue.
- **Errors** from the bot get extra scrutiny but still must be real bugs.

Present a compact triage table to the user **before** large edits when there
are more than two **apply** items or any **ask** items.

### Step 3: Plan fixes

For all **apply** items:

- **One commit per issue** — plan the diff so each `apply` item can land in its
  own commit (process issues in list order).
- Only combine two issues in one commit when they are the **same root cause**
  and splitting would leave a broken intermediate state; say so in the commit
  body and list both issue ids.
- Match naming, architecture, and test expectations in **AGENTS.md**.
- Add or update tests in the **same commit** as the fix when the change is
  behavioral.

Do not edit `ai_review.py`, CI workflows, or release config unless an issue
explicitly requires it.

### Step 4: Apply fixes and commit (per issue)

For **each** issue with verdict **apply**, in order:

1. Implement **only** that issue’s fix (minimal diff).
2. Stage the relevant files (`git add`; never commit secrets).
3. Create **one commit** whose message explains the AI review issue resolved
   (format in [reference.md](reference.md) — **Commits**).
4. If the pre-commit hook fails, fix and create a **new** commit (do not amend
   unless the user’s git rules allow it).

Do **not** batch several unrelated `apply` items into a single commit.

Issues with **reject**, **ask**, or **already_fixed** get no commit from this
skill.

Follow the repository’s git safety rules (no force push, no `--no-verify` unless
the user asks).

### Step 5: Run targeted tests

After all commits (or after the last fix if the batch is small):

```bash
./gradlew testDebugUnitTest
```

Prefer focused test classes when the diff is localized; run the wider task when
touching shared layers (ViewModels, navigation, repositories).

If tests fail, fix on a **new** commit (or revert the offending issue commit
and report in the summary).

### Step 6: Deliver summary

Use this template:

```markdown
## BitDesal evaluate — summary

**Input:** [PR # / pasted review / N issues]

### Applied (commits)
- **#1** — [title]: [`abc1234`] [one line what changed]
- **#3** — [title]: [`def5678`] …

### Rejected
- **#2** — [title]: [why — e.g. false positive, not our pattern]

### Already fixed / Ask user
- …

### Tests
- [command run] — [pass/fail]
```

## Output Goal

The user gets:

1. A clear verdict per AI issue (not blind acceptance).
2. Code fixes only where the bot was **right**.
3. **One traceable commit per resolved issue** for the PR history.
4. A short summary they can paste into the PR.

## Notes

- Fetch PR comments with `gh pr view` / `gh api` when the user gives a PR; see
  [reference.md](reference.md).
- If zero issues are provided after asking, stop — do not run a full Bugbot
  unless the user asks separately.
- Keep triage and summary in the same language the user uses in chat.
- Do **not** push to remote unless the user explicitly asks.
- After each evaluate commit, **bitdesal-review-last-commit** may auto-run in
  chat when that skill’s hook is installed (see its `reference.md`).
