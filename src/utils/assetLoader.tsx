import React, { useState, useEffect } from 'react';

/**
 * Blueprint mapping for sample CAD drawings
 */
export const BLUEPRINT_ASSET_MAP: Record<string, string> = {
  'AS-4092-C': '/assets/blueprint-aerospace-flange.png',
  'PPAP-8810-A': '/assets/blueprint-auto-transmission.png',
  'ISO-2044-B': '/assets/blueprint-cnc-manifold.png',
};

// In-memory image cache to prevent re-fetching and flickering
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * Preload a single image with resolution guarantee
 */
export function preloadImage(src: string): Promise<HTMLImageElement | null> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!;
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = src;
  });

  loadingPromises.set(src, promise);
  return promise;
}

/**
 * Get an already cached image synchronously if available
 */
export function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) || null;
}

/**
 * Preload all core application assets immediately
 */
export function preloadAllAssets() {
  const assets = [
    '/assets/hero-studio-showcase.png',
    '/assets/bento-iso-layers.png',
    '/assets/bento-caliper-sync.png',
    '/assets/problem-chaos-vs-order.png',
    '/assets/blueprint-aerospace-flange.png',
    '/assets/blueprint-auto-transmission.png',
    '/assets/blueprint-cnc-manifold.png',
  ];
  assets.forEach(preloadImage);
}

// Call preloader immediately in background
if (typeof window !== 'undefined') {
  preloadAllAssets();
}

/**
 * Safe Image Component with automatic high-DPI canvas fallback
 */
interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackLabel?: string;
  renderCanvasFallback?: (canvas: HTMLCanvasElement) => void;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt = 'SpecBalloon Asset',
  fallbackLabel,
  renderCanvasFallback,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => !!imageCache.get(src));
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;
    preloadImage(src).then((img) => {
      if (!isMounted) return;
      if (img) {
        setIsLoaded(true);
        setHasError(false);
      } else {
        setHasError(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [src]);

  useEffect(() => {
    if (hasError && canvasRef.current) {
      const canvas = canvasRef.current;
      if (renderCanvasFallback) {
        renderCanvasFallback(canvas);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#F5F5F7';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#D1D1D6';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#6E6E73';
          ctx.font = '600 13px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fallbackLabel || alt || 'Technical Diagram', canvas.width / 2, canvas.height / 2);
        }
      }
    }
  }, [hasError, renderCanvasFallback, fallbackLabel, alt]);

  if (hasError) {
    return (
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className={`w-full h-auto object-cover rounded-xl ${className}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-80'} ${className}`}
      {...props}
    />
  );
};
