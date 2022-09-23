import one from "data-base64:~assets/screenShare/firefox-1.png"
import two from "data-base64:~assets/screenShare/firefox-2.png"

const firefoxInstructions = [
  <>
    <img src={one} style={{ width: 500 }} alt="firefox-1" />

    <h1>Select the current window</h1>
    <p>Click on "Select window or screen" and select the current window.</p>
  </>,
  <>
    <img src={two} style={{ width: 500 }} alt="firefox-2" />

    <h1>Click "Allow" to share the audio</h1>
    <p>
      Click "Allow" to share the audio for Skip silence. After sharing, Skip
      silence can find out the volume of the tab.
    </p>
  </>
]
export default firefoxInstructions
