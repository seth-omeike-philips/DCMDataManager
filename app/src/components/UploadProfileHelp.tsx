import { useModal } from "../context/ModalContext"

const UploadProfileHelp: React.FC = () => {
  const { openModal } = useModal()

  const openHelp = () => {
    openModal({
      type: "info",
      title: "Upload Profile Format",
      message: `
        Upload a JSON file describing a de-identification profile.

        Required structure:

          {
            "PatientName": "REMOVE",
            "PatientID": "HASH",
            "StudyDate": "KEEP"
          }

        Explanation:
          • tags — mapping of DICOM tag names to actions

        Supported actions may include:
          REMOVE
          KEEP
          HASH
          REPLACE_WITH_UNDEFINED

        The tag names must match the DICOM metadata keys used by the application.
    `
    })
  }

  return (
    <button
      onClick={openHelp}
      className="absolute top-0 right-0 rounded-full w-3 h-3 p-3 
      bg-transparent border-1 border-blue-300 hover:border-blue-500
      flex items-center justify-center text-sm font-bold"
    >
      ?
    </button>
  )
}

export default UploadProfileHelp