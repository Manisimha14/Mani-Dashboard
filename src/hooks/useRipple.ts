import { useEffect } from 'react';

export function useRipple() {
  useEffect(() => {
    const createRipple = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) return;

      const circle = document.createElement('span');
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;

      const rect = button.getBoundingClientRect();
      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${event.clientX - rect.left - radius}px`;
      circle.style.top = `${event.clientY - rect.top - radius}px`;
      circle.classList.add('ripple-effect');

      const existingRipple = button.getElementsByClassName('ripple-effect')[0];
      if (existingRipple) {
        existingRipple.remove();
      }

      button.appendChild(circle);

      // Clean up after animation
      setTimeout(() => {
        circle.remove();
      }, 600);
    };

    document.addEventListener('mousedown', createRipple);
    return () => document.removeEventListener('mousedown', createRipple);
  }, []);
}
