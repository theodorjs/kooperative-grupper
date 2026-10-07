// Tildeling av elever til plasser. Alle funksjonene er rene: de returnerer
// et nytt klassekart og endrer aldri det som sendes inn.
//
// En plass identifiseres med { gruppeId, indeks }, der indeks er pultens
// posisjon i gruppas mal (ikke plassnummeret, som læreren kan endre).

export function finnElev(klassekart, elevId) {
  for (const gruppe of klassekart.bordgrupper) {
    const indeks = gruppe.plasser.findIndex((p) => p.elevId === elevId);
    if (indeks !== -1) return { gruppeId: gruppe.id, indeks, gruppe, plass: gruppe.plasser[indeks] };
  }
  return null;
}

export function plasserteElevIder(klassekart) {
  const ider = new Set();
  for (const g of klassekart.bordgrupper) for (const p of g.plasser) if (p.elevId) ider.add(p.elevId);
  return ider;
}

function hentPlass(kart, { gruppeId, indeks }) {
  return kart.bordgrupper.find((g) => g.id === gruppeId)?.plasser[indeks] ?? null;
}

/**
 * Setter en elev på en plass. Sitter det noen der fra før, bytter de to plass
 * (eller den som satt der blir uten plass, hvis eleven kom fra elevlista).
 * En lås følger eleven.
 */
export function plasserElev(klassekart, elevId, til) {
  const kart = structuredClone(klassekart);
  const maal = hentPlass(kart, til);
  if (!maal) return klassekart;

  const fra = finnElev(kart, elevId);
  if (fra && fra.gruppeId === til.gruppeId && fra.indeks === til.indeks) return klassekart;

  const fortrengt = { elevId: maal.elevId, last: maal.last };
  const flyttetLast = fra ? fra.plass.last : false;

  maal.elevId = elevId;
  maal.last = flyttetLast;

  if (fra) {
    fra.plass.elevId = fortrengt.elevId;
    fra.plass.last = Boolean(fortrengt.elevId && fortrengt.last);
  }
  return kart;
}

export function fjernFraPlass(klassekart, elevId) {
  const kart = structuredClone(klassekart);
  for (const g of kart.bordgrupper) {
    for (const p of g.plasser) {
      if (p.elevId === elevId) {
        p.elevId = null;
        p.last = false;
      }
    }
  }
  return kart;
}

export function settLas(klassekart, { gruppeId, indeks }, last) {
  const kart = structuredClone(klassekart);
  const plass = hentPlass(kart, { gruppeId, indeks });
  if (plass) plass.last = Boolean(last && plass.elevId);
  return kart;
}

export function tomAllePlasser(klassekart) {
  const kart = structuredClone(klassekart);
  for (const g of kart.bordgrupper) {
    for (const p of g.plasser) {
      p.elevId = null;
      p.last = false;
    }
  }
  return kart;
}

/** Fisher–Yates. `tilfeldig` kan byttes ut i tester. */
export function stokk(liste, tilfeldig = Math.random) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(tilfeldig() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fyller alle plasser tilfeldig. Låste elever blir sittende. Elever som ikke
 * får plass (flere elever enn plasser) står igjen uten plass.
 */
export function tilfeldigFordeling(klassekart, elevIder, tilfeldig = Math.random) {
  const kart = structuredClone(klassekart);
  const gyldige = new Set(elevIder);
  const laste = new Set();
  const ledige = [];

  for (const g of kart.bordgrupper) {
    for (const p of g.plasser) {
      if (p.last && p.elevId && gyldige.has(p.elevId) && !laste.has(p.elevId)) {
        laste.add(p.elevId);
      } else {
        p.elevId = null;
        p.last = false;
        ledige.push(p);
      }
    }
  }

  const elever = stokk(elevIder.filter((id) => !laste.has(id)), tilfeldig);
  const plasser = stokk(ledige, tilfeldig);
  plasser.forEach((p, i) => {
    p.elevId = elever[i] ?? null;
  });
  return kart;
}

/** Fjerner elev-ID-er som ikke finnes i elevlista (f.eks. etter sletting). */
export function ryddUkjenteElever(klassekart, elevIder) {
  const gyldige = new Set(elevIder);
  const kart = structuredClone(klassekart);
  for (const g of kart.bordgrupper) {
    for (const p of g.plasser) {
      if (p.elevId && !gyldige.has(p.elevId)) {
        p.elevId = null;
        p.last = false;
      }
    }
  }
  return kart;
}
