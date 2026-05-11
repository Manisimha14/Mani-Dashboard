import { useEffect } from 'react';

export function useSpotlightCursor() {
  useEffect(() => {
    const spotlight = document.createElement('div');
    spotlight.className = 'spotlight';
    spotlight.style.cssText = `
      position: fixed; pointer-events: none; z-index: 9998;
      width: 400px; height: 400px; border-radius: 50%;
      background: radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%);
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease, width 0.3s, height 0.3s;
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);

    const move = (e: MouseEvent) => {
      spotlight.style.left = `${e.clientX}px`;
      spotlight.style.top = `${e.clientY}px`;
    };

    const enter = () => {
      spotlight.style.width = '600px';
      spotlight.style.height = '600px';
    };
    const leave = () => {
      spotlight.style.width = '400px';
      spotlight.style.height = '400px';
    };

    window.addEventListener('mousemove', move);
    document.querySelectorAll('button, a').forEach(el => {
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
    });

    return () => {
      window.removeEventListener('mousemove', move);
      document.body.removeChild(spotlight);
    };
  }, []);
}

export function useMagneticEffect(strength = 0.3) {
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.transition = 'transform 0.4s cubic-bezier(0.23,1,0.32,1)';
  };
  return { onMouseMove: handleMouseMove, onMouseLeave: handleMouseLeave };
}
