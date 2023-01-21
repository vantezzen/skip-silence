import React from "react"
import { X } from "react-feather"

import demoImage from "../../../assets/neonfin.png"
import "./NeonFin.scss"

const shouldHide = localStorage.getItem("hideNeonFin") === "yes"

function NeonFin() {
  const [isHidden, setIsHidden] = React.useState(shouldHide)

  if (isHidden) {
    return null
  }

  return (
    <div className="neonfin-info">
      <div className="image-container">
        <img src={demoImage} alt="neonFin" />
      </div>
      <div className="main-content">
        <h2>Want to optimize your finances?</h2>
        <p>
          Get control of your finances with neonFin - the ultimate budget book
          app from the creators of Skip Silence. Track your spending with
          advanced stats, level up points, and more.
        </p>

        <a
          href="https://neonfin.app"
          target="_blank"
          rel="noopener noreferrer"
          className="button">
          Learn more
        </a>
        <button
          className="close-button"
          onClick={() => {
            localStorage.setItem("hideNeonFin", "yes")
            setIsHidden(true)
          }}>
          <X size={10} />
        </button>
      </div>
    </div>
  )
}

export default NeonFin
