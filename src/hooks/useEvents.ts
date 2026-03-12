import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent } from '@/types';

// 本地存储版本（作为 Firebase 加载前的缓存）
interface EventsState {
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsByDate: (date: Date) => CalendarEvent[];
  getEventsByDateRange: (startDate: Date, endDate: Date) => CalendarEvent[];
  getEventsByUser: (userId: string) => CalendarEvent[];
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      events: [],
      
      setEvents: (events) => set({ events }),
      
      addEvent: (event) => {
        const newEvent: CalendarEvent = {
          ...event,
          id: uuidv4(),
          createdAt: new Date(),
        };
        set((state) => ({
          events: [...state.events, newEvent],
        }));
        return newEvent.id;
      },
      
      updateEvent: (id, updatedEvent) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updatedEvent } : event
          ),
        }));
      },
      
      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
      },
      
      getEventsByDate: (date) => {
        const { events } = get();
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        return events.filter((event) => {
          const eventStart = new Date(event.startDate);
          const eventEnd = new Date(event.endDate);
          eventStart.setHours(0, 0, 0, 0);
          eventEnd.setHours(0, 0, 0, 0);
          
          return targetDate >= eventStart && targetDate <= eventEnd;
        });
      },
      
      getEventsByDateRange: (startDate, endDate) => {
        const { events } = get();
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
      },
      
      getEventsByUser: (userId) => {
        const { events } = get();
        return events.filter((event) => event.userId === userId);
      },
    }),
    {
      name: 'events-storage',
    }
  )
);

// 导出兼容旧代码的 hook
export const useEvents = useEventsStore;
