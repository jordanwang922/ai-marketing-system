import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  eventsCollection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  toTimestamp,
  fromTimestamp,
} from '@/lib/firebase';
import type { CalendarEvent } from '@/types';

// 本地缓存，用于在 Firebase 加载前显示数据
let localCache: CalendarEvent[] = [];

export const useEventsFirebase = () => {
  const [events, setEvents] = useState<CalendarEvent[]>(localCache);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 监听 Firebase 实时更新
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // 创建查询
    const q = query(eventsCollection, orderBy('createdAt', 'desc'));

    // 订阅实时更新
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsData: CalendarEvent[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          eventsData.push({
            id: doc.id,
            title: data.title,
            titleEn: data.titleEn,
            userId: data.userId,
            startDate: fromTimestamp(data.startDate),
            endDate: fromTimestamp(data.endDate),
            startTime: data.startTime,
            endTime: data.endTime,
            isAllDay: data.isAllDay,
            createdAt: fromTimestamp(data.createdAt),
          });
        });
        
        // 按开始日期排序
        eventsData.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
        
        localCache = eventsData;
        setEvents(eventsData);
        setIsLoading(false);
        setIsInitialized(true);
      },
      (err) => {
        console.error('Firebase error:', err);
        setError('Failed to load events from server');
        setIsLoading(false);
        // 使用本地缓存作为后备
        setEvents(localCache);
      }
    );

    return () => unsubscribe();
  }, []);

  // 添加事件
  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    try {
      const id = uuidv4();
      const newEvent = {
        ...event,
        id,
        createdAt: new Date(),
      };

      // 保存到 Firebase
      const eventRef = doc(eventsCollection, id);
      await setDoc(eventRef, {
        title: newEvent.title,
        titleEn: newEvent.titleEn,
        userId: newEvent.userId,
        startDate: toTimestamp(newEvent.startDate),
        endDate: toTimestamp(newEvent.endDate),
        startTime: newEvent.startTime || null,
        endTime: newEvent.endTime || null,
        isAllDay: newEvent.isAllDay || false,
        createdAt: toTimestamp(newEvent.createdAt),
      });

      // 本地缓存更新
      localCache = [...localCache, newEvent];
      setEvents(localCache);

      return id;
    } catch (err) {
      console.error('Error adding event:', err);
      throw err;
    }
  }, []);

  // 更新事件
  const updateEvent = useCallback(async (id: string, updatedEvent: Partial<CalendarEvent>) => {
    try {
      const eventRef = doc(eventsCollection, id);
      
      // 构建更新数据
      const updateData: Record<string, any> = {};
      if (updatedEvent.title !== undefined) updateData.title = updatedEvent.title;
      if (updatedEvent.titleEn !== undefined) updateData.titleEn = updatedEvent.titleEn;
      if (updatedEvent.userId !== undefined) updateData.userId = updatedEvent.userId;
      if (updatedEvent.startDate !== undefined) updateData.startDate = toTimestamp(updatedEvent.startDate);
      if (updatedEvent.endDate !== undefined) updateData.endDate = toTimestamp(updatedEvent.endDate);
      if (updatedEvent.startTime !== undefined) updateData.startTime = updatedEvent.startTime || null;
      if (updatedEvent.endTime !== undefined) updateData.endTime = updatedEvent.endTime || null;
      if (updatedEvent.isAllDay !== undefined) updateData.isAllDay = updatedEvent.isAllDay;

      await setDoc(eventRef, updateData, { merge: true });

      // 本地缓存更新
      localCache = localCache.map((event) =>
        event.id === id ? { ...event, ...updatedEvent } : event
      );
      setEvents(localCache);
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  }, []);

  // 删除事件
  const deleteEvent = useCallback(async (id: string) => {
    try {
      const eventRef = doc(eventsCollection, id);
      await deleteDoc(eventRef);

      // 本地缓存更新
      localCache = localCache.filter((event) => event.id !== id);
      setEvents(localCache);
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  }, []);

  // 获取某日期的事件
  const getEventsByDate = useCallback((date: Date): CalendarEvent[] => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);

      return targetDate >= eventStart && targetDate <= eventEnd;
    });
  }, [events]);

  // 获取日期范围内的事件
  const getEventsByDateRange = useCallback((startDate: Date, endDate: Date): CalendarEvent[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);

      return (
        (eventStart >= start && eventStart <= end) ||
        (eventEnd >= start && eventEnd <= end) ||
        (eventStart <= start && eventEnd >= end)
      );
    });
  }, [events]);

  // 获取用户的事件
  const getEventsByUser = useCallback((userId: string): CalendarEvent[] => {
    return events.filter((event) => event.userId === userId);
  }, [events]);

  return {
    events,
    isLoading,
    error,
    isInitialized,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
    getEventsByDateRange,
    getEventsByUser,
  };
};
