import one from "data-base64:~assets/screenShare/chrome-1.png"
import two from "data-base64:~assets/screenShare/chrome-2.png"

const chromeInstructions = [
  <>
    <img src={one} style={{ width: 500 }} alt="chrome-1" />

    <h1>Click "Chrome Tab" in the top right corner</h1>
    <p>
      Choose the "Chrome Tab" option to only share the audio output of a single
      tab
    </p>
  </>,
  <>
    <img src={two} style={{ width: 500 }} alt="chrome-2" />

    <h1>Select the current tab and share</h1>
    <p>
      Select the current tab from the list and click "Share". Make sure "Share
      tab audio" in enabled.
    </p>
  </>
]
export default chromeInstructions
