import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import type { User } from '@/types';
import { useUser } from '@/hooks/useUser';
import { useCalendar } from '@/hooks/useCalendar';
import { IdentityPortal } from '@/components/IdentityPortal';
import { Sidebar } from '@/components/Sidebar';
import { CalendarGrid } from '@/components/CalendarGrid';
import './App.css';

function App() {
  const { currentUser, setCurrentUser, logout } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  const {
    currentDate,
    viewType,
    calendarDays,
    goToPrevious,
    goToNext,
    goToToday,
    setViewType,
    toggleViewType,
    formatDate,
  } = useCalendar();

  // 检查本地存储的登录状态
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user-storage');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.state?.currentUser) {
            setCurrentUser(parsed.state.currentUser);
          }
        } catch (e) {
          console.error('Failed to parse user storage:', e);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [setCurrentUser]);

  // 处理用户选择
  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
  };

  // 处理退出登录
  const handleLogout = () => {
    logout();
  };

  // 页面加载动画
  useEffect(() => {
    if (!isLoading && currentUser) {
      gsap.fromTo(
        '.main-content',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [isLoading, currentUser]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 未登录状态 - 显示身份选择门户
  if (!currentUser) {
    return <IdentityPortal onSelect={handleUserSelect} />;
  }

  // 已登录状态 - 显示主应用
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <Sidebar currentUser={currentUser} onLogout={handleLogout} />

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="main-content flex-1 flex flex-col h-full">
          {/* 移动端头部 */}
          <div className="lg:hidden h-16 bg-white border-b border-gray-100 flex items-center justify-center">
            <h1 className="text-lg font-bold text-gray-800">真锐出海</h1>
          </div>

          {/* 日历网格 */}
          <div className="flex-1 overflow-hidden">
            <CalendarGrid
              currentDate={currentDate}
              viewType={viewType}
              currentUser={currentUser}
              calendarDays={calendarDays}
              onNavigate={{
                previous: goToPrevious,
                next: goToNext,
                today: goToToday,
                setViewType: setViewType,
                toggleViewType: toggleViewType,
              }}
              formatDate={formatDate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
