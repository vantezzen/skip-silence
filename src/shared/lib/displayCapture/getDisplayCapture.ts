import mountModal from "../mountModal"
import InstructionsModal from "./InstructionsModal"

/**
 * Get a display capture for the current tab
 */
export default function getDisplayCapture(): Promise<MediaStream> {
  return new Promise(async (resolve, reject) => {
    const infoElement = await mountModal(InstructionsModal)

    window.__SKIP_SILENCE_DISPLAY_MEDIA_CALLBACK = async () => {
      window.__SKIP_SILENCE_DISPLAY_MEDIA_CALLBACK = false
      try {
        const context = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })

        infoElement.remove()

        resolve(context)
      } catch (e) {
        infoElement.remove()
        alert(
          "Failed to get display capture. Skip silence will not work without access to the tab's output. Reload the page to try again"
        )
        reject(e)
      }
    }
  })
}
