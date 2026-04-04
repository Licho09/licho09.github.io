document.addEventListener('DOMContentLoaded', function () {

    // ─── CONFIG ─────────────────────────────────────────────
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQn65Ow5YEMMY4kNN2PNK5FzdysBV3igm5a69EAN-QeZgBgFJz2khkIhkrl3ljDYX6/exec';
    const AVAILABLE_DAYS_FROM_TODAY = 1;   // start from tomorrow
    const AVAILABLE_DAYS_AHEAD      = 3;   // only next 3 days clickable
    const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // ─── STATE ──────────────────────────────────────────────
    let currentPanel = 1;   // 1 = date, 2 = time, 3 = confirm
    let selectedDate  = null;
    let selectedTime  = null;
    let bookedSlots   = [];
    let viewYear, viewMonth;

    // ─── URL PARAMS (prefill) ────────────────────────────────
    const params        = new URLSearchParams(window.location.search);
    const prefillName   = params.get('name')        || '';
    const prefillPhone  = params.get('phone')       || '';
    const prefillJobs   = params.get('jobsPerMonth')|| '';
    const prefillExp    = params.get('experience')  || '';

    const nameInput  = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    if (nameInput  && prefillName)  nameInput.value  = prefillName;
    if (phoneInput && prefillPhone) phoneInput.value = prefillPhone;

    // ─── DATE HELPERS ────────────────────────────────────────
    const today = new Date();
    today.setHours(0,0,0,0);

    function dateKey(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function slotKey(date, time) {
        return `${dateKey(date)}|${time}`;
    }

    function isAvailable(d) {
        const diff = Math.round((d - today) / 86400000);
        const dow  = d.getDay();
        // Mon–Sat, 1–14 days ahead, not Sunday
        return diff >= AVAILABLE_DAYS_FROM_TODAY &&
               diff <= AVAILABLE_DAYS_AHEAD &&
               dow !== 0;
    }

    function formatDate(d) {
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    // ─── CALENDAR ────────────────────────────────────────────
    const calGrid      = document.getElementById('calGrid');
    const calMonthTitle = document.getElementById('calMonthTitle');
    const calPrevBtn   = document.getElementById('calPrevBtn');
    const calNextBtn   = document.getElementById('calNextBtn');

    // Start on current month
    viewYear  = today.getFullYear();
    viewMonth = today.getMonth();

    function renderCalendar() {
        calMonthTitle.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

        // Prev/next button state
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const viewStart      = new Date(viewYear, viewMonth, 1);
        calPrevBtn.disabled  = viewStart <= thisMonthStart;

        const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        const frag = document.createDocumentFragment();

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            frag.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date    = new Date(viewYear, viewMonth, d);
            const dayEl   = document.createElement('div');
            dayEl.className = 'cal-day';
            dayEl.textContent = d;

            if (date < today) {
                dayEl.classList.add('past');
            } else if (date.getTime() === today.getTime()) {
                dayEl.classList.add('today');
            } else if (isAvailable(date)) {
                dayEl.classList.add('available');
                if (selectedDate && dateKey(date) === dateKey(selectedDate)) {
                    dayEl.classList.add('selected');
                }
                dayEl.addEventListener('click', () => onDateClick(date, dayEl));
            }

            frag.appendChild(dayEl);
        }

        calGrid.innerHTML = '';
        calGrid.appendChild(frag);
    }

    calPrevBtn.addEventListener('click', () => {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderCalendar();
    });

    calNextBtn.addEventListener('click', () => {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderCalendar();
    });

    function onDateClick(date) {
        selectedDate = date;
        selectedTime = null;
        renderCalendar();           // re-render to show selected state
        renderTimeSlots();
        updateStickyFooter();

        // On mobile auto-advance; on desktop stay and show sticky enabled
        if (isMobile()) {
            setTimeout(() => goToPanel(2), 200);
        } else {
            // Desktop: just update sticky (it's hidden on desktop anyway)
            // but also auto-show time panel smoothly
            goToPanel(2);
        }
    }

    // ─── TIME SLOTS ──────────────────────────────────────────
    const timeGrid = document.getElementById('timeGrid');
    const timeSelectedDate = document.getElementById('timeSelectedDate');

    function renderTimeSlots() {
        if (!selectedDate) return;
        timeSelectedDate.textContent = formatDate(selectedDate);

        const frag = document.createDocumentFragment();
        TIME_SLOTS.forEach(time => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-slot-btn';
            btn.textContent = time;

            const isBooked = bookedSlots.includes(slotKey(selectedDate, time));
            if (isBooked) {
                btn.classList.add('booked');
                btn.disabled = true;
            } else {
                if (selectedTime === time) btn.classList.add('active');
                btn.addEventListener('click', () => onTimeClick(time, btn));
            }

            frag.appendChild(btn);
        });

        timeGrid.innerHTML = '';
        timeGrid.appendChild(frag);
    }

    function onTimeClick(time, btn) {
        selectedTime = time;
        document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateStickyFooter();

        if (isMobile()) {
            setTimeout(() => goToPanel(3), 200);
        } else {
            goToPanel(3);
        }
    }

    // ─── PANEL NAVIGATION ────────────────────────────────────
    const panels = {
        1: document.getElementById('panelDate'),
        2: document.getElementById('panelTime'),
        3: document.getElementById('panelConfirm'),
    };

    const navSteps = {
        1: document.getElementById('bNav1'),
        2: document.getElementById('bNav2'),
        3: document.getElementById('bNav3'),
    };

    function goToPanel(n) {
        // Hide all
        Object.values(panels).forEach(p => p.classList.remove('active'));
        // Show target
        panels[n].classList.add('active');
        currentPanel = n;

        // Update nav pills
        Object.keys(navSteps).forEach(k => {
            const step = navSteps[k];
            const ki = parseInt(k);
            step.classList.remove('active', 'done');
            if (ki === n) step.classList.add('active');
            else if (ki < n) step.classList.add('done');
        });

        // Update confirm summary
        if (n === 3 && selectedDate && selectedTime) {
            document.getElementById('confirmSummary').textContent =
                `${formatDate(selectedDate)} at ${selectedTime}`;
        }

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        updateStickyFooter();

        // GA4
        if (typeof gtag !== 'undefined') {
            const labels = { 1: 'Date Panel', 2: 'Time Panel', 3: 'Confirm Panel' };
            gtag('event', 'booking_panel_view', { event_category: 'Booking', event_label: labels[n] });
        }
    }

    // ─── STICKY FOOTER ──────────────────────────────────────
    const bookingSticky = document.getElementById('bookingSticky');
    const stickyBackBtn = document.getElementById('stickyBackBtn');
    const stickyNextBtn = document.getElementById('stickyNextBtn');

    function isMobile() { return window.innerWidth <= 900; }

    function updateStickyFooter() {
        if (!bookingSticky) return;

        // Hide sticky on confirm panel (form has its own button)
        if (currentPanel === 3) {
            bookingSticky.style.display = 'none';
            return;
        }

        bookingSticky.style.display = 'flex';

        // Back button
        stickyBackBtn.style.display = currentPanel > 1 ? 'block' : 'none';

        // Next button state
        const canProceed = (currentPanel === 1 && selectedDate) ||
                           (currentPanel === 2 && selectedTime);

        stickyNextBtn.disabled = !canProceed;

        if (currentPanel === 1) {
            stickyNextBtn.textContent = selectedDate
                ? `Continue with ${selectedDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})} →`
                : 'Select a date to continue';
        } else if (currentPanel === 2) {
            stickyNextBtn.textContent = selectedTime
                ? `Continue with ${selectedTime} →`
                : 'Select a time to continue';
        }
    }

    stickyBackBtn.addEventListener('click', () => {
        if (currentPanel > 1) goToPanel(currentPanel - 1);
    });

    stickyNextBtn.addEventListener('click', () => {
        if (stickyNextBtn.disabled) return;
        if (currentPanel === 1 && selectedDate) goToPanel(2);
        else if (currentPanel === 2 && selectedTime) goToPanel(3);
    });

    // ─── FORM SUBMIT ─────────────────────────────────────────
    const bookingForm = document.getElementById('bookingForm');

    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name  = nameInput?.value?.trim();
            const phone = phoneInput?.value?.trim();

            if (!name || !phone) {
                alert('Please enter your name and phone number.');
                return;
            }
            if (!selectedDate || !selectedTime) {
                alert('Please go back and select a date and time.');
                return;
            }

            const confirmBtn   = document.getElementById('desktopConfirmBtn');
            const confirmText  = `${formatDate(selectedDate)} at ${selectedTime}`;

            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Confirming...';
            }

            const payload = {
                type: 'booking',
                name,
                phone,
                dateTime: confirmText,
                jobsPerMonth: prefillJobs,
                experience: prefillExp,
                status: 'Booked'
            };

            if (typeof gtag !== 'undefined') {
                gtag('event', 'booking_confirmed', { event_category: 'Booking', event_label: 'Call Booked' });
            }
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Schedule');
            }

            // Optimistic: mark slot as booked locally
            if (selectedDate && selectedTime) {
                bookedSlots.push(slotKey(selectedDate, selectedTime));
            }

            const formData = new FormData();
            formData.append('data', JSON.stringify(payload));

            fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
                .then(() => {
                    const sp = new URLSearchParams({ name, phone, dateTime: confirmText });
                    window.location.href = 'success.html?' + sp.toString();
                })
                .catch(err => {
                    console.error(err);
                    alert('Something went wrong. Please try again.');
                    if (confirmBtn) {
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = 'Confirm My Free Call →';
                    }
                });
        });
    }

    // ─── FETCH BOOKED SLOTS ──────────────────────────────────
    function fetchBookedSlots() {
        return fetch(GOOGLE_SHEET_URL + '?action=getBookings')
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data.booked)) bookedSlots = data.booked;
            })
            .catch(() => { bookedSlots = []; });
    }

    // ─── RESIZE ──────────────────────────────────────────────
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateStickyFooter, 150);
    }, { passive: true });

    // ─── INIT ─────────────────────────────────────────────────
    renderCalendar();
    updateStickyFooter();

    // Fetch booked slots in background — don't block UI
    fetchBookedSlots().then(() => {
        // Re-render time slots if a date is already selected
        if (selectedDate) renderTimeSlots();
    });

    if (typeof gtag !== 'undefined') {
        gtag('event', 'booking_page_view', { event_category: 'Booking', event_label: 'Booking Page Loaded' });
    }
});
