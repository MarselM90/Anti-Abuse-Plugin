# 📡 FM-DX Webserver -- Anti-Abuse Plugin

This plugin prevents **scanning abuse** and **rapid frequency input** on
[fm-dx-webserver](https://github.com/fm-dx) by applying usage limits.

## ✨ Features

-   🚫 **Excessive scanning protection** -- detects rapid button / wheel
    / arrow key usage (steps of `0.1 MHz`).\
-   🚫 **Rapid manual input protection** -- detects entering more than
    `3` different frequencies within `2s`.\
-   ⏳ **Temporary blocking** -- user is blocked for **5 minutes** when
    thresholds are exceeded.\
-   🔁 **Persistent blocking** -- block state is preserved even after
    page reload.\
-   👮 **Admin bypass** -- logged-in administrators are never blocked.\
-   🪧 **Movable banner with timer** -- displays remaining block time,
    can be dragged anywhere on screen.

------------------------------------------------------------------------

## ⚙️ Installation

1.  Copy `anti-abuse.js` into the **`plugins`** folder of
    `fm-dx-webserver`.\
2.  Add the following line in the main HTML file, before `</body>`:

``` html
<script src="plugins/anti-abuse.js"></script>
```

3.  Reload the webserver page.

------------------------------------------------------------------------

## 🔧 Configuration

Thresholds can be tuned inside the plugin source:

``` javascript
const MAX_SWITCHES = 30;              // max frequency changes for scanning
const INTERVAL_MS = 5000;             // time window for scanning (ms)
const MANUAL_MAX = 3;                 // max different manual frequencies
const MANUAL_INTERVAL_MS = 2000;      // time window for manual input (ms)
const BLOCK_TIME_MS = 5 * 60 * 1000;  // block duration (default 5 minutes)
```

------------------------------------------------------------------------

## 🖥️ How it works

-   **Scanning (buttons/wheel/arrow keys):** detected by regular steps
    of `0.1 MHz`. If `MAX_SWITCHES` is exceeded within `INTERVAL_MS`,
    the user is blocked.\
-   **Direct manual input:** detected by larger / irregular jumps. If
    `MANUAL_MAX` frequencies are entered within `MANUAL_INTERVAL_MS`,
    the user is blocked.\
-   **Blocking:** stops all tuning commands from being sent, shows a
    popup message and a banner with remaining time.\
-   **Persistence:** block state is stored in `localStorage` and remains
    active across reloads.\
-   **Admin bypass:** plugin checks the page text to detect admin login
    and disables all restrictions for admins.

------------------------------------------------------------------------

## 🪧 Block Banner

-   Displays remaining block time (countdown).\
-   Fully draggable (drag & drop anywhere on the screen).\
-   Position is remembered via `localStorage`.

------------------------------------------------------------------------

## 📜 License

This plugin is released under the **MIT License**.
