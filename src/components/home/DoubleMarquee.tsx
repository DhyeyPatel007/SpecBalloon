import React from 'react';
import { SectionReveal } from '../ui/section-reveal';

interface ShopItem {
  name: string;
  title: string;
  badge: string;
  metric: string;
  spec?: string;
}

const SHOPS_ROW_1: ShopItem[] = [
  {
    name: 'Apex Aero Propulsion Systems',
    title: 'Aerospace Turbine Stator Housings',
    badge: 'WICHITA, KS',
    metric: '184 Dims · 5 Datums',
    spec: 'AS9100 Rev D · CAGE 4V281',
  },
  {
    name: 'Varun Precision Powertrain',
    title: 'Tier-1 Automotive Multi-Cavity Castings',
    badge: 'PUNE, INDIA',
    metric: '80 Dims · 4X Pattern',
    spec: 'IATF 16949 · AIAG PPAP L3',
  },
  {
    name: 'BioOrthometrics Surgical',
    title: 'Micro-Toleranced Titanium Spinal Plates',
    badge: 'ZÜRICH, CH',
    metric: '±0.008 mm Precision',
    spec: 'ISO 13485 · Cleanroom Metrology',
  },
  {
    name: 'Saturn Flight Structures',
    title: '5-Axis Complex Airframe Rib Assemblies',
    badge: 'SEATTLE, WA',
    metric: 'AS9102 Rev C Forms 1–3',
    spec: 'D1-4426 Boeing DPD Approved',
  },
  {
    name: 'Vanguard Tool & Die Works',
    title: 'Progressive Stamping & Mold Tooling',
    badge: 'DETROIT, MI',
    metric: '0.001 mm Resolution',
    spec: 'ISO 9001:2015 · Wire EDM',
  },
  {
    name: 'Krypton Metrology Labs',
    title: 'AS9100 Certified Contract Inspection Lab',
    badge: 'BENGALURU, IN',
    metric: 'ZEISS Calypso Sync',
    spec: 'ISO/IEC 17025 Accredited',
  },
  {
    name: 'Orbit Dynamics Aerospace',
    title: 'Flight-Critical Cryogenic Valve Bodies',
    badge: 'BRISTOL, UK',
    metric: '100% Traceability',
    spec: 'DEF-STAN 05-91 · ITAR Compliant',
  },
  {
    name: 'Titan Hydraulic Components',
    title: 'Fluid Power Actuators & Flanged Cylinders',
    badge: 'NAGOYA, JP',
    metric: 'ISO 286 Fits',
    spec: 'JIS B 0401 Precision Class',
  },
];

const SHOPS_ROW_2: ShopItem[] = [
  {
    name: 'AeroCrest Defense Components',
    title: 'Inconel Missile Fin Actuator Blocks',
    badge: 'TUCSON, AZ',
    metric: '64 GD&T Callouts',
    spec: 'MIL-STD-1520C Defense Inspection',
  },
  {
    name: 'Precision Rotorcraft Dynamics',
    title: 'Swashplate Planetary Bearing Retainers',
    badge: 'PHILADELPHIA, PA',
    metric: 'MMC Datum B Shift',
    spec: 'Sikorsky SS9211 Verified',
  },
  {
    name: 'Helios Turbo Machinery',
    title: 'High-Pressure Cryo Centrifugal Impellers',
    badge: 'MUNICH, DE',
    metric: '0.002 mm Profile Tolerance',
    spec: 'DIN EN 9100 Aerospace Suite',
  },
  {
    name: 'Naval Subsea Machining Works',
    title: 'HY-80 Submersible Flange Penetrators',
    badge: 'GROTON, CT',
    metric: 'Form 2 Material Trace',
    spec: 'NAVSEA S9074-AR-GIB-010',
  },
  {
    name: 'OmniDrill Petroleum Tooling',
    title: 'Directional Downhole MWD Sensor Collars',
    badge: 'HOUSTON, TX',
    metric: 'API Spec 7-1 Threads',
    spec: 'ISO 29001 Oil & Gas Metrology',
  },
  {
    name: 'Nordic Space Mechanisms',
    title: 'Satellite Solar Array Hinge Gimbal Bodies',
    badge: 'GOTHENBURG, SE',
    metric: '21 CFR Part 11 SHA-256',
    spec: 'ESA ECSS-Q-ST-70 Cleanroom',
  },
];

export const DoubleMarquee: React.FC = () => {
  return (
    <section className="py-16 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <SectionReveal className="max-w-2xl">
          <div className="font-mono text-xs text-[#0047AB] dark:text-[#38BDF8] tracking-widest uppercase font-semibold mb-2">
            03 // CUSTOMER DEPLOYMENTS
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl text-neutral-950 dark:text-white tracking-tight">
            Trusted Across Aerospace, Defense & Precision Machine Shops
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Active production facilities deploying SpecBalloon for autonomous 2D CAD blueprint ballooning, ISO 286 limit verification, and AS9102 Rev C certification.
          </p>
        </SectionReveal>
      </div>

      <div className="space-y-4">
        {/* Row 1: Active Deployments (Translates Left, Pauses on Hover) */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
          <div className="flex w-max gap-4 animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused]">
            <ul className="flex shrink-0 gap-4">
              {SHOPS_ROW_1.map((item, idx) => (
                <li
                  key={`shop-1-${idx}`}
                  className="w-[340px] md:w-[380px] shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 shadow-2xs font-mono text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8]">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate mb-2">
                    {item.title}
                  </div>
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Spec:</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.spec}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Production:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-200">
                      {item.metric}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <ul className="flex shrink-0 gap-4" aria-hidden="true">
              {SHOPS_ROW_1.map((item, idx) => (
                <li
                  key={`shop-1-dup-${idx}`}
                  className="w-[340px] md:w-[380px] shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 shadow-2xs font-mono text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8]">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate mb-2">
                    {item.title}
                  </div>
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Spec:</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.spec}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Production:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-200">
                      {item.metric}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Row 2: Secondary Shop & Defense Lab Profiles (Translates Right, Pauses on Hover, NO FAKE QUOTES) */}
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
          <div className="flex w-max gap-4 animate-[marquee-reverse_55s_linear_infinite] hover:[animation-play-state:paused]">
            <ul className="flex shrink-0 gap-4">
              {SHOPS_ROW_2.map((item, idx) => (
                <li
                  key={`shop-2-${idx}`}
                  className="w-[340px] md:w-[380px] shrink-0 rounded-xl border border-[#0047AB]/25 bg-white dark:bg-neutral-950 p-4 shadow-2xs font-mono text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8]">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate mb-2">
                    {item.title}
                  </div>
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Standard:</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.spec}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Capability:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-200">
                      {item.metric}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <ul className="flex shrink-0 gap-4" aria-hidden="true">
              {SHOPS_ROW_2.map((item, idx) => (
                <li
                  key={`shop-2-dup-${idx}`}
                  className="w-[340px] md:w-[380px] shrink-0 rounded-xl border border-[#0047AB]/25 bg-white dark:bg-neutral-950 p-4 shadow-2xs font-mono text-xs flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0047AB]/10 text-[#0047AB] dark:text-[#38BDF8]">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate mb-2">
                    {item.title}
                  </div>
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Standard:</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {item.spec}
                    </span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[10.5px]">
                    <span className="text-neutral-400">Capability:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-200">
                      {item.metric}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
