import zlib
import struct
import math

def create_png(width, height, draw_func, filename):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', crc))
    
    # IDAT chunk
    compressed = zlib.compress(bytes(raw_data), 9)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', crc))
    
    # IEND chunk
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', crc))
    
    with open(filename, 'wb') as f:
        f.write(png)
    print(f"Generated {filename} ({width}x{height})")

def icon_drawer(maskable=False):
    def draw(x, y, w, h):
        nx = x / w
        ny = y / h
        
        # Base background color: Deep Sky Blue #0284c7 (RGB: 2, 132, 199)
        bg_r, bg_g, bg_b = 2, 132, 199
        
        # If not maskable, we can do smooth rounded corners
        if not maskable:
            corner_r = 0.22
            dx = max(0.0, abs(nx - 0.5) - (0.5 - corner_r))
            dy = max(0.0, abs(ny - 0.5) - (0.5 - corner_r))
            dist = math.sqrt(dx*dx + dy*dy)
            if dist > corner_r:
                return (0, 0, 0, 0) # transparent outside rounded box
        
        # Central calendar & cross logo inside safe zone (0.2 to 0.8)
        # Calendar sheet: x: 0.28 to 0.72, y: 0.26 to 0.76
        cal_x1, cal_x2 = 0.28, 0.72
        cal_y1, cal_y2 = 0.26, 0.76
        
        # Check if inside calendar body
        if cal_x1 <= nx <= cal_x2 and cal_y1 <= ny <= cal_y2:
            # Top header of calendar: y from 0.26 to 0.38
            if ny <= 0.38:
                # Darker navy header #0369a1
                return (3, 105, 161, 255)
            else:
                # White body of calendar
                # Draw medical cross in center: center at (0.50, 0.57)
                cx, cy = 0.50, 0.57
                cross_w, cross_l = 0.04, 0.12
                in_v_bar = (abs(nx - cx) <= cross_w) and (abs(ny - cy) <= cross_l)
                in_h_bar = (abs(ny - cy) <= cross_w) and (abs(nx - cx) <= cross_l)
                
                if in_v_bar or in_h_bar:
                    # Emerald medical / agenda check color #059669
                    return (5, 150, 105, 255)
                
                # Calendar page white
                return (255, 255, 255, 255)
        
        # Two binder rings at top: (0.38, 0.23) and (0.62, 0.23)
        for ring_x in [0.38, 0.62]:
            if abs(nx - ring_x) <= 0.03 and 0.20 <= ny <= 0.28:
                return (240, 249, 255, 255)
                
        # Subtle gradient for background
        shade = int(ny * 25)
        return (max(0, bg_r - shade), max(0, bg_g - shade), max(0, bg_b - shade), 255)
        
    return draw

create_png(192, 192, icon_drawer(maskable=False), "public/pwa-192x192.png")
create_png(512, 512, icon_drawer(maskable=False), "public/pwa-512x512.png")
create_png(512, 512, icon_drawer(maskable=True), "public/pwa-maskable-512x512.png")
create_png(180, 180, icon_drawer(maskable=False), "public/apple-touch-icon.png")
