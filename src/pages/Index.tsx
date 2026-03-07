import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, BarChart3, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthPage from '@/components/AuthPage';
import DailyForm from '@/components/DailyForm';
import Dashboard from '@/components/Dashboard';
import { getCurrentUser, setCurrentUser, type User } from '@/lib/store';

type Tab = 'form' | 'dashboard';

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('form');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) setUser(u);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
  };

  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  const tabs: { key: Tab; label: string; icon: typeof ClipboardList }[] = [
    { key: 'form', label: 'المتابعة اليومية', icon: ClipboardList },
    { key: 'dashboard', label: 'الإحصائيات', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero sticky top-0 z-50">
        <div className="container flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h1 className="font-bold text-primary-foreground text-lg leading-tight">متابعة الأداء</h1>
              <p className="text-primary-foreground/70 text-xs flex items-center gap-1">
                <UserIcon className="h-3 w-3" /> {user.name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="h-4 w-4 ml-1" /> خروج
          </Button>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="bg-card border-b sticky top-[60px] z-40">
        <div className="container flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="container py-6">
        <motion.div key={activeTab + refreshKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === 'form' ? (
            <DailyForm user={user} onSubmit={() => setRefreshKey(k => k + 1)} />
          ) : (
            <Dashboard user={user} />
          )}
        </motion.div>
      </main>
    </div>
  );
}
