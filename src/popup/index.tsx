import "fontsource-poppins"
import "fontsource-poppins/600.css"
import { Steps } from "intro.js-react"
import "intro.js/introjs.css"
import React, { ChangeEvent, Component } from "react"
import browser from "webextension-polyfill"

import trackEvent, { setupAnalytics } from "../shared/analytics"
import LocalPlayerInfo from "../shared/components/localPlayerInfo"
import VUMeter from "../shared/components/vuMeter"
import ConfigProvider, { getCurrentTabId } from "../shared/configProvider"
import __ from "../shared/i18n"
import verifyLicense from "../shared/license"
import "./Popup.scss"
import Footer from "./components/Footer"
import SettingsForm from "./components/SettingsForm"
import Header from "./components/header"
import PlusInfo from "./components/plusInfo"
import V4Info from "./components/v4info"
import { introSteps } from "./config"
import "./index.scss"

// Simple Analytics Event Wrapper
window.sa_event =
  window.sa_event ||
  function () {
    var a = [].slice.call(arguments)
    // @ts-ignore
    window.sa_event.q ? window.sa_event.q.push(a) : (window.sa_event.q = [a])
  }
window.plausible =
  window.plausible ||
  function () {
    // @ts-ignore
    ;(window.plausible.q = window.plausible.q || []).push(arguments)
  }

class Popup extends Component {
  config?: ConfigProvider
  isComponentMounted = false

  state = {
    shouldShowIntro: localStorage.getItem("hasShownIntro") !== "yes",
    isLocalPlayer: false,
    isPlus: false,
    showPlusPopup: false
  }

  constructor(props: object) {
    super(props)

    // Check if we are on a local player
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0] && tabs[0].url) {
        this.setupConfigProvider(tabs[0].id!)
        const url = new URL(tabs[0].url)

        if (url.protocol === "file:") {
          this.setState({
            isLocalPlayer: true
          })
        }
        window.sa_event(`open_${url.host}`)
        window.plausible("open", { props: { site: url.host } })
      }
    })
  }

  private setupConfigProvider(tabId: number) {
    let initialUpdate = true
    this.config = new ConfigProvider("popup", tabId)
    this.forceUpdate()
    this.config.onUpdate(() => {
      if (this.isComponentMounted) {
        this.forceUpdate()
      }
      if (initialUpdate) {
        initialUpdate = false

        if (
          this.config!.get("allow_analytics") &&
          !document.getElementById("simpleanalytics")
        ) {
          setupAnalytics()
        }
      }
    })
  }

  async checkPlusStatus() {
    const isValid = await verifyLicense()
    this.setState({
      isPlus: isValid
    })
  }

  showPlusPopup() {
    trackEvent("show_plus_popup")

    this.setState({
      showPlusPopup: true
    })
  }

  closePlusPopup() {
    trackEvent("close_plus_popup")

    this.setState({ showPlusPopup: false })
  }

  componentDidMount() {
    this.isComponentMounted = true
    this.checkPlusStatus()
  }

  componentWillUnmount() {
    this.isComponentMounted = false
  }

  render() {
    if (!this.config) {
      return null
    }

    const grayOutWhenDisabled = {
      opacity: this.config.get("enabled") ? 1 : 0.3,
      transition: "all 0.3s"
    }

    return (
      <div>
        <div className="App">
          {this.state.showPlusPopup && (
            <PlusInfo
              onClose={() => this.closePlusPopup()}
              triggerValidation={() => this.checkPlusStatus()}
            />
          )}
          {this.state.isLocalPlayer ? (
            <LocalPlayerInfo />
          ) : (
            <>
              {this.state.shouldShowIntro && (
                <Steps
                  initialStep={0}
                  enabled={this.state.shouldShowIntro}
                  steps={introSteps}
                  onExit={() => {
                    this.setState({ shouldShowIntro: false })
                    localStorage.setItem("hasShownIntro", "yes")
                  }}
                />
              )}

              <Header />

              <V4Info />

              <div style={grayOutWhenDisabled}>
                <VUMeter config={this.config} />
              </div>

              <SettingsForm
                config={this.config}
                isPlus={this.state.isPlus}
                showPlusPopup={() => this.showPlusPopup()}
              />
            </>
          )}
        </div>

        <Footer triggerIntro={() => this.setState({ shouldShowIntro: true })} />
      </div>
    )
  }
}

export default Popup
