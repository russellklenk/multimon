// Sample display layout consists of three separate monitors:
// Leftmost : Landscape, 2560x1600px @ 100% scale (Primary)
// Middle   : Portrait , 1440x2560px @ 100% scale
// Rightmost: Portrait , 1440x2560px @ 100% scale (flipped)
// The launcher page should be placed on the left-most (landscape) display.
// The desired behavior is that clicking the 'Window Management' button opens a new window spanning the two portrait displays.
// Chromium-based browsers seem to constrain the size of the window to the middle display only.

class ScreenDetailedPolyfill extends EventTarget {
    availLeft;
    availTop;
    availWidth;
    availHeight;
    left;
    top;
    width;
    height;
    colorDepth;
    pixelDepth;
    orientation;
    isPrimary;
    isInternal;
    isExtended;
    devicePixelRatio;
    label;
    onchange;

    constructor(attributes) {
        super();
        if (attributes) {
            this.availLeft = attributes.availLeft;
            this.availTop = attributes.availTop;
            this.availWidth = attributes.availWidth;
            this.availHeight = attributes.availHeight;
            this.left = attributes.left;
            this.top = attributes.top;
            this.width = attributes.width;
            this.height = attributes.height;
            this.colorDepth = attributes.colorDepth;
            this.pixelDepth = attributes.pixelDepth;
            this.orientation = attributes.orientation;
            this.isPrimary = attributes.isPrimary;
            this.isInternal = attributes.isInternal;
            this.isExtended = attributes.isExtended;
            this.devicePixelRatio = attributes.devicePixelRatio;
            this.label = attributes.label;
            this.onchange = null;
        } else {
            this.availLeft = 0;
            this.availTop = 0;
            this.availWidth = 0;
            this.availHeight = 0;
            this.left = 0;
            this.top = 0;
            this.width = 0;
            this.height = 0;
            this.colorDepth = 0;
            this.pixelDepth = 0;
            this.orientation = {
                angle: 0.0,
                type: 'landscape-primary'
            };
            this.isPrimary = true;
            this.isInternal = true;
            this.isExtended = false;
            this.devicePixelRatio = 1.0;
            this.label = 'polyfill';
            this.onchange = null;
        }
    }
}

function defaultScreenDetailed() {
    const screen = window.screen;
    let availLeft, availTop;
    let left, top;
    let pixelRatio;

    if ('availLeft' in screen) {
        availLeft = screen['availLeft'];
    } else {
        availLeft = 0;
    }
    if ('availTop' in screen) {
        availTop = screen['availTop'];
    } else {
        availTop = 0;
    }
    if ('left' in screen) {
        left = screen['left'];
    } else {
        left = 0;
    }
    if ('top' in screen) {
        top = screen['top'];
    } else {
        top = 0;
    }
    if ('devicePixelRatio' in window) {
        pixelRatio = window['devicePixelRatio'];
    } else {
        pixelRatio = 1.0;
    }

    return new ScreenDetailedPolyfill({
        availLeft: availLeft,
        availTop: availTop,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        left: left,
        top: top,
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        orientation: screen.orientation,
        isPrimary: true,
        isInternal: true,
        isExtended: false,
        devicePixelRatio: pixelRatio,
        label: 'Default'
    });
}

class ScreenDetailsPolyfill extends EventTarget {
    screens;
    currentScreen;
    onscreenschange;
    oncurrentscreenchange;

    constructor() {
        super();

        const defaultScreen = defaultScreenDetailed();
        this.screens = [defaultScreen];
        this.currentScreen = defaultScreen;
        this.onscreenschange = null;
        this.oncurrentscreenchange = null;
    }
}

/**
 * Enumerate the set of display outputs attached to the host.
 * @returns {Promise<ScreenDetails>} A promise that always resolves to a [ScreenDetails](ttps://w3c.github.io/window-management/#api-screendetails-interface) describing the attached display outputs.
 */
function enumerateHostDisplays() {
    if (window['getScreenDetails']) {
        // This host supports the window management API.
        console.log('Host supports the Window Management API');
        return window.getScreenDetails();
    } else {
        // This host does not support the window management API.
        console.log('Host does not support the Window Management API');
        return new Promise((resolve) => {
            resolve(new ScreenDetailsPolyfill());
        });
    }
}

/**
 * Determine the preferred placement and sizing information for the content window.
 * @param {ScreenDetails} hostDisplays Information about the set of displays available on the host.
 * @param {boolean} fullscreen Specify `true` if the content window should be opened fullscreen.
 * @returns {WindowAttributes} The position, size, and number of displays the window should span.
 */
function determineContentWindowPlacement(hostDisplays, fullscreen) {
    const screenCount = hostDisplays.screens.length;
    const currentScreen = hostDisplays.currentScreen;
    const currentScreenX = currentScreen.left;
    let defaultPlacementX = currentScreen.left;
    let defaultPlacementY = currentScreen.top;
    let defaultSizeX = currentScreen.availWidth;
    let defaultSizeY = currentScreen.availHeight;

    const defaultPlacement = {
        x: defaultPlacementX,
        y: defaultPlacementY,
        width: defaultSizeX,
        height: defaultSizeY,
        spanCount: 1,
        fullscreen: fullscreen
    };

    if (screenCount < 2) {
        // Single display (possibly emulated), no window management API, or no permissions.
        return defaultPlacement;
    }

    // The user has some type of multi-display configuration and the content is being launched in a standalone window.
    // There are two supported multi-display configurations for auto-placement:
    // 1. Two identical landscape displays. The content window is placed on the right-most display.
    // 2. One landscape display plus two identical portrait displays. The content window is placed on the middle display (left-most portrait), spanning the two portrait displays.

    // Split into groups by display resolution.
    const resolutionToDisplayList = new Map();
    for (const display of hostDisplays.screens) {
        const resolution = `${display.width}x${display.height}`;
        const totalPixels = display.width * display.height;

        if (totalPixels < 1800000) {
            // Do not consider displays less than ~2MP.
            console.log(`Skipping display ${display.label} (${resolution}); less than 2MP (${totalPixels}).`);
            continue;
        }

        let displayList = resolutionToDisplayList.get(resolution);
        if (displayList !== undefined) {
            displayList.push(display);
        } else {
            displayList = [display];
            resolutionToDisplayList.set(resolution, displayList);
        }
    }

    // Filter out any resolutions consisting of only a single display.
    const keysToRemove = [];
    resolutionToDisplayList.forEach((value, key, map) => {
        if (value.length <= 1) {
            keysToRemove.push(key);
        }
    });
    for (const resolutionKey of keysToRemove) {
        const display = resolutionToDisplayList.get(resolutionKey);
        console.log(`Removing display ${display.label} (${resolutionKey}) from consideration; only one display with this resolution.`, display);
        resolutionToDisplayList.delete(resolutionKey);
    }

    // Sort displays left-to-right within each group of identical resolution displays.
    resolutionToDisplayList.forEach((value, key, map) => {
        value.sort((a, b) => {
            if (a.left < b.left) {
                return -1; // a appears to the left of b
            } else if (a.left > b.left) {
                return +1; // a appears to the right of b
            } else {
                return  0;
            }
        })
    });

    if (resolutionToDisplayList.size === 0) {
        // There were multiple displays, but no two had the same resolution.
        console.log('No two displays had the same resolution; using default placement.', defaultPlacement);
        return defaultPlacement;
    }

    // Separate into groups based on display orientation.
    const portraitResolutions = [];
    const landscapeResolutions = [];
    resolutionToDisplayList.forEach((value, key, map) => {
        const leftDisplay = value[0];
        if (leftDisplay.width > leftDisplay.height) {
            landscapeResolutions.push(key);
        } else {
            portraitResolutions.push(key);
        }
    });

    if (portraitResolutions.length > 0) {
        console.log(`Found ${portraitResolutions.length} unique portrait resolution(s).`, portraitResolutions);
    }
    if (landscapeResolutions.length > 0) {
        console.log(`Found ${landscapeResolutions.length} unique landscape resolution(s).`, landscapeResolutions);
    }

    // At this point, displays are separated into groups of 2 or more displays with identical resolutions.
    // These groups can be accessed by display orientation (landscape or portrait).
    let bestNbPixels = 0;
    let targetGroup;
    let targetScreen;

    // Prefer to place the content window on portrait displays, if there are any.
    for (const resolutionKey of portraitResolutions) {
        const screenGroup = resolutionToDisplayList.get(resolutionKey);
        const screenCount = screenGroup.length; // Will be >= 2
        const lastScreen = screenCount - 1;
        let screenIndex = 0;

        // Iterate over displays in this resolution group.
        // Iteration proceeds left-to-right in virtual display space.
        // The search looks for the highest resolution set of adjacent portrait displays to the right of the current screen.
        // The assumption is that the 'current screen' is what is launching the content window.
        for (const display of screenGroup) {
            if (display.left > currentScreenX) {
                // This is the left-most display to the right of the current screen.
                const adjacentScreens = lastScreen - screenIndex;
                const displayNbPixels = display.width * display.height;
                if (adjacentScreens >= 1 && displayNbPixels > bestNbPixels) {
                    targetGroup = resolutionKey;
                    targetScreen = display;
                    bestNbPixels = displayNbPixels;
                }
                break;
            }
            screenIndex++;
        }
    }

    if (targetScreen !== undefined) {
        // Note: Want width => targetScreen.availWidth * 2, but this seems to be disallowed by the browser?
        // Chrome will move the window to one display or the other entirely, and not allow the window to span.
        console.log(`Launching on portrait display ${targetScreen.left} with width ${targetScreen.availWidth * 2}px and height ${targetScreen.availHeight}px.`);
        return {
            x: targetScreen.left,
            y: targetScreen.top,
            width: targetScreen.availWidth * 2,
            height: targetScreen.availHeight,
            spanCount: 2,
            fullscreen: fullscreen
        };
    }

    // If no suitable portrait displays were found, look through the landscape displays.
    bestNbPixels = currentScreen.width * currentScreen.height;
    for (const resolutionKey of landscapeResolutions) {
        const screenGroup = resolutionToDisplayList.get(resolutionKey);

        // Iterate over displays in this resolution group.
        // Iteration proceeds left-to-right in virtual display space.
        // The search looks for the first display to the right of the current screen with equal or greater resolution.
        for (const display of screenGroup) {
            if (display.left > currentScreenX) {
                const displayNbPixels = display.width * display.height;
                if (displayNbPixels >= bestNbPixels) {
                    targetGroup = resolutionKey;
                    targetScreen = display;
                    bestNbPixels = displayNbPixels;
                }
                break;
            }
        }
    }

    if (targetScreen !== undefined) {
        console.log(`Launching on landscape display ${targetScreen.left} with width ${targetScreen.availWidth}px and height ${targetScreen.availHeight}px.`);
        return {
            x: targetScreen.left,
            y: targetScreen.top,
            width: targetScreen.availWidth,
            height: targetScreen.availHeight,
            spanCount: 1,
            fullscreen: fullscreen
        };
    }

    // If none of the standard placements could be made, open on the current screen.
    console.log('Falling back to default placement.');
    return defaultPlacement;
}

function basicButtonClick(ev) {
    enumerateHostDisplays()
        .then((hostDisplays) => {
            const fullscreen = false;
            const p = {
                x: hostDisplays.currentScreen.left + hostDisplays.currentScreen.width,
                y: 0,
                width: 2880, // Hard-coded - see display layout at top of file
                height: 2560, // Hard-coded - see display layout at top of file
                fullscreen: false
            };
            console.log('Not using the Window Management API for placement.');
            console.log('All host displays:', hostDisplays);
            console.log('Content window placement:', p);
            const newWindow = window.open('content.html', 'someTarget', `resizable,left=${p.x},top=${p.y},width=${p.width},height=${p.height}`);
            // ...
        });
}

function wmapiButtonClick(ev) {
    enumerateHostDisplays()
        .then((hostDisplays) => {
            const fullscreen = false;
            const p = determineContentWindowPlacement(hostDisplays, fullscreen);
            console.log('Using results from Window Management API for placement.');
            console.log('All host displays:', hostDisplays);
            console.log('Content window placement:', p);
            const newWindow = window.open('content.html', 'someTarget', `resizable,left=${p.x},top=${p.y},width=${p.width},height=${p.height}`);
            // ...
        });
}

addEventListener('DOMContentLoaded', (ev) => {
    const wmapiButton = document.getElementById('wmapi-button');
    const basicButton = document.getElementById('basic-button');

    wmapiButton.addEventListener('click', wmapiButtonClick);
    basicButton.addEventListener('click', basicButtonClick);
});
