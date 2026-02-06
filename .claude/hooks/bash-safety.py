#!/usr/bin/env python3
"""
Bash Safety Hook (PreToolUse)

Prevents dangerous operations that could cause data loss or policy violations.
Works across Unix/Linux (bash) and Windows (PowerShell) environments.

Exit Codes:
  0 - Operation is safe
  2 - BLOCKING ERROR - Dangerous operation detected

Blocked operations:
  Git (scans entire command, catches 'cd x && git push' patterns):
    - Push to main/master branch
    - Force push (--force, -f)
    - Hard reset
    - Skipping hooks (--no-verify)

  Unix/Linux (bash):
    - rm -rf on system/important paths
    - Piping curl/wget to shell
    - chmod 777
    - Format/wipe commands (mkfs, dd)

  Windows (PowerShell):
    - Remove-Item -Recurse on system paths
    - Registry manipulation (HKLM)
    - Download-and-execute patterns (IEX + Invoke-WebRequest)
    - Execution policy bypass
    - Security service manipulation
"""

import json
import sys
import re


# Dangerous bash patterns to block (non-git, Unix/Linux)
DANGEROUS_BASH_PATTERNS = {
    "Recursive delete on dangerous path": [
        r'rm\s+.*-r.*\s+[/~](?:$|\s)',  # rm -rf / or ~
        r'rm\s+.*-r.*\s+/(?:etc|usr|bin|sbin|var|home|root)',
        r'rm\s+.*-r.*\s+\.\.',  # rm -rf ..
        r'rm\s+.*-r.*\s+\$(?:HOME|USER)',  # rm -rf $HOME or $USER
        r'rm\s+.*-r.*\s+/home/\w+',  # rm -rf /home/username
    ],
    "Pipe to shell": [
        r'curl\s+.*\|\s*(?:ba)?sh',
        r'wget\s+.*\|\s*(?:ba)?sh',
        r'curl\s+.*\|\s*sudo',
        r'wget\s+.*\|\s*sudo',
    ],
    "Dangerous permissions": [
        r'chmod\s+777\s',
        r'chmod\s+-R\s+777\s',
    ],
    "Format/wipe commands": [
        r'mkfs\.',
        r'dd\s+.*of=/dev/',
        r'format\s+[a-zA-Z]:',
    ],
    "Fork bomb / resource exhaustion": [
        r':\(\)\s*\{\s*:\|:&\s*\}\s*;:',  # Classic fork bomb
        r'while\s+true.*do.*done.*&',
    ],
}

# Dangerous PowerShell patterns to block (Windows)
DANGEROUS_POWERSHELL_PATTERNS = {
    "Recursive delete on dangerous path": [
        r'Remove-Item\s+.*-Recurse.*(?:C:\\|C:/|\$env:SystemRoot|\$env:ProgramFiles)',
        r'Remove-Item\s+.*-Recurse.*(?:\\Windows|\\Program Files|\\Users)',
        r'Remove-Item\s+.*(?:-r\s|-Recurse).*(?:C:\\|C:/)',  # -r alias
        r'Remove-Item\s+.*(?:-r\s|-Recurse).*\$env:(?:USERPROFILE|TEMP|SystemRoot)',
        r'rm\s+-r.*(?:C:\\|C:/)',  # PowerShell alias
        r'del\s+/s\s+/q\s+(?:C:\\|C:/)',  # CMD-style in PS
    ],
    "Dangerous registry operations": [
        r'Remove-Item\s+.*HKLM:',
        r'Remove-ItemProperty\s+.*HKLM:',
        r'Set-ItemProperty\s+.*HKLM:.*Run',  # Startup persistence
        r'Remove-Item\s+.*Registry::HKEY_LOCAL_MACHINE',  # Alternative syntax
        r'Remove-ItemProperty\s+.*Registry::HKEY_LOCAL_MACHINE',
    ],
    "Download and execute": [
        r'Invoke-Expression.*Invoke-WebRequest',
        r'IEX.*\(.*Invoke-WebRequest',
        r'iex.*iwr',
        r'iex.*irm',  # Invoke-RestMethod alias
        r'Invoke-Expression.*DownloadString',
        r'IEX.*DownloadString',
        r'Invoke-Expression.*Invoke-RestMethod',
        r'IEX.*\(.*irm',  # Common pattern: iex (irm url)
    ],
    "Execution policy bypass": [
        r'Set-ExecutionPolicy\s+.*Bypass',
        r'-ExecutionPolicy\s+Bypass',
        r'-ep\s+Bypass',
    ],
    "Service/process manipulation": [
        r'Stop-Service\s+.*(?:WinDefend|SecurityHealthService)',
        r'Set-MpPreference\s+.*-DisableRealtimeMonitoring',
    ],
}

# Dangerous git patterns to block
DANGEROUS_GIT_PATTERNS = {
    "Push to main/master": [
        r'git\s+push\s+(?:[^\s]+\s+)?(?:origin\s+)?main(?:\s|$)',
        r'git\s+push\s+(?:[^\s]+\s+)?(?:origin\s+)?master(?:\s|$)',
        r'git\s+push\s+.*?:main(?:\s|$)',
        r'git\s+push\s+.*?:master(?:\s|$)',
    ],
    "Force push": [
        r'git\s+push\s+.*?(?:--force|-f)(?:\s|$)',
        r'git\s+push\s+.*?(?:--force-with-lease)(?:\s|$)',  # Still warn about this
    ],
    "Hard reset": [
        r'git\s+reset\s+--hard\s+(?!HEAD(?:\s|$))',  # Allow reset --hard HEAD
    ],
    "Skip hooks": [
        r'git\s+(?:commit|push)\s+.*?--no-verify',
        r'git\s+(?:commit|push)\s+.*?-n(?:\s|$)',
    ],
    "Destructive rebase": [
        r'git\s+rebase\s+.*?(?:--force|-f)',
    ],
    "Delete remote branch main/master": [
        r'git\s+push\s+.*?--delete\s+(?:origin\s+)?(?:main|master)',
        r'git\s+push\s+.*?:(?:main|master)(?:\s|$)',
    ],
}


def check_bash_safety(command: str) -> list[tuple[str, str]]:
    """
    Check bash command for dangerous operations.
    Returns list of (issue_type, matched_pattern) tuples.
    """
    issues = []

    # Check Unix/Linux dangerous patterns (always check these)
    for issue_type, patterns in DANGEROUS_BASH_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, command, re.IGNORECASE):
                issues.append((issue_type, "bash"))
                break

    # Check PowerShell dangerous patterns (always check these)
    for issue_type, patterns in DANGEROUS_POWERSHELL_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, command, re.IGNORECASE):
                issues.append((issue_type, "powershell"))
                break

    # Check git-specific patterns - ALWAYS scan the full command
    for issue_type, patterns in DANGEROUS_GIT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, command, re.IGNORECASE):
                issues.append((issue_type, "git"))
                break

    return issues


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Warning: Could not parse hook input: {e}", file=sys.stderr)
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only check Bash commands
    if tool_name != "Bash":
        sys.exit(0)

    command = tool_input.get("command", "")

    issues = check_bash_safety(command)

    if not issues:
        sys.exit(0)

    # Separate issues by type for clearer messaging
    git_issues = [(t, c) for t, c in issues if c == "git"]
    bash_issues = [(t, c) for t, c in issues if c == "bash"]
    ps_issues = [(t, c) for t, c in issues if c == "powershell"]

    error_parts = [f"\n🚫 BASH SAFETY CHECK FAILED\n\nCommand: {command}\n"]

    if git_issues:
        error_parts.append("Git policy violations:")
        for issue_type, _ in git_issues:
            error_parts.append(f"  ❌ {issue_type}")
        error_parts.append("""
📋 Git Policy:
  • NEVER push directly to main - use Pull Requests
  • NEVER force push unless explicitly requested
  • NEVER skip hooks (--no-verify)
""")

    if bash_issues:
        error_parts.append("Dangerous Unix/Linux operations detected:")
        for issue_type, _ in bash_issues:
            error_parts.append(f"  ❌ {issue_type}")
        error_parts.append("""
⚠️  This command could cause data loss or system damage.
""")

    if ps_issues:
        error_parts.append("Dangerous PowerShell operations detected:")
        for issue_type, _ in ps_issues:
            error_parts.append(f"  ❌ {issue_type}")
        error_parts.append("""
⚠️  This PowerShell command could cause data loss or system damage.
""")

    error_parts.append("If this is intentional and authorized by the user, they must explicitly confirm.")

    print("\n".join(error_parts), file=sys.stderr)
    sys.exit(2)  # BLOCK the operation


if __name__ == "__main__":
    main()
