import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

// Firebase 配置
// 注意：这些配置信息需要替换为你自己的 Firebase 项目配置
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForDemoPurposesOnly",
  authDomain: "justright-calendar.firebaseapp.com",
  projectId: "justright-calendar",
  storageBucket: "justright-calendar.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 事件集合引用
export const eventsCollection = collection(db, 'events');

// 辅助函数：将 Date 转换为 Firestore Timestamp
export const toTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// 辅助函数：将 Firestore Timestamp 转换为 Date
export const fromTimestamp = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

// 初始化示例数据（仅在集合为空时）
export const initializeSampleData = async () => {
  const snapshot = await getDocs(eventsCollection);
  if (snapshot.empty) {
    // 集合为空，可以添加一些示例数据
    console.log('Events collection is empty, ready for new data');
  }
};

export { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch };
