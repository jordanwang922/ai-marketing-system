import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { format, isSameMonth, isToday as isTodayDate } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';
import type { User, CalendarEvent } from '@/types';
import { useEventsUnified } from '@/hooks/useEventsUnified';
import { useTranslation } from '@/hooks/useLanguage';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { EventModal } from './EventModal';
import { ScheduleList } from './ScheduleList';

interface CalendarGridProps {
  currentDate: Date;
  viewType: 'month' | 'week';
  currentUser: User;
  calendarDays: Date[];
  onNavigate: {
    previous: () => void;
    next: () => void;
    today: () => void;
    setViewType: (view: 'month' | 'week') => void;
    toggleViewType: () => void;
  };
  formatDate: (date: Date, formatStr: string) => string;
}

export const CalendarGrid = ({
  currentDate,
  viewType,
  currentUser,
  calendarDays,
  onNavigate,
  formatDate,
}: CalendarGridProps) => {
  const { t, language } = useTranslation();
  const { getEventsByDate, isSQLiteReady, refresh } = useEventsUnified();
  const { users, filterUserId } = useUser();
  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleListOpen, setIsScheduleListOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // 星期标题
  const weekDays = language === 'zh'
    ? ['日', '一', '二', '三', '四', '五', '六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 入场动画
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 网格线绘制动画
      gsap.fromTo(
        '.calendar-cell',
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.02,
          ease: 'back.out(1.7)',
        }
      );
    }, gridRef);

    return () => ctx.revert();
  }, [calendarDays]);

  // 获取日历天数下的过滤后事件
  const getDayEvents = (date: Date): CalendarEvent[] => {
    const rawEvents = getEventsByDate(date);
    if (filterUserId) {
      return rawEvents.filter(e => e.userId === filterUserId);
    }
    return rawEvents;
  };

  // 打开添加事件模态框
  const handleAddEvent = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // 打开编辑事件模态框
  const handleEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setSelectedDate(new Date(event.startDate));
    setIsModalOpen(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setSelectedDate(null);
    // 操作完成后主动刷新数据
    if (isSQLiteReady) {
      refresh();
    }
  };

  // 获取用户颜色
  const getUserColor = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.color || '#6B7280';
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航栏 */}
      <div
        ref={headerRef}
        className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-gray-100 gap-4"
      >
        {/* 月份/日期显示 */}
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {formatDate(currentDate, language === 'zh' ? 'yyyy年 M月' : 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigate.previous}
              className="hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigate.today}
              className="text-sm font-medium hover:bg-gray-100"
            >
              {t.today}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigate.next}
              className="hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 视图切换/清单按钮 */}
        <div className="flex items-center gap-3">
          {/* 行程清单按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScheduleListOpen(true)}
            className="rounded-full bg-white border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 gap-1.5 font-medium shadow-sm transition-all active:scale-95"
          >
            <ListTodo className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'zh' ? '本月行程清单' : 'Monthly Schedule'}</span>
            <span className="sm:hidden">{language === 'zh' ? '清单' : 'List'}</span>
          </Button>

          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewType === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-sm ${viewType === 'month' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => onNavigate.setViewType('month')}
            >
              {t.monthView}
            </Button>
            <Button
              variant={viewType === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              className={`text-sm ${viewType === 'week' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => onNavigate.setViewType('week')}
            >
              {t.weekView}
            </Button>
          </div>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="py-3 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div
        ref={gridRef}
        className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-100 gap-px overflow-auto"
      >
        {calendarDays.map((date, index) => {
          const dayEvents = getDayEvents(date);
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isTodayDate(date);

          return (
            <div
              key={index}
              className={`calendar-cell relative bg-white min-h-[100px] sm:min-h-[120px] p-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 group ${
                !isCurrentMonth ? 'bg-gray-50/50' : ''
              }`}
              onClick={() => handleAddEvent(date)}
            >
              {/* 日期数字 */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'text-white'
                      : isCurrentMonth
                      ? 'text-gray-700'
                      : 'text-gray-400'
                  }`}
                  style={{ backgroundColor: isToday ? currentUser.color : 'transparent' }}
                >
                  {format(date, 'd')}
                </span>

                {/* 悬停添加按钮 */}
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddEvent(date);
                  }}
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* 事件列表 */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-all hover:opacity-80 hover:scale-[1.02]"
                    style={{
                      backgroundColor: `${getUserColor(event.userId)}20`,
                      color: getUserColor(event.userId),
                      borderLeft: `3px solid ${getUserColor(event.userId)}`,
                    }}
                    onClick={(e) => handleEditEvent(event, e)}
                    title={language === 'zh' ? event.title : event.titleEn}
                  >
                    {!event.isAllDay && event.startTime && (
                      <span className="font-medium mr-1">{event.startTime}</span>
                    )}
                    <span className="truncate">
                      {language === 'zh' ? event.title : event.titleEn}
                    </span>
                  </div>
                ))}

                {/* 更多事件提示 */}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-400 px-2">
                    +{dayEvents.length - 3} {t.more}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 事件模态框 */}
      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedDate={selectedDate || undefined}
        editingEvent={editingEvent}
        currentUser={currentUser}
      />
      {/* 行程清单弹窗 */}
      <ScheduleList
        isOpen={isScheduleListOpen}
        onClose={() => setIsScheduleListOpen(false)}
        currentDate={currentDate}
        currentUser={currentUser}
      />
    </div>
  );
};
