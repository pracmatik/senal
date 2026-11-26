// Fuentes y consultas. Todas gratuitas y sin clave.
export const TOPICS = {
  sfn: {
    pubmed: '("small fiber neuropathy"[tiab] OR "small fibre neuropathy"[tiab] OR "small fiber polyneuropathy"[tiab] OR "small-fiber neuropathy"[tiab] OR "small fibre polyneuropathy"[tiab] OR "intraepidermal nerve fiber density"[tiab])',
    europepmc: '("small fiber neuropathy" OR "small fibre neuropathy" OR "small fiber polyneuropathy") AND SRC:PPR',
    mx: 'small fiber neuropathy',
    trials: 'small fiber neuropathy',
  },
  dolor: {
    pubmed: '"neuropathic pain"[tiab] AND (suzetrigine[tiab] OR "Nav1.8"[tiab] OR "Nav1.7"[tiab] OR randomized[tiab] OR "phase 2"[tiab] OR "phase 3"[tiab] OR "novel"[ti] OR "new treatment"[tiab] OR "gene therapy"[tiab])',
    europepmc: '("neuropathic pain") AND (suzetrigine OR "Nav1.8" OR "Nav1.7" OR "gene therapy") AND SRC:PPR',
    mx: 'neuropathic pain',
    trials: 'neuropathic pain',
  },
  ips: {
    pubmed: '("induced pluripotent stem"[tiab] OR "iPS cells"[tiab] OR "iPSC-derived"[tiab] OR "Yamanaka factors"[tiab] OR "partial reprogramming"[tiab] OR OSKM[tiab]) AND (neuron*[tiab] OR nerve[tiab] OR brain[tiab] OR "spinal cord"[tiab] OR transplantation[tiab] OR "clinical trial"[tiab] OR rejuvenation[tiab])',
    europepmc: '("partial reprogramming" OR "Yamanaka factors" OR OSKM) AND SRC:PPR',
    mx: 'iPS cells',
  },
  neuro: {
    pubmed: '(Alzheimer*[ti] OR Parkinson*[ti] OR "amyotrophic lateral sclerosis"[ti] OR "multiple sclerosis"[ti] OR "spinal cord injury"[ti] OR "peripheral neuropathy"[ti] OR "nerve regeneration"[ti] OR "brain-computer interface"[ti]) AND (randomized controlled trial[pt] OR "phase 3"[tiab] OR "phase III"[tiab] OR "first-in-human"[tiab])',
    mx: 'nerve regeneration',
    rss: ['https://www.sciencedaily.com/rss/mind_brain/neuroscience.xml'],
  },
  otros: {
    rss: ['https://www.sciencedaily.com/rss/health_medicine.xml', 'https://medicalxpress.com/rss-feed/'],
  },
};

// Máximo de noticias nuevas por tema y día (primer arranque: más, para que la web no nazca vacía)
export const CAPS = { sfn: 8, dolor: 8, ips: 6, neuro: 8, otros: 6, trials: 6 };
export const CAPS_BACKFILL = { sfn: 14, dolor: 12, ips: 10, neuro: 12, otros: 8, trials: 10 };
