#!/usr/bin/env python3
"""
Autonomous Visual Tour & Screenshot Audit Engine
Executes complete automated UI validation with Playwright and generates visual reports.
"""

import os
import sys
import time
import socket
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

OUTPUT_DIR = Path("visual-audit-results")
PORT = 8080

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress standard logging to keep test output clean
        pass

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_server(port=PORT):
    if is_port_in_use(port):
        print(f"[Server] Port {port} is already active.")
        return None
    server = HTTPServer(('127.0.0.1', port), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    print(f"[Server] Local HTTP server active on http://127.0.0.1:{port}")
    return server

def run_audit():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    server = start_server(PORT)
    time.sleep(1)

    from playwright.sync_api import sync_playwright

    print("=" * 70)
    print("STARTING AUTONOMOUS LEAD QA VISUAL AUDIT TOUR")
    print("=" * 70)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                device_scale_factor=1
            )
            page = context.new_page()

            # --- STEP 1: Hero Landing & Countdown Banner ---
            print("\n[Step 1/4] Navigating to Home Page (Hero & Countdown Banner)...")
            url = f"http://127.0.0.1:{PORT}/index.html"
            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(1000)
            
            hero_path = OUTPUT_DIR / "01-hero-landing.png"
            page.screenshot(path=str(hero_path), full_page=False)
            print(f"  ✓ Captured: {hero_path} ({hero_path.stat().st_size / 1024:.1f} KB)")

            # --- STEP 2: Community Animated Stat Counters ---
            print("\n[Step 2/4] Scrolling to Community Stats Section & Triggering Counter Animation...")
            stats_section = page.locator("#about .stats")
            stats_section.scroll_into_view_if_needed()
            # Wait for 2.2s counter animation to complete
            page.wait_for_timeout(2300)
            
            stats_path = OUTPUT_DIR / "02-animated-counters.png"
            page.screenshot(path=str(stats_path), full_page=False)
            print(f"  ✓ Captured: {stats_path} ({stats_path.stat().st_size / 1024:.1f} KB)")

            # --- STEP 3: Sticky Spotify-Style Sermon Player ---
            print("\n[Step 3/4] Triggering Global playSermon() Action for Floating Audio Player...")
            page.evaluate("""
                window.playSermon({
                    title: 'Walking in the Light of Christ',
                    speaker: 'Pastor Gilbert Baidya',
                    passage: '1 John 1:5-10',
                    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                    coverImg: 'images/community-worship.png'
                });
            """)
            page.wait_for_timeout(800)
            
            player_path = OUTPUT_DIR / "03-sermon-player-active.png"
            page.screenshot(path=str(player_path), full_page=False)
            print(f"  ✓ Captured: {player_path} ({player_path.stat().st_size / 1024:.1f} KB)")

            # --- STEP 4: Accessible Modals & Song Details Dialog ---
            print("\n[Step 4/4] Navigating to Songbook & Opening Accessible Song Modal...")
            songbook_url = f"http://127.0.0.1:{PORT}/songbook.html"
            page.goto(songbook_url, wait_until="networkidle")
            page.wait_for_selector(".song-card")
            page.click(".song-card:first-child")
            page.wait_for_timeout(600)
            
            modal_path = OUTPUT_DIR / "04-accessible-modals.png"
            page.screenshot(path=str(modal_path), full_page=False)
            print(f"  ✓ Captured: {modal_path} ({modal_path.stat().st_size / 1024:.1f} KB)")

            browser.close()

        print("\n" + "=" * 70)
        print("AUTONOMOUS VISUAL AUDIT TOUR COMPLETED SUCCESSFULLY")
        print("=" * 70)
        return True

    except Exception as e:
        print(f"\n[ERROR] Visual audit failed: {e}", file=sys.stderr)
        return False

    finally:
        if server:
            print("\n[Server] Shutting down local HTTP server...")
            server.shutdown()
            print("[Server] Server stopped cleanly.")

if __name__ == "__main__":
    success = run_audit()
    sys.exit(0 if success else 1)
