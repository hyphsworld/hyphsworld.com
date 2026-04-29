(() => {
  const overlay = document.getElementById('scanOverlay');
  const runButtons = document.querySelectorAll('[data-run-scan]');
  const closeButtons = document.querySelectorAll('[data-close-scan]');
  const progressBar = document.getElementById('scanProgressBar');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlaySubcopy = document.getElementById('overlaySubcopy');
  const scanSteps = Array.from(document.querySelectorAll('#scanSteps li'));
  const resultPanel = document.getElementById('resultPanel');
  const enterLevelBtn = document.getElementById('enterLevelBtn');
  const rerunScanBtn = document.getElementById('rerunScanBtn');
  const inlineStatus = document.getElementById('inlineStatus');
  const inlineVaultLink = document.getElementById('inlineVaultLink');
  const duckInlineLine = document.getElementById('duckInlineLine');

  const sequence = [
    {
      title: 'Initializing Vault Scan…',
      subcopy: 'Feet on the pad, player. Let the machine do its thing.',
      status: 'Initializing scan',
      duck: 'Duck says: “Feet on the pad, player…”',
      progress: 16,
      activeStep: 0,
      delay: 850
    },
    {
      title: 'Scanning Subject',
      subcopy: 'Smoke locked. Body outline detected. Don’t make it weird.',
      status: 'Scanning subject',
      duck: 'Duck says: “Hold still, playboy…”',
      progress: 42,
      activeStep: 1,
      delay: 950
    },
    {
      title: 'Checking Clearance',
      subcopy: 'The Vault is checking your energy. Buck is watching the door.',
      status: 'Checking clearance',
      duck: 'Duck says: “Buck said quit moving.”',
      progress: 68,
      activeStep: 2,
      delay: 950
    },
    {
      title: 'Linking To Vault',
      subcopy: 'Level 1 tunnel connected. Quarantine Mixtape floor is waking up.',
      status: 'Linking to vault',
      duck: 'Duck says: “You smell like clearance level 1.”',
      progress: 88,
      activeStep: 3,
      delay: 850
    },
    {
      title: 'Access Granted',
      subcopy: 'Level 1 Ready. Enter clean and keep it player.',
      status: 'Access granted',
      duck: 'Duck says: “Access granted. Don’t embarrass me.”',
      progress: 100,
      activeStep: 3,
      delay: 0,
      granted: true
    }
  ];

  let timers = [];

  function clearTimers() {
    timers.forEach((timer) => window.clearTimeout(timer));
    timers = [];
  }

  function setActiveStep(index) {
    scanSteps.forEach((step, stepIndex) => {
      step.classList.toggle('active', stepIndex <= index);
    });
  }

  function applyFrame(frame) {
    overlayTitle.textContent = frame.title;
    overlaySubcopy.textContent = frame.subcopy;
    progressBar.style.width = `${frame.progress}%`;
    inlineStatus.textContent = frame.status;
    inlineStatus.classList.toggle('granted', Boolean(frame.granted));
    duckInlineLine.textContent = frame.duck;
    setActiveStep(frame.activeStep);

    if (frame.granted) {
      resultPanel.hidden = false;
      enterLevelBtn.classList.remove('hidden');
      rerunScanBtn.classList.remove('hidden');
      inlineVaultLink.classList.add('is-unlocked');
      inlineVaultLink.setAttribute('aria-disabled', 'false');
    }
  }

  function resetScan() {
    clearTimers();
    progressBar.style.width = '0%';
    resultPanel.hidden = true;
    enterLevelBtn.classList.add('hidden');
    rerunScanBtn.classList.add('hidden');
    inlineStatus.textContent = 'Awaiting scan';
    inlineStatus.classList.remove('granted');
    inlineVaultLink.classList.remove('is-unlocked');
    inlineVaultLink.setAttribute('aria-disabled', 'true');
    duckInlineLine.textContent = 'Duck says: “Hold still, playboy…”';
    setActiveStep(-1);
  }

  function openOverlay() {
    resetScan();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    let elapsed = 120;
    sequence.forEach((frame) => {
      const timer = window.setTimeout(() => applyFrame(frame), elapsed);
      timers.push(timer);
      elapsed += frame.delay;
    });
  }

  function closeOverlay() {
    clearTimers();
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  runButtons.forEach((button) => button.addEventListener('click', openOverlay));
  closeButtons.forEach((button) => button.addEventListener('click', closeOverlay));
  rerunScanBtn.addEventListener('click', openOverlay);

  enterLevelBtn.addEventListener('click', () => {
    closeOverlay();
    window.setTimeout(() => {
      document.getElementById('level-1')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeOverlay();
    }
  });
})();
