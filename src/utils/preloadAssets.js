// Simple image preloader to warm browser cache and reduce stutter
// Usage: preloadImages([img1, img2, ...])

export function preloadImages(imageUrls = []) {
  const unique = Array.from(new Set(imageUrls.filter(Boolean)));
  return Promise.all(
    unique.map(
      (src) =>
        new Promise((resolve) => {
          try {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // resolve anyway; don't block
            img.src = src;
          } catch (_) {
            resolve();
          }
        })
    )
  );
}


