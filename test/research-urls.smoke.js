// Smoke test for research-urls classifier.
// Run with: node test/research-urls.smoke.js

const path = require('path');
process.env.TS_NODE_TRANSPILE_ONLY = '1';

const { register } = require('module');
const { pathToFileURL } = require('url');

// Use tsx for ts runtime
const tsx = require('child_process');
const result = tsx.spawnSync('npx', ['tsx', '--eval', `
  const m = require('./src/research-urls.ts');
  const { classifyResearchURL, scoreResearchURLs, hasStrongResearchURL } = m;

  const cases = [
    // CANONICAL
    ['https://doi.org/10.1234/example', 'canonical'],
    ['https://arxiv.org/abs/2605.07723', 'canonical'],
    ['https://arxiv.org/pdf/2401.12345.pdf', 'canonical'],
    ['https://pubmed.ncbi.nlm.nih.gov/12345678/', 'canonical'],
    ['https://www.biorxiv.org/content/10.1101/2024.01.01.123456v1', 'canonical'],
    ['https://www.medrxiv.org/content/10.1101/2024.01.01.123456v1', 'canonical'],
    ['https://osf.io/abc12/', 'canonical'],
    ['https://zenodo.org/record/12345', 'canonical'],
    ['https://papers.ssrn.com/sol3/papers.cfm?abstract_id=12345', 'canonical'],
    ['https://www.semanticscholar.org/paper/Foo-Bar/abc', 'canonical'],
    ['https://openalex.org/W123456', 'canonical'],
    ['https://www.pnas.org/doi/10.1073/pnas.123456', 'canonical'],
    ['https://www.nature.com/articles/s41586-024-0001-x', 'canonical'],
    ['https://www.sciencedirect.com/science/article/pii/S0001-2024', 'canonical'],
    ['https://link.springer.com/article/10.1007/s12345-024', 'canonical'],

    // PROCEEDINGS
    ['https://aclanthology.org/2024.emnlp-main.123/', 'proceedings'],
    ['https://openreview.net/forum?id=abc123', 'proceedings'],
    ['https://papers.nips.cc/paper/2023/hash/abc.html', 'proceedings'],
    ['https://proceedings.mlr.press/v202/foo24a.html', 'proceedings'],
    ['https://dl.acm.org/doi/10.1145/3123456.3123457', 'proceedings'],
    ['https://ieeexplore.ieee.org/document/12345', 'proceedings'],

    // INSTITUTIONAL
    ['https://www.nih.gov/news', 'institutional'],
    ['https://www.cdc.gov/example', 'institutional'],
    ['https://www.cbo.gov/publication/12345', 'institutional'],
    ['https://www.brookings.edu/research/example-paper', 'institutional'],
    ['https://www.rand.org/pubs/research_reports/RR12345.html', 'institutional'],
    ['https://www.who.int/publications/i/item/example', 'institutional'],
    ['https://example.edu/papers/2024/foo', 'institutional'],

    // NONE
    ['https://www.nytimes.com/2024/01/01/article.html', 'none'],
    ['https://twitter.com/user/status/12345', 'none'],
    ['https://example.com', 'none'],
    ['https://www.youtube.com/watch?v=abc', 'none'],
    ['https://www.bbc.com/news/123', 'none'],
    ['https://bsky.app/profile/x', 'none'],
  ];

  let passed = 0, failed = 0;
  for (const [url, expected] of cases) {
    const got = classifyResearchURL(url).tier;
    if (got === expected) {
      passed++;
    } else {
      failed++;
      console.log('FAIL:', url, '-> got', got, 'expected', expected);
    }
  }

  // Test scoring + hasStrongResearchURL
  const mixedUrls = ['https://nytimes.com/foo', 'https://arxiv.org/abs/2024.12345'];
  const score = scoreResearchURLs(mixedUrls);
  if (score.boost !== 3.0 || score.tier !== 'canonical') {
    failed++;
    console.log('FAIL: mixed url scoring -- got', score);
  } else { passed++; }

  if (!hasStrongResearchURL(mixedUrls)) { failed++; console.log('FAIL: hasStrongResearchURL'); }
  else passed++;

  if (hasStrongResearchURL(['https://nytimes.com', 'https://twitter.com'])) {
    failed++; console.log('FAIL: hasStrongResearchURL false positive');
  } else passed++;

  console.log('\\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
`], { cwd: __dirname + '/..', stdio: 'inherit' });

process.exit(result.status);
