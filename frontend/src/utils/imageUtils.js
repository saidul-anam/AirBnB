// Image optimization utilities
export const optimizeBase64Image = (
  base64String,
  maxWidth = 400,
  quality = 0.7,
) => {
  return new Promise((resolve) => {
    if (!base64String || !base64String.startsWith("data:image/")) {
      resolve(base64String);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      // Convert back to base64 with compression
      const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedBase64);
    };

    img.onerror = () => resolve(base64String); // Fallback to original
    img.src = base64String;
  });
};

export const FALLBACK_IMAGE_URL = "https://picsum.photos/680/510?random=1";

export const getOptimizedImageUrl = (imageData, size = "medium") => {
  if (!imageData) return FALLBACK_IMAGE_URL;

  // For local property images (from our setup script), return as-is
  if (
    typeof imageData === "string" &&
    imageData.includes("/property-images/")
  ) {
    return imageData;
  }

  // For external URLs (like Unsplash), validate and optimize
  if (typeof imageData === "string" && imageData.startsWith("http")) {
    // If it's an Unsplash URL, check if it's complete and optimize
    if (imageData.includes("unsplash.com")) {
      // Check if URL has proper photo ID (should have more than just base photo ID)
      const photoIdMatch = imageData.match(/photo-(\d+)/);
      if (!photoIdMatch || imageData.length < 60) {
        return FALLBACK_IMAGE_URL;
      }

      // Replace small size parameters with larger ones for better display
      let optimizedUrl = imageData;
      optimizedUrl = optimizedUrl.replace(/w=80/g, "w=800");
      optimizedUrl = optimizedUrl.replace(/h=80/g, "h=600");
      optimizedUrl = optimizedUrl.replace(/q=80/g, "q=85");

      // If no size parameters exist, add them
      if (!optimizedUrl.includes("w=") && !optimizedUrl.includes("h=")) {
        optimizedUrl += "?w=800&h=600&auto=format&fit=crop&q=85";
      }
      return optimizedUrl;
    }

    return imageData;
  }

  // Normalize Windows local absolute paths to fallback asset
  if (
    typeof imageData === "string" &&
    (imageData.startsWith("C:\\") ||
      imageData.startsWith("\\") ||
      imageData.startsWith("file://"))
  ) {
    return FALLBACK_IMAGE_URL;
  }

  // For relative paths (which may not be served) we keep as-is and let onError fallback
  if (typeof imageData === "string" && !imageData.startsWith("data:")) {
    return imageData;
  }

  // For base64 images, return as-is for now
  if (typeof imageData === "string" && imageData.startsWith("data:image/")) {
    return imageData;
  }

  // Anything else: fallback
  return FALLBACK_IMAGE_URL;
};

export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export const lazyLoadImage = (imgElement, src) => {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = src;
            img.classList.remove("lazy");
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: "50px" },
    );

    imgElement.classList.add("lazy");
    observer.observe(imgElement);
  } else {
    // Fallback for browsers without IntersectionObserver
    imgElement.src = src;
  }
};
