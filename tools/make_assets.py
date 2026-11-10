"""Генерация текстур небесных тел (PNG 384x384, вид диска планеты, без освещения — свет накладывается в игре).
Запуск: python3 tools/make_assets.py   (нужны numpy и Pillow)"""
import numpy as np
from PIL import Image
import os

N = 384
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'planets')
os.makedirs(OUT, exist_ok=True)
u, v = np.meshgrid(np.linspace(-1, 1, N), np.linspace(1, -1, N))
rr = np.sqrt(u * u + v * v)
mask = rr <= 1.0
z = np.sqrt(np.clip(1 - rr * rr, 0, 1))
alpha = np.clip((1 - rr) * N / 2.2, 0, 1)
smooth = lambda t: t * t * (3 - 2 * t)

def rot(tilt, spin):
    # поворот сферы: наклон оси и «долгота»
    ct, st, cs, ss = np.cos(tilt), np.sin(tilt), np.cos(spin), np.sin(spin)
    X, Y, Z = u, v, z
    X, Z = X * cs + Z * ss, -X * ss + Z * cs
    Y, Z = Y * ct - Z * st, Y * st + Z * ct
    return X, Y, Z

def noise3(seed, size=20):
    return np.random.default_rng(seed).random((size, size, size)).astype(np.float32)

def vnoise(X, Y, Z, lat, freq):
    s = lat.shape[0]
    p = np.stack([X, Y, Z]) * freq + 100.0
    i0 = np.floor(p).astype(int); f = smooth(p - i0)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[0] if dx else 1 - f[0]) * (f[1] if dy else 1 - f[1]) * (f[2] if dz else 1 - f[2])
                out = out + w * lat[(i0[0] + dx) % s, (i0[1] + dy) % s, (i0[2] + dz) % s]
    return out

def fbm(X, Y, Z, seed, freq=1.5, octaves=6, gain=0.5):
    tot, amp, norm = 0, 1.0, 0
    for o in range(octaves):
        tot = tot + amp * vnoise(X, Y, Z, noise3(seed + o * 17), freq * 2 ** o)
        norm += amp; amp *= gain
    return tot / norm

def lerp(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    return np.array(a, dtype=np.float32) * (1 - t) + np.array(b, dtype=np.float32) * t

def craters(img, seed, count, rmin, rmax, strength=0.35):
    rng = np.random.default_rng(seed)
    for _ in range(count):
        cx, cy = rng.uniform(-0.95, 0.95, 2)
        if cx * cx + cy * cy > 0.92: continue
        r = rng.uniform(rmin, rmax) * (0.45 + 0.55 * np.sqrt(max(0.05, 1 - cx * cx - cy * cy)))
        d = np.sqrt((u - cx) ** 2 + (v - cy) ** 2) / r
        inside = d < 1
        floor = np.where(inside, 1 - 0.45 * smooth(np.clip(1 - d, 0, 1)), 1.0)
        rim = np.exp(-((d - 1.0) / 0.13) ** 2) * 0.55
        shade = np.where(((u - cx) + (v - cy)) > 0, 1.0, 0.0)  # склон с «солнечной» стороны
        img *= (1 - strength * (1 - floor))[..., None]
        img += (rim * 38 * (0.5 + shade * 0.8))[..., None]
    return img

def finish(img, name, limb=0.45, glow=None):
    shade = (1 - limb) + limb * np.sqrt(z)
    img = np.clip(img * shade[..., None], 0, 255)
    rgba = np.zeros((N, N, 4), np.uint8)
    rgba[..., :3] = img.astype(np.uint8)
    rgba[..., 3] = (alpha * 255).astype(np.uint8) * mask
    Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, name + '.png'), optimize=True)
    print('  ', name, os.path.getsize(os.path.join(OUT, name + '.png')) // 1024, 'КБ')

def base(c):
    return np.ones((N, N, 3), np.float32) * np.array(c, np.float32)

# ---- Земля: океаны, материки, пустыни, лёд, облачные завихрения
X, Y, Z = rot(0.35, 0.6)
h = fbm(X, Y, Z, 11, 1.4, 6); m = fbm(X, Y, Z, 41, 2.4, 4); lat = np.abs(Y)
land = h > 0.5
ocean = lerp((8, 32, 96), (36, 112, 178), (h - 0.28) / 0.22)
grass = lerp((46, 120, 52), (28, 86, 40), m * 1.4 - 0.3)
desert = lerp((196, 168, 100), (170, 130, 80), m)
hot = np.clip((0.45 - lat) * 4, 0, 1) * (m < 0.48)
landc = lerp(grass, desert, hot[..., 0] if hot.ndim == 3 else hot)
mount = np.clip((h - 0.62) * 8, 0, 1); landc = lerp(landc, (120, 108, 96), mount)
img = np.where(land[..., None], landc, ocean)
ice = np.clip((lat - 0.8) * 12, 0, 1); img = lerp(img, (236, 244, 250), ice)
cl = fbm(X * 1.0, Y * 2.2, Z * 1.0, 77, 2.2, 5); cmask = smooth(np.clip((cl - 0.52) * 5, 0, 1)) * 0.78
img = lerp(img, (250, 252, 255), cmask)
finish(img, 'earth', 0.4)

# ---- Луна: моря и кратеры
X, Y, Z = rot(0.1, 1.0)
g = fbm(X, Y, Z, 5, 3.0, 5); mare = smooth(np.clip((fbm(X, Y, Z, 9, 1.1, 4) - 0.52) * 6, 0, 1))
img = base((158, 156, 152)) * (0.82 + 0.35 * g)[..., None]; img = lerp(img, (88, 88, 92), mare * 0.8)
img = craters(img, 3, 120, 0.02, 0.13); finish(img, 'moon', 0.55)

# ---- Меркурий
X, Y, Z = rot(0.0, 2.0); g = fbm(X, Y, Z, 15, 3.5, 5)
img = base((140, 128, 118)) * (0.75 + 0.5 * g)[..., None]; img = craters(img, 8, 170, 0.015, 0.1, 0.4); finish(img, 'mercury', 0.55)

# ---- Венера: жёлтые облачные потоки
X, Y, Z = rot(0.2, 0.3); w = fbm(X, Y * 3.5, Z, 21, 2.0, 5)
img = lerp((232, 200, 128), (200, 150, 84), w * 1.6 - 0.35); finish(img, 'venus', 0.5)

# ---- Марс: красная пустыня, тёмные области, шапки
X, Y, Z = rot(0.3, 2.6); a = fbm(X, Y, Z, 31, 2.0, 6); b = smooth(np.clip((fbm(X, Y, Z, 61, 1.2, 4) - 0.5) * 5, 0, 1))
img = lerp((196, 98, 52), (156, 76, 44), a * 1.5 - 0.3); img = lerp(img, (88, 52, 42), b * 0.7)
img = craters(img, 21, 30, 0.02, 0.07, 0.25); img = lerp(img, (240, 240, 244), np.clip((np.abs(Y) - 0.9) * 14, 0, 1)); finish(img, 'mars', 0.5)

# ---- Юпитер: пояса и Красное пятно
X, Y, Z = rot(0.05, 0.0); warp = fbm(X * 2, Y, Z * 2, 51, 3.0, 5)
band = np.sin((Y + (warp - 0.5) * 0.18) * np.pi * 8.5) * 0.5 + 0.5
img = lerp((236, 214, 182), (168, 110, 76), band); img = img * (0.92 + 0.12 * fbm(X * 3, Y * 12, Z * 3, 53, 2.0, 4))[..., None]
d = np.sqrt(((u - 0.28) / 0.2) ** 2 + ((v + 0.32) / 0.11) ** 2); img = lerp(img, (190, 82, 54), smooth(np.clip(1.2 - d, 0, 1)) * 0.9); finish(img, 'jupiter', 0.5)

# ---- Сатурн
X, Y, Z = rot(0.0, 0.0); band = np.sin(Y * np.pi * 11 + fbm(X, Y * 2, Z, 61, 2, 4) * 2) * 0.5 + 0.5
img = lerp((226, 204, 148), (200, 172, 116), band); finish(img, 'saturn', 0.5)

# ---- Уран / Нептун
X, Y, Z = rot(0.0, 0.0); img = lerp((168, 226, 232), (130, 200, 214), (Y + 1) / 2 * 0.6 + fbm(X, Y, Z, 71, 1.5, 3) * 0.4); finish(img, 'uranus', 0.5)
band = np.sin(Y * np.pi * 6 + fbm(X, Y, Z, 81, 2, 4) * 2) * 0.5 + 0.5; img = lerp((48, 84, 196), (66, 120, 224), band)
d = np.sqrt(((u + 0.25) / 0.17) ** 2 + ((v - 0.25) / 0.09) ** 2); img = lerp(img, (24, 44, 120), smooth(np.clip(1.1 - d, 0, 1)) * 0.8); finish(img, 'neptune', 0.5)

# ---- Солнце: грануляция
X, Y, Z = rot(0.0, 0.0); gr = fbm(X, Y, Z, 91, 7.0, 5); sp = smooth(np.clip((fbm(X, Y, Z, 93, 2.5, 3) - 0.62) * 8, 0, 1))
img = lerp((255, 214, 90), (255, 160, 40), gr * 1.4 - 0.2); img = lerp(img, (150, 60, 10), sp * 0.7); finish(img, 'sun', 0.75)

# ---- Спутники: Ио, Европа, Ганимед, Титан
X, Y, Z = rot(0.2, 1.4); g = fbm(X, Y, Z, 101, 3, 5); dk = smooth(np.clip((fbm(X, Y, Z, 103, 2.2, 4) - 0.6) * 7, 0, 1))
img = lerp((236, 214, 96), (214, 150, 56), g); img = lerp(img, (70, 52, 38), dk * 0.85); finish(img, 'io', 0.5)
X, Y, Z = rot(0.2, 0.4); g = fbm(X, Y, Z, 111, 2, 4); crack = np.exp(-(np.abs(fbm(X, Y, Z, 113, 3.5, 3) - 0.5) / 0.012) ** 2)
img = lerp((226, 212, 190), (200, 180, 150), g); img = lerp(img, (140, 88, 56), np.clip(crack, 0, 1) * 0.8); finish(img, 'europa', 0.5)
X, Y, Z = rot(0.1, 0.9); g = fbm(X, Y, Z, 121, 2.6, 5); dk = smooth(np.clip((fbm(X, Y, Z, 123, 1.6, 4) - 0.5) * 6, 0, 1))
img = lerp((150, 136, 118), (118, 106, 94), g); img = lerp(img, (84, 76, 70), dk * 0.7); img = craters(img, 25, 60, 0.015, 0.07, 0.25); finish(img, 'ganymede', 0.55)
X, Y, Z = rot(0.0, 0.0); img = lerp((226, 160, 66), (196, 120, 44), fbm(X, Y * 2, Z, 131, 1.6, 4) * 1.4 - 0.2); finish(img, 'titan', 0.5)
print('готово')
