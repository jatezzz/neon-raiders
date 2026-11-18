#!/usr/bin/env python3
"""Daily report of Neon Raiders events and tagged visits from a web server access log.

The game sends anonymous counters to <portal>/e?ev=... and tags its links with utm_ parameters
(see docs/DAILY.md). Both end up in the portal's access log, so no analytics service is needed.

Usage:
    kubectl logs deploy/public-edge --since=168h | python3 tools/events_report.py
    python3 tools/events_report.py access.log [more.log ...]

Reads the "combined" log format (also works with anything that has the request in quotes).
Requests from link-preview and search crawlers are left out.
"""
import collections
import fileinput
import re
import sys
from urllib.parse import parse_qs, urlsplit

REQUEST = re.compile(r'"(?:GET|POST|HEAD) (\S+) HTTP/[\d.]+"')
DAY = re.compile(r'\[(\d{2})/(\w{3})/(\d{4}):')
BOTS = re.compile(r'bot|crawl|spider|WhatsApp|facebookexternalhit|TelegramBot|Slackbot|Twitterbot|preview|curl|python-requests', re.I)
MONTHS = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}


def log_day(line):
    m = DAY.search(line)
    return f"{m.group(3)}-{MONTHS.get(m.group(2), 0):02d}-{m.group(1)}" if m else "unknown"


def main():
    events = collections.defaultdict(collections.Counter)     # day -> event -> count
    shares = collections.defaultdict(collections.Counter)     # day -> how -> count
    visits = collections.defaultdict(collections.Counter)     # day -> "source/medium" -> count
    arrivals = collections.defaultdict(collections.Counter)   # day -> "source/medium" seen by the game
    scores = collections.defaultdict(list)
    for line in fileinput.input(encoding="utf-8", errors="replace"):
        m = REQUEST.search(line)
        if not m or BOTS.search(line):
            continue
        url = urlsplit(m.group(1))
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        day = log_day(line)
        if url.path == "/e" and "ev" in q:
            day = q.get("d", day)
            events[day][q["ev"]] += 1
            if q["ev"] == "share":
                shares[day][q.get("how", "?")] += 1
            if q["ev"] == "arrive":
                arrivals[day][f'{q.get("src", "?")}/{q.get("med", "")}'] += 1
            if q["ev"] == "over" and q.get("s", "").isdigit():
                scores[day].append(int(q["s"]))
        elif "utm_source" in q and not url.path.startswith(("/_next", "/api", "/games/")):
            visits[day][f'{q["utm_source"]}/{q.get("utm_medium", "")}'] += 1

    days = sorted(set(events) | set(visits))
    if not days:
        print("No game events or tagged visits in this log.")
        return
    for day in days:
        ev = events[day]
        print(f"\n== {day}")
        print(f"  runs started: {ev['run']}   runs finished: {ev['over']}   bonus ships hit: {ev['bonus']}")
        if scores[day]:
            s = sorted(scores[day])
            print(f"  scores: median {s[len(s) // 2]}, best {s[-1]}")
        shared = sum(shares[day].values())
        print(f"  share button pressed: {ev['share_tap']}   results shared: {shared} {dict(shares[day]) if shared else ''}")
        print(f"  game-over clicks: recommended game {ev['rec']}, more games {ev['more']}")
        if visits[day]:
            print("  visits to the portal by tag:")
            for tag, n in visits[day].most_common():
                print(f"    {tag:28s} {n}")
        if arrivals[day]:
            print("  arrivals seen by the game:", dict(arrivals[day]))
        from_shares = visits[day].get("share/score", 0)
        if shared:
            print(f"  visits per shared result: {from_shares / shared:.2f}  ({from_shares} visits / {shared} shares)")


if __name__ == "__main__":
    sys.exit(main())
