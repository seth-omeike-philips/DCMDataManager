import Modal from "@/components/Modal"
import React, { createContext, useContext, useState } from "react"

type ModalType = "success" | "error" | "info"

interface ModalState {
  isOpen: boolean
  type: ModalType
  title: string
  message: string
}

interface ModalContextType {
  openModal: (modal: Omit<ModalState, "isOpen">) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextType | null>(null)

export const useModal = () => {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error("useModal must be used inside ModalProvider")
  return ctx
}

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  })

  const openModal = (modalData: Omit<ModalState, "isOpen">) => {
    setModal({ ...modalData, isOpen: true })
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }))
  }

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      {modal.isOpen && <Modal {...modal} closeModal={closeModal} />}
    </ModalContext.Provider>
  )
}