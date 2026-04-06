document.addEventListener('DOMContentLoaded', function () {

    // ── CONFIG ────────────────────────────────────────────────
    var GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQn65Ow5YEMMY4kNN2PNK5FzdysBV3igm5a69EAN-QeZgBgFJz2khkIhkrl3ljDYX6/exec';

    // ── ELEMENT REFS ──────────────────────────────────────────
    var bookingForm        = document.getElementById('bookingForm');
    var calendarGrid       = document.getElementById('calendarGrid');
    var timeGrid           = document.getElementById('timeGrid');
    var currentMonthYear   = document.getElementById('currentMonthYear');
    var displayDateTime    = document.getElementById('displayDateTime');
    var timeSlotsContainer = document.getElementById('timeSlotsContainer');
    var confirmBtn         = document.getElementById('confirmBtn');
    var nameInput          = document.getElementById('userName');
    var phoneInput         = document.getElementById('userPhone');
    var smsOptInChk        = document.getElementById('smsOptIn');

    // Mobile elements
    var mobileStickyFooter = document.getElementById('mobileBookingStickyFooter');
    var mobileBackBtn      = document.getElementById('mobileBackBtn');
    var mobileContinueBtn  = document.getElementById('mobileContinueBtn');
    var mobileStepLabel    = document.getElementById('mobileStepLabel');
    var dot1 = document.getElementById('dot1');
    var dot2 = document.getElementById('dot2');
    var dot3 = document.getElementById('dot3');

    // ── STATE ─────────────────────────────────────────────────
    var selectedDate = null;
    var selectedTime = null;
    var bookedSlots  = [];
    var isMobile     = window.innerWidth <= 768;
    var mobileStep   = 'calendar';

    // ── URL PARAMS → PREFILL ──────────────────────────────────
    var params      = new URLSearchParams(window.location.search);
    var prefillName = params.get('name')      || localStorage.getItem('leadName')  || '';
    var prefillPhone= params.get('phone')     || localStorage.getItem('leadPhone') || '';
    var prefillSit  = params.get('situation') || '';
    var prefillExp  = params.get('experience')|| '';

    if (nameInput  && prefillName)  nameInput.value  = prefillName;
    if (phoneInput && prefillPhone) phoneInput.value = prefillPhone;

    // ── MOBILE DETECTION ──────────────────────────────────────
    function checkMobile() {
        isMobile = window.innerWidth <= 768;
        if (isMobile) enterMobileFlow();
        else exitMobileFlow();
    }

    function enterMobileFlow() {
        document.body.classList.add('mobile-booking-flow');
        setMobileStep(mobileStep);
        if (mobileStickyFooter) mobileStickyFooter.style.display = 'flex';
    }

    function exitMobileFlow() {
        document.body.classList.remove('mobile-booking-flow','mobile-booking-step-calendar','mobile-booking-step-time','mobile-booking-step-form');
        if (timeSlotsContainer) timeSlotsContainer.style.display = '';
        if (mobileStickyFooter) mobileStickyFooter.style.display = 'none';
    }

    // ── MOBILE STEP MANAGEMENT ────────────────────────────────
    function setMobileStep(step) {
        mobileStep = step;
        document.body.classList.remove('mobile-booking-step-calendar','mobile-booking-step-time','mobile-booking-step-form');
        document.body.classList.add('mobile-booking-step-' + step);

        if (dot1 && dot2 && dot3) {
            dot1.className = 'mobile-step-dot';
            dot2.className = 'mobile-step-dot';
            dot3.className = 'mobile-step-dot';
            if (step === 'calendar') {
                dot1.classList.add('active');
                if (mobileStepLabel) mobileStepLabel.textContent = 'Select a Date';
            } else if (step === 'time') {
                dot1.classList.add('done');
                dot2.classList.add('active');
                if (mobileStepLabel) mobileStepLabel.textContent = 'Pick a Time';
            } else if (step === 'form') {
                dot1.classList.add('done');
                dot2.classList.add('done');
                dot3.classList.add('active');
                if (mobileStepLabel) mobileStepLabel.textContent = 'Confirm';
            }
        }

        updateMobileButtons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateMobileButtons() {
        if (!mobileStickyFooter || !isMobile) return;

        if (mobileStep === 'form') {
            mobileStickyFooter.style.display = 'none';
            return;
        }

        mobileStickyFooter.style.display = 'flex';

        if (mobileStep === 'calendar') {
            if (mobileBackBtn) mobileBackBtn.style.display = 'none';
            if (mobileContinueBtn) {
                mobileContinueBtn.textContent = selectedDate ? 'Next: Pick a Time →' : 'Select a date first';
                mobileContinueBtn.style.opacity = selectedDate ? '1' : '0.5';
                mobileContinueBtn.disabled = !selectedDate;
            }
        } else if (mobileStep === 'time') {
            if (mobileBackBtn) mobileBackBtn.style.display = 'block';
            if (mobileContinueBtn) {
                mobileContinueBtn.textContent = selectedTime ? 'Next: Confirm Details →' : 'Select a time first';
                mobileContinueBtn.style.opacity = selectedTime ? '1' : '0.5';
                mobileContinueBtn.disabled = !selectedTime;
            }
        }
    }

    if (mobileContinueBtn) {
        mobileContinueBtn.addEventListener('click', function () {
            if (mobileStep === 'calendar' && selectedDate) setMobileStep('time');
            else if (mobileStep === 'time' && selectedTime) setMobileStep('form');
        });
    }

    if (mobileBackBtn) {
        mobileBackBtn.addEventListener('click', function () {
            if (mobileStep === 'time') setMobileStep('calendar');
            else if (mobileStep === 'form') setMobileStep('time');
        });
    }

    // ── CALENDAR ──────────────────────────────────────────────
    if (calendarGrid && currentMonthYear) {
        var now          = new Date();
        var currentYear  = now.getFullYear();
        var currentMonth = now.getMonth();
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        function initCalendar() {
            currentMonthYear.textContent = months[currentMonth] + ' ' + currentYear;
            var firstDay    = new Date(currentYear, currentMonth, 1).getDay();
            var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            calendarGrid.innerHTML = '';

            for (var i = 0; i < firstDay; i++) {
                var empty = document.createElement('div');
                empty.className = 'calendar-day';
                calendarGrid.appendChild(empty);
            }

            var today  = now.getDate();
            var maxDay = today + 3;

            for (var day = 1; day <= daysInMonth; day++) {
                var dayEl     = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;

                var dayOfWeek = new Date(currentYear, currentMonth, day).getDay();

                if (day > today && day <= maxDay && dayOfWeek !== 0) {
                    dayEl.classList.add('available');
                    (function (d, el) {
                        el.addEventListener('click', function () {
                            document.querySelectorAll('.calendar-day').forEach(function (c) { c.classList.remove('selected'); });
                            el.classList.add('selected');
                            selectedDate = new Date(currentYear, currentMonth, d);
                            selectedTime = null;
                            updateDisplay();
                            generateTimeSlots();
                            if (!isMobile && timeSlotsContainer) timeSlotsContainer.style.display = 'block';
                            if (isMobile) updateMobileButtons();
                        });
                    })(day, dayEl);
                }

                calendarGrid.appendChild(dayEl);
            }
        }

        initCalendar();
    }

    // ── TIME SLOTS ────────────────────────────────────────────
    function generateTimeSlots() {
        if (!timeGrid) return;
        timeGrid.innerHTML = '';
        var times = ['9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'];
        times.forEach(function (time) {
            var btn = document.createElement('div');
            btn.className = 'time-btn';
            btn.textContent = time;

            var key      = selectedDate ? slotKey(selectedDate, time) : null;
            var isBooked = key && bookedSlots.includes(key);

            if (isBooked) {
                btn.style.opacity = '0.4';
                btn.style.textDecoration = 'line-through';
                btn.style.cursor = 'not-allowed';
            } else {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('.time-btn').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    selectedTime = time;
                    updateDisplay();
                    if (isMobile) updateMobileButtons();
                });
            }

            timeGrid.appendChild(btn);
        });
    }

    function slotKey(date, time) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d + '|' + time;
    }

    // ── DISPLAY & VALIDATION ──────────────────────────────────
    function updateDisplay() {
        if (!displayDateTime) return;
        if (selectedDate && selectedTime) {
            var opts = { weekday: 'short', month: 'short', day: 'numeric' };
            displayDateTime.textContent = selectedDate.toLocaleDateString(undefined, opts) + ' at ' + selectedTime;
        } else if (selectedDate) {
            var opts2 = { weekday: 'short', month: 'short', day: 'numeric' };
            displayDateTime.textContent = selectedDate.toLocaleDateString(undefined, opts2) + ' — select a time';
        } else {
            displayDateTime.textContent = 'Please select a date and time';
        }
        validateForm();
    }

    function validateForm() {
        var name    = nameInput  ? nameInput.value.trim()  : '';
        var phone   = phoneInput ? phoneInput.value.trim() : '';
        var hasSlot = !!(selectedDate && selectedTime);
        var valid   = !!(name && phone && hasSlot);
        if (confirmBtn) {
            confirmBtn.disabled = !valid;
            confirmBtn.classList.toggle('btn-disabled', !valid);
        }
    }

    if (nameInput)  nameInput.addEventListener('input', validateForm);
    if (phoneInput) phoneInput.addEventListener('input', validateForm);

    // ── FETCH BOOKED SLOTS ────────────────────────────────────
    function fetchBookedSlots() {
        return fetch(GOOGLE_SHEET_URL + '?action=getBookings')
            .then(function (r) { return r.json(); })
            .then(function (data) { if (Array.isArray(data.booked)) bookedSlots = data.booked; })
            .catch(function () { bookedSlots = []; });
    }

    // ── FORM SUBMIT ───────────────────────────────────────────
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var name  = nameInput  ? nameInput.value.trim()  : '';
            var phone = phoneInput ? phoneInput.value.trim() : '';
            var optIn = smsOptInChk ? smsOptInChk.checked : false;

            if (!name || !phone) { alert('Please enter your name and phone number.'); return; }
            if (!selectedDate || !selectedTime) { alert('Please select a date and time.'); return; }

            var submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Processing...'; }

            var dateTimeText = displayDateTime ? displayDateTime.textContent : '';

            var payload = {
                type: 'booking', name: name, phone: phone,
                dateTime: dateTimeText, situation: prefillSit,
                experience: prefillExp, smsOptIn: optIn ? 'Yes' : 'No', status: 'Booked'
            };

            if (typeof gtag !== 'undefined') gtag('event', 'booking_confirmed', { event_category: 'Booking' });
            if (typeof fbq  !== 'undefined') fbq('track', 'Schedule');

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
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm My Free Call →'; }
                });
        });
    }

    // ── RESIZE ────────────────────────────────────────────────
    window.addEventListener('resize', checkMobile);

    // ── INIT ──────────────────────────────────────────────────
    fetchBookedSlots().finally(function () { checkMobile(); });
    updateDisplay();
    if (typeof gtag !== 'undefined') gtag('event', 'booking_page_view', { event_category: 'Booking' });
});
