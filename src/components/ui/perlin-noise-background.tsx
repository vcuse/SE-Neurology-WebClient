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
      const container = canvas.parentElement;
      if (!container) return;

      // Get the full document height
      const docHeight = Math.max(
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight
      );

      canvas.width = Math.floor(window.innerWidth / 4);
      canvas.height = Math.floor(docHeight / 4);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
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
        const value = (noise + 1) * 0.5 * 255;

        data[i] = value; // red
        data[i + 1] = value; // green
        data[i + 2] = value; // blue
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
