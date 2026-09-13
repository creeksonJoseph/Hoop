export function DMListSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-3 rounded-[8px]">
          <div className="w-9 h-9 rounded-[8px] bg-[#f0f0f0] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[#f0f0f0] rounded w-2/3" />
            <div className="h-2.5 bg-[#f0f0f0] rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`animate-pulse flex gap-3 max-w-[75%] ${i % 2 === 0 ? 'self-start' : 'self-end flex-row-reverse'}`}>
          <div className="w-8 h-8 rounded-[8px] bg-[#f0f0f0] shrink-0" />
          <div className={`h-10 rounded-[8px] bg-[#f0f0f0] ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
        </div>
      ))}
    </div>
  )
}

export function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center justify-between gap-3 bg-white border border-[#dfdcd9] rounded-[8px] px-3.5 py-2.5 shadow-xs">
          {/* Left: Avatar & Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-full bg-[#e8e6e3] shrink-0" />
            <div className="h-3 bg-[#e8e6e3] rounded w-24 sm:w-32" />
          </div>

          {/* Middle: Badge & Link */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 sm:w-20 bg-[#e8e6e3] rounded-[4px] shrink-0" />
            <div className="hidden md:block h-5 w-36 bg-[#e8e6e3] rounded-[6px] shrink-0" />
          </div>

          {/* Right: Actions Icon */}
          <div className="size-6 rounded-[6px] bg-[#e8e6e3] shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-4 max-w-lg">
      <div className="h-6 bg-[#f0f0f0] rounded w-1/4" />
      <div className="h-32 bg-white border border-[#dfdcd9] rounded-[12px]" />
      <div className="h-24 bg-white border border-[#dfdcd9] rounded-[12px]" />
    </div>
  )
}
