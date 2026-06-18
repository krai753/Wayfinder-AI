/**
 * Backwards-compatibility re-export. Old screens import `GlassCard`
 * from this file. We re-export the new premium `Card` so every
 * screen gets the Doppelrand + glass + tokenized styling
 * automatically — no code changes needed in the consumers.
 *
 * This file is the alias. The real component is `./Card`.
 *
 * To delete in the future: migrate the 9 remaining screens to
 * import from `../ui/Card` directly, then delete this file.
 */
export { Card as GlassCard, type CardProps as GlassCardProps } from "./Card";
