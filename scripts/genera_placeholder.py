"""
Genera i file raster placeholder per logo e favicon in static/img/.
Non serve nessuna libreria esterna (niente Pillow): scrive PNG "a mano"
usando solo la libreria standard (zlib per la compressione dei chunk IDAT).

Da rilanciare solo se serve rigenerare i placeholder. Quando la scuola
fornirà il logo/favicon reali, basta sostituire i file in static/img/
con lo stesso nome (logo-mark.png, favicon-16x16.png, favicon-32x32.png,
apple-touch-icon.png) senza toccare i template.
"""
import struct
import zlib
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "img")

# Colori approssimati (RGB) a partire dai token oklch del design.
ACCENT = (107, 148, 196)        # oklch(0.65 0.09 240) circa
ACCENT_DARK = (66, 99, 140)      # oklch(0.45 0.08 245) circa


def _chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path, width, height, pixel_fn):
    """pixel_fn(x, y) -> (r, g, b, a) con valori 0-255."""
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filtro "none" per riga
        for x in range(width):
            r, g, b, a = pixel_fn(x, y)
            raw += bytes((r, g, b, a))

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)

    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", ihdr)
    png += _chunk(b"IDAT", idat)
    png += _chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)


def circle_mark(size, margin_ratio=0.12):
    """Cerchio pieno colore accent su sfondo trasparente, con un piccolo
    bordo più scuro in stile 'goccia di inchiostro' morbida."""
    cx = cy = size / 2
    r_outer = size / 2 * (1 - margin_ratio)

    def pixel(x, y):
        dx = x + 0.5 - cx
        dy = y + 0.5 - cy
        dist = math.sqrt(dx * dx + dy * dy)
        if dist > r_outer + 1:
            return (0, 0, 0, 0)
        # leggero antialias sul bordo
        edge = r_outer - dist
        alpha = 255 if edge > 1 else max(0, min(255, int(edge * 255)))
        # sfumatura leggera dal centro (chiaro) al bordo (accent scuro)
        t = min(1.0, dist / r_outer) if r_outer > 0 else 0
        r = int(ACCENT[0] + (ACCENT_DARK[0] - ACCENT[0]) * t)
        g = int(ACCENT[1] + (ACCENT_DARK[1] - ACCENT[1]) * t)
        b = int(ACCENT[2] + (ACCENT_DARK[2] - ACCENT[2]) * t)
        return (r, g, b, alpha)

    return pixel


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    targets = [
        ("logo-mark.png", 128),
        ("apple-touch-icon.png", 180),
        ("favicon-32x32.png", 32),
        ("favicon-16x16.png", 16),
    ]
    for name, size in targets:
        write_png(os.path.join(OUT_DIR, name), size, size, circle_mark(size))
        print(f"creato {name} ({size}x{size})")


if __name__ == "__main__":
    main()
