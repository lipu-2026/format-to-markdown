from __future__ import annotations

import shutil
import os
import subprocess
import tempfile
import threading
from pathlib import Path

from app import AppHandler, ThreadingHTTPServer


CREATE_NO_WINDOW = 0x08000000


def find_desktop_browser() -> Path | None:
    candidates = [
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    ]
    for command in ("msedge", "chrome"):
        found = shutil.which(command)
        if found:
            candidates.append(Path(found))
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        candidates.extend(Path(local_app_data) / name for name in (
            "Google/Chrome/Application/chrome.exe", "Microsoft/Edge/Application/msedge.exe"))
    return next((path for path in candidates if path.is_file()), None)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), AppHandler)
    server.daemon_threads = True
    host, port = server.server_address
    url = f"http://{host}:{port}"

    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    try:
        browser_path = find_desktop_browser()
        if browser_path:
            with tempfile.TemporaryDirectory(prefix="format-to-markdown-", ignore_cleanup_errors=True) as profile_dir:
                process = subprocess.Popen(
                    [
                        str(browser_path),
                        f"--app={url}",
                        f"--user-data-dir={profile_dir}",
                        "--no-first-run",
                        "--disable-sync",
                        "--disable-extensions",
                        "--window-size=1440,980",
                    ],
                    creationflags=CREATE_NO_WINDOW,
                )
                process.wait()
        else:
            raise RuntimeError("未找到 Edge 或 Chrome。请先安装其中一种浏览器，再打开墨转。")
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=3)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        import ctypes
        ctypes.windll.user32.MessageBoxW(None, "墨转启动失败：\n" + str(exc), "墨转 · 启动提示", 0x10)
