// All site copy lives here so the team can edit words without touching layout.
// This repo is public: keep to the clinical problem, the mission and the team.

export const site = {
  name: 'Senara Medical',
  location: 'Melbourne, Australia',
  // TODO(team): create the hello@ mailbox (or alias) in Google Workspace, and confirm the LinkedIn URL.
  email: 'hello@senaramed.com',
  linkedin: 'https://www.linkedin.com/company/senara-medical',
}

export const nav = [
  { id: 'ethos', label: 'Ethos' },
  { id: 'mission', label: 'Mission' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
]

export const hero = {
  headline: ['Measuring oxygen in', 'the unborn brain.'],
  sub: 'Senara Medical builds monitoring tools that help clinicians decide when a high-risk pregnancy must end, and when it can safely continue.',
}

export const ethos = {
  heading: 'Deliver now, or wait.',
  paragraphs: [
    'When a baby is not getting enough oxygen late in pregnancy, the clinician faces one critical decision. Deliver too early, and the baby faces prematurity and weeks in intensive care. Wait too long, and the risk is cerebral palsy, developmental delay or, in the most serious cases, stillbirth.',
    'Fetal monitoring has not meaningfully changed in forty years. Heart-rate tracing reads a surrogate, with a false-positive rate high enough that emergency caesareans are performed on healthy babies. Doppler ultrasound reads flow in a single vessel and needs a trained sonographer. Reduced movement is noticed only once hypoxia is already chronic.',
  ],
  quote: {
    text: 'The current tools for monitoring fetal hypoxia are appalling.',
    attribution: 'Maternal-fetal medicine specialist, Melbourne',
  },
  closing:
    'None of them measure the one thing that actually matters: how much oxygen is reaching the baby’s brain.',
}

export const mission = {
  heading: 'Measure what matters.',
  lede: 'Senara Medical exists to give obstetricians a direct, real-time measure of fetal brain oxygenation, so that a delivery decision rests on the baby’s brain rather than on a proxy for it.',
  stats: [
    { value: '1 in 300', label: 'pregnancies affected by fetal hypoxia', note: 1 },
    { value: '23%', label: 'of those babies suffer irreversible neurological damage or are stillborn', note: 1 },
    { value: '11 million', label: 'high-risk pregnancies each year, of 132 million births', note: 2 },
    { value: 'A$6.5 billion', label: 'annual cost of cerebral palsy in Australia; about one tenth is attributable to perinatal hypoxia', note: 3 },
  ],
  now: 'We are validating technical, clinical and commercial feasibility with maternal-fetal medicine, obstetric, midwifery and neonatal clinicians in Melbourne and internationally.',
  valuesHeading: 'What guides us',
  values: [
    { name: 'People first', gloss: 'Patients, clinicians and each other. We design with empathy and listen before we build.' },
    { name: 'Growth mindset', gloss: 'Curiosity, critical thinking and continuous improvement, including of our own work.' },
    { name: 'Integrity', gloss: 'Patient safety, truth and quality in every decision, and candour about hard truths.' },
    { name: 'Impact', gloss: 'A real-world outcome, implemented in real clinical settings, at scale.' },
    { name: 'Innovation', gloss: 'We don’t sit still. We challenge our ideas and take the lead.' },
  ],
}

export const team = {
  heading: 'This is us.',
  intro:
    'Six people from the University of Melbourne’s BioDesign Innovation program: three biomedical engineers and three MBAs, spanning medical device R&D, clinical practice, commercial law and new-product introduction.',
  members: [
    {
      name: 'Nick Wenzel',
      line: 'Clinical design engineer, Chris O’Brien Lifehouse. Led automated virtual surgical planning software for craniomaxillofacial reconstruction.',
    },
    {
      name: 'Orr Zaacks',
      line: 'Scientist and quality assistant, Rhythm Biosciences. R&D and commercialisation of a colorectal cancer triage test.',
    },
    {
      name: 'Kai Heinemann',
      line: 'Biomedical engineer, Ventora Medical. Software, clinical data analysis and benchtop R&D.',
    },
    {
      name: 'Ryan Bilalis',
      line: 'New product introduction lead in point-of-care devices. Concept through to ISO 13485-accredited product.',
    },
    {
      name: 'Jac Simpkin',
      line: 'Solicitor and former General Counsel, Archies Footwear. Technology commercialisation, intellectual property and regulatory.',
    },
    {
      name: 'Jerry Wang',
      line: 'Clinical physiotherapist. Patient care, clinical mentoring and operational management.',
    },
  ],
}

export const contact = {
  heading: 'Talk to us.',
  text: 'We welcome conversations with clinicians, researchers, and partners who share the goal of better outcomes for mothers and babies.',
}

export const footer = {
  acknowledgement:
    'Senara Medical acknowledges the Wurundjeri Woi-wurrung people of the Kulin Nation, Traditional Owners of the land on which we work in Naarm (Melbourne), and pays respect to Elders past and present.',
  // TODO(team): replace with full references. These are the figures used in the
  // Endeavour pitch; the underlying citations need to be confirmed before launch.
  sources: [
    { n: 1, text: 'Incidence and outcome figures as presented in Senara Medical pitch materials, 2026. Reference to be confirmed.' },
    { n: 2, text: 'Global births and high-risk pregnancy estimate as presented in Senara Medical pitch materials, 2026. Reference to be confirmed.' },
    { n: 3, text: 'Economic burden of cerebral palsy in Australia and share attributable to perinatal hypoxia, as presented in Senara Medical pitch materials, 2026. Reference to be confirmed.' },
  ],
}
