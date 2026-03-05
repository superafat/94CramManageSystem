export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8FA9B8] border-t-transparent" />
        <p className="text-sm text-gray-500">載入中...</p>
      </div>
    </div>
  )
}
