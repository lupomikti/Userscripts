declare namespace Turbo {
    type TurboWrapperEventCallback = (event: CustomEvent, url: string) => void

    type TurboWrapperEventList = string | object | Array<string | object> | Set<string | object>

    type TurboWrapperURLList = string | RegExp | Array<string | RegExp> | Set<string | RegExp>

    type TurboWrappedListener = {
        wrapper: (event: Event) => Promise<void|any>
        listener: TurboWrapperEventCallback
        options: TurboWrapperEventListenerOptions
    }

    interface TurboWrapperEventListenerOptions extends AddEventListenerOptions {
        nocache?: boolean
        noWarn?: boolean
        timeout?: 'none' | 'promise' | 'setTimeout' | 'both'
        targetIds?: string | Array<string> | Set<string> | {[key: string]: any}
        urlHandler?: (event: Event) => string | URL
        urls?: TurboWrapperURLList
        useDocumentIds?: boolean
    }

    class TurboWrapper {
        name: string
        source: string
        private urlHandler: (event: Event) => URL
        private listeners: Array<TurboWrappedListener>

        constructor(source: string, name: string, urlHandler: (event: Event) => URL)

        toString: () => string

        addListener: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
        private addWrappedListener: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
        private createListenerWrapper: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => ((event: Event) => Promise<void|any>)
        removeListener: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
        private removeWrappedListener: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
    }

    export type Module = {
        turbo: {
            add_event_listener: (eventName: string, listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
            add_event_listeners: (eventList: TurboWrapperEventList, listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => {name: string, added: boolean}[]
            add_typical_page_listener: (listener: TurboWrapperEventCallback, urls: TurboWrapperURLList, options?: TurboWrapperEventListenerOptions) => boolean
            add_typical_frame_listener: (listener: TurboWrapperEventCallback, targetIds?: string | Array<string> | Set<string>, options?: TurboWrapperEventListenerOptions) => boolean
            remove_event_listener: (eventName: string | object, listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
            remove_event_listeners: (eventList: TurboWrapperEventList, listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => {name: string, removed: boolean}[]
            on: {
                common: {
                    /** @deprecated Use {@link wkof.turbo.add_event_listeners} */ eventList: (eventList: TurboWrapperEventList, listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => {name: string, added: boolean}[]
                    /** @deprecated Use {@link wkof.turbo.add_event_listeners} */ events: (eventList: TurboWrapperEventList, listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => {name: string, added: boolean}[]
                    targetIds: (listener: TurboWrapperEventCallback, targetIds?: string | Array<string> | Set<string>, options?: TurboWrapperEventListenerOptions) => boolean
                    urls: (listener: TurboWrapperEventCallback, urls: TurboWrapperURLList, options?: TurboWrapperEventListenerOptions) => boolean
                    dashboard: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    items_pages: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    lessons: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    lessons_picker: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    lessons_quiz: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    reviews: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean

                }
                event: {
                    /** @deprecated Use [wkof.turbo.events.before_cache.addListener]{@link TurboWrapper#addListener} instead.*/ before_cache: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_fetch_request.addListener]{@link TurboWrapper#addListener} instead.*/ before_fetch_request: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_fetch_response.addListener]{@link TurboWrapper#addListener} instead.*/ before_fetch_response: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_frame_render.addListener]{@link TurboWrapper#addListener} instead.*/ before_frame_render: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_morph_attribute.addListener]{@link TurboWrapper#addListener} instead.*/ before_morph_attribute: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_morph_element.addListener]{@link TurboWrapper#addListener} instead.*/ before_morph_element: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_prefetch.addListener]{@link TurboWrapper#addListener} instead.*/ before_prefetch: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_render.addListener]{@link TurboWrapper#addListener} instead.*/ before_render: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_stream_render.addListener]{@link TurboWrapper#addListener} instead.*/ before_stream_render: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.before_visit.addListener]{@link TurboWrapper#addListener} instead.*/ before_visit: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.click.addListener]{@link TurboWrapper#addListener} instead.*/ click: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.fetch_request_error.addListener]{@link TurboWrapper#addListener} instead.*/ fetch_request_error: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.frame_load.addListener]{@link TurboWrapper#addListener} instead.*/ frame_load: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.frame_missing.addListener]{@link TurboWrapper#addListener} instead.*/ frame_missing: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.frame_render.addListener]{@link TurboWrapper#addListener} instead.*/ frame_render: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.load.addListener]{@link TurboWrapper#addListener} instead.*/ load: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.morph.addListener]{@link TurboWrapper#addListener} instead.*/ morph: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.morph_element.addListener]{@link TurboWrapper#addListener} instead.*/ morph_element: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.render.addListener]{@link TurboWrapper#addListener} instead.*/ render: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.submit_end.addListener]{@link TurboWrapper#addListener} instead.*/ submit_end: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.submit_start.addListener]{@link TurboWrapper#addListener} instead.*/ submit_start: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                    /** @deprecated Use [wkof.turbo.events.visit.addListener]{@link TurboWrapper#addListener} instead.*/ visit: (listener: TurboWrapperEventCallback, options?: TurboWrapperEventListenerOptions) => boolean
                }
            }
            events: {
                click: TurboWrapper
                before_visit: TurboWrapper
                visit: TurboWrapper
                before_cache: TurboWrapper
                before_render: TurboWrapper
                render: TurboWrapper
                load: TurboWrapper
                morph: TurboWrapper
                before_morph_element: TurboWrapper
                before_morph_attribute: TurboWrapper
                morph_element: TurboWrapper
                submit_start: TurboWrapper
                submit_end: TurboWrapper
                before_frame_render: TurboWrapper
                frame_render: TurboWrapper
                frame_load: TurboWrapper
                frame_missing: TurboWrapper
                before_stream_render: TurboWrapper
                before_fetch_request: TurboWrapper
                before_prefetch: TurboWrapper
                fetch_request_error: TurboWrapper
                "turbo:click": TurboWrapper
                "turbo:before_visit": TurboWrapper
                "turbo:visit": TurboWrapper
                "turbo:before_cache": TurboWrapper
                "turbo:before_render": TurboWrapper
                "turbo:render": TurboWrapper
                "turbo:load": TurboWrapper
                "turbo:morph": TurboWrapper
                "turbo:before_morph_element": TurboWrapper
                "turbo:before_morph_attribute": TurboWrapper
                "turbo:morph_element": TurboWrapper
                "turbo:submit_start": TurboWrapper
                "turbo:submit_end": TurboWrapper
                "turbo:before_frame_render": TurboWrapper
                "turbo:frame_render": TurboWrapper
                "turbo:frame_load": TurboWrapper
                "turbo:frame_missing": TurboWrapper
                "turbo:before_stream_render": TurboWrapper
                "turbo:before_fetch_request": TurboWrapper
                "turbo:before_prefetch": TurboWrapper
                "turbo:fetch_request_error": TurboWrapper
            }
            common: {
                locations: {
                    dashboard: RegExp
                    extra_study: RegExp
                    items_pages: RegExp
                    lessons: RegExp
                    lessons_picker: RegExp
                    lessons_qiuiz: RegExp
                    reviews: RegExp
                }
            }
            version: string
            "_.internal": {
                internalHandlers: {[key: string]: Array<TurboWrappedListener>}
                lastUrlLoaded: URL | null
            }
        }
    }
}

/**
 * @remark Include like other WKOF modules: WKOF & Turbo
 */
export type Turbo = Turbo.Module