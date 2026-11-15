#!/usr/bin/env python3
"""Open the static project over localhost; no packages or build step required."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser


def main():
    root = Path(__file__).resolve().parent
    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        url = f"http://127.0.0.1:{server.server_port}/"
        print(f"\nARES NAV is running at {url}", flush=True)
        print("Keep this Terminal window open. Press Control-C to stop.\n", flush=True)
        # The socket is already listening; serve_forever starts before the browser opens.
        opener = threading.Timer(0.25, webbrowser.open, args=(url,))
        opener.daemon = True
        opener.start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nARES NAV stopped.")
        finally:
            opener.cancel()


if __name__ == "__main__":
    main()
