---
name: bitdesal-create-ci
description: >-
  Adds GitHub Actions CI and AI code review workflows to a Kotlin project
  (Android, KMP, or Ktor server). Use when the user runs /bitdesal-create-ci
  or asks to set up BitDesal-style CI without release workflows.
disable-model-invocation: true
---

# BitDesal Create CI

Generate **CI** and **AI code review** GitHub Actions for a Kotlin project.
This skill does **not** add release or signing workflows.

## Invocation

```text
/bitdesal-create-ci <ProjectName> --type android|kmp|server
```

Examples:

```text
/bitdesal-create-ci MyKmpProject --type kmp
/bitdesal-create-ci MyAndroidProject --type android
/bitdesal-create-ci MyServerProject --type server
```

Optional flags (pass them to the script):

- `--base-branch main` — branch targeted by CI and review (default: `main`)
- `--force` — overwrite existing workflow files

## Workflow

Copy this checklist and track progress:

```text
CI Progress:
- [ ] Step 1: Confirm project type and name
- [ ] Step 2: Run the generator script
- [ ] Step 3: Adjust Gradle tasks if module layout differs
- [ ] Step 4: Remind user about GEMINI_API_KEY secret
- [ ] Step 5: Verify Python script compiles
```

### Step 1: Confirm project type and name

| `--type` | When to use | CI jobs |
|----------|-------------|---------|
| `android` | Single-module Android app (`app/` module) | build, unit, ktlint, lint |
| `kmp` | Kotlin Multiplatform with `:core`, `:server`, `:app:*` | build, server-tests, shared-jvm-tests |
| `server` | Ktor backend only (`:server` module) | build, server-tests |

If the repo layout does not match the template, note what to change in
`.github/workflows/ci.yml` after generation. Details are in [reference.md](reference.md).

### Step 2: Run the generator

From the **target project root** (where `.github/` should be created):

```bash
python3 .cursor/skills/bitdesal-create-ci/scripts/create_github_actions.py \
  --project-name "ProjectName" \
  --type kmp
```

If the skill lives elsewhere, use the full path to the script. The script reads
templates from `templates/` next to the skill root.

Generated files:

```text
.github/workflows/ci.yml
.github/workflows/ai-code-review.yml
.github/scripts/ai_review.py
```

### Step 3: Adjust Gradle tasks (if needed)

Open `ci.yml` and align module names with the project. Common tweaks are listed
in [reference.md](reference.md).

### Step 4: GitHub secret

Tell the user to add **`GEMINI_API_KEY`** as a repository or organization secret.
`GITHUB_TOKEN` is provided automatically by Actions.

### Step 5: Verify

```bash
python3 -m py_compile .github/scripts/ai_review.py
```

## Notes

- **No release workflow** — unlike full Android CI setups, these templates skip
  signed release builds and Play Store steps.
- **Draft PRs** — test jobs skip draft pull requests; build still runs.
- **Supersedes** `bitdesal-create-review` for new projects — that skill only
  adds AI review; use this one for CI + review together.

## Further reading

- [reference.md](reference.md) — template details, customization, troubleshooting
- [README.md](README.md) — quick install and usage
