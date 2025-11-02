// ==UserScript==
// @name         WaniKani Visible SRS Stage
// @namespace    https://codeberg.org/lupomikti
// @version      0.10
// @description  Shows the current review item's current SRS stage before being changed.
// @author       LupoMikti
// @match        https://www.wanikani.com/*
// @match        https://preview.wanikani.com/*
// @require      https://greasyfork.org/scripts/462049-wanikani-queue-manipulator/code/WaniKani%20Queue%20Manipulator.user.js?version=1251359
// @grant        none
// @license      MIT
// ==/UserScript==

( function () {
    "use strict";

    /* global wkQueue */

    const srsStages = [
        "Initiate",
        "Apprentice 1",
        "Apprentice 2",
        "Apprentice 3",
        "Apprentice 4",
        "Guru 1",
        "Guru 2",
        "Master",
        "Enlightened",
        "Burned",
    ];

    let shownItem = {};
    let firstQuestion = true;
    const itemData = {};

    function buildItemData( queue ) {
        for ( const item of queue ) {
            itemData[item.id] = { srs: item.srs, srsName: srsStages[item.srs] };
        }
    }

    if ( window.location.pathname === "/subjects/review" ) {
        wkQueue.on( "review" ).addPostprocessing( buildItemData );
        setup();
    }

    function setup( fromTurbo = false ) {
        if ( window.location.pathname !== "/subjects/review" ) return;
        if ( isEmptyObj( itemData ) && fromTurbo ) wkQueue.on( "review" ).addPostprocessing( buildItemData );

        const css =
            `@supports (container-type: inline-size) { @container (min-width: 768px) { .character-header__menu-statistics { flex: 1 0 180px; } } }`;
        document.head.insertAdjacentHTML( "beforeend", `<style id="visible_srs_css">${css}</style>` );

        const container = document.createElement( "div" );
        container.title = "current srs stage";
        container.classList.add( "quiz-statistics__item" );
        const innerDiv = document.createElement( "div" );
        innerDiv.classList.add( "quiz-statistics__item-srs" );

        container.append( innerDiv );

        document.querySelector( ".quiz-statistics" ).prepend( container );

        window.addEventListener( "willShowNextQuestion", setCurrentItem );
    }

    function setCurrentItem( event ) {
        if ( isEmptyObj( itemData ) ) return;
        shownItem = itemData[event.detail.subject.id];
        shownItem.characters = event.detail.subject.characters;
        if ( 
            firstQuestion
            && document.querySelector( "div[data-quiz-statistics-target=completeCount]" ).innerText === "0"
         ) {
            const divToChange = document.querySelector( ".quiz-statistics__item-srs" );
            divToChange.innerHTML = shownItem.srsName;
            firstQuestion = false;

            const target = document.querySelector( "div[data-quiz-header-target=characters]" );
            const observer = new MutationObserver( function ( _mutations ) {
                const divToChange = document.querySelector( ".quiz-statistics__item-srs" );

                if ( !firstQuestion && divToChange.innerText === shownItem.srsName ) {
                    // even if reordering introduces a new first question, as long as the srs stage changes this block will not run
                    return;
                }

                divToChange.innerHTML = shownItem.srsName;
            } );
            const observerConfig = { attributes: false, childList: true, characterData: true };
            observer.observe( target, observerConfig );
        }
    }

    function isEmptyObj( obj ) {
        for ( const prop in obj ) if ( Object.hasOwn( obj, prop ) ) return false;

        return true;
    }

    window.addEventListener( "turbo:before-render", ( e ) => {
        let observer = new MutationObserver( (m) => {
            if ( m[0].target.childElementCount > 0 ) return;
            observer.disconnect();
            observer = null;
            setup( true );
        } );
        observer.observe( e.detail.newBody, { childList: true } );
    } );
} )();
