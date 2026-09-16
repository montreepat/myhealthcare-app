import { useState } from 'react';
import { Check, ChevronDown, Users, UserPlus, X } from 'lucide-react';
import { useProfiles } from '@/hooks/useProfiles';

export default function ProfileSwitcher() {
  const { members, activeId, activeMember, switchProfile, addMember } = useProfiles();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const close = () => {
    setOpen(false);
    setAdding(false);
    setName('');
  };

  const confirmAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addMember(trimmed);
    close();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-all hover:border-brand-300 hover:bg-brand-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Users className="h-4 w-4 text-brand-500" />
        <span className="max-w-[8rem] truncate">{activeMember?.full_name ?? 'โปรไฟล์'}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
          <div
            className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl animate-scale-in"
            role="menu"
          >
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              โปรไฟล์ครอบครัว
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {members.map((m) => {
                const isActive = m.id === activeId;
                return (
                  <button
                    key={m.id}
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      switchProfile(m.id);
                      close();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-all ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.full_name.trim().charAt(0) || '?'}
                    </span>
                    <span className="flex-1 truncate font-medium">{m.full_name}</span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-1 border-t border-slate-100 pt-1">
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-600 transition-all hover:bg-brand-50"
                >
                  <UserPlus className="h-4 w-4" />
                  เพิ่มสมาชิกในครอบครัว
                </button>
              ) : (
                <div className="flex items-center gap-1.5 p-1">
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                        e.preventDefault();
                        confirmAdd();
                      }
                    }}
                    placeholder="เช่น คุณแม่, ลูก, แฟน"
                    className="w-full flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    onClick={confirmAdd}
                    className="flex shrink-0 items-center justify-center rounded-lg bg-brand-600 px-2.5 py-2 text-white transition-all hover:bg-brand-700"
                    aria-label="ยืนยันเพิ่มสมาชิก"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setName('');
                    }}
                    className="flex shrink-0 items-center justify-center rounded-lg border border-slate-200 px-2.5 py-2 text-slate-500 transition-all hover:bg-slate-50"
                    aria-label="ยกเลิก"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
