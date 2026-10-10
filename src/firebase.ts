/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connection test as required by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'apps', 'test-connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, utilizing cached storage.');
    }
  }
}
testConnection();

export interface AppItem {
  id: string;
  title: string;
  description: string;
  logoUrl?: string;
  apkUrl?: string;
  apkFileName?: string;
  apkSize?: string;
  category?: string;
  version?: string;
  screenshots?: string;
  downloadsCount?: number;
  createdAt: string;
  createdAtTimestamp?: number;
  platforms?: string[];
}

export interface WebsiteItem {
  id: string;
  title: string;
  description: string;
  previewUrl?: string;
  liveUrl?: string;
  tags?: string;
  createdAt: string;
}

export interface SkillItem {
  id: string;
  name: string;
  category?: string;
  iconType: string;
  color?: string;
  order: number;
}

export interface InquiryItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  needs: string;
  idea: string;
  createdAt: string;
}

export const APPS_COLLECTION = 'apps';
export const WEBSITES_COLLECTION = 'websites';
export const SKILLS_COLLECTION = 'skills';
export const INQUIRIES_COLLECTION = 'inquiries';
export const PLANNING_MESSAGES_COLLECTION = 'planning_messages';
export const ADMIN_SETTINGS_COLLECTION = 'admin_settings';

export interface PlanningMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  linkUrl?: string;
  timestamp: number;
  isAi?: boolean;
  aiModel?: string;
  aiProvider?: 'openrouter' | 'nvidia';
}

export interface PlanningConfig {
  provider: 'openrouter' | 'nvidia';
  apiKey: string;
  model: string;
  systemPrompt?: string;
}

// Fallback initial seeds to ensure the website is NEVER completely blank
export const DEFAULT_SKILLS: SkillItem[] = [
  { id: 'skill_android', name: 'Android Apps', category: 'Mobile', iconType: 'android', color: '#3ddc84', order: 1 },
  { id: 'skill_html', name: 'HTML / CSS / JS', category: 'Frontend', iconType: 'code', color: '#f59e0b', order: 2 },
  { id: 'skill_firebase', name: 'Firebase & Cloud', category: 'Backend', iconType: 'firebase', color: '#ffca28', order: 3 },
  { id: 'skill_figma', name: 'UI/UX Design', category: 'Design', iconType: 'figma', color: '#a855f7', order: 4 },
  { id: 'skill_palette', name: 'Art & Visuals', category: 'Creative', iconType: 'palette', color: '#ec4899', order: 5 }
];

export const DEFAULT_APPS: AppItem[] = [
  {
    id: 'pulse-fitness-app',
    title: 'Pulse Fitness',
    description: 'AI-driven workout tracker with real-time calorie calculation, workout logging, and clean dark-mode UI.',
    logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200',
    apkUrl: 'https://github.com',
    apkFileName: 'pulse_fitness_v1.0.apk',
    apkSize: '18.4 MB',
    category: 'Health & Fitness',
    version: 'v1.0.0',
    createdAt: '2026-10-04',
    platforms: ['android']
  }
];

export const DEFAULT_WEBSITES: WebsiteItem[] = [
  {
    id: 'apex-portfolio',
    title: 'Apex Creative Studio',
    description: 'Ultra-modern portfolio website for creative studios with interactive animations and sleek dark aesthetic.',
    previewUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
    liveUrl: 'https://example.com',
    tags: 'React, Tailwind, Motion',
    createdAt: '2026-10-04'
  },
  {
    id: 'nexus-saas',
    title: 'Nexus SaaS Platform',
    description: 'High-conversion SaaS product landing page with dark obsidian theme and interactive feature showcases.',
    previewUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600',
    liveUrl: 'https://example.com',
    tags: 'Next.js, TypeScript',
    createdAt: '2026-10-04'
  }
];
