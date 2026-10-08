import { previewEdge } from "@/lib/preview-size";

/**
 * Makes the shop's public web preview of an image in the browser: upright
 * (EXIF orientation applied), scaled by the shared preview rule, as a JPEG
 * without camera metadata. The server checks the result before saving.
 */
export async function makePreview(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // naturalWidth/Height are already upright (image-orientation: from-image).
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, previewEdge(long) / long);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const bitmap = await createImageBitmap(img, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "high",
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas not available");
    context.drawImage(bitmap, 0, 0);
    bitmap.close();

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
