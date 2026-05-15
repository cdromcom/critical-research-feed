// Dewey Decimal classification for academic sources and conferences.

export type DeweyClass =
  | '000' | '100' | '200' | '300' | '400'
  | '500' | '600' | '700' | '800' | '900';

export const DEWEY_NAMES: Record<DeweyClass, string> = {
  '000': 'computer science & general works',
  '100': 'philosophy & psychology',
  '200': 'religion',
  '300': 'social sciences',
  '400': 'language',
  '500': 'pure science',
  '600': 'technology (medicine, engineering)',
  '700': 'arts & recreation',
  '800': 'literature',
  '900': 'history & geography',
};

// URL fragment → Dewey. Tried in order, so longer/more-specific patterns
// MUST precede their broader catchalls. We tag at journal-path level for
// big publishers (Wiley, Springer, OUP, etc.) instead of a single 500 tag
// for the whole publisher domain.
type SourceEntry = { pattern: string | RegExp; dewey: DeweyClass };

const SOURCES: SourceEntry[] = [
  // ---------- 000: Computer science, information, general works ----------
  { pattern: 'openai.com', dewey: '000' },
  { pattern: 'anthropic.com', dewey: '000' },
  { pattern: 'deepmind.google', dewey: '000' },
  { pattern: 'deepmind.com', dewey: '000' },
  { pattern: 'research.google', dewey: '000' },
  { pattern: 'ai.meta.com', dewey: '000' },
  { pattern: 'ai.facebook.com', dewey: '000' },
  { pattern: 'research.microsoft.com', dewey: '000' },
  { pattern: 'microsoft.com/en-us/research', dewey: '000' },
  { pattern: 'machinelearning.apple.com', dewey: '000' },
  { pattern: 'research.nvidia.com', dewey: '000' },
  { pattern: 'research.ibm.com', dewey: '000' },
  { pattern: 'amazon.science', dewey: '000' },
  { pattern: 'huggingface.co/papers', dewey: '000' },
  { pattern: 'distill.pub', dewey: '000' },
  { pattern: 'allenai.org', dewey: '000' },
  { pattern: 'dblp.org', dewey: '000' },
  { pattern: 'openreview.net', dewey: '000' },
  { pattern: 'aclanthology.org', dewey: '000' },
  { pattern: 'aclweb.org/anthology', dewey: '000' },
  { pattern: 'proceedings.neurips.cc', dewey: '000' },
  { pattern: 'proceedings.mlr.press', dewey: '000' },
  { pattern: 'proceedings.icml.cc', dewey: '000' },
  { pattern: 'proceedings.ijcai.org', dewey: '000' },
  { pattern: 'jmlr.org', dewey: '000' },
  { pattern: /eccv\d{4}\.org\/papers/, dewey: '000' },
  { pattern: /cvpr\d{4}\.thecvf\.com\/papers/, dewey: '000' },
  // IACR cryptology — applied math/CS, fits 000 alongside theory
  { pattern: 'eprint.iacr.org', dewey: '000' },
  { pattern: 'ia.cr', dewey: '000' },
  { pattern: 'dl.acm.org', dewey: '000' },
  { pattern: 'acm.org', dewey: '000' },
  { pattern: 'ieeexplore.ieee.org', dewey: '000' },
  { pattern: 'techrxiv.org', dewey: '000' },

  // ---------- 100: Philosophy & psychology (specific paths before generic) ----------
  { pattern: 'psyarxiv.com', dewey: '100' },
  { pattern: 'psycnet.apa.org', dewey: '100' },
  { pattern: 'philpapers.org', dewey: '100' },
  { pattern: 'philarchive.org', dewey: '100' },
  { pattern: 'philsci-archive.pitt.edu', dewey: '100' },
  { pattern: 'psycharchives.org', dewey: '100' },
  { pattern: 'academic.oup.com/mind', dewey: '100' },
  { pattern: 'academic.oup.com/pq', dewey: '100' },
  { pattern: 'academic.oup.com/analysis', dewey: '100' },
  { pattern: 'academic.oup.com/bjps', dewey: '100' }, // British Journal for the Philosophy of Science
  { pattern: 'academic.oup.com/monist', dewey: '100' },
  { pattern: 'onlinelibrary.wiley.com/journal/14679213', dewey: '100' }, // Noûs
  { pattern: 'onlinelibrary.wiley.com/journal/19331592', dewey: '100' }, // Phil & Phen Research
  { pattern: 'link.springer.com/journal/11098', dewey: '100' }, // Philosophical Studies
  { pattern: 'link.springer.com/journal/11229', dewey: '100' }, // Synthese
  { pattern: 'link.springer.com/journal/13164', dewey: '100' }, // Phil. Psychology
  { pattern: 'tandfonline.com/journals/rphi', dewey: '100' },
  { pattern: 'tandfonline.com/journals/rpsy', dewey: '100' },
  { pattern: 'journals.sagepub.com/home/pss', dewey: '100' }, // Psychological Science
  { pattern: 'journals.sagepub.com/home/cdp', dewey: '100' },

  // ---------- 200: Religion ----------
  { pattern: 'academic.oup.com/jaar', dewey: '200' },
  { pattern: 'academic.oup.com/jts', dewey: '200' }, // Journal of Theological Studies
  { pattern: 'brill.com/view/journals/nu', dewey: '200' }, // Numen
  { pattern: 'brill.com/view/journals/jaaj', dewey: '200' },
  { pattern: 'sbl-site.org', dewey: '200' },
  { pattern: 'aarweb.org', dewey: '200' },
  { pattern: 'cambridge.org/core/journals/religious-studies', dewey: '200' },
  { pattern: 'cambridge.org/core/journals/harvard-theological-review', dewey: '200' },
  { pattern: 'cambridge.org/core/journals/church-history', dewey: '200' },

  // ---------- 300: Social sciences ----------
  { pattern: 'ssrn.com', dewey: '300' },
  { pattern: 'socarxiv.org', dewey: '300' },
  { pattern: 'lawarxiv.info', dewey: '300' },
  { pattern: 'edarxiv.org', dewey: '300' },
  { pattern: 'aeaweb.org', dewey: '300' },
  { pattern: 'nber.org', dewey: '300' },
  { pattern: 'cepr.org', dewey: '300' },
  { pattern: 'iza.org', dewey: '300' },
  // Economics indexers / repositories
  { pattern: 'repec.org', dewey: '300' },
  { pattern: 'econpapers.repec.org', dewey: '300' },
  { pattern: 'econstor.eu', dewey: '300' },
  { pattern: 'econbiz.de', dewey: '300' },
  // Business / management
  { pattern: 'hbr.org', dewey: '300' },
  { pattern: 'mitsloan.mit.edu/publication', dewey: '300' },
  { pattern: 'informs.org', dewey: '300' },
  { pattern: 'aom.org', dewey: '300' },
  // Education
  { pattern: 'eric.ed.gov', dewey: '300' },
  // Law (Dewey 340 rolls up to 300)
  { pattern: 'heinonline.org', dewey: '300' },
  // Multidisciplinary social-sciences reference
  { pattern: 'oxfordbibliographies.com', dewey: '300' },
  // Regional indexers — Latin America, Eurasia, Africa, francophone
  { pattern: 'redalyc.org', dewey: '300' },
  { pattern: 'cyberleninka.ru', dewey: '300' },
  { pattern: 'africajournals.org', dewey: '300' },
  { pattern: 'ajol.info', dewey: '300' },
  { pattern: 'sabinet.co.za', dewey: '300' },
  { pattern: 'cairn.info', dewey: '300' },
  { pattern: 'persee.fr', dewey: '300' },
  { pattern: 'erudit.org', dewey: '300' },
  // Sociological Science (open-access sociology journal)
  { pattern: 'sociologicalscience.com', dewey: '300' },
  { pattern: 'apsanet.org', dewey: '300' },
  { pattern: 'asanet.org', dewey: '300' },
  { pattern: 'aera.net', dewey: '300' },
  { pattern: 'journals.aera.net', dewey: '300' },
  { pattern: 'brookings.edu', dewey: '300' },
  { pattern: 'rand.org', dewey: '300' },
  { pattern: 'urban.org', dewey: '300' },
  // ----- Gray literature: think tanks (cross-ideological, US + international) -----
  { pattern: 'pewresearch.org', dewey: '300' },
  { pattern: 'kff.org', dewey: '300' },             // Kaiser Family Foundation — health policy
  { pattern: 'commonwealthfund.org', dewey: '300' },
  { pattern: 'rwjf.org', dewey: '300' },            // Robert Wood Johnson Foundation
  { pattern: 'cbpp.org', dewey: '300' },            // Center on Budget & Policy Priorities
  { pattern: 'epi.org', dewey: '300' },             // Economic Policy Institute
  { pattern: 'aei.org', dewey: '300' },             // American Enterprise Institute
  { pattern: 'cato.org', dewey: '300' },
  { pattern: 'heritage.org', dewey: '300' },
  { pattern: 'mercatus.org', dewey: '300' },
  { pattern: 'manhattan.institute', dewey: '300' },
  { pattern: 'thirdway.org', dewey: '300' },
  { pattern: 'americanprogress.org', dewey: '300' },
  { pattern: 'newamerica.org', dewey: '300' },
  { pattern: 'hudson.org', dewey: '300' },
  { pattern: 'piie.com', dewey: '300' },            // Peterson Institute for International Economics
  { pattern: 'resourcesforthefuture.org', dewey: '300' },
  { pattern: 'mathematica.org', dewey: '300' },
  { pattern: 'air.org', dewey: '300' },             // American Institutes for Research
  { pattern: 'mdrc.org', dewey: '300' },
  { pattern: 'abtassociates.com', dewey: '300' },
  { pattern: 'edtrust.org', dewey: '300' },
  // Foreign policy / security think tanks
  { pattern: 'cfr.org', dewey: '300' },             // Council on Foreign Relations
  { pattern: 'csis.org', dewey: '300' },
  { pattern: 'rusi.org', dewey: '300' },
  { pattern: 'carnegieendowment.org', dewey: '300' },
  { pattern: 'sipri.org', dewey: '300' },
  { pattern: 'chathamhouse.org', dewey: '300' },
  { pattern: 'iiss.org', dewey: '300' },            // Intl. Inst. for Strategic Studies
  { pattern: 'bruegel.org', dewey: '300' },
  { pattern: 'ecfr.eu', dewey: '300' },             // European Council on Foreign Relations
  // International / IGO statistical & research agencies
  { pattern: 'oecd.org', dewey: '300' },
  { pattern: 'oecd-ilibrary.org', dewey: '300' },
  { pattern: 'worldbank.org', dewey: '300' },
  { pattern: 'imf.org', dewey: '300' },
  { pattern: 'ec.europa.eu/eurostat', dewey: '300' },
  { pattern: 'unesco.org', dewey: '300' },
  { pattern: 'undp.org', dewey: '300' },
  { pattern: 'unicef.org/research', dewey: '300' },
  { pattern: 'unctad.org', dewey: '300' },
  { pattern: 'unhcr.org/research', dewey: '300' },
  { pattern: 'fao.org', dewey: '300' },
  // US federal research / statistics agencies (non-medical)
  { pattern: 'bls.gov', dewey: '300' },
  { pattern: 'census.gov/library/working-papers', dewey: '300' },
  { pattern: 'ers.usda.gov', dewey: '300' },
  { pattern: 'gao.gov', dewey: '300' },
  { pattern: 'cbo.gov', dewey: '300' },
  { pattern: 'crsreports.congress.gov', dewey: '300' },
  // Education research specifically
  { pattern: 'nces.ed.gov', dewey: '300' },          // National Center for Education Statistics
  { pattern: 'ies.ed.gov', dewey: '300' },           // Institute of Education Sciences
  { pattern: 'wested.org', dewey: '300' },
  { pattern: 'nwea.org/research', dewey: '300' },
  // Tech policy & innovation
  { pattern: 'itif.org', dewey: '300' },             // Information Technology & Innovation Foundation
  { pattern: 'datasociety.net', dewey: '300' },
  { pattern: 'cdt.org', dewey: '300' },              // Center for Democracy & Technology
  { pattern: 'eff.org/issues', dewey: '300' },
  // Open-data / civic research
  { pattern: 'okfn.org', dewey: '300' },
  { pattern: 'mysociety.org/research', dewey: '300' },
  // Climate / energy / environment gray literature
  { pattern: 'ipcc.ch', dewey: '500' },              // IPCC reports
  { pattern: 'iea.org', dewey: '500' },              // International Energy Agency
  { pattern: 'irena.org', dewey: '500' },            // International Renewable Energy Agency
  { pattern: 'ipbes.net', dewey: '500' },            // Intergov't Science-Policy Platform on Biodiversity
  { pattern: 'wri.org', dewey: '500' },              // World Resources Institute
  { pattern: 'rmi.org', dewey: '500' },              // Rocky Mountain Institute
  { pattern: 'climateworks.org', dewey: '500' },
  { pattern: 'unep.org/resources', dewey: '500' },   // UN Environment Programme
  { pattern: 'wmo.int', dewey: '500' },              // World Meteorological Organization
  { pattern: 'academic.oup.com/qje', dewey: '300' }, // Quarterly Journal of Economics
  { pattern: 'academic.oup.com/restud', dewey: '300' },
  { pattern: 'academic.oup.com/ej', dewey: '300' }, // Economic Journal
  { pattern: 'academic.oup.com/wber', dewey: '300' },
  { pattern: 'academic.oup.com/sf', dewey: '300' }, // Social Forces
  { pattern: 'academic.oup.com/socpro', dewey: '300' },
  { pattern: 'academic.oup.com/poq', dewey: '300' },
  { pattern: 'link.springer.com/journal/11186', dewey: '300' }, // Theory & Society
  { pattern: 'link.springer.com/journal/10708', dewey: '300' },
  { pattern: 'onlinelibrary.wiley.com/journal/15405907', dewey: '300' }, // AJPS
  { pattern: 'onlinelibrary.wiley.com/journal/14756765', dewey: '300' },
  { pattern: 'tandfonline.com/journals/rwst', dewey: '300' },
  { pattern: 'journals.sagepub.com/home/asr', dewey: '300' }, // American Sociological Review
  { pattern: 'journals.sagepub.com/home/srd', dewey: '300' },

  // ---------- 400: Language ----------
  { pattern: 'linguisticsociety.org', dewey: '400' },
  { pattern: 'glossa-journal.org', dewey: '400' },
  { pattern: 'cambridge.org/core/journals/journal-of-linguistics', dewey: '400' },
  { pattern: 'cambridge.org/core/journals/language-in-society', dewey: '400' },
  { pattern: 'academic.oup.com/applij', dewey: '400' }, // Applied Linguistics
  { pattern: 'academic.oup.com/jole', dewey: '400' },
  { pattern: 'link.springer.com/journal/11049', dewey: '400' }, // Natural Language & Linguistic Theory
  { pattern: 'onlinelibrary.wiley.com/journal/14679841', dewey: '400' },
  { pattern: 'tandfonline.com/journals/rlnq', dewey: '400' },

  // ---------- 500: Pure science (default for many big publishers) ----------
  { pattern: 'arxiv.org', dewey: '500' }, // overridden by arxivDewey
  { pattern: 'biorxiv.org', dewey: '500' },
  { pattern: 'chemrxiv.org', dewey: '500' },
  { pattern: 'eartharxiv.org', dewey: '500' },
  { pattern: 'paleorxiv.org', dewey: '500' },
  { pattern: 'agrirxiv.org', dewey: '500' },
  { pattern: 'pubmed.ncbi.nlm.nih.gov', dewey: '500' },
  { pattern: 'pmc.ncbi.nlm.nih.gov', dewey: '500' },
  { pattern: 'nature.com', dewey: '500' },
  { pattern: 'science.org', dewey: '500' },
  { pattern: 'cell.com', dewey: '500' },
  { pattern: 'pnas.org', dewey: '500' },
  { pattern: 'plos.org', dewey: '500' },
  { pattern: 'elifesciences.org', dewey: '500' },
  { pattern: 'royalsocietypublishing.org', dewey: '500' },
  { pattern: 'aps.org', dewey: '500' },
  { pattern: 'journals.aps.org', dewey: '500' },
  { pattern: 'pubs.acs.org', dewey: '500' },
  { pattern: 'pubs.rsc.org', dewey: '500' },
  { pattern: 'iopscience.iop.org', dewey: '500' },
  { pattern: 'aip.org', dewey: '500' },
  { pattern: 'pubs.aip.org', dewey: '500' },
  { pattern: 'aanda.org', dewey: '500' },
  { pattern: 'agu.org', dewey: '500' },
  { pattern: 'agupubs.onlinelibrary.wiley.com', dewey: '500' },
  { pattern: 'ametsoc.org', dewey: '500' },
  { pattern: 'copernicus.org', dewey: '500' },
  { pattern: 'esajournals.onlinelibrary.wiley.com', dewey: '500' },
  { pattern: 'projecteuclid.org', dewey: '500' },
  { pattern: 'siam.org', dewey: '500' },
  { pattern: 'epubs.siam.org', dewey: '500' },
  { pattern: 'asbmb.org', dewey: '500' },
  { pattern: 'asm.org', dewey: '500' },
  { pattern: 'jneurosci.org', dewey: '500' },
  { pattern: 'cshlpress.org', dewey: '500' },
  { pattern: 'rupress.org', dewey: '500' },
  { pattern: 'annualreviews.org', dewey: '500' },
  { pattern: 'frontiersin.org', dewey: '500' },
  { pattern: 'f1000research.com', dewey: '500' },
  // Additional STEM preprint / open repos
  { pattern: 'alphaxiv.org', dewey: '500' },
  { pattern: 'figshare.com', dewey: '500' },
  { pattern: 'zenodo.org', dewey: '500' },
  // Agronomy / ecology / forestry
  { pattern: 'int-res.com', dewey: '500' },
  { pattern: 'esa.org/publications', dewey: '500' },
  { pattern: 'agronomy.org', dewey: '500' },
  { pattern: 'crops.org', dewey: '500' },
  { pattern: 'soils.org', dewey: '500' },
  { pattern: 'forestry.org', dewey: '500' },
  // Meteorology / atmospheric
  { pattern: 'journals.ametsoc.org', dewey: '500' },
  // Regional STEM indexers
  { pattern: 'j-stage.jst.go.jp', dewey: '500' },
  { pattern: 'koreascience.or.kr', dewey: '500' },
  { pattern: 'cscd.ac.cn', dewey: '500' },
  { pattern: 'cnki.net', dewey: '500' },
  // Systematic reviews (cross-disciplinary but predominantly biomed)
  { pattern: 'cochranelibrary.com', dewey: '500' },
  // ----- Gray literature: federal labs & scientific agencies -----
  { pattern: 'nist.gov/publications', dewey: '500' },
  { pattern: 'nrel.gov/publications', dewey: '500' },
  { pattern: 'usgs.gov/publications', dewey: '500' },
  { pattern: 'noaa.gov/research', dewey: '500' },
  { pattern: 'osti.gov', dewey: '500' },             // DOE Office of Scientific & Technical Information
  { pattern: 'ntrs.nasa.gov', dewey: '500' },        // NASA Technical Reports
  { pattern: 'nasa.gov/centers', dewey: '500' },
  { pattern: 'sandia.gov/research', dewey: '500' },
  { pattern: 'ornl.gov/publication', dewey: '500' },
  { pattern: 'lbl.gov/publications', dewey: '500' },
  { pattern: 'anl.gov/research', dewey: '500' },
  { pattern: 'pnnl.gov/publications', dewey: '500' },
  { pattern: 'inl.gov/research', dewey: '500' },
  { pattern: 'llnl.gov/research', dewey: '500' },
  { pattern: 'epa.gov/research', dewey: '500' },
  { pattern: 'nsf.gov/news/research', dewey: '500' },
  // Research foundations whose reports drive STEM agendas
  { pattern: 'sloan.org/grant-detail', dewey: '500' },
  { pattern: 'simonsfoundation.org/news', dewey: '500' },

  // ---------- 600: Technology / medicine / engineering ----------
  { pattern: 'medrxiv.org', dewey: '600' },
  { pattern: 'engrxiv.org', dewey: '600' },
  { pattern: 'jamanetwork.com', dewey: '600' },
  { pattern: 'nejm.org', dewey: '600' },
  { pattern: 'thelancet.com', dewey: '600' },
  { pattern: 'bmj.com', dewey: '600' },
  { pattern: 'ahajournals.org', dewey: '600' },
  { pattern: 'annals.org', dewey: '600' },
  { pattern: 'acpjournals.org', dewey: '600' },
  { pattern: 'aacrjournals.org', dewey: '600' },
  { pattern: 'diabetesjournals.org', dewey: '600' },
  { pattern: 'link.springer.com/journal/134', dewey: '600' }, // Intensive Care Medicine
  // Oncology
  { pattern: 'ascopubs.org', dewey: '600' },
  // Public-health agencies (treat as medicine / public health publications)
  { pattern: 'cdc.gov/mmwr', dewey: '600' },
  { pattern: 'who.int/publications', dewey: '600' },
  // Engineering professional societies
  { pattern: 'asme.org/publications', dewey: '600' },
  { pattern: 'asce.org/publications', dewey: '600' },
  { pattern: 'aiaa.org/publications', dewey: '600' },
  { pattern: 'spe.org/en/publications', dewey: '600' },
  { pattern: 'aiche.org/resources/publications', dewey: '600' },
  { pattern: 'imeche.org/publications', dewey: '600' },
  { pattern: 'istructe.org/publications', dewey: '600' },
  { pattern: 'theiet.org/publishing', dewey: '600' },
  // ----- Gray literature: biomedical agencies, FDA, foundations -----
  { pattern: 'nih.gov', dewey: '600' },
  { pattern: 'nimh.nih.gov/research', dewey: '600' },
  { pattern: 'nci.nih.gov/research', dewey: '600' },
  { pattern: 'niaid.nih.gov/research', dewey: '600' },
  { pattern: 'fda.gov/science-research', dewey: '600' },
  { pattern: 'ahrq.gov/research', dewey: '600' },     // Agency for Healthcare Research & Quality
  { pattern: 'cdc.gov/grand-rounds', dewey: '600' },
  { pattern: 'nasem.edu', dewey: '600' },             // Nat'l Academies of Sciences, Engineering, Medicine
  { pattern: 'nationalacademies.org', dewey: '600' },
  { pattern: 'wellcome.org/reports', dewey: '600' },
  { pattern: 'gatesfoundation.org', dewey: '600' },
  { pattern: 'ecdc.europa.eu', dewey: '600' },        // European CDC
  { pattern: 'ema.europa.eu', dewey: '600' },         // European Medicines Agency

  // ---------- 700: Arts & recreation ----------
  { pattern: 'collegeart.org', dewey: '700' },
  { pattern: 'caareviews.org', dewey: '700' },
  { pattern: 'amsmusicology.org', dewey: '700' },
  { pattern: 'sportrxiv.org', dewey: '700' },
  // Music
  { pattern: 'oxfordmusiconline.com', dewey: '700' },
  { pattern: 'mtosmt.org', dewey: '700' },
  // Film studies
  { pattern: 'film-philosophy.com', dewey: '700' },
  // Art history / museum scholarship
  { pattern: 'getty.edu/publications', dewey: '700' },
  { pattern: 'artsjournal.com', dewey: '700' },
  { pattern: 'journals.uchicago.edu/journals/jaac', dewey: '700' },
  { pattern: 'academic.oup.com/jaac', dewey: '700' },
  { pattern: 'academic.oup.com/jams', dewey: '700' }, // J. of the American Musicological Society
  { pattern: 'academic.oup.com/musictheoryspectrum', dewey: '700' },
  { pattern: 'onlinelibrary.wiley.com/journal/15409325', dewey: '700' },
  { pattern: 'tandfonline.com/journals/rart', dewey: '700' },

  // ---------- 800: Literature ----------
  { pattern: 'mla.org', dewey: '800' },
  { pattern: 'mlajournals.org', dewey: '800' },
  { pattern: 'modernfiction.org', dewey: '800' },
  { pattern: 'shakespearequarterly.org', dewey: '800' },
  { pattern: 'journals.uchicago.edu/journals/ci', dewey: '800' },
  { pattern: 'academic.oup.com/eic', dewey: '800' }, // Essays in Criticism
  { pattern: 'academic.oup.com/litimag', dewey: '800' },
  { pattern: 'academic.oup.com/res', dewey: '800' }, // Review of English Studies
  { pattern: 'academic.oup.com/cww', dewey: '800' },
  { pattern: 'onlinelibrary.wiley.com/journal/17414113', dewey: '800' },
  { pattern: 'jhu.edu/journal_of_modern_literature', dewey: '800' },

  // ---------- 900: History & geography ----------
  { pattern: 'historians.org', dewey: '900' },
  { pattern: 'aag.org', dewey: '900' },
  { pattern: 'historycooperative.org', dewey: '900' },
  // Humanities-broad preprint and aggregator (HAL is multidisciplinary but
  // skews humanities/SS; hprints is explicitly humanities). Best-effort tag.
  { pattern: 'hprints.org', dewey: '900' },
  { pattern: 'hal.science', dewey: '900' },
  { pattern: 'academic.oup.com/ahr', dewey: '900' },
  { pattern: 'academic.oup.com/past', dewey: '900' },
  { pattern: 'academic.oup.com/jah', dewey: '900' }, // Journal of American History
  { pattern: 'academic.oup.com/ehr', dewey: '900' }, // English Historical Review
  { pattern: 'academic.oup.com/jsh', dewey: '900' },
  { pattern: 'cambridge.org/core/journals/journal-of-modern-history', dewey: '900' },
  { pattern: 'cambridge.org/core/journals/historical-journal', dewey: '900' },
  { pattern: 'journals.uchicago.edu/journals/jmh', dewey: '900' },
  { pattern: 'journals.uchicago.edu/journals/ahr', dewey: '900' },
  { pattern: 'onlinelibrary.wiley.com/journal/14679703', dewey: '900' }, // History
  { pattern: 'tandfonline.com/journals/rhis', dewey: '900' },
  { pattern: 'jstor.org', dewey: '900' }, // mostly humanities

  // ---------- Catchall preprint indexers / generic platforms ----------
  { pattern: 'doi.org', dewey: '500' },
  { pattern: 'semanticscholar.org', dewey: '500' },
  { pattern: 'researchgate.net', dewey: '500' },
  { pattern: 'academia.edu', dewey: '500' },
  { pattern: 'osf.io', dewey: '500' },
  // Dissertation / thesis aggregators (multi-disciplinary; default to 500)
  { pattern: 'proquest.com/docview', dewey: '500' },
  { pattern: 'oatd.org', dewey: '500' },           // Open Access Theses & Dissertations
  { pattern: 'dart-europe.eu', dewey: '500' },
  { pattern: 'ethos.bl.uk', dewey: '500' },        // British Library EThOS
  { pattern: 'theses.fr', dewey: '500' },
  { pattern: 'opendissertations.org', dewey: '500' },
  // Library & archives research bodies (cross-disciplinary scholarly infrastructure)
  { pattern: 'oclc.org/research', dewey: '000' },
  { pattern: 'sr.ithaka.org', dewey: '000' },      // Ithaka S+R reports
  // Standards bodies whose technical reports double as research
  { pattern: 'nist.gov/pubs', dewey: '500' },
  { pattern: 'w3.org/tr', dewey: '000' },
  { pattern: 'preprints.org', dewey: '500' },
  { pattern: 'researchsquare.com', dewey: '500' },
  { pattern: 'authorea.com', dewey: '500' },
  { pattern: 'muse.jhu.edu', dewey: '800' },
  { pattern: 'direct.mit.edu', dewey: '500' },
  { pattern: 'hup.harvard.edu', dewey: '900' },
  { pattern: 'press.uchicago.edu', dewey: '900' },

  // ---------- Big publisher fallbacks — ONLY hit if no journal-specific match above ----------
  { pattern: 'sciencedirect.com', dewey: '500' },
  { pattern: 'springer.com', dewey: '500' },
  { pattern: 'link.springer.com', dewey: '500' },
  { pattern: 'springeropen.com', dewey: '500' },
  { pattern: 'wiley.com', dewey: '500' },
  { pattern: 'onlinelibrary.wiley.com', dewey: '500' },
  { pattern: 'tandfonline.com', dewey: '300' },
  { pattern: 'sagepub.com', dewey: '300' },
  { pattern: 'journals.sagepub.com', dewey: '300' },
  { pattern: 'mdpi.com', dewey: '500' },
  { pattern: 'oup.com', dewey: '500' },
  { pattern: 'academic.oup.com', dewey: '500' },
  { pattern: 'cambridge.org', dewey: '500' },
];

function arxivDewey(url: string): DeweyClass | null {
  // /abs/ and /pdf/ both indicate an arXiv paper; subject prefix may or may not be present.
  // Modern (post-2007) arXiv IDs are `NNNN.NNNNN` with no subject in the URL — these
  // default to 500 unless the post text elsewhere clarifies. Older IDs include subject
  // (cs.LG/0703169, math/0307200, etc.).
  const m =
    url.match(/arxiv\.org\/(?:abs|pdf)\/([a-z\-]+)(?:\.[A-Z]{2})?\//i) ||
    url.match(/^arxiv:([a-z\-]+)\//i);
  if (m) {
    const cat = m[1].toLowerCase();
    if (cat === 'cs') return '000';
    if (cat === 'econ' || cat === 'q-fin') return '300';
    if (cat === 'eess') return '600';
    return '500';
  }
  // Plain numeric arXiv ID with no subject prefix → 500 default
  if (/arxiv\.org\/(?:abs|pdf)\/\d{4}\.\d{4,5}/i.test(url)) return '500';
  if (/^arxiv:\d{4}\.\d{4,5}/i.test(url)) return '500';
  return null;
}

export function lookupDewey(url: string): DeweyClass | null {
  const arx = arxivDewey(url);
  if (arx) return arx;
  const lower = url.toLowerCase();
  for (const src of SOURCES) {
    const pat = src.pattern;
    if (typeof pat === 'string') {
      if (lower.includes(pat)) return src.dewey;
    } else {
      if (pat.test(lower)) return src.dewey;
    }
  }
  return null;
}

// =====================================================================
// Conference patterns, tagged with Dewey class
// =====================================================================
export type ConferencePattern = { pattern: RegExp; dewey: DeweyClass };

export const CONFERENCE_PATTERNS: ConferencePattern[] = [
  { pattern: /\b(NeurIPS|NIPS|ICML|ICLR|AAAI|IJCAI|KDD|UAI|AISTATS|COLT|AutoML|MLSys)\b/i, dewey: '000' },
  { pattern: /\b(CVPR|ECCV|ICCV|WACV|BMVC|SIGGRAPH(?:\s*Asia)?|IEEE\s*VIS|IEEE\s*VR)\b/i, dewey: '000' },
  { pattern: /\b(CHI|CSCW|UIST|IUI|DIS|TEI)\b/i, dewey: '000' },
  { pattern: /\b(SOSP|OSDI|NSDI|SIGCOMM|ASPLOS|ISCA|MICRO|HPCA|EuroSys|FAST|USENIX\s*ATC)\b/i, dewey: '000' },
  { pattern: /\b(USENIX\s*Security|IEEE\s*S&P|CCS|NDSS|Oakland)\b/i, dewey: '000' },
  { pattern: /\b(POPL|PLDI|OOPSLA|ECOOP|ICSE|FSE|ASE|ISSTA|CAV|TACAS)\b/i, dewey: '000' },
  { pattern: /\b(SIGMOD|VLDB|ICDE|CIDR|PODS)\b/i, dewey: '000' },
  { pattern: /\b(STOC|FOCS|SODA|ITCS|ICALP)\b/i, dewey: '000' },

  { pattern: /\bAssociation\s+for\s+Psychological\s+Science\b/i, dewey: '100' },
  { pattern: /\bAPS\s+Annual\s+Convention\b/i, dewey: '100' },
  { pattern: /\bSPSP\s+(Convention|Annual)\b/i, dewey: '100' },
  { pattern: /\bAmerican\s+Psychological\s+Association\s+Convention\b/i, dewey: '100' },
  { pattern: /\bAPA\s+Convention\b/i, dewey: '100' },
  { pattern: /\bCogSci\s+(Conference|Meeting)?\b/i, dewey: '100' },
  { pattern: /\bAPA\s+(Eastern|Pacific|Central)\s+Division\b/i, dewey: '100' },

  { pattern: /\bAAR\s+Annual\s+Meeting\b/i, dewey: '200' },
  { pattern: /\bAmerican\s+Academy\s+of\s+Religion\b/i, dewey: '200' },
  { pattern: /\bSBL\s+Annual\s+Meeting\b/i, dewey: '200' },
  { pattern: /\bSociety\s+of\s+Biblical\s+Literature\b/i, dewey: '200' },

  { pattern: /\bAEA\s+(Annual\s+Meeting|ASSA)\b/i, dewey: '300' },
  { pattern: /\bASSA\s+Meeting\b/i, dewey: '300' },
  { pattern: /\bAmerican\s+Economic\s+Association\b/i, dewey: '300' },
  { pattern: /\bNBER\s+(Summer\s+Institute|Conference)\b/i, dewey: '300' },
  { pattern: /\bAPSA\s+Annual\s+Meeting\b/i, dewey: '300' },
  { pattern: /\bAmerican\s+Political\s+Science\s+Association\b/i, dewey: '300' },
  { pattern: /\bMPSA\s+(Annual|Conference)\b/i, dewey: '300' },
  { pattern: /\bASA\s+Annual\s+Meeting\b/i, dewey: '300' },
  { pattern: /\bAmerican\s+Sociological\s+Association\b/i, dewey: '300' },
  { pattern: /\bAmerican\s+Anthropological\s+Association\b/i, dewey: '300' },
  { pattern: /\bAAA\s+Annual\s+Meeting\b/i, dewey: '300' },
  { pattern: /\bAERA\s+Annual\s+Meeting\b/i, dewey: '300' },
  { pattern: /\bAmerican\s+Educational\s+Research\s+Association\b/i, dewey: '300' },
  { pattern: /\bAALS\s+Annual\s+Meeting\b/i, dewey: '300' },

  { pattern: /\bLSA\s+Annual\s+Meeting\b/i, dewey: '400' },
  { pattern: /\bLinguistic\s+Society\s+of\s+America\b/i, dewey: '400' },
  { pattern: /\b(ACL|EMNLP|NAACL|EACL|COLING|TACL|CoNLL|LREC)\b/i, dewey: '400' },

  { pattern: /\bAPS\s+(March\s+Meeting|April\s+Meeting|Annual\s+Meeting|DPP|DAMOP|DFD)\b/i, dewey: '500' },
  { pattern: /\bAmerican\s+Physical\s+Society\s+(March|April|Annual)\b/i, dewey: '500' },
  { pattern: /\bACS\s+(National\s+Meeting|Spring|Fall)\b/i, dewey: '500' },
  { pattern: /\bAmerican\s+Chemical\s+Society\s+(National|Meeting)\b/i, dewey: '500' },
  { pattern: /\bAAS\s+(Meeting|Annual)\b/i, dewey: '500' },
  { pattern: /\bAmerican\s+Astronomical\s+Society\b/i, dewey: '500' },
  { pattern: /\bIAU\s+(General\s+Assembly|Symposium)\b/i, dewey: '500' },
  { pattern: /\bAGU\s+(Fall\s+Meeting|Annual)\b/i, dewey: '500' },
  { pattern: /\bEGU\s+(General\s+Assembly|Meeting)\b/i, dewey: '500' },
  { pattern: /\bAMS\s+Annual\s+Meeting\b/i, dewey: '500' },
  { pattern: /\bESA\s+Annual\s+Meeting\b/i, dewey: '500' },
  { pattern: /\bSociety\s+for\s+Neuroscience\b/i, dewey: '500' },
  { pattern: /\bSfN\s+(Annual|Meeting)\b/i, dewey: '500' },
  { pattern: /\bASCB(\s+Annual)?\b/i, dewey: '500' },
  { pattern: /\bJoint\s+Statistical\s+Meetings\b/i, dewey: '500' },
  { pattern: /\bJSM\s+\d{4}\b/i, dewey: '500' },
  { pattern: /\bJoint\s+Mathematics\s+Meetings\b/i, dewey: '500' },
  { pattern: /\bJMM\s+\d{4}\b/i, dewey: '500' },

  { pattern: /\bASCO(\s+Annual\s+Meeting)?\b/i, dewey: '600' },
  { pattern: /\bASH(\s+Annual\s+Meeting)?\b/i, dewey: '600' },
  { pattern: /\bAACR(\s+Annual\s+Meeting)?\b/i, dewey: '600' },
  { pattern: /\bRSNA(\s+Annual\s+Meeting)?\b/i, dewey: '600' },
  { pattern: /\bIDWeek\b/i, dewey: '600' },
  { pattern: /\bIDSA\s+(Annual|Meeting)\b/i, dewey: '600' },
  { pattern: /\bAmerican\s+Heart\s+Association(\s+Scientific\s+Sessions)?\b/i, dewey: '600' },
  { pattern: /\bAHA\s+Scientific\s+Sessions\b/i, dewey: '600' },
  { pattern: /\bESC\s+Congress\b/i, dewey: '600' },
  { pattern: /\bEULAR(\s+Congress)?\b/i, dewey: '600' },
  { pattern: /\bECTRIMS\b/i, dewey: '600' },

  { pattern: /\bCollege\s+Art\s+Association\b/i, dewey: '700' },
  { pattern: /\bCAA\s+Annual\s+Conference\b/i, dewey: '700' },
  { pattern: /\bAmerican\s+Musicological\s+Society\b/i, dewey: '700' },
  { pattern: /\bAMS\s+Annual\s+(Meeting|Conference)\b/i, dewey: '700' },
  { pattern: /\bSociety\s+for\s+Cinema\s+and\s+Media\s+Studies\b/i, dewey: '700' },
  { pattern: /\bSCMS\s+Annual\s+Conference\b/i, dewey: '700' },

  { pattern: /\bMLA\s+Annual\s+Convention\b/i, dewey: '800' },
  { pattern: /\bModern\s+Language\s+Association\b/i, dewey: '800' },
  { pattern: /\bACLA\s+Annual\s+Meeting\b/i, dewey: '800' },

  { pattern: /\bAmerican\s+Historical\s+Association\s+Annual\b/i, dewey: '900' },
  { pattern: /\bAHA\s+Annual\s+Meeting\b/i, dewey: '900' },
  { pattern: /\bAAG\s+Annual\s+Meeting\b/i, dewey: '900' },
  { pattern: /\bAssociation\s+of\s+American\s+Geographers\b/i, dewey: '900' },
  { pattern: /\bAmerican\s+Society\s+for\s+Environmental\s+History\b/i, dewey: '900' },
];
