#!/usr/bin/env python3
"""Generate BitDesal CI and AI code review GitHub Action files."""

from __future__ import annotations

import argparse
import textwrap
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = SKILL_ROOT / "templates"

WORKFLOW_CI = Path(".github/workflows/ci.yml")
WORKFLOW_REVIEW = Path(".github/workflows/ai-code-review.yml")
SCRIPT_REVIEW = Path(".github/scripts/ai_review.py")

VALID_TYPES = ("android", "kmp", "server")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create BitDesal CI and AI code review workflows for a project."
    )
    parser.add_argument(
        "--project-name",
        required=True,
        help="Display name used in AI review prompts and comments.",
    )
    parser.add_argument(
        "--type",
        required=True,
        choices=VALID_TYPES,
        help="Project stack: android (single-module app), kmp, or server (Ktor backend).",
    )
    parser.add_argument(
        "--base-branch",
        default="main",
        help="Default branch targeted by CI and AI review (default: main).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing generated files.",
    )
    return parser


def render(content: str, project_name: str, base_branch: str) -> str:
    return (
        content.replace("__PROJECT_NAME__", project_name)
        .replace("__BASE_BRANCH__", base_branch)
    )


def read_template(name: str) -> str:
    path = TEMPLATES / name
    if not path.is_file():
        raise FileNotFoundError(f"Missing template: {path}")
    return path.read_text(encoding="utf-8")


def write_file(path: Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"{path} already exists. Re-run with --force to overwrite.")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"[bitdesal-create-ci] wrote {path}")


def main() -> None:
    args = build_parser().parse_args()
    project_name = " ".join(args.project_name.split())
    base_branch = args.base_branch.strip()
    if not project_name:
        raise SystemExit("--project-name must not be blank")
    if not base_branch:
        raise SystemExit("--base-branch must not be blank")

    ci_template = read_template(f"ci-{args.type}.yml")
    review_workflow_template = read_template("ai-code-review.yml")
    review_script_template = read_template(f"ai_review-{args.type}.py")

    ci = render(ci_template, project_name, base_branch)
    review_workflow = render(review_workflow_template, project_name, base_branch)
    review_script = render(review_script_template, project_name, base_branch)

    try:
        write_file(WORKFLOW_CI, ci, args.force)
        write_file(WORKFLOW_REVIEW, review_workflow, args.force)
        write_file(SCRIPT_REVIEW, review_script, args.force)
    except FileExistsError as exc:
        raise SystemExit(str(exc)) from exc

    print(
        textwrap.dedent(
            f"""\
            [bitdesal-create-ci] done ({args.type})
            Generated:
            - {WORKFLOW_CI}
            - {WORKFLOW_REVIEW}
            - {SCRIPT_REVIEW}

            Next steps:
            - Add GEMINI_API_KEY as a GitHub repository or organization secret.
            - Adjust Gradle task names in {WORKFLOW_CI} if your module layout differs.
            - Open or update a pull request targeting {base_branch} to run the workflows.
            - Run: python3 -m py_compile {SCRIPT_REVIEW}
            """
        ).strip()
    )


if __name__ == "__main__":
    main()
