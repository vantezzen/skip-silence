import { supportsTabCapture } from "~shared/platform"

import BackgroundManager from "./BackgroundManager"
import setupKeyboardShortcutsListener from "./keyboardShortcuts"

if (supportsTabCapture) {
  new BackgroundManager()
}
setupKeyboardShortcutsListener()

// Needed for Typescript validation
export {}
