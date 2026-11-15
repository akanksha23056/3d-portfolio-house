"""Normalize transform/scale of a 3D GLB asset and optimize for WebGL delivery.

Follows Phase 4 of `.agent/rules/3d_pipeline.md`:
1. Horizontal centering at (X=0, Z=0) and exact floor snapping so lowest vertex sits at Y=0.
2. Optional real-world scale normalization (`--height` in meters, e.g., 1.75 for humanoid, 0.75 for desk).
3. Web optimization via `@gltf-transform/cli` (`--compress draco --texture-compress webp`).

Usage:
    python ./tools/3d_pipeline/normalize_and_optimize.py <input.glb> <output.glb> [--height 1.75] [--skip-optimize]
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import trimesh


def _find_gltf_transform():
    """Locate gltf-transform executable cleanly on Windows or POSIX."""
    for candidate in ("gltf-transform.cmd", "gltf-transform"):
        path = shutil.which(candidate)
        if path:
            return path
    npm_appdata = os.path.join(os.environ.get("APPDATA", ""), "npm", "gltf-transform.cmd")
    if os.path.exists(npm_appdata):
        return npm_appdata
    return None


def normalize_glb(input_glb: str, dest_glb: str, target_height: float | None = None):
    """Center horizontally on (X=0, Z=0), snap lowest Y to 0, and optionally normalize height."""
    scene = trimesh.load(input_glb, force="scene")
    bounds = scene.bounds
    if bounds is None:
        raise RuntimeError(f"Could not compute bounding box for {input_glb}")

    min_pt, max_pt = bounds[0], bounds[1]
    current_height = float(max_pt[1] - min_pt[1])
    if current_height <= 1e-6:
        raise RuntimeError(f"Degenerate height ({current_height}) in {input_glb}")

    scale_factor = 1.0
    if target_height is not None and target_height > 0:
        scale_factor = float(target_height) / current_height
        scene.apply_transform(trimesh.transformations.scale_matrix(scale_factor))
        bounds = scene.bounds
        min_pt, max_pt = bounds[0], bounds[1]

    center_x = float((min_pt[0] + max_pt[0]) * 0.5)
    min_y = float(min_pt[1])
    center_z = float((min_pt[2] + max_pt[2]) * 0.5)

    translation = trimesh.transformations.translation_matrix([-center_x, -min_y, -center_z])
    scene.apply_transform(translation)

    final_bounds = scene.bounds
    dims = final_bounds[1] - final_bounds[0]
    print(
        f"[normalize] Normalized bounds X=[{final_bounds[0][0]:.3f}, {final_bounds[1][0]:.3f}], "
        f"Y=[{final_bounds[0][1]:.3f}, {final_bounds[1][1]:.3f}], "
        f"Z=[{final_bounds[0][2]:.3f}, {final_bounds[1][2]:.3f}] "
        f"(W={dims[0]:.3f}m, H={dims[1]:.3f}m, D={dims[2]:.3f}m)"
    )

    scene.export(dest_glb)
    return dest_glb


def optimize_glb(normalized_glb: str, output_glb: str):
    """Run gltf-transform optimize with Draco mesh compression and WebP textures."""
    cli = _find_gltf_transform()
    if not cli:
        raise RuntimeError(
            "gltf-transform CLI not found. Install via `npm.cmd install -g @gltf-transform/cli`."
        )

    cmd = [
        cli,
        "optimize",
        normalized_glb,
        output_glb,
        "--compress",
        "draco",
        "--texture-compress",
        "webp",
    ]
    print(f"[optimize] Running: {' '.join(cmd)}")
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode == 0 and os.path.exists(output_glb):
        in_kb = os.path.getsize(normalized_glb) / 1024.0
        out_kb = os.path.getsize(output_glb) / 1024.0
        print(f"[optimize] Done: {in_kb:.1f} KB -> {out_kb:.1f} KB ({output_glb})")
        return output_glb

    # Fallback: try optimize without webp (e.g., if mesh has no textures or sharp isn't present)
    print(
        f"[optimize] Full Draco+WebP pass failed ({proc.stderr.strip()}); retrying with Draco only...",
        file=sys.stderr,
    )
    fallback_cmd = [cli, "optimize", normalized_glb, output_glb, "--compress", "draco"]
    proc2 = subprocess.run(fallback_cmd, capture_output=True, text=True, check=False)
    if proc2.returncode == 0 and os.path.exists(output_glb):
        print(f"[optimize] Done (Draco fallback) -> {output_glb}")
        return output_glb

    raise RuntimeError(f"gltf-transform optimize failed:\n{proc2.stdout}\n{proc2.stderr}")


def process_glb(
    input_glb: str,
    output_glb: str,
    target_height: float | None = None,
    skip_optimize: bool = False,
) -> str:
    if not os.path.exists(input_glb):
        raise FileNotFoundError(f"Input GLB not found: {input_glb}")

    out_dir = os.path.dirname(os.path.abspath(output_glb))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    if skip_optimize:
        return normalize_glb(input_glb, output_glb, target_height=target_height)

    with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        normalize_glb(input_glb, tmp_path, target_height=target_height)
        return optimize_glb(tmp_path, output_glb)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def main():
    parser = argparse.ArgumentParser(
        description="Normalize transform/scale (X=0, Y_min=0, Z=0) and optimize GLB with Draco + WebP."
    )
    parser.add_argument("input_glb", help="Path to source .glb asset.")
    parser.add_argument("output_glb", help="Destination path for normalized + optimized .glb.")
    parser.add_argument(
        "--height",
        type=float,
        default=None,
        help="Optional target height in meters (e.g., 1.75 for humanoid, 0.75 for desk).",
    )
    parser.add_argument(
        "--skip-optimize",
        action="store_true",
        help="Only normalize transform/scale and skip gltf-transform optimize.",
    )
    args = parser.parse_args()
    process_glb(
        args.input_glb,
        args.output_glb,
        target_height=args.height,
        skip_optimize=args.skip_optimize,
    )


if __name__ == "__main__":
    main()
