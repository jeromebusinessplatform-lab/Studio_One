import React, { useState, useEffect, useRef } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { motion, AnimatePresence } from 'motion/react';

const fac = new FastAverageColor();

interface ImageWithBlurProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
}

export function ImageWithBlur({ src, alt = "", className = "", containerClassName = "", ...props }: ImageWithBlurProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setDominantColor(null);
    if (!src) return;

    let isMounted = true;
    
    // Load image virtually to extract color and preload
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = src;
    
    img.onload = async () => {
      if (!isMounted) return;
      try {
        const color = await fac.getColorAsync(img);
        if (isMounted) {
          setDominantColor(color.hex);
          setIsLoaded(true);
        }
      } catch (e) {
        if (isMounted) setIsLoaded(true);
      }
    };
    img.onerror = () => {
      if (isMounted) setIsLoaded(true);
    };

    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${containerClassName}`} style={{ backgroundColor: dominantColor || '#f3f4f6' }}>
      <AnimatePresence mode="wait">
        {!isLoaded && (
          <motion.div
            key="blur-placeholder"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 z-10 backdrop-blur-xl bg-white/20"
          />
        )}
      </AnimatePresence>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        {...props}
      />
    </div>
  );
}