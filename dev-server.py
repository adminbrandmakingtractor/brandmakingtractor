#!/usr/bin/env python3
"""
BrandMakingTractor — local dev server with clean-URL support.

Mirrors the .htaccess rewrite rules used on Hostinger/Apache in production:
  - /about              -> about.html
  - /services           -> services.html   (even though services/ is also a
  - /services/          -> services.html      real folder holding the 7 sub-pages —
                            it has no index.html of its own, so the sibling
                            .html file always wins over a directory listing)
  - /services/branding  -> services/branding.html
  - /blog/               -> blog/index.html  (blog/ DOES have its own index.html,
                             so the real directory wins here)
  - /blog/some-slug      -> blog/post.html   (any /blog/<x> with no matching .html)

Usage: python dev-server.py [port]   (default port 8080)
Not part of the deployed site — only used for local preview.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Local dev only: prevent the browser from heuristically caching
        # HTML/CSS/JS between edits (production caching is unaffected — this
        # server never runs there).
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        clean_path = path.split("?", 1)[0].split("#", 1)[0]
        base_path = clean_path[:-1] if clean_path.endswith("/") and clean_path != "/" else clean_path

        fs_path = super().translate_path(base_path)
        html_path = fs_path + ".html"
        index_path = os.path.join(fs_path, "index.html")

        # A real directory that has its own index.html (e.g. /blog/) wins.
        if os.path.isdir(fs_path) and os.path.isfile(index_path):
            return super().translate_path(clean_path)

        # Otherwise prefer the sibling .html file — this is what makes both
        # /services and /services/ serve services.html instead of falling
        # into the services/ folder (which has no index.html of its own).
        if os.path.isfile(html_path):
            return html_path

        # Blog slug fallback: /blog/<slug> with no matching file -> post.html
        segments = [s for s in base_path.strip("/").split("/") if s]
        if len(segments) == 2 and segments[0] == "blog":
            post_path = super().translate_path("/blog/post.html")
            if os.path.isfile(post_path):
                return post_path

        return super().translate_path(clean_path)


if __name__ == "__main__":
    http.server.test(HandlerClass=CleanURLHandler, port=PORT)
