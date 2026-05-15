// 5C-tagged signal patterns for substantive engagement with research.
// Three parallel registries: CRITIQUE, PRAISE, INQUIRY. All are tagged by
// the same Credibility / Clarity / Creativity / Connectivity / Care dimensions.
// Inquiry posts have an additional sub-type indicating what KIND of inquiry.

export type Dimension = 'credibility' | 'clarity' | 'creativity' | 'connectivity' | 'care';
export type Sentiment = 'critical' | 'praise' | 'inquiry';
// Sub-types for inquiry (helps the LLM and routing)
export type InquiryType = 'open_question' | 'neutral_uncertainty' | 'meta_critique';

export type TaggedPattern = {
  pattern: RegExp;
  dimensions: Dimension[];
  inquiryType?: InquiryType;
  lang?: 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'zh';
};

// =====================================================================
// CRITIQUE PATTERNS
// =====================================================================
const CRIT_CREDIBILITY: TaggedPattern[] = [
  { pattern: /\bunderpowered\b/i, dimensions: ['credibility'] },
  { pattern: /\bp[-\s]?hack\w*/i, dimensions: ['credibility', 'care'] },
  { pattern: /\bselection bias\b/i, dimensions: ['credibility'] },
  { pattern: /\bsurvivor(ship)? bias\b/i, dimensions: ['credibility'] },
  { pattern: /\bpublication bias\b/i, dimensions: ['credibility', 'connectivity'] },
  { pattern: /\bconfound\w*/i, dimensions: ['credibility'] },
  { pattern: /\bspurious\b/i, dimensions: ['credibility'] },
  { pattern: /\bcherry[-\s]?pick\w*/i, dimensions: ['credibility', 'care'] },
  { pattern: /\bsalami[-\s]?slic\w*/i, dimensions: ['credibility', 'care'] },
  { pattern: /\bno control(\s+group)?\b/i, dimensions: ['credibility'] },
  { pattern: /\b(very |really |extremely |too )?small sample\b/i, dimensions: ['credibility'] },
  { pattern: /\b[Nn]\s*=\s*\d{1,2}\b/, dimensions: ['credibility'] },
  { pattern: /\bopen[-\s]?label\b/i, dimensions: ['credibility'] },
  { pattern: /\bunblinded\b/i, dimensions: ['credibility'] },
  { pattern: /\bquasi[-\s]?experimental\b/i, dimensions: ['credibility'] },
  { pattern: /\bconvenience sample\b/i, dimensions: ['credibility'] },
  { pattern: /\bself[-\s]?select(ed|ion)\b/i, dimensions: ['credibility'] },
  { pattern: /\b(just |only |merely )observational\b/i, dimensions: ['credibility'] },
  { pattern: /\bomitted variable\b/i, dimensions: ['credibility'] },
  { pattern: /\blurking variable\b/i, dimensions: ['credibility'] },
  { pattern: /\bendogeneity\b/i, dimensions: ['credibility'] },
  { pattern: /\breverse causation\b/i, dimensions: ['credibility'] },
  { pattern: /\becological fallacy\b/i, dimensions: ['credibility'] },
  { pattern: /\bSimpson'?s paradox\b/i, dimensions: ['credibility'] },
  { pattern: /\bmultiple comparisons?\b/i, dimensions: ['credibility'] },
  { pattern: /\bBonferroni\b/i, dimensions: ['credibility'] },
  { pattern: /\bresearcher degrees of freedom\b/i, dimensions: ['credibility'] },
  { pattern: /\bHARKing\b/i, dimensions: ['credibility', 'care'] },
  { pattern: /\bdata[-\s]?dredg\w+/i, dimensions: ['credibility', 'care'] },
  { pattern: /\bfishing expedition\b/i, dimensions: ['credibility', 'care'] },
  { pattern: /\blow (statistical )?power\b/i, dimensions: ['credibility'] },
  { pattern: /\bforking paths\b/i, dimensions: ['credibility'] },
  { pattern: /\bwinner'?s curse\b/i, dimensions: ['credibility'] },
  { pattern: /\bmultiple testing\b/i, dimensions: ['credibility'] },
  { pattern: /\bfile drawer\b/i, dimensions: ['credibility', 'connectivity'] },
  { pattern: /\bbase[-\s]?rate (neglect|fallacy)\b/i, dimensions: ['credibility'] },
  { pattern: /\b(ceiling|floor) effect\b/i, dimensions: ['credibility'] },
  { pattern: /\bmulticollinearity\b/i, dimensions: ['credibility'] },
  { pattern: /\bone[-\s]?tail/i, dimensions: ['credibility'] },
  { pattern: /\bpost[-\s]?hoc\b/i, dimensions: ['credibility'] },
  { pattern: /\bp[-\s]?curve\b/i, dimensions: ['credibility'] },
  { pattern: /\beffect size .{0,20}(small|tiny|implausibl|too large|absurd)/i, dimensions: ['credibility'] },
  { pattern: /\bnoisy (data|estimat)/i, dimensions: ['credibility'] },
  { pattern: /\bregression to the mean\b/i, dimensions: ['credibility'] },
  { pattern: /\bGoodhart'?s law\b/i, dimensions: ['credibility'] },
  { pattern: /\b(didn'?t|did not|failed to|cannot|can'?t) replicat\w+/i, dimensions: ['credibility'] },
  { pattern: /\b(couldn'?t|could not|failed to) reproduc\w+/i, dimensions: ['credibility'] },
  { pattern: /\bdoes(n'?t| not) replicat\w+/i, dimensions: ['credibility'] },
  { pattern: /\bnon[-\s]?reproducible\b/i, dimensions: ['credibility'] },
  { pattern: /\breplication crisis\b/i, dimensions: ['credibility'] },
  { pattern: /\b(no |missing |without )triangulation\b/i, dimensions: ['credibility'] },
  { pattern: /\b(no |missing |without )member check/i, dimensions: ['credibility'] },
  { pattern: /\baudit trail\b/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bsaturation (not (reached|achieved))/i, dimensions: ['credibility'] },
  { pattern: /\bcoder (dis)?agreement\b/i, dimensions: ['credibility'] },
  { pattern: /\binter[-\s]?rater (reliability|agreement)\b/i, dimensions: ['credibility'] },
  { pattern: /\barchival (gap|silence|absence|omission)\b/i, dimensions: ['credibility', 'connectivity'] },
  { pattern: /\b(mis)?read(s|ing) of the (source|text|archive)\b/i, dimensions: ['credibility'] },
  { pattern: /\bsource criticism\b/i, dimensions: ['credibility'] },
  { pattern: /\bprovenance (issue|problem|unclear)\b/i, dimensions: ['credibility', 'care'] },
];

const CRIT_CLARITY: TaggedPattern[] = [
  { pattern: /\bdoesn'?t (show|support|prove|imply|mean|demonstrate|establish)\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bdo(es)? not (show|support|prove|imply|demonstrate|establish)\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bover[-\s]?claim\w*/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bover[-\s]?hyp\w+/i, dimensions: ['clarity'] },
  { pattern: /\boversold\b/i, dimensions: ['clarity'] },
  { pattern: /\btitle (says|claims|implies|misrepresents)\b/i, dimensions: ['clarity'] },
  { pattern: /\bnot what (the )?(paper|study|authors|data) (says|shows|claim)/i, dimensions: ['clarity'] },
  { pattern: /\bcorrelation\s*(is not|isn'?t|≠|!=|is no)\s*caus/i, dimensions: ['credibility'] },
  { pattern: /\bcausal (claim|story|interpretation)\b.{0,40}(unsupported|unwarranted|stretch)/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bbeyond (what )?the data\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bextrapolat\w+/i, dimensions: ['credibility'] },
  { pattern: /\bover[-\s]?generaliz\w+/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bdoesn'?t generaliz/i, dimensions: ['credibility'] },
  { pattern: /\bjust[-\s]?so story\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bcircular (reasoning|argument|logic)\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bmechanism (unclear|not (shown|established|tested))/i, dimensions: ['clarity'] },
  { pattern: /\b(too|overly) strong (a )?claim/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bweak\s+(claim|evidence|argument)\b/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bthin\s+evidence\b/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\b(no|missing|without) baseline\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\b(never|not|nowhere) defined\b/i, dimensions: ['clarity'] },
  { pattern: /\bdoesn'?t define\b/i, dimensions: ['clarity'] },
  { pattern: /\bambiguous\b/i, dimensions: ['clarity'] },
  { pattern: /\bvague\b/i, dimensions: ['clarity'] },
  { pattern: /\boperationaliz/i, dimensions: ['clarity'] },
  { pattern: /\b(no|missing|lack of) pre[-\s]?registration\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bdata (not |aren'?t |isn'?t )(available|public|shared)\b/i, dimensions: ['clarity', 'care'] },
  { pattern: /\bcode (not |isn'?t |aren'?t )(available|public|shared|released)\b/i, dimensions: ['clarity', 'care'] },
  { pattern: /\bblack[-\s]?box\b/i, dimensions: ['clarity'] },
  { pattern: /\bconceptual stretch/i, dimensions: ['clarity', 'creativity'] },
  { pattern: /\bconflat(es|ing|ion)\b/i, dimensions: ['clarity'] },
  { pattern: /\bcategor(y|ies) (problem|confusion|error)\b/i, dimensions: ['clarity'] },
  { pattern: /\bconstruct (validity|underspecified|unclear)\b/i, dimensions: ['clarity', 'credibility'] },
  { pattern: /\bjargon[-\s]?heavy\b/i, dimensions: ['clarity'] },
  { pattern: /\bobscurantist\b/i, dimensions: ['clarity'] },
];

const CRIT_CREATIVITY: TaggedPattern[] = [
  { pattern: /\bincremental\b/i, dimensions: ['creativity'] },
  { pattern: /\bnot (very |particularly )?novel\b/i, dimensions: ['creativity'] },
  { pattern: /\brediscover\w+/i, dimensions: ['creativity', 'connectivity'] },
  { pattern: /\brepackag\w+/i, dimensions: ['creativity'] },
  { pattern: /\bjust .{0,30}(with|under) (a )?new (name|label)/i, dimensions: ['creativity'] },
  { pattern: /\bold wine in new bottles?\b/i, dimensions: ['creativity'] },
  { pattern: /\bnew bottles? for old wine\b/i, dimensions: ['creativity'] },
  { pattern: /\bwhat'?s (the )?(actual |real )?novel/i, dimensions: ['creativity'] },
  { pattern: /\bdone (many times )?before\b/i, dimensions: ['creativity', 'connectivity'] },
  { pattern: /\bmarginal contribution\b/i, dimensions: ['creativity'] },
  { pattern: /\btrivial contribution\b/i, dimensions: ['creativity'] },
  { pattern: /\byet another\b/i, dimensions: ['creativity'] },
  { pattern: /\bso what\b/i, dimensions: ['creativity'] },
  { pattern: /\bnothing (really )?new\b/i, dimensions: ['creativity'] },
  { pattern: /\bdescriptive (rather than|but not)\b/i, dimensions: ['creativity'] },
  { pattern: /\b(rehash|retread)\w*/i, dimensions: ['creativity'] },
];

const CRIT_CONNECTIVITY: TaggedPattern[] = [
  { pattern: /\bdoesn'?t cite\b/i, dimensions: ['connectivity'] },
  { pattern: /\bdo(es)? not cite\b/i, dimensions: ['connectivity'] },
  { pattern: /\bfail(s|ed) to cite\b/i, dimensions: ['connectivity'] },
  { pattern: /\bnot citing\b/i, dimensions: ['connectivity'] },
  { pattern: /\bmissing citation/i, dimensions: ['connectivity'] },
  { pattern: /\bignor\w+ (the |a |all |an entire )?(prior|earlier|relevant|extensive|whole) (literature|work|research|tradition|history|scholarship)/i, dimensions: ['connectivity'] },
  { pattern: /\bno engagement with\b/i, dimensions: ['connectivity'] },
  { pattern: /\bdoesn'?t engage (with|seriously)/i, dimensions: ['connectivity'] },
  { pattern: /\bfails? to engage\b/i, dimensions: ['connectivity'] },
  { pattern: /\b(reinvent\w*) the wheel\b/i, dimensions: ['connectivity', 'creativity'] },
  { pattern: /\bin a vacuum\b/i, dimensions: ['connectivity'] },
  { pattern: /\bStigler'?s law\b/i, dimensions: ['connectivity'] },
  { pattern: /\bunaware of\b/i, dimensions: ['connectivity'] },
  { pattern: /\bcitation cartel\b/i, dimensions: ['connectivity', 'care'] },
  { pattern: /\b(elides|elision of) (entire |the )?historiograph/i, dimensions: ['connectivity'] },
  { pattern: /\bahistorical\b/i, dimensions: ['connectivity', 'credibility'] },
  { pattern: /\bdecontextualiz/i, dimensions: ['connectivity', 'clarity'] },
  { pattern: /\b(ignores?|misses?|skips?) (the )?(foundational|seminal|classic) (work|text|paper)/i, dimensions: ['connectivity'] },
];

const CRIT_CARE: TaggedPattern[] = [
  { pattern: /\bpredatory journal\b/i, dimensions: ['care'] },
  { pattern: /\bpaper mill\b/i, dimensions: ['care'] },
  { pattern: /\bretract\w+/i, dimensions: ['care'] },
  { pattern: /\bdata fabricat\w+/i, dimensions: ['care'] },
  { pattern: /\bimage manipulat\w+/i, dimensions: ['care'] },
  { pattern: /\b(faked|fabricated|fraudulent) (data|results|figures?|images?)\b/i, dimensions: ['care'] },
  { pattern: /\bpeer review (fail|broke|didn'?t catch)/i, dimensions: ['care', 'credibility'] },
  { pattern: /\bdata leak\w+/i, dimensions: ['care', 'credibility'] },
  { pattern: /\b(test set|train\/test) contamination\b/i, dimensions: ['care', 'credibility'] },
  { pattern: /\bIRB\s+(approval|review|protocol|missing|absent)/i, dimensions: ['care'] },
  { pattern: /\bwithout IRB\b/i, dimensions: ['care'] },
  { pattern: /\bno ethics? (approval|review|committee|board)\b/i, dimensions: ['care'] },
  { pattern: /\binformed consent\b/i, dimensions: ['care'] },
  { pattern: /\bconflict of interest\b/i, dimensions: ['care'] },
  { pattern: /\bundisclosed (funding|conflict|COI)\b/i, dimensions: ['care'] },
  { pattern: /\bCOI\s+not\s+(disclosed|declared)/i, dimensions: ['care'] },
  { pattern: /\bvulnerable populations?\b/i, dimensions: ['care'] },
  { pattern: /\bextractive research\b/i, dimensions: ['care'] },
  { pattern: /\bdata sovereignty\b/i, dimensions: ['care'] },
  { pattern: /\bpositionality\b/i, dimensions: ['care'] },
  { pattern: /\b(no |missing |without )reflexivit/i, dimensions: ['care'] },
  { pattern: /\bhelicopter (research|science)\b/i, dimensions: ['care'] },
  { pattern: /\bparachute (research|science)\b/i, dimensions: ['care'] },
  { pattern: /\bdecolon(iz|is)/i, dimensions: ['care'] },
  { pattern: /\bsilenc(es|ing) (the |of )?(voices?|community|subjects?)/i, dimensions: ['care'] },
  { pattern: /\b(epistemic|epistemological) (injustice|violence)\b/i, dimensions: ['care'] },
  { pattern: /\b(exoticiz|orientaliz|essentializ)/i, dimensions: ['care'] },
  { pattern: /\bWEIRD sampl/i, dimensions: ['care', 'credibility'] },
  { pattern: /\b(harm to|harms?) (participants|community|subjects)\b/i, dimensions: ['care'] },
];

const CRIT_TONE: TaggedPattern[] = [
  { pattern: /\bmisleading\b/i, dimensions: ['clarity', 'care'] },
  { pattern: /\bflawed\b/i, dimensions: ['credibility'] },
  { pattern: /\bquestionable\b/i, dimensions: ['credibility'] },
  { pattern: /\bsloppy\b/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bnonsense\b/i, dimensions: ['credibility'] },
  { pattern: /\bbogus\b/i, dimensions: ['credibility'] },
  { pattern: /\bhouse of cards\b/i, dimensions: ['credibility'] },
  { pattern: /\bdubious\b/i, dimensions: ['credibility'] },
  { pattern: /\bjunk science\b/i, dimensions: ['credibility', 'creativity'] },
  { pattern: /\bpseudo[-\s]?science\b/i, dimensions: ['credibility'] },
  { pattern: /\bI'?m skeptical\b/i, dimensions: ['credibility'] },
  { pattern: /\bdeeply (skeptical|flawed|problematic)\b/i, dimensions: ['credibility'] },
  { pattern: /\bextraordinary claims?\b/i, dimensions: ['credibility'] },
  { pattern: /\bnot convinc\w+/i, dimensions: ['credibility'] },
  { pattern: /\bbig if true\b/i, dimensions: ['credibility'] },
  { pattern: /\bdoesn'?t pass the smell test\b/i, dimensions: ['credibility'] },
  { pattern: /\bunpersuasive\b/i, dimensions: ['credibility'] },
];

const CRIT_MULTI: TaggedPattern[] = [
  { pattern: /\bno replica(ble)?\b/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bmuestra pequeña\b/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bsesgo de selección\b/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bengañoso\b/i, dimensions: ['clarity'], lang: 'es' },
  { pattern: /\bcuestionable\b/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bno demuestra\b/i, dimensions: ['clarity', 'credibility'], lang: 'es' },
  { pattern: /\bsobreestimad/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bnão replica\b/i, dimensions: ['credibility'], lang: 'pt' },
  { pattern: /\bamostra pequena\b/i, dimensions: ['credibility'], lang: 'pt' },
  { pattern: /\bviés de seleção\b/i, dimensions: ['credibility'], lang: 'pt' },
  { pattern: /\benganoso\b/i, dimensions: ['clarity'], lang: 'pt' },
  { pattern: /\bquestionável\b/i, dimensions: ['credibility'], lang: 'pt' },
  { pattern: /\bnão demonstra\b/i, dimensions: ['clarity', 'credibility'], lang: 'pt' },
  { pattern: /\bne (se )?réplique pas\b/i, dimensions: ['credibility'], lang: 'fr' },
  { pattern: /\b(petit |faible )échantillon\b/i, dimensions: ['credibility'], lang: 'fr' },
  { pattern: /\bbiais de sélection\b/i, dimensions: ['credibility'], lang: 'fr' },
  { pattern: /\btrompeur\b/i, dimensions: ['clarity'], lang: 'fr' },
  { pattern: /\bdouteux\b/i, dimensions: ['credibility'], lang: 'fr' },
  { pattern: /\bne (?:démontre|prouve) pas\b/i, dimensions: ['clarity', 'credibility'], lang: 'fr' },
  { pattern: /\bnicht repliz\w*/i, dimensions: ['credibility'], lang: 'de' },
  { pattern: /\bkleine Stichprobe\b/i, dimensions: ['credibility'], lang: 'de' },
  { pattern: /\bSelektion(s|verzerrung)/i, dimensions: ['credibility'], lang: 'de' },
  { pattern: /\birreführend\b/i, dimensions: ['clarity'], lang: 'de' },
  { pattern: /\bfragwürdig\b/i, dimensions: ['credibility'], lang: 'de' },
  { pattern: /\bnon replic/i, dimensions: ['credibility'], lang: 'it' },
  { pattern: /\bcampione piccolo\b/i, dimensions: ['credibility'], lang: 'it' },
  { pattern: /\bingannevole\b/i, dimensions: ['clarity'], lang: 'it' },
  { pattern: /再現できない/, dimensions: ['credibility'], lang: 'ja' },
  { pattern: /サンプルが小さい/, dimensions: ['credibility'], lang: 'ja' },
  { pattern: /誤解を招く/, dimensions: ['clarity'], lang: 'ja' },
  { pattern: /疑わしい/, dimensions: ['credibility'], lang: 'ja' },
  { pattern: /過剰な主張/, dimensions: ['clarity'], lang: 'ja' },
  { pattern: /无法重现/, dimensions: ['credibility'], lang: 'zh' },
  { pattern: /样本(太小|过小)/, dimensions: ['credibility'], lang: 'zh' },
  { pattern: /选择性偏差/, dimensions: ['credibility'], lang: 'zh' },
  { pattern: /误导/, dimensions: ['clarity'], lang: 'zh' },
  { pattern: /可疑/, dimensions: ['credibility'], lang: 'zh' },
];

export const CRITIQUE_PATTERNS: TaggedPattern[] = [
  ...CRIT_CREDIBILITY, ...CRIT_CLARITY, ...CRIT_CREATIVITY,
  ...CRIT_CONNECTIVITY, ...CRIT_CARE, ...CRIT_TONE, ...CRIT_MULTI,
];

// =====================================================================
// PRAISE PATTERNS — substantive, dimension-specific praise.
// =====================================================================
const PRAISE_CREDIBILITY: TaggedPattern[] = [
  { pattern: /\b(well|carefully|meticulously)[-\s]?(controlled|powered|designed|identified|specified)\b/i, dimensions: ['credibility'] },
  { pattern: /\brigorous (analysis|design|methodology|methods|approach)\b/i, dimensions: ['credibility'] },
  { pattern: /\bgold[-\s]?standard\b/i, dimensions: ['credibility'] },
  { pattern: /\b(pre[-\s]?)?registered\b.{0,30}\b(study|trial|protocol)\b/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bcausal identification\b/i, dimensions: ['credibility'] },
  { pattern: /\bclean (identification|design|RD|RDD|IV)\b/i, dimensions: ['credibility'] },
  { pattern: /\b(extensive|thorough) (robustness|sensitivity) (check|analysis|tests)/i, dimensions: ['credibility'] },
  { pattern: /\b(out[-\s]?of[-\s]?sample|held[-\s]?out) (validation|test)\b/i, dimensions: ['credibility'] },
  { pattern: /\b(large|impressive|massive) (?:sample|cohort|N=\d{4,})/i, dimensions: ['credibility'] },
  { pattern: /\breplicates? (prior |earlier )?(work|findings|results)\b/i, dimensions: ['credibility'] },
  { pattern: /\bsuccessfully replicates?\b/i, dimensions: ['credibility'] },
  { pattern: /\brobust (to|across|finding|result)/i, dimensions: ['credibility'] },
  { pattern: /\b(careful|deep|sustained) reflexivit/i, dimensions: ['credibility', 'care'] },
  { pattern: /\b(thorough|extensive) triangulation\b/i, dimensions: ['credibility'] },
  { pattern: /\bmember[-\s]?checked\b/i, dimensions: ['credibility'] },
  { pattern: /\b(rich|thick) (description|ethnography|data)\b/i, dimensions: ['credibility', 'clarity'] },
  { pattern: /\bmasterful (archival|source) work\b/i, dimensions: ['credibility'] },
  { pattern: /\b(deep|sustained|painstaking) (archival|primary[-\s]?source) (research|work|engagement)/i, dimensions: ['credibility'] },
];

const PRAISE_CLARITY: TaggedPattern[] = [
  { pattern: /\b(crystal[-\s]?)?clear (exposition|argument|writing|prose|presentation)\b/i, dimensions: ['clarity'] },
  { pattern: /\b(well|beautifully|elegantly|lucidly) (written|argued|presented|explained|structured)\b/i, dimensions: ['clarity'] },
  { pattern: /\b(clean|crisp) (argument|prose|writing|exposition)\b/i, dimensions: ['clarity'] },
  { pattern: /\b(transparent|open) (about|reporting)\b/i, dimensions: ['clarity'] },
  { pattern: /\bcode (and|&|\+) data (are )?(available|shared|released|public)/i, dimensions: ['clarity', 'care'] },
  { pattern: /\b(open|public|available) (code|data|materials)\b/i, dimensions: ['clarity', 'care'] },
  { pattern: /\bcareful definitions?\b/i, dimensions: ['clarity'] },
  { pattern: /\bprecisely (defines?|specifies|operationaliz)/i, dimensions: ['clarity'] },
  { pattern: /\b(well|carefully)[-\s]?scoped\b/i, dimensions: ['clarity'] },
  { pattern: /\bappropriately (cautious|humble|hedged) (claim|conclusion|interpretation)/i, dimensions: ['clarity'] },
  { pattern: /\b(limitations?|caveats?) (are |is )?(clearly |honestly )?(stated|acknowledged|discussed)/i, dimensions: ['clarity', 'credibility'] },
];

const PRAISE_CREATIVITY: TaggedPattern[] = [
  { pattern: /\b(genuinely|truly|deeply) (novel|original|new)/i, dimensions: ['creativity'] },
  { pattern: /\bopens up (a |an |new |whole )?(new |several )?(area|field|direction|research agenda)/i, dimensions: ['creativity'] },
  { pattern: /\bgenerative (framework|concept|theory|piece)/i, dimensions: ['creativity'] },
  { pattern: /\bparadigm[-\s]?(shift|shifting|changing)\b/i, dimensions: ['creativity'] },
  { pattern: /\bfield[-\s]?defining\b/i, dimensions: ['creativity'] },
  { pattern: /\b(major|significant|important|substantive) contribution\b/i, dimensions: ['creativity'] },
  { pattern: /\b(elegant|beautiful|striking) (result|proof|argument|finding|theory)/i, dimensions: ['creativity'] },
  { pattern: /\bambitious (scope|project|agenda|paper|work)/i, dimensions: ['creativity'] },
  { pattern: /\bbreaks new ground\b/i, dimensions: ['creativity'] },
  { pattern: /\bcounter[-\s]?intuitive (finding|result)/i, dimensions: ['creativity'] },
  { pattern: /\b(important|critical|foundational) (read|reading)\b/i, dimensions: ['creativity'] },
];

const PRAISE_CONNECTIVITY: TaggedPattern[] = [
  { pattern: /\b(thorough|extensive|comprehensive|excellent|impressive) (literature review|engagement with (the )?literature)/i, dimensions: ['connectivity'] },
  { pattern: /\b(carefully|thoughtfully) situates? (itself )?(within|in) (the |a )?(literature|tradition|debate|conversation)/i, dimensions: ['connectivity'] },
  { pattern: /\bbridges? (the )?(disciplines?|fields?|literatures?)\b/i, dimensions: ['connectivity'] },
  { pattern: /\binterdisciplinary (in (the )?best|done (right|well))/i, dimensions: ['connectivity'] },
  { pattern: /\bin (direct |genuine )?conversation with\b/i, dimensions: ['connectivity'] },
  { pattern: /\bbuilds on .{0,30}\b(elegantly|beautifully|carefully|productively)/i, dimensions: ['connectivity'] },
  { pattern: /\bsynthes(is|izes|izing) (across|of)/i, dimensions: ['connectivity', 'creativity'] },
  { pattern: /\bdraws (productively )?on\b/i, dimensions: ['connectivity'] },
];

const PRAISE_CARE: TaggedPattern[] = [
  { pattern: /\b(careful|thoughtful|exemplary) (ethics|ethical) (engagement|consideration|review|practice)/i, dimensions: ['care'] },
  { pattern: /\b(genuine|deep|sustained) community engagement\b/i, dimensions: ['care'] },
  { pattern: /\bcommunity[-\s]?based participatory\b/i, dimensions: ['care'] },
  { pattern: /\b(centers?|centered) (the )?(voices?|community|subjects?|participants)\b/i, dimensions: ['care'] },
  { pattern: /\b(meaningful|substantive|genuine) co[-\s]?authorship\b/i, dimensions: ['care'] },
  { pattern: /\bdata sovereignty (respected|honored|prioritized)/i, dimensions: ['care'] },
  { pattern: /\b(strong|robust|exemplary) (IRB|ethics) (process|protocol)/i, dimensions: ['care'] },
  { pattern: /\bcareful about (the )?(power|positionality|representation)/i, dimensions: ['care'] },
  { pattern: /\b(transparent|honest|forthright) about (limitations|conflicts|funding)/i, dimensions: ['care', 'clarity'] },
];

const PRAISE_TONE: TaggedPattern[] = [
  { pattern: /\bbest paper I'?ve (read|seen) (this|in)\b/i, dimensions: ['creativity'] },
  { pattern: /\bgoing (to|on) (the |my )?syllabus\b/i, dimensions: ['creativity', 'connectivity'] },
  { pattern: /\bI(?:'|wi)ll be (citing|teaching|assigning)\b/i, dimensions: ['creativity', 'connectivity'] },
  { pattern: /\bmust[-\s]?read\b/i, dimensions: ['creativity'] },
  { pattern: /\binstant classic\b/i, dimensions: ['creativity'] },
  { pattern: /\bchanges? (the way )?I think about\b/i, dimensions: ['creativity'] },
  { pattern: /\b(definitive|landmark|seminal) (paper|study|work|piece)/i, dimensions: ['creativity'] },
];

const PRAISE_MULTI: TaggedPattern[] = [
  { pattern: /\bbien diseñad/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bestudio riguroso\b/i, dimensions: ['credibility'], lang: 'es' },
  { pattern: /\bcontribución (importante|significativa)\b/i, dimensions: ['creativity'], lang: 'es' },
  { pattern: /\blectura (obligatoria|imprescindible)\b/i, dimensions: ['creativity'], lang: 'es' },
  { pattern: /\bbem desenhad/i, dimensions: ['credibility'], lang: 'pt' },
  { pattern: /\bestudo rigoroso\b/i, dimensions: ['credibility'], lang: 'pt' },
  { pattern: /\bcontribuição (importante|significativa)\b/i, dimensions: ['creativity'], lang: 'pt' },
  { pattern: /\bbien conçu/i, dimensions: ['credibility'], lang: 'fr' },
  { pattern: /\bétude rigoureuse\b/i, dimensions: ['credibility'], lang: 'fr' },
  { pattern: /\bcontribution (importante|majeure)\b/i, dimensions: ['creativity'], lang: 'fr' },
  { pattern: /\bsorgfältig (durchgeführt|konzipiert)\b/i, dimensions: ['credibility'], lang: 'de' },
  { pattern: /\bwichtiger Beitrag\b/i, dimensions: ['creativity'], lang: 'de' },
  { pattern: /\bben (progettato|condotto)\b/i, dimensions: ['credibility'], lang: 'it' },
  { pattern: /\bcontributo (importante|significativo)\b/i, dimensions: ['creativity'], lang: 'it' },
  { pattern: /厳密な研究/, dimensions: ['credibility'], lang: 'ja' },
  { pattern: /重要な貢献/, dimensions: ['creativity'], lang: 'ja' },
  { pattern: /严谨的研究/, dimensions: ['credibility'], lang: 'zh' },
  { pattern: /重要(的)?贡献/, dimensions: ['creativity'], lang: 'zh' },
];

export const PRAISE_PATTERNS: TaggedPattern[] = [
  ...PRAISE_CREDIBILITY, ...PRAISE_CLARITY, ...PRAISE_CREATIVITY,
  ...PRAISE_CONNECTIVITY, ...PRAISE_CARE, ...PRAISE_TONE, ...PRAISE_MULTI,
];

// =====================================================================
// INQUIRY PATTERNS — substantive open questions, neutral uncertainty,
// and meta-discussion about how to critique research online.
// =====================================================================

// ---- Open questions about a specific research finding/method ----
const INQ_OPEN_Q: TaggedPattern[] = [
  { pattern: /\bdoes this hold (for|in|across|when)\b/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\b(would|will|does) this generaliz\w+/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bwhat was the (attrition|dropout|response) rate/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bhow do they handle\b.{0,40}\?/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\b(curious|wondering) (how|whether|if|about) (?:the|this|they)/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bdid (they|the authors) (control|account|adjust|test|check) for\b/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bhow (does|did) (the|this).{0,30}(IV|instrument|identification|design)/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bexclusion restriction\b.{0,40}\?/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bhow .{0,40}(operationaliz|measure|define)/i, dimensions: ['clarity'], inquiryType: 'open_question' },
  { pattern: /\bwhat (do|does) .{0,30}\bmean (by|here)\b/i, dimensions: ['clarity'], inquiryType: 'open_question' },
  { pattern: /\bhow is .{0,40} different from\b/i, dimensions: ['creativity', 'connectivity'], inquiryType: 'open_question' },
  { pattern: /\b(any thoughts|thoughts\?|takes\?)\s*$/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bhas anyone (looked|tried|tested|replicated|seen)\b/i, dimensions: ['credibility', 'connectivity'], inquiryType: 'open_question' },
  { pattern: /\bwhat (would|should) (we|one|a reader) make of\b/i, dimensions: ['clarity'], inquiryType: 'open_question' },
  { pattern: /\bgenuine question\b/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bhonest question\b/i, dimensions: ['credibility'], inquiryType: 'open_question' },
  { pattern: /\bcan someone (with more|familiar|who knows) .{0,40}(explain|clarify|help|comment)/i, dimensions: ['clarity'], inquiryType: 'open_question' },
  { pattern: /\bhow does this (relate|compare|connect|interact) (to|with)\b/i, dimensions: ['connectivity'], inquiryType: 'open_question' },
  { pattern: /\bis there (prior |earlier |existing )?(work|literature) on\b.{0,40}\?/i, dimensions: ['connectivity'], inquiryType: 'open_question' },
  { pattern: /\bI'?m trying to understand\b/i, dimensions: ['clarity'], inquiryType: 'open_question' },
];

// ---- Neutral uncertainty: acknowledging epistemic ambiguity ----
const INQ_NEUTRAL: TaggedPattern[] = [
  { pattern: /\bhard to (know|tell|say|judge) (what to make|whether|if|how|the import)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bI'?m genuinely (unsure|uncertain|undecided|of two minds|torn)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(jury|verdict) (is )?(still |still's )?out\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bcan see (it|this) (both ways|either way)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(on the )?one hand .{0,80}(on the )?other hand/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bnot (yet )?(sure|clear) (what to|how to|whether) (think|conclude|interpret)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(genuinely|honestly) (puzzled|unsure|confused) (by|about)\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bopen empirical question\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bstill an open (question|problem|issue)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(more |further )(work|research|study|evidence) (is )?needed\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(too|still) early to (tell|say|judge)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(real|genuine) tension between\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bthe evidence (is mixed|cuts both ways|points in different directions)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(neither dismiss|not dismissing|not endorsing) (but|and)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\b(plausible|reasonable) but (?:not |un)(?:proven|confirmed|settled)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bsuspending judgment\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
  { pattern: /\bwithhold(ing)? judgment\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty' },
];

// ---- Meta-critique: how to critique research online, ethically/respectfully ----
const INQ_META: TaggedPattern[] = [
  { pattern: /\b(charitable|good[-\s]?faith) (reading|interpretation|critique|engagement)\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bRapoport'?s rules?\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(steel[-\s]?man\w*|steelmann\w*)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(public|online|social media) (pile[-\s]?on|piling on|shaming|dogpile)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bpost[-\s]?publication (review|peer review|critique)\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bhow (we|should we|to) (critique|review|engage with) (a |the |research|papers|preprints)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(norms? for|norms? around|ethics of|ethics around) (critique|criticism|peer review|public engagement|science communication)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(citation|epistemic) (justice|equity)\b/i, dimensions: ['care', 'connectivity'], inquiryType: 'meta_critique' },
  { pattern: /\b(scicomm|science communication) (norms?|ethics|responsibilit)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(boundary work|demarcation problem)\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(dunking on|punching down|tone policing) (papers?|authors?|researchers?|grad students?|junior)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bjunior (scholar|researcher|author|faculty) .{0,40}(critique|criticism|review)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(power|status) (asymmetr|differential|imbalance) (in|when) (critiqu|review|debate)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bquoteet?-?dunk\w*/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bbad[-\s]?faith (critique|reading|engagement)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(slow|fast) (science|scholarship)\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bopen (peer )?review (norms|practices|ethics)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bregister(ed)? report\b/i, dimensions: ['care', 'credibility'], inquiryType: 'meta_critique' },
  { pattern: /\bpre[-\s]?registration (culture|norms|practice|movement)/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(meta|second)[-\s]?(science|research)\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bcredit (assignment|attribution|culture) in (science|research|academia)/i, dimensions: ['care', 'connectivity'], inquiryType: 'meta_critique' },
  { pattern: /\bdiscipliniz\w+ critique\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\b(respectful|generous|constructive) critique\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
  { pattern: /\bhermeneutic of (charity|generosity|suspicion)\b/i, dimensions: ['care'], inquiryType: 'meta_critique' },
];

// ---- Multilingual inquiry ----
const INQ_MULTI: TaggedPattern[] = [
  // Spanish
  { pattern: /\b¿(cómo|por qué|qué|cuándo|si)\b.{0,80}\?/i, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'es' },
  { pattern: /\bpregunta (genuina|honesta|sincera)\b/i, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'es' },
  { pattern: /\bdifícil saber\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'es' },
  // Portuguese
  { pattern: /\bpergunta (genuína|honesta|sincera)\b/i, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'pt' },
  { pattern: /\bdifícil (saber|dizer)\b/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'pt' },
  // French
  { pattern: /\b(question (sincère|honnête))\b/i, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'fr' },
  { pattern: /\bdifficile (à |de )(savoir|dire|juger)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'fr' },
  // German
  { pattern: /\b(ehrliche|aufrichtige) Frage\b/i, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'de' },
  { pattern: /\bschwer (zu |einzu)?(sagen|beurteilen)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'de' },
  // Italian
  { pattern: /\bdomanda (sincera|onesta|genuina)\b/i, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'it' },
  { pattern: /\bdifficile (da )?(dire|giudicare)/i, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'it' },
  // Japanese
  { pattern: /素朴な疑問/, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'ja' },
  { pattern: /判断が難しい/, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'ja' },
  // Chinese
  { pattern: /真诚的问题/, dimensions: ['credibility'], inquiryType: 'open_question', lang: 'zh' },
  { pattern: /(难以|很难)(判断|断定)/, dimensions: ['credibility'], inquiryType: 'neutral_uncertainty', lang: 'zh' },
];

export const INQUIRY_PATTERNS: TaggedPattern[] = [
  ...INQ_OPEN_Q, ...INQ_NEUTRAL, ...INQ_META, ...INQ_MULTI,
];

// Weak praise — vague compliments, hint only
export const WEAK_PRAISE_HINT =
  /\b(great|amazing|fantastic|excellent|brilliant|wonderful|love this|loved this|so good|incredible|outstanding|stunning|impressive|nice|cool|fascinating|gem|treasure|terrific|superb|magnificent|importante|excelente|maravillos|magnifique|excellent|toll|großartig|fantastico|eccellente|素晴らしい|很棒|出色)\b/i;

// Weak inquiry hint — questions or hedging on their own.
// Used only to decide whether to spend an LLM call on a research-adjacent post.
export const WEAK_INQUIRY_HINT =
  /\?|\b(curious|wonder|wondering|unsure|uncertain|not sure|might|maybe|perhaps|appears|seems|suggests|could be|hesitant|hesitate|on the fence|undecided|open question)\b/i;

export const ALL_DIMENSIONS: Dimension[] = [
  'credibility', 'clarity', 'creativity', 'connectivity', 'care',
];

export const ALL_INQUIRY_TYPES: InquiryType[] = [
  'open_question', 'neutral_uncertainty', 'meta_critique',
];
