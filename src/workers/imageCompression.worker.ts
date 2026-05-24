// Web Worker for off-thread image compression using OffscreenCanvas
self.onmessage = async (e: MessageEvent) => {
  const { file, maxDimension, quality } = e.data;

  try {
    // 1. Create ImageBitmap from File (decodes image off-thread)
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;

    // 2. Adaptive downscaling: only scale down, never upscale
    if (width > height) {
      if (width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // 3. Render onto memory-efficient OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Could not acquire 2D context from OffscreenCanvas");
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    // 4. Convert canvas rendering to optimized JPEG blob
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality
    });

    // 5. Transfer compressed blob back to main thread
    self.postMessage({ success: true, blob });
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message || "Unknown compression error" });
  }
};
