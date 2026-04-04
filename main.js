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
// FORM STATE
// =====================
const TOTAL_STEPS = 3;
let currentStep = 1;
let onResultsScreen = false;

// =====================
// PROGRESSIVE CAPTURE LOGIC
// =====================
function saveProgress(stepStatus) {
    const name = document.getElementById('userName')?.value.trim() || localStorage.getItem('leadName') || '';
    const phone = document.getElementById('userPhone')?.value.trim() || localStorage.getItem('leadPhone') || '';

    if (name) localStorage.setItem('leadName', name);
    if (phone) localStorage.setItem('leadPhone', phone);

    // Step 2 is now jobsPerMonth
    const jobsPerMonth = document.querySelector('input[name="jobsPerMonth"]:checked')?.value || '';
    const experience = document.querySelector('input[name="experience"]:checked')?.value || '';

    const payload = {
        type: stepStatus === 'Complete' ? 'survey' : 'partial',
        name: name,
        phone: phone,
        jobsPerMonth: jobsPerMonth,
        experience: experience,
        status: stepStatus
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));

    fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => console.log('Saved:', stepStatus, data))
        .catch(err => console.error('Save failed:', err));
}

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
  const progressBar = document.getElementById('progressBar');
  if (progressBar) progressBar.style.width = pct + '%';

  const currentStepSpan = document.getElementById('currentStep');
  if (currentStepSpan) currentStepSpan.textContent = step === 'booking' ? TOTAL_STEPS : step;

  const totalStepsSpan = document.getElementById('totalSteps');
  if (totalStepsSpan) totalStepsSpan.textContent = TOTAL_STEPS;
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
      // Updated: now checking jobsPerMonth
      return !!document.querySelector('input[name="jobsPerMonth"]:checked');
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
      const container = document.querySelector('.question-container') || document.querySelector('.form-section');
      if (container) window.scrollTo({ top: container.offsetTop - 16, behavior: 'smooth' });
  }

  // GA4 step tracking
  if (typeof gtag !== 'undefined') {
      if (n === 1) gtag('event', 'quiz_step_1', { event_category: 'Quiz', event_label: 'Contact Info' });
      if (n === 2) gtag('event', 'quiz_step_2', { event_category: 'Quiz', event_label: 'Jobs Per Month' });
      if (n === 3) gtag('event', 'quiz_step_3', { event_category: 'Quiz', event_label: 'Experience' });
      if (n === 'booking') gtag('event', 'quiz_complete', { event_category: 'Quiz', event_label: 'Qualified' });
  }
}

// =====================
// NAVIGATION
// =====================
function nextStep(from) {
    if (from === 1) {
        const name = document.getElementById('userName')?.value.trim();
        const phone = document.getElementById('userPhone')?.value.trim();
        if (!name || !phone) {
            alert('Please enter your name and phone number.');
            return;
        }
        saveProgress('Step 1 Only');
    }

    if (from === 2) {
        saveProgress('Step 2 Complete');
    }

    showStep(from + 1);
}

function goBack(from) {
  showStep(from - 1);
}

function showBooking() {
    const jobsPerMonth = document.querySelector('input[name="jobsPerMonth"]:checked');
    const experience = document.querySelector('input[name="experience"]:checked');

    if (!jobsPerMonth || !experience) {
        alert('Please select an option to continue.');
        return;
    }

    saveProgress('Complete');

    showStep('booking');
    launchConfetti();

    if (typeof fbq !== 'undefined') fbq('track', 'Lead');

    // Wire up booking button with lead data in URL params
    const bookingBtn = document.querySelector('#stepBooking .btn-booking-gold');
    if (bookingBtn) {
        const name = localStorage.getItem('leadName');
        const phone = localStorage.getItem('leadPhone');
        const params = new URLSearchParams({
            name: name,
            phone: phone,
            jobsPerMonth: jobsPerMonth.value,
            experience: experience.value
        });
        bookingBtn.onclick = () => { window.location.href = `booking.html?${params.toString()}`; };
    }
}

// =====================
// EVENT LISTENERS
// =====================
document.addEventListener('input', function (e) {
  if (e.target.id === 'userName' || e.target.id === 'userPhone') {
      setNextButtonState(1, checkStepReady(1));
  }
});

document.addEventListener('change', function (e) {
  // Updated: jobsPerMonth replaces situation
  if (e.target.name === 'jobsPerMonth') {
      setNextButtonState(2, true);
      updateMobileFooter();
  }
  if (e.target.name === 'experience') {
      setNextButtonState(3, true);
      updateMobileFooter();
  }
});

// Wire up step 2 and 3 buttons — handled in INIT below

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
document.addEventListener('DOMContentLoaded', () => {
    showStep(1);
    const btn2 = document.getElementById('nextBtn2');
    const btn3 = document.getElementById('nextBtn3');
    if (btn2) btn2.addEventListener('click', () => { if (!btn2.disabled) nextStep(2); });
    if (btn3) btn3.addEventListener('click', () => { if (!btn3.disabled) showBooking(); });
});
