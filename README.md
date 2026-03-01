# Simulateur Budget France

Interactive simulator for French public finances, modelling the consolidated État (PLF 2025) and Sécurité Sociale (PLFSS 2026) budgets with 10-year debt projections. Live at **https://budget-fr-sim-test.vercel.app**

## Features

- **Integrated baseline**: full PLF 2025 + PLFSS 2026 revenue and expenditure breakdown (État + Sécurité Sociale, APU total)
- **Policy sliders**: adjust tax rates (IR, TVA, IS, CSG, cotisations sociales) and spending categories in both pillars
- **Four political presets**: PLF 2025 (Barnier), Génération Libre, Knafo (RN/Reconquête), Nouveau Front Populaire
- **ETI-calibrated behavioural response**: tax increases are haircutted by empirical revenue-efficiency factors and generate a growth drag; decreases get a modest supply-side boost
- **Fiscal multipliers**: spending changes generate GDP effects in both directions (education 0.90, health 0.70, transfers 0.40, …)
- **10-year projection engine** with:
  - Endogenous sovereign risk premium (piecewise linear, France-calibrated)
  - Deficit stress premium above 4 % GDP threshold
  - Debt-stock inertia (12.5 % annual rollover, ~8-year full pass-through)
  - Automatic stabilisers (tax elasticity to GDP)
  - Structural reform growth effects (phase-in / peak / decay lifecycle)
  - Unemployment via Okun's Law
  - Doom-loop detection
- **Visualisation**: 4 charts (debt/GDP, deficit/GDP, nominal growth, unemployment) each showing scenario vs baseline; Year-1, Year-5, Year-10 metric snapshots
- **Transparent assumptions tab**: all model parameters with academic sources

## Tech Stack

- React 18 + Vite
- Recharts
- Pure CSS (no framework)
- Vitest (181 unit + integration tests)

## Running Locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # run full test suite
npm run build    # production build
```

## Project Structure

```
src/
  policy-impact.js           # Revenue/spending/growth impact calculation
  projection-engine-v1.8.js  # Multi-year fiscal projection model
  App.jsx                    # UI, charts, presets
  App.css                    # Styling
  main.jsx                   # Entry point
  __tests__/
    policy-impact.test.js      # Unit tests for policy levers
    projection-engine.test.js  # Unit tests for projection engine
    integration.test.js        # End-to-end preset scenarios
```

For a detailed description of the model's architecture, algorithms, and calibration, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Known Limitations

- Collectivités locales and other APU sub-sectors are excluded
- The model is deterministic; no uncertainty bands or Monte Carlo
- Structural reform effects are borrowed from cross-country OECD estimates and carry high uncertainty for France specifically
- All levers are assumed to apply immediately (no phase-in of tax changes)
- The fiscal multipliers use expansion-regime values throughout; recession-regime multipliers are defined but not yet switched automatically

## Potential Next Steps

- [ ] Sensitivity analysis / Monte Carlo on growth and interest rate assumptions
- [ ] Scenario save / compare (store multiple configurations side-by-side)
- [ ] Export functionality (PDF summary, CSV data)
- [ ] Mobile-responsive layout
- [ ] English translation (i18n)
- [ ] Recession-regime multiplier switching based on output gap estimate
