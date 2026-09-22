// Wedding Invitation Interactive Controller

let lenis = null;

function initSmoothScroll() {
    if (typeof Lenis === 'undefined') return;

    lenis = new Lenis({
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.15,
        infinite: false,
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    lenis.on('scroll', () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.update();
        }
    });

    if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => {
            if (lenis) lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);
    }

    // Keep scroll stopped initially until video unlocks
    if (!isScrollUnlocked) {
        lenis.stop();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSmoothScroll();
    initVideoAndOverlay();
    initAudioController();
    initCountdownTimer();
    initBlessingsCarousel();
    initAutoWishesCarousel();
    initGsapTextAnimations();
});

// Scroll locking handler until video ends
let isScrollUnlocked = false;

function preventDefaultScroll(e) {
    if (!isScrollUnlocked) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}

function lockScroll() {
    isScrollUnlocked = false;
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');
    if (lenis) lenis.stop();
    window.addEventListener('wheel', preventDefaultScroll, { passive: false });
    window.addEventListener('touchmove', preventDefaultScroll, { passive: false });
}

function unlockScroll() {
    isScrollUnlocked = true;
    document.documentElement.classList.remove('scroll-locked');
    document.body.classList.remove('scroll-locked');
    if (lenis) {
        lenis.start();
        lenis.resize();
    }
    window.removeEventListener('wheel', preventDefaultScroll);
    window.removeEventListener('touchmove', preventDefaultScroll);
}

// 1. VIDEO CONTROLLER: PAUSED AT FRAME 0, PLAYS ONLY ON USER TOUCH, FREEZES ON LAST FRAME, 5-SEC TEXT REVEAL & UNLOCK SCROLL
function initVideoAndOverlay() {
    const video = document.getElementById('invitation-video');
    const heroSection = document.getElementById('hero-section');
    const textOverlay = document.getElementById('reference-text-overlay');
    const touchCue = document.getElementById('touch-cue-badge');
    const scrollPrompt = document.getElementById('scroll-prompt-container');

    if (!video || !textOverlay) return;

    let isPlaying = false;
    let hasRevealed = false;
    let revealTimer = null;

    // Initially lock page scroll & hide scroll button until video finishes
    lockScroll();
    if (scrollPrompt) {
        scrollPrompt.style.opacity = '0';
        scrollPrompt.style.pointerEvents = 'none';
        scrollPrompt.style.transition = 'opacity 0.8s ease';
    }

    // Ensure video is paused on first frame initially & muted
    video.pause();
    video.currentTime = 0;
    video.muted = true;
    video.volume = 0;

    const startPlayback = () => {
        if (isPlaying) return;
        isPlaying = true;

        // Hide touch cue badge
        if (touchCue) {
            touchCue.style.opacity = '0';
            setTimeout(() => {
                touchCue.style.display = 'none';
            }, 700);
        }

        // Play video (MUTED - user explicitly requested: mute the video volume, video sound no needed)
        video.muted = true;
        video.volume = 0;
        video.play().catch(err => {
            console.log('Video playback error', err);
            video.muted = true;
            video.volume = 0;
            video.play();
        });

        // Start background wedding audio (looping repeat)
        if (!isMusicPlaying) {
            playBackgroundMusic();
        }

        // Set 4.0-second timer fallback to reveal text & unlock scroll
        if (revealTimer) clearTimeout(revealTimer);
        revealTimer = setTimeout(() => {
            revealText();
        }, 4000);
    };

    const revealText = () => {
        if (hasRevealed) return;
        hasRevealed = true;
        textOverlay.classList.add('typography-revealed');
        textOverlay.style.pointerEvents = 'auto';

        // UNLOCK SCROLLING ONCE VIDEO ENDS / REVEALS TEXT
        unlockScroll();
        if (typeof ScrollTrigger !== 'undefined') {
            setTimeout(() => ScrollTrigger.refresh(), 100);
        }
        if (scrollPrompt) {
            scrollPrompt.style.opacity = '1';
            scrollPrompt.style.pointerEvents = 'auto';
        }

        // Choreographed GSAP Hero Typography Reveal
        animateHeroTypography();

        // Start floating floral particles ONLY when video finishes and invitation opens
        initFloralParticles();
    };

    // User touch or click anywhere in hero section triggers playback
    if (heroSection) {
        heroSection.addEventListener('click', (e) => {
            if (e.target.closest('#scroll-prompt-container')) {
                return;
            }
            startPlayback();
        });
        
        heroSection.addEventListener('touchstart', (e) => {
            if (e.target.closest('#scroll-prompt-container')) {
                return;
            }
            startPlayback();
        }, { passive: true });
    }

    // Monitor playback time to reveal text & enable scroll after 4.0 seconds
    video.addEventListener('timeupdate', () => {
        if (video.currentTime >= 4.0 && !hasRevealed) {
            revealText();
        }
    });

    // When video ends: FREEZE on last frame (do not loop) & keep text visible & unlock scroll
    video.addEventListener('ended', () => {
        video.pause();
        revealText();
    });
}

// 2. BACKGROUND WEDDING AUDIO (REPEATING NASHEED & FLOATING CONTROLS)
let isMusicPlaying = false;
let weddingAudio = null;

function getWeddingAudio() {
    if (!weddingAudio) {
        weddingAudio = document.getElementById('wedding-audio');
        if (weddingAudio) {
            weddingAudio.loop = true;
            // Additional fallback guarantee: restart immediately whenever track ends
            weddingAudio.addEventListener('ended', () => {
                weddingAudio.currentTime = 0;
                weddingAudio.play().catch(e => console.log('Repeat play error:', e));
            });
        }
    }
    return weddingAudio;
}

function initAudioController() {
    const widget = document.getElementById('audio-control-widget');
    const toggleBtn = document.getElementById('toggle-music-btn');
    if (!widget) return;

    // Ensure initial paused state
    widget.classList.add('music-paused');

    const togglePlayback = (e) => {
        if (e) e.stopPropagation();
        if (isMusicPlaying) {
            pauseBackgroundMusic();
        } else {
            playBackgroundMusic();
        }
    };

    if (toggleBtn) {
        toggleBtn.addEventListener('click', togglePlayback);
    }
    widget.addEventListener('click', (e) => {
        if (e.target.closest('#toggle-music-btn')) return;
        togglePlayback(e);
    });
}

function playBackgroundMusic() {
    const audio = getWeddingAudio();
    const widget = document.getElementById('audio-control-widget');
    const label = document.getElementById('audio-label');

    if (!audio) return;

    audio.loop = true;
    audio.volume = 1.0;

    isMusicPlaying = true;
    if (widget) widget.classList.remove('music-paused');
    if (label) label.textContent = 'Audio Playing';

    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => {
            console.log('Audio autoplay prevented or interaction required:', err);
            isMusicPlaying = false;
            if (widget) widget.classList.add('music-paused');
            if (label) label.textContent = 'Audio Muted';
        });
    }
}

function pauseBackgroundMusic() {
    const audio = getWeddingAudio();
    const widget = document.getElementById('audio-control-widget');
    const label = document.getElementById('audio-label');

    isMusicPlaying = false;
    if (audio) {
        audio.pause();
    }
    if (widget) widget.classList.add('music-paused');
    if (label) label.textContent = 'Audio Muted';
}

// 3. COUNTDOWN TIMER
function initCountdownTimer() {
    const weddingDate = new Date('December 12, 2026 11:00:00').getTime();

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (!daysEl) return;

    // Subtle premium transition (short vertical glide + fade ~300ms, only when changing)
    function updateDigit(el, val) {
        if (!el) return;
        const formatted = val < 10 ? '0' + val : '' + val;
        if (el.textContent === formatted) return;

        el.classList.add('digit-exit');
        setTimeout(() => {
            el.textContent = formatted;
            el.classList.remove('digit-exit');
        }, 120);
    }

    function updateTimer() {
        const now = new Date().getTime();
        const difference = weddingDate - now;

        if (difference < 0) {
            updateDigit(daysEl, 0);
            updateDigit(hoursEl, 0);
            updateDigit(minutesEl, 0);
            updateDigit(secondsEl, 0);
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        updateDigit(daysEl, days);
        updateDigit(hoursEl, hours);
        updateDigit(minutesEl, minutes);
        updateDigit(secondsEl, seconds);
    }

    updateTimer();
    setInterval(updateTimer, 1000);
}

// 4. RSVP SUBMISSION WITH CELEBRATORY CONFETTI
function handleRSVPSubmit(e) {
    e.preventDefault();

    const nameInput = document.getElementById('guest-name');
    const wishesInput = document.getElementById('wishes-msg');
    const form = document.getElementById('rsvp-form');
    const successBox = document.getElementById('rsvp-success-box');
    const wishesContainer = document.getElementById('wishes-container');

    const guestName = nameInput ? nameInput.value.trim() : '';
    const guestWish = wishesInput ? wishesInput.value.trim() : '';

    // Trigger celebration confetti
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ffd700', '#e5a91f', '#ffffff', '#f6d56d', '#ff9a9e']
        });
    }

    // Hide form & show confirmation
    form.style.display = 'none';
    successBox.classList.remove('hidden');

    // Add wish to live feed if provided
    if (guestWish && wishesContainer) {
        const newWishEl = document.createElement('div');
        newWishEl.className = 'p-4 rounded-xl bg-night-900/80 border border-gold-400/40 text-xs sm:text-sm shadow-md animate-fade-in';
        newWishEl.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-cinzel text-gold-400 font-bold">${escapeHtml(guestName)}</span>
                <span class="text-[10px] text-gold-300/70 font-sans">Just now 🤍</span>
            </div>
            <p class="font-serif italic text-slate-200">"${escapeHtml(guestWish)}"</p>
        `;
        wishesContainer.insertBefore(newWishEl, wishesContainer.firstChild);
    }
}

// 5. ADD TO CALENDAR HELPERS
function addToGoogleCalendar() {
    const title = encodeURIComponent("Safina & Ghalib — Nikah Ceremony");
    const details = encodeURIComponent("Join us in celebrating the holy Nikah union of Safina & Ghalib at Royal Heritage Palace.");
    const location = encodeURIComponent("Royal Heritage Palace, Lake Palace Road, Udaipur, Rajasthan");
    const dates = "20261212T053000Z/20261212T160000Z";

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    window.open(googleCalendarUrl, '_blank');
}

function downloadICS() {
    const icsData = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Safina & Ghalib Wedding//EN",
        "BEGIN:VEVENT",
        "SUMMARY:Safina & Ghalib Nikah Ceremony",
        "DESCRIPTION:Join us for the holy Nikah ceremony of Safina & Ghalib at Royal Heritage Palace.",
        "LOCATION:Royal Heritage Palace, Lake Palace Road, Udaipur",
        "DTSTART:20261212T053000Z",
        "DTEND:20261212T160000Z",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'Safina-Ghalib-Nikah.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 6. SMOOTH SCROLL HELPER
function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    if (lenis) {
        lenis.scrollTo(el, { duration: 1.35, offset: -10 });
    } else {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// 7. BLESSINGS & MOMENTS CAROUSEL CONTROLLER
function initBlessingsCarousel() {
    const slides = document.querySelectorAll('.blessing-slide');
    const dots = document.querySelectorAll('.blessing-dot');
    const prevBtn = document.getElementById('blessing-prev-btn');
    const nextBtn = document.getElementById('blessing-next-btn');
    const card = document.getElementById('blessing-card');

    if (!slides.length) return;

    let currentIndex = 0;
    let isAnimating = false;

    function goToSlide(index) {
        if (isAnimating) return;
        if (index === currentIndex) return;
        isAnimating = true;

        const currentSlide = slides[currentIndex];
        const nextIndex = (index + slides.length) % slides.length;
        const nextSlide = slides[nextIndex];

        // Fade out current
        currentSlide.style.opacity = '0';
        currentSlide.style.transform = index > currentIndex ? 'translateX(-12px)' : 'translateX(12px)';

        setTimeout(() => {
            currentSlide.classList.add('hidden');
            currentSlide.style.transform = '';

            // Prep and fade in next
            nextSlide.classList.remove('hidden');
            nextSlide.style.opacity = '0';
            nextSlide.style.transform = index > currentIndex ? 'translateX(12px)' : 'translateX(-12px)';

            // Force reflow
            void nextSlide.offsetWidth;

            nextSlide.style.opacity = '1';
            nextSlide.style.transform = 'translateX(0)';

            currentIndex = nextIndex;
            updateDots();

            setTimeout(() => {
                isAnimating = false;
            }, 300);
        }, 200);
    }

    function updateDots() {
        dots.forEach((dot, idx) => {
            if (idx === currentIndex) {
                dot.classList.remove('bg-[#e8d5ca]', 'w-2');
                dot.classList.add('bg-[#882937]', 'w-3.5');
            } else {
                dot.classList.remove('bg-[#882937]', 'w-3.5');
                dot.classList.add('bg-[#e8d5ca]', 'w-2');
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToSlide(currentIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToSlide(currentIndex + 1);
        });
    }

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            goToSlide(idx);
        });
    });

    // Mobile touch swipe support
    if (card) {
        let touchStartX = 0;
        let touchEndX = 0;

        card.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const swipeThreshold = 40;
            const diff = touchEndX - touchStartX;
            if (Math.abs(diff) > swipeThreshold) {
                if (diff < 0) {
                    // Swiped left -> next
                    goToSlide(currentIndex + 1);
                } else {
                    // Swiped right -> prev
                    goToSlide(currentIndex - 1);
                }
            }
        }
    }

    // Set initial dot state
    updateDots();
}

// 6. AUTO-SLIDING WISHES CAROUSEL (5 SECONDS INTERVAL)
function initAutoWishesCarousel() {
    const container = document.getElementById('wishes-carousel');
    if (!container) return;

    const slides = container.querySelectorAll('.wish-slide');
    const dots = container.querySelectorAll('.wish-dot');
    if (slides.length === 0) return;

    let currentIndex = 0;
    let autoTimer = null;
    let resumeTimeout = null;
    const intervalTime = 5000; // 5 seconds

    function showSlide(index) {
        const nextIndex = (index + slides.length) % slides.length;
        const currentSlide = slides[currentIndex];
        const nextSlide = slides[nextIndex];

        // Update dot indicator immediately
        dots.forEach((dot, idx) => {
            if (idx === nextIndex) {
                dot.style.backgroundColor = '#7a1d2e';
            } else {
                dot.style.backgroundColor = '#ecd2cf';
            }
        });

        if (nextIndex === currentIndex) {
            nextSlide.classList.remove('opacity-0', 'translate-y-3', '-translate-y-2', 'pointer-events-none');
            nextSlide.classList.add('opacity-100', 'translate-y-0');
            return;
        }

        // Fade out current slide
        currentSlide.classList.remove('opacity-100', 'translate-y-0');
        currentSlide.classList.add('opacity-0', '-translate-y-2', 'pointer-events-none');

        setTimeout(() => {
            // Reset all other slides
            slides.forEach((s, i) => {
                if (i !== nextIndex) {
                    s.classList.remove('opacity-100', 'translate-y-0', '-translate-y-2');
                    s.classList.add('opacity-0', 'translate-y-3', 'pointer-events-none');
                }
            });

            // Fade in next slide
            nextSlide.classList.remove('opacity-0', 'translate-y-3', '-translate-y-2', 'pointer-events-none');
            nextSlide.classList.add('opacity-100', 'translate-y-0');
            currentIndex = nextIndex;
        }, 300);
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function startTimer() {
        stopTimer();
        autoTimer = setInterval(nextSlide, intervalTime);
    }

    function stopTimer() {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        if (resumeTimeout) {
            clearTimeout(resumeTimeout);
            resumeTimeout = null;
        }
    }

    function pauseAndResumeLater() {
        stopTimer();
        resumeTimeout = setTimeout(() => {
            startTimer();
        }, 3000);
    }

    // Hover pause & resume
    container.addEventListener('mouseenter', stopTimer);
    container.addEventListener('mouseleave', startTimer);

    // Touch interaction
    container.addEventListener('touchstart', pauseAndResumeLater, { passive: true });
    container.addEventListener('touchend', startTimer, { passive: true });

    // Optional click on dots
    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            showSlide(idx);
            startTimer();
        });
    });

    // Set initial dot styles and start
    showSlide(0);
    startTimer();
}

// 7. FLOATING FLORAL PARTICLES (GENTLE AIR BREEZE - HORIZONTAL/DIAGONAL WIND FLOW)
let floralParticlesInitialized = false;

function initFloralParticles() {
    if (floralParticlesInitialized) return;
    floralParticlesInitialized = true;

    const container = document.getElementById('floral-particles-container');
    if (!container) return;

    // Respect user's motion preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const sprites = [
        'assets/images/floating_petals/petal_1.png',
        'assets/images/floating_petals/petal_2.png',
        'assets/images/floating_petals/petal_3.png',
        'assets/images/floating_petals/petal_4.png',
        'assets/images/floating_petals/blossom_1.png',
        'assets/images/floating_petals/blossom_2.png',
        'assets/images/floating_petals/blossom_3.png',
        'assets/images/floating_petals/rosebud_1.png',
        'assets/images/floating_petals/rosebud_2.png',
        'assets/images/floating_petals/leaf_1.png',
        'assets/images/floating_petals/leaf_2.png',
        'assets/images/floating_petals/leaf_3.png'
    ];

    const isMobile = window.innerWidth < 768;
    // Subtle count: Desktop 5 (within 4-6 max), Mobile 3 (within 2-3 max)
    const maxParticles = isMobile ? 3 : 5;

    let particles = [];
    let animationFrameId = null;

    class WindParticle {
        constructor() {
            this.el = document.createElement('img');
            this.el.className = 'floral-particle';
            this.el.alt = '';
            this.el.setAttribute('aria-hidden', 'true');
            this.active = false;
            this.opacity = 0;
            this.currentX = -200;
            this.currentY = -200;
            this.size = 16;

            // Touch / Click impulse state
            this.targetImpulseX = 0;
            this.targetImpulseY = 0;
            this.targetImpulseRot = 0;
            this.impulseDuration = 900;
            this.impulseStartTime = 0;
            this.isImpulsed = false;

            // Interactive response: reacts to touch/tap on mobile and click/hover on desktop
            const triggerReaction = (clientX, clientY, isHover = false) => {
                if (!this.active || this.opacity < 0.15) return;

                const pCenterX = this.currentX + this.size / 2;
                const pCenterY = this.currentY + this.size / 2;

                let dx = pCenterX - clientX;
                let dy = pCenterY - clientY;

                // Center hit or missing coordinates: push forward along wind flow
                if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                    const windDir = (this.endX > this.startX) ? 1 : -1;
                    dx = windDir * 35;
                    dy = -25;
                }

                const dist = Math.hypot(dx, dy) || 1;
                const nx = dx / dist;
                const ny = dy / dist;

                // Natural burst force
                const force = isHover ? (25 + Math.random() * 15) : (48 + Math.random() * 26);
                
                this.targetImpulseX = nx * force;
                // Add slight upward thermal lift on touch
                this.targetImpulseY = (ny * (force * 0.75)) - (12 + Math.random() * 14);
                this.targetImpulseRot = (Math.random() - 0.5) * (isHover ? 45 : 85);
                this.impulseDuration = 800 + Math.random() * 350; // 800ms to 1150ms
                this.impulseStartTime = performance.now();
                this.isImpulsed = true;
            };

            // Touch / Click handling (doesn't trigger for other flowers)
            this.el.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                triggerReaction(e.clientX, e.clientY, false);
            }, { passive: false });

            // Desktop hover nudge (subtle breeze swirl when cursor brushes over)
            this.el.addEventListener('mouseenter', (e) => {
                if (e.pointerType === 'mouse' && !this.isImpulsed) {
                    triggerReaction(e.clientX, e.clientY, true);
                }
            });

            container.appendChild(this.el);
        }

        spawnJourney(currentTime) {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const isMob = vw < 768;

            // Pick random curated delicate sprite
            this.el.src = sprites[Math.floor(Math.random() * sprites.length)];

            // Subtle delicate size: 11-16px on mobile, 14-22px on desktop (no large flowers)
            this.size = isMob ? (11 + Math.random() * 5) : (14 + Math.random() * 8);
            this.el.style.width = `${this.size.toFixed(1)}px`;
            this.el.style.height = 'auto';

            // Subtle natural opacity: 0.45 to 0.72
            this.maxOpacity = 0.45 + Math.random() * 0.27;

            // Reset impulse
            this.isImpulsed = false;

            // JOURNEY DURATION: 20 to 32 seconds per journey (very slow, effortless drift)
            this.duration = (20 + Math.random() * 12) * 1000;
            this.startTime = currentTime || performance.now();

            // WIND FLOW DIRECTION:
            // ~48% Left -> Right (drifting east)
            // ~42% Right -> Left (drifting west)
            // ~10% Diagonal across from top edge
            const flowType = Math.random();

            if (flowType < 0.48) {
                // Left -> Right
                this.startX = -40 - Math.random() * 40;
                this.endX = vw + 40 + Math.random() * 40;
                this.yBaseStart = vh * (0.15 + Math.random() * 0.70);
                this.yBaseEnd = this.yBaseStart + (Math.random() - 0.5) * (vh * 0.28);
            } else if (flowType < 0.90) {
                // Right -> Left
                this.startX = vw + 40 + Math.random() * 40;
                this.endX = -40 - Math.random() * 40;
                this.yBaseStart = vh * (0.15 + Math.random() * 0.70);
                this.yBaseEnd = this.yBaseStart + (Math.random() - 0.5) * (vh * 0.28);
            } else {
                // Diagonal across from top-corner edge
                const fromLeft = Math.random() < 0.5;
                if (fromLeft) {
                    this.startX = -40 - Math.random() * 30;
                    this.endX = vw + 40 + Math.random() * 40;
                    this.yBaseStart = -15 - Math.random() * 25;
                    this.yBaseEnd = vh * (0.30 + Math.random() * 0.50);
                } else {
                    this.startX = vw + 40 + Math.random() * 30;
                    this.endX = -40 - Math.random() * 40;
                    this.yBaseStart = -15 - Math.random() * 25;
                    this.yBaseEnd = vh * (0.30 + Math.random() * 0.50);
                }
            }

            // MULTI-POINT ORGANIC CURVATURE:
            // Harmonics creating natural rises, gentle dips, upward curves, and thermal breezes
            this.waveAmp1 = (isMob ? 20 : 35) + Math.random() * (isMob ? 25 : 45); // Primary breeze curve (35-80px)
            this.waveAmp2 = 12 + Math.random() * 20; // Secondary harmonic
            this.waveFreq1 = (1 + Math.floor(Math.random() * 2)) * Math.PI;
            this.waveFreq2 = (2 + Math.floor(Math.random() * 2)) * Math.PI;
            this.wavePhase1 = Math.random() * Math.PI * 2;
            this.wavePhase2 = Math.random() * Math.PI * 2;

            // Subtle micro-wobble as if caught by air
            this.wobbleFreq = 0.002 + Math.random() * 0.002;
            this.wobbleAmp = 2.5 + Math.random() * 2.5;

            // Slow gentle rotation across the whole journey
            this.rotStart = Math.random() * 360;
            this.rotTotal = (Math.random() - 0.5) * 140;

            this.opacity = 0;
            this.el.style.opacity = '0';
            this.el.style.transform = `translate3d(${this.startX.toFixed(1)}px, ${this.yBaseStart.toFixed(1)}px, 0)`;
            this.active = true;
        }

        update(now) {
            if (!this.active) return;

            const elapsed = now - this.startTime;
            const progress = Math.min(1, Math.max(0, elapsed / this.duration));

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // 1. Primary horizontal movement across the screen
            const rawX = this.startX + progress * (this.endX - this.startX);

            // 2. Base vertical position with gentle slope
            const baseProgY = this.yBaseStart + progress * (this.yBaseEnd - this.yBaseStart);

            // 3. Multi-point organic wind curves (gentle rises, dips, thermal lift)
            const curve = Math.sin(progress * this.waveFreq1 + this.wavePhase1) * this.waveAmp1
                        + Math.cos(progress * this.waveFreq2 + this.wavePhase2) * this.waveAmp2;

            // 4. Subtle air flutter
            const wobbleY = Math.sin(now * this.wobbleFreq) * this.wobbleAmp;

            const rawY = baseProgY + curve + wobbleY;
            const rawRot = this.rotStart + progress * this.rotTotal + Math.sin(now * 0.0015) * 8;

            // 5. Touch / Click reaction impulse physics (peaks quickly, then smoothly returns in 800-1150ms)
            let impX = 0;
            let impY = 0;
            let impRot = 0;

            if (this.isImpulsed) {
                const impElapsed = now - this.impulseStartTime;
                const impProg = impElapsed / this.impulseDuration;

                if (impProg >= 1) {
                    this.isImpulsed = false;
                } else {
                    let factor = 0;
                    if (impProg < 0.22) {
                        // Quick initial push away (cubic ease-out)
                        const t = impProg / 0.22;
                        factor = 1 - Math.pow(1 - t, 3);
                    } else {
                        // Smooth, gradual return back to ambient wind path
                        const t = (impProg - 0.22) / 0.78;
                        factor = Math.cos(t * Math.PI * 0.5);
                    }
                    impX = this.targetImpulseX * factor;
                    impY = this.targetImpulseY * factor;
                    impRot = this.targetImpulseRot * factor;
                }
            }

            this.currentX = rawX + impX;
            this.currentY = rawY + impY;
            const currentRot = rawRot + impRot;

            // 6. Strict Edge Fade & Opacity:
            // Strictly 0 outside viewport. Smoothly fades in within 70px of entry, fades out within 70px of exit.
            if (this.currentX < 0 || this.currentX > vw || this.currentY < 0 || this.currentY > vh) {
                this.opacity = 0;
            } else {
                const distToEdge = Math.min(
                    this.currentX,
                    vw - this.currentX,
                    this.currentY,
                    vh - this.currentY
                );
                const fadeFactor = Math.min(1, Math.max(0, distToEdge / 70));
                this.opacity = this.maxOpacity * fadeFactor;
            }

            // Only allow pointer events when element is visibly inside viewport
            this.el.style.pointerEvents = this.opacity > 0.15 ? 'auto' : 'none';

            this.el.style.transform = `translate3d(${this.currentX.toFixed(1)}px, ${this.currentY.toFixed(1)}px, 0) rotate(${currentRot.toFixed(1)}deg)`;
            this.el.style.opacity = this.opacity.toFixed(3);

            // 7. Journey completion & off-screen recycle
            if (progress >= 1) {
                this.active = false;
                this.el.style.opacity = '0';
                this.el.style.pointerEvents = 'none';

                // Pause 1.5 to 4.5 seconds before starting next gentle breeze journey
                const pauseMs = 1500 + Math.random() * 3000;
                setTimeout(() => {
                    this.spawnJourney(performance.now());
                }, pauseMs);
            }
        }
    }

    // Initialize particles with staggered delays
    for (let i = 0; i < maxParticles; i++) {
        const p = new WindParticle();
        particles.push(p);

        // Stagger first entrances so petals enter one after another across the wind
        setTimeout(() => {
            p.spawnJourney(performance.now());
        }, 600 + i * 4600);
    }

    function loop(time) {
        for (let i = 0; i < particles.length; i++) {
            particles[i].update(time);
        }
        animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
}

// 8. GSAP TYPOGRAPHY ANIMATIONS (CHOREOGRAPHED HERO & SCROLLTRIGGER SECTIONS)

function animateHeroTypography() {
    if (typeof gsap === 'undefined') return;

    // Respect reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const overlay = document.getElementById('reference-text-overlay');
    if (!overlay) return;

    // Collect ALL hero text elements to animate together at the exact same time
    const elementsToAnimate = [
        overlay.querySelector('.heart-icon-wrapper'),
        overlay.querySelector('.hero-bismillah'),
        ...overlay.querySelectorAll('.space-y-1 p'),
        ...overlay.querySelectorAll('h1'),
        overlay.querySelector('.hero-ampersand'),
        overlay.querySelector('.mt-4 p, .mt-6 p'),
        document.getElementById('scroll-prompt-container')
    ].filter(Boolean);

    // ALL text elements animate in together at the exact same time
    gsap.fromTo(elementsToAnimate, 
        { 
            opacity: 0, 
            y: 28, 
            scale: 0.96 
        }, 
        { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            duration: 1.35, 
            stagger: 0, // ALL text comes at the same time
            ease: 'power3.out' 
        }
    );
}

function initGsapTextAnimations() {
    if (typeof gsap === 'undefined') return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    if (typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    // 1. SECTION HEADERS: Smooth fade and float up with subtle letter-spacing adjustment
    const sectionHeaders = [
        '#couple-section h2',
        '#save-date-section h2',
        '#events-section h2',
        '#blessings-section h2',
        '#countdown-section h2',
        '#wishes-carousel-section h3',
        '#rsvp-section h2',
        '#closing-section h2'
    ];

    sectionHeaders.forEach(selector => {
        const el = document.querySelector(selector);
        if (!el) return;

        gsap.fromTo(el, 
            { opacity: 0, y: 26 },
            {
                opacity: 1,
                y: 0,
                duration: 1.05,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 88%',
                    once: true
                }
            }
        );
    });

    // 2. BRIDE & GROOM SECTION
    const coupleSection = document.getElementById('couple-section');
    if (coupleSection) {
        const brideCard = coupleSection.querySelector('.flex-col:nth-of-type(1)');
        const centerHeart = coupleSection.querySelector('.animate-pulse');
        const groomCard = coupleSection.querySelector('.flex-col:nth-of-type(3)');

        if (brideCard) {
            gsap.fromTo(brideCard, 
                { opacity: 0, y: 35 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1.15,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: brideCard,
                        start: 'top 85%',
                        once: true
                    }
                }
            );
        }

        if (centerHeart) {
            gsap.fromTo(centerHeart, 
                { opacity: 0, scale: 0.5 },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 0.85,
                    ease: 'back.out(1.8)',
                    scrollTrigger: {
                        trigger: centerHeart,
                        start: 'top 85%',
                        once: true
                    }
                }
            );
        }

        if (groomCard) {
            gsap.fromTo(groomCard, 
                { opacity: 0, y: 35 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1.15,
                    delay: 0.12,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: groomCard,
                        start: 'top 85%',
                        once: true
                    }
                }
            );
        }
    }

    // 3. SAVE OUR SPECIAL DATE SECTION
    const saveDateSection = document.getElementById('save-date-section');
    if (saveDateSection) {
        const scriptSub = saveDateSection.querySelector('.font-script');
        const prayerText = saveDateSection.querySelector('.font-serif');
        const calendarBtns = saveDateSection.querySelectorAll('button');

        if (scriptSub) {
            gsap.fromTo(scriptSub, 
                { opacity: 0, y: 18 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.95,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: scriptSub,
                        start: 'top 88%',
                        once: true
                    }
                }
            );
        }

        if (prayerText) {
            gsap.fromTo(prayerText, 
                { opacity: 0, y: 16 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 1.0,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: prayerText,
                        start: 'top 88%',
                        once: true
                    }
                }
            );
        }

        if (calendarBtns && calendarBtns.length) {
            gsap.fromTo(calendarBtns, 
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    stagger: 0.15,
                    duration: 0.8,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: calendarBtns[0],
                        start: 'top 92%',
                        once: true
                    }
                }
            );
        }
    }

    // 4. WEDDING DETAILS ROWS
    const eventsCard = document.querySelector('#events-section .rounded-2xl');
    if (eventsCard) {
        const detailRows = eventsCard.querySelectorAll('.flex.items-start');
        if (detailRows && detailRows.length) {
            gsap.fromTo(detailRows, 
                { opacity: 0, x: -18 },
                {
                    opacity: 1,
                    x: 0,
                    stagger: 0.12,
                    duration: 0.85,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: eventsCard,
                        start: 'top 82%',
                        once: true
                    }
                }
            );
        }
    }

    // 5. CLOSING SECTION "BARAKALLAHU LAKUMA"
    const barakallahuContainer = document.getElementById('barakallahu-lakuma-container');
    if (barakallahuContainer) {
        gsap.fromTo(barakallahuContainer.children, 
            { opacity: 0, y: 14 },
            {
                opacity: 1,
                y: 0,
                duration: 0.9,
                stagger: 0.12,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: barakallahuContainer,
                    start: 'top 88%',
                    once: true
                }
            }
        );
    }
}



