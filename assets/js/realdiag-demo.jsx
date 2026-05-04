const { useState, useRef } = React;

// Lightweight shim for framer-motion: render the underlying HTML tag and drop motion-only props.
const _motionProps = ['initial','animate','exit','transition','whileHover','whileTap','whileInView','variants','layout','layoutId','drag','dragConstraints','viewport'];
const motion = new Proxy({}, {
  get: (_t, tag) => React.forwardRef((props, ref) => {
    const clean = {};
    for (const k in props) if (!_motionProps.includes(k)) clean[k] = props[k];
    return React.createElement(tag, { ...clean, ref });
  })
});
const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children);

// Lightweight shim for lucide-react icons: tiny inline SVGs by name (decorative only).
const _icon = (paths) => ({ size = 18, className = '', ...rest }) =>
  React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, ...rest
  }, paths.map((d, i) => React.createElement('path', { key: i, d })));
const Stethoscope   = _icon(['M4 3v6a4 4 0 0 0 8 0V3','M8 13v3a5 5 0 0 0 10 0v-2','M18 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z']);
const Brain         = _icon(['M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3 3 3 0 0 0 1 2.2A3 3 0 0 0 6 18a3 3 0 0 0 3 3V3z','M15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3 3 3 0 0 1-1 2.2A3 3 0 0 1 18 18a3 3 0 0 1-3 3V3z']);
const AlertTriangle = _icon(['M12 3l10 18H2L12 3z','M12 10v5','M12 18h.01']);
const FileText      = _icon(['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z','M14 3v6h6','M8 13h8','M8 17h8','M8 9h2']);
const Activity      = _icon(['M22 12h-4l-3 9-6-18-3 9H2']);
const Play          = _icon(['M6 4l14 8-14 8V4z']);

const cases = [
  {
    id: 'Case 0',
    patient: '24M',
    concern: 'First seizure episode',
    symptoms: ['Loss of consciousness', 'Generalized shaking', 'Postictal confusion', 'Tongue biting'],
    history: ['No prior seizure history', 'Recent sleep deprivation'],
    differential: [
      { dx: 'New-onset generalized seizure disorder', prob: 58 },
      { dx: 'Provoked seizure (sleep deprivation)', prob: 19 },
      { dx: 'Brain lesion / tumor', prob: 11 },
      { dx: 'Syncope with convulsive activity', prob: 7 },
      { dx: 'Metabolic abnormality', prob: 5 }
    ],
    workup: [
      'CBC + CMP + toxicology screen',
      'MRI brain',
      'EEG within 24–48 hours',
      'Review medication/substance triggers'
    ],
    referral: ['Neurology — urgent follow-up', 'Emergency Medicine if unstable'],
    redFlags: [
      'Persistent altered mental status',
      'Focal neurological deficits',
      'Repeated seizures without recovery'
    ]
  },
  {
    id: 'Case 1',
    patient: '56F',
    concern: 'Headache + vision changes',
    symptoms: ['Headache', 'Vision changes', 'Nausea', 'Photophobia'],
    history: ['Migraine', 'Hypertension'],
    differential: [
      { dx: 'Migraine (without aura)', prob: 72 },
      { dx: 'Giant Cell Arteritis', prob: 18 },
      { dx: 'Intracranial Mass', prob: 6 }
    ],
    workup: ['ESR/CRP', 'MRI Brain', 'Temporal artery biopsy if indicated'],
    referral: ['Neurology', 'Rheumatology', 'Ophthalmology']
  },
  {
    id: 'Case 2',
    patient: '42M',
    concern: 'Chest pain + shortness of breath',
    symptoms: ['Chest pain', 'Dyspnea', 'Sweating'],
    history: ['Hyperlipidemia'],
    differential: [
      { dx: 'Acute Coronary Syndrome', prob: 61 },
      { dx: 'Pulmonary Embolism', prob: 21 },
      { dx: 'GERD', prob: 8 }
    ],
    workup: ['EKG', 'Troponin', 'CT angiography if indicated'],
    referral: ['Cardiology', 'Emergency Medicine']
  }
];

function Card({children}) {
  return <div className='bg-white rounded-3xl shadow-lg border border-slate-200 p-5'>{children}</div>
}

const narrationSteps = [
  'Welcome to RealDiag. This demo shows how clinicians move from diagnostic uncertainty to structured action in minutes.',
  'Our featured patient is a twenty four year old male presenting with a first seizure episode and no prior seizure history.',
  'RealDiag captures structured symptoms, history, and risk factors before generating a ranked differential diagnosis.',
  'The platform automatically triggers a first seizure protocol including imaging, EEG timing, and lab recommendations.',
  'RealDiag also flags high-risk escalation criteria and recommends appropriate specialty referral pathways.',
  'The result is faster diagnosis, fewer delays, and lower health system costs.'
];

// Pick the most natural-sounding English voice available in the browser.
// Prefers neural / online voices (Google, Microsoft Natural, Apple premium) over
// the default robotic eSpeak fallback found on many Linux/Chromium systems.
let _cachedVoice = null;
function pickBestVoice(){
  if(_cachedVoice) return _cachedVoice;
  if(typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if(!voices.length) return null;

  const en = voices.filter(v => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : voices;

  // Ranked patterns — higher score = more natural sounding.
  const ranked = [
    /Google US English/i,
    /Google UK English Female/i,
    /Microsoft .*(Aria|Jenny|Guy|Sonia|Ryan|Natasha|Libby|Emma).*Online \(Natural\)/i,
    /Microsoft .*(Aria|Jenny|Guy|Sonia|Ryan).*Online/i,
    /Microsoft .*(Aria|Jenny|Guy)/i,
    /(Samantha|Ava|Allison|Susan|Karen|Serena|Moira|Tessa|Daniel) \(Premium\)/i,
    /(Samantha|Ava|Allison|Susan|Karen|Serena|Moira|Tessa|Daniel) \(Enhanced\)/i,
    /Samantha|Ava|Allison|Susan|Karen|Serena|Moira|Tessa|Daniel/i,
    /Google/i,
    /Microsoft/i,
    /Natural|Neural|Premium|Enhanced/i
  ];

  for(const rx of ranked){
    const hit = pool.find(v => rx.test(v.name));
    if(hit){ _cachedVoice = hit; return hit; }
  }
  // Avoid eSpeak / default robotic voice if anything else is available.
  const nonEspeak = pool.find(v => !/espeak/i.test(v.name));
  _cachedVoice = nonEspeak || pool[0];
  return _cachedVoice;
}

if(typeof window !== 'undefined' && 'speechSynthesis' in window){
  // Voice list often loads asynchronously; refresh cache when it arrives.
  window.speechSynthesis.onvoiceschanged = () => { _cachedVoice = null; pickBestVoice(); };
  pickBestVoice();
}

// Estimate how long it would take to read `text` if speech synthesis isn't
// available (used as a fallback so the tour still advances at a sensible pace).
function estimateSpeechMs(text){
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  // ~150 wpm at rate 0.95 ≈ 400ms/word, plus a small buffer.
  return Math.max(2500, words * 400 + 600);
}

function speak(text, enabled=true, onEnd){
  // Doubled consonant after the vowel signals a short "a" (as in "bag"),
  // which keeps the second syllable from being reduced to "egg".
  let spoken = (text || '').replace(/RealDiag/g, 'Real Dyagg');
  // Force letter-by-letter pronunciation for medical acronyms that TTS
  // engines try to read as words.
  spoken = spoken.replace(/\bEEG\b/g, 'E E G');
  spoken = spoken.replace(/\bEKG\b/g, 'E K G');
  spoken = spoken.replace(/\bEHR\b/g, 'E H R');
  // Pronounce SNOMED as "snow-med" rather than "snommed".
  spoken = spoken.replace(/\bSNOMED\b/gi, 'snow med');
  const fireEnd = () => { if(typeof onEnd === 'function') onEnd(); };

  if(!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)){
    // No audio — still call back after an estimated read time so the tour advances.
    setTimeout(fireEnd, estimateSpeechMs(spoken));
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spoken);
  const voice = pickBestVoice();
  if(voice){
    utterance.voice = voice;
    utterance.lang = voice.lang || 'en-US';
  } else {
    utterance.lang = 'en-US';
  }
  // Slightly slower + slightly lower pitch reads as more conversational.
  utterance.rate = 0.95;
  utterance.pitch = 0.95;
  utterance.volume = 1;

  let fired = false;
  const safeFire = () => { if(!fired){ fired = true; fireEnd(); } };
  utterance.onend = safeFire;
  utterance.onerror = safeFire;

  // Fallback timer: if the engine never fires onend (Chromium quirk on long
  // utterances), advance after the estimated duration plus a safety margin.
  const fallback = setTimeout(safeFire, estimateSpeechMs(spoken) + 4000);
  const wrappedEnd = utterance.onend;
  utterance.onend = () => { clearTimeout(fallback); wrappedEnd(); };

  window.speechSynthesis.speak(utterance);
}

function CinematicScene({ kind, sceneIndex }){
  if(!kind) return null;
  const wrapKey = `scene-${sceneIndex}-${kind}`;
  const wrap = (children) => (
    <div key={wrapKey} className='absolute inset-0 flex items-center justify-center p-8 rd-fade'>
      {children}
    </div>
  );

  if(kind === 'opening'){
    return wrap(
      <div className='text-center'>
        <div className='inline-flex px-4 py-2 rounded-full bg-teal-500/20 text-teal-200 text-sm font-medium mb-6'>RealDiag Product Film</div>
        <div className='text-4xl md:text-6xl font-bold leading-tight text-white'>From diagnostic uncertainty<br/><span className='text-teal-300'>to structured action.</span></div>
        <div className='text-slate-300 mt-6 text-lg'>In minutes — not days.</div>
      </div>
    );
  }

  if(kind === 'validation'){
    const stats = [
      { label: 'Diagnoses', value: '400+' },
      { label: 'Validation Scenarios', value: '100+' },
      { label: 'Specialties', value: 'Multi' },
      { label: 'Validation Model', value: 'IRB Ready' }
    ];
    return wrap(
      <div className='w-full max-w-4xl'>
        <div className='text-center text-2xl font-semibold mb-8 text-teal-200'>Clinical Validation</div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {stats.map((s, i) => (
            <div key={s.label}
                 className='bg-white/5 border border-teal-500/30 rounded-2xl p-6 text-center rd-slide'
                 style={{ animationDelay: `${i*150}ms` }}>
              <div className='text-3xl md:text-4xl font-bold text-white'>{s.value}</div>
              <div className='text-sm text-slate-300 mt-2'>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if(kind === 'workflow'){
    const steps = ['Open Chart','Review Note','Launch RealDiag','Analyze','Order Tests','Close Visit'];
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-8 text-teal-200'>Embedded Physician Workflow</div>
        <div className='flex items-center justify-between flex-wrap gap-2'>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className='flex flex-col items-center rd-slide' style={{ animationDelay: `${i*200}ms` }}>
                <div className='w-12 h-12 md:w-14 md:h-14 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center font-bold text-teal-200'>{i+1}</div>
                <div className='text-xs mt-2 text-slate-200 max-w-[80px] text-center'>{s}</div>
              </div>
              {i < steps.length-1 && (
                <div className='flex-1 h-0.5 bg-gradient-to-r from-teal-400/60 to-teal-400/10 min-w-[16px] rd-slide'
                     style={{ animationDelay: `${i*200+100}ms` }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if(kind === 'symptomEntry'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Structured Symptom Capture</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Clinicians enter symptoms directly inside the RealDiag console.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/symptom-entry.png'
               alt='RealDiag symptom entry screen'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'symptomSearch'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Refined Symptom Search</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Filter by age, sex, and specialty for precise differentials.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/symptom-search.png'
               alt='RealDiag symptom search screen'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'engine'){
    const dxs = [
      { dx: 'New-onset generalized seizure disorder', prob: 58 },
      { dx: 'Provoked seizure (sleep deprivation)', prob: 19 },
      { dx: 'Brain lesion / tumor', prob: 11 },
      { dx: 'Syncope with convulsive activity', prob: 7 },
      { dx: 'Metabolic abnormality', prob: 5 }
    ];
    return wrap(
      <div className='w-full max-w-3xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Diagnostic Engine</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Patient: 24M — First seizure episode</div>
        <div className='space-y-3'>
          {dxs.map((d, i) => (
            <div key={d.dx} className='rd-slide' style={{ animationDelay: `${i*200}ms` }}>
              <div className='flex justify-between text-sm mb-1 text-white'>
                <span>{d.dx}</span>
                <span className='text-teal-300 font-semibold'>{d.prob}%</span>
              </div>
              <div className='h-2.5 bg-white/10 rounded-full overflow-hidden'>
                <div className='h-full bg-teal-400 rounded-full' style={{ width: `${d.prob}%`, transition: 'width 700ms ease-out' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if(kind === 'rankedResults'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Ranked Diagnostic Results</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Likelihood-sorted diagnoses with matched symptoms.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/results-displayed.png'
               alt='RealDiag ranked diagnostic results'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'presentation'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Typical Presentation</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Pattern recognition with ICD-10 and SNOMED coding built in.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/typical-presentation.png'
               alt='Typical presentation screen with diagnostic codes'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'workup'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Recommended Workup</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Diagnostic tests aligned to evidence-based guidelines.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/recommended-workup.png'
               alt='Recommended workup screen'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'management'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Management Guidance</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Acute care, medications, and counseling at the point of care.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/management.png'
               alt='Management guidance screen'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'referral'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Specialist Referral</div>
        <div className='text-center text-sm text-slate-300 mb-6'>Triage-ready emergency, urgent, and routine referral pathways.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/specialist-referral.png'
               alt='Specialist referral screen'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'pearls'){
    return wrap(
      <div className='w-full max-w-5xl'>
        <div className='text-center text-2xl font-semibold mb-2 text-teal-200'>Clinical Pearls</div>
        <div className='text-center text-sm text-slate-300 mb-6'>High-yield reminders surfaced in real time for the clinician.</div>
        <div className='rounded-2xl overflow-hidden border border-teal-500/30 shadow-2xl bg-white rd-slide'>
          <img src='assets/images/screenshots/clinical-pearls.png'
               alt='Clinical pearls screen'
               className='w-full block' />
        </div>
      </div>
    );
  }

  if(kind === 'roi'){
    const stats = [
      { label: 'Diagnostic Accuracy', value: '+25%' },
      { label: 'Time to Treatment', value: '-30%' },
      { label: 'Annual Savings', value: '$4.2M' }
    ];
    return wrap(
      <div className='w-full max-w-4xl text-center'>
        <div className='text-2xl font-semibold mb-8 text-teal-200'>Health System Impact</div>
        <div className='grid md:grid-cols-3 gap-6'>
          {stats.map((s, i) => (
            <div key={s.label}
                 className='bg-gradient-to-br from-teal-500/20 to-teal-700/10 border border-teal-400/40 rounded-2xl p-6 md:p-8 rd-slide'
                 style={{ animationDelay: `${i*200}ms` }}>
              <div className='text-4xl md:text-5xl font-bold text-white'>{s.value}</div>
              <div className='text-sm text-slate-300 mt-3'>{s.label}</div>
            </div>
          ))}
        </div>
        <div className='mt-8 text-slate-300 text-sm'>Faster diagnosis. Smarter referrals. Better outcomes.</div>
      </div>
    );
  }

  return null;
}

function RealDiagDemo(){
  const heroRef = useRef(null);
  const validationRef = useRef(null);
  const workflowRef = useRef(null);
  const diagnosticRef = useRef(null);
  const roiRef = useRef(null);
  const [selectedCase, setSelectedCase] = useState(cases[0]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const tourRef = useRef(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [currentSceneTitle, setCurrentSceneTitle] = useState('Opening Narrative');
  const [activeSceneIndex, setActiveSceneIndex] = useState(-1);

  const sceneHighlight = (idx) =>
    isPlayingVideo && activeSceneIndex === idx
      ? 'ring-4 ring-teal-400 ring-offset-2 ring-offset-slate-50 transition-all duration-500'
      : 'transition-all duration-500';

  const stopNarration = () => {
    if(tourRef.current) clearTimeout(tourRef.current);
    if(typeof tourRef.cancel === 'function') tourRef.cancel();
    tourRef.tourId = (tourRef.tourId || 0) + 1; // invalidate any in-flight callbacks
    if(typeof window !== 'undefined' && 'speechSynthesis' in window){
      window.speechSynthesis.cancel();
    }
  };

  const cinematicSections = [
    {
      title: 'Opening Narrative',
      ref: heroRef,
      text: 'Welcome to RealDiag. This demo shows how clinicians move from diagnostic uncertainty to structured action in minutes.',
      visual: 'opening'
    },
    {
      title: 'Clinical Validation',
      ref: validationRef,
      text: 'RealDiag has validation across hundreds of diagnoses and clinical scenarios.',
      visual: 'validation'
    },
    {
      title: 'Clinical Workflow',
      ref: workflowRef,
      text: 'RealDiag fits directly into physician workflow and existing electronic health records.',
      visual: 'workflow'
    },
    {
      title: 'Symptom Entry',
      ref: workflowRef,
      text: 'Inside RealDiag, the clinician captures structured symptoms with chip-style tagging for fast, precise input.',
      visual: 'symptomEntry'
    },
    {
      title: 'Symptom Search',
      ref: workflowRef,
      text: 'Filters for age, sex, and specialty refine the search so the differential is tailored to the patient in front of you.',
      visual: 'symptomSearch'
    },
    {
      title: 'Diagnostic Engine',
      ref: diagnosticRef,
      text: 'Now watch RealDiag evaluate a first seizure patient and generate a ranked differential diagnosis.',
      visual: 'engine'
    },
    {
      title: 'Ranked Results',
      ref: diagnosticRef,
      text: 'Results are displayed inline with matched symptoms, so clinicians can see exactly why each diagnosis was suggested.',
      visual: 'rankedResults'
    },
    {
      title: 'Typical Presentation',
      ref: diagnosticRef,
      text: 'For each diagnosis, RealDiag surfaces the typical presentation along with ICD-10 and SNOMED codes for documentation.',
      visual: 'presentation'
    },
    {
      title: 'Recommended Workup',
      ref: diagnosticRef,
      text: 'RealDiag recommends a guideline-aligned workup, including labs, imaging, and EEG timing.',
      visual: 'workup'
    },
    {
      title: 'Management',
      ref: diagnosticRef,
      text: 'Acute management, medications, and patient counseling are surfaced in one consolidated view.',
      visual: 'management'
    },
    {
      title: 'Specialist Referral',
      ref: diagnosticRef,
      text: 'Specialist referrals are pre-triaged into emergency, urgent, and routine pathways.',
      visual: 'referral'
    },
    {
      title: 'Clinical Pearls',
      ref: diagnosticRef,
      text: 'High-yield clinical pearls keep critical reminders front and center at the point of care.',
      visual: 'pearls'
    },
    {
      title: 'ROI Impact',
      ref: roiRef,
      text: 'The result is faster diagnosis, fewer delays, and major cost savings.',
      visual: 'roi'
    }
  ];

  const SceneVisual = () => null;

  const startNarratedTour = () => {
    setIsPlayingVideo(true);
    setVideoProgress(0);
    stopNarration();
    setAnalyzed(false);
    setActiveSceneIndex(-1);
    let i = 0;
    let cancelled = false;

    // Track cancellation so a stale onEnd from a cancelled utterance doesn't
    // restart the loop after the user closes the player.
    const tourId = (tourRef.tourId || 0) + 1;
    tourRef.tourId = tourId;

    const advance = () => {
      if(cancelled || tourRef.tourId !== tourId) return;
      runStep();
    };

    const runStep = () => {
      if(cancelled || tourRef.tourId !== tourId) return;

      if(i >= cinematicSections.length){
        setVideoProgress(100);
        setActiveSceneIndex(-1);
        speak('Demo complete.', voiceEnabled, () => {
          if(cancelled || tourRef.tourId !== tourId) return;
          tourRef.current = setTimeout(() => setIsPlayingVideo(false), 1500);
        });
        return;
      }

      const section = cinematicSections[i];
      setCurrentSceneTitle(section.title);
      setTourStep(i);
      setActiveSceneIndex(i);
      setVideoProgress(((i+1)/cinematicSections.length)*100);

      if(section.visual === 'engine'){
        setTimeout(() => setAnalyzed(true), 1200);
      }

      // Ensure each scene shows for a minimum amount of time so visuals can
      // breathe even if the spoken text is short. Advance only after BOTH the
      // narration finishes AND the minimum display time has passed.
      const minDisplayMs = 4500;
      const startedAt = Date.now();
      let speechDone = false;
      let minDone = false;
      const tryAdvance = () => {
        if(speechDone && minDone) advance();
      };

      tourRef.current = setTimeout(() => { minDone = true; tryAdvance(); }, minDisplayMs);

      speak(section.text, voiceEnabled, () => {
        // Small pause after the narration ends so it doesn't feel rushed.
        setTimeout(() => { speechDone = true; tryAdvance(); }, 600);
      });

      i++;
    };

    // Allow stopNarration to flag cancellation.
    tourRef.cancel = () => { cancelled = true; };

    runStep();
  };

  const runAnalysis = () => {
    setAnalyzed(false);
    setTimeout(() => setAnalyzed(true), 1200);
  };

  const currentVisualKind = activeSceneIndex >= 0 && cinematicSections[activeSceneIndex]
    ? cinematicSections[activeSceneIndex].visual
    : null;

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <style>{`
        @keyframes rd_fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rd_slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .rd-fade { animation: rd_fadeIn 0.8s ease-out both; }
        .rd-slide { animation: rd_slideUp 0.6s ease-out both; }
      `}</style>
      <div className='max-w-7xl mx-auto space-y-6'>
        {isPlayingVideo && (
          <div className='bg-black text-white rounded-3xl shadow-2xl border border-teal-500/40 overflow-hidden mb-6'>
            <div className='flex justify-between items-center px-5 pt-4 pb-3'>
              <div>
                <div className='font-semibold text-lg tracking-wide'>RealDiag Product Film</div>
                <div className='text-sm text-teal-300 mt-1'>{currentSceneTitle}</div>
              </div>
              <div className='flex items-center gap-3'>
                <div className='text-sm text-slate-300'>{Math.round(videoProgress)}% Complete</div>
                <button
                  onClick={() => { stopNarration(); setIsPlayingVideo(false); setActiveSceneIndex(-1); }}
                  className='text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full'
                >Close</button>
              </div>
            </div>

            <div className='relative bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 mx-5 rounded-2xl overflow-hidden' style={{ minHeight: '420px' }}>
              <CinematicScene kind={currentVisualKind} sceneIndex={activeSceneIndex} />
            </div>

            <div className='px-5 pt-4 pb-5'>
              <div className='w-full h-2 bg-slate-700 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-teal-500 transition-all duration-1000'
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              <div className='mt-3 flex justify-between text-xs text-slate-400'>
                <span>Scene {Math.max(activeSceneIndex+1, 0)} of {cinematicSections.length}</span>
                <span>{cinematicSections.map((s, i) => i === activeSceneIndex ? '●' : '○').join(' ')}</span>
              </div>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          ref={heroRef}
          className={`bg-gradient-to-r from-slate-900 to-teal-700 text-white rounded-3xl p-6 shadow-2xl ${sceneHighlight(0)}`}>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div>
              <h1 className='text-4xl font-bold'>RealDiag</h1>
              <div className='mt-3 inline-flex px-4 py-2 rounded-full bg-white/10 text-sm font-medium'>Featured Demo: First Seizure Clinical Pathway</div>
              <p className='text-slate-200 mt-2'>Probabilistic diagnostic support for faster, more accurate clinical decision-making.</p>
            </div>
            <div className='flex gap-3 flex-wrap'>
            <button
              onClick={startNarratedTour}
              className='bg-teal-900 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2'
            >
              <Play size={18}/> Play Product Film
            </button>
          </div>
          </div>
        </motion.div>

        <div ref={validationRef} className={`bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6 ${sceneHighlight(1)}`}>
          <h2 className='font-bold text-xl mb-4'>Clinical Validation Layer</h2>
          <div className='grid md:grid-cols-4 gap-4'>
            <div className='bg-slate-50 rounded-2xl p-4 text-center'>
              <div className='text-sm text-slate-500'>Diagnoses</div>
              <div className='text-3xl font-bold mt-2'>400+</div>
            </div>
            <div className='bg-slate-50 rounded-2xl p-4 text-center'>
              <div className='text-sm text-slate-500'>Validation Scenarios</div>
              <div className='text-3xl font-bold mt-2'>100+</div>
            </div>
            <div className='bg-slate-50 rounded-2xl p-4 text-center'>
              <div className='text-sm text-slate-500'>Clinical Domains</div>
              <div className='text-3xl font-bold mt-2'>Multi-specialty</div>
            </div>
            <div className='bg-slate-50 rounded-2xl p-4 text-center'>
              <div className='text-sm text-slate-500'>Validation Model</div>
              <div className='text-3xl font-bold mt-2'>IRB Ready</div>
            </div>
          </div>
        </div>

        <div className='mb-4 flex gap-2 flex-wrap'>
          {cinematicSections.map((_, dot)=>(
            <div
              key={dot}
              className={`w-3 h-3 rounded-full ${dot <= tourStep ? 'bg-teal-600' : 'bg-slate-300'}`}
            />
          ))}
        </div>

        <div ref={workflowRef} className={`bg-gradient-to-r from-slate-900 to-teal-700 text-white rounded-3xl p-6 mb-6 ${sceneHighlight(2)}`}>
          <h2 className='text-2xl font-bold mb-4'>Live Physician Workflow</h2>
          <div className='grid md:grid-cols-6 gap-4 text-center'>
            <div className='bg-white/10 rounded-2xl p-4'>
              <div className='font-semibold'>Open Chart</div>
              <div className='text-sm mt-2 text-slate-200'>Physician opens patient record</div>
            </div>
            <div className='bg-white/10 rounded-2xl p-4'>
              <div className='font-semibold'>Review Note</div>
              <div className='text-sm mt-2 text-slate-200'>Symptoms + history reviewed</div>
            </div>
            <div className='bg-white/10 rounded-2xl p-4'>
              <div className='font-semibold'>Launch RealDiag</div>
              <div className='text-sm mt-2 text-slate-200'>Embedded clinical tool</div>
            </div>
            <div className='bg-white/10 rounded-2xl p-4'>
              <div className='font-semibold'>Analyze</div>
              <div className='text-sm mt-2 text-slate-200'>Differential generated</div>
            </div>
            <div className='bg-white/10 rounded-2xl p-4'>
              <div className='font-semibold'>Order Tests</div>
              <div className='text-sm mt-2 text-slate-200'>Orders placed</div>
            </div>
            <div className='bg-white/10 rounded-2xl p-4'>
              <div className='font-semibold'>Close Visit</div>
              <div className='text-sm mt-2 text-slate-200'>Documentation complete</div>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6'>
          <div className='flex items-end justify-between flex-wrap gap-2 mb-5'>
            <div>
              <h2 className='font-bold text-xl'>Inside the Application</h2>
              <p className='text-sm text-slate-500 mt-1'>Real screens from the RealDiag clinician interface.</p>
            </div>
            <div className='text-xs text-slate-400'>Live product preview</div>
          </div>
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {[
              { src: 'assets/images/screenshots/symptom-search.png', label: 'Symptom Search', caption: 'Enter symptoms, demographics, and specialty filters.' },
              { src: 'assets/images/screenshots/results-displayed.png', label: 'Ranked Results', caption: 'Diagnoses ranked by likelihood with matched symptoms.' },
              { src: 'assets/images/screenshots/typical-presentation.png', label: 'Typical Presentation', caption: 'Pattern recognition with ICD-10 and SNOMED codes.' },
              { src: 'assets/images/screenshots/recommended-workup.png', label: 'Recommended Workup', caption: 'Diagnostic tests aligned to evidence-based guidelines.' },
              { src: 'assets/images/screenshots/management.png', label: 'Management', caption: 'Acute care, medications, and counseling guidance.' },
              { src: 'assets/images/screenshots/specialist-referral.png', label: 'Specialist Referral', caption: 'Triage-ready emergency, urgent, and routine referrals.' },
              { src: 'assets/images/screenshots/clinical-pearls.png', label: 'Clinical Pearls', caption: 'High-yield clinical reminders at the point of care.' },
              { src: 'assets/images/screenshots/symptom-entry.png', label: 'Symptom Entry', caption: 'Structured symptom capture with chip-style tagging.' }
            ].map(shot => (
              <figure key={shot.label} className='group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 hover:shadow-xl transition'>
                <div className='aspect-[16/9] overflow-hidden bg-white'>
                  <img src={shot.src} alt={shot.label}
                       loading='lazy'
                       className='w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-500' />
                </div>
                <figcaption className='p-4'>
                  <div className='font-semibold text-slate-800 text-sm'>{shot.label}</div>
                  <div className='text-xs text-slate-500 mt-1'>{shot.caption}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className='grid lg:grid-cols-3 gap-6 mb-6'>
          <div className='bg-white rounded-3xl shadow-lg border border-slate-200 p-5 lg:col-span-2'>
            <h2 className='font-bold text-xl mb-4'>EHR Integration Workflow</h2>
            <div className='grid md:grid-cols-5 gap-3 text-center'>
              <div className='bg-slate-50 rounded-2xl p-4'><div className='font-semibold'>Epic/Cerner</div><div className='text-sm text-slate-500 mt-2'>Patient chart opened</div></div>
              <div className='bg-slate-50 rounded-2xl p-4'><div className='font-semibold'>RealDiag Launch</div><div className='text-sm text-slate-500 mt-2'>Embedded launch button</div></div>
              <div className='bg-slate-50 rounded-2xl p-4'><div className='font-semibold'>Data Pull</div><div className='text-sm text-slate-500 mt-2'>Labs, meds, history, imaging</div></div>
              <div className='bg-slate-50 rounded-2xl p-4'><div className='font-semibold'>Analysis</div><div className='text-sm text-slate-500 mt-2'>Differential generation</div></div>
              <div className='bg-slate-50 rounded-2xl p-4'><div className='font-semibold'>Push Back</div><div className='text-sm text-slate-500 mt-2'>Orders + referrals back to chart</div></div>
            </div>
          </div>

          <div className='bg-white rounded-3xl shadow-lg border border-slate-200 p-5'>
            <h2 className='font-bold text-xl mb-4'>Explainability Engine</h2>
            <ul className='space-y-3 text-sm text-slate-600'>
              <li>• Symptoms matched against structured clinical rules</li>
              <li>• Differential ranked using probability scoring</li>
              <li>• Guideline-based workup recommendations</li>
              <li>• Contradictory findings highlighted</li>
              <li>• Evidence citations available to clinicians</li>
            </ul>
          </div>
        </div>

        <div ref={diagnosticRef} className={`grid lg:grid-cols-4 gap-6 rounded-3xl p-2 ${sceneHighlight(3)}`}>
          <Card>
            <h2 className='font-bold text-xl mb-4 flex items-center gap-2'><FileText size={18}/> Patient Cases</h2>
            <div className='space-y-3'>
              {cases.map((c)=> (
                <button
                  key={c.id}
                  onClick={()=>{setSelectedCase(c); setAnalyzed(false)}}
                  className={`w-full text-left p-3 rounded-xl ${selectedCase.id===c.id ? 'bg-teal-50 border border-teal-300':'bg-slate-50'}`}
                >
                  <div className='font-semibold'>{c.patient}</div>
                  <div className='text-sm text-slate-500'>{c.concern}</div>
                </button>
              ))}
            </div>

              <div className='mt-6 bg-teal-50 border border-teal-200 rounded-2xl p-5'>
                <h3 className='font-bold text-lg mb-3'>ROI Calculator</h3>
                <div className='text-sm text-slate-600 mb-3'>Example based on 10,000 diagnostic patients annually:</div>
                <div className='grid md:grid-cols-3 gap-4'>
                  <div className='bg-white rounded-xl p-4'><div className='text-sm text-slate-500'>Avoidable Costs</div><div className='text-2xl font-bold'>$4.2M</div></div>
                  <div className='bg-white rounded-xl p-4'><div className='text-sm text-slate-500'>Referral Reduction</div><div className='text-2xl font-bold'>18%</div></div>
                  <div className='bg-white rounded-xl p-4'><div className='text-sm text-slate-500'>Time Saved</div><div className='text-2xl font-bold'>32%</div></div>
                </div>
              </div>
            </Card>

          <div className='lg:col-span-3 space-y-6'>
            <Card>
              <h2 className='font-bold text-xl mb-4 flex items-center gap-2'><Stethoscope size={18}/> Intake Summary</h2>
              <p><strong>Chief Concern:</strong> {selectedCase.concern}</p>
              <div className='mt-3'>
                <strong>Symptoms:</strong>
                <div className='flex flex-wrap gap-2 mt-2'>
                  {selectedCase.symptoms.map(s=><span key={s} className='px-3 py-1 rounded-full bg-slate-100'>{s}</span>)}
                </div>
              </div>
              <div className='mt-3'>
                <strong>History:</strong>
                <div className='flex flex-wrap gap-2 mt-2'>
                  {selectedCase.history.map(h=><span key={h} className='px-3 py-1 rounded-full bg-slate-100'>{h}</span>)}
                </div>
              </div>
            </Card>

            <AnimatePresence>
              {analyzed && (
                <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
                  <div className='grid md:grid-cols-2 gap-6'>
                    <Card>
                      <h2 className='font-bold text-xl mb-4 flex items-center gap-2'><Brain size={18}/> Differential Diagnosis</h2>
                      <div className='space-y-4'>
                        {selectedCase.differential.map((d)=> (
                          <div key={d.dx}>
                            <div className='flex justify-between text-sm mb-1'>
                              <span>{d.dx}</span>
                              <span>{d.prob}%</span>
                            </div>
                            <div className='h-3 bg-slate-100 rounded-full overflow-hidden'>
                              <div className='h-full bg-teal-600 rounded-full' style={{width:`${d.prob}%`}} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card>
                      <h2 className='font-bold text-xl mb-4 flex items-center gap-2'><Activity size={18}/> Recommended Workup</h2>
                      {selectedCase.id === 'Case 0' && (
                        <div className='mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200'>
                          <div className='font-semibold text-amber-800 mb-2'>First Seizure Protocol Triggered</div>
                          <div className='text-sm text-amber-700'>RealDiag automatically launches a structured first seizure pathway aligned with imaging guidance, EEG timing, and neurology referral recommendations.</div>
                        </div>
                      )}
                      <ul className='list-disc ml-5 space-y-2'>
                        {selectedCase.workup.map(w=><li key={w}>{w}</li>)}
                      </ul>

                      <h3 className='font-semibold mt-5 mb-2'>Referral Guidance</h3>

                      {selectedCase.redFlags && (
                        <>
                          <h3 className='font-semibold mt-5 mb-2 text-red-600'>Red Flags</h3>
                          <ul className='list-disc ml-5 space-y-2 text-red-600'>
                            {selectedCase.redFlags.map(flag => <li key={flag}>{flag}</li>)}
                          </ul>
                        </>
                      )}
                      <ul className='list-disc ml-5 space-y-2'>
                        {selectedCase.referral.map(r=><li key={r}>{r}</li>)}
                      </ul>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={roiRef} className={`rounded-3xl ${sceneHighlight(4)}`}>
            <Card>
              <h2 className='font-bold text-xl mb-4 flex items-center gap-2'><AlertTriangle size={18}/> Before vs After RealDiag</h2>

              <div className='grid md:grid-cols-2 gap-4 mb-6'>
                <div className='bg-red-50 border border-red-200 rounded-2xl p-4'>
                  <div className='font-semibold text-red-700 mb-3'>Without RealDiag</div>
                  <ul className='list-disc ml-5 text-sm space-y-2 text-red-600'>
                    <li>Multiple referrals</li>
                    <li>Delayed diagnosis</li>
                    <li>Repeat ER visits</li>
                    <li>Unnecessary testing</li>
                  </ul>
                </div>
                <div className='bg-green-50 border border-green-200 rounded-2xl p-4'>
                  <div className='font-semibold text-green-700 mb-3'>With RealDiag</div>
                  <ul className='list-disc ml-5 text-sm space-y-2 text-green-600'>
                    <li>Faster diagnosis</li>
                    <li>Smarter referrals</li>
                    <li>Reduced testing waste</li>
                    <li>Earlier treatment initiation</li>
                  </ul>
                </div>
              </div>

              <h2 className='font-bold text-xl mb-4 flex items-center gap-2'><AlertTriangle size={18}/> Health System Impact</h2>
              <div className='grid md:grid-cols-3 gap-4'>
                <div className='bg-slate-900 text-white rounded-2xl p-4'>
                  <div className='text-sm'>Diagnostic Accuracy</div>
                  <div className='text-3xl font-bold mt-2'>+25%</div>
                </div>
                <div className='bg-slate-900 text-white rounded-2xl p-4'>
                  <div className='text-sm'>Time to Treatment</div>
                  <div className='text-3xl font-bold mt-2'>-30%</div>
                </div>
                <div className='bg-slate-900 text-white rounded-2xl p-4'>
                  <div className='text-sm'>Cost Savings</div>
                  <div className='text-3xl font-bold mt-2'>$2.8K</div>
                </div>
              </div>
            </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const _root = ReactDOM.createRoot(document.getElementById('realdiag-demo-root'));
_root.render(<RealDiagDemo />);
