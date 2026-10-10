import { useEffect, useMemo, useRef, useState } from 'react';
import {
  aktivElevliste,
  aktivtKlassekart,
  dupliserKlassekart,
  elevlisteForKart,
  endreKlassekartnavn,
  nyttKlassekart,
  oppdaterInnstillinger,
  oppdaterKlassekart,
  slettKlassekart,
  standardKartnavn,
  velgKlassekart,
} from '../data/operasjoner.js';
import {
  antallMedEgenRetning,
  antallPlasser,
  automatiskOrientering,
  begrensTilRom,
  beregnGruppestorrelser,
  beskrivAvvik,
  elevordForm,
  endreGruppestorrelse,
  eleverSomMisterPlass,
  gruppenavn,
  harEgetOppsett,
  lagBordgrupper,
  nummererGrupper,
  nyBordgruppe,
  nyNummerering,
  ordneIRutenett,
  settAutomatiskOrientering,
  settGruppenummer,
  settGruppeoppsett,
  settKlasseoppsett,
  standardNummerering,
} from '../logikk/grupper.js';
import { effektivtOppsett } from '../logikk/maler.js';
import { gruppeRotasjon } from '../logikk/orientering.js';
import { rotasjonsroller } from '../logikk/rollebibliotek.js';
import { ferieForUke, ukeforskyvning } from '../logikk/roller.js';
import {
  fjernFraPlass,
  plasserElev,
  plasserteElevIder,
  settLas,
  tilfeldigFordeling,
  tomAllePlasser,
} from '../logikk/tildeling.js';
import { formaterDato, iDag, ukeoverskrift } from '../logikk/uke.js';
import Bordgruppe from './Bordgruppe.jsx';
import Elevpanel from './Elevpanel.jsx';
import Gruppedetaljer from './Gruppedetaljer.jsx';
import Info from './Info.jsx';
import Oppsettmeny from './Oppsettmeny.jsx';
import { Utskriftsknapp, useUtskrift } from './Utskrift.jsx';
import { SKALA } from './Pult.jsx';

const DRAGTERSKEL = 5; // piksler før et klikk regnes som en dragning

function finnSlippmaal(klientX, klientY) {
  const element = document.elementFromPoint(klientX, klientY);
  const plass = element?.closest('[data-plass]');
  if (plass) {
    const [gruppeId, indeks] = plass.getAttribute('data-plass').split(':');
    return { type: 'plass', id: plass.getAttribute('data-plass'), gruppeId, indeks: Number(indeks) };
  }
  if (element?.closest('[data-elevpanel]')) return { type: 'panel' };
  return null;
}

function Kartvelger({ data, kart, endre, idag }) {
  function nytt() {
    const navn = window.prompt('Navn på det nye klassekartet:', standardKartnavn(data));
    if (navn !== null) endre((d) => nyttKlassekart(d, navn, idag));
  }
  function dupliser() {
    const navn = window.prompt('Navn på kopien:', `${kart.navn} (kopi)`);
    if (navn !== null) endre((d) => dupliserKlassekart(d, kart.id, navn, idag));
  }
  function giNyttNavn() {
    const navn = window.prompt('Nytt navn på klassekartet:', kart.navn);
    if (navn) endre((d) => endreKlassekartnavn(d, kart.id, navn));
  }
  function slett() {
    if (window.confirm(`Vil du slette klassekartet «${kart.navn}»? Dette kan ikke angres.`)) {
      endre((d) => slettKlassekart(d, kart.id));
    }
  }

  const flereLister = data.elevlister.length > 1;
  const listenavn = (id) => data.elevlister.find((l) => l.id === id)?.navn ?? 'ukjent liste';

  return (
    <Verktoygruppe tittel="Klassekart">
      <label className="kartvalg">
        <span className="skjult">Velg klassekart</span>
        <select value={kart?.id ?? ''} onChange={(e) => endre((d) => velgKlassekart(d, e.target.value))}>
          {!kart && <option value="">Ingen valgt</option>}
          {data.klassekart.map((k) => (
            <option key={k.id} value={k.id}>
              {k.navn} ({formaterDato(k.opprettet, true)}){flereLister ? ` – ${listenavn(k.elevlisteId)}` : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="knapperad">
        <button type="button" onClick={nytt}>
          Nytt
        </button>
        {kart && (
          <>
            <button type="button" onClick={dupliser}>
              Dupliser
            </button>
            <button type="button" onClick={giNyttNavn}>
              Gi nytt navn
            </button>
          </>
        )}
      </div>
      {kart && (
        <Farerad>
          <button type="button" className="fare" onClick={slett}>
            Slett
          </button>
        </Farerad>
      )}
    </Verktoygruppe>
  );
}

/**
 * Automatisk orientering for alle bordgruppene i kartet. Avkrysset når alle
 * gruppene har det, halvveis når bare noen har det.
 */
function Orienteringsvalg({ bordgrupper, onEndre }) {
  const boks = useRef(null);
  const tilstand = automatiskOrientering(bordgrupper);
  const automatiske = bordgrupper.filter((g) => g.rotasjon === null).length;

  // Halvveis-merket kan bare settes fra skript, og et klikk fjerner det.
  const settHalvveis = () => {
    if (boks.current) boks.current.indeterminate = tilstand === 'noen';
  };
  useEffect(settHalvveis);

  function endre() {
    const pa = tilstand !== 'alle';
    const egne = antallMedEgenRetning(bordgrupper);
    if (pa && egne > 0) {
      const hvem = egne === 1 ? '1 bordgruppe' : `${egne} bordgrupper`;
      const sporsmal = `${hvem} har en egen retning som blir borte. Vil du slå på automatisk orientering for alle?`;
      if (!window.confirm(sporsmal)) {
        settHalvveis();
        return;
      }
    }
    onEndre(pa);
  }

  return (
    <div className="orienteringsvalg">
      <label className="avkryssing">
        <input
          ref={boks}
          type="checkbox"
          checked={tilstand === 'alle'}
          disabled={tilstand === 'tom'}
          onChange={endre}
          aria-describedby="orientering-forklaring"
        />
        Automatisk orientering
      </label>
      <Info id="orientering-forklaring" className="dempet liten">
        Automatisk orientering roterer pultene sånn at elevene ser mot tavla.
      </Info>
      {tilstand === 'noen' && (
        <p className="dempet liten">
          {automatiske} av {bordgrupper.length} bordgrupper har automatisk orientering.
        </p>
      )}
    </div>
  );
}

/**
 * Knapper som sletter eller tømmer, nederst og midtstilt i rammen (i
 * Bordgrupper: i delen før skillelinja). Rammene på samme rad er like høye,
 * så disse knappene står på linje.
 */
function Farerad({ children }) {
  return <div className="farerad">{children}</div>;
}

/** En gruppe verktøy med overskrift, så knappene står samlet etter hva de virker på. */
function Verktoygruppe({ tittel, klasse = '', children }) {
  return (
    <section className={`verktoygruppe ${klasse}`.trim()} aria-label={tittel}>
      <h2 className="verktoygruppe-tittel">{tittel}</h2>
      {children}
    </section>
  );
}

export default function Klassekart({ data, endre }) {
  const kart = aktivtKlassekart(data);
  const liste = kart ? elevlisteForKart(data, kart) : aktivElevliste(data);
  const elever = useMemo(() => liste?.elever ?? [], [liste]);
  const { rom, onsketGruppestorrelse, rotasjonStart, ferier } = data.innstillinger;

  const [valgtId, setValgtId] = useState(null);
  const [visRoller, setVisRoller] = useState(false);
  const [renummerering, setRenummerering] = useState(null); // { gruppeId, rekkefolge }
  const [drag, setDrag] = useState(null);
  const svgRef = useRef(null);
  const utskrift = useUtskrift('portrait');

  const idag = iDag();
  const ferie = ferieForUke(idag, ferier);
  const rolleuke = visRoller && !ferie ? ukeforskyvning(rotasjonStart, idag, ferier) : null;
  const roller = rotasjonsroller(data);
  const rollefarger = roller.map((r) => r.farge);
  const navn = useMemo(() => new Map(elever.map((e) => [e.id, e.navn])), [elever]);

  const kartId = kart?.id;
  const valgt = kart?.bordgrupper.find((g) => g.id === valgtId) ?? null;

  // --- Endringer ----------------------------------------------------------

  const endreKart = (endring) => endre((d) => oppdaterKlassekart(d, kartId, endring));
  const endreGruppe = (gruppeId, endring) =>
    endreKart((k) => ({ ...k, bordgrupper: k.bordgrupper.map((g) => (g.id === gruppeId ? endring(g) : g)) }));

  function lagGrupperPaNytt() {
    const storrelser = beregnGruppestorrelser(elever.length, onsketGruppestorrelse);
    const antall = (n) => storrelser.filter((s) => s === n).length;
    const beskrivelse = [...new Set(storrelser)]
      .map((n) => `${antall(n)} ${antall(n) === 1 ? 'gruppe' : 'grupper'} med ${n}`)
      .join(' og ');
    const harPlasserte = plasserteElevIder(kart).size > 0;
    const sporsmal = `Lage nye bordgrupper for ${elever.length} ${elevordForm(elever.length)}: ${beskrivelse}?${
      harPlasserte ? ' Alle elever blir uten plass.' : ''
    }`;
    if (!window.confirm(sporsmal)) return;
    setValgtId(null);
    setRenummerering(null);
    endreKart((k) => ({ ...k, bordgrupper: lagBordgrupper(storrelser, rom, k) }));
  }

  function leggTilGruppe() {
    const gruppe = nyBordgruppe(kart, onsketGruppestorrelse, rom);
    endreKart((k) => ({ ...k, bordgrupper: [...k.bordgrupper, gruppe] }));
    setValgtId(gruppe.id);
  }

  function fjernGruppe(gruppe) {
    const antall = gruppe.plasser.filter((p) => p.elevId).length;
    const tillegg = antall ? ` ${antall} ${elevordForm(antall)} blir uten plass.` : '';
    if (!window.confirm(`Fjerne ${gruppenavn(gruppe)}?${tillegg} De andre gruppene får nye numre.`)) return;
    setValgtId(null);
    setRenummerering(null);
    endreKart((k) => ({ ...k, bordgrupper: nummererGrupper(k.bordgrupper.filter((g) => g.id !== gruppe.id)) }));
  }

  function endreStorrelse(gruppe, storrelse) {
    if (storrelse === gruppe.storrelse) return;
    const mister = eleverSomMisterPlass(gruppe, storrelse);
    if (mister.length) {
      const navnene = mister.map((id) => navn.get(id) ?? 'ukjent').join(', ');
      if (!window.confirm(`${navnene} blir uten plass. Fortsette?`)) return;
    }
    setRenummerering(null);
    endreGruppe(gruppe.id, (g) => endreGruppestorrelse(g, storrelse));
  }

  function ordne() {
    const rettes = antallMedEgenRetning(kart.bordgrupper) > 0 ? ' Grupper som er dreid for hånd, settes rett.' : '';
    if (window.confirm(`Flytte alle bordgruppene tilbake til rutenettet?${rettes}`)) {
      endreKart((k) => ({ ...k, bordgrupper: ordneIRutenett(k.bordgrupper, rom, k) }));
    }
  }

  // Layout for alle grupper med en størrelse, eller for én gruppe (null = som klassen).
  function velgKlasseoppsett(storrelse, oppsettId) {
    setRenummerering(null);
    endreKart((k) => settKlasseoppsett(k, storrelse, oppsettId));
  }

  function velgGruppeoppsett(gruppeId, oppsettId) {
    setRenummerering(null);
    endreKart((k) => ({
      ...k,
      bordgrupper: k.bordgrupper.map((g) => (g.id === gruppeId ? settGruppeoppsett(g, oppsettId, k) : g)),
    }));
  }

  function fordelTilfeldig() {
    const ider = elever.map((e) => e.id);
    const harPlasserte = kart.bordgrupper.some((g) => g.plasser.some((p) => p.elevId && !p.last));
    if (harPlasserte && !window.confirm('Alle elever som ikke er låst, får ny plass. Fortsette?')) return;
    endreKart((k) => tilfeldigFordeling(k, ider));
  }

  function tomAlle() {
    if (window.confirm('Tømme alle plasser? Også låste elever blir uten plass.')) endreKart(tomAllePlasser);
  }

  const las = (sted, verdi) => endreKart((k) => settLas(k, sted, verdi));

  // --- Dra og slipp ---------------------------------------------------------

  function svgPunkt(klientX, klientY) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(klientX, klientY).matrixTransform(ctm.inverse());
    return { x: p.x / SKALA, y: p.y / SKALA };
  }

  function startGruppedrag(e, gruppe) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const p = svgPunkt(e.clientX, e.clientY);
    setDrag({
      type: 'gruppe',
      gruppeId: gruppe.id,
      forskyvning: { x: p.x - gruppe.x, y: p.y - gruppe.y },
      start: { x: e.clientX, y: e.clientY },
      pos: { x: gruppe.x, y: gruppe.y },
      flyttet: false,
    });
  }

  function startElevdrag(e, elevId, fra) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      type: 'elev',
      elevId,
      fra,
      start: { x: e.clientX, y: e.clientY },
      klient: { x: e.clientX, y: e.clientY },
      flyttet: false,
      maal: null,
    });
  }

  function pultPeker(e, gruppe, indeks) {
    if (renummerering?.gruppeId === gruppe.id) {
      e.preventDefault();
      e.stopPropagation();
      if (renummerering.rekkefolge.includes(indeks)) return;
      const rekkefolge = [...renummerering.rekkefolge, indeks];
      if (rekkefolge.length === gruppe.storrelse) {
        endreGruppe(gruppe.id, (g) => nyNummerering(g, rekkefolge));
        setRenummerering(null);
      } else {
        setRenummerering({ gruppeId: gruppe.id, rekkefolge });
      }
      return;
    }
    const elevId = gruppe.plasser[indeks].elevId;
    if (elevId) startElevdrag(e, elevId, { gruppeId: gruppe.id, indeks });
    else startGruppedrag(e, gruppe);
  }

  // Håndtererne byttes ut ved hver tegning, så de alltid ser ferske data.
  const handtere = useRef({});
  handtere.current = {
    flytt(e) {
      if (!drag) return;
      const flyttet = drag.flyttet || Math.hypot(e.clientX - drag.start.x, e.clientY - drag.start.y) > DRAGTERSKEL;
      if (drag.type === 'gruppe') {
        const p = svgPunkt(e.clientX, e.clientY);
        const pos = begrensTilRom({ x: p.x - drag.forskyvning.x, y: p.y - drag.forskyvning.y }, rom);
        setDrag({ ...drag, pos, flyttet });
      } else {
        const maal = flyttet ? finnSlippmaal(e.clientX, e.clientY) : null;
        setDrag({ ...drag, klient: { x: e.clientX, y: e.clientY }, flyttet, maal });
      }
    },
    slipp() {
      if (!drag) return;
      if (drag.type === 'gruppe') {
        if (drag.flyttet) endreGruppe(drag.gruppeId, (g) => ({ ...g, x: drag.pos.x, y: drag.pos.y }));
        else setValgtId(drag.gruppeId);
      } else if (!drag.flyttet) {
        if (drag.fra) setValgtId(drag.fra.gruppeId);
      } else if (drag.maal?.type === 'plass') {
        const { gruppeId, indeks } = drag.maal;
        endreKart((k) => plasserElev(k, drag.elevId, { gruppeId, indeks }));
      } else if (drag.maal?.type === 'panel' && drag.fra) {
        endreKart((k) => fjernFraPlass(k, drag.elevId));
      }
      setDrag(null);
    },
    avbryt() {
      setDrag(null);
    },
  };

  const dragAktiv = drag !== null;
  useEffect(() => {
    if (!dragAktiv) return undefined;
    const flytt = (e) => handtere.current.flytt(e);
    const slipp = (e) => handtere.current.slipp(e);
    const avbryt = () => handtere.current.avbryt();
    const tast = (e) => e.key === 'Escape' && avbryt();
    window.addEventListener('pointermove', flytt);
    window.addEventListener('pointerup', slipp);
    window.addEventListener('pointercancel', avbryt);
    window.addEventListener('keydown', tast);
    document.body.classList.add('drar');
    return () => {
      window.removeEventListener('pointermove', flytt);
      window.removeEventListener('pointerup', slipp);
      window.removeEventListener('pointercancel', avbryt);
      window.removeEventListener('keydown', tast);
      document.body.classList.remove('drar');
    };
  }, [dragAktiv]);

  // Glem valgt gruppe hvis den ikke finnes lenger (f.eks. etter bytte av kart).
  useEffect(() => {
    if (valgtId && !valgt) setValgtId(null);
  }, [valgtId, valgt]);

  // På smale skjermer (iPad på høykant) står gruppedetaljene under kartet.
  // Rull dem fram når læreren velger en gruppe, men ikke mens noe dras.
  useEffect(() => {
    if (!valgtId || !window.matchMedia?.('(max-width: 900px)').matches) return;
    document.querySelector('.gruppedetaljer')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [valgtId]);

  // --- Tegning --------------------------------------------------------------

  if (!kart) {
    return (
      <div className="klassekartside">
        <section className="kort verktoy ikke-utskrift">
          <div className="verktoygrupper">
            <Kartvelger data={data} kart={null} endre={endre} idag={idag} />
          </div>
          <p className="status">Det finnes ikke noe klassekart for denne elevlisten ennå. Trykk «Nytt» for å lage et.</p>
        </section>
      </div>
    );
  }

  const plasser = antallPlasser(kart);
  const avvik = beskrivAvvik(elever.length, plasser);
  const ikkePlassert = elever.length - plasserteElevIder(kart).size;
  const visningsgrupper = kart.bordgrupper.map((g) =>
    drag?.type === 'gruppe' && drag.gruppeId === g.id ? { ...g, x: drag.pos.x, y: drag.pos.y } : g,
  );
  const draElevId = drag?.type === 'elev' && drag.flyttet ? drag.elevId : null;
  const tavlebredde = Math.min(rom.bredde * 0.45, 4.5) * SKALA;
  const W = rom.bredde * SKALA;
  const L = rom.lengde * SKALA;

  return (
    <div className={`klassekartside ${utskrift.papirklasse}`}>
      {utskrift.sidestil}

      <section className="kort verktoy ikke-utskrift">
        <div className="verktoygrupper">
          <Kartvelger data={data} kart={kart} endre={endre} idag={idag} />

          <Verktoygruppe tittel="Bordgrupper" klasse="bordgrupper">
            <div className="bordgrupperdeler">
              <div className="bordgrupperdel">
                <div className="knapperad">
                  <label className="kartvalg">
                    <span>Ønsket størrelse</span>
                    <select
                      value={onsketGruppestorrelse}
                      onChange={(e) =>
                        endre((d) => oppdaterInnstillinger(d, { onsketGruppestorrelse: Number(e.target.value) }))
                      }
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Oppsettmeny kart={kart} rom={rom} onVelg={velgKlasseoppsett} onOrdne={ordne} />
                </div>
                <button type="button" onClick={leggTilGruppe}>
                  Legg til bordgruppe
                </button>
                <Farerad>
                  <button type="button" className="fare" onClick={lagGrupperPaNytt}>
                    Lag grupper på nytt
                  </button>
                </Farerad>
              </div>
              <div className="verktoydel">
                <button type="button" onClick={ordne}>
                  Ordne i rutenett
                </button>
                <Orienteringsvalg
                  bordgrupper={kart.bordgrupper}
                  onEndre={(pa) =>
                    endreKart((k) => ({ ...k, bordgrupper: settAutomatiskOrientering(k.bordgrupper, pa) }))
                  }
                />
              </div>
            </div>
          </Verktoygruppe>

          <Verktoygruppe tittel="Elever">
            <button type="button" className="hoved" onClick={fordelTilfeldig} disabled={elever.length === 0}>
              Tilfeldig fordeling
            </button>
            <Farerad>
              <button type="button" className="fare" onClick={tomAlle}>
                Tøm alle plasser
              </button>
            </Farerad>
          </Verktoygruppe>

          <Verktoygruppe tittel="Visning">
            <label className="avkryssing">
              <input type="checkbox" checked={visRoller} onChange={(e) => setVisRoller(e.target.checked)} />
              Vis roller denne uka
            </label>
            <label className="avkryssing">
              <input
                type="checkbox"
                checked={kart.visGruppenavn !== false}
                onChange={(e) => endreKart((k) => ({ ...k, visGruppenavn: e.target.checked }))}
              />
              Vis gruppenavn
            </label>
            <Utskriftsknapp tekst="Skriv ut klassekart" onSkrivUt={utskrift.skrivUt} />
          </Verktoygruppe>
        </div>

        <p className="status" role="status">
          <strong>{elever.length}</strong> {elevordForm(elever.length)} · <strong>{plasser}</strong>{' '}
          {plasser === 1 ? 'plass' : 'plasser'} · <strong>{kart.bordgrupper.length}</strong> bordgrupper
          {avvik && <span className="avvik"> · {avvik}</span>}
          {ikkePlassert > 0 && !(avvik && elever.length - plasser === ikkePlassert) && (
            <span> · {ikkePlassert} ikke plassert ennå</span>
          )}
          {visRoller && ferie && <span> · Ferie denne uka, rollene vises ikke</span>}
          <span className="dempet lagres"> Endringer lagres automatisk.</span>
        </p>
      </section>

      <div className="kart-oppsett">
        <section className="kort kartflate">
          <div className="kun-utskrift utskriftstopp">
            <h1>{kart.navn}</h1>
            <p>{formaterDato(idag, true)}</p>
          </div>

          <svg
            ref={svgRef}
            className="kart-svg"
            viewBox={`${-45} ${-75} ${W + 90} ${L + 125}`}
            role="img"
            aria-label={`Klassekart ${kart.navn}, ${kart.bordgrupper.length} bordgrupper`}
          >
            <rect className="rom" x={0} y={0} width={W} height={L} onPointerDown={() => setValgtId(null)} />
            <rect className="tavle" x={(W - tavlebredde) / 2} y={-7} width={tavlebredde} height={14} rx={3} />
            <text className="tavletekst" x={W / 2} y={-26}>
              Tavla
            </text>
            {visningsgrupper.map((g) => (
              <Bordgruppe
                key={g.id}
                gruppe={g}
                oppsett={effektivtOppsett(g, kart)}
                rotasjon={gruppeRotasjon(g, rom)}
                navn={navn}
                valgt={g.id === valgtId}
                rolleuke={rolleuke}
                rollefarger={rollefarger}
                maal={drag?.maal?.type === 'plass' ? drag.maal.id : null}
                draElevId={draElevId}
                renummerering={renummerering?.gruppeId === g.id ? renummerering.rekkefolge : null}
                onGruppePeker={(e) => startGruppedrag(e, g)}
                onPultPeker={(e, indeks) => pultPeker(e, g, indeks)}
                visNavn={kart.visGruppenavn !== false}
              />
            ))}
          </svg>

          {rolleuke !== null && (
            <ul className="rolleforklaring">
              {roller.map((rolle) => (
                <li key={rolle.nummer}>
                  <span className="rolleprikk" style={{ background: rolle.farge }}>
                    {rolle.nummer}
                  </span>
                  {rolle.navn}
                </li>
              ))}
              <li className="dempet">{ukeoverskrift(idag)}</li>
            </ul>
          )}
        </section>

        <div className="sidepanel ikke-utskrift">
          {valgt ? (
            <Gruppedetaljer
              gruppe={valgt}
              antallGrupper={kart.bordgrupper.length}
              onNummer={(n) => endreKart((k) => ({ ...k, bordgrupper: settGruppenummer(k.bordgrupper, valgt.id, n) }))}
              onNavn={(tekst) => endreGruppe(valgt.id, (g) => ({ ...g, navn: tekst }))}
              oppsett={effektivtOppsett(valgt, kart)}
              egetOppsett={harEgetOppsett(valgt, kart)}
              navn={navn}
              renummerering={renummerering?.gruppeId === valgt.id ? renummerering.rekkefolge : null}
              onStorrelse={(n) => endreStorrelse(valgt, n)}
              onOppsett={(id) => velgGruppeoppsett(valgt.id, id)}
              onRotasjon={(r) => endreGruppe(valgt.id, (g) => ({ ...g, rotasjon: r }))}
              onLas={las}
              onStartRenummerering={() => setRenummerering({ gruppeId: valgt.id, rekkefolge: [] })}
              onAvbrytRenummerering={() => setRenummerering(null)}
              onStandardNummerering={() => endreGruppe(valgt.id, standardNummerering)}
              onFjern={() => fjernGruppe(valgt)}
              onLukk={() => {
                setValgtId(null);
                setRenummerering(null);
              }}
            />
          ) : (
            <Info className="hint kort">
              Dra en bordgruppe for å flytte den. Klikk på en gruppe for å endre størrelse, layout, retning eller
              nummerering.
            </Info>
          )}
          <Elevpanel
            elever={elever}
            kart={kart}
            erMaal={drag?.type === 'elev' && drag.maal?.type === 'panel' && Boolean(drag.fra)}
            draElevId={draElevId}
            onStartDrag={startElevdrag}
            onLas={las}
          />
        </div>
      </div>

      {drag?.type === 'elev' && drag.flyttet && (
        <div className="dragespokelse" style={{ left: drag.klient.x, top: drag.klient.y }} aria-hidden>
          {navn.get(drag.elevId)}
        </div>
      )}
    </div>
  );
}
