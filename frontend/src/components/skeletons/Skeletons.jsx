export function DMListSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 px-3 py-3 rounded-[10px] bg-[#201f1f]">
          <div className="w-9 h-9 rounded-full bg-[#2a2a2a] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[#2a2a2a] rounded w-2/3" />
            <div className="h-2.5 bg-[#2a2a2a] rounded w-1/3" />
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
          <div className="w-8 h-8 rounded-full bg-[#2a2a2a] shrink-0" />
          <div className={`h-10 rounded-xl bg-[#2a2a2a] ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
        </div>
      ))}
    </div>
  )
}

export function SessionsSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse bg-[#201f1f] rounded-[18px] p-4 space-y-2">
          <div className="h-3.5 bg-[#2a2a2a] rounded w-1/3" />
          <div className="h-2.5 bg-[#2a2a2a] rounded w-1/2" />
          <div className="h-2.5 bg-[#2a2a2a] rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6 max-w-lg">
      <div className="h-5 bg-[#2a2a2a] rounded w-1/4" />
      <div className="h-10 bg-[#201f1f] rounded-[10px]" />
      <div className="h-10 bg-[#201f1f] rounded-[10px]" />
      <div className="h-10 bg-[#201f1f] rounded-[10px] w-1/3" />
    </div>
  )
}
