import { useEffect, useState } from 'react';

import { motion } from './motion';
import { AppText } from './Text';
import { useReducedMotion } from './useReducedMotion';

type Props = {
  readonly value: number;
  readonly format: (shown: number) => string;
  readonly duration?: number;
};

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/**
 * Conta de 0 até `value` em `duration` ms (padrão `motion.count`) usando `requestAnimationFrame`,
 * formatando cada quadro com `format`. Com movimento reduzido mostra o valor final direto, sem
 * efeito nenhum.
 */
export function CountUp({ value, format, duration = motion.count }: Props) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // Movimento reduzido: nenhum efeito roda, o valor final é lido direto de `value` no render.
    if (reduced) return;
    // `tick` já parte de `progress = 0` no primeiro quadro, então `shown` volta a ~0 sozinho.
    const startedAt = Date.now();
    let frame: number;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / duration);
      setShown(Math.round(easeOutCubic(progress) * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  return (
    <AppText variant="xp" tabular>
      {format(reduced ? value : shown)}
    </AppText>
  );
}
