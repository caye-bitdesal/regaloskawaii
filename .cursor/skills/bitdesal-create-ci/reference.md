# bitdesal-create-ci — reference

## Template matrix

| Type | CI template | Review script | Review focus |
|------|-------------|---------------|--------------|
| `android` | `ci-android.yml` | `ai_review-android.py` | Jetpack, Compose, lifecycle |
| `kmp` | `ci-kmp.yml` | `ai_review-kmp.py` | KMP, Ktor, SQLDelight, Metro, Compose |
| `server` | `ci-server.yml` | `ai_review-server.py` | Ktor, SQLDelight, Metro, REST |

Shared: `ai-code-review.yml` (workflow wiring + env vars).

## Placeholders

Templates use:

- `__PROJECT_NAME__` — human-readable name in prompts and comments
- `__BASE_BRANCH__` — branch in `on.push` / `on.pull_request` triggers

## Android CI assumptions

- Gradle module: `app`
- Tasks: `app:assembleDebug`, `testDebugUnitTest`, `ktlintCheck`, `lintDebug`
- JDK 21, Zulu distribution
- **ktlint** and **Android lint** jobs require the corresponding Gradle plugins;
  remove those jobs if the project does not use them.

## KMP CI assumptions

- Modules: `:core`, `:server`, `:app:shared`, `:app:androidApp`
- Build: compile JVM targets + `assembleDebug`
- Tests: `:server:test`, `:app:shared:jvmTest` (skipped on draft PRs)

## Server CI assumptions

- Module: `:server`
- Tasks: `:server:compileKotlin`, `:server:test`

## AI review behavior

- Model: `gemini-3.1-pro-preview` (update in generated script when needed)
- Reviews: `*.kt`, `*.kts`, plus `*.sq` / `*.xml` where relevant
- Diff cap: 90_000 characters
- Skips Dependabot and Renovate PRs
- Cancels in-progress review when new commits are pushed (concurrency group)
- Dismisses stale bot `REQUEST_CHANGES` when latest review is not blocking
- Never posts GitHub `APPROVE` — uses `COMMENT` even when the model says approve

## Customization checklist

After generation, verify:

1. Module names in `ci.yml` match `settings.gradle.kts`
2. Default branch matches your repo (`main` vs `master`)
3. Remove CI jobs for plugins you do not have (e.g. ktlint on Android)
4. Tune `REVIEWED_EXTENSIONS` in `ai_review.py` if you use other file types
5. Adjust `SYSTEM_PROMPT` if the project uses a different DI or persistence stack

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CI fails: task not found | Edit Gradle task names in `ci.yml` |
| ktlint/lint job fails on Android | Add plugin or delete those jobs |
| Review workflow skips | No matching files in diff, or PR is from a bot |
| `GEMINI_API_KEY` error | Add secret in repo or org settings |
| Script syntax error | Run `python3 -m py_compile .github/scripts/ai_review.py` |

## Relationship to bitdesal-create-review

`bitdesal-create-review` generates **only** AI review (Android prompt, embedded
templates). Prefer **bitdesal-create-ci** for new projects that need both CI
and review with stack-specific templates.
