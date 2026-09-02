from PIL import Image, ImageDraw, ImageFont, ImageFilter

FONT = '/tmp/intertight-var.ttf'
SS = 16  # supersample

def line_img(text, weight, px):
    f = ImageFont.truetype(FONT, px)
    f.set_variation_by_axes([weight])
    tmp = Image.new("L", (px*6, px*3), 0)
    ImageDraw.Draw(tmp).text((px, px*2), text, font=f, fill=255, anchor="ls")
    return tmp.crop(tmp.getbbox())

def make(S, w_bold=700, w_light=300, pad=0.07, gap=0.05,
         single=False, radius=0.0, soft=0.0):
    """radius: how round the corners are (as a share of the edge).
       soft: how much the edge is softened (as a share of the last pixel)."""
    B = S * SS
    padpx, gappx = pad * B, gap * B
    avail = B - 2*padpx

    lo, hi = 10, int(B)
    for _ in range(40):
        px = (lo + hi) // 2
        a = line_img("af", w_bold, px)
        if single:
            h, w = a.height, a.width
        else:
            b = line_img("hr", w_light, px)
            h, w = a.height + gappx + b.height, max(a.width, b.width)
        if h <= avail and w <= avail:
            lo = px
        else:
            hi = px - 1
    px = lo

    a = line_img("af", w_bold, px)
    text = Image.new("L", (B, B), 0)
    if single:
        text.paste(a, (int((B - a.width)/2), int((B - a.height)/2)), a)
    else:
        b = line_img("hr", w_light, px)
        y0 = int((B - (a.height + gappx + b.height)) / 2)
        text.paste(a, (int(padpx), y0), a)
        text.paste(b, (int(padpx), int(y0 + a.height + gappx)), b)

    square = Image.new("L", (B, B), 0)
    ImageDraw.Draw(square).rounded_rectangle([0, 0, B-1, B-1],
                                            radius=radius*B, fill=255)
    if soft:
        blur = soft * SS
        text = text.filter(ImageFilter.GaussianBlur(blur))
        square = square.filter(ImageFilter.GaussianBlur(blur))

    rgb = Image.new("RGB", (B, B), "#000000")
    rgb.paste(Image.new("RGB", (B, B), "#ffffff"), (0, 0), text)
    out = rgb.convert("RGBA")
    out.putalpha(square)
    return out.resize((S, S), Image.LANCZOS)


# The mark is "af" alone, centred, at every size. The two-line "af / hr"
# version sat visibly off-centre once the site was on a phone's home
# screen, so it went. No rounding: iOS and Android cut their own corners,
# and a corner cut twice shows a seam. (The shipped PNGs were drawn from
# the site's own Inter Tight 700 woff2, decompressed with fontTools, on
# exactly this recipe; this needs the variable TTF at FONT to redraw.)
if __name__ == "__main__":
    for S in (16, 32, 48, 64, 180, 512):
        make(S, single=True, pad=0.21).save("favicon-%d.png" % S, optimize=True)
        print("favicon-%d.png" % S)
