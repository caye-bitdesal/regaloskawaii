#!/usr/bin/env python3
"""Generate the BitDesal AI code review GitHub Action files."""

from __future__ import annotations

import argparse
from pathlib import Path
import textwrap


WORKFLOW_PATH = Path(".github/workflows/ai-code-review.yml")
SCRIPT_PATH = Path(".github/scripts/ai_review.py")


WORKFLOW_TEMPLATE = """\
name: AI Code Review

on:
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

# Cancel any in-progress review for the same PR when new commits arrive
concurrency:
  group: ai-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    # Skip bot-created PRs (Dependabot, Renovate, etc.)
    if: >
      github.actor != 'dependabot[bot]' &&
      github.actor != 'renovate[bot]'

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          # Fetch enough history to produce a meaningful diff
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install review dependencies
        run: pip install --quiet google-genai PyGithub

      - name: Run AI Code Review
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          REPO_NAME: ${{ github.repository }}
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
          PR_TITLE: ${{ github.event.pull_request.title }}
          PROJECT_NAME: "__PROJECT_NAME__"
        run: python .github/scripts/ai_review.py
"""


SCRIPT_TEMPLATE = r'''#!/usr/bin/env python3
"""
AI-powered PR code review for __PROJECT_NAME__.

Runs on every PR open/update targeting main. Uses Gemini to review changed
Kotlin, Gradle, XML, and TOML files, then posts a structured GitHub PR review.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap

from google import genai
from google.genai import types
from github import Auth, Github


# Update to the latest available model when Google releases new ones.
# See: https://ai.google.dev/gemini-api/docs/models
GEMINI_MODEL = "gemini-2.5-pro"

PROJECT_NAME = os.environ.get("PROJECT_NAME", "__PROJECT_NAME__")

# Only review these file types to keep the diff focused and tokens down.
REVIEWED_EXTENSIONS = ("*.kt", "*.kts", "*.xml", "*.toml")

# Hard cap on diff size sent to the model, measured in characters.
MAX_DIFF_CHARS = 90_000


SYSTEM_PROMPT = textwrap.dedent(f"""\
    You are a senior Android engineer performing a thorough code review for
    {PROJECT_NAME}, an Android application. Review the pull request with
    practical production standards.

    Focus only on these categories:

    1. BUGS
       Logic errors, crash risks, incorrect API usage, resource or memory leaks,
       threading violations, broken edge cases, improper lifecycle handling.

    2. ANDROID_CORRECTNESS
       Deviations from Android and Jetpack documentation:
       - Wrong Compose side-effect usage
       - Incorrect coroutine scope
       - Missing lifecycle-aware collection
       - Improper state hoisting or broken unidirectional data flow
       - Navigation from composition instead of callbacks
       - Dependency injection outside the proper app context

    3. UNDERSTANDABILITY
       Unclear names, overly broad functions, missing explanation for
       non-obvious logic, magic literals that should be named constants, or
       deeply nested code that should be extracted.

    4. REUSABILITY
       Duplicated logic, utilities that duplicate platform APIs, components that
       should be extracted, or missed opportunities to reuse existing code.

    Previous review comments may be included. Determine whether the latest
    commits appear to have addressed them and list resolved concerns in
    addressed_comments.

    Return ONLY a JSON object matching this schema. All arrays may be empty [].

    {{
      "summary": "2-3 sentence overall assessment of the PR",
      "verdict": "approve" | "request_changes" | "comment",
      "issues": [
        {{
          "file": "relative/path/to/File.kt",
          "line": 42,
          "severity": "error" | "warning" | "suggestion",
          "category": "bug" | "android_correctness" | "understandability" | "reusability",
          "title": "Short imperative title",
          "body": "Detailed explanation and a concrete suggestion or code snippet"
        }}
      ],
      "open_questions": [
        "A specific question for the PR author that needs an answer before merging?"
      ],
      "addressed_comments": [
        "Brief description of a previous review concern that the new commits resolve"
      ],
      "praise": [
        "One specific thing done well in this PR"
      ]
    }}

    Use verdict="request_changes" only when there is at least one issue with
    severity="error". Warnings and suggestions alone must not block a merge.
    Use verdict="comment" when there are only warnings, suggestions, or open
    questions. Use verdict="approve" when there are no issues at all.
""")


SEVERITY_LABEL = {
    "error": "[error]",
    "warning": "[warning]",
    "suggestion": "[suggestion]",
}
CATEGORY_LABEL = {
    "bug": "Bug",
    "android_correctness": "Android Correctness",
    "understandability": "Understandability",
    "reusability": "Reusability",
}


def run_git(cmd: str) -> str:
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=False)
    return result.stdout


def get_diff(base_sha: str, head_sha: str) -> str:
    extensions = " ".join(f"'{extension}'" for extension in REVIEWED_EXTENSIONS)
    diff = run_git(f"git diff {base_sha}...{head_sha} -- {extensions}")
    if len(diff) > MAX_DIFF_CHARS:
        diff = diff[:MAX_DIFF_CHARS] + "\n\n[diff truncated: exceeds size limit]"
    return diff


def get_previous_review_comments(pr) -> list[dict]:
    """Collect inline review comments from previous review rounds."""
    comments = []
    for comment in pr.get_review_comments():
        comments.append(
            {
                "file": comment.path,
                "line": comment.original_line,
                "body": comment.body,
                "author": comment.user.login,
                "is_bot": "github-actions" in (comment.user.login or ""),
            }
        )
    return comments


def get_previous_issue_comments(pr) -> list[dict]:
    """Collect general PR comments from humans."""
    comments = []
    for comment in pr.get_issue_comments():
        if "github-actions" in (comment.user.login or ""):
            continue
        comments.append({"author": comment.user.login, "body": comment.body})
    return comments


def dismiss_stale_bot_reviews(pr, final_verdict: str) -> None:
    """Dismiss previous bot request-changes reviews when new review is not blocking."""
    if final_verdict == "REQUEST_CHANGES":
        return

    dismissed = 0
    for review in pr.get_reviews():
        is_bot = "github-actions" in (review.user.login or "")
        if is_bot and review.state == "CHANGES_REQUESTED":
            try:
                review.dismiss("Previous issues addressed or no longer applicable. See latest review.")
                dismissed += 1
            except Exception as exc:
                print(f"[review] Could not dismiss review {review.id}: {exc}")
    if dismissed:
        print(f"[review] Dismissed {dismissed} stale REQUEST_CHANGES review(s)")


def build_user_prompt(
    diff: str,
    pr_title: str,
    pr_body: str,
    review_comments: list[dict],
    issue_comments: list[dict],
) -> str:
    parts = [
        f"## Project\n{PROJECT_NAME}\n",
        f"## PR Title\n{pr_title}\n",
        f"## PR Description\n{pr_body or '*(no description provided)*'}\n",
        f"## Diff\n```diff\n{diff}\n```\n",
    ]

    if review_comments:
        parts.append("## Previous Inline Review Comments\n")
        for comment in review_comments:
            parts.append(
                f"- **{comment['file']}:{comment['line']}** - "
                f"{comment['author']}: {comment['body']}\n"
            )

    if issue_comments:
        parts.append("## Previous PR Discussion Comments\n")
        for comment in issue_comments:
            parts.append(f"- **{comment['author']}**: {comment['body']}\n")

    return "\n".join(parts)


def call_gemini(user_prompt: str) -> dict:
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=65536,
            response_mime_type="application/json",
        ),
    )

    candidate = response.candidates[0] if response.candidates else None
    if candidate is None:
        raise RuntimeError("Gemini returned no candidates.")

    finish_reason = candidate.finish_reason
    ok_reasons = (
        types.FinishReason.STOP,
        types.FinishReason.FINISH_REASON_UNSPECIFIED,
        None,
    )
    if finish_reason not in ok_reasons:
        raise RuntimeError(
            f"Gemini stopped early with finish_reason={finish_reason}. "
            "For MAX_TOKENS: reduce MAX_DIFF_CHARS or increase max_output_tokens."
        )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
        raw = raw.rsplit("```", 1)[0]
    return json.loads(raw)


def format_review_body(review: dict) -> str:
    """Convert the structured review dict into GitHub-flavored Markdown."""
    lines = [f"## AI Code Review for {PROJECT_NAME}\n", review["summary"], ""]

    issues = review.get("issues", [])
    if issues:
        lines.append("---\n### Issues\n")
        for issue in issues:
            severity = SEVERITY_LABEL.get(issue["severity"], "[info]")
            category = CATEGORY_LABEL.get(issue["category"], issue["category"])
            location = f"`{issue['file']}`"
            if issue.get("line"):
                location += f" line {issue['line']}"
            lines.append(f"#### {severity} {issue['title']}")
            lines.append(f"**Category:** {category} | **Location:** {location}\n")
            lines.append(f"{issue['body']}\n")

    questions = review.get("open_questions", [])
    if questions:
        lines.append("---\n### Open Questions\n")
        for question in questions:
            lines.append(f"- {question}")
        lines.append("")

    addressed = review.get("addressed_comments", [])
    if addressed:
        lines.append("---\n### Addressed from Previous Review\n")
        for item in addressed:
            lines.append(f"- {item}")
        lines.append("")

    praise = review.get("praise", [])
    if praise:
        lines.append("---\n### Well Done\n")
        for item in praise:
            lines.append(f"- {item}")
        lines.append("")

    lines.append(
        "---\n"
        f"*Generated automatically for {PROJECT_NAME} by the AI Code Review workflow "
        f"using **{GEMINI_MODEL}**. A human reviewer must still approve before merging.*"
    )
    return "\n".join(lines)


def resolve_verdict(review: dict) -> str:
    """Map the model verdict to a GitHub review event."""
    has_errors = any(issue.get("severity") == "error" for issue in review.get("issues", []))
    raw = review.get("verdict", "comment").upper()

    if raw == "REQUEST_CHANGES" and not has_errors:
        raw = "COMMENT"

    if raw not in ("APPROVE", "REQUEST_CHANGES", "COMMENT"):
        raw = "COMMENT"

    return raw


def main() -> None:
    token = os.environ["GITHUB_TOKEN"]
    repo_name = os.environ["REPO_NAME"]
    pr_number = int(os.environ["PR_NUMBER"])
    base_sha = os.environ["BASE_SHA"]
    head_sha = os.environ["HEAD_SHA"]

    print(f"[review] {PROJECT_NAME} PR #{pr_number}: {os.environ.get('PR_TITLE', '')}")

    diff = get_diff(base_sha, head_sha)
    if not diff.strip():
        print("[review] No relevant files changed; skipping.")
        sys.exit(0)
    print(f"[review] Diff size: {len(diff):,} chars")

    github = Github(auth=Auth.Token(token))
    repo = github.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    review_comments = get_previous_review_comments(pr)
    issue_comments = get_previous_issue_comments(pr)
    print(
        f"[review] Context: {len(review_comments)} review comment(s), "
        f"{len(issue_comments)} issue comment(s)"
    )

    prompt = build_user_prompt(
        diff=diff,
        pr_title=pr.title,
        pr_body=pr.body or "",
        review_comments=review_comments,
        issue_comments=issue_comments,
    )
    print(f"[review] Sending prompt ({len(prompt):,} chars) to {GEMINI_MODEL}")
    review = call_gemini(prompt)
    print(
        f"[review] Received verdict='{review.get('verdict')}', "
        f"{len(review.get('issues', []))} issue(s), "
        f"{len(review.get('open_questions', []))} question(s)"
    )

    final_verdict = resolve_verdict(review)
    body = format_review_body(review)

    dismiss_stale_bot_reviews(pr, final_verdict)

    pr.create_review(body=body, event=final_verdict)
    print(f"[review] Review posted (event={final_verdict})")

    questions = review.get("open_questions", [])
    if questions:
        question_body = "### Questions for the author\n\n"
        question_body += "\n".join(f"- [ ] {question}" for question in questions)
        question_body += (
            "\n\n*Please address these questions in the PR description or "
            "as reply comments before requesting re-review.*"
        )
        pr.create_issue_comment(question_body)
        print(f"[review] Posted {len(questions)} open question(s) as issue comment")


if __name__ == "__main__":
    main()
'''


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create the BitDesal AI code review workflow and script."
    )
    parser.add_argument(
        "--project-name",
        required=True,
        help="Display name to use in the AI review prompt and comments.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing generated files.",
    )
    return parser


def render(template: str, project_name: str) -> str:
    return template.replace("__PROJECT_NAME__", project_name)


def write_file(path: Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"{path} already exists. Re-run with --force to overwrite it.")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"[bitdesal-create-review] wrote {path}")


def main() -> None:
    args = build_parser().parse_args()
    project_name = " ".join(args.project_name.split())
    if not project_name:
        raise SystemExit("--project-name must not be blank")

    workflow = render(WORKFLOW_TEMPLATE, project_name)
    script = render(SCRIPT_TEMPLATE, project_name)

    try:
        write_file(WORKFLOW_PATH, workflow, args.force)
        write_file(SCRIPT_PATH, script, args.force)
    except FileExistsError as exc:
        raise SystemExit(str(exc)) from exc

    print(
        textwrap.dedent(
            f"""\
            [bitdesal-create-review] done
            Next steps:
            - Add GEMINI_API_KEY as a GitHub repository or organization secret.
            - Open or update a pull request targeting main to run the workflow.
            - Run: python3 -m py_compile {SCRIPT_PATH}
            """
        ).strip()
    )


if __name__ == "__main__":
    main()
