// ==UserScript==
// @name         Show Total Lesson Count - WaniKani
// @namespace    https://codeberg.org/lupomikti
// @version      0.5.11
// @description  Changes the count of lessons on the Today's Lessons tile to show the total number of available lessons in addition to or in place of the daily number you can set
// @license      MIT
// @author       LupoMikti
// @match        https://www.wanikani.com/*
// @grant        none
// @supportURL   https://github.com/lupomikti/Userscripts/issues
// ==/UserScript==

// Additional supportURL: https://community.wanikani.com/t/userscript-show-total-lesson-count/66776

(async function () {
    'use strict';

    /* global wkof */

    const scriptId = 'show_total_lesson_count';
    const scriptName = 'Show Total Lesson Count';

    const globalState = {
        initialLoad: true,
        stateStarting: false,
        todaysLessonsFrameLoaded: false,
        navBarCountFrameLoaded: false,
        hasOutputLog: false,
        turboEventBusy: false,
        mainRetryCounter: 4,
    };

    let debugLogText = `START: ${scriptName} Debug Log:\n`;
    let mainSource = '';
    const INTERNAL_DEBUG_TURBO_HANDLING = false;

    let todaysLessonsCount;
    let settings;

    function addToDebugLog(message) {
        debugLogText += `${new Date().toISOString()}: ${message}\n`;
    }

    function printDebugLog(force = false) {
        if (!globalState.hasOutputLog || force) {
            console.log(`${scriptName}: Outputting a debug log to console.debug()\nTo disable this setting, open "Settings > ${scriptName}" and toggle "Enable console debugging" off`);
            console.debug(debugLogText);
        }
        if (!force) globalState.hasOutputLog = true;
        debugLogText = `START: ${scriptName} Debug Log:\n`;
    }

    if (!window.wkof) {
        if (confirm(scriptName + ' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?')) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        }
        return;
    }

    const wkofTurboEventsScriptUrl = 'https://update.greasyfork.org/scripts/501980/1426289/Wanikani%20Open%20Framework%20Turbo%20Events.user.js';
    addToDebugLog(`Attempting to load the TurboEvents library script...`)
    await wkof.load_script(wkofTurboEventsScriptUrl, /* use_cache */ true);
    addToDebugLog(`Checking if TurboEvents library script is loaded in...`)
    let injectedDependency = document.head.querySelector('script[uid*="Turbo"]');
    addToDebugLog(`Turbo Events library ${injectedDependency ? 'is' : 'is NOT'} loaded.`);

    if (INTERNAL_DEBUG_TURBO_HANDLING) {
        window.addEventListener('turbo:load', () => { console.log(`DEBUG: turbo:load has fired`); });
        window.addEventListener('turbo:before-frame-render', (e) => { console.log(`DEBUG: turbo:before-frame-render has fired for '#${e.target.id}'`); });
        window.addEventListener('turbo:frame-load', (e) => { console.log(`DEBUG: turbo:frame-load has fired for '#${e.target.id}'`); });
    }

    const _init = async (source) => {
        if (globalState.stateStarting) { addToDebugLog(`SOURCE = "${source}" | We are already in the starting state, no need to initialize, returning...`); return; }
        addToDebugLog(`SOURCE = "${source}" | Setting global state and calling _start()`);
        globalState.initialLoad = globalState.stateStarting = true;
        globalState.hasOutputLog = globalState.todaysLessonsFrameLoaded = globalState.navBarCountFrameLoaded = false;
        await _start();
    };

    wkof.ready('TurboEvents').then(() => {
        addToDebugLog(`Start of TurboEvents ready callback`);

        const urlList = [
            wkof.turbo.common.locations.dashboard,
            wkof.turbo.common.locations.items_pages,
            // vvvv Any page with the nav bar that's not one of the above locations vvvv
            /^https:\/\/www\.wanikani\.com\/(settings|level|radicals|kanji|vocabulary)(\/|\?difficulty=).+\/?$/,
        ];

        wkof.turbo.events.load.addListener(async (e) => {
            globalState.turboEventBusy = true;
            await _init('turbo:load').then(() => { globalState.turboEventBusy = false });
        }, { urls: urlList, passive: true });

        wkof.turbo.events.before_frame_render.addListener(async (e) => {
            globalState.turboEventBusy = true;
            const frameId = e.target.id;
            addToDebugLog(`turbo:before-frame-render has fired for "#${frameId}"`);
            if (globalState.initialLoad && !globalState.stateStarting) {
                addToDebugLog(`globalState.initialLoad is true (no frames were previously retrieved) and we are not already in starting state, starting initialization sequence...`);
                await _init('turbo:before-frame-render');
                return;
            }
            if (frameId === 'todays-lessons-frame') {
                globalState.todaysLessonsFrameLoaded = false;
            }
            else if (frameId === 'lesson-and-review-count-frame') {
                globalState.navBarCountFrameLoaded = false;
            }
        }, { urls: urlList, passive: true });

        wkof.turbo.events.frame_load.addListener(async (e) => {
            const frameId = e.target.id;
            addToDebugLog(`turbo:frame-load was fired for "#${frameId}", ${['todays-lessons-frame', 'lesson-and-review-count-frame'].includes(frameId) ? 'calling main function' : 'doing nothing...'}`);
            if (!globalState.stateStarting) {
                addToDebugLog(`DETOUR - turbo:frame-load was fired before we could begin starting or after main fully finished before frame events fired; changing following invocations of main() to _start() if we are not 'doing nothing'`);
            }
            mainSource = `turbo:frame-load for "#${frameId}"`;
            if (frameId === 'todays-lessons-frame') {
                globalState.todaysLessonsFrameLoaded = true;
                if (!globalState.stateStarting) { globalState.stateStarting = true; await _start(); return; }
                await main();
            }
            else if (frameId === 'lesson-and-review-count-frame') {
                globalState.navBarCountFrameLoaded = true;
                if (!globalState.stateStarting) { globalState.stateStarting = true; await _start(); return; }
                await main();
            }
            mainSource = '';
            globalState.turboEventBusy = false;
        }, { urls: urlList, passive: true });

        addToDebugLog(`All turbo callbacks have been sent to TurboEvents library to be registered`);
    }).catch((err) => { addToDebugLog(`TurboEvents library rejected with error: ${err}`); })
        .finally(() => {
            if (INTERNAL_DEBUG_TURBO_HANDLING) {
                addToDebugLog(`SOURCE = "turbo ready finally"`);
                printDebugLog(INTERNAL_DEBUG_TURBO_HANDLING);
            }
            _init(`wkof.ready('TurboEvents') finally callback`);
        });

    async function _start() {
        addToDebugLog(`Starting...`);
        wkof.include('Settings, Menu, Apiv2');
        await wkof.ready('Settings, Menu, Apiv2').then(loadSettings).then(insertMenu).then(main)
            .catch((err) => { addToDebugLog(`wkof.ready('Settings, Menu, Apiv2') rejected (or callbacks threw an exception) with error: ${err}`); })
            .finally(() => { if (INTERNAL_DEBUG_TURBO_HANDLING) { addToDebugLog(`SOURCE = "wkof modules ready finally"`); printDebugLog(INTERNAL_DEBUG_TURBO_HANDLING); } });
    }

    function loadSettings() {
        addToDebugLog(`Loading settings...`);

        let defaults = {
            showTotalOnly: false,
            setOwnPreferredDaily: false,
            preferredDailyAmount: wkof.user.preferences.lessons_batch_size * 3,
            enableDebugging: true,
        };

        return wkof.Settings.load(scriptId, defaults).then(function (wkof_settings) { settings = wkof_settings; });
    }

    function insertMenu() {
        addToDebugLog(`Inserting menu...`);

        let config = {
            name: scriptId,
            submenu: 'Settings',
            title: scriptName,
            on_click: openSettings
        };

        wkof.Menu.insert_script_link(config);
        mainSource = `_start() -> loadSettings() -> insertMenu()`;
    }

    async function saveSettings(wkof_settings) {
        globalState.hasOutputLog = false;
        addToDebugLog(`Save button was clicked on settings, calling main() with new settings...`);
        mainSource = 'wkof.Settings.save()';
        settings = wkof_settings;
        await main();
        mainSource = '';
    }

    function openSettings() {
        let config = {
            script_id: scriptId,
            title: scriptName,
            on_save: saveSettings,
            content: {
                showTotalOnly: {
                    type: 'checkbox',
                    label: 'Show Only Total Lesson Count',
                    hover_tip: `Changes display between "<today's lesson count> / <total lesson count>" and just "<total lesson count>"`,
                    default: false,
                },
                setOwnPreferredDaily: {
                    type: 'checkbox',
                    label: '(DEPRECATED 1)',
                    hover_tip: `THIS SETTING HAS BEEN DEPRECATED DUE TO THE OFFICIAL SETTING FROM WANIKANI.`,
                    default: false,
                },
                preferredDailyAmount: {
                    type: 'number',
                    label: '(DEPRECATED 2)',
                    hover_tip: `THIS SETTING HAS BEEN DEPRECATED DUE TO THE OFFICIAL SETTING FROM WANIKANI.`,
                    min: 0,
                    max: 100,
                },
                enableDebugging: {
                    type: 'checkbox',
                    label: 'Enable console debugging',
                    hover_tip: `Enable output of debugging info to console.debug()`,
                    default: true,
                }
            }
        };

        let dialog = new wkof.Settings(config);
        dialog.open();
    }

    function getCountContainers() {
        let dashboardTileCountContainer = document.querySelector('.todays-lessons-widget__count-text .count-bubble');

        if (globalState.initialLoad && (dashboardTileCountContainer)) {
            let container = dashboardTileCountContainer;
            todaysLessonsCount = parseInt(container.textContent);
            globalState.initialLoad = false;
        }

        return [dashboardTileCountContainer];
    }

    async function main() {
        addToDebugLog(`Main function is executing... source of start = [${mainSource}]`);

        if (!settings) {
            addToDebugLog(`We do not have settings, setting timeout on _start()`);
            if (!globalState.stateStarting) { setTimeout(_start, 50); }
            else addToDebugLog(`Did not set timeout due to already being in starting state`);
            addToDebugLog(`Main function is returning (source = [${mainSource}])`);
            return;
        }
        addToDebugLog(`We have settings`);

        addToDebugLog(`Retrieving summary data via await of the endpoint...`);
        let summary_data = await wkof.Apiv2.get_endpoint('summary');
        addToDebugLog(`Summary data has been retrieved`);

        if (!globalState.stateStarting && globalState.hasOutputLog) {
            globalState.hasOutputLog = false;
            addToDebugLog(`Main function successfully executed beforehand, preventing repeat execution...`);
            if (settings.enableDebugging) printDebugLog(INTERNAL_DEBUG_TURBO_HANDLING);
            return;
        }

        let totalLessonCount = summary_data.lessons[0].subject_ids.length;
        let lessonCountContainers;

        if (globalState.todaysLessonsFrameLoaded || globalState.navBarCountFrameLoaded) {
            addToDebugLog(`Frame(s) loaded, retrieving containers in frames containing the counts...`);
            lessonCountContainers = getCountContainers();
            addToDebugLog(`Count containers have been retrieved`);
        }
        else {
            addToDebugLog(`No frames loaded, checking to see if all listened-to turbo events have settled...`);
            addToDebugLog(`starting = ${globalState.stateStarting}, turboEventBusy = ${globalState.turboEventBusy}, retries = ${globalState.mainRetryCounter}`)
            if (globalState.stateStarting && !globalState.turboEventBusy && globalState.mainRetryCounter > 0) {
                addToDebugLog(`Turbo Events have settled but we have not verified frames, using alternate verification...`);
                let tmpContainer = document.querySelector('.todays-lessons-widget__count-text');
                if (tmpContainer && tmpContainer.childElementCount > 0) globalState.todaysLessonsFrameLoaded = true;
                mainSource = 'main() function, no frames alternate verification';
                globalState.mainRetryCounter--;
                addToDebugLog(`Alternate verification process completed, retrying main(), ${globalState.mainRetryCounter} retries left...`);
                await main();
                mainSource = ''
                return;
            }
            else if (globalState.mainRetryCounter === 0) {
                addToDebugLog(`Unable to verify loading of frames through alternate method, please refresh the page to try again from scratch`);
            }
            else {
                addToDebugLog(`Turbo event callbacks are still executing, continuing...`);
            }
            addToDebugLog(`Main function is returning (source = [${mainSource}])`);
            //if (settings.enableDebugging) printDebugLog(INTERNAL_DEBUG_TURBO_HANDLING);
            return;
        }

        let todaysCountForDisplay = todaysLessonsCount;

        if (lessonCountContainers.every(node => node == null)) {
            addToDebugLog(`No nodes in containers`);
            addToDebugLog(`Main function is returning (source = [${mainSource}])`);
            //if (settings.enableDebugging) printDebugLog(INTERNAL_DEBUG_TURBO_HANDLING);
            return;
        }
        addToDebugLog(`At least one container exists`);
        globalState.stateStarting = false;

        if (isNaN(todaysLessonsCount)) todaysCountForDisplay = 0;

        if (lessonCountContainers[0]) {
            lessonCountContainers[0].textContent = settings.showTotalOnly ? totalLessonCount : todaysCountForDisplay + ' / ' + totalLessonCount;
            addToDebugLog(`Setting display amount for Today's Lessons tile, set to ${lessonCountContainers[0].textContent}`);
        }

        if (lessonCountContainers[1]) {
            lessonCountContainers[1].textContent = settings.showTotalOnly ? totalLessonCount : todaysCountForDisplay;
            addToDebugLog(`Setting display amount for navigation bar, set to ${lessonCountContainers[1].textContent}`);
        }

        // The commented code below is useless because the dashboard hides the Start button anyway

        // if ((settings.showTotalOnly && totalLessonCount === 0) || (!settings.showTotalOnly && todaysCountForDisplay === 0)) {
        //     addToDebugLog(`Hiding start button due to having 0 lessons with configured count source`);
        //     // hide the start button if it is not already, TODO: disable nav bar button if it is not already
        //     let startButton = document.querySelector('.todays-lessons-widget__button.todays-lessons-widget__button--start')//
        //     if (startButton && startButton.checkVisibility()) {
        //         startButton.style.display = 'none';
        //     }
        // }

        // hide "Today's" subtitle
        let lessonSubtitle = document.querySelector('.todays-lessons-widget__subtitle');

        if (lessonSubtitle && lessonSubtitle.checkVisibility()) {
            addToDebugLog(`Hiding the "Today's" subtitle on the lesson tile`);
            lessonSubtitle.style.display = 'none';
        }

        addToDebugLog(`Main function has successfully executed`);

        if (settings.enableDebugging) printDebugLog(INTERNAL_DEBUG_TURBO_HANDLING);
    }
})();
