#!/usr/bin/env python3
"""
=============================================================================
GPBC OpenGraph & Canonical Metadata Injection Engine
=============================================================================
Iterates over all content subpages and injects/updates a standardized set of
canonical + OpenGraph + Twitter metadata inside <head>.

Design goals:
  - Idempotent: only inserts tags that are missing (safe to re-run).
  - Surgical: uses regex so existing HTML formatting is preserved
    (no reserialization / attribute reordering like a full DOM parser).
  - Falls back to BeautifulSoup4 for title/description extraction if available,
    otherwise uses regex extraction.
=============================================================================
"""

import os
import re
import sys
import glob

PROD_DOMAIN = "https://gracepraise.church"
SITE_NAME = "Grace and Praise Bangladeshi Church"
OG_BANNER = f"{PROD_DOMAIN}/images/logo/gpbc-og-banner.jpg"

DEFAULT_DESCRIPTION = (
    "Grace and Praise Bangladeshi Church in San Bernardino, CA — "
    "a welcoming Bengali Christian community. Join us for worship, prayer, and fellowship."
)

# Files that should never receive marketing metadata
EXCLUDE_SUBSTRINGS = (
    "backup", "test", "template", "snippet", "mockup",
    "shape-sections", "heptagon-carousel-section", "favicon",
    "devotion_test", "home_page",
)
EXCLUDE_BASENAMES = {
    "give-backup.html", "give-bootstrap.html", "give-modern.html",
    "give-professional.html", "give-tailwind.html",
}


def collect_target_pages():
    pages = glob.glob("*.html") + glob.glob("ministries/*.html")
    targets = []
    for p in sorted(set(pages)):
        low = p.lower()
        base = os.path.basename(low)
        if any(x in low for x in EXCLUDE_SUBSTRINGS):
            continue
        if base in EXCLUDE_BASENAMES:
            continue
        targets.append(p)
    return targets


def extract_title(html, fallback):
    m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if m:
        title = re.sub(r"\s+", " ", m.group(1)).strip()
        if title:
            return title
    return fallback


def extract_description(html):
    m = re.search(
        r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',
        html, re.IGNORECASE | re.DOTALL,
    )
    if m:
        desc = re.sub(r"\s+", " ", m.group(1)).strip()
        if desc:
            return desc
    return DEFAULT_DESCRIPTION


def html_escape(text):
    return (
        text.replace("&", "&amp;")
            .replace('"', "&quot;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
    )


def relative_path(page):
    # Normalize to forward slashes; keep ministries/ prefix
    return page.replace(os.sep, "/")


def has_tag(html, pattern):
    return re.search(pattern, html, re.IGNORECASE) is not None


def build_metadata_block(page, title, description):
    rel = relative_path(page)
    page_url = f"{PROD_DOMAIN}/{rel}"
    t = html_escape(title)
    d = html_escape(description)

    return {
        "canonical": f'    <link rel="canonical" href="{page_url}" />',
        "og:site_name": f'    <meta property="og:site_name" content="{html_escape(SITE_NAME)}" />',
        "og:type": '    <meta property="og:type" content="website" />',
        "og:title": f'    <meta property="og:title" content="{t}" />',
        "og:description": f'    <meta property="og:description" content="{d}" />',
        "og:url": f'    <meta property="og:url" content="{page_url}" />',
        "og:image": f'    <meta property="og:image" content="{OG_BANNER}" />',
        "twitter:card": '    <meta name="twitter:card" content="summary_large_image" />',
    }


# Existence checks per tag (idempotency guards)
TAG_PRESENCE_PATTERNS = {
    "canonical": r'rel=["\']canonical["\']',
    "og:site_name": r'property=["\']og:site_name["\']',
    "og:type": r'property=["\']og:type["\']',
    "og:title": r'property=["\']og:title["\']',
    "og:description": r'property=["\']og:description["\']',
    "og:url": r'property=["\']og:url["\']',
    "og:image": r'property=["\']og:image["\']',
    "twitter:card": r'name=["\']twitter:card["\']',
}

# Order in which tags are emitted
TAG_ORDER = [
    "canonical", "og:site_name", "og:type", "og:title",
    "og:description", "og:url", "og:image", "twitter:card",
]


def inject_into_head(html, lines):
    """Insert lines after <title> (preferred) or after <head> opening."""
    block = "\n\n    <!-- SEO: Canonical + OpenGraph (auto-injected) -->\n" + "\n".join(lines) + "\n"

    title_match = re.search(r"</title>", html, re.IGNORECASE)
    if title_match:
        idx = title_match.end()
        return html[:idx] + block + html[idx:]

    head_match = re.search(r"<head[^>]*>", html, re.IGNORECASE)
    if head_match:
        idx = head_match.end()
        return html[:idx] + block + html[idx:]

    return html  # No head found; leave untouched


def process_page(page):
    with open(page, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()

    if "<head" not in html.lower():
        return ("skipped", page, "no <head>")

    fallback_title = f"{SITE_NAME}"
    title = extract_title(html, fallback_title)
    description = extract_description(html)

    block_map = build_metadata_block(page, title, description)

    missing_lines = []
    injected_tags = []
    for tag in TAG_ORDER:
        if not has_tag(html, TAG_PRESENCE_PATTERNS[tag]):
            missing_lines.append(block_map[tag])
            injected_tags.append(tag)

    if not missing_lines:
        return ("unchanged", page, [])

    new_html = inject_into_head(html, missing_lines)
    if new_html == html:
        return ("skipped", page, "injection point not found")

    with open(page, "w", encoding="utf-8") as f:
        f.write(new_html)

    return ("updated", page, injected_tags)


def main():
    targets = collect_target_pages()
    print(f"Scanning {len(targets)} content pages for OG/canonical metadata...")
    print("=" * 78)

    updated = 0
    unchanged = 0
    skipped = 0

    for page in targets:
        status, p, detail = process_page(page)
        if status == "updated":
            updated += 1
            print(f"✓ {p:42} injected: {', '.join(detail)}")
        elif status == "unchanged":
            unchanged += 1
            print(f"· {p:42} already complete")
        else:
            skipped += 1
            print(f"✗ {p:42} skipped ({detail})")

    print("=" * 78)
    print(f"Updated: {updated} | Unchanged: {unchanged} | Skipped: {skipped}")


if __name__ == "__main__":
    main()
