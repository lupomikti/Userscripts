// ==UserScript==
// @name         WaniKani Show Total Lesson Count
// @namespace    https://codeberg.org/lupomikti
// @version      0.7.0
// @description  Add the count of total lessons to the Today's Lessons widget
// @license      MIT; http://opensource.org/licenses/MIT
// @author       LupoMikti
// @match        https://www.wanikani.com/*
// @grant        none
// @supportURL   https://github.com/lupomikti/Userscripts/issues
// ==/UserScript==

// Additional supportURL: https://community.wanikani.com/t/userscript-show-total-lesson-count/66776

/** @import { Settings } from '../WKOF Types/wkof.d.ts' */

( async function () {
    "use strict";

    /** @typedef {{[key: string]: any}} WKOFDictionary */

    const scriptId = "show_total_lesson_count";
    const scriptName = "Show Total Lesson Count";

    const globalState = {
        initialLoad: true,
        pageLoaded: false,
        hasOutputLog: false,
        mainRetryCounter: 4,
        wkofCallbacksSettled: false,
    };

    let debugLogText = `START: ${scriptName} Debug Log:\n`;
    let mainSource = "";

    const INTERNAL_DEBUG = false;
    let todaysLessonsCount = 0;

    /**
     * A dictionary of string keys to any type values which will be passed to wkof Settings.Module
     * @type {WKOFDictionary} */ let settings;

    /**
     * @type {any} */ let summaryData;

    if ( !window.wkof ) {
        // deno-fmt-ignore
        if (confirm(`${scriptName} requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?`)) {
            window.location.href =
                "https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549";
        }
        return;
    }

    // destructure to explicitly use wkof without window prefix
    const { wkof } = window;

    /**
     * Creates a line to be added to a log of messages output to console.debug with ISO Timestamp
     *
     * @param {string} message
     */
    function addToDebugLog( message ) {
        debugLogText += `${new Date().toISOString()}: ${message}\n`;
    }

    function printDebugLog( force = false ) {
        if ( !globalState.hasOutputLog || force ) {
            console.log(
                `${scriptName}: Outputting a debug log to console.debug()\nTo disable this setting, open "Settings > ${scriptName}" and toggle "Enable console debugging" off`,
            );
            console.debug( debugLogText );
        }
        if ( !force ) globalState.hasOutputLog = true;
        debugLogText = `START: ${scriptName} Debug Log:\n`;
    }

    if ( !wkof.version || wkof.version.compare_to( "1.2.11" ) === "older" ) {
        confirm(
            `${scriptName} requires WaniKani Open Framework version 1.2.11 or higher. You have ${wkof.version.value}. Please update to use this script.`,
        );
        return;
    }

    wkof.on_pageload(
        [
            "/",
            "/dashboard",
            /^\/(?:level|radicals|kanji|vocabulary)\/.+$/, // Individual item pages + the level glossary page of a specific level
            /^\/(?:radicals|kanji|vocabulary)$/, // Item glossary pages with the nav bar
            /^\/(?:settings|recent-.+)$/, // All other pages with the nav bar
        ],
        start,
        markUnloaded,
    );

    wkof.on_frameload( [ "*todays-lessons", "/lesson-and-review-count" ], renderFrame );

    /**
     * @param {string} currentFrame The pathname of the src url for the current turbo-frame element
     * @param {Number} frameIndex Integer representing the index of the current frame's regex in the url array in wkof
     * @param {string} frameId The HTML id attribute's value for the current turbo-frame element
     */
    function renderFrame( currentFrame, frameIndex, frameId ) {
        addToDebugLog( `Callback for turbo:frame-load event for frame "${currentFrame}" is executing.` );
        mainSource = `wkof.on_frameload load_handler callback`;
        main( currentFrame, frameIndex, frameId );
    }

    wkof.include( "Settings, Menu, Apiv2" );
    await wkof.ready( "Settings, Menu, Apiv2" ).then( loadSettings ).then( insertMenu ).then( getSummaryData )
        .catch( ( err ) => {
            addToDebugLog(
                `wkof.ready('Settings, Menu, Apiv2') rejected (or callbacks threw an exception) with error: ${err}`,
            );
            if ( settings.enableDebugging ) printDebugLog( INTERNAL_DEBUG );
        } ).finally( () => {
            addToDebugLog( `Executing WKOF callback finally block` );
            globalState.wkofCallbacksSettled = true;
        } );

    async function getSummaryData() {
        addToDebugLog( `Retrieving summary data via await of the endpoint...` );
        summaryData = await wkof.Apiv2.get_endpoint( "summary" );
        addToDebugLog( `Summary data has been retrieved` );
    }

    function markUnloaded() {
        addToDebugLog( `Marking page as fully unloaded` );
        globalState.pageLoaded = false;
    }

    function start() {
        addToDebugLog( `Starting...` );
        if ( globalState.initialLoad ) {
            insertStylesheet();
            globalState.initialLoad = false;
        }
        globalState.pageLoaded = true;
        if ( globalState.hasOutputLog ) globalState.hasOutputLog = false;
        if ( globalState.mainRetryCounter < 4 ) globalState.mainRetryCounter = 4;
    }

    async function loadSettings() {
        addToDebugLog( `Loading settings...` );

        const defaults = {
            showTotalOnly: false,
            enableDebugging: true,
        };

        settings = await wkof.Settings.load( scriptId, defaults );
    }

    function insertMenu() {
        addToDebugLog( `Inserting menu...` );

        const config = {
            name: scriptId,
            submenu: "Settings",
            title: scriptName,
            "on_click": openSettings,
        };

        wkof.Menu.insert_script_link( config );
    }

    /**
     * Save function for wkof settings callback
     *
     * @param {WKOFDictionary} wkofSettings
     */
    function saveSettings( wkofSettings ) {
        settings = wkofSettings;
    }

    function openSettings() {
        /** @type {Settings.Config} */
        const config = {
            "script_id": scriptId,
            title: scriptName,
            "on_save": saveSettings,
            content: {
                showTotalOnly: {
                    type: "checkbox",
                    label: "Show Only Total Lesson Count",
                    hover_tip:
                        `Changes display between "<today's lesson count> / <total lesson count>" and just "<total lesson count>"`,
                    default: false,
                },
                enableDebugging: {
                    type: "checkbox",
                    label: "Enable console debugging",
                    hover_tip: `Enable output of debugging info to console.debug()`,
                    default: true,
                },
            },
        };

        const dialog = new wkof.Settings( config );
        dialog.open();
    }

    function insertStylesheet() {
        const css = `
#lesson-and-review-count-frame .lesson-and-review-count__count {
  flex: 1 0 32px;
}

.todays-lessons-widget__title-container:has(.todays-lessons-widget__title-group-container) {
  display: inline-flex;
  gap: var(--spacing-normal);
  justify-content: space-evenly;
}

.todays-lessons-widget__title-group-container {
  display: flex;
  flex-direction: column;
}

.todays-lessons-widget__title-group-container .todays-lessons-widget__subtitle {
  margin-top: 2px;
}

.todays-lessons-widget__title-container:has(.todays-lessons-widget__title-group-container) + .todays-lessons-widget__text {
  align-self: center;
}

.todays-lessons-widget__title:has(.todays-lessons-widget__text-wrapper) {
  flex-direction: column;
}

.todays-lessons-widget__text-wrapper {
  display: flex;
  gap: var(--spacing-tight);
  align-items: center;
}
`;

        if ( document.getElementById( "total-lesson-count-style" ) === null ) {
            const styleSheet = document.createElement( "style" );
            styleSheet.id = "total-lesson-count-style";
            styleSheet.textContent = css;
            document.head.appendChild( styleSheet );
        }
    }

    /**
     * Main function that manipulates the DOM
     * @param {string} currentFrame
     * @param {string} currentFrameId
     */
    function modifyFrame( currentFrame, currentFrameId ) {
        const totalLessonCount = summaryData.lessons[0].subject_ids.length;
        let isTileSizeOneThird = false;

        if ( currentFrame.includes( "todays-lessons" ) ) {
            const lessonCountContainer = document.getElementById( currentFrameId )?.querySelector(
                ".todays-lessons-widget__count-text .count-bubble",
            );
            if ( lessonCountContainer ) {
                todaysLessonsCount = parseInt( lessonCountContainer.textContent );
                const todaysCountForDisplay = isNaN( todaysLessonsCount ) ? "0" : todaysLessonsCount.toString();

                if ( settings.showTotalOnly ) {
                    lessonCountContainer.textContent = totalLessonCount;
                    addToDebugLog(
                        `Setting display amount for Today's Lessons tile, set to ${lessonCountContainer.textContent}`,
                    );
                }
                else {
                    // The following follows no style conventions or cleanliness conventions, it's more akin to a bandaid than anything due to limited time
                    // If anyone would like to clean this up, please feel free to submit a PR

                    lessonCountContainer.textContent = todaysCountForDisplay; // in case it is zero
                    // @ts-ignore: This needs to be fixed later, but for now, it is hardcoded that the div we want is 3 ancestors up
                    const titleContainer = lessonCountContainer.parentNode.parentNode.parentNode; // .todays-lessons-widget__title-container
                    // deno-fmt-ignore
                    isTileSizeOneThird =
                        /** @type {HTMLElement} */ ( titleContainer )?.closest( "turbo-frame.dashboard__widget--one-third" ) != null;

                    if ( titleContainer ) {
                        if ( isTileSizeOneThird ) {
                            // Do the one-third stuff
                            const wrapper0 = document.createElement( "div" );
                            wrapper0.classList.add( `todays-lessons-widget__text-wrapper` );
                            titleContainer.querySelector( `.todays-lessons-widget__title` )?.firstElementChild
                                ?.insertAdjacentElement( "afterend", wrapper0 );
                            const countTextDiv = titleContainer.querySelector( `.todays-lessons-widget__count-text` );
                            const countTextClone =
                                /** @type {HTMLElement | undefined} */ ( countTextDiv?.cloneNode( true ) );
                            if ( countTextDiv && countTextClone ) {
                                // @ts-ignore: assert that firstElementChild will not be null
                                countTextClone.firstElementChild.textContent = totalLessonCount;
                                const forwardSlash = `<div class="todays-lessons-widget__title-text">/</div>`;
                                wrapper0.insertAdjacentHTML( "afterbegin", forwardSlash );
                                wrapper0.insertAdjacentElement( "afterbegin", countTextDiv );
                                wrapper0.insertAdjacentElement( "beforeend", countTextClone );

                                addToDebugLog( `Manipulated DOM and created new nodes as needed.` );
                            }
                            else {
                                addToDebugLog(
                                    `Failed to manipulate the DOM due to one or more elements being null or undefined.`,
                                );
                            }
                        }
                        else {
                            // Do things that should only be done if not a one-third sized tile (half, two-thirds, full)
                            if ( !titleContainer.children[0].className.includes( `__title-group-container` ) ) {
                                // clone existing children, and modify clones to make new children, store in a temp array
                                const tempArray = [];
                                for ( const elem of titleContainer.children ) {
                                    const clone = /** @type {HTMLElement} */ ( elem.cloneNode( true ) );
                                    if ( clone && clone.className.includes( `__subtitle` ) ) {
                                        clone.textContent = "Total";
                                    }
                                    if ( clone.className.includes( `__title` ) ) {
                                        const tmpNode = clone.querySelector(
                                            `.todays-lessons-widget__count-text .count-bubble`,
                                        );
                                        if ( tmpNode ) tmpNode.textContent = totalLessonCount;
                                    }
                                    tempArray.push( clone );
                                }

                                // wrap the existing children in a new div.todays-lessons-widget__title-group-container
                                // wrap the new children in the same kind of wrapper
                                // append second wrapper after first wrapper

                                const wrapper1 = document.createElement( "div" );
                                wrapper1.classList.add( `todays-lessons-widget__title-group-container` );
                                /** @type {HTMLElement} */ ( titleContainer ).insertAdjacentElement( "beforebegin", wrapper1 );
                                wrapper1.append( ...titleContainer.children );
                                titleContainer.prepend( wrapper1 ); // this should move the wrapper inside titleContainer

                                const wrapper2 = document.createElement( "div" );
                                wrapper2.classList.add( `todays-lessons-widget__title-group-container` );
                                /** @type {HTMLElement} */ ( titleContainer ).insertAdjacentElement( "beforebegin", wrapper2 );
                                wrapper2.append( ...tempArray );
                                titleContainer.append( wrapper2 );

                                addToDebugLog( `Created additional cloned nodes to display Total Lesson Count.` );
                            }
                        }
                    }
                }
            }

            // hide "Today's" subtitle if showing only total OR if tile is only of size one-third

            const lessonSubtitle = document.querySelector( ".todays-lessons-widget__subtitle" );

            if (
                ( settings.showTotalOnly || isTileSizeOneThird )
                && lessonSubtitle
                && lessonSubtitle.checkVisibility()
            ) {
                addToDebugLog( `Hiding the "Today's" subtitle on the lesson tile` );
                /** @type {HTMLElement} */ ( lessonSubtitle ).style.display = "none";
            }
        }
        else if ( currentFrame.includes( "lesson-and-review-count" ) ) {
            const lessonCountContainer = document.getElementById( currentFrameId )?.querySelector(
                ".lesson-and-review-count__count",
            );
            if ( lessonCountContainer ) {
                todaysLessonsCount = parseInt( lessonCountContainer.textContent );
                const todaysCountForDisplay = isNaN( todaysLessonsCount ) ? "0" : todaysLessonsCount.toString();
                // deno-fmt-ignore
                lessonCountContainer.textContent = settings.showTotalOnly ?
                    `${totalLessonCount}` :
                    `${todaysCountForDisplay} / ${totalLessonCount}`;
                addToDebugLog(
                    `Setting display amount for navigation bar, set to ${lessonCountContainer.textContent}`,
                );
            }
        }
    }

    /**
     * Main handler of turbo frames
     * @param {string} currentFrame The pathname of the current frame of the on_frameload callback
     * @param {Number} _frameIndex
     * @param {string} currentFrameId
     * @returns
     */
    function main( currentFrame, _frameIndex, currentFrameId ) {
        addToDebugLog( `Main function is executing... source of start = [${mainSource}]` );

        if ( !settings ) {
            addToDebugLog( `Settings have not been loaded yet, main function is returning (source = [${mainSource}])` );
            if ( !globalState.pageLoaded || ( globalState.pageLoaded && !globalState.wkofCallbacksSettled ) ) {
                addToDebugLog( `Creating 50ms timeout for main() while page loads or wkof callbacks finish` );
                setTimeout( () => {
                    main( currentFrame, _frameIndex, currentFrameId );
                }, 50 );
            }
            if ( globalState.pageLoaded && globalState.wkofCallbacksSettled ) printDebugLog( INTERNAL_DEBUG );
            return;
        }
        addToDebugLog( `We have settings` );

        if ( globalState.pageLoaded && globalState.wkofCallbacksSettled ) {
            let isFrameContentLoaded = false;
            const currentTurboFrameElement = document.getElementById( currentFrameId );
            if ( currentTurboFrameElement ) {
                const child = currentTurboFrameElement.firstElementChild;
                if ( child ) {
                    const frameNameAsClassMember = currentFrame.slice( 1 ).replace( /^(widget)s\/(.+)/g, "$2-$1" );
                    isFrameContentLoaded = child.classList.contains( frameNameAsClassMember );
                    if ( isFrameContentLoaded ) {
                        addToDebugLog(
                            `Content for frame "${currentFrame}" has been loaded, proceeding with DOM manipulation.`,
                        );
                        modifyFrame( currentFrame, currentFrameId );
                    }
                    else {
                        globalState.mainRetryCounter--;
                        addToDebugLog(
                            `Content for frame "${currentFrame}" was not successfully loaded yet, retrying... (retries left = ${globalState.mainRetryCounter})`,
                        );
                        if ( globalState.mainRetryCounter > 0 ) main( currentFrame, _frameIndex, currentFrameId );
                        else if ( settings.enableDebugging ) printDebugLog( INTERNAL_DEBUG );
                        return;
                    }
                }
            }
        }
        else if ( globalState.pageLoaded && !globalState.wkofCallbacksSettled ) {
            addToDebugLog( `wkof callback has not finished executing, setting more timeouts on main` );
            setTimeout( () => {
                main( currentFrame, _frameIndex, currentFrameId );
            }, 100 );
            return;
        }
        else {
            globalState.mainRetryCounter--;
            // deno-fmt-ignore
            addToDebugLog(
                `turbo:load has not fired or callback has not finished executing, ${
                    globalState.mainRetryCounter > 0 ?
                        `awaiting main again and returning... (retries left = ${globalState.mainRetryCounter})` :
                        `there are no more retries.`
                }`,
            );
            if ( globalState.mainRetryCounter > 0 ) {
                main( currentFrame, _frameIndex, currentFrameId );
            }
            else {
                if ( settings.enableDebugging ) printDebugLog( INTERNAL_DEBUG );
            }
            return;
        }

        addToDebugLog( `Main function has successfully executed` );

        if ( settings.enableDebugging ) printDebugLog( true );
    }
} )();
