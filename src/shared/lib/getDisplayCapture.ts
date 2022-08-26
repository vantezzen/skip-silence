/**
 * Get a display capture for the current tab
 */
export default function getDisplayCapture(): Promise<MediaStream> {
  return new Promise(async (resolve, reject) => {
    const infoElement = document.createElement("div")
    infoElement.setAttribute(
      "style",
      "position:fixed;z-index:999999;top:0;left:0;width:100vw;height:100vh;background-color:white;display:flex;justify-content:end;align-items:center;color: #212121;flex-direction: column;cursor:pointer;isolation: isolate;"
    )
    infoElement.innerHTML = `
      <h1>Skip Silence requires access to display capturing</h1>
      <p>Because "Display capture" is selected for the analyzer type, Skip Silence required you to give access to the <b>current</b> tab's output</p>
      <p>Also make sure "Share tab audio" is enabled</p>
      <p>Select the current page and confirm to start Skip silence.</p>
    `
    document.body.appendChild(infoElement)

    try {
      const context = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        // @ts-ignore
        preferCurrentTab: true
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
  })
}
