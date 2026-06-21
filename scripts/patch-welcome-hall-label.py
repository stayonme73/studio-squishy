"""Welcome Hall label patch — DISABLED.

Product decision: use clean regenerated plate v24. Do NOT inpaint or patch
welcome-hall-scene-v3.2.png. Regenerate the full scene asset instead.

@see public/welcome-hall/welcome-hall-scene-v3.2.png (v24)
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / "public" / "welcome-hall" / "welcome-hall-scene-v3.2.png"


def main() -> None:
    print(
        "patch-welcome-hall-label.py is disabled — "
        "use regenerated plate (v24), do not inpaint.",
        file=sys.stderr,
    )
    if not SCENE.exists():
        print(f"ERROR: missing runtime asset {SCENE}", file=sys.stderr)
        sys.exit(1)
    print(f"OK: runtime asset present at {SCENE.name}")


if __name__ == "__main__":
    main()
