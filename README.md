Overview
========
This repository is a self-contained test application for reproducing some issues with the [Window Management API](https://developer.mozilla.org/en-US/docs/Web/API/Window_Management_API). The desired behavior is to enumerate displays on a multi-monitor host (which works), and then be able to open a window _spanning_ multiple displays.

More specifically, given a layout of displays `LPP`, where `L` indicates a landscape orientation display and `P` indicates a portrait orientation display, the desired behavior is that a single window can be opened to span the two `P` displays.

The current observed behavior is that Chromium-based browsers properly enumerate the attached displays using the Window Management API, but clamp the size of the opened window to the bounds of a single display. Additionally, on systems with the above-mentioned `LPP` display layout, the `ScreenDetailed.orientation.type` attribute always reports `'landscape-primary'` with `ScreenDetailed.orientation.angle` having value `0`.

Previously, some non-Chromium browsers (Firefox, ~September 2023) would allow the opened window to span multiple displays based on the `width` and `height` attributes supplied to `window.open`, but Firefox now (124.0.2, April 2024) also clamps the opened window to the bounds of a single display.

To work around this issue, a separate Chrome extension is required, which is not ideal.

Tested with Google Chrome 123.0.6312.86 (Official Build) (64-bit) on Windows 11.


Starting a local server
=======================
Using Python's built-in http server module:

```bash
python3 -m http.server --bind 127.0.0.1 8081
```

Then open [http://localhost:8081](http://localhost:8081) in your browser.


Interactions
============
The user interface presents two buttons. The 'Window Management' button enumerates displays using the Window Management API (if available), and attempts to open a window placed on the portrait display immediately to the right of the left-most landscape display. If the Window Management API is not available, it falls back to assuming that only one display is attached, and should open the content window on the same display as the launcher page. The 'Fixed Dimensions' button attempts to open a new window placed to the right of the current display, with a fixed width that should span the two portrait displays on the test system.
