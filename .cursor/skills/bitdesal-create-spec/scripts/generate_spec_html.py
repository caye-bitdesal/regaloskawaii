#!/usr/bin/env python3
"""Generate a self-contained HTML spec artifact from a spec JSON file.

The output is a single HTML file with all reference images embedded as base64
data URIs, so it can be shared or opened anywhere without extra assets.

Standard library only; no third-party dependencies.
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import mimetypes
import re
from pathlib import Path


# ---------------------------------------------------------------------------
# Lightweight markdown rendering (small, dependency-free subset)
# ---------------------------------------------------------------------------

_INLINE_CODE = re.compile(r"`([^`]+)`")
_BOLD = re.compile(r"\*\*([^*]+)\*\*")


def _render_inline(text: str) -> str:
    """Escape text, then apply inline code and bold. Order matters."""
    placeholders: list[str] = []

    def stash_code(match: re.Match) -> str:
        placeholders.append(f"<code>{html.escape(match.group(1))}</code>")
        return f"\x00{len(placeholders) - 1}\x00"

    # Pull code spans out before escaping so their content is not double-handled.
    tmp = _INLINE_CODE.sub(stash_code, text)
    tmp = html.escape(tmp)
    tmp = _BOLD.sub(lambda m: f"<strong>{m.group(1)}</strong>", tmp)

    def restore(match: re.Match) -> str:
        return placeholders[int(match.group(1))]

    return re.sub(r"\x00(\d+)\x00", restore, tmp)


def render_markdown(text: str | None) -> str:
    """Render a small markdown subset to HTML.

    Supports: headings (#-####), unordered lists (-/*), ordered lists,
    fenced code blocks (```), inline `code`, and **bold**. Everything else
    becomes paragraphs.
    """
    if not text:
        return ""

    lines = text.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # Fenced code block
        if stripped.startswith("```"):
            i += 1
            code_lines: list[str] = []
            while i < n and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            code = html.escape("\n".join(code_lines))
            out.append(f"<pre><code>{code}</code></pre>")
            continue

        # Blank line
        if not stripped:
            i += 1
            continue

        # Heading
        heading = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if heading:
            level = len(heading.group(1))
            out.append(f"<h{level}>{_render_inline(heading.group(2))}</h{level}>")
            i += 1
            continue

        # Unordered list
        if re.match(r"^[-*]\s+", stripped):
            items: list[str] = []
            while i < n and re.match(r"^[-*]\s+", lines[i].strip()):
                item = re.sub(r"^[-*]\s+", "", lines[i].strip())
                items.append(f"<li>{_render_inline(item)}</li>")
                i += 1
            out.append("<ul>" + "".join(items) + "</ul>")
            continue

        # Ordered list
        if re.match(r"^\d+[.)]\s+", stripped):
            items = []
            while i < n and re.match(r"^\d+[.)]\s+", lines[i].strip()):
                item = re.sub(r"^\d+[.)]\s+", "", lines[i].strip())
                items.append(f"<li>{_render_inline(item)}</li>")
                i += 1
            out.append("<ol>" + "".join(items) + "</ol>")
            continue

        # Paragraph (consume consecutive non-blank, non-special lines)
        para: list[str] = []
        while i < n:
            cur = lines[i].strip()
            if (
                not cur
                or cur.startswith("```")
                or re.match(r"^#{1,4}\s+", cur)
                or re.match(r"^[-*]\s+", cur)
                or re.match(r"^\d+[.)]\s+", cur)
            ):
                break
            para.append(_render_inline(cur))
            i += 1
        out.append("<p>" + "<br>".join(para) + "</p>")

    return "\n".join(out)


# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------


def embed_image(base_dir: Path, rel_path: str) -> tuple[str | None, str | None]:
    """Return (data_uri, error). One of them is always None."""
    img_path = (base_dir / rel_path).resolve()
    if not img_path.exists():
        return None, f"Image not found: {rel_path}"

    mime, _ = mimetypes.guess_type(str(img_path))
    if mime is None:
        mime = "application/octet-stream"
    data = base64.b64encode(img_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{data}", None


# ---------------------------------------------------------------------------
# HTML sections
# ---------------------------------------------------------------------------

STYLE = """
:root {
  --bg: #0f1221; --panel: #181c2e; --panel-2: #1f2438; --text: #e7e9f3;
  --muted: #9aa3c0; --accent: #6c8cff; --border: #2a3050; --code: #11152a;
  --ok: #43c59e; --warn: #f5a623;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
}
.wrap { max-width: 960px; margin: 0 auto; padding: 40px 24px 80px; }
header.spec-header { border-bottom: 1px solid var(--border); padding-bottom: 24px; margin-bottom: 32px; }
header.spec-header h1 { margin: 0 0 8px; font-size: 34px; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.chip {
  background: var(--panel-2); border: 1px solid var(--border); color: var(--muted);
  padding: 4px 12px; border-radius: 999px; font-size: 13px;
}
.chip strong { color: var(--text); }
section.block { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 22px 24px; margin: 18px 0; }
section.block > h2 { margin-top: 0; font-size: 21px; border-left: 3px solid var(--accent); padding-left: 10px; }
h3 { font-size: 17px; }
h4 { font-size: 15px; color: var(--muted); }
p { margin: 8px 0; }
a { color: var(--accent); }
code { background: var(--code); padding: 1px 6px; border-radius: 6px; font-size: 90%; }
pre { background: var(--code); padding: 14px 16px; border-radius: 10px; overflow-x: auto; border: 1px solid var(--border); }
pre code { background: none; padding: 0; }
ul, ol { padding-left: 22px; }
.images { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
figure { margin: 0; background: var(--panel-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px; }
figure img { width: 100%; height: auto; border-radius: 8px; display: block; }
figcaption { color: var(--muted); font-size: 13px; margin-top: 8px; text-align: center; }
.kind-tag { display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  background: var(--accent); color: #0b0e1c; border-radius: 6px; padding: 1px 7px; margin-bottom: 6px; font-weight: 700; }
.missing { color: var(--warn); font-style: italic; }
table { width: 100%; border-collapse: collapse; margin: 6px 0; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { color: var(--muted); font-weight: 600; font-size: 13px; }
.subsection { border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin: 12px 0; background: var(--panel-2); }
.task { border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; margin: 14px 0; background: var(--panel-2); }
.task-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.task-id { background: var(--accent); color: #0b0e1c; font-weight: 700; border-radius: 6px; padding: 1px 9px; font-size: 13px; }
.task-deps { color: var(--muted); font-size: 13px; }
.ac { margin-top: 8px; }
.ac li { margin: 2px 0; }
.uses { margin-top: 8px; color: var(--muted); font-size: 13px; }
.uses .comp { color: var(--text); background: var(--code); border: 1px solid var(--border);
  border-radius: 6px; padding: 1px 7px; margin: 0 2px; font-size: 12px; }
.badge { display: inline-block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
  font-weight: 700; border-radius: 6px; padding: 1px 8px; }
.badge.reuse { background: var(--ok); color: #08130f; }
.badge.modify { background: var(--warn); color: #1c1404; }
.badge.create { background: var(--accent); color: #0b0e1c; }
footer { color: var(--muted); font-size: 13px; margin-top: 32px; text-align: center; }
""".strip()


def render_chips(spec: dict) -> str:
    chips: list[str] = []
    if spec.get("parent_package"):
        chips.append(f'<span class="chip"><strong>Package</strong> {html.escape(spec["parent_package"])}</span>')
    if spec.get("scaffold"):
        chips.append(f'<span class="chip"><strong>Scaffold</strong> {html.escape(spec["scaffold"])}</span>')
    tasks = spec.get("tasks") or []
    if tasks:
        chips.append(f'<span class="chip"><strong>Tasks</strong> {len(tasks)}</span>')
    endpoints = spec.get("endpoints") or []
    if endpoints:
        chips.append(f'<span class="chip"><strong>Endpoints</strong> {len(endpoints)}</span>')
    components = spec.get("components") or []
    if components:
        chips.append(f'<span class="chip"><strong>Components</strong> {len(components)}</span>')
    if not chips:
        return ""
    return f'<div class="meta">{"".join(chips)}</div>'


def render_images(spec: dict, base_dir: Path) -> str:
    images = spec.get("images") or []
    if not images:
        return ""
    figs: list[str] = []
    for img in images:
        caption = html.escape(img.get("caption", ""))
        kind = html.escape(img.get("kind", "")).upper()
        tag = f'<span class="kind-tag">{kind}</span>' if kind else ""
        data_uri, error = embed_image(base_dir, img.get("path", ""))
        if error:
            body = f'<p class="missing">{html.escape(error)}</p>'
        else:
            body = f'<img src="{data_uri}" alt="{caption}">'
        figs.append(f"<figure>{tag}{body}<figcaption>{caption}</figcaption></figure>")
    return (
        '<section class="block"><h2>Reference Images</h2>'
        f'<div class="images">{"".join(figs)}</div></section>'
    )


def render_text_block(title: str, text: str | None) -> str:
    if not text:
        return ""
    return f'<section class="block"><h2>{html.escape(title)}</h2>{render_markdown(text)}</section>'


_DECISION_CLASS = {"reuse": "reuse", "modify": "modify", "create": "create"}


def render_components(spec: dict) -> str:
    components = spec.get("components") or []
    if not components:
        return ""
    rows: list[str] = []
    for comp in components:
        decision = str(comp.get("decision", "")).lower()
        css = _DECISION_CLASS.get(decision, "reuse")
        label = html.escape(decision.upper() or "—")
        badge = f'<span class="badge {css}">{label}</span>' if decision else "—"
        rows.append(
            "<tr>"
            f"<td><code>{html.escape(comp.get('name', ''))}</code></td>"
            f"<td>{badge}</td>"
            f"<td><code>{html.escape(comp.get('location', ''))}</code></td>"
            f"<td>{html.escape(comp.get('usage', ''))}</td>"
            f"<td>{html.escape(comp.get('notes', ''))}</td>"
            "</tr>"
        )
    return (
        '<section class="block"><h2>Components</h2>'
        "<table><thead><tr><th>Component</th><th>Decision</th><th>Location</th>"
        "<th>Used for</th><th>Notes</th></tr></thead>"
        f"<tbody>{''.join(rows)}</tbody></table></section>"
    )


def render_component_usage(names: list | None) -> str:
    if not names:
        return ""
    chips = "".join(f'<span class="comp">{html.escape(str(name))}</span>' for name in names)
    return f'<p class="uses">Components: {chips}</p>'


def render_sections(spec: dict) -> str:
    sections = spec.get("sections") or []
    if not sections:
        return ""
    parts: list[str] = ['<section class="block"><h2>Sections</h2>']
    for sec in sections:
        title = html.escape(sec.get("title", "Untitled section"))
        parts.append(f'<div class="subsection"><h3>{title}</h3>')
        if sec.get("description"):
            parts.append("<h4>Contents</h4>" + render_markdown(sec["description"]))
        if sec.get("behavior"):
            parts.append("<h4>Behavior</h4>" + render_markdown(sec["behavior"]))
        parts.append(render_component_usage(sec.get("components")))
        parts.append("</div>")
    parts.append("</section>")
    return "".join(parts)


def render_endpoints(spec: dict) -> str:
    endpoints = spec.get("endpoints") or []
    if not endpoints:
        return ""
    rows: list[str] = []
    for ep in endpoints:
        rows.append(
            "<tr>"
            f"<td>{html.escape(ep.get('name', ''))}</td>"
            f"<td><code>{html.escape(ep.get('method', ''))}</code></td>"
            f"<td><code>{html.escape(ep.get('path', ''))}</code></td>"
            f"<td>{html.escape(ep.get('notes', ''))}</td>"
            "</tr>"
        )
    return (
        '<section class="block"><h2>Endpoints</h2>'
        "<table><thead><tr><th>Name</th><th>Method</th><th>Path</th><th>Notes</th></tr></thead>"
        f"<tbody>{''.join(rows)}</tbody></table></section>"
    )


def render_tasks(spec: dict) -> str:
    tasks = spec.get("tasks") or []
    if not tasks:
        return ""
    parts: list[str] = ['<section class="block"><h2>Incremental Tasks</h2>']
    for task in tasks:
        task_id = html.escape(str(task.get("id", "")))
        title = html.escape(task.get("title", "Untitled task"))
        deps = task.get("dependencies") or []
        deps_html = (
            f'<span class="task-deps">depends on: {html.escape(", ".join(map(str, deps)))}</span>'
            if deps
            else '<span class="task-deps">no dependencies</span>'
        )
        parts.append('<div class="task">')
        parts.append(
            f'<div class="task-head"><span class="task-id">{task_id}</span>'
            f"<h3>{title}</h3>{deps_html}</div>"
        )
        if task.get("spec"):
            parts.append(render_markdown(task["spec"]))
        parts.append(render_component_usage(task.get("components")))
        ac = task.get("acceptance_criteria") or []
        if ac:
            items = "".join(f"<li>{_render_inline(str(c))}</li>" for c in ac)
            parts.append(f'<div class="ac"><h4>Acceptance criteria</h4><ul>{items}</ul></div>')
        parts.append("</div>")
    parts.append("</section>")
    return "".join(parts)


def build_html(spec: dict, base_dir: Path, title: str) -> str:
    feature = html.escape(spec.get("feature_name", "Feature Spec"))
    body_parts = [
        '<header class="spec-header">',
        f"<h1>{feature}</h1>",
        render_markdown(spec.get("summary", "")),
        render_chips(spec),
        "</header>",
        render_text_block("Overview", spec.get("overview")),
        render_images(spec, base_dir),
        render_text_block("Structure", spec.get("structure")),
        render_components(spec),
        render_sections(spec),
        render_endpoints(spec),
        render_text_block("Persistence", spec.get("persistence")),
        render_tasks(spec),
        '<footer>Generated by bitdesal-create-spec.</footer>',
    ]
    body = "\n".join(p for p in body_parts if p)
    return (
        "<!DOCTYPE html>\n"
        '<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        f"<title>{html.escape(title)}</title>\n"
        f"<style>\n{STYLE}\n</style>\n</head>\n<body>\n"
        f'<div class="wrap">\n{body}\n</div>\n</body>\n</html>\n'
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a self-contained HTML spec from a spec JSON file."
    )
    parser.add_argument("--spec", required=True, help="Path to the spec JSON file.")
    parser.add_argument("--out", required=True, help="Path to write the HTML file.")
    parser.add_argument("--title", help="Optional <title>; defaults to the feature name.")
    args = parser.parse_args()

    spec_path = Path(args.spec).resolve()
    if not spec_path.exists():
        raise SystemExit(f"Spec file not found: {spec_path}")

    try:
        spec = json.loads(spec_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {spec_path}: {exc}") from exc

    if not spec.get("feature_name"):
        raise SystemExit("Spec JSON must include 'feature_name'.")

    title = args.title or spec["feature_name"]
    html_text = build_html(spec, spec_path.parent, title)

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html_text, encoding="utf-8")
    print(f"[bitdesal-create-spec] wrote {out_path}")


if __name__ == "__main__":
    main()
