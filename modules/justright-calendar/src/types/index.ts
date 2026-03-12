// 用户类型
export interface User {
  id: string;
  name: string;
  nameEn?: string;
  color: string;
  bgColor?: string;
  borderColor?: string;
}

export const PRESET_COLORS = [
  '#7F56D9', // Purple
  '#17B26A', // Green
  '#F04438', // Red
  '#F79009', // Orange
  '#2E90FA', // Blue
  '#EE46BC', // Pink
  '#667085', // Grey
];

// 日程事件类型
export interface CalendarEvent {
  id: string;
  title: string;
  titleEn: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  createdAt: Date;
}

// 语言类型
export type Language = 'zh' | 'en';

// 视图类型
export type ViewType = 'month' | 'week';

// 应用状态
export interface AppState {
  currentUser: User | null;
  language: Language;
  viewType: ViewType;
  currentDate: Date;
  events: CalendarEvent[];
}

// 用户信息配置（可扩展）
export const USERS: User[] = [
  {
    id: 'jordan',
    name: 'Jordan',
    nameEn: 'Jordan',
    color: '#7F56D9',
  },
  {
    id: 'dean',
    name: 'Dean',
    nameEn: 'Dean',
    color: '#17B26A',
  },
];

// 获取用户 by ID
export const getUserById = (id: string): User | undefined => {
  return USERS.find(user => user.id === id);
};

// 添加新用户（预留接口）
export const addUser = (user: Omit<User, 'id'> & { id: string }) => {
  USERS.push(user);
};
