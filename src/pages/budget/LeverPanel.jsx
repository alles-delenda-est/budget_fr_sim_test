import { useId } from 'react'
import { staticYield, STRUCTURAL_LEVERS } from '../../engine/levers.js'
import { START_YEAR } from '../../engine/project.js'
import { SUPPLY_BY_LEVER } from '../../engine/supply.js'
import { PARAM_BY_ID } from '../../engine/params.js'
import { fmt, groupedLevers, sliderStep } from './helpers'
import { InfoPopover, StatusBadge, ParamInfo } from './InfoPopover'

function LeverSlider({ lever, value, onChange, P }) {
  const id = useId()
  const yieldMd = staticYield(lever, value, P)
  const params = [`rend.${lever.id}`, lever.theta?.id, lever.categorie && `dem.m.${lever.categorie}`].filter((p) => p && PARAM_BY_ID[p])
  const startYear = lever.defaultRamp ? START_YEAR + lever.defaultRamp.start : null
  const fullYear = lever.defaultRamp ? startYear + lever.defaultRamp.years - 1 : null
  const rampNote = lever.defaultRamp ? ` (entrée en vigueur en ${startYear}, plein effet en ${fullYear})` : ''
  const rampShort = lever.defaultRamp ? ` (dès ${startYear}, plein effet ${fullYear})` : ''
  const yieldTitle = lever.defaultRamp
    ? `Étalon statique en régime permanent : effet ex ante sur le solde dès ${startYear}, plein effet en ${fullYear}`
    : 'Étalon statique : effet ex ante sur le solde'
  return (
    <div className="sb-lever">
      <div className="sb-lever-head">
        <label htmlFor={id}>{lever.titre}</label>
        <StatusBadge status={lever.statut} />
        {SUPPLY_BY_LEVER[lever.id]?.statut === 'non validé' && (
          <span className="sb-badge sb-badge-flag">{SUPPLY_BY_LEVER[lever.id].nomCourt} : non validé — avis demandé</span>
        )}
        <InfoPopover label={lever.titre}>
          <span className="sb-info-line">{lever.aide}</span>
          <span className="sb-info-line">Étalon par unité : {fmt(staticYield(lever, 1, P), 2, { signed: true })} Md€ par an sur le solde{rampNote} (avant réaction des contribuables et effets sur l'activité).</span>
          {params.map((pid) => (
            <span key={pid} className="sb-info-sub"><strong>{pid}</strong><ParamInfo param={PARAM_BY_ID[pid]} /></span>
          ))}
        </InfoPopover>
      </div>
      <input id={id} type="range" className="sb-slider" min={lever.min} max={lever.max} step={sliderStep(lever)}
        value={value} onChange={(e) => onChange(lever.id, parseFloat(e.target.value))} />
      <div className="sb-lever-foot">
        <span className="sb-lever-value">{fmt(value, 1, { signed: true })} {lever.unite}</span>
        <span className="sb-lever-yield" title={yieldTitle}>
          Étalon statique : <strong>{fmt(yieldMd, 1, { signed: true })} Md€</strong>/an{rampShort}
        </span>
      </div>
    </div>
  )
}

export default function LeverPanel({ values, onChange, onReset, onExtreme, P }) {
  return (
    <section className="sb-section" aria-labelledby="sb-leviers">
      <h2 id="sb-leviers">Leviers</h2>
      <p className="sb-help">Chaque curseur change une mesure à partir de 2027 (sauf l'âge légal de retraite : à partir de janvier 2028, fin du gel LFSS 2026, avec montée en charge sur 6 ans). L'étalon statique est l'effet en régime permanent sur le solde, avant toute réaction : signe positif = solde amélioré.</p>
      <div className="sb-toolbar">
        <button type="button" className="sb-btn" onClick={onReset}>Remettre les leviers à zéro</button>
        <button type="button" className="sb-btn" onClick={() => onExtreme('min')}>Tout au minimum</button>
        <button type="button" className="sb-btn" onClick={() => onExtreme('max')}>Tout au maximum</button>
      </div>
      {groupedLevers().map((g) => (
        <fieldset key={g.id} className="sb-group">
          <legend>{g.titre}</legend>
          <p className="sb-help">{g.aide}</p>
          {g.leviers.map((l) => <LeverSlider key={l.id} lever={l} value={values[l.id] ?? 0} onChange={onChange} P={P} />)}
        </fieldset>
      ))}
      <fieldset className="sb-group sb-group-disabled">
        <legend>Réformes structurelles</legend>
        <p className="sb-help">Non validé — avis demandé. Ces leviers n'ont encore aucun effet budgétaire (σ = 0 en attendant la revue de preuves).</p>
        {STRUCTURAL_LEVERS.map((l) => (
          <div key={l.id} className="sb-lever sb-lever-disabled">
            <div className="sb-lever-head">
              <span>{l.titre}</span>
              <span className="sb-badge sb-badge-flag">Non validé — avis demandé</span>
              <InfoPopover label={l.titre}><span className="sb-info-line">{l.aide}</span></InfoPopover>
            </div>
            <input type="range" className="sb-slider" min={l.min} max={l.max} step={0.1} value={l.defaut} disabled aria-label={l.titre} readOnly />
          </div>
        ))}
      </fieldset>
    </section>
  )
}
