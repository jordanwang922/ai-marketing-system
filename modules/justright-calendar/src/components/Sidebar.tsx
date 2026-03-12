import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Globe,
  Menu,
} from 'lucide-react';
import type { User } from '@/types';
import { useUser } from '@/hooks/useUser';
import { useTranslation, useLanguage } from '@/hooks/useLanguage';
import { useEventsUnified } from '@/hooks/useEventsUnified';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface SidebarProps {
  currentUser: User;
  onLogout: () => void;
}

export const Sidebar = ({ currentUser, onLogout }: SidebarProps) => {
  const { t, language } = useTranslation();
  const { toggleLanguage } = useLanguage();
  const { users, filterUserId, setFilterUserId } = useUser();
  const { events } = useEventsUnified();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 统计信息
  const myEventsCount = events.filter((e) => e.userId === currentUser.id).length;
  const totalEventsCount = events.length;

  // 切换侧边栏
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 侧边栏内容
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* 品牌标识 */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: currentUser.color }}
          >
            {t.appName.charAt(0)}
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-gray-800">{t.appName}</h1>
              <p className="text-xs text-gray-400">{t.appNameEn}</p>
            </div>
          )}
        </div>
      </div>

      {/* 当前用户 */}
      <div className="p-4">
        <div
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            isCollapsed ? 'justify-center' : ''
          }`}
          style={{ backgroundColor: `${currentUser.color}10` }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{t.appName}</p>
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                filterUserId === currentUser.id ? 'bg-purple-100 ring-2 ring-purple-400 shadow-md' : 'bg-purple-50'
              }`}
              onClick={() => setFilterUserId(filterUserId === currentUser.id ? null : currentUser.id)}
            >
              <p className="text-2xl font-bold text-purple-600">{myEventsCount}</p>
              <p className="text-xs text-purple-400">{language === 'zh' ? '我的日程' : 'My Events'}</p>
            </div>
            <div 
              className={`rounded-lg p-3 text-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                filterUserId === null ? 'bg-green-100 ring-2 ring-green-400 shadow-md' : 'bg-green-50'
              }`}
              onClick={() => setFilterUserId(null)}
            >
              <p className="text-2xl font-bold text-green-600">{totalEventsCount}</p>
              <p className="text-xs text-green-400">{language === 'zh' ? '全部日程' : 'All Events'}</p>
            </div>
          </div>
          {filterUserId && (
            <p className="text-[10px] text-center mt-2 text-gray-400 italic">
              {language === 'zh' ? '已开启个人视图' : 'Personal view active'}
            </p>
          )}
        </div>
      )}

      {/* 用户列表 */}
      <div className="flex-1 px-4 py-2">
        {!isCollapsed && (
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 px-2">
            {language === 'zh' ? '团队成员' : 'Team Members'}
          </p>
        )}
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                user.id === currentUser.id
                  ? 'bg-gray-100'
                  : 'hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-sm text-gray-700">{user.name}</span>
                  {user.id === currentUser.id && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {/* 语言切换 */}
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 text-gray-600 hover:bg-gray-100 ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
          onClick={toggleLanguage}
        >
          <Globe className="w-5 h-5" />
          {!isCollapsed && (
            <span className="flex-1 text-left">{language === 'zh' ? 'English' : '中文'}</span>
          )}
        </Button>

        {/* 退出登录 */}
        <Button
          variant="ghost"
          className={`w-full justify-start gap-3 text-red-600 hover:bg-red-50 ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>{t.logout}</span>}
        </Button>

        {/* 折叠按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="w-full hidden lg:flex justify-center text-gray-400 hover:text-gray-600"
          onClick={toggleSidebar}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0"
      >
        <SidebarContent />
      </motion.aside>

      {/* 移动端侧边栏 */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-40">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
