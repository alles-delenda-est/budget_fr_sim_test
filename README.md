# Simulateur Budget France

Interactive simulator for French public finances, modelling the État (PLF 2025) and Sécurité Sociale (PLFSS 2026) budgets with 10-year debt projections.

## Current Features

- **Baseline Budget Data**: PLF 2025 + PLFSS 2026 revenue/expenditure breakdown
- **Policy Sliders**: Adjust tax rates (IR, TVA, IS, CSG) and spending categories
- **10-Year Debt Projection Engine** (v1.8):
  - Endogenous interest rates with sovereign risk premium model
  - Fiscal feedback from growth (automatic stabilizers)
  - Structural reform growth effects
  - Doom loop detection
- **Visualisation**: Debt/GDP trajectory chart with Maastricht threshold
- **Clean UI**: Elegant serif typography (Crimson Pro), subdued colour palette

## Tech Stack

- React + Vite
- Recharts for data visualisation
- Pure CSS (no framework)

## Running Locally

```bash
npm install
npm run dev
```

## Project Structure

```
src/
  App.jsx                    # Main UI component
  App.css                    # Styling
  projection-engine-v1.8.js  # Fiscal projection model
  main.jsx                   # Entry point
```

## Next Steps

- [ ] Research and Create Generation Libre pre-sets
- [ ] Add pre-sets to new columns in the baseline tab and rename to detailed baseline(s)
- [ ] Increase granularity within the different variables
- [ ] Export functionality (PDF/CSV)
- [ ] Scenario comparison (save/load configurations)
- [ ] Sensitivity analysis (Monte Carlo on growth/rates)
- [ ] Mobile-responsive layout
- [ ] i18n (English translation)
