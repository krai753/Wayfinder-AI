/**
 * Backwards-compatibility re-export. Old screens import
 * `PrimaryButton` from this file. We re-export the new premium
 * `Button` so every screen gets the Button-in-Button trailing icon
 * + spring whileTap + tokenized styling automatically — no code
 * changes needed in the consumers.
 *
 * This file is the alias. The real component is `./Button`.
 *
 * To delete in the future: migrate the 7 remaining screens to
 * import from `../ui/Button` directly, then delete this file.
 */
export { Button as PrimaryButton, type ButtonProps as PrimaryButtonProps } from "./Button";
