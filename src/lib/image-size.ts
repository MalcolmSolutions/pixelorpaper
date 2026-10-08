/**
 * Read pixel dimensions from the first bytes of a JPEG, PNG or WebP file.
 * Returns undefined when the header is unrecognised or incomplete.
 */
export function readImageSize(
  buf: Buffer,
): { width: number; height: number } | undefined {
  // PNG: IHDR chunk follows the 8-byte signature.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // WebP: RIFF container with a VP8 / VP8L / VP8X chunk.
  if (
    buf.length >= 30 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return {
        width: buf.readUIntLE(24, 3) + 1,
        height: buf.readUIntLE(27, 3) + 1,
      };
    }
    if (chunk === "VP8 ") {
      return {
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    return undefined;
  }

  // JPEG: walk the marker segments until a start-of-frame marker. Size is
  // reported upright: cameras often store a portrait photo as landscape
  // pixels plus an EXIF "rotate 90°" flag, which browsers (and our previews)
  // apply.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let orientation = 1;
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return undefined;
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i += 1; // fill byte
        continue;
      }
      const length = buf.readUInt16BE(i + 2);
      if (marker === 0xe1) {
        orientation =
          exifOrientation(buf, i + 4, i + 2 + length) ?? orientation;
      }
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        // Orientations 5–8 turn the image a quarter turn.
        return orientation >= 5 && orientation <= 8
          ? { width: height, height: width }
          : { width, height };
      }
      i += 2 + length;
    }
  }

  return undefined;
}

/** The EXIF orientation (1–8) in an APP1 segment, if it has one. */
function exifOrientation(
  buf: Buffer,
  start: number,
  end: number,
): number | undefined {
  if (end > buf.length || buf.toString("ascii", start, start + 4) !== "Exif") {
    return undefined;
  }
  const tiff = start + 6;
  const little = buf.toString("ascii", tiff, tiff + 2) === "II";
  const u16 = (at: number) =>
    little ? buf.readUInt16LE(at) : buf.readUInt16BE(at);
  const u32 = (at: number) =>
    little ? buf.readUInt32LE(at) : buf.readUInt32BE(at);
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > end) return undefined;
  const entries = u16(ifd);
  for (let n = 0; n < entries; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 12 > end) return undefined;
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : undefined;
    }
  }
  return undefined;
}
