"""Consolida los materiales de cada pieza de un personaje en un atlas PBR.

No hornea iluminación. Copia las texturas repetibles al atlas, conserva color,
rugosidad y metal, remapea una segunda UV y deja un material por objeto.
"""
import math
import os

import bpy


def _principled(material):
    return next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def _source(material):
    texture = next((n for n in material.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
    bsdf = _principled(material)
    return texture.image if texture else None, tuple(bsdf.inputs['Base Color'].default_value), float(bsdf.inputs['Roughness'].default_value), float(bsdf.inputs['Metallic'].default_value)


def _bounds(mesh, uv, material_index):
    coords = [uv.data[li].uv.copy() for p in mesh.polygons if p.material_index == material_index for li in p.loop_indices]
    if not coords:
        return (0.0, 0.0, 1.0, 1.0)
    x0, y0 = min(v.x for v in coords), min(v.y for v in coords)
    x1, y1 = max(v.x for v in coords), max(v.y for v in coords)
    if x1 - x0 < 1e-6:
        x1 = x0 + 1
    if y1 - y0 < 1e-6:
        y1 = y0 + 1
    return x0, y0, x1, y1


def _sample(pixels, width, height, u, v):
    x = min(width - 1, int((u % 1.0) * width))
    y = min(height - 1, int((v % 1.0) * height))
    i = (y * width + x) * 4
    return pixels[i:i + 4]


def _make_image(name, size, values, color_space):
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    image = bpy.data.images.new(name, width=size, height=size, alpha=False)
    image.colorspace_settings.name = color_space
    image.pixels.foreach_set(values)
    image.update()
    return image


def _atlas_material(name, base, roughness, metallic, two_sided):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = not two_sided
    tree = material.node_tree
    bsdf = _principled(material)
    for image, socket in ((base, 'Base Color'), (roughness, 'Roughness'), (metallic, 'Metallic')):
        texture = tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        texture.interpolation = 'Linear'
        tree.links.new(texture.outputs['Color'], bsdf.inputs[socket])
    return material


def atlas_object(obj, directory, size=1024, padding=4):
    mesh = obj.data
    source_uv = mesh.uv_layers.active
    if source_uv is None:
        raise RuntimeError(f'{obj.name} no tiene UV de origen')
    materials = [m for m in mesh.materials if m]
    count = len(materials)
    if not count:
        return
    cols = math.ceil(math.sqrt(count))
    rows = math.ceil(count / cols)
    tile_w, tile_h = size // cols, size // rows
    base_pixels = [0.0] * (size * size * 4)
    rough_pixels = [0.0] * (size * size * 4)
    metal_pixels = [0.0] * (size * size * 4)
    bounds = []

    for index, material in enumerate(materials):
        image, color, roughness, metallic = _source(material)
        source_pixels = image.pixels[:] if image else None
        source_w, source_h = image.size[:] if image else (1, 1)
        x0, y0, x1, y1 = _bounds(mesh, source_uv, index)
        bounds.append((x0, y0, x1, y1))
        col, row = index % cols, index // cols
        px0, py0 = col * tile_w, row * tile_h
        for py in range(py0, min(size, py0 + tile_h)):
            v = y0 + (y1 - y0) * ((py - py0 + 0.5) / tile_h)
            for px in range(px0, min(size, px0 + tile_w)):
                u = x0 + (x1 - x0) * ((px - px0 + 0.5) / tile_w)
                rgba = _sample(source_pixels, source_w, source_h, u, v) if source_pixels else color
                offset = (py * size + px) * 4
                base_pixels[offset:offset + 4] = tuple(rgba[:3]) + (1.0,)
                rough_pixels[offset:offset + 4] = (roughness, roughness, roughness, 1.0)
                metal_pixels[offset:offset + 4] = (metallic, metallic, metallic, 1.0)

    atlas_uv = mesh.uv_layers.get('AtlasUV') or mesh.uv_layers.new(name='AtlasUV')
    for polygon in mesh.polygons:
        index = polygon.material_index
        x0, y0, x1, y1 = bounds[index]
        col, row = index % cols, index // cols
        tx0 = (col * tile_w + padding) / size
        ty0 = (row * tile_h + padding) / size
        tx1 = ((col + 1) * tile_w - padding) / size
        ty1 = ((row + 1) * tile_h - padding) / size
        for li in polygon.loop_indices:
            uv = source_uv.data[li].uv
            atlas_uv.data[li].uv = (tx0 + (uv.x - x0) / (x1 - x0) * (tx1 - tx0), ty0 + (uv.y - y0) / (y1 - y0) * (ty1 - ty0))
        polygon.material_index = 0
    mesh.uv_layers.active = atlas_uv
    atlas_uv.active_render = True

    os.makedirs(directory, exist_ok=True)
    images = []
    for suffix, values, space in (
        ('base', base_pixels, 'sRGB'),
        ('roughness', rough_pixels, 'Non-Color'),
        ('metallic', metal_pixels, 'Non-Color'),
    ):
        image = _make_image(f'{obj.name}_{suffix}', size, values, space)
        image.filepath_raw = os.path.join(directory, f'centinela_{obj.name.lower()}_{suffix}.png')
        image.file_format = 'PNG'
        image.save()
        images.append(image)
    two_sided = any(not m.use_backface_culling for m in materials)
    material = _atlas_material(f'atlas_{obj.name.lower()}', *images, two_sided)
    mesh.materials.clear()
    mesh.materials.append(material)
    print(f'Atlas {obj.name}: {count} -> 1 material, {size} px')


def atlas_parts(scene, parts, directory, sizes=None):
    for obj in parts:
        atlas_object(obj, directory, (sizes or {}).get(obj.name, 1024))
