/**
 * Generatore di numeri pseudo-casuali con seed (xoshiro128**).
 *
 * Perché non Math.random: gli engine devono essere deterministici dato un seed,
 * così i test sono riproducibili, le mani scriptate delle lezioni sono sempre
 * uguali e una mano giocata si può rigiocare identica.
 *
 * Per le partite "vere" il seed viene da crypto.getRandomValues, quindi il
 * mescolamento non è prevedibile dal giocatore.
 */

export interface Rng {
  /** Numero in [0, 1), come Math.random. */
  next(): number;
  /** Intero uniforme in [0, n). */
  int(n: number): number;
  /** Il seed di partenza, per log e replay. */
  readonly seed: number;
}

/** Mescola i bit di un intero a 32 bit (SplitMix32): serve a espandere il seed in 4 parole di stato. */
function splitmix32(a: number): () => number {
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t = t ^ (t >>> 15)) >>> 0;
  };
}

/** Crea un RNG xoshiro128** a partire da un seed intero. */
export function createRng(seed: number): Rng {
  const sm = splitmix32(seed >>> 0);
  let s0 = sm(), s1 = sm(), s2 = sm(), s3 = sm();

  const nextU32 = (): number => {
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = s1 << 9;
    s2 ^= s0;
    s3 ^= s1;
    s1 ^= s2;
    s0 ^= s3;
    s2 ^= t;
    s3 = rotl(s3, 11);
    return result;
  };

  return {
    seed,
    next: () => nextU32() / 4294967296,
    int: (n: number) => {
      if (!Number.isInteger(n) || n <= 0) throw new Error(`rng.int: n deve essere un intero positivo, ricevuto ${n}`);
      // Rejection sampling per evitare il bias del modulo.
      const limit = 4294967296 - (4294967296 % n);
      let x: number;
      do x = nextU32();
      while (x >= limit);
      return x % n;
    },
  };
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** Seed imprevedibile per le partite reali (crypto se disponibile, altrimenti tempo + Math.random). */
export function randomSeed(): number {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] ?? 0;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
