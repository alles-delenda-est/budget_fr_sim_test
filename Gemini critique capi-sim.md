### 1) Algorithmic Issues and Weaknesses                                                                                                                                      │
│  2 *   **Monte Carlo Simulation Weakness:** In `src/monte-carlo-worker.js`, the stochastic simulation uses a **"persistent shock" model**. It draws only *one* set of correlated │
│    shocks per 55-year run and applies them as a permanent regime shift, rather than modeling realistic, year-over-year volatility paths.                                         │
│  3 *   **Demographic Simplification:** In `src/simulation-engine.js`, the demographic change mechanism (`cohIdx`) uses a mathematically parametric curve (exponential decay with │
│    linear blending) rather than empirical, actuarial mortality tables (e.g., INSEE T60).                                                                                         │
│  4 *   **Endogenous Feedback Limitations:** While borrowing rates are correctly made endogenous based on debt-to-GDP, there is no similar scaling/general-equilibrium penalty    │
│    applied to the capitalisation return (`r_c`). As the fund grows to unprecedented sizes, the algorithm fails to depress equity premia, leading to potentially overstated       │
│    terminal fund balances.                                                                                                                                                       │
│  5                                                                                                                                                                               │
│  6 ### 2) Assumptions Weaknesses                                                                                                                                                 │
│  7 The codebase successfully addresses many of the severe weaknesses from the legacy model via the `critique.md` recommendations, but relies on parameterized approximations:    │
│  8 *   **Endogenous Borrowing Rate:** Implemented via a piecewise linear model (`calculateBorrowingRate`) with thresholds at 150%, 200%, and 300% debt-to-GDP. This accurately   │
│    reflects credit risk concerns, but relies on hardcoded basis-point penalty assumptions rather than dynamic market data.                                                       │
│  9 *   **HLM Price Discounts:** The volume-dependent price discount logic handles supply shocks well (max 30% discount controlled by `delta`). However, it assumes uniform       │
│    national absorption, failing to differentiate between deep (Île-de-France) and shallow (provincial) housing markets.                                                          │
│ 10 *   **Equinoxe Progressive Reduction:** Correctly swaps the arbitrary 1.5×SMIC step-function for a progressive curve (from 0.1% at €1800 to 20% >€4000). The mathematical     │
│    integration used (`equinoxeSavings`) assumes a uniform density within DREES deciles, which slightly distorts the heavily right-skewed top decile savings.                     │
│ 11 *   **Fisher Conversion:** The model correctly utilizes the exact Fisher equation `(1 + r_f)(1 + pi) - 1` for nominal/real accounting instead of linear approximations,       │
│    ensuring compounding accuracy over the 55-year horizon.                                                                                                                       │
│ 12                                                                                                                                                                               │
│ 13 ### 3) Documentation Gaps                                                                                                                                                     │
│ 14 *   **Obsolete Master Documentation:** There is a severe synchronization gap. `cdc_legacy_fund_model.md` describes the older `originalV5` model. It explicitly lacks          │
│    documentation for the current codebase's core features: the endogenous borrowing rate mechanism, the HLM price discount formula, the Equinoxe progressive pension cuts, and   │
│    the Monte Carlo stochastic methodology.                                                                                                                                       │
│ 15 *   **Scattered Source of Truth:** The *actual* specification currently lives entirely within the codebase comments of `simulation-engine.js` and the academic rationale      │
│    provided in `critique.md`.    
