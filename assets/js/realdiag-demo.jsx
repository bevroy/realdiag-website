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

function speak(text, enabled=true){
  if(!enabled) return;
  if(typeof window !== 'undefined' && 'speechSynthesis' in window){
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }
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

  const stopNarration = () => {
    if(tourRef.current) clearTimeout(tourRef.current);
    if(typeof window !== 'undefined' && 'speechSynthesis' in window){
      window.speechSynthesis.cancel();
    }
  };

  const cinematicSections = [
    {
      title: 'Opening Narrative',
      ref: heroRef,
      text: 'Welcome to RealDiag. This demo shows how clinicians move from diagnostic uncertainty to structured action in minutes.'
    },
    {
      title: 'Clinical Validation',
      ref: validationRef,
      text: 'RealDiag has validation across hundreds of diagnoses and clinical scenarios.'
    },
    {
      title: 'Clinical Workflow',
      ref: workflowRef,
      text: 'RealDiag fits directly into physician workflow and existing electronic health records.'
    },
    {
      title: 'Diagnostic Engine',
      ref: diagnosticRef,
      text: 'Now watch RealDiag evaluate a first seizure patient and generate recommendations.'
    },
    {
      title: 'ROI Impact',
      ref: roiRef,
      text: 'The result is faster diagnosis, fewer delays, and major cost savings.'
    }
  ];

  const startNarratedTour = () => {
    setIsPlayingVideo(true);
    setVideoProgress(0);
    stopNarration();
    setAnalyzed(false);
    let i = 0;

    const runStep = () => {
      if(i >= cinematicSections.length){
        setIsPlayingVideo(false);
        setVideoProgress(100);
        speak('Demo complete.', voiceEnabled);
        return;
      }

      const section = cinematicSections[i];
      setCurrentSceneTitle(section.title);
      setTourStep(i);
      setVideoProgress(((i+1)/cinematicSections.length)*100);

      if(section.ref?.current){
        section.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if(i === 3){
        setTimeout(() => setAnalyzed(true), 1200);
      }

      speak(section.text, voiceEnabled);
      i++;
      tourRef.current = setTimeout(runStep, 7000);
    };

    runStep();
  };

  const runAnalysis = () => {
    setAnalyzed(false);
    setTimeout(() => setAnalyzed(true), 1200);
  };

  return (
    <div className='min-h-screen bg-slate-50 p-6'>
      <div className='max-w-7xl mx-auto space-y-6'>
        {isPlayingVideo && (
          <div className='bg-black text-white rounded-3xl p-4 mb-6 shadow-2xl'>
            <div className='flex justify-between items-center mb-3'>
              <div>
              <div className='font-semibold text-lg tracking-wide'>RealDiag Product Film</div>
              <div className='text-sm text-teal-300 mt-1'>{currentSceneTitle}</div>
            </div>
              <div className='text-sm text-slate-300'>{Math.round(videoProgress)}% Complete</div>
            </div>

            <div className='w-full h-3 bg-slate-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-teal-500 transition-all duration-1000'
                style={{ width: `${videoProgress}%` }}
              />
            </div>

            <div className='mt-3 text-sm text-slate-300'>
              Premium guided product walkthrough in progress...
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          ref={heroRef}
          className='bg-gradient-to-r from-slate-900 to-teal-700 text-white rounded-3xl p-6 shadow-2xl'>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div>
              <h1 className='text-4xl font-bold'>RealDiag</h1>
              <div className='mt-3 inline-flex px-4 py-2 rounded-full bg-white/10 text-sm font-medium'>Featured Demo: First Seizure Clinical Pathway</div>
              <p className='text-slate-200 mt-2'>Probabilistic diagnostic support for faster, more accurate clinical decision-making.</p>
            </div>
            <div className='flex gap-3 flex-wrap'>
            <button onClick={runAnalysis} className='bg-white text-teal-700 px-5 py-3 rounded-xl font-semibold flex items-center gap-2'>
              <Play size={18}/> Run Demo
            </button>

            <button
              onClick={startNarratedTour}
              className='bg-teal-900 text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2'
            >
              <Play size={18}/> Play Product Film
            </button>

            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className='bg-white/20 text-white px-5 py-3 rounded-xl font-semibold'
            >
              Voice: {voiceEnabled ? 'On' : 'Off'}
            </button>
          </div>
          </div>
        </motion.div>

        <div ref={validationRef} className='bg-white rounded-3xl shadow-lg border border-slate-200 p-6 mb-6'>
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

        <div className='mb-4 flex gap-2'>
          {[0,1,2,3,4,5].map((dot)=>(
            <div
              key={dot}
              className={`w-3 h-3 rounded-full ${dot <= tourStep ? 'bg-teal-600' : 'bg-slate-300'}`}
            />
          ))}
        </div>

        <div ref={workflowRef} className='bg-gradient-to-r from-slate-900 to-teal-700 text-white rounded-3xl p-6 mb-6'>
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

        <div ref={diagnosticRef} className='grid lg:grid-cols-4 gap-6'>
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
  )
}

const _root = ReactDOM.createRoot(document.getElementById('realdiag-demo-root'));
_root.render(<RealDiagDemo />);
