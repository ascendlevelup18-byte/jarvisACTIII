"""Builds shot B4 (the JARVIS pipeline) as an editable Blender scene.

UNTESTED: Blender was not installed on the machine where this was written. Target Blender 3.6 or newer.
Run:  blender --background --python jarvis_pipeline_scene.py -- --out C:/path/jarvis_pipeline.blend
  or  open Blender > Scripting > open this file > Run Script.
Creates seven rounded stages that light up left to right (AI stages violet, deterministic stages teal,
Verify green) over 17 s at 30 fps, an orthographic camera and text labels. It is an illustration only:
it does not depict the JARVIS user interface.
"""
import sys

import bpy

FPS = 30
DURATION_S = 17
STAGES = [
    ("Understand", "ai"),
    ("Evidence", "code"),
    ("Propose", "ai"),
    ("Policy", "code"),
    ("Revalidate", "code"),
    ("Execute", "code"),
    ("Verify", "verify"),
]
COLORS = {
    "bg": (0.043, 0.071, 0.125, 1.0),      # #0B1220
    "ai": (0.416, 0.322, 0.788, 1.0),      # #6A52C9
    "code": (0.059, 0.463, 0.431, 1.0),    # #0F766E
    "verify": (0.082, 0.502, 0.239, 1.0),  # #15803D
    "dim": (0.12, 0.16, 0.23, 1.0),
    "text": (0.95, 0.97, 0.99, 1.0),
}


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = FPS * DURATION_S
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            scene.render.engine = engine
            break
        except TypeError:
            continue
    world = bpy.data.worlds.new("JarvisWorld")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = COLORS["bg"]
    scene.world = world
    return scene


def emission_material(name, color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emit = nodes.new("ShaderNodeEmission")
    emit.inputs["Color"].default_value = color
    emit.inputs["Strength"].default_value = 0.15
    mat.node_tree.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    return mat, emit


def add_stage(index, label, kind, scene):
    x = (index - (len(STAGES) - 1) / 2) * 2.6
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0, 0))
    block = bpy.context.active_object
    block.name = f"Stage_{index + 1}_{label}"
    block.scale = (1.1, 0.7, 0.08)
    bevel = block.modifiers.new("Round", "BEVEL")
    bevel.width = 0.06
    bevel.segments = 6
    mat, emit = emission_material(f"Mat_{label}", COLORS[kind])
    block.data.materials.append(mat)

    # Dim, then light up in sequence, then stay lit.
    start = int(FPS * (1.5 + index * 1.8))
    strength = emit.inputs["Strength"]
    for frame, value in ((1, 0.15), (start, 0.15), (start + 12, 3.0), (start + 30, 1.6)):
        strength.default_value = value
        strength.keyframe_insert("default_value", frame=frame)

    bpy.ops.object.text_add(location=(x, -1.1, 0.1))
    text = bpy.context.active_object
    text.name = f"Label_{label}"
    text.data.body = label
    text.data.align_x = "CENTER"
    text.data.size = 0.36
    tmat, _ = emission_material(f"Text_{label}", COLORS["text"])
    tmat.node_tree.nodes["Emission"].inputs["Strength"].default_value = 1.0
    text.data.materials.append(tmat)

    if index < len(STAGES) - 1:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + 1.3, 0, 0))
        link = bpy.context.active_object
        link.name = f"Link_{index + 1}"
        link.scale = (0.25, 0.04, 0.02)
        lmat, _ = emission_material(f"LinkMat_{index + 1}", COLORS["dim"])
        link.data.materials.append(lmat)


def add_camera(scene):
    bpy.ops.object.camera_add(location=(0, 0, 20), rotation=(0, 0, 0))
    cam = bpy.context.active_object
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 19.5
    scene.camera = cam


def main():
    scene = reset_scene()
    for i, (label, kind) in enumerate(STAGES):
        add_stage(i, label, kind, scene)
    add_camera(scene)
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--out" in argv:
        path = argv[argv.index("--out") + 1]
        bpy.ops.wm.save_as_mainfile(filepath=path)
        print(f"saved {path}")


main()
