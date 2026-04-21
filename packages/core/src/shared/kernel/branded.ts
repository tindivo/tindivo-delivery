/**
 * Branded types (nominal typing) — impiden mezclar IDs u otros strings
 * que comparten la misma representación primitiva pero distinto significado.
 */
declare const brand: unique symbol

export type Brand<T, B> = T & { readonly [brand]: B }

export type UUID = Brand<string, 'UUID'>
