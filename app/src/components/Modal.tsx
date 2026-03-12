import React, { useState } from "react"

interface Props {
  type: "success" | "error" | "info"
  title: string
  message: string
  closeModal: () => void
}

const Modal: React.FC<Props> = ({ type, title, message, closeModal }) => {

  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)

  const startDrag = (e: React.MouseEvent) => {
    setDragging(true)
  }

  const stopDrag = () => {
    setDragging(false)
  }

  const onDrag = (e: React.MouseEvent) => {
    if (!dragging) return
    setPos(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }))
  }

  const color =
    type === "success"
      ? "border-green-500"
      : type === "error"
      ? "border-red-500"
      : "border-blue-500"

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center"
      onClick={closeModal}
    >
      <div
        className={`bg-slate-900 text-white p-6 rounded-lg shadow-lg border ${color} w-[400px]`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onMouseMove={onDrag}
        onMouseUp={stopDrag}
        onClick={(e) => e.stopPropagation()}
      >

        {/* header */}
        <div
          className="flex justify-between items-center cursor-move mb-3"
          onMouseDown={startDrag}
        >
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-300 whitespace-pre-wrap">
          {message}
        </p>

      </div>
    </div>
  )
}

export default Modal