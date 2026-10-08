import { lagStandardroller, STANDARD_ROTASJONSROLLER } from '../logikk/rollebibliotek.js';
import { iDag, mandagForDato } from '../logikk/uke.js';

export const DATAVERSJON = 1;

export const STANDARD_ROM = { bredde: 9, lengde: 10 };

/** Tom startdata. Inneholder bevisst ingen elevnavn. */
export function lagStandarddata(dato = iDag()) {
  return {
    versjon: DATAVERSJON,
    elevlister: [],
    klassekart: [],
    roller: lagStandardroller(),
    innstillinger: {
      aktivElevlisteId: null,
      aktivtKlassekartId: null,
      onsketGruppestorrelse: 4,
      rotasjonStart: mandagForDato(dato),
      rotasjonsroller: [...STANDARD_ROTASJONSROLLER],
      ferier: [],
      ferieimport: { aktiv: true, hentet: null },
      rom: { ...STANDARD_ROM },
    },
  };
}
