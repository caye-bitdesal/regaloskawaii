# bitdesal-create-ci

Agent skill that scaffolds **GitHub Actions CI** and **AI code review** for
BitDesal Kotlin projects.

## What it generates

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Build (+ tests on non-draft PRs) |
| `.github/workflows/ai-code-review.yml` | Gemini review on PR open/update |
| `.github/scripts/ai_review.py` | Review script (stack-specific prompt) |

No release, signing, or Play Store workflows.

## Install

Copy to your project:

```bash
cp -r cursor/bitdesal-create-ci /path/to/project/.cursor/skills/
```

## Usage

From the project root:

```bash
python3 .cursor/skills/bitdesal-create-ci/scripts/create_github_actions.py \
  --project-name "MyKmpProject" \
  --type kmp
```

Types:

- `android` — `:app` module, debug build, unit tests, ktlint, lint
- `kmp` — `:core`, `:server`, `:app:shared`, `:app:androidApp`
- `server` — `:server` compile + test

Options:

```bash
  --base-branch main   # default branch for triggers
  --force              # overwrite existing files
```

## Required secret

Add **`GEMINI_API_KEY`** in GitHub → Settings → Secrets and variables → Actions.

## Additional workflow optimization

After the AI review, paste the reported issues into the [bitdesal-evaluate](../bitdesal-evaluate/) skill and run it with a different LLM than Gemini. It decides which issues are valid and worth fixing, implements only those with the smallest correct diff, and creates one git commit per resolved issue.

## See also

- [SKILL.md](./SKILL.md) — agent workflow
- [reference.md](./reference.md) — customization guide
- [bitdesal-create-review](../bitdesal-create-review/) — AI review only (legacy)
