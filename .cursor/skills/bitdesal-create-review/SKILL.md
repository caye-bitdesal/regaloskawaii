---
name: bitdesal-create-review
description: >-
  Legacy — creates only the BitDesal AI code review GitHub Action for Android
  projects. Prefer bitdesal-create-ci for CI + review. Use when the user
  explicitly runs /bitdesal-create-review.
disable-model-invocation: true
---

# BitDesal Create Review

**Legacy:** for new projects prefer [bitdesal-create-ci](../bitdesal-create-ci/), which
adds CI and stack-specific AI review together.

Use this skill to add **only** the BitDesal AI PR review setup to a repository.

## Required Input

The user must provide the project display name:

```text
/bitdesal-create-review My Project
```

If the project name is missing, ask for it before changing files.

## What This Creates

The generator writes:

- `.github/workflows/ai-code-review.yml`
- `.github/scripts/ai_review.py`

The workflow runs on pull requests targeting `main` when they are opened, synchronized, or reopened. It installs `google-genai` and `PyGithub`, then runs the Python script. The script uses the provided project name in the review prompt, logs, and generated PR review text.

## Workflow

1. Confirm the repository root.
2. Run the generator from the repository root:

```bash
python3 .cursor/skills/bitdesal-create-review/scripts/create_review_action.py --project-name "My Project"
```

3. If either target file already exists and the user explicitly wants to replace it, rerun with `--force`:

```bash
python3 .cursor/skills/bitdesal-create-review/scripts/create_review_action.py --project-name "My Project" --force
```

4. Validate the generated script:

```bash
python3 -m py_compile .github/scripts/ai_review.py
```

5. Tell the user they must add a repository or organization secret named `GEMINI_API_KEY` in GitHub before the workflow can run.

## Notes

- Do not commit the generated files unless the user explicitly asks.
- Do not create or store API keys.
- Keep the generated workflow named `AI Code Review` unless the user requests a different name.
- If the default base branch is not `main`, update the generated workflow branch filter before finishing.
