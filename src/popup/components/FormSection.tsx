import React from "react"

import "./FormSection.scss"

function FormSection({
  children,
  title
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div className="form-section">
      <div className="form-section-title">{title}</div>
      <div className="form-section-content">{children}</div>
    </div>
  )
}

export default FormSection
