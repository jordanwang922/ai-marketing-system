import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, max, min } from 'date-fns';
import { Calendar, ListTodo } from 'lucide-react';
import type { User } from '@/types';
import { useTranslation } from '@/hooks/useLanguage';
import { useUser } from '@/hooks/useUser';
import { useEventsUnified } from '@/hooks/useEventsUnified';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ScheduleListProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  currentUser: User;
}

export const ScheduleList = ({ isOpen, onClose, currentDate, currentUser }: ScheduleListProps) => {
  const { language } = useTranslation();
  const { users } = useUser();
  const { events } = useEventsUnified();
  const [filterType, setFilterType] = useState<'my' | 'all'>('all');

  // 获取本月日期范围
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // 过滤并排序事件
  const filteredEvents = useMemo(() => {
    const list: any[] = [];
    
    (events as any[]).forEach((event) => {
      // 检查权限
      if (filterType === 'my' && event.userId !== currentUser.id) return;

      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);

      // 计算重叠范围（当前月与事件范围的交集）
      const overlapStart = max([monthStart, eventStart]);
      const overlapEnd = min([monthEnd, eventEnd]);

      if (overlapStart <= overlapEnd) {
        // 使用 eachDayOfInterval 生成每一天的记录
        const days = eachDayOfInterval({ start: overlapStart, end: overlapEnd });
        days.forEach((day) => {
          list.push({
            ...event,
            displayDate: day,
            instanceId: `${event.id}-${day.getTime()}`
          });
        });
      }
    });

    return list.sort((a, b) => {
      const dateA = a.displayDate.getTime();
      const dateB = b.displayDate.getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [events, monthStart, monthEnd, filterType, currentUser.id]);

  // 获取用户信息
  const getUserInfo = (userId: string) => {
    return users.find(u => u.id === userId) || { name: 'Unknown', color: '#6B7280' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col rounded-3xl p-0 border-none shadow-2xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <ListTodo className="w-6 h-6 text-purple-600" />
              {language === 'zh' ? '本月行程清单' : 'Monthly Schedule'}
            </DialogTitle>
          </div>
          
          <div className="text-sm text-gray-500 mt-1 mb-4">
            {format(currentDate, language === 'zh' ? 'yyyy年 M月' : 'MMMM yyyy')}
          </div>

          {/* 切换器 */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterType('my')}
              className={`rounded-lg px-6 transition-all ${filterType === 'my' ? 'shadow-sm bg-white text-gray-900 hover:bg-white' : 'text-gray-500'}`}
            >
              {language === 'zh' ? '我的' : 'My'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-6 transition-all ${filterType === 'all' ? 'shadow-sm bg-white text-gray-900 hover:bg-white' : 'text-gray-500'}`}
            >
              {language === 'zh' ? '全部' : 'All'}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Calendar className="w-16 h-16 mb-4 opacity-20" />
              <p>{language === 'zh' ? '本月暂无行程' : 'No schedules for this month'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const userInfo = getUserInfo(event.userId);
                const displayDate = event.displayDate;
                return (
                  <div 
                    key={event.instanceId}
                    className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
                  >
                    {/* 日期标志 */}
                    <div className="flex flex-col items-center justify-center min-w-[60px] py-1 bg-gray-50 rounded-xl">
                      <span className="text-xs text-gray-400 uppercase">
                        {format(displayDate, 'MMM')}
                      </span>
                      <span className="text-xl font-bold text-gray-700">
                        {format(displayDate, 'dd')}
                      </span>
                    </div>

                    {/* 事件内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: userInfo.color }}
                        />
                        <h3 className="font-semibold text-gray-800 truncate">
                          {language === 'zh' ? event.title : event.titleEn}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className="opacity-60">🕒</span>
                          {event.isAllDay ? (language === 'zh' ? '全天' : 'All Day') : `${event.startTime} - ${event.endTime}`}
                        </div>
                        {filterType === 'all' && (
                          <div className="flex items-center gap-1">
                            <span className="opacity-60">👤</span>
                            <span style={{ color: userInfo.color }} className="font-medium">
                              {userInfo.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 text-center text-xs text-gray-400 border-t border-gray-100">
          {language === 'zh' ? `共 ${filteredEvents.length} 项行程` : `${filteredEvents.length} items found`}
        </div>
      </DialogContent>
    </Dialog>
  );
};
