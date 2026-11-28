# Quita el logotipo y las rayas y deja ropa deportiva: camiseta gris y pantalón oscuro.
# Uso (antes de build_human.py, y dejando la salida a su lado):
# python3 ropa.py .../male_casualsuit04_diffuse.png ropa_deporte.png
import sys
from PIL import Image, ImageDraw, ImageFilter
src, out = sys.argv[1:3]
im = Image.open(src).convert('RGB')
# el logotipo se tapa con tela lisa copiada de la espalda
patch = im.crop((210, 185, 520, 495))
soft = Image.new('L', patch.size, 0); ImageDraw.Draw(soft).ellipse((10, 10, 300, 300), fill=255)
im.paste(patch, (988, 185), soft.filter(ImageFilter.GaussianBlur(8)))
r, g, b = im.split()
lum = im.convert('L')
H = 800
mask = r.point(lambda v: 255 if v > 85 else 0).filter(ImageFilter.MaxFilter(9))
top = lum.crop((0, 0, 2048, H))
base = sorted(top.get_flattened_data())[top.width * top.height // 2]
top = Image.composite(Image.new('L', top.size, base), top, mask.crop((0, 0, 2048, H)))
tee = top.point(lambda v: max(0, min(255, int(142 + (v - base) * 0.8))))
low = lum.crop((0, H, 2048, 2048))
mid = sum(low.get_flattened_data()) / (low.width * low.height)
pants = low.point(lambda v: max(0, min(255, int(52 + (v - mid) * 0.2))))
res = Image.new('L', im.size); res.paste(tee, (0, 0)); res.paste(pants, (0, H))
Image.merge('RGB', (res.point(lambda v: int(v * 0.97)), res, res.point(lambda v: min(255, int(v * 1.05))))).save(out)
