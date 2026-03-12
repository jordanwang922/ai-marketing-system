import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = 'http://localhost:3001/api';

export const useEventsSQLite = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState<boolean | null>(null);

  // Check if server is reachable
  const checkServer = useCallback(async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      const available = resp.ok;
      setIsServerAvailable(available);
      return available;
    } catch {
      setIsServerAvailable(false);
      return false;
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const available = await checkServer();
    if (!available) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/events`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      
      const formattedData = data.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        createdAt: new Date(event.createdAt),
      }));
      
      setEvents(formattedData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [checkServer]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const newEvent = { ...event, id };
    
    const response = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent),
    });
    
    if (!response.ok) throw new Error('Failed to add event');
    await fetchEvents();
    return id;
  };

  const updateEvent = async (id: string, updatedEvent: Partial<CalendarEvent>) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEvent),
    });
    
    if (!response.ok) throw new Error('Failed to update event');
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/events/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) throw new Error('Failed to delete event');
    await fetchEvents();
  };

  return {
    events,
    isLoading,
    error,
    isServerAvailable,
    addEvent,
    updateEvent,
    deleteEvent,
    refresh: fetchEvents,
  };
};
