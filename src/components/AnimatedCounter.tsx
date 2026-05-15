import React, { useEffect, useState } from 'react';
import { animate, useMotionValue, useTransform, motion } from 'framer-motion';

interface Props {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export default function AnimatedCounter({ value, duration = 2, formatter = (v) => Math.round(v).toString(), className }: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => formatter(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, count, duration]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
