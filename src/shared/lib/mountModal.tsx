// @ts-nocheck
// prettier-sort-ignore
import React from "react"
import { createRoot } from "react-dom/client"

export default async function mountModal(Component: React.ComponentType) {
  async function createShadowContainer() {
    const container = document.createElement("div")

    container.style.cssText = `
    z-index: 9999;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    min-height: 100vh;
  `

    const shadowHost = document.createElement("div")

    const shadowRoot = shadowHost.attachShadow({ mode: "open" })
    document.body.insertAdjacentElement("beforebegin", shadowHost)

    shadowRoot.appendChild(container)
    return container
  }

  const rootContainer = await createShadowContainer()
  const root = createRoot(rootContainer)
  root.render(<Component />)

  return rootContainer
}
