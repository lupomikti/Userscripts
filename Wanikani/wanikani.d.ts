import { WKOF, ItemData, Menu, Settings, Apiv2 } from './WKOF Types/wkof.d.ts'
import { Turbo } from "./WKOF Types/wkof.turbo.d.ts"

declare global {
    interface Window {
        wkof: WKOF & ItemData & Menu & Settings & Apiv2 & Turbo
    }
}