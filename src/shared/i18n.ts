import browser from "webextension-polyfill"

type ReplacementStrings = {
  [key: string]: string
}

export default function __(
  name: string,
  replacements?: ReplacementStrings
): string {
  let message = browser.i18n.getMessage(name)

  if (replacements) {
    for (const key in replacements) {
      message = message.replace(`:${key}`, replacements[key])
    }
  }

  return message
}
