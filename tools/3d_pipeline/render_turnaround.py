"""Render a lit 4-angle turnaround sheet (Front, Side, Back, 3/4 Perspective) in headless Blender.

Follows Phase 5 of `.agent/rules/3d_pipeline.md`:
Prevents blind delivery by automatically importing a .glb into a studio-lit scene,
rendering 4 orthographic/perspective turnaround views in Blender, and stitching them into
one labeled 1024x1024 inspection sheet for visual verification.

Usage:
    python ./tools/3d_pipeline/render_turnaround.py <input.glb> <output_sheet.png>
"""

import argparse
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw

DEFAULT_BLENDER = os.environ.get(
    "BLENDER_PATH",
    r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
)

BLENDER_TURNAROUND_SCRIPT = r"""
import bpy
import math
import os
import sys
from mathutils import Vector

argv = sys.argv
if "--" not in argv:
    raise RuntimeError("Expected '-- <input_glb> <out_dir>'")
in_glb, out_dir = argv[argv.index("--") + 1 : argv.index("--") + 3]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# Import GLB
bpy.ops.import_scene.gltf(filepath=in_glb)
meshes = [o for o in scene.objects if o.type == "MESH"]
if not meshes:
    raise RuntimeError(f"No meshes imported from {in_glb}")

# Ensure vertex colors (COLOR_0) are always bound to Principled BSDF Base Color
for obj in meshes:
    color_attrs = getattr(obj.data, "color_attributes", None)
    if color_attrs and len(color_attrs) > 0:
        attr_name = color_attrs[0].name
        for mat in obj.data.materials:
            if not mat or not mat.use_nodes:
                continue
            nt = mat.node_tree
            bsdf = nt.nodes.get("Principled BSDF")
            if bsdf and not bsdf.inputs["Base Color"].is_linked:
                vc_node = nt.nodes.new("ShaderNodeVertexColor")
                vc_node.layer_name = attr_name
                nt.links.new(vc_node.outputs["Color"], bsdf.inputs["Base Color"])

# Compute combined world-space bounding box
all_pts = []
depsgraph = bpy.context.evaluated_depsgraph_get()
for obj in meshes:
    eval_obj = obj.evaluated_get(depsgraph)
    for corner in eval_obj.bound_box:
        all_pts.append(eval_obj.matrix_world @ Vector(corner))

min_x = min(p.x for p in all_pts)
max_x = max(p.x for p in all_pts)
min_y = min(p.y for p in all_pts)
max_y = max(p.y for p in all_pts)
min_z = min(p.z for p in all_pts)
max_z = max(p.z for p in all_pts)

center = Vector(((min_x + max_x) * 0.5, (min_y + max_y) * 0.5, (min_z + max_z) * 0.5))
size = Vector((max_x - min_x, max_y - min_y, max_z - min_z))
max_dim = max(size.x, size.y, size.z, 0.25)

# Studio ground plane positioned right at min_z (or Z=0 if grounded)
bpy.ops.mesh.primitive_plane_add(size=max_dim * 6.0, location=(center.x, center.y, min_z - 0.002))
floor = bpy.context.view_layer.objects.active
floor_mat = bpy.data.materials.new(name="StudioFloorMat")
floor_mat.use_nodes = True
bsdf = floor_mat.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.72, 0.76, 0.80, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.85
floor.data.materials.append(floor_mat)

# Neutral bright studio world ambient so shadows never clip to pure black
world = bpy.data.worlds.new("StudioWorld")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
if bg:
    bg.inputs["Color"].default_value = (0.76, 0.82, 0.88, 1.0)
    bg.inputs["Strength"].default_value = 0.85

# 3-Point Studio Lighting (Key, Fill, Rim)
def add_area_light(name, location, energy, light_size, color=(1.0, 1.0, 1.0)):
    light_data = bpy.data.lights.new(name=name, type="AREA")
    light_data.energy = energy
    light_data.size = light_size
    light_data.color = color
    light_obj = bpy.data.objects.new(name=name, object_data=light_data)
    scene.collection.objects.link(light_obj)
    light_obj.location = location
    direction = center - Vector(location)
    light_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()

dist = max_dim * 2.2
add_area_light("KeyLight", (center.x + dist, center.y - dist, center.z + dist * 1.1), 160 * (max_dim ** 2), max_dim * 1.5, (1.0, 0.96, 0.90))
add_area_light("FillLight", (center.x - dist * 1.2, center.y - dist * 0.6, center.z + dist * 0.6), 85 * (max_dim ** 2), max_dim * 2.0, (0.88, 0.94, 1.0))
add_area_light("RimLight", (center.x - dist * 0.3, center.y + dist * 1.3, center.z + dist * 0.9), 110 * (max_dim ** 2), max_dim * 1.2, (1.0, 0.98, 0.95))

# Camera setup
cam_data = bpy.data.cameras.new("TurnaroundCam")
cam_data.lens = 45
cam_obj = bpy.data.objects.new("TurnaroundCam", cam_data)
scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Select fastest compatible raster/ray engine in Blender 5.x/4.x
for eng in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "CYCLES"):
    try:
        scene.render.engine = eng
        if eng == "CYCLES":
            scene.cycles.samples = 24
        break
    except Exception:
        pass

scene.render.resolution_x = 512
scene.render.resolution_y = 512
scene.render.image_settings.file_format = "PNG"

cam_dist = max_dim * 2.15
views = [
    ("front", Vector((center.x, center.y - cam_dist, center.z + size.z * 0.12))),
    ("side", Vector((center.x + cam_dist, center.y, center.z + size.z * 0.12))),
    ("back", Vector((center.x, center.y + cam_dist, center.z + size.z * 0.12))),
    ("perspective", Vector((center.x + cam_dist * 0.72, center.y - cam_dist * 0.72, center.z + cam_dist * 0.45))),
]

for label, cam_pos in views:
    cam_obj.location = cam_pos
    direction = center - cam_pos
    cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(out_dir, f"{label}.png")
    bpy.ops.render.render(write_still=True)

print(f"[render_turnaround] Rendered 4 views into {out_dir}")
"""


def stitch_turnaround(temp_dir: str, output_sheet: str) -> str:
    """Combine front/side/back/perspective 512x512 renders into a labeled 1024x1024 2x2 grid."""
    layout = [
        ("front.png", "1. FRONT", (0, 0)),
        ("side.png", "2. SIDE (RIGHT)", (512, 0)),
        ("back.png", "3. BACK", (0, 512)),
        ("perspective.png", "4. 3/4 PERSPECTIVE", (512, 512)),
    ]
    sheet = Image.new("RGB", (1024, 1024), (240, 244, 248))
    draw = ImageDraw.Draw(sheet)

    for fname, caption, pos in layout:
        tile_path = os.path.join(temp_dir, fname)
        if not os.path.exists(tile_path):
            raise FileNotFoundError(f"Missing rendered tile: {tile_path}")
        with Image.open(tile_path) as tile:
            sheet.paste(tile.convert("RGB"), pos)
        draw.rectangle([pos[0] + 10, pos[1] + 10, pos[0] + 185, pos[1] + 34], fill=(15, 23, 42))
        draw.text((pos[0] + 18, pos[1] + 16), caption, fill=(255, 255, 255))

    # Crisp cross divider lines
    draw.line([(512, 0), (512, 1024)], fill=(30, 41, 59), width=3)
    draw.line([(0, 512), (1024, 512)], fill=(30, 41, 59), width=3)

    out_dir = os.path.dirname(os.path.abspath(output_sheet))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    sheet.save(output_sheet)
    print(f"[render_turnaround] Saved 4-angle turnaround sheet -> {output_sheet}")
    return output_sheet


def render_turnaround(input_glb: str, output_sheet: str, blender_exe: str = DEFAULT_BLENDER) -> str:
    if not os.path.exists(input_glb):
        raise FileNotFoundError(f"Input GLB not found: {input_glb}")
    if not os.path.exists(blender_exe):
        raise FileNotFoundError(f"Blender executable not found: {blender_exe}")

    with tempfile.TemporaryDirectory() as tmp_dir:
        script_path = os.path.join(tmp_dir, "blender_turnaround.py")
        with open(script_path, "w", encoding="utf-8") as f:
            f.write(BLENDER_TURNAROUND_SCRIPT)

        cmd = [
            blender_exe,
            "-b",
            "--python-exit-code",
            "1",
            "--python",
            script_path,
            "--",
            os.path.abspath(input_glb),
            tmp_dir,
        ]
        print("[render_turnaround] Launching headless Blender turnaround render...")
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            raise RuntimeError(
                f"Blender turnaround failed ({proc.returncode}):\n{proc.stdout}\n{proc.stderr}"
            )
        return stitch_turnaround(tmp_dir, output_sheet)


def main():
    parser = argparse.ArgumentParser(
        description="Render a 4-angle turnaround inspection sheet (Front, Side, Back, 3/4) for a .glb."
    )
    parser.add_argument("input_glb", help="Path to the .glb model to inspect.")
    parser.add_argument("output_sheet", help="Output PNG path for the 1024x1024 4-angle turnaround.")
    args = parser.parse_args()
    render_turnaround(args.input_glb, args.output_sheet)


if __name__ == "__main__":
    main()
