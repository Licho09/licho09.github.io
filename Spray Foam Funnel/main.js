// =====================
// CONFETTI
// =====================
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#0062fe', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const pieces = [];

  for (let i = 0; i < 160; i++) {
      pieces.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          w: Math.random() * 10 + 6,
          h: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          speed: Math.random() * 4 + 2,
          rotSpeed: (Math.random() - 0.5) * 4
      });
  }

  let frame;
  function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allDone = true;
      pieces.forEach(p => {
          p.y += p.speed;
          p.rotation += p.rotSpeed;
          if (p.y < canvas.height + 20) allDone = false;
          ctx.save();
          ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
      });
      if (!allDone) {
          frame = requestAnimationFrame(draw);
      } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
  }

  if (frame) cancelAnimationFrame(frame);
  draw();
  setTimeout(() => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 3500);
}

// =====================
// GOOGLE SHEET URL
// =====================
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQn65Ow5YEMMY4kNN2PNK5FzdysBV3igm5a69EAN-QeZgBgFJz2khkIhkrl3ljDYX6/exec';

// =====================
// IN-MEMORY LEAD DATA
// (more reliable than localStorage for single-page flow)
// =====================
const leadData = {
  name: '',
  phone: '',
  situation: '',
  experience: ''
};

// =====================
// FORM STATE
// =====================
const TOTAL_STEPS = 3;
let currentStep = 1;
let onResultsScreen = false;
let step1Saved = false;

// =====================
// JOURNEY INDICATOR
// =====================
function updateJourneyIndicator(step) {
  const j1 = document.getElementById('jStep1');
  const j2 = document.getElementById('jStep2');
  const j3 = document.getElementById('jStep3');
  const j4 = document.getElementById('jStep4');
  if (!j1 || !j2 || !j3 || !j4) return;

  [j1, j2, j3, j4].forEach(el => el.classList.remove('active', 'done'));

  if (step === 'booking') {
      j1.classList.add('done');
      j2.classList.add('done');
      j3.classList.add('done');
      j4.classList.add('active');
  } else if (step === 3) {
      j1.classList.add('done');
      j2.classList.add('done');
      j3.classList.add('active');
  } else if (step === 2) {
      j1.classList.add('done');
      j2.classList.add('active');
  } else {
      j1.classList.add('active');
  }
}

function updateProgress(step) {
  const pct = step === 'booking' ? 100 : ((step - 1) / TOTAL_STEPS) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('currentStep').textContent = step === 'booking' ? TOTAL_STEPS : step;
  document.getElementById('totalSteps').textContent = TOTAL_STEPS;
}

// =====================
// BUTTON STATE
// =====================
function setNextButtonState(stepNum, enabled) {
  const stepEl = document.getElementById('step' + stepNum);
  if (stepEl) {
      const btn = stepEl.querySelector('.btn-primary');
      if (btn) {
          btn.disabled = !enabled;
          if (enabled) btn.classList.remove('btn-disabled');
          else btn.classList.add('btn-disabled');
      }
  }
  updateMobileFooter();
}

function checkStepReady(stepNum) {
  if (stepNum === 1) {
      const name = document.getElementById('userName')?.value.trim();
      const phone = document.getElementById('userPhone')?.value.trim();
      return !!(name && phone);
  }
  if (stepNum === 2) {
      return !!document.querySelector('input[name="situation"]:checked');
  }
  if (stepNum === 3) {
      return !!document.querySelector('input[name="experience"]:checked');
  }
  return false;
}

// =====================
// SHOW STEP
// =====================
function showStep(n) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));

  const el = n === 'booking'
      ? document.getElementById('stepBooking')
      : document.getElementById('step' + n);
  if (el) el.classList.add('active');

  if (n !== 'booking') {
      currentStep = n;
      onResultsScreen = false;
      const qualifyHeader = document.getElementById('qualifyHeader');
      if (qualifyHeader) qualifyHeader.style.display = '';
      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer) progressContainer.style.marginTop = '';
      setNextButtonState(n, checkStepReady(n));
  } else {
      onResultsScreen = true;
      const qualifyHeader = document.getElementById('qualifyHeader');
      if (qualifyHeader) qualifyHeader.style.display = 'none';
      const progressContainer = document.querySelector('.progress-container');
      if (progressContainer) progressContainer.style.marginTop = '0';
  }

  updateProgress(n);
  updateJourneyIndicator(n);
  updateMobileFooter();

  if (n !== 1) {
      const container = document.querySelector('.question-container');
      if (container) window.scrollTo({ top: container.offsetTop - 16, behavior: 'smooth' });
  }

  // GA4 step tracking
  if (typeof gtag !== 'undefined') {
      if (n === 1) gtag('event', 'quiz_step_1', { event_category: 'Quiz', event_label: 'Contact Info' });
      if (n === 2) gtag('event', 'quiz_step_2', { event_category: 'Quiz', event_label: 'Current Situation' });
      if (n === 3) gtag('event', 'quiz_step_3', { event_category: 'Quiz', event_label: 'Experience' });
      if (n === 'booking') gtag('event', 'quiz_complete', { event_category: 'Quiz', event_label: 'Qualified' });
  }
}

// =====================
// PROGRESSIVE CAPTURE: Save after Step 1
// =====================
function saveStep1() {
  if (step1Saved) return;

  const name = document.getElementById('userName')?.value.trim() || '';
  const phone = document.getElementById('userPhone')?.value.trim() || '';
  if (!name || !phone) return;

  leadData.name = name;
  leadData.phone = phone;
  step1Saved = true;

  const payload = {
      type: 'partial',
      name: name,
      phone: phone,
      situation: '',
      status: 'Step 1 Only'
  };

  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
      .catch(err => console.error('Step 1 save failed:', err));
}

// =====================
// NAVIGATION
// =====================
function nextStep(from) {
  const name = document.getElementById('userName')?.value.trim();
  const phone = document.getElementById('userPhone')?.value.trim();

  if (!name || !phone) {
      alert('Please enter your name and phone number.');
      return;
  }

  saveStep1();
  showStep(from + 1);
}

function goBack(from) {
  showStep(from - 1);
}

function showBooking() {
  const situationInput = document.querySelector('input[name="situation"]:checked');
  const experienceInput = document.querySelector('input[name="experience"]:checked');
  if (!situationInput) {
      alert('Please select an option to continue.');
      return;
  }
  if (!experienceInput) {
      alert('Please select an option to continue.');
      return;
  }

  leadData.situation = situationInput.value;
  leadData.experience = experienceInput.value;

  showStep('booking');
  launchConfetti();

  if (typeof fbq !== 'undefined') fbq('track', 'Lead');

  // Wire up the booking button to pass lead data via URL params
  const bookingBtn = document.querySelector('#stepBooking .btn-booking-gold');
  if (bookingBtn) {
      const params = new URLSearchParams({
          name: leadData.name,
          phone: leadData.phone,
          situation: leadData.situation,
          experience: leadData.experience
      });
      bookingBtn.onclick = () => { window.location.href = `booking.html?${params.toString()}`; };
  }

  // Send complete lead to Google Sheet
  const payload = {
      type: 'survey',
      name: leadData.name,
      phone: leadData.phone,
      situation: leadData.situation,
      experience: leadData.experience,
      status: 'Complete'
  };

  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
      .catch(err => console.error('Survey save failed:', err));
}

// =====================
// EVENT LISTENERS
// =====================

// Step 1 — enable Next as user types
document.addEventListener('input', function (e) {
  if (e.target.id === 'userName' || e.target.id === 'userPhone') {
      setNextButtonState(1, checkStepReady(1));
  }
});

// Step 2 — enable button when radio selected
document.addEventListener('change', function (e) {
  if (e.target.name === 'situation') {
      setNextButtonState(2, true);
      updateMobileFooter();
  }
  if (e.target.name === 'experience') {
      setNextButtonState(3, true);
      updateMobileFooter();
  }
});

// =====================
// MOBILE STICKY FOOTER
// =====================
function updateMobileFooter() {
  const footer = document.getElementById('mobileStickyFooter');
  if (!footer) return;

  if (window.innerWidth > 768 || onResultsScreen) {
      footer.style.display = 'none';
      return;
  }

  footer.style.display = 'flex';
  footer.innerHTML = '';

  if (currentStep > 1) {
      const back = document.createElement('button');
      back.className = 'btn btn-secondary';
      back.style.flex = '1';
      back.textContent = 'Back';
      back.onclick = () => goBack(currentStep);
      footer.appendChild(back);
  }

  const action = document.createElement('button');
  action.style.flex = '2';

  const isReady = checkStepReady(currentStep);
  action.className = 'btn btn-primary' + (isReady ? '' : ' btn-disabled');
  action.disabled = !isReady;

  if (currentStep < TOTAL_STEPS) {
      action.textContent = 'Next →';
      action.onclick = () => { if (!action.disabled) nextStep(currentStep); };
  } else {
      action.textContent = 'See My Results →';
      action.onclick = () => { if (!action.disabled) showBooking(); };
  }

  footer.appendChild(action);
}

window.addEventListener('resize', updateMobileFooter);

// =====================
// INIT
// =====================
showStep(1);