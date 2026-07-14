const encodeSvg = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const dashboardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760">
  <rect width="1280" height="760" fill="#0f172a"/>
  <rect x="40" y="40" width="1200" height="680" rx="28" fill="#111827"/>
  <rect x="80" y="84" width="240" height="592" rx="18" fill="#020617"/>
  <rect x="360" y="84" width="840" height="96" rx="18" fill="#1f2937"/>
  <rect x="360" y="220" width="250" height="150" rx="18" fill="#1f2937"/>
  <rect x="650" y="220" width="250" height="150" rx="18" fill="#1f2937"/>
  <rect x="940" y="220" width="260" height="150" rx="18" fill="#1f2937"/>
  <rect x="360" y="410" width="520" height="266" rx="18" fill="#1f2937"/>
  <rect x="920" y="410" width="280" height="266" rx="18" fill="#1f2937"/>
  <circle cx="116" cy="124" r="16" fill="#7ed444"/>
  <rect x="144" y="112" width="120" height="24" rx="12" fill="#334155"/>
  <rect x="104" y="196" width="164" height="16" rx="8" fill="#334155"/>
  <rect x="104" y="244" width="136" height="16" rx="8" fill="#334155"/>
  <rect x="104" y="292" width="152" height="16" rx="8" fill="#334155"/>
  <rect x="400" y="118" width="260" height="22" rx="11" fill="#7ed444"/>
  <rect x="400" y="254" width="120" height="22" rx="11" fill="#64748b"/>
  <rect x="690" y="254" width="120" height="22" rx="11" fill="#64748b"/>
  <rect x="980" y="254" width="120" height="22" rx="11" fill="#64748b"/>
  <path d="M406 612C476 520 548 554 612 492C676 430 756 456 838 338" fill="none" stroke="#7ed444" stroke-width="14" stroke-linecap="round"/>
  <text x="400" y="160" fill="#e5e7eb" font-family="Arial, sans-serif" font-size="24" font-weight="700">App Template Dashboard</text>
</svg>`;

const dashboardLightSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760">
  <rect width="1280" height="760" fill="#f8fafc"/>
  <rect x="40" y="40" width="1200" height="680" rx="28" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="80" y="84" width="240" height="592" rx="18" fill="#f1f5f9"/>
  <rect x="360" y="84" width="840" height="96" rx="18" fill="#f8fafc" stroke="#e2e8f0"/>
  <rect x="360" y="220" width="250" height="150" rx="18" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="650" y="220" width="250" height="150" rx="18" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="940" y="220" width="260" height="150" rx="18" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="360" y="410" width="520" height="266" rx="18" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="920" y="410" width="280" height="266" rx="18" fill="#ffffff" stroke="#e2e8f0"/>
  <circle cx="116" cy="124" r="16" fill="#65a30d"/>
  <rect x="144" y="112" width="120" height="24" rx="12" fill="#cbd5e1"/>
  <rect x="104" y="196" width="164" height="16" rx="8" fill="#cbd5e1"/>
  <rect x="104" y="244" width="136" height="16" rx="8" fill="#cbd5e1"/>
  <rect x="104" y="292" width="152" height="16" rx="8" fill="#cbd5e1"/>
  <rect x="400" y="118" width="260" height="22" rx="11" fill="#65a30d"/>
  <rect x="400" y="254" width="120" height="22" rx="11" fill="#94a3b8"/>
  <rect x="690" y="254" width="120" height="22" rx="11" fill="#94a3b8"/>
  <rect x="980" y="254" width="120" height="22" rx="11" fill="#94a3b8"/>
  <path d="M406 612C476 520 548 554 612 492C676 430 756 456 838 338" fill="none" stroke="#65a30d" stroke-width="14" stroke-linecap="round"/>
  <text x="400" y="160" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">App Template Dashboard</text>
</svg>`;

export const dashboardFallback = encodeSvg(dashboardSvg);
export const dashboardLightFallback = encodeSvg(dashboardLightSvg);
