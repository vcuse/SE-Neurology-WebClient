import { useEffect, useRef } from 'react';
import { createNoise2D } from 'simplex-noise';

interface PerlinNoiseBackgroundProps {
  style?: React.CSSProperties;
  className?: string;
}

const PerlinNoiseBackground: React.FC<PerlinNoiseBackgroundProps> = ({ style, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastFrameTimeRef = useRef(0);
  const FPS = 30;
  const frameInterval = 1000 / FPS;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const noise2D = createNoise2D();
    let animationFrameId: number;

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth / 4);
      canvas.height = Math.floor(window.innerHeight / 4);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current < frameInterval) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = timestamp;

      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      const time = Date.now() * 0.0001;

      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor((i / 4) / canvas.width);

        const nx = x / canvas.width - 0.5;
        const ny = y / canvas.height - 0.5;

        const noise = noise2D(nx + time, ny + time);
        const value = (noise + 2) * 0.5;

        // // Light blue tones with more contrast
        // const baseBlue = 75; // Lower base value for more contrast
        // const blueVariation = 180; // More variation for visibility
        
        // Create more contrast between light and dark areas
        const contrastValue = Math.pow(value, 1.5); // Increase contrast by applying power function
        
        // data[i] = Math.floor(baseBlue + contrastValue * 20); // red
        // data[i + 1] = Math.floor(baseBlue + contrastValue * 30); // green
        // data[i + 2] = Math.floor(baseBlue + contrastValue * blueVariation); // blue
        // data[i + 3] = 255; // alpha

        data[i] = Math.floor(contrastValue * 149); // red
        data[i + 1] = Math.floor(contrastValue * 174); // green
        data[i + 2] = Math.floor(contrastValue * 232); // blue
        data[i + 3] = 255; // alpha
      }

      ctx.putImageData(imageData, 0, 0);
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    animationFrameId = requestAnimationFrame(animate);

    const debouncedResize = debounce(resize, 250);
    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [frameInterval]);

  function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
    />
  );
};

export default PerlinNoiseBackground;
