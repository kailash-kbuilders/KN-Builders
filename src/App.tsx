/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Search,
  Check,
  Send,
  Download,
  Smartphone,
  Globe,
  ExternalLink,
  ChevronRight,
  Phone,
  Mail,
  CheckCircle2,
  Lock
} from 'lucide-react';
import {
  AppItem,
  WebsiteItem,
  SkillItem,
  InquiryItem,
  db,
  APPS_COLLECTION,
  WEBSITES_COLLECTION,
  SKILLS_COLLECTION,
  INQUIRIES_COLLECTION,
  DEFAULT_SKILLS,
  DEFAULT_APPS,
  DEFAULT_WEBSITES
} from './firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  setDoc,
  doc
} from 'firebase/firestore';
import { WhatsAppLogo, EmailEnvelopeIcon, getSkillIcon } from './components/Icons';
import AdminPanel from './components/AdminPanel';
import AppDetailPage from './components/AppDetailPage';

const WHATSAPP_NUMBER = '6377938441';
const WHATSAPP_URL = `https://wa.me/91${WHATSAPP_NUMBER}?text=${encodeURIComponent('hey KN Builders I want to create')}`;
const CONTACT_EMAIL = 'theamericanpulseofficial@gmail.com';
const MAILTO_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Inquiry for KN Builders')}&body=${encodeURIComponent('Hello KN Builders,\n\nI want to discuss a project with you.\n\nBest regards,')}`;

function getSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// Ordered sections matching the EXACT visual order of the page
const NAV_SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'skills-section', label: 'Skills' },
  { id: 'apps-section', label: 'Apps' },
  { id: 'websites-section', label: 'Websites' },
  { id: 'how-we-work-section', label: 'How We Work' },
  { id: 'faq-section', label: 'FAQ' },
  { id: 'start-project', label: 'Contact' }
];

export default function App() {
  // Navigation Routing States - Defaults strictly to false so refresh never opens admin
  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase();
      return h === '#open-admin' || h === '#/admin';
    }
    return false;
  });

  const [activeAppSlug, setActiveAppSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      const h = window.location.hash;
      const matchPath = p.match(/\/app\/([^/?#]+)/);
      const matchHash = h.match(/#\/app\/([^/?#]+)/);
      return matchPath?.[1] || matchHash?.[1] || null;
    }
    return null;
  });

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('home');

  // Secret owner backdoor: 5 clicks on "KN" logo opens Admin Panel
  const [brandClickCount, setBrandClickCount] = useState<number>(0);
  const brandClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleBrandClick = () => {
    setBrandClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminView(true);
        window.location.hash = 'open-admin';
        return 0;
      }
      return next;
    });

    if (brandClickTimerRef.current) clearTimeout(brandClickTimerRef.current);
    brandClickTimerRef.current = setTimeout(() => {
      setBrandClickCount(0);
    }, 2500);
  };

  // Firestore synced state with cache & deduplication
  const [apps, setApps] = useState<AppItem[]>(() => {
    try {
      const cached = localStorage.getItem('kn_cached_apps');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_APPS;
  });

  const [websites, setWebsites] = useState<WebsiteItem[]>(() => {
    try {
      const cached = localStorage.getItem('kn_cached_websites');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_WEBSITES;
  });

  const [skills, setSkills] = useState<SkillItem[]>(() => {
    try {
      const cached = localStorage.getItem('kn_cached_skills');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_SKILLS;
  });

  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);

  // Search & Accordion
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState<string>('Alex');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['Android App']);
  const [idea, setIdea] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSavingInquiry, setIsSavingInquiry] = useState<boolean>(false);

  // Precise scroll spy: updates activeSection in the exact sequential order of the page
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // 1. If at top of the page (within 160px)
      if (scrollY < 160) {
        setActiveSection('home');
        return;
      }

      // 2. If near bottom of the page (within 180px of doc end)
      if (scrollY + windowHeight >= docHeight - 180) {
        setActiveSection('start-project');
        return;
      }

      // 3. Middle sections: detect which section boundary user has entered
      const activationOffset = windowHeight * 0.35;
      let matched = 'home';

      for (const item of NAV_SECTIONS) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= activationOffset) {
            matched = item.id;
          }
        }
      }

      setActiveSection(matched);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to URL routing (Clean & strictly controlled)
  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      // Check admin route
      if (
        path.endsWith('/admin') ||
        path.includes('/admin') ||
        hash === '#admin' ||
        hash === '#/admin' ||
        hash === '#open-admin'
      ) {
        setIsAdminView(true);
        setActiveAppSlug(null);
        return;
      }

      setIsAdminView(false);

      const rawPath = window.location.pathname;
      const rawHash = window.location.hash;
      const matchPath = rawPath.match(/\/app\/([^/?#]+)/);
      const matchHash = rawHash.match(/#\/?app\/([^/?#]+)/);
      const appSlug = matchPath?.[1] || matchHash?.[1] || null;
      setActiveAppSlug(appSlug);
    };

    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);
    return () => {
      window.removeEventListener('hashchange', handleRoute);
      window.removeEventListener('popstate', handleRoute);
    };
  }, []);

  const navigateToHome = () => {
    setIsAdminView(false);
    setActiveAppSlug(null);
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAdmin = () => {
    setIsMenuOpen(false);
    window.history.pushState({}, '', '/admin');
    setIsAdminView(true);
    setActiveAppSlug(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToApp = (appItem: AppItem) => {
    const slug = getSlug(appItem.title);
    window.history.pushState({}, '', `/app/${slug}`);
    setActiveAppSlug(slug);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to Firestore Realtime Data with STRICT DEDUPLICATION
  useEffect(() => {
    // 1. Apps Listener (Deduplicated by ID & normalized Title)
    const unsubApps = onSnapshot(
      collection(db, APPS_COLLECTION),
      (snap) => {
        if (!snap.empty) {
          const items: AppItem[] = [];
          const seenIds = new Set<string>();
          const seenTitles = new Set<string>();

          snap.forEach((docSnap) => {
            const data = docSnap.data() as Omit<AppItem, 'id'>;
            const normTitle = (data.title || '').trim().toLowerCase();
            if (!seenIds.has(docSnap.id) && !seenTitles.has(normTitle)) {
              seenIds.add(docSnap.id);
              seenTitles.add(normTitle);
              items.push({ id: docSnap.id, ...data });
            }
          });

          const finalList = items.length > 0 ? items : DEFAULT_APPS;
          setApps(finalList);
          localStorage.setItem('kn_cached_apps', JSON.stringify(finalList));
        } else {
          if (!localStorage.getItem('kn_apps_seeded_once_v6')) {
            DEFAULT_APPS.forEach(async (app) => {
              await setDoc(doc(db, APPS_COLLECTION, app.id), app).catch(console.warn);
            });
            localStorage.setItem('kn_apps_seeded_once_v6', 'true');
            setApps(DEFAULT_APPS);
          } else {
            setApps([]);
            localStorage.setItem('kn_cached_apps', JSON.stringify([]));
          }
        }
      },
      (err) => console.warn('Firestore apps snapshot warning:', err)
    );

    // 2. Websites Listener (Deduplicated)
    const unsubWeb = onSnapshot(
      collection(db, WEBSITES_COLLECTION),
      (snap) => {
        if (!snap.empty) {
          const items: WebsiteItem[] = [];
          const seenIds = new Set<string>();
          const seenTitles = new Set<string>();

          snap.forEach((docSnap) => {
            const data = docSnap.data() as Omit<WebsiteItem, 'id'>;
            const normTitle = (data.title || '').trim().toLowerCase();
            if (!seenIds.has(docSnap.id) && !seenTitles.has(normTitle)) {
              seenIds.add(docSnap.id);
              seenTitles.add(normTitle);
              items.push({ id: docSnap.id, ...data });
            }
          });

          const finalList = items.length > 0 ? items : DEFAULT_WEBSITES;
          setWebsites(finalList);
          localStorage.setItem('kn_cached_websites', JSON.stringify(finalList));
        } else {
          if (!localStorage.getItem('kn_web_seeded_once_v6')) {
            DEFAULT_WEBSITES.forEach(async (web) => {
              await setDoc(doc(db, WEBSITES_COLLECTION, web.id), web).catch(console.warn);
            });
            localStorage.setItem('kn_web_seeded_once_v6', 'true');
            setWebsites(DEFAULT_WEBSITES);
          } else {
            setWebsites([]);
            localStorage.setItem('kn_cached_websites', JSON.stringify([]));
          }
        }
      },
      (err) => console.warn('Firestore websites snapshot warning:', err)
    );

    // 3. Skills Listener (Deduplicated by ID & normalized Name - Never double)
    const unsubSkills = onSnapshot(
      collection(db, SKILLS_COLLECTION),
      (snap) => {
        if (!snap.empty) {
          const items: SkillItem[] = [];
          const seenIds = new Set<string>();
          const seenNames = new Set<string>();

          snap.forEach((docSnap) => {
            const data = docSnap.data() as Omit<SkillItem, 'id'>;
            const normName = (data.name || '').trim().toLowerCase();
            if (!seenIds.has(docSnap.id) && !seenNames.has(normName)) {
              seenIds.add(docSnap.id);
              seenNames.add(normName);
              items.push({ id: docSnap.id, ...data });
            }
          });

          items.sort((a, b) => (a.order || 0) - (b.order || 0));
          const finalList = items.length > 0 ? items : DEFAULT_SKILLS;
          setSkills(finalList);
          localStorage.setItem('kn_cached_skills', JSON.stringify(finalList));
        } else {
          if (!localStorage.getItem('kn_skills_seeded_once_v6')) {
            DEFAULT_SKILLS.forEach(async (sk) => {
              await setDoc(doc(db, SKILLS_COLLECTION, sk.id), sk).catch(console.warn);
            });
            localStorage.setItem('kn_skills_seeded_once_v6', 'true');
            setSkills(DEFAULT_SKILLS);
          } else {
            setSkills([]);
            localStorage.setItem('kn_cached_skills', JSON.stringify([]));
          }
        }
      },
      (err) => console.warn('Firestore skills snapshot warning:', err)
    );

    // 4. Inquiries Listener
    const unsubInq = onSnapshot(
      collection(db, INQUIRIES_COLLECTION),
      (snap) => {
        const items: InquiryItem[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as Omit<InquiryItem, 'id'>) });
        });
        setInquiries(items);
      },
      (err) => console.warn('Firestore inquiries snapshot warning:', err)
    );

    return () => {
      unsubApps();
      unsubWeb();
      unsubSkills();
      unsubInq();
    };
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const toggleNeed = (item: string) => {
    if (selectedNeeds.includes(item)) {
      setSelectedNeeds(selectedNeeds.filter((n) => n !== item));
    } else {
      setSelectedNeeds([...selectedNeeds, item]);
    }
  };

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    setActiveSection(id);
    if (activeAppSlug) {
      navigateToHome();
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsAppChat = () => {
    window.location.href = WHATSAPP_URL;
  };

  const openMail = () => {
    window.location.href = MAILTO_URL;
  };

  // Submit Inquiry to Firestore
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !idea.trim()) return;

    setIsSavingInquiry(true);
    try {
      await addDoc(collection(db, INQUIRIES_COLLECTION), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || '',
        needs: selectedNeeds.join(', ') || 'Android App',
        idea: idea.trim(),
        createdAt: new Date().toLocaleDateString()
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit inquiry:', err);
      setIsSubmitted(true);
    } finally {
      setIsSavingInquiry(false);
    }
  };

  const steps = [
    { num: '1', title: 'Idea', desc: 'Tell us what you want to build.' },
    { num: '2', title: 'Design', desc: 'We shape the look and flow.' },
    { num: '3', title: 'Build', desc: 'We code it and test on real devices.' },
    { num: '4', title: 'Launch', desc: 'You get the live site or APK.' }
  ];

  const faqs = [
    {
      question: 'How long does an app take?',
      answer: 'Typically 1 to 4 weeks depending on the features and design complexity. We deliver milestones and test APKs weekly on real devices.'
    },
    {
      question: 'Can you publish it as an APK?',
      answer: 'Yes! We provide production signed APKs, Android App Bundles (.aab), and complete support for Google Play Store upload.'
    },
    {
      question: 'Do you work with clients abroad?',
      answer: 'Absolutely! We work 24/7 remotely with clients globally across all time zones via WhatsApp, Email, and Google Meet.'
    }
  ];

  // Filtered Apps for Search
  const filteredApps = apps.filter((app) =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.category && app.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ROUTE 1: ADMIN PANEL (Only when explicitly opened)
  if (isAdminView) {
    return (
      <AdminPanel
        apps={apps}
        websites={websites}
        skills={skills}
        inquiries={inquiries}
        onBack={navigateToHome}
        onRefresh={() => {}}
      />
    );
  }

  // ROUTE 2: DEDICATED APP LANDING PAGE (/app/:slug)
  if (activeAppSlug) {
    const matchedApp = apps.find((a) => getSlug(a.title) === activeAppSlug) || apps[0];
    if (matchedApp) {
      return (
        <AppDetailPage
          app={matchedApp}
          onBack={navigateToHome}
          whatsappUrl={WHATSAPP_URL}
        />
      );
    }
  }

  // ROUTE 3: MAIN LANDING PAGE
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-600 selection:text-white relative">
      
      {/* ===================== ELEVATED DISTINCT TOP BAR ===================== */}
      <header className="sticky top-0 z-40 bg-[#121217] border-b border-[#20212b] px-4 sm:px-8 py-3.5 backdrop-blur-md shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Left Brand: KN Builders (5 rapid clicks triggers secret owner admin) */}
          <div
            onClick={handleBrandClick}
            className="flex items-center gap-1.5 cursor-pointer select-none group"
            title="KN Builders"
          >
            <span className="text-2xl font-black tracking-tight text-[#3b82f6] group-hover:brightness-125 transition-all">
              KN
            </span>
            <span className="text-2xl font-black tracking-tight text-white">
              Builders
            </span>
          </div>

          {/* Right Action Icons: Real WhatsApp CTA + 3-Lines Menu */}
          <div className="flex items-center gap-2.5">
            {/* Real WhatsApp Quick Header Button */}
            <button
              onClick={openWhatsAppChat}
              title="Chat on WhatsApp"
              aria-label="Direct WhatsApp"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#16271c] hover:bg-[#1d3525] border border-[#25d366]/40 text-emerald-400 text-xs font-bold transition-all duration-300 hover:scale-[1.04] active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(37,211,102,0.3)]"
            >
              <WhatsAppLogo className="w-5 h-5 shrink-0" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* 3-Lines Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="w-10 h-10 rounded-2xl bg-[#1b1c26] hover:bg-[#242533] border border-[#2a2b3d] flex items-center justify-center text-white transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <Menu className="w-5 h-5 text-slate-200" />
            </button>
          </div>
        </div>
      </header>

      {/* ===================== 3-LINES NAVIGATION DRAWER (Exact Sequential Order) ===================== */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm transition-all">
          <div className="w-full max-w-xs sm:max-w-sm bg-[#0e0e14] border-l border-[#20202c] h-full flex flex-col justify-between p-6 shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-[#1f1f2a]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-blue-500">KN</span>
                  <span className="text-xl font-bold text-white">Builders</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#1c1c28] hover:bg-[#262636] flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu Links in EXACT visual top-to-bottom sequence of page */}
              <nav className="py-6 space-y-2">
                {NAV_SECTIONS.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'home') {
                          setIsMenuOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } else {
                          scrollToSection(item.id);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-base font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/25 text-blue-400 font-bold border-l-4 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                          : 'text-slate-300 hover:text-white hover:bg-[#181824]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    </button>
                  );
                })}

                {/* Admin Portal Direct Link */}
                <button
                  onClick={navigateToAdmin}
                  className="w-full text-left px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-[#181824] transition-all flex items-center justify-between cursor-pointer mt-3 border border-[#232330]"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" />
                    <span>Admin Panel (PIN: 2026)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </nav>
            </div>

            {/* Bottom: Chat on WhatsApp */}
            <div className="pt-4 border-t border-[#1f1f2a]">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  openWhatsAppChat();
                }}
                className="w-full py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1fb355] text-white font-bold text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-green-600/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <WhatsAppLogo className="w-5 h-5 shrink-0" />
                  <span>Chat on WhatsApp</span>
                </div>
                <span className="text-[11px] text-emerald-100 font-medium">⚡ Fastest reply</span>
              </button>
              <p className="text-[11px] text-center text-slate-500 mt-2">
                Direct: +91 {WHATSAPP_NUMBER}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MAIN CONTENT CONTAINER ===================== */}
      {/* 50/50 Split on Tablet & Desktop */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="md:grid md:grid-cols-12 md:gap-8 lg:gap-12 items-start">
          
          {/* ==================== LEFT COLUMN (DESKTOP & TABLET 50/50 SPLIT) ==================== */}
          <div id="home" className="md:col-span-5 lg:col-span-5 md:sticky md:top-24 space-y-7">
            
            {/* Status Badge */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#0f0f15] border border-[#22222e] text-slate-300 shadow-sm transition-all duration-300 hover:border-emerald-500/50">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a] inline-block shadow-[0_0_10px_#22c55e] animate-pulse" />
                <span>Open for new projects</span>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.12]">
                <span>Hello! Welcome</span>
                <br />
                <span>to </span>
                <span className="bg-gradient-to-r from-[#3b82f6] via-[#60a5fa] to-[#a855f7] bg-clip-text text-transparent">
                  KN Builders
                </span>
              </h1>
              <p className="text-base text-slate-400 font-normal pt-1.5 leading-relaxed">
                We design and build apps, websites and creative visuals, from idea to launch.
              </p>
            </div>

            {/* Primary Action Buttons: 50% / 50% Side-by-Side */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={openWhatsAppChat}
                className="w-full bg-[#25D366] hover:bg-[#1fb355] text-white font-bold py-3.5 px-3 sm:px-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)] active:scale-[0.98] cursor-pointer text-xs sm:text-sm text-center"
              >
                <WhatsAppLogo className="w-5 h-5 shrink-0" />
                <span className="truncate">Want an app?</span>
              </button>

              <button
                onClick={() => scrollToSection('apps-section')}
                className="w-full py-3.5 px-3 sm:px-5 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-[1.05] hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] cursor-pointer bg-[#0f0f15] hover:bg-[#161622] border border-[#22222e] text-slate-200 text-center flex items-center justify-center"
              >
                <span>See our work</span>
              </button>
            </div>

            {/* 3 Stat Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-[#0d0d12] border border-[#20202c] transition-all duration-300 hover:scale-[1.06] hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-3xl sm:text-4xl font-black text-[#38bdf8] tracking-tight">
                  {apps.length}
                </span>
                <span className="text-xs font-semibold text-slate-400 mt-1.5">Apps built</span>
              </div>

              <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-[#0d0d12] border border-[#20202c] transition-all duration-300 hover:scale-[1.06] hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-3xl sm:text-4xl font-black text-[#38bdf8] tracking-tight">
                  {websites.length}
                </span>
                <span className="text-xs font-semibold text-slate-400 mt-1.5">Websites</span>
              </div>

              <div className="rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-[#0d0d12] border border-[#20202c] transition-all duration-300 hover:scale-[1.06] hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-3xl sm:text-4xl font-black text-[#2563eb] tracking-tight">
                  24/7
                </span>
                <span className="text-xs font-semibold text-slate-400 mt-1.5">Remote</span>
              </div>
            </div>

            {/* ===================== SKILLS SECTION (Step 2 in sequence) ===================== */}
            <div id="skills-section" className="scroll-reveal-item space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">Skills</h2>
                <span className="text-xs text-blue-400 font-semibold">{skills.length} Technologies</span>
              </div>

              {/* 2-column Grid - deduplicated, will never double */}
              <div className="grid grid-cols-2 gap-3">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-4 rounded-2xl bg-[#0e0e14] border border-[#20202c] flex items-center gap-3 transition-all duration-300 hover:scale-[1.08] hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_0_25px_rgba(59,130,246,0.45)] cursor-pointer group select-none"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#161622] border border-[#262636] group-hover:border-blue-500/60 flex items-center justify-center shrink-0 transition-colors">
                      {getSkillIcon(skill.iconType, 'w-5 h-5')}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-blue-300 transition-colors">
                        {skill.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate">{skill.category || 'Development'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Services Guarantee Box */}
            <div className="p-4 rounded-2xl bg-[#09090f] border border-[#1b1b26] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Production Quality Guarantee</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tested on physical Android devices, high performance web stacks, clean code architecture and responsive across all screens.
              </p>
            </div>

          </div>

          {/* ==================== RIGHT COLUMN (DESKTOP & TABLET 50/50 SPLIT) ==================== */}
          <div className="md:col-span-7 lg:col-span-7 space-y-14 mt-12 md:mt-0">

            {/* ===================== APPS SECTION (Step 3 in sequence) ===================== */}
            <section
              id="apps-section"
              className="scroll-reveal-item space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Apps</h2>
                  <p className="text-xs text-slate-400">Mobile applications built and published by KN Builders</p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{apps.length} Apps</span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps & websites..."
                  className="w-full bg-[#0c0c12] border border-[#20202c] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all duration-300 hover:border-slate-700"
                />
              </div>

              {/* Production Showcase App Cards */}
              {filteredApps.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {filteredApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-5 rounded-2xl bg-[#0e0e15] border border-[#20202c] flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/80 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] group select-none"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={app.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
                          alt={app.title}
                          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-[#252535] group-hover:border-blue-400 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all shrink-0"
                        />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-base text-white truncate group-hover:text-blue-400 transition-colors">
                              {app.title}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold shrink-0">
                              {app.version || 'v1.0.0'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium block mt-0.5">{app.category || 'Android App'}</span>
                          <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                            {app.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-[#1e1e28] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[130px]">
                          {app.apkSize || '15 MB'} • Android App
                        </span>
                        <button
                          onClick={() => navigateToApp(app)}
                          className="px-3.5 py-2 rounded-xl bg-[#171724] hover:bg-blue-600 border border-[#2a2a3c] hover:border-blue-500 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-400 group-hover:text-white" />
                          <span>Download App</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-[#0a0a0f] border border-[#1b1b24] rounded-2xl">
                  <p className="text-sm font-medium text-slate-400">
                    {searchQuery ? `No apps matching "${searchQuery}"` : 'Apps coming soon.'}
                  </p>
                </div>
              )}
            </section>

            {/* ===================== WEBSITES SECTION (Step 4 in sequence) ===================== */}
            <section
              id="websites-section"
              className="scroll-reveal-item space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">Websites</h2>
                <span className="text-xs text-slate-400">{websites.length} Projects</span>
              </div>

              {websites.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {websites.map((web) => (
                    <div
                      key={web.id}
                      className="p-5 rounded-2xl bg-[#0e0e15] border border-[#20202c] flex flex-col justify-between transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 hover:border-blue-400 hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]"
                    >
                      <div>
                        <h3 className="font-bold text-base text-white">{web.title}</h3>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">{web.description}</p>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-[#1e1e2a] flex items-center justify-between gap-3">
                        <span className="text-xs text-blue-400 font-semibold px-2.5 py-1 rounded-lg bg-blue-600/10 border border-blue-500/20">{web.tags || 'Web App'}</span>
                        {web.liveUrl && (
                          <a
                            href={web.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                          >
                            <span>Visit Website</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-[#0a0a0f] border border-[#1b1b24] rounded-2xl">
                  <p className="text-sm font-medium text-slate-400">
                    Websites coming soon.
                  </p>
                </div>
              )}
            </section>

            {/* ===================== HOW WE WORK SECTION (Step 5 in sequence) ===================== */}
            <section
              id="how-we-work-section"
              className="scroll-reveal-item space-y-4"
            >
              <h2 className="text-2xl font-black tracking-tight">How we work</h2>

              <div className="space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.num}
                    className="rounded-2xl p-4.5 flex items-center gap-4 bg-[#0d0d12] border border-[#1f1f2c] transition-all duration-300 hover:scale-[1.03] hover:border-blue-400 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#2563eb] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
                      {step.num}
                    </div>

                    <div>
                      <h3 className="text-base font-bold tracking-tight">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ===================== FAQ SECTION (Step 6 in sequence) ===================== */}
            <section
              id="faq-section"
              className="scroll-reveal-item space-y-4"
            >
              <h2 className="text-2xl font-black tracking-tight">FAQ</h2>

              <div className="space-y-3">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div
                      key={index}
                      onClick={() => toggleFaq(index)}
                      className="rounded-2xl p-4 cursor-pointer bg-[#0d0d12] border border-[#1f1f2c] transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/70 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] select-none"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-400 font-bold">{isOpen ? '▼' : '▶'}</span>
                        <span className="text-sm sm:text-base font-semibold text-white">{faq.question}</span>
                      </div>

                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-[#1f1f2b] text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ===================== START A PROJECT / CONTACT SECTION (Step 7 in sequence) ===================== */}
            <section
              id="start-project"
              className="scroll-reveal-item space-y-4"
            >
              <h2 className="text-2xl font-black tracking-tight">Start a project</h2>

              <div className="rounded-3xl p-5 sm:p-7 space-y-6 bg-[#0d0d14] border border-[#1f1f2c] shadow-2xl">
                
                {/* Top Quick Actions: WhatsApp & 📧 Styled Mail */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Real WhatsApp Button with fastest reply subtext */}
                  <button
                    onClick={openWhatsAppChat}
                    type="button"
                    className="bg-[#25D366] hover:bg-[#1fb355] text-white p-4.5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md shadow-green-600/30 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)] active:scale-[0.98] cursor-pointer min-h-[96px]"
                  >
                    <WhatsAppLogo className="w-6 h-6 shrink-0" />
                    <span className="text-sm font-bold">WhatsApp</span>
                    <span className="text-[11px] text-emerald-100 font-medium">⚡ Fastest reply</span>
                  </button>

                  {/* 📧 Styled Mail Button */}
                  <button
                    onClick={openMail}
                    type="button"
                    title={`Send email to ${CONTACT_EMAIL}`}
                    className="p-4.5 rounded-2xl flex flex-col items-center justify-center gap-2 bg-[#14141c] hover:bg-[#1c1c28] border border-[#262636] text-white font-medium text-sm min-h-[96px] transition-all duration-300 hover:scale-[1.04] hover:border-blue-400 hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] active:scale-[0.98] cursor-pointer"
                  >
                    <EmailEnvelopeIcon className="w-6 h-6 shrink-0" />
                    <span className="text-sm font-bold">Send Mail</span>
                  </button>
                </div>

                {/* Submission Success Banner */}
                {isSubmitted && (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-sm space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Message sent & saved to database!
                    </div>
                    <p className="text-xs text-emerald-300/80">
                      Thank you, {name || 'there'}! We have received your inquiry for ({selectedNeeds.join(', ') || 'Project'}) and will contact you via WhatsApp or Email shortly.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="mt-2 text-xs underline font-semibold text-emerald-300 hover:text-emerald-200 cursor-pointer"
                    >
                      Send another message
                    </button>
                  </div>
                )}

                {/* Form Fields */}
                {!isSubmitted && (
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    {/* Your Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-slate-200">
                        Your name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex"
                        className="w-full rounded-2xl px-4 py-3.5 text-sm bg-[#09090e] border border-[#222230] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-slate-200">
                        Email *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full rounded-2xl px-4 py-3.5 text-sm bg-[#09090e] border border-[#222230] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* WhatsApp / Phone Number */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="phone" className="block text-xs sm:text-sm font-semibold text-slate-200">
                          WhatsApp / Phone number
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">(Optional for WhatsApp reply)</span>
                      </div>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 6377938441 or +91 9876543210"
                          className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm bg-[#09090e] border border-[#222230] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* What do you need? */}
                    <div className="space-y-2.5">
                      <label className="block text-xs sm:text-sm font-semibold text-slate-200">
                        What do you need?
                      </label>

                      {/* 2x2 grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {['Android App', 'Website', 'UI/UX Design', 'Art & Visuals'].map((item) => {
                          const isSelected = selectedNeeds.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleNeed(item)}
                              className={`py-3 px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-[1.03] cursor-pointer text-center whitespace-nowrap ${
                                isSelected
                                  ? 'bg-[#2563eb] text-white font-bold shadow-md shadow-blue-600/30 border border-blue-400'
                                  : 'bg-[#101018] border border-[#20202c] text-slate-300 hover:text-white hover:border-slate-600'
                              }`}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tell us about your idea */}
                    <div className="space-y-1.5">
                      <label htmlFor="idea" className="block text-xs sm:text-sm font-semibold text-slate-200">
                        Tell us about your idea *
                      </label>
                      <textarea
                        id="idea"
                        rows={4}
                        required
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="Describe your app or website..."
                        className="w-full rounded-2xl px-4 py-3.5 text-sm bg-[#09090e] border border-[#222230] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none transition-colors"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSavingInquiry}
                      className="w-full bg-gradient-to-r from-[#2563eb] via-[#4f46e5] to-[#8b5cf6] hover:from-[#1d4ed8] hover:to-[#7c3aed] text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-indigo-600/25 active:scale-[0.99] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-pointer text-center text-sm sm:text-base mt-2 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSavingInquiry ? 'Sending...' : 'Send message'}</span>
                    </button>
                  </form>
                )}
              </div>
            </section>

          </div>
        </div>

        {/* ===================== FOOTER ===================== */}
        <footer className="text-center pt-16 pb-8 border-t border-[#181822] mt-16 flex flex-col items-center justify-center gap-2">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            © 2026 KN Builders
          </p>
          <button
            onClick={navigateToAdmin}
            className="text-xs text-slate-600 hover:text-blue-400 transition-colors cursor-pointer"
          >
            Admin Login
          </button>
        </footer>
      </main>

      {/* ===================== FLOATING WHATSAPP FAB ===================== */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={openWhatsAppChat}
          type="button"
          title="Direct WhatsApp Chat"
          aria-label="Direct WhatsApp Chat"
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1fb355] text-white flex items-center justify-center shadow-[0_4px_28px_rgba(37,211,102,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          <WhatsAppLogo className="w-8 h-8" />
        </button>
      </div>

    </div>
  );
}
