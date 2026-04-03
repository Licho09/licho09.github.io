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
    let bookedSlots = [];

    // ─── PRE-FILL FROM URL PARAMS ────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const prefillName = params.get('name') || '';
    const prefillPhone = params.get('phone') || '';
    const prefillSituation = params.get('situation') || '';
    const prefillExperience = params.get('experience') || '';

    // Pre-fill the form fields with data from index.html
    if (userNameInput && prefillName) {
        userNameInput.value = prefillName;
    }
    if (userPhoneInput && prefillPhone) {
        userPhoneInput.value = prefillPhone;
    }

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
    let mobileInitialized = false;

    function buildMobileFooter() {
        if (stickyFooter) return;

        stickyFooter = document.createElement('div');
        stickyFooter.className = 'mobile-booking-sticky';
        stickyFooter.style.cssText = 'display:none; position:fixed; bottom:0; left:0; right:0; padding:12px 16px; background:var(--bg-card,#fff); border-top:1px solid var(--border,#eee); gap:10px; z-index:999; will-change:transform; transform:translateZ(0);';

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

        // Show/hide sections based on step
        const calendarSide = document.querySelector('.booking-calendar-side');
        const formSide = document.querySelector('.booking-form-side');
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');

        if (step === 'calendar') {
            if (calendarSide) calendarSide.style.display = '';
            if (timeSlotsContainer) timeSlotsContainer.style.display = 'none';
            if (formSide) formSide.style.display = 'none';
            // Use requestAnimationFrame to avoid layout thrashing
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: 'auto' });
            });
        } else if (step === 'time') {
            if (calendarSide) calendarSide.style.display = '';
            if (timeSlotsContainer) {
                timeSlotsContainer.style.display = 'block';
                // Defer scroll to avoid jank
                requestAnimationFrame(() => {
                    timeSlotsContainer.scrollIntoView({ behavior: 'auto', block: 'start' });
                });
            }
            if (formSide) formSide.style.display = 'none';
        } else if (step === 'form') {
            if (calendarSide) calendarSide.style.display = 'none';
            if (formSide) {
                formSide.style.display = '';
                requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: 'auto' });
                });
            }
        }

        updateMobileFooter();

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
        if (!isMobile() || mobileInitialized) return;
        mobileInitialized = true;
        buildMobileFooter();

        // Add bottom padding so sticky footer doesn't cover content
        document.body.style.paddingBottom = '80px';

        // Initially hide form side and time slots on mobile
        const formSide = document.querySelector('.booking-form-side');
        const timeSlotsContainer = document.getElementById('timeSlotsContainer');
        if (formSide) formSide.style.display = 'none';
        if (timeSlotsContainer) timeSlotsContainer.style.display = 'none';

        stickyFooter.style.display = 'flex';
        updateMobileFooter();
    }

    // ─── CALENDAR ────────────────────────────────────────────
    if (calendarGrid && currentMonthYear) {
        const now = new Date();
        const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const msPerDay = 86400000;

        const tomorrow = new Date(todayMs + msPerDay);
        const displayYear = tomorrow.getFullYear();
        const displayMonth = tomorrow.getMonth();

        function initCalendar() {
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            currentMonthYear.textContent = `${months[displayMonth]} ${displayYear}`;

            const firstDay = new Date(displayYear, displayMonth, 1).getDay();
            const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
            
            // Use DocumentFragment to batch DOM updates
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.className = 'calendar-day';
                fragment.appendChild(empty);
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;

                const thisDateMs = new Date(displayYear, displayMonth, day).getTime();
                const diffDays = Math.round((thisDateMs - todayMs) / msPerDay);

                if (diffDays >= 1 && diffDays <= 3) {
                    dayEl.classList.add('available');
                    // Use event delegation to reduce event listeners
                    dayEl.dataset.day = day;
                    dayEl.addEventListener('click', handleDateClick);
                }

                fragment.appendChild(dayEl);
            }

            calendarGrid.innerHTML = '';
            calendarGrid.appendChild(fragment);
        }

        function handleDateClick(e) {
            const dayEl = e.currentTarget;
            const day = parseInt(dayEl.dataset.day);
            
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');
            selectedDate = new Date(displayYear, displayMonth, day);
            selectedTime = null; // reset time when date changes
            updateDisplay();
            generateTimeSlots();

            if (isMobile()) {
                updateMobileFooter();
                // On mobile, auto-advance to time step after picking date
                requestAnimationFrame(() => {
                    goToStep('time');
                });
            } else {
                const tsContainer = document.getElementById('timeSlotsContainer');
                if (tsContainer) tsContainer.style.display = 'block';
            }
        }

        initCalendar();
    }

    // ─── TIME SLOTS ──────────────────────────────────────────
    function slotKey(date, time) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}|${time}`;
    }

    function generateTimeSlots() {
        if (!timeGrid) return;
        
        // Use DocumentFragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        const times = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
        
        times.forEach(time => {
            const timeBtn = document.createElement('div');
            timeBtn.className = 'time-btn';
            timeBtn.textContent = time;
            timeBtn.dataset.time = time;

            const isBooked = selectedDate && bookedSlots.includes(slotKey(selectedDate, time));

            if (isBooked) {
                timeBtn.classList.add('time-btn-booked');
                timeBtn.title = 'Already booked';
            } else {
                timeBtn.addEventListener('click', handleTimeClick);
            }

            fragment.appendChild(timeBtn);
        });

        timeGrid.innerHTML = '';
        timeGrid.appendChild(fragment);
    }

    function handleTimeClick(e) {
        const timeBtn = e.currentTarget;
        const time = timeBtn.dataset.time;
        
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        timeBtn.classList.add('active');
        selectedTime = time;
        updateDisplay();
        if (isMobile()) updateMobileFooter();
    }

    // ─── FETCH BOOKED SLOTS ──────────────────────────────────
    function fetchBookedSlots() {
        return fetch(GOOGLE_SHEET_URL + '?action=getBookings')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.booked)) {
                    bookedSlots = data.booked;
                }
            })
            .catch(() => {
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
                experience: prefillExperience,
                status: 'Booked'
            };

            if (typeof gtag !== 'undefined') {
                gtag('event', 'booking_confirmed', { event_category: 'Booking', event_label: 'Call Booked' });
            }
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Schedule');
            }

            const formData = new FormData();
            formData.append('data', JSON.stringify(finalData));

            if (selectedDate && selectedTime) {
                bookedSlots.push(slotKey(selectedDate, selectedTime));
            }

            fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
                .then(() => {
                    // Pass booking details to success page via URL params
                    const successParams = new URLSearchParams({
                        name: name,
                        phone: phone,
                        dateTime: selectedDateTimeText
                    });
                    window.location.href = 'success.html?' + successParams.toString();
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
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (!isMobile()) {
                if (stickyFooter) stickyFooter.style.display = 'none';
                document.body.style.paddingBottom = '';
                // Show everything on desktop
                const formSide = document.querySelector('.booking-form-side');
                const calendarSide = document.querySelector('.booking-calendar-side');
                const timeSlotsContainer = document.getElementById('timeSlotsContainer');
                if (formSide) formSide.style.display = '';
                if (calendarSide) calendarSide.style.display = '';
                if (timeSlotsContainer) timeSlotsContainer.style.display = '';
            }
        }, 150);
    }, { passive: true });

    // ─── INIT ─────────────────────────────────────────────────
    updateDisplay();
    fetchBookedSlots().finally(() => {
        initMobileFlow();
    });
});
