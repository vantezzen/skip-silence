import debugging from "debug"

import type { MediaElement } from "../../shared/types"

const debug = debugging("skip-silence:contents:lib:SpeedController")

/**
 * Speed Controller
 * Controls speeding up and down the media element
 */
export default class SpeedController {
  _handlingRateChangeError = false
  _blockRateChangeEvents = false
  _rateChangeListenerAdded = false
  _targetPlaybackRate = 0

  elements: MediaElement[] = []

  /**
   * Fixes issues changing the playback rate by temporarily blocking `ratechange` event listeners.
   */
  _handlePlaybackRateChangeError(element: MediaElement) {
    this._handlingRateChangeError = true
    // If the playback rate was set to zero by the website, it's probably because the video is not
    // loaded and can no longer be played, and so shouldn't be tampered with.
    if (element.playbackRate !== 0) {
      // Prevent ratechange event listeners from running while we forcibly change playback rate
      this._blockRateChangeEvents = true

      if (!this._rateChangeListenerAdded) {
        // Passing in `true` for the third parameter causes the event to be captured on the way down.
        element.addEventListener(
          "ratechange",
          (event: Event) => {
            if (this._blockRateChangeEvents) {
              // Ensure the event never reaches its listeners
              event.stopImmediatePropagation()
            } else {
              // If the playback rate changes from 0 back to the default rate (usually 1) and that's
              // not what we want it to be, update it.
              if (
                element.playbackRate !== 0 &&
                element.playbackRate === element.defaultPlaybackRate &&
                element.playbackRate !== this._targetPlaybackRate
              ) {
                this.setPlaybackRateForElement(
                  this._targetPlaybackRate,
                  element
                )
              }
            }
          },
          true
        )
        this._rateChangeListenerAdded = true
      }

      setTimeout(() => {
        // Now try setting the rate again
        element.playbackRate = this._targetPlaybackRate
        // Wait for any ratechange events to fire and get blocked
        setTimeout(() => {
          // Once we have successfully changed the playback rate, allow rate change events again.
          // We don't just remove the event entirely as we might only want to override the event
          // some of the time.
          this._blockRateChangeEvents = false
          this._handlingRateChangeError = false
        }, 1)
      }, 1)
    } else {
      this._handlingRateChangeError = false
    }
  }

  /**
   * Attempts to change the video playback rate
   */
  setPlaybackRateForElement(rate: number, element: MediaElement) {
    this._targetPlaybackRate = rate

    if (rate === 1) {
      // Setting the speed to exactly 1 will cause audio clicking
      // Setting the speed to slightly greater than 1 will prevent this from happening
      // Related: https://github.com/vantezzen/skip-silence/issues/52
      this._targetPlaybackRate = 1.01
    }

    element.playbackRate = this._targetPlaybackRate
    if (!this._handlingRateChangeError) {
      // Make sure that the playback rate actually changed
      setTimeout(() => {
        const failedToChangeRate =
          element.playbackRate !== this._targetPlaybackRate
        if (failedToChangeRate) {
          // If it didn't, try to forcibly change it
          this._handlePlaybackRateChangeError(element)
        }
      }, 1)
    }
  }

  setPlaybackRate(rate: number) {
    this.elements = [
      ...document.querySelectorAll("video, audio")
    ] as MediaElement[]
    debug(
      "Setting playback rate to",
      rate,
      "on",
      this.elements.length,
      "elements"
    )

    this.elements.forEach((element) => {
      this.setPlaybackRateForElement(rate, element)
    })
  }
}
