(() => {
    // --- CONFIG ---
    const MAX_SWITCHES = 15;                // limita pentru scanare
    const INTERVAL_MS = 5000;               // timp scanare
    const MANUAL_MAX = 3;                   // limita pentru tastare directa
    const MANUAL_INTERVAL_MS = 2000;        // timp tastare directa
    const BLOCK_TIME_MS = 5 * 60 * 1000;    // blocare: 5 minute
    const BLOCK_STORAGE_KEY = "scannerBlockUntil";
    const BLOCK_REASON_KEY = "scannerBlockReason";

    const BLOCK_FREQ = 88.7;                // frecventa de blocare (MHz)
    const IDLE_TIMEOUT_MS = 1 * 60 * 1000;  // 2 minutes      

    // --- STATE ---
    let scanHistory = [];
    let manualHistory = [];
    let isBlocked = false;
    let blockTimeout;
    let originalSocketSend = null;
    let lastFreq = null;
    let bannerInterval = null;
    let idleTimeout = null;

    window.isAdmin = false;

    // --- ADMIN CHECK ---
    const checkAdminMode = () => {
        const bodyText = document.body.textContent || document.body.innerText;
        window.isAdmin =
            bodyText.includes("You are logged in as an administrator.") ||
            bodyText.includes("You are logged in as an adminstrator.") ||
            bodyText.includes("You are logged in and can control the receiver.");
    };

    // --- HELPER: trimite comanda catre tuner ---
    const forceTunerFreq = (mhz) => {
        try {
            if (originalSocketSend) {
                const khz = Math.round(mhz * 1000);
                originalSocketSend("T" + khz);
                lastFreq = mhz; // actualizam ultima frecventa
            }
        } catch (e) {
            console.error("Nu am putut trimite comanda catre tuner:", e);
        }
    };

    // --- HELPER: arata mesaj scurt pe ecran ---
    const showIdleMessage = (text) => {
        let msg = document.getElementById("idle-banner");
        if (!msg) {
            msg = document.createElement("div");
            msg.id = "idle-banner";
            Object.assign(msg.style, {
                position: "fixed",
                bottom: "86%",
                left: "72%",
                transform: "translateX(-50%)",
                padding: "8px 16px",
                backgroundColor: "rgba(255,140,0,0.9)",
                color: "white",
                borderRadius: "6px",
                fontFamily: "Arial, sans-serif",
                fontSize: "14px",
                fontWeight: "bold",
                zIndex: 1,
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
            });
            document.body.appendChild(msg);
        }
        msg.textContent = text;
        msg.style.display = "block";

        setTimeout(() => {
            if (msg) msg.style.display = "none";
        }, 5000);
    };

    // --- IDLE HANDLER ---
    const resetIdleTimer = () => {
        if (window.isAdmin) return; // doar pentru guests
        clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            if (lastFreq !== BLOCK_FREQ) { // trimite doar daca nu e deja pe 88.7
                forceTunerFreq(BLOCK_FREQ);
                showIdleMessage(`Idle lock activ – mutat pe ${BLOCK_FREQ} MHz`);
            }
        }, IDLE_TIMEOUT_MS);
    };

    // --- BANNER ---
    const createBanner = () => {
        let banner = document.getElementById("abuse-banner");
        if (!banner) {
            banner = document.createElement("div");
            banner.id = "abuse-banner";
            Object.assign(banner.style, {
                position: "fixed",
                top: "19%",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 20px",
                backgroundColor: "rgba(200,0,0,0.85)",
                color: "white",
                borderRadius: "8px",
                fontFamily: "Arial, sans-serif",
                fontSize: "15px",
                fontWeight: "bold",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                zIndex: 1,
                cursor: "move",
            });
            document.body.appendChild(banner);

            const savedPos = localStorage.getItem("abuseBannerPos");
            if (savedPos) {
                const pos = JSON.parse(savedPos);
                banner.style.top = pos.top;
                banner.style.left = pos.left;
                banner.style.transform = "translate(0,0)";
            }

            makeDraggable(banner);
        }
        return banner;
    };

    const makeDraggable = (element) => {
        let startX = 0, startY = 0;

        const onMouseDown = (e) => {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };

        const onMouseMove = (e) => {
            e.preventDefault();
            const rect = element.getBoundingClientRect();
            let newLeft = rect.left + (e.clientX - startX);
            let newTop = rect.top + (e.clientY - startY);

            newLeft = Math.max(10, Math.min(window.innerWidth - rect.width - 10, newLeft));
            newTop = Math.max(10, Math.min(window.innerHeight - rect.height - 10, newTop));

            element.style.left = newLeft + "px";
            element.style.top = newTop + "px";
            element.style.transform = "translate(0,0)";
            startX = e.clientX;
            startY = e.clientY;
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            localStorage.setItem(
                "abuseBannerPos",
                JSON.stringify({ top: element.style.top, left: element.style.left })
            );
        };

        element.addEventListener("mousedown", onMouseDown);
    };

    const updateBanner = () => {
        const banner = createBanner();
        const until = parseInt(localStorage.getItem(BLOCK_STORAGE_KEY) || "0", 10);
        const reason = localStorage.getItem(BLOCK_REASON_KEY) || "abuse";
        const remaining = until - Date.now();

        if (remaining > 0) {
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            banner.textContent = `Blocked (${reason}) - Time left: ${mins}m ${secs}s`;
        } else {
            banner.remove();
            clearInterval(bannerInterval);
            bannerInterval = null;
        }
    };

    const showBanner = () => {
        if (window.isAdmin) return;
        if (!bannerInterval) {
            updateBanner();
            bannerInterval = setInterval(updateBanner, 1000);
        }
    };

    // --- BLOCK ---
    const setBlocked = (duration, reason) => {
        isBlocked = true;
        const until = Date.now() + duration;
        localStorage.setItem(BLOCK_STORAGE_KEY, until.toString());
        localStorage.setItem(BLOCK_REASON_KEY, reason);

        showBanner();

        if (lastFreq !== BLOCK_FREQ) {
            forceTunerFreq(BLOCK_FREQ);
        }

        clearTimeout(blockTimeout);
        blockTimeout = setTimeout(() => {
            isBlocked = false;
            scanHistory = [];
            manualHistory = [];
            localStorage.removeItem(BLOCK_STORAGE_KEY);
            localStorage.removeItem(BLOCK_REASON_KEY);
            const banner = document.getElementById("abuse-banner");
            if (banner) banner.remove();
            if (bannerInterval) clearInterval(bannerInterval);
            bannerInterval = null;
        }, duration);
    };

    const restoreBlock = () => {
        const savedBlockUntil = parseInt(localStorage.getItem(BLOCK_STORAGE_KEY) || "0", 10);
        if (savedBlockUntil > Date.now()) {
            isBlocked = true;
            const remaining = savedBlockUntil - Date.now();
            showBanner();
            blockTimeout = setTimeout(() => {
                isBlocked = false;
                scanHistory = [];
                manualHistory = [];
                localStorage.removeItem(BLOCK_STORAGE_KEY);
                localStorage.removeItem(BLOCK_REASON_KEY);
                const banner = document.getElementById("abuse-banner");
                if (banner) banner.remove();
                if (bannerInterval) clearInterval(bannerInterval);
                bannerInterval = null;
            }, remaining);
        }
    };

    // --- CHECK SCAN ---
    const checkScanAbuse = (freq) => {
        const now = Date.now();
        scanHistory.push(now);
        scanHistory = scanHistory.filter(t => now - t <= INTERVAL_MS);

        if (scanHistory.length >= MAX_SWITCHES) {
            setBlocked(BLOCK_TIME_MS, "excessive scanning");
            return true;
        }
        return false;
    };

    // --- CHECK MANUAL ---
    const checkManualAbuse = (freq) => {
        const now = Date.now();
        manualHistory.push({ freq, time: now });
        manualHistory = manualHistory.filter(e => now - e.time <= MANUAL_INTERVAL_MS);

        const uniqueFreqs = new Set(manualHistory.map(e => e.freq));
        if (uniqueFreqs.size >= MANUAL_MAX) {
            setBlocked(BLOCK_TIME_MS, "rapid manual input");
            return true;
        }
        return false;
    };

    // --- HOOK SOCKET ---
    const hookSocket = () => {
        if (typeof socket === "undefined" || !socket.send) return;
        if (originalSocketSend) return;

        originalSocketSend = socket.send.bind(socket);

        socket.send = (data) => {
            if (typeof data === "string" && data.startsWith("T")) {
                const freqKHz = parseInt(data.substring(1), 10);
                const freqMHz = freqKHz / 1000;

                const blockUntil = parseInt(localStorage.getItem(BLOCK_STORAGE_KEY) || "0", 10);
                if (!window.isAdmin && (isBlocked || blockUntil > Date.now())) {
                    showBanner();
                    if (lastFreq !== BLOCK_FREQ) {
                        forceTunerFreq(BLOCK_FREQ);
                    }
                    return;
                }

                if (lastFreq !== null) {
                    const delta = Math.abs(freqMHz - lastFreq);
                    if (Math.abs(delta - 0.1) < 0.0001) {
                        if (checkScanAbuse(freqMHz)) return;
                    } else {
                        if (checkManualAbuse(freqMHz)) return;
                    }
                }
                lastFreq = freqMHz;
                resetIdleTimer(); // resetam timerul de idle
            }

            originalSocketSend(data);
        };
    };

    // --- INIT ---
    document.addEventListener("DOMContentLoaded", () => {
        checkAdminMode();
        restoreBlock();
        hookSocket();
        resetIdleTimer();
    });
})();
