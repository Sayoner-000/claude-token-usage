#!/usr/bin/env python3
"""Aggregate Claude Code token usage across every project transcript.

Reads <config>/projects/**/*.jsonl (config = $CLAUDE_CONFIG_DIR or ~/.claude),
deduplicates assistant messages by message id + request id, and prints a JSON
summary (or a text table with --text). Per-file results are cached by size and
mtime in <config>/token-usage-cache.json so refreshes only re-read changed files.
Python 3.6+, standard library only.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

CACHE_VERSION = 3
FIELDS = ("input", "output", "cache_create", "cache_read")


def config_dir():
    return os.environ.get("CLAUDE_CONFIG_DIR") or os.path.join(os.path.expanduser("~"), ".claude")


def parse_file(path):
    """Return (project, {key: [timestamp, model, input, output, cache_create, cache_read]}).

    project is the first cwd recorded in the file: the folder the session started in.
    """
    project, rows = "", {}
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if '"usage"' not in line and project:
                continue
            try:
                rec = json.loads(line)
            except ValueError:
                continue
            if not project and isinstance(rec, dict):
                project = rec.get("cwd") or ""
            msg = rec.get("message")
            if not isinstance(msg, dict):
                continue
            usage = msg.get("usage")
            if not isinstance(usage, dict) or msg.get("model") == "<synthetic>":
                continue
            key = "%s|%s" % (msg.get("id") or rec.get("uuid"), rec.get("requestId") or "")
            rows[key] = [
                rec.get("timestamp") or "",
                msg.get("model") or "unknown",
                int(usage.get("input_tokens") or 0),
                int(usage.get("output_tokens") or 0),
                int(usage.get("cache_creation_input_tokens") or 0),
                int(usage.get("cache_read_input_tokens") or 0),
            ]
    return project, rows


def load_cache(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("version") == CACHE_VERSION:
            return data.get("files", {})
    except (OSError, ValueError):
        pass
    return {}


def save_cache(path, files):
    tmp = path + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump({"version": CACHE_VERSION, "files": files}, fh, separators=(",", ":"))
        os.replace(tmp, path)
    except OSError:
        pass


def empty():
    return {"input": 0, "output": 0, "cache_create": 0, "cache_read": 0, "messages": 0}


def add(bucket, row):
    for i, name in enumerate(FIELDS):
        bucket[name] += row[2 + i]
    bucket["messages"] += 1


def aggregate():
    base = config_dir()
    projects_dir = os.path.join(base, "projects")
    cache_path = os.path.join(base, "token-usage-cache.json")
    cache = load_cache(cache_path)
    fresh = {}

    for root, _dirs, files in os.walk(projects_dir):
        for name in files:
            if not name.endswith(".jsonl"):
                continue
            path = os.path.join(root, name)
            try:
                st = os.stat(path)
            except OSError:
                continue
            hit = cache.get(path)
            if hit and hit["size"] == st.st_size and hit["mtime"] == st.st_mtime:
                fresh[path] = hit
                continue
            try:
                project, rows = parse_file(path)
                fresh[path] = {"size": st.st_size, "mtime": st.st_mtime, "project": project, "rows": rows}
            except OSError:
                continue

    save_cache(cache_path, fresh)

    now = datetime.now(timezone.utc).astimezone()
    today = now.strftime("%Y-%m-%d")
    week_ago = (now - timedelta(days=6)).strftime("%Y-%m-%d")
    total, day, week = empty(), empty(), empty()
    projects, models, sessions = {}, {}, set()
    seen = set()

    for path, entry in fresh.items():
        for key, row in entry["rows"].items():
            if key in seen:
                continue
            seen.add(key)
            sessions.add(os.path.splitext(os.path.basename(path))[0])
            add(total, row)
            local_day = ""
            if row[0]:
                try:
                    stamp = datetime.strptime(row[0][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                    local_day = stamp.astimezone().strftime("%Y-%m-%d")
                except ValueError:
                    pass
            if local_day == today:
                add(day, row)
            if local_day >= week_ago:
                add(week, row)
            project = entry["project"] or os.path.basename(os.path.dirname(path))
            add(projects.setdefault(project, empty()), row)
            add(models.setdefault(row[1], empty()), row)

    def ranked(table):
        out = [dict(name=k, **v) for k, v in table.items()]
        out.sort(key=lambda b: b["input"] + b["output"] + b["cache_create"] + b["cache_read"], reverse=True)
        return out

    return {
        "generatedAt": now.isoformat(timespec="seconds"),
        "configDir": base,
        "sessions": len(sessions),
        "total": total,
        "today": day,
        "week": week,
        "projects": ranked(projects),
        "models": ranked(models),
    }


def human(n):
    for unit, size in (("B", 1e9), ("M", 1e6), ("k", 1e3)):
        if n >= size:
            return "%.1f%s" % (n / size, unit)
    return str(n)


def print_text(s):
    def line(label, b):
        print("%-34s in %8s  out %8s  cache+ %8s  cache> %8s  msgs %6d" % (
            label[-34:], human(b["input"]), human(b["output"]),
            human(b["cache_create"]), human(b["cache_read"]), b["messages"]))

    print("Claude Code token usage (%s, %d sessions)" % (s["configDir"], s["sessions"]))
    line("Today", s["today"])
    line("Last 7 days", s["week"])
    line("All time", s["total"])
    print("\nBy project")
    for b in s["projects"]:
        line(b["name"], b)
    print("\nBy model")
    for b in s["models"]:
        line(b["name"], b)


if __name__ == "__main__":
    summary = aggregate()
    if "--text" in sys.argv:
        print_text(summary)
    else:
        json.dump(summary, sys.stdout, separators=(",", ":"))
