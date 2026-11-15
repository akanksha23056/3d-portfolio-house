"""Convert a studio-lit white-background 2D concept image into a 3D GLB mesh.

Follows Phase 2 Rule 3 of `.agent/rules/3d_pipeline.md`:
Primary generator: `tencent/Hunyuan3D-2` via Hugging Face `gradio_client`.
Fallback generator: `microsoft/TRELLIS`.

Usage:
    python ./tools/3d_pipeline/img_to_3d.py <image_path> <output_path> [--space hunyuan|trellis]
"""

import argparse
import os
import shutil
import sys
from gradio_client import Client, handle_file


def _extract_output_path(result):
    """Extract a local file path string from heterogeneous Gradio Space responses."""
    if isinstance(result, str) and os.path.exists(result):
        return result
    if isinstance(result, dict):
        for key in ("value", "path", "url"):
            val = result.get(key)
            if isinstance(val, str) and os.path.exists(val):
                return val
    if isinstance(result, (list, tuple)):
        for item in result:
            extracted = _extract_output_path(item)
            if extracted:
                return extracted
    return None


def generate_via_hunyuan(image_path: str):
    """Generate a 3D mesh using tencent/Hunyuan3D-2 (/generation_all then /shape_generation fallback)."""
    client = Client("tencent/Hunyuan3D-2")
    common_kwargs = {
        "caption": None,
        "image": handle_file(image_path),
        "mv_image_front": None,
        "mv_image_back": None,
        "mv_image_left": None,
        "mv_image_right": None,
        "steps": 30,
        "guidance_scale": 5.5,
        "seed": 1234,
        "octree_resolution": 256,
        "check_box_rembg": True,
        "num_chunks": 8000,
        "randomize_seed": True,
    }

    try:
        print("[img_to_3d] Trying tencent/Hunyuan3D-2 /generation_all (shape + texture)...")
        result = client.predict(**common_kwargs, api_name="/generation_all")
        if isinstance(result, (list, tuple)) and len(result) >= 2:
            textured = _extract_output_path(result[1])
            if textured:
                return textured
            mesh_only = _extract_output_path(result[0])
            if mesh_only:
                return mesh_only
        out_file = _extract_output_path(result)
        if out_file:
            return out_file
    except Exception as exc:
        print(f"[img_to_3d] /generation_all failed ({exc}); falling back to /shape_generation...", file=sys.stderr)

    result = client.predict(**common_kwargs, api_name="/shape_generation")
    out_file = _extract_output_path(result)
    if not out_file or not os.path.exists(out_file):
        raise RuntimeError(f"Unexpected output from tencent/Hunyuan3D-2: {result!r}")
    return out_file


def generate_via_trellis(image_path: str):
    """Fallback 3D mesh generator using microsoft/TRELLIS."""
    client = Client("microsoft/TRELLIS")
    client.predict(api_name="/start_session")
    preprocessed = client.predict(
        image=handle_file(image_path),
        api_name="/preprocess_image",
    )
    proc_img = _extract_output_path(preprocessed) or image_path
    client.predict(
        image=handle_file(proc_img),
        multiimages=[],
        seed=42,
        ss_guidance_strength=7.5,
        ss_sampling_steps=12,
        slat_guidance_strength=3.0,
        slat_sampling_steps=12,
        multiimage_algo="stochastic",
        api_name="/image_to_3d",
    )
    glb_result = client.predict(
        mesh_simplify=0.95,
        texture_size=1024,
        api_name="/extract_glb",
    )
    out_file = _extract_output_path(glb_result)
    if not out_file or not os.path.exists(out_file):
        raise RuntimeError(f"Unexpected output from microsoft/TRELLIS: {glb_result!r}")
    return out_file


def generate_glb(image_path: str, output_path: str, preferred_space: str = "hunyuan") -> str:
    """Convert image_path to a .glb at output_path with automatic fallback."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Input image not found: {image_path}")

    out_dir = os.path.dirname(os.path.abspath(output_path))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    generators = (
        [("tencent/Hunyuan3D-2", generate_via_hunyuan), ("microsoft/TRELLIS", generate_via_trellis)]
        if preferred_space == "hunyuan"
        else [("microsoft/TRELLIS", generate_via_trellis), ("tencent/Hunyuan3D-2", generate_via_hunyuan)]
    )

    last_err = None
    for name, fn in generators:
        try:
            print(f"[img_to_3d] Calling Hugging Face Space: {name}...")
            out_file = fn(image_path)
            shutil.copyfile(out_file, output_path)
            print(f"[img_to_3d] Success via {name} -> {output_path}")
            return output_path
        except Exception as exc:
            last_err = exc
            print(f"[img_to_3d] {name} failed: {exc}", file=sys.stderr)

    raise RuntimeError(f"All Image-to-3D generators failed. Last error: {last_err}")


def main():
    parser = argparse.ArgumentParser(description="Generate a 3D .glb from a studio 2D reference image.")
    parser.add_argument("image_path", help="Path to the input PNG/JPG/WebP image (#FFFFFF background).")
    parser.add_argument("output_path", help="Destination .glb path.")
    parser.add_argument(
        "--space",
        choices=("hunyuan", "trellis"),
        default="hunyuan",
        help="Primary Hugging Face Space to try first (default: hunyuan).",
    )
    args = parser.parse_args()
    generate_glb(args.image_path, args.output_path, preferred_space=args.space)


if __name__ == "__main__":
    main()
