document.addEventListener('DOMContentLoaded', function () {

    const calendarGrid = document.getElementById('calendarGrid');
    const timeGrid = document.getElementById('timeGrid');
    const currentMonthYear = document.getElementById('currentMonthYear');
    const displayDateTime = document.getElementById('displayDateTime');
    const bookingForm = document.getElementById('bookingForm');

    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbyQn65Ow5YEMMY4kNN2PNK5FzdysBV3igm5a69EAN-QeZgBgFJz2khkIhkrl3ljDYX6/exec';

    let selectedDate = null;
    let selectedTime = null;

    // ─── PRE-FILL FROM SURVEY DATA ───────────────────────────
    const surveyData = JSON.parse(localStorage.getItem('surveyData') || '{}');
    const userNameInput = document.getElementById('userName');
    const userPhoneInput = document.getElementById('userPhone');
    if (userNameInput && surveyData.userName) userNameInput.value = surveyData.userName;
    if (userPhoneInput && surveyData.userPhone) userPhoneInput.value = surveyData.userPhone;

    // ─── GA4 TRACKING ───────────────────────────────────────
    if (typeof gtag !== 'undefined') {
        gtag('event', 'booking_page_view', { event_category: 'Booking', event_label: 'Booking Page Loaded' });
    }

    // ─── MOBILE SETUP ───────────────────────────────────────
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

        // GA4 tracking for booking steps
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

        if (mobileStep === 'calendar') {
            mobileContinueBtn.textContent = 'Next: Pick a Time →';
        } else if (mobileStep === 'time') {
            mobileContinueBtn.textContent = 'Next: Your Details →';
        }
    }

    function initMobileFlow() {
        if (!isMobile()) return;
        buildMobileFooter();
        document.body.classList.add('mobile-booking-flow');
        goToStep('calendar');
    }

    // ─── CALENDAR ───────────────────────────────────────────
    if (calendarGrid && currentMonthYear) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        function initCalendar() {
            currentMonthYear.textContent = `${months[currentMonth]} ${currentYear}`;
            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            calendarGrid.innerHTML = '';

            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.className = 'calendar-day';
                calendarGrid.appendChild(empty);
            }

            const today = now.getDate();
            const firstAvailable = today + 1;
            const lastAvailable = today + 3;

            for (let day = 1; day <= daysInMonth; day++) {
                const dayEl = document.createElement('div');
                dayEl.className = 'calendar-day';
                dayEl.textContent = day;

                if (day >= firstAvailable && day <= lastAvailable) {
                    dayEl.classList.add('available');
                    dayEl.addEventListener('click', () => {
                        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                        dayEl.classList.add('selected');
                        selectedDate = new Date(currentYear, currentMonth, day);
                        updateDisplay();
                        generateTimeSlots();
                        if (isMobile()) updateMobileFooter();
                    });
                }

                calendarGrid.appendChild(dayEl);
            }
        }

        initCalendar();
    }

    // ─── TIME SLOTS ─────────────────────────────────────────
    function generateTimeSlots() {
        if (!timeGrid) return;
        timeGrid.innerHTML = '';
        const times = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
        times.forEach(time => {
            const timeBtn = document.createElement('div');
            timeBtn.className = 'time-btn';
            timeBtn.textContent = time;
            timeBtn.addEventListener('click', () => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                timeBtn.classList.add('active');
                selectedTime = time;
                updateDisplay();
                if (isMobile()) updateMobileFooter();
            });
            timeGrid.appendChild(timeBtn);
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

    // ─── FORM SUBMIT ────────────────────────────────────────
    if (bookingForm) {
        bookingForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('userName')?.value?.trim();
            const phone = document.getElementById('userPhone')?.value?.trim();
            const selectedDateTimeText = displayDateTime?.textContent;

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

            const channels = Array.isArray(surveyData.channels) ? surveyData.channels : (surveyData.channels ? [surveyData.channels] : []);
            const finalData = {
                type: "booking",
                name,
                phone,
                dateTime: selectedDateTimeText,
                homesPerYear: surveyData.homesPerYear || "",
                channels: channels
            };

            const formData = new FormData();
            formData.append('data', JSON.stringify(finalData));

            // GA4 booking confirmed event
            if (typeof gtag !== 'undefined') {
                gtag('event', 'booking_confirmed', { event_category: 'Booking', event_label: 'Call Booked' });
            }

            fetch(GOOGLE_SHEET_URL, { method: 'POST', body: formData })
                .then(() => {
                    localStorage.setItem('lastBooking', JSON.stringify(finalData));
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

    // ─── RESIZE ─────────────────────────────────────────────
    window.addEventListener('resize', () => {
        if (!isMobile()) {
            if (stickyFooter) stickyFooter.style.display = 'none';
            document.body.classList.remove(
                'mobile-booking-flow',
                'mobile-booking-step-calendar',
                'mobile-booking-step-time',
                'mobile-booking-step-form'
            );
        }
    });

    // ─── INIT ────────────────────────────────────────────────
    updateDisplay();
    initMobileFlow();
});
