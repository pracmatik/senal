# Crea la persona 3D (MPFB, recursos CC0) y la exporta a GLB. Uso:
# Blender --background --python build_human.py -- salida.glb
import bpy, sys, os
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService

OUT = sys.argv[sys.argv.index('--') + 1]
DATA = LocationService.get_user_data()
def asset(p):
    f = os.path.join(DATA, p)
    if not os.path.exists(f):
        raise SystemExit('FALTA ' + f)
    return f

bpy.ops.wm.read_factory_settings(use_empty=False)
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.52, muscle=0.62, weight=0.5, proportions=0.75, height=0.55)
macro['race'] = {'asian': 0.0, 'caucasian': 1.0, 'african': 0.0}
base = HumanService.create_human(macro_detail_dict=macro)
HumanService.add_builtin_rig(base, 'game_engine')
HumanService.set_character_skin(asset('skins/young_caucasian_male/young_caucasian_male.mhmat'), base, skin_type='GAMEENGINE', material_instances=False)
for path, kind in [('eyes/low-poly/low-poly.mhclo', 'Eyes'), ('eyebrows/eyebrow001/eyebrow001.mhclo', 'Eyebrows'),
                   ('eyelashes/eyelashes01/eyelashes01.mhclo', 'Eyelashes'), ('hair/short02/short02.mhclo', 'Hair'),
                   ('clothes/male_casualsuit04/male_casualsuit04.mhclo', 'Clothes')]:
    HumanService.add_mhclo_asset(asset(path), base, asset_type=kind, subdiv_levels=0, material_type='GAMEENGINE')

# Hornear la forma y quitar la geometría auxiliar y la piel tapada por la ropa
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
for o in meshes:
    bpy.context.view_layer.objects.active = o
    if o.data.shape_keys:
        TargetService.bake_targets(o)
    for m in list(o.modifiers):
        if m.type == 'MASK':
            bpy.ops.object.modifier_apply(modifier=m.name)
        elif m.type == 'SUBSURF':
            o.modifiers.remove(m)

ropa = next(i for i in bpy.data.images if 'casualsuit04_diffuse' in i.name)
ropa.filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ropa_deporte.png'); ropa.reload()
for img in bpy.data.images:
    w, h = img.size
    big = 2048 if 'caucasian' in img.name else 1024
    if max(w, h) > big:
        img.scale(w * big // max(w, h), h * big // max(w, h))

for o in meshes:
    print('MESH', o.name, len(o.data.vertices), [s.material.name for s in o.material_slots if s.material])
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for b in arm.data.bones:
    h = arm.matrix_world @ b.head_local
    print('BONE', b.name, round(h.x, 3), round(h.z, 3), round(-h.y, 3))
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_image_format='WEBP', export_image_quality=82,
                          export_animations=False, export_morph=False, export_yup=True)
print('OK', os.path.getsize(OUT))
