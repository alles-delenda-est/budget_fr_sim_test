/**
 * ASSUMPTIONS DATA — Academic literature and model parameters
 * Extracted from App.jsx for use by the Hypotheses page
 */
import { DEMOGRAPHIC_PRESSURE_PER_YEAR } from '../projection-engine-v1.8'

const ASSUMPTIONS = {
  macro: [
    { parameter: "PIB nominal 2025", value: "2 850 Md\u20ac", impact: "Base de calcul pour tous les ratios", source: "PLF 2025, INSEE", link: "https://www.insee.fr/fr/statistiques" },
    { parameter: "Croissance nominale", value: "2,5%", impact: "0,7% r\u00e9el + 1,8% inflation", source: "PLF 2025, Banque de France", link: "https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques" },
    { parameter: "Taux d'int\u00e9r\u00eat moyen dette", value: "2,1%", impact: "Charge d'int\u00e9r\u00eats ~69 Md\u20ac/an", source: "Agence France Tr\u00e9sor", link: "https://www.aft.gouv.fr/" },
    { parameter: "Taux de ch\u00f4mage 2025", value: "7,3%", impact: "Base pour la loi d'Okun", source: "INSEE", link: "https://www.insee.fr/fr/statistiques" },
  ],
  fiscal: [
    { parameter: "\u00c9lasticit\u00e9 fiscale au PIB", value: "0,45", impact: "45% de la croissance suppl\u00e9mentaire devient recettes", source: "Girouard & Andr\u00e9 (2005), OCDE", link: "https://www.oecd.org/tax/public-finance/" },
    { parameter: "\u00c9lasticit\u00e9 IR au revenu", value: "0,9", impact: "+1pp taux IR \u2248 +8,5 Md\u20ac recettes statiques", source: "CPO, Rapport imp\u00f4ts sur le revenu", link: "https://www.ccomptes.fr/fr/institutions-associees/conseil-des-prelevements-obligatoires-cpo" },
    { parameter: "\u00c9lasticit\u00e9 IS au b\u00e9n\u00e9fice", value: "0,7", impact: "Effet de base taxable (optimisation)", source: "DGFiP, Cour des comptes", link: "https://www.ccomptes.fr/" },
  ],
  riskPremium: [
    { parameter: "Prime de risque 60-90% dette/PIB", value: "+3 bps/pp", impact: "R\u00e9gime normal, effet mod\u00e9r\u00e9", source: "Kumar & Baldacci (2010), FMI", link: "https://www.imf.org/external/pubs/ft/wp/2010/wp10184.pdf" },
    { parameter: "Prime de risque 90-120% dette/PIB", value: "+4 bps/pp", impact: "Acc\u00e9l\u00e9ration non-lin\u00e9aire", source: "EC Debt Sustainability Monitor", link: "https://economy-finance.ec.europa.eu/economic-and-fiscal-governance/fiscal-sustainability_en" },
    { parameter: "Prime de risque >120% dette/PIB", value: "+10 bps/pp", impact: "R\u00e9gime de crise, doom loop", source: "Consensus acad\u00e9mique, OAT France 2010-2012", link: null },
    { parameter: "Prime d\u00e9ficit (>4% PIB)", value: "+17 bps/%", impact: "Prime de flux au-del\u00e0 du seuil de 4%", source: "Module 1 \u2014 profil OAT AFT 2025", link: null },
    { parameter: "Taux de renouvellement dette", value: "12,5%/an", impact: "Inertie du taux moyen (\u22488 ans passage complet)", source: "Module 1 \u2014 maturit\u00e9 OAT AFT 2025", link: null },
  ],
  demographic: [
    { parameter: "D\u00e9rive ratio d\u00e9pendance", value: "+0,48 pp/an", impact: `+${DEMOGRAPHIC_PRESSURE_PER_YEAR.toFixed(1)} Md\u20ac/an pression sur d\u00e9penses pension+sant\u00e9`, source: "INSEE 2024 Projections de population", link: "https://www.insee.fr/fr/statistiques" },
    { parameter: "\u00c9lasticit\u00e9 pension/d\u00e9pendance", value: "0,80", impact: "Retraites (303,4 Md\u20ac) croissent avec le vieillissement", source: "COR 2024 rapport annuel", link: null },
    { parameter: "\u00c9lasticit\u00e9 sant\u00e9/d\u00e9pendance", value: "0,50", impact: "Maladie (262,3 Md\u20ac) cro\u00eet avec le vieillissement", source: "DREES 2024", link: null },
    { parameter: "Prime politique (OAT spread)", value: "+21 bps", impact: "Composante politique du taux d'int\u00e9r\u00eat (d\u00e9j\u00e0 int\u00e9gr\u00e9e)", source: "Bloomberg OAT-Bund 10Y Q4 2024, ECB FSR Nov 2024", link: null },
    { parameter: "Plancher ONDAM", value: "-3% seuil, -7% plancher", impact: "Rendements d\u00e9croissants des coupes sant\u00e9 (d\u00e9serts m\u00e9dicaux)", source: "DREES 2024, FNAIM", link: null },
    { parameter: "Taux emploi seniors", value: "58% \u2192 65% (benchmark UE)", impact: "+4,9 Md\u20ac cotisations \u00e0 10 ans (si r\u00e9forme march\u00e9 travail)", source: "DARES 2024, Eurostat", link: null },
  ],
  reforms: [
    { parameter: "Hartz-IV (fusion RSA/ASS)", value: "+0,35 pp/an", impact: "Croissance potentielle, d\u00e9lai 2 ans, emploi seniors +4pp", source: "Krebs & Scheffel (2013), Dustmann et al. (2014)", link: null },
    { parameter: "Contrat unique + droit de licencier", value: "+0,45 pp/an", impact: "Flexibilisation radicale, d\u00e9lai 3 ans, emploi seniors +6pp", source: "Blanchard & Tirole (2003), Bassanini & Duval (2006)", link: null },
    { parameter: "D\u00e9r\u00e9glementation march\u00e9s (PMR)", value: "+0,10 pp/an", impact: "Productivit\u00e9 via concurrence, d\u00e9lai 2 ans", source: "OCDE PMR indicators", link: "https://www.oecd.org/economy/reform/indicators-of-product-market-regulation/" },
    { parameter: "D\u00e9r\u00e9gulation logement mod\u00e9r\u00e9e", value: "+0,05 pp/an", impact: "Retour \u00e0 2010, abolition encadrement loyers + DPE", source: "Diamond et al. (2019), Sims (2007)", link: null },
    { parameter: "Abolition encadrement des loyers", value: "+0,03 pp/an", impact: "Suppression contr\u00f4le loyers, PLU/DPE inchang\u00e9s", source: "Diamond et al. (2019), Autor et al. (2014)", link: null },
    { parameter: "PLU national R+8 gares + abolition encadrement", value: "+0,25 pp/an", impact: "Construction R+8 \u00e0 1km gares, d\u00e9lai 4 ans, dur\u00e9e 20 ans", source: "Hsieh & Moretti (2019), Hilber & Vermeulen (2016)", link: "https://doi.org/10.1016/j.jue.2015.11.003" },
    { parameter: "Liquidation parc HLM", value: "750 Md\u20ac sur 10 ans", impact: "75 Md\u20ac/an r\u00e9duction dette, effet croissance +0,02pp/an", source: "ANCOLS 2025, MeilleursAgents, USH, UK Right to Buy", link: null },
    { parameter: "R\u00e9forme \u00e9ducation/formation", value: "+0,08 pp/an", impact: "Capital humain, d\u00e9lai 5 ans, dur\u00e9e 20 ans", source: "OCDE Education at a Glance", link: "https://www.oecd.org/education/education-at-a-glance/" },
    { parameter: "D\u00e9r\u00e9glementation \u00e9nergie", value: "+0,07 pp/an", impact: "Comp\u00e9titivit\u00e9 industrielle, d\u00e9lai 2 ans (r\u00e9duit: France d\u00e9j\u00e0 comp\u00e9titive)", source: "CRE 2024, Eurostat energy prices", link: "https://www.cre.fr/" },
  ],
  taxCutBoosts: [
    { parameter: "IR: boost croissance par pp de baisse", value: "+0,08 pp", impact: "67% du drag; asym\u00e9trique (\u00e9migration irr\u00e9versible)", source: "Romer & Romer (2010), Kleven et al. (2014)", link: null },
    { parameter: "IS: boost croissance par pp de baisse", value: "+0,12 pp", impact: "48% du drag; investissement, profit-shifting retour", source: "Gechert & Heimberger (2022), Mertens & Ravn (2013)", link: null },
    { parameter: "TVA: boost croissance par pp de baisse", value: "+0,03 pp", impact: "75% du drag; taxe conso, peu d'effet offre", source: "Mirrlees Review (2011)", link: null },
    { parameter: "CSG: boost croissance par pp de baisse", value: "+0,06 pp", impact: "75% du drag; base large, faible distorsion", source: "Mirrlees Review (2011), Saez et al. (2012)", link: null },
    { parameter: "Cotisations: boost croissance par pp de baisse", value: "+0,20 pp", impact: "111% du drag; coin fiscal France 47%, effet emploi SMIC", source: "Cr\u00e9pon & Desplatz (2001), France Strat\u00e9gie CICE (2020)", link: null },
  ],
  pensionReform: [
    { parameter: "Masse pension S\u00e9cu (vieillesse)", value: "303,4 Md\u20ac", impact: "Base pour calcul des r\u00e9formes retraites", source: "PLFSS 2025, francetdb.com", link: null },
    { parameter: "Ratio cotisants/retrait\u00e9", value: "1,70", impact: "D\u00e9clin -0,012/an \u2192 pression sur financement", source: "COR 2024 rapport annuel", link: null },
    { parameter: "Effet \u00e2ge retraite", value: "-2,5%/an au-del\u00e0 de 64", impact: "Chaque ann\u00e9e suppl\u00e9mentaire r\u00e9duit la masse pension", source: "francetdb.com rtRunModel()", link: null },
    { parameter: "Comptes notionnels (su\u00e9dois)", value: "-6% masse pension", impact: "Mise en place sur 15 ans \u00e0 partir de 2027", source: "francetdb.com, mod\u00e8le NDC", link: null },
    { parameter: "Plancher pension", value: "65% du niveau initial", impact: "Les r\u00e9formes ne peuvent r\u00e9duire les pensions au-del\u00e0", source: "Contrainte politique mod\u00e9lis\u00e9e", link: null },
    { parameter: "Immigration nette", value: "270k entrants, 200k sortants/an", impact: "-1,1 Md\u20ac/an impact fiscal (brain drain)", source: "INSEE 2023, francetdb.com", link: null },
    { parameter: "D\u00e9pendance/autonomie", value: "43,5 Md\u20ac, +5,5%/an", impact: "Croissance exc\u00e9dentaire vs PIB (+16 Md\u20ac \u00e0 10 ans)", source: "PLFSS 2025, DREES", link: null },
  ],
}

export default ASSUMPTIONS
