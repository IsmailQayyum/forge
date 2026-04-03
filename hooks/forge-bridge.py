#!/usr/bin/env python3
"""
Forge Bridge Hook — full two-way bridge between Forge UI and Claude Code.

Installed as PreToolUse + PostToolUse + Notification + Stop hook.
- PreToolUse: sends permission request to Forge, waits for approve/deny
- PostToolUse: sends tool results to Forge
- Notification: forwards to Forge messenger
- Stop: reports session end
"""

import json
import sys
import os
import time
import uuid
import urllib.request
import urllib.error

FORGE_URL = os.environ.get("FORGE_URL", "http://localhost:3333")
FORGE_API = f"{FORGE_URL}/api/hooks"

# How long to wait for a permission decision (seconds)
PERMISSION_TIMEOUT = 300  # 5 minutes
POLL_INTERVAL = 0.5       # poll every 500ms


def get_session_id():
    return os.environ.get("CLAUDE_SESSION_ID", os.environ.get("SESSION_ID", "unknown"))


def get_project():
    return os.path.basename(os.getcwd())


def forge_request(url, data=None, method="GET"):
    """Make HTTP request to Forge. Returns parsed JSON or None."""
    try:
        if data is not None:
            payload = json.dumps(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload,
                                        headers={"Content-Type": "application/json"},
                                        method="POST")
        else:
            req = urllib.request.Request(url, method=method)
        resp = urllib.request.urlopen(req, timeout=2)
        return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


def forge_is_running():
    """Quick check if Forge server is up."""
    try:
        req = urllib.request.Request(f"{FORGE_URL}/api/health", method="GET")
        resp = urllib.request.urlopen(req, timeout=1)
        return resp.status == 200
    except Exception:
        return False


def handle_pre_tool_use(input_data):
    """
    PreToolUse: Send permission request to Forge UI, wait for decision.
    Exit 0 = allow, Exit 2 = block (with JSON reason on stdout).
    """
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # If Forge is not running, auto-allow — never block the developer
    if not forge_is_running():
        sys.exit(0)

    # Also check for pending messages
    check_pending_messages()

    # Send permission request
    permission_id = f"perm-{uuid.uuid4().hex[:12]}"
    result = forge_request(f"{FORGE_API}/permission", {
        "sessionId": get_session_id(),
        "project": get_project(),
        "tool": tool_name,
        "input": truncate_input(tool_input),
        "permissionId": permission_id,
    })

    if not result or not result.get("ok"):
        # Forge didn't accept the request — auto-allow
        sys.exit(0)

    # Poll for decision
    start = time.time()
    while time.time() - start < PERMISSION_TIMEOUT:
        time.sleep(POLL_INTERVAL)

        resp = forge_request(f"{FORGE_API}/permission/{permission_id}", method="GET")
        if resp and resp.get("decided"):
            if resp["decision"] == "deny":
                # Block the tool call
                output = {
                    "decision": "block",
                    "reason": resp.get("reason") or f"Blocked by Forge UI: {tool_name}",
                }
                print(json.dumps(output))
                sys.exit(2)
            else:
                # Allowed
                sys.exit(0)

    # Timeout — auto-allow (fail-open for permissions)
    sys.exit(0)


def handle_post_tool_use(input_data):
    """PostToolUse: Send tool completion event to Forge."""
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    tool_output = input_data.get("tool_output", "")

    forge_request(FORGE_API, {
        "type": "TOOL_COMPLETE",
        "sessionId": get_session_id(),
        "project": get_project(),
        "data": {
            "tool": tool_name,
            "input": truncate_input(tool_input),
            "output": truncate_str(str(tool_output), 2000),
            "ts": now(),
        },
    })


def handle_notification(input_data):
    """Notification: Forward to Forge messenger."""
    message = input_data.get("message", "")
    forge_request(FORGE_API, {
        "type": "NOTIFICATION",
        "sessionId": get_session_id(),
        "project": get_project(),
        "data": {"message": message, "ts": now()},
    })


def handle_stop(input_data):
    """Stop: Report session end."""
    forge_request(FORGE_API, {
        "type": "SESSION_END",
        "sessionId": get_session_id(),
        "project": get_project(),
        "data": {"reason": input_data.get("reason", "unknown"), "ts": now()},
    })


def check_pending_messages():
    """Check if Forge has queued input for this session."""
    try:
        resp = forge_request(f"{FORGE_URL}/api/hooks/pending/{get_session_id()}", method="GET")
        if resp and resp.get("hasPending"):
            print(f"\n[Forge] {resp['message']}", file=sys.stderr)
    except Exception:
        pass


def truncate_input(tool_input):
    s = json.dumps(tool_input)
    if len(s) > 2000:
        return json.loads(s[:2000] + "}")
    return tool_input


def truncate_str(s, max_len):
    return s[:max_len] + "..." if len(s) > max_len else s


def now():
    import datetime
    return datetime.datetime.utcnow().isoformat() + "Z"


def main():
    try:
        raw = sys.stdin.read()
        input_data = json.loads(raw) if raw.strip() else {}
    except Exception:
        sys.exit(0)

    hook_type = os.environ.get("CLAUDE_HOOK_TYPE", "")

    if hook_type == "PreToolUse":
        handle_pre_tool_use(input_data)
    elif hook_type == "PostToolUse":
        handle_post_tool_use(input_data)
    elif hook_type == "Notification":
        handle_notification(input_data)
    elif hook_type == "Stop":
        handle_stop(input_data)

    sys.exit(0)


if __name__ == "__main__":
    main()
