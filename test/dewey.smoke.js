#!/usr/bin/env node
// Smoke test for newly-added Dewey patterns from the PaperSkygest fold-in.
// Mirrors the lookupDewey logic from src/dewey.ts (string contains check,
// then regex test, in source order; arXiv handling first).

const fs = require('fs');
const src = fs.readFileSync('src/dewey.ts', 'utf-8');

// Pull SOURCES entries out of the source file, in order.
// Match both string and regex patterns. The regex parser must handle
// escaped slashes (`\/`) inside regex literals.
const sources = [];
const re = /\{\s*pattern:\s*(?:'([^']+)'|\/((?:\\.|[^\/])+)\/[a-z]*),\s*dewey:\s*'(\d{3})'\s*\}/g;
let m;
while ((m = re.exec(src))) {
  if (m[1] !== undefined) {
    sources.push({ pattern: m[1], dewey: m[3] });
  } else if (m[2] !== undefined) {
    sources.push({ pattern: new RegExp(m[2], 'i'), dewey: m[3] });
  }
}

function arxivDewey(url) {
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
  if (/arxiv\.org\/(?:abs|pdf)\/\d{4}\.\d{4,5}/i.test(url)) return '500';
  if (/^arxiv:\d{4}\.\d{4,5}/i.test(url)) return '500';
  return null;
}

function lookupDewey(url) {
  const arx = arxivDewey(url);
  if (arx) return arx;
  const lower = url.toLowerCase();
  for (const src of sources) {
    if (typeof src.pattern === 'string') {
      if (lower.includes(src.pattern)) return src.dewey;
    } else if (src.pattern.test(lower)) {
      return src.dewey;
    }
  }
  return null;
}

const tests = [
  // ---- ML/CS conferences (000) ----
  ['https://proceedings.neurips.cc/paper/2023/...', '000'],
  ['https://proceedings.mlr.press/v202/foo.html', '000'],
  ['https://proceedings.icml.cc/static/paper.pdf', '000'],
  ['https://proceedings.ijcai.org/2023/123', '000'],
  ['https://jmlr.org/papers/v22/20-456.html', '000'],
  ['https://eccv2022.org/papers/eccv_2022_paper_1.pdf', '000'],
  ['https://cvpr2024.thecvf.com/papers/Foo_Bar.pdf', '000'],
  ['https://eprint.iacr.org/2023/123', '000'],
  ['https://ia.cr/2023/0456', '000'],
  ['https://aclweb.org/anthology/N18-1101/', '000'],
  // ---- Philosophy / psych (100) ----
  ['https://philsci-archive.pitt.edu/12345/', '100'],
  ['https://psycharchives.org/handle/20.500.12034/123', '100'],
  // ---- Social sciences (300) ----
  ['https://repec.org/...', '300'],
  ['https://econpapers.repec.org/paper/abc123.htm', '300'],
  ['https://econstor.eu/handle/10419/123', '300'],
  ['https://econbiz.de/Record/...', '300'],
  ['https://hbr.org/2024/01/article', '300'],
  ['https://mitsloan.mit.edu/publication/foo', '300'],
  ['https://informs.org/Publications/...', '300'],
  ['https://aom.org/publications/...', '300'],
  ['https://eric.ed.gov/?id=ED123456', '300'],
  ['https://heinonline.org/HOL/...', '300'],
  ['https://oxfordbibliographies.com/view/foo', '300'],
  ['https://redalyc.org/articulo.oa?id=123', '300'],
  ['https://cyberleninka.ru/article/n/foo', '300'],
  ['https://africajournals.org/...', '300'],
  ['https://ajol.info/index.php/foo', '300'],
  ['https://sabinet.co.za/...', '300'],
  ['https://cairn.info/revue-foo', '300'],
  ['https://persee.fr/doc/foo', '300'],
  ['https://erudit.org/en/journals/foo', '300'],
  ['https://sociologicalscience.com/articles-v9-1-2/', '300'],
  // ---- Pure science (500) ----
  ['https://alphaxiv.org/abs/1234.5678', '500'],
  ['https://figshare.com/articles/dataset/foo/123', '500'],
  ['https://zenodo.org/record/1234567', '500'],
  ['https://int-res.com/abstracts/meps/v123/foo', '500'],
  ['https://esa.org/publications/foo', '500'],
  ['https://journals.ametsoc.org/view/journals/foo', '500'],
  ['https://j-stage.jst.go.jp/article/foo', '500'],
  ['https://koreascience.or.kr/article/foo', '500'],
  ['https://cscd.ac.cn/foo', '500'],
  ['https://cnki.net/kcms/foo', '500'],
  ['https://cochranelibrary.com/cdsr/doi/foo', '500'],
  // ---- Tech / medicine (600) ----
  ['https://ascopubs.org/doi/10.1200/JCO.2023.foo', '600'],
  ['https://cdc.gov/mmwr/volumes/72/wr/foo.htm', '600'],
  ['https://who.int/publications/i/item/foo', '600'],
  ['https://asme.org/publications/journals', '600'],
  ['https://asce.org/publications/journals/foo', '600'],
  ['https://aiaa.org/publications/journals/foo', '600'],
  ['https://aiche.org/resources/publications/foo', '600'],
  // ---- Arts (700) ----
  ['https://oxfordmusiconline.com/grovemusic/view/foo', '700'],
  ['https://mtosmt.org/issues/mto.23.29.1/foo.html', '700'],
  ['https://film-philosophy.com/index.php/f-p/article/view/123', '700'],
  ['https://getty.edu/publications/foo', '700'],
  ['https://artsjournal.com/foo', '700'],
  // ---- Literature (800) ----
  ['https://shakespearequarterly.org/foo', '800'],
  // ---- History / geography (900) ----
  ['https://historycooperative.org/journal/foo', '900'],
  ['https://hprints.org/hprints-12345', '900'],
  ['https://hal.science/hal-04123456', '900'],
  // ---- Catchall ----
  ['https://academia.edu/12345/Title_of_Paper', '500'],
  // ---- arXiv extensions ----
  ['arxiv:2401.12345', '500'],
  ['arxiv:cs/0703169', '000'],
  ['https://arxiv.org/pdf/2401.12345', '500'],
  // ---- Regression: make sure existing classifications still work ----
  ['https://academic.oup.com/mind/article/123', '100'], // philosophy via journal path
  ['https://academic.oup.com/ahr/article/456', '900'],  // history via journal path
  ['https://academic.oup.com/qje/article/789', '300'],  // economics via journal path
  ['https://academic.oup.com/foo-unknown', '500'],      // OUP fallback
  ['https://nejm.org/doi/10.1056/foo', '600'],          // medicine
  ['https://arxiv.org/abs/cs.LG/0703169', '000'],       // arxiv with old-style subject
  // ---- Gray literature additions ----
  ['https://pewresearch.org/social-trends/2024/foo', '300'],
  ['https://kff.org/health-reform/foo', '300'],
  ['https://cbpp.org/research/foo', '300'],
  ['https://aei.org/research-products/report/foo', '300'],
  ['https://cato.org/policy-analysis/foo', '300'],
  ['https://piie.com/publications/foo', '300'],
  ['https://mathematica.org/publications/foo', '300'],
  ['https://cfr.org/report/foo', '300'],
  ['https://carnegieendowment.org/2024/foo', '300'],
  ['https://sipri.org/publications/foo', '300'],
  ['https://chathamhouse.org/research/foo', '300'],
  ['https://oecd.org/economics/foo', '300'],
  ['https://oecd-ilibrary.org/economics/foo', '300'],
  ['https://worldbank.org/en/research/foo', '300'],
  ['https://imf.org/en/publications/foo', '300'],
  ['https://ec.europa.eu/eurostat/foo', '300'],
  ['https://unesco.org/reports/foo', '300'],
  ['https://undp.org/publications/foo', '300'],
  ['https://fao.org/3/foo', '300'],
  ['https://bls.gov/opub/btn/foo', '300'],
  ['https://gao.gov/products/gao-24-foo', '300'],
  ['https://cbo.gov/publication/foo', '300'],
  ['https://crsreports.congress.gov/product/pdf/R/R12345', '300'],
  ['https://americanprogress.org/article/foo', '300'],
  // Federal labs (500)
  ['https://nist.gov/publications/foo', '500'],
  ['https://nrel.gov/publications/foo', '500'],
  ['https://usgs.gov/publications/foo', '500'],
  ['https://osti.gov/biblio/12345', '500'],
  ['https://ntrs.nasa.gov/citations/20240001234', '500'],
  ['https://sandia.gov/research/publications', '500'],
  ['https://ornl.gov/publication/foo', '500'],
  ['https://lbl.gov/publications/foo', '500'],
  ['https://epa.gov/research/foo', '500'],
  // Biomedical agencies (600)
  ['https://nih.gov/news-events/news-releases/foo', '600'],
  ['https://nimh.nih.gov/research/foo', '600'],
  ['https://nci.nih.gov/research/foo', '600'],
  ['https://fda.gov/science-research/foo', '600'],
  ['https://ahrq.gov/research/foo', '600'],
  ['https://nationalacademies.org/our-work/foo', '600'],
  ['https://wellcome.org/reports/foo', '600'],
  ['https://gatesfoundation.org/ideas/articles/foo', '600'],
  // Dissertation aggregators (500)
  ['https://proquest.com/docview/1234567890', '500'],
  ['https://oatd.org/oatd/record?record=foo', '500'],
  ['https://ethos.bl.uk/OrderDetails.do?uin=uk.bl.ethos.foo', '500'],
  ['https://theses.fr/2024UPASE042', '500'],
  // Library / standards bodies
  ['https://oclc.org/research/publications/foo', '000'],
  ['https://sr.ithaka.org/publications/foo', '000'],
  ['https://w3.org/TR/webauthn-2/', '000'],
  // ---- Additional gray-lit (climate/energy, education, tech policy) ----
  ['https://ipcc.ch/report/ar6/wg1/', '500'],
  ['https://iea.org/reports/world-energy-outlook-2024', '500'],
  ['https://irena.org/publications/foo', '500'],
  ['https://wri.org/research/foo', '500'],
  ['https://nces.ed.gov/pubsearch/foo', '300'],
  ['https://ies.ed.gov/pubsearch/foo', '300'],
  ['https://itif.org/publications/foo', '300'],
  ['https://datasociety.net/library/foo', '300'],
  ['https://cdt.org/insights/foo', '300'],
];

let pass = 0, fail = 0;
for (const [url, want] of tests) {
  const got = lookupDewey(url);
  if (got === want) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL  ${url}  →  got=${got}  want=${want}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
