import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

export function AnimatedCounter({ value, duration = 1000 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value && displayValue !== 0) {
      return;
    }

    setIsAnimating(true);
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
        previousValue.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={`transition-all ${isAnimating ? 'scale-110' : 'scale-100'}`}>
      {displayValue.toLocaleString()}
    </span>
  );
}
