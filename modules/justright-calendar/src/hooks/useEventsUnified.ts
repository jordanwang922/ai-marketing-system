import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent } from '@/types';
import { useEventsStore } from './useEvents';
import { useEventsSQLite } from './useEventsSQLite';

// 检测是否在浏览器环境
const isBrowser = typeof window !== 'undefined';

// 动态导入 Firebase（避免 SSR 问题）
let firebaseModules: any = null;
let isFirebaseLoading = false;
let firebaseLoadPromise: Promise<any> | null = null;

const loadFirebase = async () => {
  if (firebaseModules) return firebaseModules;
  if (isFirebaseLoading) return firebaseLoadPromise;
  
  isFirebaseLoading = true;
  firebaseLoadPromise = import('@/lib/firebase').then((modules) => {
    firebaseModules = modules;
    isFirebaseLoading = false;
    return modules;
  }).catch((err) => {
    console.warn('Firebase not available:', err);
    isFirebaseLoading = false;
    return null;
  });
  
  return firebaseLoadPromise;
};

export const useEventsUnified = () => {
  // 1. 本地存储 (Zustand/LocalStorage)
  const localStore = useEventsStore();
  
  // 2. 本地 SQLite 后端 (Node.js + SQLite)
  const sqliteStore = useEventsSQLite();
  const isSQLiteReady = sqliteStore.isServerAvailable === true;

  // 3. Firebase 状态
  const [firebaseEvents, setFirebaseEvents] = useState<CalendarEvent[]>([]);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化 Firebase (如果 SQLite 不可用)
  useEffect(() => {
    if (!isBrowser || isSQLiteReady) {
      if (isSQLiteReady) setIsLoading(false);
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const initFirebase = async () => {
      try {
        const fb = await loadFirebase();
        if (!fb) {
          setIsLoading(false);
          return;
        }

        const { 
          eventsCollection, 
          query, 
          orderBy, 
          onSnapshot, 
          fromTimestamp 
        } = fb;

        const q = query(eventsCollection, orderBy('createdAt', 'desc'));
        
        unsubscribe = onSnapshot(
          q,
          (snapshot: any) => {
            const eventsData: CalendarEvent[] = [];
            snapshot.forEach((doc: any) => {
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
            
            eventsData.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
            setFirebaseEvents(eventsData);
            setIsFirebaseReady(true);
            setIsLoading(false);
          },
          (err: any) => {
            console.error('Firebase error:', err);
            setError('无法连接到服务器，使用本地数据');
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.warn('Firebase initialization failed:', err);
        setIsLoading(false);
      }
    };

    initFirebase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSQLiteReady]);

  // 优先顺序: SQLite > Firebase > LocalStorage
  const events = isSQLiteReady 
    ? sqliteStore.events 
    : (isFirebaseReady ? firebaseEvents : localStore.events);

  // 添加事件
  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    // 始终更新本地状态以获得即时响应
    localStore.addEvent(event);

    if (isSQLiteReady) {
      return await sqliteStore.addEvent(event);
    }

    const id = uuidv4();
    if (isFirebaseReady && firebaseModules) {
      try {
        const { doc, setDoc, eventsCollection, toTimestamp } = firebaseModules;
        const eventRef = doc(eventsCollection, id);
        await setDoc(eventRef, {
          title: event.title,
          titleEn: event.titleEn,
          userId: event.userId,
          startDate: toTimestamp(event.startDate),
          endDate: toTimestamp(event.endDate),
          startTime: event.startTime || null,
          endTime: event.endTime || null,
          isAllDay: event.isAllDay || false,
          createdAt: toTimestamp(new Date()),
        });
      } catch (err) {
        console.error('Failed to sync to Firebase:', err);
      }
    }

    return id;
  }, [isSQLiteReady, isFirebaseReady, localStore, sqliteStore]);

  // 更新事件
  const updateEvent = useCallback(async (id: string, updatedEvent: Partial<CalendarEvent>) => {
    localStore.updateEvent(id, updatedEvent);

    if (isSQLiteReady) {
      return await sqliteStore.updateEvent(id, updatedEvent);
    }

    if (isFirebaseReady && firebaseModules) {
      try {
        const { doc, setDoc, eventsCollection, toTimestamp } = firebaseModules;
        const eventRef = doc(eventsCollection, id);
        
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
      } catch (err) {
        console.error('Failed to sync to Firebase:', err);
      }
    }
  }, [isSQLiteReady, isFirebaseReady, localStore, sqliteStore]);

  // 删除事件
  const deleteEvent = useCallback(async (id: string) => {
    localStore.deleteEvent(id);

    if (isSQLiteReady) {
      return await sqliteStore.deleteEvent(id);
    }

    if (isFirebaseReady && firebaseModules) {
      try {
        const { doc, deleteDoc, eventsCollection } = firebaseModules;
        const eventRef = doc(eventsCollection, id);
        await deleteDoc(eventRef);
      } catch (err) {
        console.error('Failed to sync to Firebase:', err);
      }
    }
  }, [isSQLiteReady, isFirebaseReady, localStore, sqliteStore]);

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

  return {
    events,
    isLoading: isSQLiteReady ? sqliteStore.isLoading : isLoading,
    error: sqliteStore.error || error,
    isFirebaseReady,
    isSQLiteReady,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
    refresh: sqliteStore.refresh,
  };
};

