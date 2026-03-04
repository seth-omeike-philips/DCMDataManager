type ProcessingStatus = "idle" | "loading" | "success" | "error"

interface ProcessingStateProps {
  status: ProcessingStatus
  loadingText?: string
  successText?: string
  errorText?: string
}

export const ProcessingState = ({
  status,
  loadingText = "Processing...",
  successText = "Completed",
  errorText = "Something went wrong"
}: ProcessingStateProps) => {
  if (status === "idle") return null

  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-4 transition-all duration-300">
      
      {status === "loading" && (
        <>
          {/* Skeleton */}
          <div className="w-40 h-6 bg-gray-300 animate-pulse rounded-md" />
          <div className="w-56 h-4 bg-gray-200 animate-pulse rounded-md" />
          <div className="text-gray-500 text-sm">{loadingText}</div>
        </>
      )}

      {status === "success" && (
        <>
          <div className="text-green-600 text-4xl animate-scaleIn">
            ✔
          </div>
          <div className="text-green-600 font-semibold">
            {successText}
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <div className="text-red-600 text-4xl">
            ✖
          </div>
          <div className="text-red-600 font-semibold">
            {errorText}
          </div>
        </>
      )}
    </div>
  )
}