import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useLanguage } from './useLanguage';

export const useCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  const { language } = useLanguage();
  
  const locale = language === 'zh' ? zhCN : enUS;
  
  // 获取日历天数
  const getCalendarDays = () => {
    if (viewType === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const calendarStart = startOfWeek(monthStart, { locale });
      const calendarEnd = endOfWeek(monthEnd, { locale });
      
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { locale });
      const weekEnd = endOfWeek(currentDate, { locale });
      
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  };
  
  // 导航函数
  const goToPrevious = () => {
    if (viewType === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };
  
  const goToNext = () => {
    if (viewType === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const toggleViewType = () => {
    setViewType(viewType === 'month' ? 'week' : 'month');
  };
  
  // 格式化日期
  const formatDate = (date: Date, formatStr: string) => {
    return format(date, formatStr, { locale });
  };
  
  // 判断是否是当前月份
  const isCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentDate);
  };
  
  // 判断是否是今天
  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };
  
  return {
    currentDate,
    viewType,
    setViewType,
    calendarDays: getCalendarDays(),
    goToPrevious,
    goToNext,
    goToToday,
    toggleViewType,
    formatDate,
    isCurrentMonth,
    isToday,
    locale,
  };
};
