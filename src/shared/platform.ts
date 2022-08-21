export const isChromium = navigator.userAgent.includes("Chrome")
export const supportsTabCapture =
  isChromium && process.env.PLASMO_MANIFEST_VERSION === "mv2"
