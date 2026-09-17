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
  // A single settings row: label stack on the left, value/button placeholder on the right
  const Row = ({ labelW = 'w-28', valueW = 'w-32', slim = false }) => (
    <div className={`flex items-center justify-between gap-4 py-3.5 border-b border-[#e5e3df] last:border-0`}>
      <div className="space-y-1.5">
        <div className={`h-3 bg-[#ebebea] rounded ${labelW}`} />
        {!slim && <div className="h-2.5 bg-[#ebebea] rounded w-40" />}
      </div>
      <div className={`h-7 bg-[#ebebea] rounded-[6px] shrink-0 ${valueW}`} />
    </div>
  )

  return (
    <div className="animate-pulse">
      {/* Account section */}
      <div className="h-2.5 bg-[#ebebea] rounded w-16 mb-3" />
      <div className="border-t border-[#e5e3df]">
        {/* Hoop profile row */}
        <Row labelW="w-24" valueW="w-40" />
        {/* Instagram account row */}
        <Row labelW="w-32" valueW="w-20" />
        {/* Zernio API Key row */}
        <Row labelW="w-28" valueW="w-24" />
      </div>

      {/* Danger zone section */}
      <div className="mt-14 pt-4">
        <div className="h-2.5 bg-[#f0c4be] rounded w-20 mb-3" />
        <div className="border-t border-[#e5e3df]">
          {/* Session / sign out row */}
          <Row labelW="w-16" valueW="w-20" slim />
        </div>
      </div>
    </div>
  )
}

export function SwitchAccountSkeleton() {
  const AccountRow = ({ active = false }) => (
    <div className="flex items-center gap-3 py-3.5 border-b border-[#ebebea] last:border-0">
      {/* Circle avatar */}
      <div className={`size-9 shrink-0 rounded-full ${active ? 'bg-[#d4d2cf]' : 'bg-[#ebebea]'}`} />
      {/* Username + subtitle */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className={`h-3 rounded ${active ? 'bg-[#d4d2cf] w-32' : 'bg-[#ebebea] w-28'}`} />
        <div className="h-2.5 bg-[#ebebea] rounded w-20" />
      </div>
      {/* Active badge / Switch label */}
      <div className={`h-4 rounded shrink-0 ${active ? 'w-14 bg-[#d4d2cf]' : 'w-10 bg-[#ebebea]'}`} />
    </div>
  )

  return (
    <div className="animate-pulse">
      <div className="divide-y divide-[#ebebea]">
        <AccountRow active />
        <AccountRow />
        {/* Connect another row */}
        <div className="flex items-center gap-3 py-3.5">
          <div className="size-9 shrink-0 rounded-full bg-[#daeaff]" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-3 bg-[#daeaff] rounded w-40" />
            <div className="h-2.5 bg-[#ebebea] rounded w-28" />
          </div>
          <div className="size-4 rounded bg-[#ebebea] shrink-0" />
        </div>
      </div>
    </div>
  )
}
