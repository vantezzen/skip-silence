import { isChromium } from "~shared/platform"

import BackgroundManager from "./BackgroundManager"
import setupKeyboardShortcutsListener from "./keyboardShortcuts"

if (isChromium) {
  new BackgroundManager()
}
setupKeyboardShortcutsListener()

// Needed for Typescript validation
export {}
