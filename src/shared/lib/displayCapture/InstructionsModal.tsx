import React from "react"

import { isChromium } from "~shared/platform"

import chromeInstructions from "./chromeInstructions"
import firefoxInstructions from "./firefoxInstructions"

function Button({
  children,
  onClick,
  color
}: {
  children: React.ReactNode
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: color,
        color: "white",
        padding: "10px 40px",
        margin: 10,
        border: "none",
        borderRadius: 10,
        cursor: "pointer"
      }}>
      {children}
    </button>
  )
}

function InstructionsModal() {
  const [step, setStep] = React.useState(0)

  const steps = [
    <>
      <h1>Enable Display capturing for "Skip silence"</h1>

      <p>
        Because "Display capture" is selected for the analyzer type, Skip
        Silence required you to give access to the <b>current</b> tab's output
      </p>
      <p>
        This small tutorial will show you the two steps necessary to enable the
        audio share.
        <br />
        After the tutorial is complete, the share popup will open.
      </p>
    </>,
    ...(isChromium ? chromeInstructions : firefoxInstructions),
    <>
      <h1>Prompt will now open</h1>
      <p>
        When clicking "Open prompt" the prompt will open. Complete the steps
        from the tutorial to start Skip silence
      </p>
    </>
  ]

  return (
    <div
      style={{
        backgroundColor: "white",
        height: "100vh",
        width: "100%",
        padding: 20,
        fontFamily:
          "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"
      }}>
      {steps[step]}

      {step < steps.length - 1 && (
        <Button color="green" onClick={() => setStep(step + 1)}>
          Next
        </Button>
      )}
      {step === steps.length - 1 && (
        <Button
          color="green"
          onClick={() => {
            window.__SKIP_SILENCE_DISPLAY_MEDIA_CALLBACK()
          }}>
          Open prompt
        </Button>
      )}

      <Button
        onClick={() => {
          window.__SKIP_SILENCE_DISPLAY_MEDIA_CALLBACK()
        }}
        color="#212121">
        Skip tutorial
      </Button>
    </div>
  )
}

export default InstructionsModal
