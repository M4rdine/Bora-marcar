import * as Crypto from 'expo-crypto';

import type { IdGenerator } from '@/application/ports';

export const randomIdGenerator = (): IdGenerator => ({ next: () => Crypto.randomUUID() });
