"""Minimal GitHub Contents / Git Data API client.

Commits all generated files in one atomic commit so the daily job never leaves
the repository in a half-updated state.
"""

from __future__ import annotations

import base64
import json
import time
from typing import Any

import requests

API = "https://api.github.com"


class GitHubError(RuntimeError):
    pass


class GitHubPublisher:
    def __init__(self, repo: str, token: str, branch: str = "main") -> None:
        if "/" not in repo:
            raise GitHubError(f"GITHUB_REPO must look like owner/name, got {repo!r}")
        self.repo = repo
        self.token = token
        self.branch = branch
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "x-bangdan-collector",
            }
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        url = f"{API}/repos/{self.repo}{path}"
        for attempt in range(4):
            response = self.session.request(method, url, timeout=45, **kwargs)
            if response.status_code == 429 or response.status_code >= 500:
                time.sleep(2**attempt)
                continue
            return response
        return response

    def get_json(self, path: str) -> dict[str, Any] | None:
        response = self._request("GET", f"/contents/{path}?ref={self.branch}")
        if response.status_code == 404:
            return None
        if not response.ok:
            raise GitHubError(f"GET {path}: {response.status_code} {response.text[:200]}")
        payload = response.json()
        content = payload.get("content", "")
        if not content and payload.get("download_url"):
            raw = requests.get(payload["download_url"], timeout=45)
            raw.raise_for_status()
            return raw.json()
        try:
            decoded = base64.b64decode(content).decode("utf-8")
            return json.loads(decoded)
        except (ValueError, json.JSONDecodeError) as error:
            raise GitHubError(f"无法解析 {path}: {error}") from error

    def get_text(self, path: str) -> str | None:
        response = self._request("GET", f"/contents/{path}?ref={self.branch}")
        if response.status_code == 404:
            return None
        if not response.ok:
            raise GitHubError(f"GET {path}: {response.status_code} {response.text[:200]}")
        payload = response.json()
        content = payload.get("content", "")
        if not content and payload.get("download_url"):
            raw = requests.get(payload["download_url"], timeout=45)
            raw.raise_for_status()
            return raw.text
        return base64.b64decode(content).decode("utf-8")

    def commit_files(
        self,
        files: dict[str, str],
        message: str,
        delete_paths: list[str] | tuple[str, ...] = (),
    ) -> dict[str, Any]:
        """Create one commit containing every file that actually changed."""
        changed: dict[str, str] = {}
        for path, content in files.items():
            existing = self.get_text(path)
            if existing != content:
                changed[path] = content

        deleted = [path for path in delete_paths if self.get_text(path) is not None]
        if not changed and not deleted:
            return {"changed": [], "deleted": [], "sha": None, "message": "no changes"}

        ref = self._request("GET", f"/git/ref/heads/{self.branch}")
        if not ref.ok:
            raise GitHubError(
                f"读取分支 {self.branch} 失败（{ref.status_code}）。请确认仓库已初始化且分支存在。"
            )
        head_sha = ref.json()["object"]["sha"]

        head = self._request("GET", f"/git/commits/{head_sha}")
        head.raise_for_status()
        base_tree = head.json()["tree"]["sha"]

        blobs: list[dict[str, Any]] = []
        for path, content in changed.items():
            blob = self._request(
                "POST",
                "/git/blobs",
                json={"content": content, "encoding": "utf-8"},
            )
            blob.raise_for_status()
            blobs.append(
                {
                    "path": path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob.json()["sha"],
                }
            )

        for path in deleted:
            blobs.append(
                {
                    "path": path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": None,
                }
            )

        tree = self._request(
            "POST",
            "/git/trees",
            json={"base_tree": base_tree, "tree": blobs},
        )
        tree.raise_for_status()

        commit = self._request(
            "POST",
            "/git/commits",
            json={
                "message": message,
                "tree": tree.json()["sha"],
                "parents": [head_sha],
            },
        )
        commit.raise_for_status()
        commit_sha = commit.json()["sha"]

        update = self._request(
            "PATCH",
            f"/git/refs/heads/{self.branch}",
            json={"sha": commit_sha, "force": False},
        )
        update.raise_for_status()

        return {
            "changed": sorted(changed),
            "deleted": sorted(deleted),
            "sha": commit_sha,
            "message": message,
            "url": f"https://github.com/{self.repo}/commit/{commit_sha}",
        }
