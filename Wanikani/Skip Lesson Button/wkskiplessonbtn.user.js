// ==UserScript==
// @name         WaniKani Skip Lesson Button
// @namespace    https://codeberg.org/lupomikti
// @version      1.2.0
// @description  Lets you skip having to do the lesson for an item from its item page. Requires WKOF.
// @author       LupoMikti
// @match        https://www.wanikani.com/radicals/*
// @match        https://www.wanikani.com/kanji/*
// @match        https://www.wanikani.com/vocabulary/*
// @run-at       document-end
// @connect      api.wanikani.com
// @license      MIT
// ==/UserScript==

// Modified from the WK lesson cherry picker script made by Alphaxion

( function () {
    "use strict";

    /* global wkof */

    const scriptName = "WaniKani Skip Lesson Button";
    if ( !wkof ) {
        // deno-fmt-ignore
        if (confirm(`${scriptName} requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?`))
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return;
    }

    const accessTokenUrl = "https://www.wanikani.com/settings/personal_access_tokens";
    let level, pageType, itemText, learnButton, subjectId, assignmentId, settings;

    const modules = "ItemData, Apiv2, Settings";
    wkof.include( modules );
    wkof.ready( modules ).then( loadSettings ).then( startup );

    function loadSettings() {
        return wkof.Settings.load( "wkslb", { apikey: "none" } ).then( function ( _data ) {
            settings = wkof.settings.wkslb;

            if ( wkof.settings.wklcp ) {
                settings.apikey = wkof.settings.wklcp.apikey;
                wkof.Settings.save( "wkslb" );
            }
        } );
    }

    function startup() {
        if ( !checkForApiKey() ) return;
        installCSS();
        createButtons( document.body );
    }

    function checkForApiKey() {
        if ( settings.apikey === "none" ) {
            const givenkey = prompt(
                "WK Skip Lesson Button: Please enter a valid WaniKani API Key with permission to start assignments.",
            );
            if ( givenkey !== null && wkof.Apiv2.is_valid_apikey_format( givenkey ) ) {
                settings.apikey = givenkey;
                wkof.Settings.save( "wkslb" );
                return true;
            }
            return false;
        }
        return true;
    }

    function installCSS() {
        const style = `<style id="wkskiplessoncss">
            .page-header__icon--jisho {
                background-color: #707070;
                width: 3em;
                color: var(--color-text-dark, --color-text);
            }

            .page-header__icon--lesson {
                width: 6em;
                color: var(--color-text-dark, --color-text);
            }

            .page-header__icon--lesson.rad {
                background-color: var(--color-radical);
            }

            .page-header__icon--lesson.kan {
                background-color: var(--color-kanji);
            }

            .page-header__icon--lesson.voc {
                background-color: var(--color-vocabulary);
            }
        </style>`;

        document.head.insertAdjacentHTML( "beforeend", style );
    }

    function getPageType( url ) {
        if ( url.includes( "wanikani.com/radicals" ) ) return "rad";
        else if ( url.includes( "wanikani.com/kanji" ) ) return "kan";
        else if ( url.includes( "wanikani.com/vocabulary" ) ) return "voc";
        else return "other";
    }

    function createButtons( body ) {
        level = body.querySelector( ".page-header__icon--level" ).innerHTML;
        pageType = getPageType( document.URL );
        switch ( pageType ) {
            case "rad":
                itemText = body.querySelector( ".page-header__title-text" ).innerHTML.toLowerCase();
                break;
            case "kan":
                itemText = body.querySelector( ".page-header__icon--kanji" ).innerHTML;
                break;
            case "voc":
                itemText = body.querySelector( ".page-header__icon--vocabulary" ).innerHTML;
                break;
            default:
                return;
        }

        // Bonus : add a link to jisho.org
        if ( pageType !== "rad" ) {
            const jishoLink = `https://jisho.org/search/${pageType === "kan" ? itemText + "%23kanji" : itemText}`;
            body.querySelector( ".page-header__icon--level" ).insertAdjacentHTML(
                "beforebegin",
                `<a class="page-header__icon page-header__icon--jisho" href="${jishoLink}">JISHO</a>`,
            );
        }

        const config = {
            "wk_items": {
                options: { assignments: true },
                filters: {
                    srs: "init",
                    level: level,
                },
            },
        };

        wkof.ItemData.get_items( config ).then( function ( items ) {
            for ( const item of items ) {
                if ( 
                    ( item.object !== "radical" && item.data.characters === itemText )
                    || ( item.object === "radical" && item.data.slug === itemText )
                 ) {
                    subjectId = item.id;
                    buildSkipButton( body );
                    break;
                }
            }
        } );
    }

    function buildSkipButton( body ) {
        const pageHeader = body.querySelector( ".page-header__title" );
        pageHeader.insertAdjacentHTML(
            "afterbegin",
            `<a id="wkskiplessonbtn" class="page-header__icon page-header__icon--lesson ${pageType}" href="javascript:void(0)">Skip Lesson</a>`,
        );

        learnButton = document.getElementById( "wkskiplessonbtn" );
        learnButton.addEventListener( "click", learnVocab );
    }

    async function learnVocab( _ev ) {
        const wkofOptions = {
            filters: {
                srs_stages: [ 0 ],
                levels: level,
            },
        };

        const results = await wkof.Apiv2.fetch_endpoint( "assignments", wkofOptions );
        let didRetry = false;

        for ( const assignment of results.data ) {
            if ( assignment.data.subject_id === subjectId ) {
                assignmentId = assignment.id;
                try {
                    sendLearnRequest( settings.apikey );
                }
                catch ( _e ) {
                    didRetry = true;
                    sendLearnRequest( wkof.Apiv2.key );
                }
                break;
            }
        }

        function sendLearnRequest( key ) {
            fetch( `https://api.wanikani.com/v2/assignments/${assignmentId}/start`, {
                method: "PUT",
                headers: {
                    "Authorization": "Bearer " + key,
                    "Wanikani-Revision": "20170710",
                },
                body: {
                    "started_at": new Date().toISOString(),
                },
            } ).then( function ( response ) {
                if ( response.status !== 200 ) {
                    if ( !didRetry ) throw "Bad Request";
                    // deno-fmt-ignore
                    if ( confirm(`WK API answered : ${response.status} ${response.statusText}\nDo you want to enter a different API key?`) ) {
                        settings.apikey = "none";
                        wkof.Settings.save( "wkslb" );
                        window.location.href = accessTokenUrl;
                    }
                }
                else {
                    if ( didRetry ) {
                        settings.apikey = wkof.Apiv2.key;
                        wkof.Settings.save( "wkslb" );
                    }
                    learnButton.removeEventListener( "click", learnVocab );
                    learnButton.remove();
                }
            } );
        }
    }

    window.addEventListener( "turbo:before-render", function ( e ) {
        e.preventDefault();
        createButtons( e.detail.newBody );
        e.detail.resume();
    } );
} )();
