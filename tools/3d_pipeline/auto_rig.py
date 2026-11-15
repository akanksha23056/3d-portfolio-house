"""Auto-rig a static T-pose/A-pose character mesh into an armature-bound .glb.

Follows Phase 3 Option B of `.agent/rules/3d_pipeline.md`:
- `--mode cloud`: Uses Hugging Face auto-rigging Spaces (`VAST-AI/UniRig` -> `Mycelabs/Mesh_Rigger`).
- `--mode blender`: Uses headless Blender (`C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe`)
  with Rigify (`rigify_generate()`) + automatic bone heat weights (`ARMATURE_AUTO`).
- `--mode auto` (default): Tries cloud auto-rigging first, then falls back to local Blender Rigify.

Usage:
    python ./tools/3d_pipeline/auto_rig.py <input.glb> <output.glb> [--mode auto|cloud|blender]
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile

DEFAULT_BLENDER = os.environ.get(
    "BLENDER_PATH",
    r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
)

BLENDER_RIG_SCRIPT = r"""
import bpy
import sys
from mathutils import Vector

argv = sys.argv
if "--" not in argv:
    raise RuntimeError("Expected '-- <input_glb> <output_glb>'")
in_glb, out_glb = argv[argv.index("--") + 1 : argv.index("--") + 3]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=in_glb)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not meshes:
    raise RuntimeError("No mesh objects found in input GLB.")

bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
target_mesh = bpy.context.view_layer.objects.active

# Compute mesh height and center
coords = [target_mesh.matrix_world @ Vector(corner) for corner in target_mesh.bound_box]
min_z = min(v.z for v in coords)
max_z = max(v.z for v in coords)
height = max(0.01, max_z - min_z)

# Enable Rigify addon (supports both legacy and Blender 4.2+/5.x core extension paths)
rigify_enabled = False
for mod_name in ("rigify", "bl_ext.blender_org.rigify"):
    try:
        bpy.ops.preferences.addon_enable(module=mod_name)
        rigify_enabled = True
        break
    except Exception:
        pass

armature_obj = None
if rigify_enabled and hasattr(bpy.ops.object, "armature_human_metarig_add"):
    bpy.ops.object.armature_human_metarig_add()
    metarig = bpy.context.view_layer.objects.active
    rig_coords = [metarig.matrix_world @ Vector(c) for c in metarig.bound_box]
    rig_height = max(0.01, max(v.z for v in rig_coords) - min(v.z for v in rig_coords))
    scale_factor = height / rig_height
    metarig.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    try:
        bpy.ops.pose.rigify_generate()
        generated = bpy.context.view_layer.objects.active
        if generated and generated.type == "ARMATURE":
            armature_obj = generated
            bpy.data.objects.remove(metarig, do_unlink=True)
        else:
            armature_obj = metarig
    except Exception as exc:
        print(f"[auto_rig] rigify_generate fallback to metarig: {exc}")
        armature_obj = metarig
else:
    # Minimal fallback humanoid armature if Rigify extension is unavailable
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, min_z))
    armature_obj = bpy.context.view_layer.objects.active
    eb = armature_obj.data.edit_bones
    hips = eb[0]
    hips.name = "Hips"
    hips.head = (0, 0, min_z + height * 0.48)
    hips.tail = (0, 0, min_z + height * 0.58)
    spine = eb.new("Spine")
    spine.head = hips.tail
    spine.tail = (0, 0, min_z + height * 0.80)
    spine.parent = hips
    head = eb.new("Head")
    head.head = spine.tail
    head.tail = (0, 0, max_z)
    head.parent = spine
    bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.object.select_all(action="DESELECT")
target_mesh.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format="GLB",
    export_animations=True,
    export_skins=True,
)
print(f"[auto_rig] Exported rigged GLB -> {out_glb}")
"""


def _extract_file(result):
    if isinstance(result, str) and os.path.exists(result):
        return result
    if isinstance(result, dict):
        for k in ("value", "path", "url"):
            v = result.get(k)
            if isinstance(v, str) and os.path.exists(v):
                return v
    if isinstance(result, (list, tuple)):
        for item in result:
            found = _extract_file(item)
            if found:
                return found
    return None


def rig_via_cloud(input_glb: str, output_glb: str) -> str:
    """Attempt cloud auto-rigging using VAST-AI/UniRig then Mycelabs/Mesh_Rigger."""
    from gradio_client import Client, handle_file

    attempts = [
        ("VAST-AI/UniRig", "/predict", lambda c: c.predict(handle_file(input_glb))),
        ("Mycelabs/Mesh_Rigger", None, lambda c: c.predict(handle_file(input_glb))),
    ]
    last_err = None
    for space_id, _, fn in attempts:
        try:
            print(f"[auto_rig] Trying Hugging Face Space: {space_id}...")
            client = Client(space_id)
            res = fn(client)
            rigged_path = _extract_file(res)
            if rigged_path:
                shutil.copyfile(rigged_path, output_glb)
                print(f"[auto_rig] Rigged via {space_id} -> {output_glb}")
                return output_glb
        except Exception as exc:
            last_err = exc
            print(f"[auto_rig] {space_id} failed: {exc}", file=sys.stderr)
    raise RuntimeError(f"Cloud auto-rigging failed: {last_err}")


def rig_via_blender(input_glb: str, output_glb: str, blender_exe: str = DEFAULT_BLENDER) -> str:
    """Rig a static character GLB locally using headless Blender + Rigify."""
    if not os.path.exists(blender_exe):
        raise FileNotFoundError(f"Blender executable not found at: {blender_exe}")

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(BLENDER_RIG_SCRIPT)
        script_path = tmp.name

    try:
        cmd = [
            blender_exe,
            "-b",
            "--python-exit-code",
            "1",
            "--python",
            script_path,
            "--",
            os.path.abspath(input_glb),
            os.path.abspath(output_glb),
        ]
        print(f"[auto_rig] Running headless Blender Rigify...")
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode != 0 or not os.path.exists(output_glb):
            raise RuntimeError(
                f"Blender Rigify exited {proc.returncode}:\n{proc.stdout}\n{proc.stderr}"
            )
        print(f"[auto_rig] Blender Rigify succeeded -> {output_glb}")
        return output_glb
    finally:
        if os.path.exists(script_path):
            os.remove(script_path)


def auto_rig(input_glb: str, output_glb: str, mode: str = "auto") -> str:
    if not os.path.exists(input_glb):
        raise FileNotFoundError(f"Input GLB not found: {input_glb}")

    out_dir = os.path.dirname(os.path.abspath(output_glb))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    if mode == "cloud":
        return rig_via_cloud(input_glb, output_glb)
    if mode == "blender":
        return rig_via_blender(input_glb, output_glb)

    try:
        return rig_via_cloud(input_glb, output_glb)
    except Exception as exc:
        print(f"[auto_rig] Cloud fallback -> Blender Rigify ({exc})", file=sys.stderr)
        return rig_via_blender(input_glb, output_glb)


def main():
    parser = argparse.ArgumentParser(description="Auto-rig a static character .glb mesh.")
    parser.add_argument("input_glb", help="Path to input static .glb file.")
    parser.add_argument("output_glb", help="Path to output rigged .glb file.")
    parser.add_argument(
        "--mode",
        choices=("auto", "cloud", "blender"),
        default="auto",
        help="Rigging backend (default: auto = cloud then local Blender Rigify).",
    )
    args = parser.parse_args()
    auto_rig(args.input_glb, args.output_glb, mode=args.mode)


if __name__ == "__main__":
    main()
