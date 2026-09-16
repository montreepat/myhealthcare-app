import { useState, useEffect } from 'react';
import { Calendar, FlaskConical, Bell, Heart, LogOut, UserCircle } from 'lucide-react';
import AppointmentsTab from '@/components/AppointmentsTab';
import LabResultsTab from '@/components/LabResultsTab';
import LineTab from '@/components/LineTab';
import ProfileTab from '@/components/ProfileTab';
import LoginScreen from '@/components/LoginScreen';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { useSession, type SessionState } from '@/hooks/useSession';
import { ProfilesProvider, useProfiles } from '@/hooks/useProfiles';

type Tab = 'profile' | 'appointments' | 'lab' | 'line';

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: UserCircle },
  { id: 'appointments', label: 'ตารางนัดหมาย', icon: Calendar },
  { id: 'lab', label: 'ผลแลป & สุขภาพ', icon: FlaskConical },
  { id: 'line', label: 'แจ้งเตือน LINE', icon: Bell },
];

function getTabFromUrl(): Tab {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'profile' || tab === 'lab' || tab === 'line') return tab;
  return 'appointments';
}

function App() {
  const { session, loading, login, logout } = useSession();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!session.loggedIn) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <ProfilesProvider>
      <Dashboard session={session} logout={logout} />
    </ProfilesProvider>
  );
}

function Dashboard({ session, logout }: { session: SessionState; logout: () => void }) {
  const { activeId } = useProfiles();
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromUrl);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-emerald-600 shadow-sm">
                <Heart className="h-5 w-5 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-base font-bold leading-tight text-slate-800">MyHealthCare</h1>
                <p className="text-[11px] leading-tight text-slate-400">สวัสดี, {session.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProfileSwitcher />
              <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 sm:flex">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-600">เชื่อมต่อแล้ว</span>
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                title="ออกจากระบบ"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-sm font-medium transition-all ${
                    isActive ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main key={activeId} className="mx-auto max-w-2xl px-4 py-5 pb-24">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'lab' && <LabResultsTab />}
        {activeTab === 'line' && <LineTab />}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 bg-white/90 backdrop-blur-lg sm:hidden">
        <nav className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-all ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                <tab.icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {tab.label.split(' ')[0]}
              </button>
            );
          })}
        </nav>
      </footer>

      <div className="h-16 sm:hidden" aria-hidden />
    </div>
  );
}

export default App;
