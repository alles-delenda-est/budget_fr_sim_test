/**
 * ASSUMPTIONS DATA — Academic literature and model parameters
 * Extracted from App.jsx for use by the Hypotheses page
 */
import { DEMOGRAPHIC_PRESSURE_PER_YEAR } from '../projection-engine-v1.8'

const ASSUMPTIONS = {
  macro: [
    { parameter: "PIB nominal 2025", value: "2 850 Md€", impact: "Base de calcul pour tous les ratios", source: "PLF 2025, INSEE", link: "https://www.insee.fr/fr/statistiques" },
    { parameter: "Croissance nominale", value: "2,5%", impact: "0,7% réel + 1,8% inflation", source: "PLF 2025, Banque de France", link: "https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques" },
    { parameter: "Taux d'intérêt moyen dette", value: "2,1%", impact: "Charge d'intérêts ~69 Md€/an", source: "Agence France Trésor", link: "https://www.aft.gouv.fr/" },
    { parameter: "Taux de chômage 2025", value: "7,3%", impact: "Base pour la loi d'Okun", source: "INSEE", link: "https://www.insee.fr/fr/statistiques" },
  ],
  fiscal: [
    { parameter: "Élasticité fiscale au PIB", value: "0,45", impact: "45% de la croissance supplémentaire devient recettes", source: "Girouard & André (2005), OCDE", link: "https://www.oecd.org/tax/public-finance/" },
    { parameter: "Élasticité IR au revenu", value: "0,9", impact: "+1pp taux IR ≈ +8,5 Md€ recettes statiques", source: "CPO, Rapport impôts sur le revenu", link: "https://www.ccomptes.fr/fr/institutions-associees/conseil-des-prelevements-obligatoires-cpo" },
    { parameter: "Élasticité IS au bénéfice", value: "0,7", impact: "Effet de base taxable (optimisation)", source: "DGFiP, Cour des comptes", link: "https://www.ccomptes.fr/" },
  ],
  riskPremium: [
    { parameter: "Prime de risque 60-90% dette/PIB", value: "+3 bps/pp", impact: "Régime normal, effet modéré", source: "Kumar & Baldacci (2010), FMI", link: "https://www.imf.org/external/pubs/ft/wp/2010/wp10184.pdf" },
    { parameter: "Prime de risque 90-120% dette/PIB", value: "+4 bps/pp", impact: "Accélération non-linéaire", source: "EC Debt Sustainability Monitor", link: "https://economy-finance.ec.europa.eu/economic-and-fiscal-governance/fiscal-sustainability_en" },
    { parameter: "Prime de risque >120% dette/PIB", value: "+10 bps/pp", impact: "Régime de crise, doom loop", source: "Consensus académique, OAT France 2010-2012", link: null },
    { parameter: "Prime déficit (>4% PIB)", value: "+17 bps/%", impact: "Prime de flux au-delà du seuil de 4%", source: "Module 1 — profil OAT AFT 2025", link: null },
    { parameter: "Taux de renouvellement dette", value: "12,5%/an", impact: "Inertie du taux moyen (≈8 ans passage complet)", source: "Module 1 — maturité OAT AFT 2025", link: null },
  ],
  demographic: [
    { parameter: "Dérive ratio dépendance", value: "+0,48 pp/an", impact: `+${DEMOGRAPHIC_PRESSURE_PER_YEAR.toFixed(1)} Md€/an pression sur dépenses pension+santé`, source: "INSEE 2024 Projections de population", link: "https://www.insee.fr/fr/statistiques" },
    { parameter: "Élasticité pension/dépendance", value: "0,80", impact: "Retraites (303,4 Md€) croissent avec le vieillissement", source: "COR 2024 rapport annuel", link: null },
    { parameter: "Élasticité santé/dépendance", value: "0,50", impact: "Maladie (262,3 Md€) croît avec le vieillissement", source: "DREES 2024", link: null },
    { parameter: "Prime politique (OAT spread)", value: "+21 bps", impact: "Composante politique du taux d'intérêt (déjà intégrée)", source: "Bloomberg OAT-Bund 10Y Q4 2024, ECB FSR Nov 2024", link: null },
    { parameter: "Plancher ONDAM", value: "-3% seuil, -7% plancher", impact: "Rendements décroissants des coupes santé (déserts médicaux)", source: "DREES 2024, FNAIM", link: null },
    { parameter: "Taux emploi seniors", value: "58% → 65% (benchmark UE)", impact: "+4,9 Md€ cotisations à 10 ans (si réforme marché travail)", source: "DARES 2024, Eurostat", link: null },
  ],
  reforms: [
    { parameter: "Hartz-IV (fusion RSA/ASS)", value: "+0,35 pp/an", impact: "Croissance potentielle, délai 2 ans, emploi seniors +4pp", source: "Krebs & Scheffel (2013), Dustmann et al. (2014)", link: null },
    { parameter: "Contrat unique + droit de licencier", value: "+0,45 pp/an", impact: "Flexibilisation radicale, délai 3 ans, emploi seniors +6pp", source: "Blanchard & Tirole (2003), Bassanini & Duval (2006)", link: null },
    { parameter: "Déréglementation marchés (PMR)", value: "+0,10 pp/an", impact: "Productivité via concurrence, délai 2 ans", source: "OCDE PMR indicators", link: "https://www.oecd.org/economy/reform/indicators-of-product-market-regulation/" },
    { parameter: "Dérégulation logement modérée", value: "+0,05 pp/an", impact: "Retour à 2010, abolition encadrement loyers + DPE", source: "Diamond et al. (2019), Sims (2007)", link: null },
    { parameter: "Abolition encadrement des loyers", value: "+0,03 pp/an", impact: "Suppression contrôle loyers, PLU/DPE inchangés", source: "Diamond et al. (2019), Autor et al. (2014)", link: null },
    { parameter: "PLU national R+8 gares + abolition encadrement", value: "+0,25 pp/an", impact: "Construction R+8 à 1km gares, délai 4 ans, durée 20 ans", source: "Hsieh & Moretti (2019), Hilber & Vermeulen (2016)", link: "https://doi.org/10.1016/j.jue.2015.11.003" },
    { parameter: "Réforme éducation/formation", value: "+0,08 pp/an", impact: "Capital humain, délai 5 ans, durée 20 ans", source: "OCDE Education at a Glance", link: "https://www.oecd.org/education/education-at-a-glance/" },
    { parameter: "Déréglementation énergie", value: "+0,07 pp/an", impact: "Compétitivité industrielle, délai 2 ans (réduit: France déjà compétitive)", source: "CRE 2024, Eurostat energy prices", link: "https://www.cre.fr/" },
  ],
  taxCutBoosts: [
    { parameter: "IR: boost croissance par pp de baisse", value: "+0,08 pp", impact: "67% du drag; asymétrique (émigration irréversible)", source: "Romer & Romer (2010), Kleven et al. (2014)", link: null },
    { parameter: "IS: boost croissance par pp de baisse", value: "+0,12 pp", impact: "48% du drag; investissement, profit-shifting retour", source: "Gechert & Heimberger (2022), Mertens & Ravn (2013)", link: null },
    { parameter: "TVA: boost croissance par pp de baisse", value: "+0,03 pp", impact: "75% du drag; taxe conso, peu d'effet offre", source: "Mirrlees Review (2011)", link: null },
    { parameter: "CSG: boost croissance par pp de baisse", value: "+0,06 pp", impact: "75% du drag; base large, faible distorsion", source: "Mirrlees Review (2011), Saez et al. (2012)", link: null },
    { parameter: "Cotisations: boost croissance par pp de baisse", value: "+0,20 pp", impact: "111% du drag; coin fiscal France 47%, effet emploi SMIC", source: "Crépon & Desplatz (2001), France Stratégie CICE (2020)", link: null },
  ],
  pensionReform: [
    { parameter: "Masse pension Sécu (vieillesse)", value: "303,4 Md€", impact: "Base pour calcul des réformes retraites", source: "PLFSS 2025, francetdb.com", link: null },
    { parameter: "Ratio cotisants/retraité", value: "1,70", impact: "Déclin -0,012/an → pression sur financement", source: "COR 2024 rapport annuel", link: null },
    { parameter: "Effet âge retraite", value: "-2,5%/an au-delà de 64", impact: "Chaque année supplémentaire réduit la masse pension", source: "francetdb.com rtRunModel()", link: null },
    { parameter: "Comptes notionnels (suédois)", value: "-6% masse pension", impact: "Mise en place sur 15 ans à partir de 2027", source: "francetdb.com, modèle NDC", link: null },
    { parameter: "Plancher pension", value: "65% du niveau initial", impact: "Les réformes ne peuvent réduire les pensions au-delà", source: "Contrainte politique modélisée", link: null },
    { parameter: "Dépendance/autonomie", value: "43,5 Md€, +5,5%/an", impact: "Croissance excédentaire vs PIB (+16 Md€ à 10 ans)", source: "PLFSS 2025, DREES", link: null },
  ],
}

export default ASSUMPTIONS
