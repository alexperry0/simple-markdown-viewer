#!/usr/bin/env python3
"""
Plan File Archival Hook (PostToolUse)

Detects when a plan file is written to the ephemeral ~/.claude/plans/ directory
and copies it to a persistent project-local .claude/plans/ directory with a
meaningful filename derived from the plan's first heading.

Triggers on: Write, Edit tool calls
Behavior: Copies plan files to .claude/plans/ in the project root
Fails silently: Never blocks work

Exit Codes:
  0 - Always (this hook never blocks)
"""

import json
import os
import re
import shutil
import sys
from datetime import date


def slugify(text: str) -> str:
    """Convert text to a URL-friendly slug."""
    text = text.lower().strip()
    # Remove "plan:" prefix if present
    text = re.sub(r'^plan:\s*', '', text)
    # Replace non-alphanumeric characters with hyphens
    text = re.sub(r'[^a-z0-9]+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    return text


def get_first_heading(file_path: str) -> str | None:
    """Read the first markdown heading from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                match = re.match(r'^#+\s+(.+)', line.strip())
                if match:
                    return match.group(1).strip()
    except (IOError, OSError):
        pass
    return None


def derive_archive_name(source_path: str) -> str:
    """Derive a meaningful archive filename from the plan file."""
    today = date.today().isoformat()

    heading = get_first_heading(source_path)
    if heading:
        slug = slugify(heading)
        if slug:
            return f"{today}-{slug}.md"

    # Fallback: use the original filename
    original_name = os.path.splitext(os.path.basename(source_path))[0]
    return f"{today}-{original_name}.md"


def find_project_root() -> str | None:
    """Find the project root by looking for .claude/ directory."""
    # Start from cwd and walk up
    current = os.getcwd()
    while True:
        if os.path.isdir(os.path.join(current, '.claude')):
            return current
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    return None


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    # Get the file path from tool input
    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not file_path:
        sys.exit(0)

    # Normalize the path for cross-platform comparison
    normalized = file_path.replace("\\", "/")

    # Check if this is a plan file in the ephemeral .claude/plans/ directory
    if ".claude/plans/" not in normalized or not normalized.endswith(".md"):
        sys.exit(0)

    # Don't archive if the file is already in the project's .claude/plans/
    project_root = find_project_root()
    if project_root:
        project_plans_dir = os.path.join(project_root, ".claude", "plans")
        try:
            source_real = os.path.realpath(file_path)
            plans_real = os.path.realpath(project_plans_dir)
            if source_real.startswith(plans_real + os.sep) or source_real == plans_real:
                sys.exit(0)
        except (OSError, ValueError):
            pass

    # Verify the source file exists
    if not os.path.isfile(file_path):
        sys.exit(0)

    # Find project root and create archive directory
    if not project_root:
        sys.exit(0)

    archive_dir = os.path.join(project_root, ".claude", "plans")
    os.makedirs(archive_dir, exist_ok=True)

    # Derive meaningful filename and copy
    archive_name = derive_archive_name(file_path)
    archive_path = os.path.join(archive_dir, archive_name)

    shutil.copy2(file_path, archive_path)

    # Output context message
    rel_path = os.path.relpath(archive_path, project_root)
    print(f"Plan archived to {rel_path}")

    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never block work - fail silently on any unexpected error
        sys.exit(0)
