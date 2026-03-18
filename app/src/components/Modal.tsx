import React, { useRef } from "react";
import Draggable from "react-draggable";

interface Props {
  type: "success" | "error" | "info";
  title: string;
  message: string;
  closeModal: () => void;
}

const Modal: React.FC<Props> = ({ type, title, message, closeModal }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const color =
    type === "success"
      ? "border-green-500"
      : type === "error"
      ? "border-red-500"
      : "border-blue-500";

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]"
      onClick={closeModal}
    >
      <Draggable
        nodeRef={nodeRef}
        handle=".modal-header"
        bounds="parent"
      >
        <div
          ref={nodeRef}
          className={`bg-slate-900 text-white p-6 rounded-lg shadow-lg border ${color} w-[400px]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* header (drag handle) */}
          <div className="modal-header flex justify-between items-center cursor-move mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={closeModal}
              className="text-slate-900 hover:bg-slate-300"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-slate-300 whitespace-pre-wrap">
            {message}
          </p>
        </div>
      </Draggable>
    </div>
  );
};

export default Modal;