// All site copy lives here so the team can edit words without touching layout.
// This repo is public: keep to the clinical problem, the mission and the team.

export const site = {
  name: 'Senara Medical',
  location: 'Melbourne, Australia',
  // TODO(team): create the hello@ mailbox (or alias) in Google Workspace.
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
  sub: 'Senara Medical builds monitoring tools that help clinicians know how long a high-risk pregnancy can safely continue, and when it’s time to deliver.',
}

export const ethos = {
  heading: 'Deliver now, or wait.',
  paragraphs: [
    'When there are concerns about a baby’s oxygen supply during pregnancy, clinicians face one of the hardest calls in medicine: how long can the pregnancy safely continue?',
    'Deliver too early, and a baby faces the risks of prematurity and long stays in neonatal intensive care. Deliver too late, and oxygen deprivation can cause irreversible brain injury, lifelong disability or stillbirth.',
    'Today, these decisions rest on indirect markers. Current monitoring tools have high false-positive rates, which can lead to unnecessary caesareans, and their sensitivity is limited late in pregnancy, when delivery decisions matter most.',
  ],
  quote: {
    text: 'The current tools for monitoring fetal hypoxia are appalling.',
    attribution: 'Maternal-fetal medicine specialist, Melbourne',
  },
  closing:
    'No existing tool measures the one thing that actually matters: how much oxygen is reaching the baby’s brain.',
}

export const mission = {
  heading: 'Measure what matters.',
  lede: 'Senara Medical exists to give obstetricians the first direct, real-time measure of fetal brain oxygenation, so that a delivery decision rests on the baby’s brain rather than on a proxy for it. Designed to fit into routine antenatal care, it lets clinicians measure what matters most and time delivery with confidence.',
  // Every figure must match its entry in footer.sources (note = source number).
  stats: [
    { value: '3 in 1,000', label: 'babies are born with neonatal encephalopathy, a disorder of brain function; in half, the cause is hypoxic-ischaemic injury', note: 1 },
    { value: '45%', label: 'of babies with encephalopathy from events around birth die or survive with moderate-to-severe impairment, worldwide', note: 2 },
    { value: '1.9 million', label: 'babies are stillborn each year worldwide, one every 17 seconds', note: 3 },
    { value: 'A$5.17 billion', label: 'cost of cerebral palsy in Australia in a single year, in financial costs and lost wellbeing', note: 4 },
  ],
  now: 'Better-informed delivery decisions could mean fewer preventable stillbirths, fewer brain injuries and fewer unnecessary preterm deliveries. Across a population, that also means real savings for health systems, in neonatal intensive care and in long-term disability care.',
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
    'We are a team of six from the University of Melbourne’s BioDesign Innovation program, with backgrounds in engineering, clinical practice, law and commercialisation. We are working with leading maternal-fetal medicine clinicians in Melbourne and around the world to validate our approach.',
  // Ordered by surname. Degree + one line of strengths each (from Team Overview
  // & Mission). No employers, job titles or past projects.
  members: [
    { name: 'Ryan Bilalis', degree: 'Master of Business Administration', line: 'New product introduction, manufacturing and medical device regulation.' },
    { name: 'Kai Heinemann', degree: 'Master of Biomedical Engineering', line: 'Software and data analysis, CAD prototyping and benchtop verification.' },
    { name: 'Jac Simpkin', degree: 'Master of Business Administration', line: 'Intellectual property, commercial agreements and regulatory compliance.' },
    { name: 'Jerry Wang', degree: 'Master of Business Administration', line: 'Clinical practice, the Australian health system and reimbursement.' },
    { name: 'Nick Wenzel', degree: 'Master of Biomedical Engineering', line: 'Software and data analysis, user interface design and clinical integration.' },
    { name: 'Orr Zaacks', degree: 'Master of Biomedical Engineering', line: 'Physiology and pathology, laboratory R&D and quality systems.' },
  ],
}

export const contact = {
  heading: 'Talk to us.',
  text: 'If you’re a clinician, researcher, investor or parent who cares about safer pregnancies, we’d love to hear from you.',
}

export const footer = {
  acknowledgement:
    'Senara Medical acknowledges the Wurundjeri Woi-wurrung people of the Kulin Nation, Traditional Owners of the land on which we work in Naarm (Melbourne), and pays respect to Elders past and present.',
  // Checked against the primary source, October 2026.
  sources: [
    {
      n: 1,
      text: 'Kurinczuk JJ, White-Koning M, Badawi N. Epidemiology of neonatal encephalopathy and hypoxic-ischaemic encephalopathy. Early Human Development 2010;86(6):329–38. Neonatal encephalopathy 3.0 and hypoxic-ischaemic encephalopathy 1.5 per 1,000 live births.',
      url: 'https://doi.org/10.1016/j.earlhumdev.2010.05.010',
    },
    {
      n: 2,
      text: 'Lee ACC, Kozuki N, Blencowe H, et al. Intrapartum-related neonatal encephalopathy incidence and impairment at regional and global levels for 2010 with trends from 1990. Pediatric Research 2013;74(Suppl 1):50–72. Of 1.15 million cases, 287,000 died and 233,000 survived with moderate or severe impairment.',
      url: 'https://doi.org/10.1038/pr.2013.206',
    },
    {
      n: 3,
      text: 'UN Inter-agency Group for Child Mortality Estimation. Standing Up for Stillbirth: Current estimates and key interventions. UNICEF, 2025. Estimates for 2023, at 28 weeks’ gestation or later.',
      url: 'https://data.unicef.org/resources/standing-up-for-stillbirth-report/',
    },
    {
      n: 4,
      text: 'Deloitte Access Economics. The cost of cerebral palsy in Australia in 2018. Cerebral Palsy Australia, Cerebral Palsy Alliance and AusACPDM, December 2019. A$3.03 billion financial costs plus A$2.15 billion lost wellbeing.',
      url: 'https://cerebralpalsystrategy.com.au/wp-content/uploads/2020/02/DAE_Cost-of-cerebral-palsy-in-2018_FINAL.pdf',
    },
  ],
}
