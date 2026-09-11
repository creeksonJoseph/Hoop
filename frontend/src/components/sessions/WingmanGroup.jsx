/**
 * components/sessions/WingmanGroup.jsx
 * ======================================
 * Renders a single wingman's group card: their header (name, avatar,
 * badge) and the list of DM session cards they have access to.
 *
 * Props:
 *   wingmanName {string}    - Display name of the wingman
 *   sessions    {Array}     - Wingman session records for this person
 *   onUpdate    {Function}  - Callback to update access level
 *   onDelete    {Function}  - Callback to delete a session
 */
import { UserCheck } from 'lucide-react'
import SessionCard from './SessionCard'

export default function WingmanGroup({ wingmanName, sessions, onUpdate, onDelete }) {
  return (
    <div className="bg-white border border-[#dfdcd9] rounded-[12px] shadow-xs overflow-hidden">
      {/* Wingman Group Header */}
      <div className="flex items-center justify-between border-b border-[#dfdcd9] px-5 py-3.5 bg-[#f9f9f8]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#191918] text-white flex items-center justify-center font-semibold text-xs">
            {wingmanName[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-[15px] text-[#191918]">{wingmanName}</h2>
            <p className="text-[11px] text-[#615d59]">
              {sessions.length} shared DM{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] bg-[#e6f3fe] text-[#0075de] border border-[#0075de]/20 flex items-center gap-1">
            <UserCheck size={12} /> Wingman
          </span>
        </div>
      </div>

      {/* DMs listed under this Wingman */}
      <div className="p-4 space-y-3 bg-white">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
