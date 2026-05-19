const fs = require('fs');

const indexHtml = 'c:/Coding/Vibecoding/Dashboard/index.html';
const viteConfig = 'c:/Coding/Vibecoding/Dashboard/vite.config.ts';
const layoutFile = 'c:/Coding/Vibecoding/Dashboard/src/components/Layout.tsx';
const topHeaderFile = 'c:/Coding/Vibecoding/Dashboard/src/components/TopHeader.tsx';
const sidebarFile = 'c:/Coding/Vibecoding/Dashboard/src/components/Sidebar.tsx';
const onboardingFile = 'c:/Coding/Vibecoding/Dashboard/src/components/Onboarding.tsx';

// ----------------------------------------------------------------------
// 1. UPDATE INDEX.HTML
// ----------------------------------------------------------------------
if (fs.existsSync(indexHtml)) {
  let content = fs.readFileSync(indexHtml, 'utf8').replace(/\r\n/g, '\n');
  content = content.replace(/content="Aura OS"/g, 'content="MANI OS"');
  content = content.replace(/Aura OS — Premium Productivity/g, 'MANI OS — Premium Productivity');
  content = content.replace(/<title>Aura OS — Elite Dashboard<\/title>/g, '<title>MANI OS — Elite Dashboard</title>');
  fs.writeFileSync(indexHtml, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated index.html to MANI OS!');
}

// ----------------------------------------------------------------------
// 2. UPDATE VITE.CONFIG.TS
// ----------------------------------------------------------------------
if (fs.existsSync(viteConfig)) {
  let content = fs.readFileSync(viteConfig, 'utf8').replace(/\r\n/g, '\n');
  content = content.replace(/name: 'Aura OS — Premium Productivity',/g, "name: 'MANI OS — Premium Productivity',");
  content = content.replace(/short_name: 'Aura OS',/g, "short_name: 'MANI OS',");
  fs.writeFileSync(viteConfig, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated vite.config.ts manifest values!');
}

// ----------------------------------------------------------------------
// 3. UPDATE TOPHEADER.TSX
// ----------------------------------------------------------------------
if (fs.existsSync(topHeaderFile)) {
  let content = fs.readFileSync(topHeaderFile, 'utf8').replace(/\r\n/g, '\n');
  content = content.replace(/case '\/': return 'Aura OS';/g, "case '/': return 'MANI OS';");
  content = content.replace(/default: return 'Aura OS';/g, "default: return 'MANI OS';");
  fs.writeFileSync(topHeaderFile, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated TopHeader.tsx to MANI OS!');
}

// ----------------------------------------------------------------------
// 4. UPDATE SIDEBAR.TSX
// ----------------------------------------------------------------------
if (fs.existsSync(sidebarFile)) {
  let content = fs.readFileSync(sidebarFile, 'utf8').replace(/\r\n/g, '\n');
  content = content.replace(/<div className="font-bold text-sm tracking-tight text-white leading-tight">Aura OS<\/div>/g, '<div className="font-bold text-sm tracking-tight text-white leading-tight">MANI OS</div>');
  fs.writeFileSync(sidebarFile, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated Sidebar.tsx branding!');
}

// ----------------------------------------------------------------------
// 5. UPDATE ONBOARDING.TSX
// ----------------------------------------------------------------------
if (fs.existsSync(onboardingFile)) {
  let content = fs.readFileSync(onboardingFile, 'utf8').replace(/\r\n/g, '\n');
  content = content.replace(/title: 'Welcome to Aura OS',/g, "title: 'Welcome to MANI OS',");
  fs.writeFileSync(onboardingFile, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated Onboarding.tsx welcome text!');
}

// ----------------------------------------------------------------------
// 6. UPDATE LAYOUT.TSX: MANAGE DISSIMAL PERSISTENCE & RENAME
// ----------------------------------------------------------------------
if (fs.existsSync(layoutFile)) {
  let content = fs.readFileSync(layoutFile, 'utf8').replace(/\r\n/g, '\n');

  // A. Rename banner header to MANI OS Mobile
  content = content.replace(/Aura OS Mobile/g, 'MANI OS Mobile');

  // B. Inject persistence check into initial load useEffect
  const oldUseEffect = `    // Check if already installed / running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone) {
        setShowPWAInstall(true);
      }
    };`;

  const newUseEffect = `    // If closed permanently, never show again
    if (localStorage.getItem('pwa_installed_closed')) {
      setShowPWAInstall(false);
      return;
    }

    // Check if already installed / running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!standalone && !localStorage.getItem('pwa_installed_closed')) {
        setShowPWAInstall(true);
      }
    };`;

  if (content.includes(oldUseEffect)) {
    content = content.replace(oldUseEffect, newUseEffect);
  }

  // C. Update install and close actions to record dismissal in localStorage
  const oldInstallClick = `  const handlePWAInstallClick = async () => {
    play('click');
    if (isIOS) return;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPWAInstall(false);
  };`;

  const newInstallClick = `  const handlePWAInstallClick = async () => {
    play('click');
    localStorage.setItem('pwa_installed_closed', 'true');
    if (isIOS) return;
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPWAInstall(false);
  };

  const handleAlreadyInstalledClick = () => {
    play('success');
    localStorage.setItem('pwa_installed_closed', 'true');
    setShowPWAInstall(false);
  };`;

  if (content.includes(oldInstallClick)) {
    content = content.replace(oldInstallClick, newInstallClick);
  }

  const oldCloseClick = `  const handlePWAClose = () => {
    play('click');
    setShowPWAInstall(false);
    if (isIOS) {
      localStorage.setItem('ios_pwa_prompt_closed', 'true');
    }
  };`;

  const newCloseClick = `  const handlePWAClose = () => {
    play('click');
    localStorage.setItem('pwa_installed_closed', 'true');
    setShowPWAInstall(false);
    if (isIOS) {
      localStorage.setItem('ios_pwa_prompt_closed', 'true');
    }
  };`;

  if (content.includes(oldCloseClick)) {
    content = content.replace(oldCloseClick, newCloseClick);
  }

  // D. Render "Already Installed" secondary button in banner JSX
  const oldBannerButtons = `            <div className="flex items-center gap-2 flex-shrink-0">
              {!isIOS && (
                <button
                  onClick={handlePWAInstallClick}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-2xs uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 transition-all"
                >
                  Install
                </button>
              )}
              <button
                onClick={handlePWAClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>`;

  const newBannerButtons = `            <div className="flex items-center gap-2 flex-shrink-0">
              {!isIOS && (
                <>
                  <button
                    onClick={handleAlreadyInstalledClick}
                    className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold text-[9px] uppercase tracking-wider transition-all"
                  >
                    Already Installed
                  </button>
                  <button
                    onClick={handlePWAInstallClick}
                    className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 transition-all"
                  >
                    Install
                  </button>
                </>
              )}
              {isIOS && (
                <button
                  onClick={handleAlreadyInstalledClick}
                  className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-bold text-[9px] uppercase tracking-wider transition-all"
                >
                  Dismiss
                </button>
              )}
              <button
                onClick={handlePWAClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>`;

  if (content.includes(oldBannerButtons)) {
    content = content.replace(oldBannerButtons, newBannerButtons);
  }

  fs.writeFileSync(layoutFile, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully completed Layout.tsx persistent dismissal and renaming changes!');
}

console.log('Completed all app renaming automation tasks successfully!');
