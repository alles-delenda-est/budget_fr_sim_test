# Brief: evidence on long-run supply effects of French fiscal and structural measures

You are assisting with a French public-finance simulator that will be reviewed by professional economists. For each measure listed below, assess the empirical evidence on its **long-run effect on the level of GDP** (a supply-side effect, as distinct from a short-run demand effect). The simulator will use your results to decide, case by case, whether a measure gets a non-zero supply effect and with what range. Accuracy and sourcing matter far more than coverage: a measure with weak evidence should be reported as weak, not given a number.

## How the simulator uses the result

A measure j has a permanent effect on the GDP level, reached progressively over L years:

    yS(t) = σ(j) × a(j) × min(t / L(j), 1)

where a(j) is the measure's size (in % of GDP for fiscal measures, or in natural units for structural ones, e.g. "one year of legal retirement age"), and σ(j) is the long-run GDP-level effect per unit. The default is σ = 0 unless the evidence justifies otherwise.

## For each measure, report

1. **Mechanism**: the channel (labour supply, labour demand, capital, productivity, allocation) in one sentence.
2. **Best evidence**: up to three studies, preferring (a) French evidence, (b) meta-analyses, (c) credible quasi-experimental or structural studies on comparable countries. For each: full reference (authors, year, title, journal or series and number, DOI or URL), country and period, method, and the quantity actually estimated (GDP, employment, hours, investment...).
3. **Conversion**: if the studies estimate employment or another intermediate quantity, show how you convert it to a GDP-level effect and state each assumption.
4. **Proposed σ**: low / central / high per unit, with the unit stated, and the lag L in years.
5. **Confidence**: high (several converging credible studies, ideally French), medium (one credible study or consistent cross-country evidence), low (theory, simulations or weak evidence). Recommend σ = 0 in the central case when confidence is low.
6. **Known counter-evidence**: studies finding no effect or the opposite, and publication-bias issues.

Rules: say "abstract only" when you did not read the full text; never invent a reference, page or figure; if nothing credible exists, write "no credible estimate found". Simulation results from a model (e.g. DSGE or CGE) must be labelled as model results, not evidence.

## Measures to assess

Fiscal:
1. Raising the legal retirement age by one year (France: the 2010 and 2023 reforms).
2. Cutting employer social contributions on low wages (near the minimum wage), per 1% of GDP.
3. Cutting employer contributions across all wages, per 1% of GDP.
4. Cutting the corporate income tax rate by one point.
5. Cutting personal income tax at the top (top 1% marginal rates), including the migration channel.
6. Raising the standard VAT rate by one point (as financing for a labour-tax cut, i.e. "TVA sociale").
7. Cutting the research tax credit (Crédit d'impôt recherche).
8. Changes in public investment, per 1% of GDP.
9. Changes in education spending, per 1% of GDP (long-run human-capital channel).
10. Tightening unemployment-insurance rules (duration, replacement rate), with reference to the French 2019–2023 reforms.

Structural (no direct budget line):
11. Labour-market reforms of the Hartz type (Germany 2003–2005), and their transferability to France.
12. Easing dismissal rules (employment protection legislation), including the French 2017 ordinances.
13. Easing land-use and building-permit constraints (housing supply).
14. Removing or relaxing rent control.
15. Replacing property-transaction taxes (droits de mutation, DMTO) and the taxe foncière with a land value tax at equal yield.

## Output format

One section per measure with the six items above, then a summary table: measure | unit | σ low / central / high | L | confidence | key source. Write in English or French.
