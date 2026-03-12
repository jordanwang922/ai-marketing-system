import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '@/types';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'zh',
      setLanguage: (lang) => set({ language: lang }),
      toggleLanguage: () => set((state) => ({ 
        language: state.language === 'zh' ? 'en' : 'zh' 
      })),
    }),
    {
      name: 'language-storage',
    }
  )
);

// 翻译文本
export const translations = {
  zh: {
    appName: '真锐出海',
    appNameEn: 'JustRight',
    selectIdentity: '选择您的身份',
    selectIdentitySub: '开始您的日程管理之旅',
    jordan: 'Jordan',
    dean: 'Dean',
    monthView: '月视图',
    weekView: '周视图',
    newEvent: '新建日程',
    editEvent: '编辑日程',
    eventTitle: '日程标题',
    startDate: '开始日期',
    endDate: '结束日期',
    startTime: '开始时间',
    endTime: '结束时间',
    allDay: '全天',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    logout: '退出登录',
    switchUser: '切换用户',
    today: '今天',
    noEvents: '暂无日程',
    more: '更多',
    confirmDelete: '确定要删除这个日程吗？',
    language: '语言',
    close: '关闭',
    addEvent: '添加日程',
    selectDate: '选择日期',
    created: '创建成功',
    updated: '更新成功',
    deleted: '删除成功',
    error: '操作失败',
    pleaseEnterTitle: '请输入日程标题',
  },
  en: {
    appName: 'JustRight',
    appNameEn: '真锐出海',
    selectIdentity: 'Select Your Identity',
    selectIdentitySub: 'Start Your Schedule Management Journey',
    jordan: 'Jordan',
    dean: 'Dean',
    monthView: 'Month View',
    weekView: 'Week View',
    newEvent: 'New Event',
    editEvent: 'Edit Event',
    eventTitle: 'Event Title',
    startDate: 'Start Date',
    endDate: 'End Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    allDay: 'All Day',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    logout: 'Logout',
    switchUser: 'Switch User',
    today: 'Today',
    noEvents: 'No Events',
    more: 'more',
    confirmDelete: 'Are you sure you want to delete this event?',
    language: 'Language',
    close: 'Close',
    addEvent: 'Add Event',
    selectDate: 'Select Date',
    created: 'Created Successfully',
    updated: 'Updated Successfully',
    deleted: 'Deleted Successfully',
    error: 'Operation Failed',
    pleaseEnterTitle: 'Please enter event title',
  },
};

export const useTranslation = () => {
  const { language } = useLanguage();
  const t = translations[language];
  return { t, language };
};
