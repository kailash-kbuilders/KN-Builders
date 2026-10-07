/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppItem,
  WebsiteItem,
  SkillItem,
  InquiryItem,
  db,
  APPS_COLLECTION,
  WEBSITES_COLLECTION,
  SKILLS_COLLECTION,
  INQUIRIES_COLLECTION
} from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Smartphone,
  Globe,
  Award,
  Inbox,
  CheckCircle,
  Download,
  Lock,
  Unlock,
  KeyRound,
  ExternalLink,
  Phone,
  Mail,
  X,
  Upload,
  ArrowUp
} from 'lucide-react';
import { getSkillIcon, WhatsAppLogo, AndroidLogo, WindowsLogo, AppleLogo } from './Icons';

interface AdminPanelProps {
  apps: AppItem[];
  websites: WebsiteItem[];
  skills: SkillItem[];
  inquiries: InquiryItem[];
  onBack: () => void;
  onRefresh: () => void;
}

const ADMIN_PASSWORD = '2026';

// Compresses image for healthy Firestore document storage (<100KB per screenshot)
function compressImage(file: File, maxWidth = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Helper: sorts apps with newest timestamps/dates on top
function sortAppsNewestFirst(items: AppItem[]): AppItem[] {
  return [...items].sort((a, b) => {
    const tA = a.createdAtTimestamp;
    const tB = b.createdAtTimestamp;
    if (tA !== undefined && tB !== undefined && tA !== tB) {
      return tB - tA; // Highest timestamp (newest) on top
    }
    if (tB !== undefined && tA === undefined) return 1;
    if (tA !== undefined && tB === undefined) return -1;

    // Fallback to createdAt string date parsing
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
      return dateB - dateA;
    }

    if (a.id === 'pulse-fitness-app') return 1;
    if (b.id === 'pulse-fitness-app') return -1;

    return 0;
  });
}

export default function AdminPanel({
  apps,
  websites,
  skills,
  inquiries,
  onBack,
  onRefresh
}: AdminPanelProps) {
  // Password Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('kn_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'apps' | 'websites' | 'skills' | 'inquiries'>('apps');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local optimistic lists for instant updates with newest apps on top
  const [localApps, setLocalApps] = useState<AppItem[]>(() => sortAppsNewestFirst(apps));
  const [localWebsites, setLocalWebsites] = useState<WebsiteItem[]>(websites);
  const [localSkills, setLocalSkills] = useState<SkillItem[]>(skills);
  const [localInquiries, setLocalInquiries] = useState<InquiryItem[]>(inquiries);

  useEffect(() => { setLocalApps(sortAppsNewestFirst(apps)); }, [apps]);
  useEffect(() => { setLocalWebsites(websites); }, [websites]);
  useEffect(() => { setLocalSkills(skills); }, [skills]);
  useEffect(() => { setLocalInquiries(inquiries); }, [inquiries]);

  // Realtime Firestore listeners directly inside AdminPanel so multiple admins on different phones stay 100% synced in real time
  useEffect(() => {
    const unsubApps = onSnapshot(collection(db, APPS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const items: AppItem[] = [];
        const seenIds = new Set<string>();
        snap.forEach((docSnap) => {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            items.push({ id: docSnap.id, ...(docSnap.data() as Omit<AppItem, 'id'>) });
          }
        });
        setLocalApps(sortAppsNewestFirst(items));
      }
    }, (err) => console.warn('Admin apps onSnapshot warning:', err));

    const unsubWeb = onSnapshot(collection(db, WEBSITES_COLLECTION), (snap) => {
      if (!snap.empty) {
        const items: WebsiteItem[] = [];
        const seenIds = new Set<string>();
        snap.forEach((docSnap) => {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            items.push({ id: docSnap.id, ...(docSnap.data() as Omit<WebsiteItem, 'id'>) });
          }
        });
        setLocalWebsites(items);
      }
    }, (err) => console.warn('Admin web onSnapshot warning:', err));

    const unsubSkills = onSnapshot(collection(db, SKILLS_COLLECTION), (snap) => {
      if (!snap.empty) {
        const items: SkillItem[] = [];
        const seenIds = new Set<string>();
        snap.forEach((docSnap) => {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            items.push({ id: docSnap.id, ...(docSnap.data() as Omit<SkillItem, 'id'>) });
          }
        });
        items.sort((a, b) => (a.order || 0) - (b.order || 0));
        setLocalSkills(items);
      }
    }, (err) => console.warn('Admin skills onSnapshot warning:', err));

    return () => {
      unsubApps();
      unsubWeb();
      unsubSkills();
    };
  }, []);

  // Delete Confirmation Modal State
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'app' | 'website' | 'skill' | 'inquiry';
    id: string;
    title: string;
  } | null>(null);

  // App form state
  const [appTitle, setAppTitle] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appCategory, setAppCategory] = useState('Android App');
  const [appVersion, setAppVersion] = useState('v1.0.0');
  const [appLogoUrl, setAppLogoUrl] = useState('');
  const [appApkUrl, setAppApkUrl] = useState('');
  const [apkFileName, setApkFileName] = useState('');
  const [apkSize, setApkSize] = useState('18.4 MB');
  const [screenshotsList, setScreenshotsList] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['android']);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  const togglePlatform = (p: string) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((x) => x !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  // Website form state
  const [webTitle, setWebTitle] = useState('');
  const [webDescription, setWebDescription] = useState('');
  const [webPreviewUrl, setWebPreviewUrl] = useState('');
  const [webLiveUrl, setWebLiveUrl] = useState('');
  const [webTags, setWebTags] = useState('React, Tailwind');
  const [editingWebId, setEditingWebId] = useState<string | null>(null);

  // Skill form state
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('Development');
  const [skillIconType, setSkillIconType] = useState('android');
  const [skillColor, setSkillColor] = useState('#3ddc84');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('kn_admin_auth', 'true');
      setAuthError(null);
    } else {
      setAuthError('Incorrect PIN! Please enter 2026.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('kn_admin_auth');
    setPasswordInput('');
  };

  // App Logo file to dataURL helper
  // App Logo file to dataURL helper (auto-compressed to <30KB for healthy Firestore sync)
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSubmitting(true);
      showToast('Optimizing app logo...');
      try {
        const compressed = await compressImage(file, 256, 0.82);
        setAppLogoUrl(compressed || '');
        showToast('Logo optimized & ready!');
      } catch (err) {
        console.error('Logo compression error:', err);
        const reader = new FileReader();
        reader.onloadend = () => setAppLogoUrl(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Multi-file Screenshot Uploader (auto-compressed to <60KB each for multi-device sync)
  const handleScreenshotsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsSubmitting(true);
    showToast('Optimizing screenshots for cloud sync...');

    const newScreenshots: string[] = [];
    const count = Math.min(files.length, 6);
    for (let i = 0; i < count; i++) {
      const compressed = await compressImage(files[i], 640, 0.7);
      if (compressed) {
        newScreenshots.push(compressed);
      }
    }

    setScreenshotsList((prev) => [...prev, ...newScreenshots].slice(0, 8));
    setIsSubmitting(false);
    showToast(`${newScreenshots.length} screenshot(s) optimized & added!`);
  };

  const handleRemoveScreenshot = (indexToRemove: number) => {
    setScreenshotsList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Save / Update App
  const handleSaveApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const existingApp = editingAppId ? localApps.find((a) => a.id === editingAppId) : null;
      const cleanPlatforms = Array.isArray(selectedPlatforms) && selectedPlatforms.length > 0
        ? selectedPlatforms.map((p) => String(p).toLowerCase().trim()).filter(Boolean)
        : ['android'];

      const payload = {
        title: appTitle.trim(),
        description: appDescription.trim(),
        category: (appCategory || 'Android App').trim(),
        version: (appVersion || 'v1.0.0').trim(),
        logoUrl: (appLogoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150').trim(),
        apkUrl: (appApkUrl || '#').trim(),
        apkFileName: (apkFileName || `${appTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_v1.apk`).trim(),
        apkSize: (apkSize || '15 MB').trim(),
        screenshots: JSON.stringify(screenshotsList || []),
        platforms: cleanPlatforms,
        createdAt: existingApp?.createdAt || new Date().toLocaleDateString(),
        createdAtTimestamp: existingApp?.createdAtTimestamp || Date.now()
      };

      if (editingAppId) {
        // Use setDoc with merge: true so it NEVER fails with NOT_FOUND across multiple devices/phones
        await setDoc(doc(db, APPS_COLLECTION, editingAppId), payload, { merge: true });
        setLocalApps((prev) => prev.map((a) => (a.id === editingAppId ? { ...a, ...payload, id: editingAppId } : a)));
        showToast('App updated live in database!');
      } else {
        const docRef = await addDoc(collection(db, APPS_COLLECTION), payload);
        const newApp: AppItem = { id: docRef.id, ...payload };
        setLocalApps((prev) => sortAppsNewestFirst([newApp, ...prev.filter((a) => a.id !== docRef.id)]));
        showToast('New App published at top of website!');
      }

      setAppTitle('');
      setAppDescription('');
      setAppLogoUrl('');
      setAppApkUrl('');
      setApkFileName('');
      setScreenshotsList([]);
      setSelectedPlatforms(['android']);
      setEditingAppId(null);
      onRefresh();
    } catch (err: any) {
      console.error('Save app error:', err);
      showToast(`Error: ${err?.message || 'Error saving app to Firestore'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save / Update Website
  const handleSaveWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        title: webTitle.trim(),
        description: webDescription.trim(),
        previewUrl: webPreviewUrl.trim() || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600',
        liveUrl: webLiveUrl.trim() || '#',
        tags: webTags.trim(),
        createdAt: new Date().toLocaleDateString()
      };

      if (editingWebId) {
        await setDoc(doc(db, WEBSITES_COLLECTION, editingWebId), payload, { merge: true });
        showToast('Website updated live!');
      } else {
        await addDoc(collection(db, WEBSITES_COLLECTION), payload);
        showToast('Website published live!');
      }

      setWebTitle('');
      setWebDescription('');
      setWebPreviewUrl('');
      setWebLiveUrl('');
      setEditingWebId(null);
      onRefresh();
    } catch (err: any) {
      console.error('Save website error:', err);
      showToast(`Error: ${err?.message || 'Error saving website'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save / Update Skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: skillName.trim(),
        category: skillCategory.trim(),
        iconType: skillIconType.trim(),
        color: skillColor.trim(),
        order: skills.length + 1
      };

      if (editingSkillId) {
        await setDoc(doc(db, SKILLS_COLLECTION, editingSkillId), payload, { merge: true });
        showToast('Skill updated live on website!');
      } else {
        await addDoc(collection(db, SKILLS_COLLECTION), payload);
        showToast('Skill added live to website!');
      }

      setSkillName('');
      setEditingSkillId(null);
      onRefresh();
    } catch (err: any) {
      console.error('Save skill error:', err);
      showToast(`Error: ${err?.message || 'Error saving skill'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bring any existing or new app to the very top without deleting
  const handleBringAppToTop = async (appId: string, appTitleText: string) => {
    try {
      const topTimestamp = Date.now() + 5000;
      setLocalApps((prev) => {
        const updated = prev.map((a) => (a.id === appId ? { ...a, createdAtTimestamp: topTimestamp } : a));
        return sortAppsNewestFirst(updated);
      });
      await setDoc(doc(db, APPS_COLLECTION, appId), {
        createdAtTimestamp: topTimestamp
      }, { merge: true });
      showToast(`"${appTitleText}" moved to the top of website!`);
      onRefresh();
    } catch (err: any) {
      console.error('Error bringing app to top:', err);
      showToast(`Error: ${err?.message || 'Error moving app to top'}`);
    }
  };

  // Execute confirmed deletion
  const executeDelete = async () => {
    if (!pendingDelete) return;
    const { type, id, title } = pendingDelete;
    setPendingDelete(null);

    try {
      if (type === 'app') {
        setLocalApps((prev) => prev.filter((a) => a.id !== id));
        try {
          const cached = localStorage.getItem('kn_cached_apps');
          if (cached) {
            const list = JSON.parse(cached).filter((a: AppItem) => a.id !== id);
            localStorage.setItem('kn_cached_apps', JSON.stringify(list));
          }
        } catch (e) {}
        await deleteDoc(doc(db, APPS_COLLECTION, id));
        showToast(`App "${title}" deleted from database`);
      } else if (type === 'website') {
        setLocalWebsites((prev) => prev.filter((w) => w.id !== id));
        try {
          const cached = localStorage.getItem('kn_cached_websites');
          if (cached) {
            const list = JSON.parse(cached).filter((w: WebsiteItem) => w.id !== id);
            localStorage.setItem('kn_cached_websites', JSON.stringify(list));
          }
        } catch (e) {}
        await deleteDoc(doc(db, WEBSITES_COLLECTION, id));
        showToast(`Website "${title}" deleted`);
      } else if (type === 'skill') {
        setLocalSkills((prev) => prev.filter((s) => s.id !== id));
        try {
          const cached = localStorage.getItem('kn_cached_skills');
          if (cached) {
            const list = JSON.parse(cached).filter((s: SkillItem) => s.id !== id);
            localStorage.setItem('kn_cached_skills', JSON.stringify(list));
          }
        } catch (e) {}
        await deleteDoc(doc(db, SKILLS_COLLECTION, id));
        showToast(`Skill "${title}" deleted`);
      } else if (type === 'inquiry') {
        setLocalInquiries((prev) => prev.filter((i) => i.id !== id));
        await deleteDoc(doc(db, INQUIRIES_COLLECTION, id));
        showToast('Inquiry deleted from database');
      }

      onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Delete failed. Please try again.');
    }
  };

  // PASSWORD GATE: PIN "2026"
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0e0e15] border border-[#222230] rounded-3xl p-7 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">KN Builders Admin</h2>
            <p className="text-xs text-slate-400 mt-1">Enter PIN (2026) to manage apps, websites, skills & inquiries</p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(null);
                }}
                placeholder="PIN: 2026"
                className="w-full bg-[#161622] border border-[#2a2a3a] rounded-2xl pl-11 pr-4 py-3.5 text-center text-lg font-bold tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95 text-sm"
            >
              Unlock Admin Panel
            </button>
          </form>

          <button
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            ← Return to Website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 relative">
      
      {/* Custom In-App Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111119] border border-[#2b2b3a] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Delete {pendingDelete.type.toUpperCase()}?</h3>
              <p className="text-sm font-semibold text-slate-200">"{pendingDelete.title}"</p>
              <p className="text-xs text-slate-400 pt-1">
                This will be permanently removed from the live Firestore database and will disappear for all website visitors.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1f1f2c]">
              <button
                onClick={() => setPendingDelete(null)}
                className="py-3 rounded-xl bg-[#1e1e28] hover:bg-[#282836] text-xs font-semibold text-slate-300 cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 cursor-pointer transition-all active:scale-95"
              >
                Yes, Delete Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#16a34a] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-green-400">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#22222a]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#181820] hover:bg-[#252530] border border-[#2e2e3a] flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">
              KN Builders <span className="text-blue-500 font-bold text-base">Admin Panel</span>
            </h1>
            <p className="text-xs text-slate-400">Live Firebase sync active — updates reflect instantly for all visitors</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            title="Lock Admin Session"
            className="px-3.5 py-2 rounded-xl bg-[#1e1e28] hover:bg-[#282836] border border-[#2e2e3e] text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock</span>
          </button>

          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-bold text-white transition-all cursor-pointer shadow-md shadow-blue-600/30"
          >
            View Live Website
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="max-w-6xl mx-auto mt-6 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('apps')}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'apps'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-[#121218] text-slate-400 hover:text-white border border-[#20202a]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Apps ({localApps.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('websites')}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'websites'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-[#121218] text-slate-400 hover:text-white border border-[#20202a]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Websites ({localWebsites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-[#121218] text-slate-400 hover:text-white border border-[#20202a]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Skills ({localSkills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'inquiries'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-[#121218] text-slate-400 hover:text-white border border-[#20202a]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inquiries ({localInquiries.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-6xl mx-auto mt-6">
        
        {/* ===================== APPS TAB ===================== */}
        {activeTab === 'apps' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1 bg-[#0f0f15] border border-[#22222d] rounded-3xl p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <span>{editingAppId ? 'Edit App Details' : 'Add New App'}</span>
              </h2>

              <form onSubmit={handleSaveApp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">App Name *</label>
                  <input
                    type="text"
                    required
                    value={appTitle}
                    onChange={(e) => setAppTitle(e.target.value)}
                    placeholder="e.g. Pulse Fitness"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={appCategory}
                    onChange={(e) => setAppCategory(e.target.value)}
                    placeholder="Health & Fitness, Utilities, Gaming"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Version</label>
                  <input
                    type="text"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Describe what the app does, key features..."
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">App Icon / Logo</label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
                    />
                    <input
                      type="url"
                      value={appLogoUrl}
                      onChange={(e) => setAppLogoUrl(e.target.value)}
                      placeholder="Or enter image URL: https://..."
                      className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    APK Download Link (URL)
                  </label>
                  <input
                    type="text"
                    value={appApkUrl}
                    onChange={(e) => setAppApkUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or direct APK URL"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">APK File Name</label>
                    <input
                      type="text"
                      value={apkFileName}
                      onChange={(e) => setApkFileName(e.target.value)}
                      placeholder="app_v1.apk"
                      className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">APK Size</label>
                    <input
                      type="text"
                      value={apkSize}
                      onChange={(e) => setApkSize(e.target.value)}
                      placeholder="18.4 MB"
                      className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Supported Platforms (Real Android, Windows, Apple Logos) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Supported Platforms *
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Select all that apply</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Android */}
                    <button
                      type="button"
                      onClick={() => togglePlatform('android')}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedPlatforms.includes('android')
                          ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/50'
                          : 'bg-[#14141e] border-[#29293a] text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {selectedPlatforms.includes('android') && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                      <AndroidLogo className="w-6 h-6 shrink-0" />
                      <span className="text-xs font-bold text-white">Android</span>
                    </button>

                    {/* Windows */}
                    <button
                      type="button"
                      onClick={() => togglePlatform('windows')}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedPlatforms.includes('windows')
                          ? 'bg-blue-950/70 border-[#0078D4] text-[#38bdf8] shadow-md shadow-blue-500/30 ring-2 ring-[#0078D4]/50'
                          : 'bg-[#14141e] border-[#29293a] text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {selectedPlatforms.includes('windows') && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#0078D4] text-white flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                      <WindowsLogo className="w-6 h-6 shrink-0" />
                      <span className="text-xs font-bold text-white">Windows</span>
                    </button>

                    {/* Apple */}
                    <button
                      type="button"
                      onClick={() => togglePlatform('apple')}
                      className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedPlatforms.includes('apple')
                          ? 'bg-slate-850 border-slate-300 text-white shadow-md shadow-white/20 ring-2 ring-slate-300/50'
                          : 'bg-[#14141e] border-[#29293a] text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {selectedPlatforms.includes('apple') && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-black">
                          ✓
                        </span>
                      )}
                      <AppleLogo className="w-6 h-6 shrink-0" />
                      <span className="text-xs font-bold text-white">Apple</span>
                    </button>
                  </div>
                </div>

                {/* Direct Screenshot Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      App Screenshots (Upload Images)
                    </label>
                    <span className="text-[11px] text-blue-400 font-medium">
                      {screenshotsList.length} Uploaded
                    </span>
                  </div>

                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#2d2d3e] hover:border-blue-500/60 rounded-2xl cursor-pointer bg-[#14141e] hover:bg-[#181826] transition-all text-center">
                    <Upload className="w-5 h-5 text-blue-400 mb-1" />
                    <span className="text-xs font-bold text-white">Click to Upload Screenshots</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Select multiple images from your phone or PC</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleScreenshotsUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Screenshots Preview Gallery with Remove option */}
                  {screenshotsList.length > 0 && (
                    <div className="flex gap-2.5 overflow-x-auto pt-2 pb-1 scrollbar-thin">
                      {screenshotsList.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-24 rounded-xl border border-[#2c2c3e] overflow-hidden shrink-0 group shadow-md"
                        >
                          <img src={src} alt="screenshot" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveScreenshot(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer shadow hover:bg-red-500 transition-colors"
                            title="Remove Screenshot"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-lg shadow-blue-600/30 btn-interactive"
                  >
                    {isSubmitting ? 'Saving...' : editingAppId ? 'Update App' : 'Add App'}
                  </button>
                  {editingAppId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAppId(null);
                        setAppTitle('');
                        setAppDescription('');
                        setAppLogoUrl('');
                        setAppApkUrl('');
                        setApkFileName('');
                        setScreenshotsList([]);
                        setSelectedPlatforms(['android']);
                      }}
                      className="px-4 py-3 bg-[#1e1e2c] hover:bg-[#28283a] rounded-xl font-semibold text-sm text-slate-300 transition-all cursor-pointer btn-interactive"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold">Published Apps ({localApps.length})</h2>
              {localApps.length === 0 ? (
                <div className="p-8 text-center bg-[#0e0e14] border border-[#20202a] rounded-3xl text-slate-400 text-sm">
                  No apps currently in database. Add your first app using the form on the left!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {localApps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-[#0f0f15] border border-[#22222d] rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={app.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                          alt={app.title}
                          className="w-14 h-14 rounded-2xl object-cover border border-[#252535] shrink-0"
                        />
                        <div className="overflow-hidden flex-1">
                          <h3 className="font-bold text-sm text-white truncate">{app.title}</h3>
                          <span className="text-[11px] text-blue-400 font-semibold block">{app.category || 'Android App'}</span>
                          <span className="text-[10px] text-slate-400">{app.version || 'v1.0.0'} • {app.apkSize || '15 MB'}</span>
                          
                          {/* Real Official Platform Badges */}
                          <div className="flex items-center gap-1 mt-1.5">
                            {(app.platforms && app.platforms.length > 0 ? app.platforms : ['android']).map((plat) => (
                              <span key={plat} className="p-1 rounded-md bg-[#181826] border border-[#27273a] inline-flex items-center" title={plat}>
                                {plat === 'android' && <AndroidLogo className="w-3.5 h-3.5" />}
                                {plat === 'windows' && <WindowsLogo className="w-3.5 h-3.5" />}
                                {plat === 'apple' && <AppleLogo className="w-3.5 h-3.5" />}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 mt-2.5 line-clamp-2">{app.description || 'No description provided'}</p>

                      <div className="mt-4 pt-3 border-t border-[#1f1f28] flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{app.apkFileName || 'APK'}</span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingAppId(app.id);
                              setAppTitle(app.title);
                              setAppDescription(app.description || '');
                              setAppCategory(app.category || 'Android App');
                              setAppVersion(app.version || 'v1.0.0');
                              setAppLogoUrl(app.logoUrl || '');
                              setAppApkUrl(app.apkUrl || '');
                              setApkFileName(app.apkFileName || '');
                              setApkSize(app.apkSize || '15 MB');
                              setSelectedPlatforms(app.platforms && Array.isArray(app.platforms) && app.platforms.length > 0 ? app.platforms : ['android']);

                              // Parse screenshots
                              try {
                                const parsed = JSON.parse(app.screenshots || '[]');
                                if (Array.isArray(parsed)) setScreenshotsList(parsed);
                                else setScreenshotsList(app.screenshots ? app.screenshots.split(',').map((s) => s.trim()).filter(Boolean) : []);
                              } catch (e) {
                                setScreenshotsList(app.screenshots ? app.screenshots.split(',').map((s) => s.trim()).filter(Boolean) : []);
                              }

                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              showToast(`Editing "${app.title}"... Form is ready above.`);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit App"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBringAppToTop(app.id, app.title)}
                            className="p-1.5 rounded-lg hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                            title="Move to Top (Sabse Upar Laayein)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPendingDelete({ type: 'app', id: app.id, title: app.title })}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete App"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== WEBSITES TAB ===================== */}
        {activeTab === 'websites' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-[#0f0f15] border border-[#22222d] rounded-3xl p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <span>{editingWebId ? 'Edit Website' : 'Add New Website'}</span>
              </h2>

              <form onSubmit={handleSaveWebsite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website Title *</label>
                  <input
                    type="text"
                    required
                    value={webTitle}
                    onChange={(e) => setWebTitle(e.target.value)}
                    placeholder="e.g. Apex Portfolio"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={webDescription}
                    onChange={(e) => setWebDescription(e.target.value)}
                    placeholder="What the website is about..."
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Live URL</label>
                  <input
                    type="url"
                    value={webLiveUrl}
                    onChange={(e) => setWebLiveUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Technologies)</label>
                  <input
                    type="text"
                    value={webTags}
                    onChange={(e) => setWebTags(e.target.value)}
                    placeholder="React, Next.js, Tailwind"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  {editingWebId ? 'Update Website' : 'Add Website'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold">Published Websites ({localWebsites.length})</h2>
              {localWebsites.length === 0 ? (
                <div className="p-8 text-center bg-[#0e0e14] border border-[#20202a] rounded-3xl text-slate-400 text-sm">
                  No websites added yet. Add one using the form on the left!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {localWebsites.map((web) => (
                    <div
                      key={web.id}
                      className="bg-[#0f0f15] border border-[#22222d] rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/50 transition-all hover:scale-[1.02]"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-base text-white">{web.title}</h3>
                          <span className="text-[11px] text-blue-400">{web.tags || 'Web App'}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{web.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#1f1f28] flex items-center justify-between">
                        {web.liveUrl && (
                          <a
                            href={web.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-slate-300 hover:text-white flex items-center gap-1"
                          >
                            <span>Live Preview</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => {
                              setEditingWebId(web.id);
                              setWebTitle(web.title);
                              setWebDescription(web.description || '');
                              setWebLiveUrl(web.liveUrl || '');
                              setWebTags(web.tags || '');
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPendingDelete({ type: 'website', id: web.id, title: web.title })}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== SKILLS TAB ===================== */}
        {activeTab === 'skills' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-[#0f0f15] border border-[#22222d] rounded-3xl p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <span>{editingSkillId ? 'Edit Skill' : 'Add New Skill'}</span>
              </h2>

              <form onSubmit={handleSaveSkill} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Skill Name *</label>
                  <input
                    type="text"
                    required
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g. Flutter Apps, React Native, Node.js"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    placeholder="e.g. Mobile, Frontend, Backend, UI/UX"
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Icon Style</label>
                  <select
                    value={skillIconType}
                    onChange={(e) => setSkillIconType(e.target.value)}
                    className="w-full bg-[#181820] border border-[#2c2c38] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="android">Android Robot Logo</option>
                    <option value="code">HTML / CSS / JS Code</option>
                    <option value="firebase">Firebase Cloud Flame</option>
                    <option value="figma">UI/UX Figma Logo</option>
                    <option value="palette">Art & Visuals Palette</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm text-white transition-all cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  {editingSkillId ? 'Update Skill' : 'Add Skill'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold">Active Skills on Website ({localSkills.length})</h2>
              {localSkills.length === 0 ? (
                <div className="p-8 text-center bg-[#0e0e14] border border-[#20202a] rounded-3xl text-slate-400 text-sm">
                  No skills in database. Add a new skill on the left!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="bg-[#0f0f15] border border-[#22222d] rounded-2xl p-4 flex items-center justify-between hover:border-blue-500/50 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#181822] flex items-center justify-center shrink-0 border border-[#262634]">
                          {getSkillIcon(skill.iconType, 'w-5 h-5')}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{skill.name}</h4>
                          <span className="text-[11px] text-slate-400">{skill.category || 'Skill'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSkillId(skill.id);
                            setSkillName(skill.name);
                            setSkillCategory(skill.category || '');
                            setSkillIconType(skill.iconType || 'android');
                          }}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Edit Skill"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDelete({ type: 'skill', id: skill.id, title: skill.name })}
                          className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                          title="Delete Skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== INQUIRIES TAB ===================== */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Client Project Requests ({localInquiries.length})</h2>
                <p className="text-xs text-slate-400">Manage client submissions, view phone numbers and reply directly via WhatsApp or Email</p>
              </div>
            </div>

            {localInquiries.length === 0 ? (
              <div className="p-8 text-center bg-[#0e0e14] border border-[#20202a] rounded-3xl text-slate-400 text-sm">
                No inquiries received yet. When visitors fill out the "Start a project" form, they will appear here in real-time!
              </div>
            ) : (
              <div className="space-y-3">
                {localInquiries.map((inq) => {
                  const rawPhone = inq.phone ? inq.phone.replace(/[^0-9]/g, '') : '';
                  const clientWhatsAppNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                  const waChatUrl = rawPhone
                    ? `https://wa.me/${clientWhatsAppNumber}?text=Hi%20${encodeURIComponent(inq.name)}%2C%20thank%20you%20for%20contacting%20KN%20Builders!%20Regarding%20your%20inquiry%20for%20${encodeURIComponent(inq.needs || 'Project')}...`
                    : `https://wa.me/916377938441?text=Hi%20${encodeURIComponent(inq.name)}%2C%20regarding%20your%20inquiry...`;

                  return (
                    <div
                      key={inq.id}
                      className="bg-[#0f0f15] border border-[#22222d] rounded-2xl p-5 hover:border-blue-500/40 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f1f28] pb-3">
                        <div>
                          <h3 className="font-bold text-base text-white">{inq.name}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                            <a
                              href={`mailto:${inq.email}`}
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>{inq.email}</span>
                            </a>

                            {inq.phone ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp: {inq.phone}</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">
                                No phone provided
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold">
                            {inq.needs || 'General Inquiry'}
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1">{inq.createdAt || 'Recent'}</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed bg-[#0b0b10] p-3 rounded-xl border border-[#1b1b26]">
                        {inq.idea}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={waChatUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1fb355] text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-green-600/20 transition-all active:scale-95"
                          >
                            <WhatsAppLogo className="w-4 h-4" />
                            <span>{inq.phone ? 'Reply on Client WhatsApp' : 'WhatsApp'}</span>
                          </a>

                          <a
                            href={`mailto:${inq.email}?subject=Regarding%20Your%20Project%20Inquiry%20-%20KN%20Builders&body=Hi%20${encodeURIComponent(inq.name)}%2C%0A%0AThank%20you%20for%20contacting%20KN%20Builders.`}
                            className="px-3.5 py-2 rounded-xl bg-[#1e1e28] hover:bg-[#282838] text-slate-200 border border-[#303040] font-semibold text-xs inline-flex items-center gap-1.5 transition-all"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                            <span>Send Email</span>
                          </a>
                        </div>

                        <button
                          onClick={() => setPendingDelete({ type: 'inquiry', id: inq.id, title: `Inquiry from ${inq.name}` })}
                          title="Delete this inquiry"
                          className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-semibold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
