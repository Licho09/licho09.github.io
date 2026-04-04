document.addEventListener('DOMContentLoaded', function () {

    // ── CONFIG ────────────────────────────────────────────────
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQn65Ow5YEMMY4kNN2PNK5FzdysBV3igm5a69EAN-QeZgBgFJz2khkIhkrl3ljDYX6/exec';
    const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // ── STATE ─────────────────────────────────────────────────
    let currentPanel = 1;
    let selectedDate = null;
    let selectedTime = null;
    let bookedSlots  = [];
    let viewYear, viewMonth;

    // ── URL PARAMS → PREFILL ──────────────────────────────────
    const params       = new URLSearchParams(window.location.search);
    const prefillName  = params.get('name')         || localStorage.getItem('leadName')  || '';
    const prefillPhone = params.get('phone')        || localStorage.getItem('leadPhone') || '';
    const prefillJobs  = params.get('jobsPerMonth') || '';
    const prefillExp   = params.get('experience')   || '';

    const nameInput  = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    if (nameInput  && prefillName)  nameInput.value  = prefillName;
    if (phoneInput && prefillPhone) phoneInput.value = prefillPhone;

    // ── DATE HELPERS ──────────────────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function dateKey(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function slotKey(date, time) {
        return `${dateKey(date)}|${time}`;
    }

    function isAvailable(d) {
        const diff = Math.round((d - today) / 86400000);
        // Tomorrow, day after, day after that — skip Sundays
        return diff >= 1 && diff <= 3 && d.getDay() !== 0;
    }

    function formatDate(d) {
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }

    // ── CALENDAR ──────────────────────────────────────────────
    const calGrid      = document.getElementById('calGrid');
    const calMonthLabel = document.getElementById('calMonthLabel');
    const calPrev      = document.getElementById('calPrev');
    const calNext      = document.getElementById('calNext');

    viewYear  = today.getFullYear();
    viewMonth = today.getMonth();

    function renderCalendar() {
        if (!calGrid || !calMonthLabel) return;

        calMonthLabel.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

        // Disable prev if we're on current month
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const viewStart = new Date(viewYear, viewMonth, 1);
        calPrev.disabled = viewStart <= thisMonth;

        const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();

        const frag = document.createDocumentFragment();

        // Blank spacers before first day
        for (let i = 0; i < firstDayOfWeek; i++) {
            const blank = document.createElement('div');
            frag.appendChild(blank);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const date  = new Date(viewYear, viewMonth, d);
            const el    = document.createElement('div');
            el.className = 'cal-day';
            el.textContent = d;

            const isToday = date.getTime() === today.getTime();
            const isPast  = date < today;

            if (isPast) {
                // grayed — default style
            } else if (isToday) {
                el.classList.add('today');
            } else if (isAvailable(date)) {
                el.classList.add('available');
                if (selectedDate && dateKey(date) === dateKey(selectedDate)) {
                    el.classList.add('selected');
                }
                el.addEventListener('click', function () {
                    onDateClick(date);
                });
            }
            // future but not in available window: stays gray (default)

            frag.appendChild(el);
        }

        calGrid.innerHTML = '';
        calGrid.appendChild(frag);
    }

    calPrev.addEventListener('click', function () {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderCalendar();
    });

    calNext.addEventListener('click', function () {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderCalendar();
    });

    function onDateClick(date) {
        selectedDate = date;
        selectedTime = null;
        renderCalendar();
        updateSticky();

        // Short delay so the user sees the selection flash, then advance
        setTimeout(function () { goToPanel(2); }, 180);
    }

    // ── TIME SLOTS ────────────────────────────────────────────
    function renderTimeSlots() {
        const grid = document.getElementById('timeGrid');
        const label = document.getElementById('selectedDateLabel');
        if (!grid) return;

        if (label && selectedDate) {
            label.textContent = formatDate(selectedDate);
        }

        const frag = document.createDocumentFragment();
        TIME_SLOTS.forEach(function (time) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'time-btn';
            btn.textContent = time;

            const booked = selectedDate && bookedSlots.includes(slotKey(selectedDate, time));
            if (booked) {
                btn.classList.add('booked');
                btn.disabled = true;
            } else {
                if (selectedTime === time) btn.classList.add('active');
                btn.addEventListener('click', function () {
                    onTimeClick(time, btn);
                });
            }

            frag.appendChild(btn);
        });

        grid.innerHTML = '';
        grid.appendChild(frag);
    }

    function onTimeClick(time, btn) {
        selectedTime = time;
        document.querySelectorAll('.time-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        updateSticky();

        setTimeout(function () { goToPanel(3); }, 180);
    }

    // ── PANEL NAVIGATION ─────────────────────────────────────
    function goToPanel(n) {
        // Hide all panels
        document.querySelectorAll('.panel').forEach(function (p) {
            p.classList.remove('active');
        });

        // Show target
        var target = document.getElementById('panel' + n);
        if (target) target.classList.add('active');
        currentPanel = n;

        // Update step nav
        ['1','2','3'].forEach(function (k) {
            var nav = document.getElementById('sNav' + k);
            var num = document.getElementById('sNum' + k);
            if (!nav || !num) return;
            nav.classList.remove('active', 'done');
            var ki = parseInt(k);
            if (ki === n)      { nav.classList.add('active'); num.textContent = k; }
            else if (ki < n)   { nav.classList.add('done');   num.innerHTML = '✓'; }
            else               { num.textContent = k; }
        });

        // Populate panels on entry
        if (n === 2) renderTimeSlots();
        if (n === 3) {
            var summary = document.getElementById('apptSummary');
            if (summary && selectedDate && selectedTime) {
                summary.textContent = formatDate(selectedDate) + ' at ' + selectedTime;
            }
        }

        // Sticky footer visibility
        var sf = document.getElementById('stickyFooter');
        if (sf) sf.style.display = (n === 3) ? 'none' : 'flex';

        updateSticky();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // GA4
        if (typeof gtag !== 'undefined') {
            gtag('event', 'booking_panel_' + n, { event_category: 'Booking' });
        }
    }

    // ── STICKY FOOTER ─────────────────────────────────────────
    var stickyBack = document.getElementById('stickyBack');
    var stickyNext = document.getElementById('stickyNext');

    function updateSticky() {
        if (!stickyNext) return;

        if (currentPanel === 3) {
            var sf = document.getElementById('stickyFooter');
            if (sf) sf.style.display = 'none';
            return;
        }

        // Show back button only on panel 2
        if (stickyBack) stickyBack.style.display = (currentPanel === 2) ? 'block' : 'none';

        if (currentPanel === 1) {
            var canGo = !!selectedDate;
            stickyNext.disabled = !canGo;
            stickyNext.textContent = canGo
                ? 'Continue with ' + selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' →'
                : 'Select a date to continue';
        } else if (currentPanel === 2) {
            var canGo2 = !!selectedTime;
            stickyNext.disabled = !canGo2;
            stickyNext.textContent = canGo2
                ? 'Continue with ' + selectedTime + ' →'
                : 'Select a time to continue';
        }
    }

    if (stickyBack) {
        stickyBack.addEventListener('click', function () {
            if (currentPanel > 1) goToPanel(currentPanel - 1);
        });
    }

    if (stickyNext) {
        stickyNext.addEventListener('click', function () {
            if (stickyNext.disabled) return;
            if (currentPanel === 1 && selectedDate) goToPanel(2);
            else if (currentPanel === 2 && selectedTime) goToPanel(3);
        });
    }

    // ── FORM SUBMIT ───────────────────────────────────────────
    var bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var name  = nameInput  ? nameInput.value.trim()  : '';
            var phone = phoneInput ? phoneInput.value.trim() : '';

            if (!name || !phone) { alert('Please enter your name and phone number.'); return; }
            if (!selectedDate || !selectedTime) { alert('Please go back and select a date and time.'); return; }

            var confirmBtn = document.getElementById('confirmBtn');
            if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Confirming...'; }

            var dateTimeText = formatDate(selectedDate) + ' at ' + selectedTime;

            var payload = {
                type: 'booking',
                name: name,
                phone: phone,
                dateTime: dateTimeText,
                jobsPerMonth: prefillJobs,
                experience: prefillExp,
                status: 'Booked'
            };

            if (typeof gtag !== 'undefined') gtag('event', 'booking_confirmed', { event_category: 'Booking' });
            if (typeof fbq  !== 'undefined') fbq('track', 'Schedule');

            // Mark slot booked locally
            if (selectedDate && selectedTime) bookedSlots.push(slotKey(selectedDate, selectedTime));

            var fd = new FormData();
            fd.append('data', JSON.stringify(payload));

            fetch(GOOGLE_SHEET_URL, { method: 'POST', body: fd })
                .then(function () {
                    var sp = new URLSearchParams({ name: name, phone: phone, dateTime: dateTimeText });
                    window.location.href = 'success.html?' + sp.toString();
                })
                .catch(function (err) {
                    console.error(err);
                    alert('Something went wrong. Please try again.');
                    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm My Free Call →'; }
                });
        });
    }

    // ── FETCH BOOKED SLOTS ────────────────────────────────────
    fetch(GOOGLE_SHEET_URL + '?action=getBookings')
        .then(function (r) { return r.json(); })
        .then(function (data) { if (Array.isArray(data.booked)) bookedSlots = data.booked; })
        .catch(function () { bookedSlots = []; });

    // ── INIT ──────────────────────────────────────────────────
    renderCalendar();
    updateSticky();

    if (typeof gtag !== 'undefined') gtag('event', 'booking_page_view', { event_category: 'Booking' });
});
