"""Create the Windows application icon used by portable releases."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    output = parser.parse_args().output

    scale = 4
    size = 256
    canvas = Image.new('RGBA', (size * scale, size * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((8 * scale, 8 * scale, 248 * scale, 248 * scale),
                           radius=58 * scale, fill='#252d29')
    draw.line([(56 * scale, 183 * scale), (56 * scale, 78 * scale),
               (91 * scale, 78 * scale), (128 * scale, 135 * scale),
               (165 * scale, 78 * scale), (200 * scale, 78 * scale),
               (200 * scale, 183 * scale)],
              fill='#eda986', width=19 * scale, joint='curve')
    image = canvas.resize((size, size), Image.Resampling.LANCZOS)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, format='ICO', sizes=[(16, 16), (24, 24), (32, 32),
                                             (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f'Icon: {output}')


if __name__ == '__main__':
    main()
