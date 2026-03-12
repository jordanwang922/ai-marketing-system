import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { format, parseISO } from 'date-fns';
import { X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import type { CalendarEvent, User } from '@/types';
import { useEventsUnified } from '@/hooks/useEventsUnified';
import { useTranslation } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  editingEvent?: CalendarEvent | null;
  currentUser: User;
}

export const EventModal = ({
  isOpen,
  onClose,
  selectedDate = new Date(),
  editingEvent,
  currentUser,
}: EventModalProps) => {
  const { t, language } = useTranslation();
  const { addEvent, updateEvent, deleteEvent } = useEventsUnified();
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (editingEvent) {
      setTitle(language === 'zh' ? editingEvent.title : editingEvent.titleEn);
      setStartDate(format(new Date(editingEvent.startDate), 'yyyy-MM-dd'));
      setEndDate(format(new Date(editingEvent.endDate), 'yyyy-MM-dd'));
      setStartTime(editingEvent.startTime || '09:00');
      setEndTime(editingEvent.endTime || '17:00');
      setIsAllDay(editingEvent.isAllDay || false);
    } else {
      setTitle('');
      setStartDate(format(selectedDate, 'yyyy-MM-dd'));
      setEndDate(format(selectedDate, 'yyyy-MM-dd'));
      setStartTime('09:00');
      setEndTime('17:00');
      setIsAllDay(false);
    }
  }, [editingEvent, selectedDate, language]);

  // 入场动画
  useEffect(() => {
    if (isOpen) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: 'power2.out' }
        );
        gsap.fromTo(
          modalRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 0.1 }
        );
      });

      return () => ctx.revert();
    }
  }, [isOpen]);

  // 关闭动画
  const handleClose = () => {
    const ctx = gsap.context(() => {
      gsap.to(modalRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
    });

    return () => ctx.revert();
  };

  // 保存事件
  const handleSave = async () => {
    if (!title.trim()) {
      alert(t.pleaseEnterTitle);
      return;
    }

    setIsLoading(true);

    const eventData = {
      title: title.trim(),
      titleEn: title.trim(),
      userId: currentUser.id,
      startDate: parseISO(startDate),
      endDate: parseISO(endDate),
      startTime: isAllDay ? undefined : startTime,
      endTime: isAllDay ? undefined : endTime,
      isAllDay,
    };

    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
    } else {
      addEvent(eventData);
    }

    // 模拟加载效果
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsLoading(false);
    handleClose();
  };

  // 删除事件
  const handleDelete = () => {
    if (editingEvent) {
      deleteEvent(editingEvent.id);
      setShowDeleteConfirm(false);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩层 */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 模态框 */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* 头部 */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: `${currentUser.color}10` }}
        >
          <h2 className="text-xl font-semibold text-gray-800">
            {editingEvent ? t.editEvent : t.newEvent}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* 标题输入 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-700">
              {t.eventTitle}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.eventTitle}
              className="w-full border-gray-200 focus:border-transparent focus:ring-2 transition-all"
              style={{ '--tw-ring-color': currentUser.color } as React.CSSProperties}
            />
          </div>

          {/* 日期选择 */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="startDate" className="text-gray-700 flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{t.startDate}</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-w-0 px-2 sm:px-3"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="endDate" className="text-gray-700 flex items-center gap-2 text-sm">
                <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{t.endDate}</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-w-0 px-2 sm:px-3"
              />
            </div>
          </div>

          {/* 全天选项 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allDay"
              checked={isAllDay}
              onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
            />
            <Label htmlFor="allDay" className="text-gray-700 cursor-pointer">
              {t.allDay}
            </Label>
          </div>

          {/* 时间选择 */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t.startTime}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t.endTime}
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-3 pt-4">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1"
              >
                {t.delete}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 text-white"
              style={{ backgroundColor: currentUser.color }}
            >
              {isLoading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                t.save
              )}
            </Button>
          </div>
        </div>

        {/* 底部装饰线 */}
        <div
          className="h-1"
          style={{ backgroundColor: currentUser.color }}
        />
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{t.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              {language === 'zh' ? '该操作无法撤销，日程将被永久删除。' : 'This action cannot be undone. The schedule will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl border-gray-100 hover:bg-gray-50 flex-1 sm:flex-none">
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl flex-1 sm:flex-none"
            >
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
