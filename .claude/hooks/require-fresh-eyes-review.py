#!/usr/bin/env python3
"""
Fresh Eyes Review Enforcement Hook (PreToolUse)

Blocks PR merge if no Fresh Eyes Review has been posted to the PR.
This ensures all PRs go through the mandatory independent review process.

Exit Codes:
  0 - Validation passed (review found, or not a merge operation)
  2 - BLOCKING ERROR - No independent review found on PR

Detection:
  - Checks for "## Fresh Eyes Review" header
  - Looks for review structure patterns (findings, status sections)
"""

import json
import sys
import re
import subprocess


def get_pr_number_from_input(data: dict) -> int | None:
    """Extract PR number from various tool inputs."""
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # MCP GitHub merge_pull_request (supports both mcp__github__ and mcp__plugin_github_github__ prefixes)
    if tool_name.startswith("mcp") and "github" in tool_name and tool_name.endswith("merge_pull_request"):
        return tool_input.get("pull_number") or tool_input.get("pullNumber")

    # Bash with gh pr merge
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if "gh pr merge" in command:
            # Extract PR number: gh pr merge 123 or gh pr merge PR_URL
            match = re.search(r'gh\s+pr\s+merge\s+(\d+)', command)
            if match:
                return int(match.group(1))

            # If no explicit number, might be merging current branch's PR
            try:
                result = subprocess.run(
                    ['gh', 'pr', 'view', '--json', 'number', '--jq', '.number'],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0 and result.stdout.strip():
                    return int(result.stdout.strip())
            except (subprocess.TimeoutExpired, ValueError, FileNotFoundError):
                pass

    return None


def check_fresh_eyes_review_exists(pr_number: int) -> tuple[bool, str]:
    """
    Check if a Fresh Eyes Review comment exists on the PR.
    Returns (exists: bool, message: str)
    """
    try:
        # Get PR comments using GitHub CLI
        result = subprocess.run(
            ['gh', 'pr', 'view', str(pr_number), '--json', 'comments'],
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            # If we can't check, fail open but warn
            return True, f"Warning: Could not check PR comments: {result.stderr}"

        comments_data = json.loads(result.stdout)
        comments = comments_data.get('comments', [])

        # Patterns for Fresh Eyes Review
        fresh_eyes_patterns = [
            r"##\s*fresh\s*eyes\s*review",           # ## Fresh Eyes Review header
            r"reviewer[:\s]+claude",                  # Reviewer: Claude
            r"fresh\s*(?:eyes|context)\s*(?:review|agent)", # Fresh eyes/context mentions
        ]

        # Common verification patterns
        verification_patterns = [
            r"###?\s*(findings|status)",              # ### Findings or ### Status
            r"verification\s*checklist",              # Verification Checklist
            r"\[x\]\s*security",                      # Checked security box
        ]

        for comment in comments:
            body = comment.get('body', '')
            body_lower = body.lower()

            # Check for Fresh Eyes Review
            fresh_eyes_matches = sum(1 for p in fresh_eyes_patterns if re.search(p, body_lower))
            verification_matches = sum(1 for p in verification_patterns if re.search(p, body_lower))

            if fresh_eyes_matches >= 1 and verification_matches >= 1:
                return True, "Fresh Eyes Review found"

        return False, "No independent review comment found on PR"

    except json.JSONDecodeError as e:
        return True, f"Warning: Could not parse PR comments: {e}"
    except subprocess.TimeoutExpired:
        return True, "Warning: Timeout checking PR comments"
    except FileNotFoundError:
        return True, "Warning: gh CLI not found"
    except Exception as e:
        return True, f"Warning: Error checking PR: {e}"


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        # If we can't parse input, allow the action (fail open for safety)
        print(f"Warning: Could not parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    # Extract PR number from the tool input
    pr_number = get_pr_number_from_input(input_data)

    # If this isn't a PR merge call, allow it
    if pr_number is None:
        sys.exit(0)

    # Check for independent review
    has_review, message = check_fresh_eyes_review_exists(pr_number)

    if not has_review:
        error_msg = f"""
❌ INDEPENDENT REVIEW REQUIRED

PR #{pr_number} cannot be merged without a Fresh Eyes Review.

{message}

The independent review is a mandatory part of the quality gate process.
Please run the following before merging:

  1. Use /post-fresh-eyes-review command
  2. This spawns a fresh Claude agent with no implementation context
  3. Address any P1/blocking issues found
  4. Then retry the merge

💡 TIP: Use /ship command to run the complete workflow including Fresh Eyes Review.

Required Fresh Eyes Review comment must include:
  • "## Fresh Eyes Review" header
  • Reviewer identification (Claude fresh context agent)
  • Findings section (P1/P2/P3 issues or "No issues")
  • Review status (Ready to merge / Needs changes / Re-review needed)
"""
        print(error_msg, file=sys.stderr)
        sys.exit(2)  # Exit code 2 = BLOCK the tool call

    # Validation passed
    sys.exit(0)


if __name__ == "__main__":
    main()
