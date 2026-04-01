document.addEventListener('DOMContentLoaded', function () {

    const calendarGrid = document.getElementById('calendarGrid');
    const timeGrid = document.getElementById('timeGrid');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const displayDateTime = document.getElementById('displayDateTime');
    const bookingForm = document.getElementById('bookingForm');
    const userNameInput = document.getElementById('userName');
    const userPhoneInput = document.getElementById('userPhone');

    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQn65Ow5YEMMY4kNN2PNK5FzdysBV3igm5a69EAN-QeZgBgFJz2khkIhkrl3ljDYX6/exec';

    let selectedDate = null;
    let selectedTime = null;
    let bookedSlots = []; // array of "Mon Apr 1 2026 at 9:00 AM" style strings

    // ─── PRE-FILL FROM URL PARAMS ────────────────────────────
    // main.js passes name + phone as URL params when redirecting
    const params = new URLSearchParams(window.location.search);
    const prefillName = params.get('name') || '';
    const prefillPhone = params.get('phone') || '';
    const prefillSituation = params.get('situation') || '';
    const prefillExperience = params.get('experience') || '';

    if (userNameInput && prefillName) userNameInput.value = prefillName;
    if (userPhoneInput && prefillPhone) userPhoneInput.value = prefillPhone;

    // ─── GA4 ─────────────────────────────────────────────────
    if (typeof gtag !== 'undefined') {
        gtag('event', 'booking_page_view', { event_category: 'Booking', event_label: 'Booking Page Loaded' });
    }

    // ─── MOBILE DETECTION ────────────────────────────────────
    const isMobile = () => window.innerWidth <= 768;
    let mobileStep = 'calendar';
    let stickyFooter = null;
    let mobileBackBtn = null;
    let mobileContinueBtn = null;

    function buildMobileFooter() {
        if (stickyFooter) return;

        stickyFooter = document.createElement('div');
        stickyFooter.className = 'mobile-booking-sticky';
        stickyFooter.style.display = 'none';

        mobileBackBtn = document.createElement('button');
        mobileBackBtn.className = 'btn btn-secondary';
        mobileBackBtn.style.flex = '1';
        mobileBackBtn.textContent = 'Back';
        mobileBackBtn.style.display = 'none';

        mobileContinueBtn = document.createElement('button');
        mobileContinueBtn.className = 'btn btn-primary';
        mobileContinueBtn.style.flex = '2';
        mobileContinueBtn.textContent = 'Continue';

        mobileBackBtn.addEventListener('click', function () {
            if (mobileStep === 'time') goToStep('calendar');
            else if (mobileStep === 'form') goToStep('time');
        });

        mobileContinueBtn.addEventListener('click', function () {
            if (mobileContinueBtn.disabled) return;
            if (mobileStep === 'calendar' && selectedDate) goToStep('time');
            else if (mobileStep === 'time' && selectedTime) goToStep('form');
        });

        stickyFooter.appendChild(mobileBackBtn);
        stickyFooter.appendChild(mobileContinueBtn);
        document.body.appendChild(stickyFooter);
    }

    function goToStep(step) {
        mobileStep = step;
        document.body.classList.remove(
            'mobile-booking-step-calendar',
            'mobile-booking-step-time',
            'mobile-booking-step-form'
        );
        document.body.classList.add('mobile-booking-step-' + step);
        updateMobileFooter();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (typeof gtag !== 'undefined') {
            if (step === 'time') gtag('event', 'booking_date_selected', { event_category: 'Booking', event_label: 'Date Selected' });
            if (step === 'form') gtag('event', 'booking_time_selected', { event_category: 'Booking', event_label: 'Time Selected' });
        }
    }

    function updateMobileFooter() {
        if (!isMobile() || !stickyFooter) return;

        if (mobileStep === 'form') {
            stickyFooter.style.display = 'none';
            return;
        }

        stickyFooter.style.display = 'flex';
        mobileBackBtn.style.display = mobileStep === 'time' ? 'block' : 'none';

        const canContinue = (mobileStep === 'calendar' && selectedDate) ||
            (mobileStep === 'time' && selectedTime);

        mobileContinueBtn.disabled = !canContinue;
        mobileContinueBtn.style.opacity = canContinue ? '1' : '0.4';
        mobileContinueBtn.style.cursor = canContinue ? 'pointer' : 'not-allowed';
        mobileContinueBtn.textContent = mobileStep === 'calendar'
            ? 'Next: Pick a Time →'
            : 'Next: Your Details →';
    }

    function initMobileFlow() {
        if (!isMobile()) return;
        buildMobileFooter();
        document.body.classList.add('mobile-booking-flow');
        goToStep('calendar');
    }

    // ─── CALENDAR ────────────────────────────────────────────
    if (calendarGrid && currentMonthYear) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        // Figure out which month to show — the one where today+1 lands
        const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const msPerDay = 86400000;

        // tomorrow's date
        const tomorrow = new Date(todayMs + msPerDay);
        const displayYear = tomorrow.getFullYear();
        const displayMonth = tomorrow.getMonth();

        function initCalendar() {
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthYear.textContent = `${months[displayMonth]} ${displayYear}`;

            const firstDay = new Date(displayYear, displayMonth, 1).getDay();
            const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
            calendarGrid.innerHTML = '';

            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.className = 'calendar-day';
                calendarGrid.appendChild(empty);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;

                const thisDateMs = new Date(displayYear, displayMonth, day).getTime();
                const diffDays = Math.round((thisDateMs - todayMs) / msPerDay);

                if (diffDays >= 1 && diffDays <= 3) {
                    dayEl.classList.add('available');
                    dayEl.addEventListener('click', () => {
                        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                        dayEl.classList.add('selected');
                        selectedDate = new Date(displayYear, displayMonth, day);
                        updateDisplay();
                        generateTimeSlots();
                        const tsContainer = document.getElementById('timeSlotsContainer');
                        if (tsContainer && !isMobile()) tsContainer.style.display = 'block';
                        if (isMobile()) updateMobileFooter();
                    });
                }

                calendarGrid.appendChild(dayEl);
            }
        }

        initCalendar();
    }

    // ─── TIME SLOTS ──────────────────────────────────────────
    function slotKey(date, time) {
        // Canonical key: "2026-04-01|9:00 AM"
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}|${time}`;
    }

    function generateTimeSlots() {
        if (!timeGrid) return;
        timeGrid.innerHTML = '';
        const times = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
        times.forEach(time => {
            const timeBtn = document.createElement('div');
            timeBtn.className = 'time-btn';
            timeBtn.textContent = time;

            const isBooked = selectedDate && bookedSlots.includes(slotKey(selectedDate, time));

            if (isBooked) {
                timeBtn.classList.add('time-btn-booked');
                timeBtn.title = 'Already booked';
            } else {
                timeBtn.addEventListener('click', () => {
                    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                    timeBtn.classList.add('active');
                    selectedTime = time;
                    updateDisplay();
                    if (isMobile()) updateMobileFooter();
                });
            }

            timeGrid.appendChild(timeBtn);
        });
    }

    // ─── FETCH BOOKED SLOTS ──────────────────────────────────
    // Calls the Google Sheet with ?action=getBookings to retrieve taken slots
    function fetchBookedSlots() {
        return fetch(GOOGLE_SHEET_URL + '?action=getBookings')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.booked)) {
                    bookedSlots = data.booked;
                }
            })
            .catch(() => {
                // If fetch fails, proceed with no blocks — don't break the page
                bookedSlots = [];
            });
    }

    function updateDisplay() {
        if (!displayDateTime) return;
        const submitBtn = bookingForm?.querySelector('button[type="submit"]');

        if (selectedDate && selectedTime) {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            displayDateTime.textContent = `${selectedDate.toLocaleDateString(undefined, options)} at ${selectedTime}`;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-disabled');
            }
        } else if (selectedDate) {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            displayDateTime.textContent = `${selectedDate.toLocaleDateString(undefined, options)} — select a time`;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-disabled');
            }
        } else {
            displayDateTime.textContent = 'Please select a date and time';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('btn-disabled');
            }
        }
    }

    // ─── FORM SUBMIT ─────────────────────────────────────────
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = userNameInput?.value?.trim();
            const phone = userPhoneInput?.value?.trim();

            if (!name || !phone) {
                alert('Please enter your name and phone number.');
                return;
            }
            if (!selectedDate || !selectedTime) {
                alert('Please select a date and time.');
                return;
            }

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
            }

            const selectedDateTimeText = displayDateTime?.textContent || '';

            const finalData = {
                type: 'booking',
                name,
                phone,
                dateTime: selectedDateTimeText,
                situation: prefillSituation,
                experience: prefillExperience
            };

            if (typeof gtag !== 'undefined') {
                gtag('event', 'booking_confirmed', { event_category: 'Booking', event_label: 'Call Booked' });
            }
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Schedule');
            }

            const formData = new FormData();
            formData.append('data', JSON.stringify(finalData));

            // Optimistically mark this slot as booked locally before redirect
            if (selectedDate && selectedTime) {
                bookedSlots.push(slotKey(selectedDate, selectedTime));
            }

            fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
                .then(() => {
                    window.location.href = 'success.html';
                })
                .catch(error => {
                    alert('There was an error submitting. Please try again.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.remove('btn-disabled');
                        submitBtn.textContent = 'Confirm My Free Call';
                    }
                    console.error(error);
                });
        });
    }

    // ─── RESIZE ──────────────────────────────────────────────
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            if (stickyFooter) stickyFooter.style.display = 'none';
            document.body.classList.remove(
                'mobile-booking-flow',
                'mobile-booking-step-calendar',
                'mobile-booking-step-time',
                'mobile-booking-step-form'
            );
        } else {
            initMobileFlow();
        }
    });

    // ─── INIT ─────────────────────────────────────────────────
    updateDisplay();
    // Fetch booked slots from Google Sheet, then init calendar
    fetchBookedSlots().finally(() => {
        if (calendarGrid && currentMonthYear) {
            // initCalendar is defined inside the calendarGrid block above
            // so we just need to re-trigger mobile flow after data loads
        }
        initMobileFlow();
    });
});
