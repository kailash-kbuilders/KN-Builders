/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  Shield,
  Smartphone,
  Calendar,
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { WhatsAppLogo } from './Icons';
import { AppItem } from '../firebase';

interface AppDetailPageProps {
  app: AppItem;
  onBack: () => void;
  whatsappUrl: string;
}

export default function AppDetailPage({ app, onBack, whatsappUrl }: AppDetailPageProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${app.title} - Download APK by KN Builders`,
        text: `Download ${app.title} APK developed by KN Builders:`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const handleDownloadApk = () => {
    if (app.apkUrl && app.apkUrl !== '#' && app.apkUrl.trim() !== '') {
      window.location.href = app.apkUrl;
    } else {
      setDownloadToast(`APK download link for ${app.title} will open in WhatsApp!`);
      setTimeout(() => {
        window.location.href = whatsappUrl;
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-600 selection:text-white pb-20">
      {/* Toast Notification */}
      {downloadToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#16a34a] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-green-400 text-sm font-semibold animate-pulse">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#121217] border-b border-[#20212b] px-4 sm:px-8 py-3.5 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-blue-500" />
            <span>Back to KN Builders</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1b1c26] hover:bg-[#252636] border border-[#2a2b3d] text-xs font-semibold text-slate-300 cursor-pointer transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 space-y-8">
        {/* App Hero Section */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0d14] border border-[#1f1f2c] shadow-2xl relative overflow-hidden">
          {/* Subtle gradient glow in background */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
            {/* App Icon */}
            <img
              src={app.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
              alt={app.title}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-[#2b2b3d] shadow-xl shrink-0"
            />

            {/* Info & CTAs */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  {app.category || 'Android App'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {app.version || 'v1.0.0'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Safe & Verified
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {app.title}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400">
                Developed & Maintained by <span className="text-blue-400 font-bold">KN Builders</span>
              </p>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleDownloadApk}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1fb355] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-green-600/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>Download APK ({app.apkSize || '18 MB'})</span>
                </button>

                <a
                  href={`${whatsappUrl}%20-%20Regarding%20${encodeURIComponent(app.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-[#171722] hover:bg-[#20202e] border border-[#2b2b3d] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <WhatsAppLogo className="w-4 h-4" />
                  <span>Ask Dev on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#0e0e15] border border-[#20202c] text-center">
            <Smartphone className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-400 block">Platform</span>
            <span className="text-sm font-bold text-white">Android 7.0+</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e0e15] border border-[#20202c] text-center">
            <FileCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-400 block">File Size</span>
            <span className="text-sm font-bold text-white">{app.apkSize || '18 MB'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e0e15] border border-[#20202c] text-center">
            <Calendar className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-400 block">Updated</span>
            <span className="text-sm font-bold text-white">{app.createdAt || 'Recent'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e0e15] border border-[#20202c] text-center">
            <Shield className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
            <span className="text-[11px] text-slate-400 block">Malware Scan</span>
            <span className="text-sm font-bold text-emerald-400">100% Clean</span>
          </div>
        </div>

        {/* Screenshots Gallery (Play Store Style) */}
        {app.screenshots && app.screenshots.trim() !== '' ? (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Screenshots</span>
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
              {app.screenshots
                .split(',')
                .map((url) => url.trim())
                .filter(Boolean)
                .map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={`${app.title} preview ${idx + 1}`}
                    className="h-64 sm:h-72 w-auto max-w-[220px] object-cover rounded-2xl border border-[#2a2a3c] shadow-lg snap-start shrink-0 hover:scale-[1.02] transition-transform"
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Screenshots</span>
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x">
              {/* Default clean phone preview mockups if no custom screenshots added yet */}
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className="h-60 sm:h-64 w-36 sm:w-40 rounded-2xl bg-[#12121a] border border-[#252536] p-3 flex flex-col justify-between shrink-0 snap-start shadow-md"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-3/4 bg-slate-800 rounded-full" />
                    <div className="h-2 w-1/2 bg-slate-800 rounded-full" />
                    <div className="h-2 w-full bg-slate-800 rounded-full" />
                  </div>
                  <span className="text-[10px] text-slate-500 text-center font-mono">Screen 0{num}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="p-6 rounded-3xl bg-[#0e0e15] border border-[#20202c] space-y-4">
          <h2 className="text-xl font-bold text-white">About this App</h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {app.description || 'Custom crafted high-performance Android application built with clean UI/UX and real-time backend synchronization.'}
          </p>

          <div className="pt-2 border-t border-[#1f1f2c] flex items-center justify-between text-xs text-slate-400">
            <span>Package Name:</span>
            <span className="font-mono text-slate-200">{app.apkFileName || `${app.title.toLowerCase().replace(/\s+/g, '.')}.apk`}</span>
          </div>
        </div>

        {/* Installation Guide Accordion */}
        <div className="rounded-2xl bg-[#0e0e15] border border-[#20202c] overflow-hidden">
          <button
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            className="w-full p-4 flex items-center justify-between text-left font-bold text-sm text-slate-200 hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-400">💡</span>
              <span>How to install this APK on your Android device?</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showInstallGuide ? 'rotate-180' : ''}`} />
          </button>

          {showInstallGuide && (
            <div className="px-5 pb-5 pt-1 text-xs text-slate-300 space-y-2 border-t border-[#1b1b26]">
              <p>1. Tap the green <strong>"Download APK"</strong> button above.</p>
              <p>2. Once the download completes, tap the file in your notification bar or Downloads folder.</p>
              <p>3. If your browser asks for permission to <em>"Install unknown apps"</em>, toggle it to <strong>Allow</strong>.</p>
              <p>4. Tap <strong>Install</strong> and enjoy the app!</p>
            </div>
          )}
        </div>

        {/* Order Custom App Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Want a custom app like this for your business?</h3>
            <p className="text-xs text-slate-300 mt-1">We build and launch Android apps & websites from idea to APK within 1-2 weeks.</p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-2xl bg-[#25D366] hover:bg-[#1fb355] text-white font-bold text-xs sm:text-sm shrink-0 flex items-center gap-2 shadow-lg shadow-green-600/30"
          >
            <WhatsAppLogo className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </main>
    </div>
  );
}
