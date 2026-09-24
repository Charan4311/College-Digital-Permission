import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowDown,
  FaBars,
  FaBriefcase,
  FaBuilding,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaFileAlt,
  FaHome,
  FaInfoCircle,
  FaListAlt,
  FaLock,
  FaSchool,
  FaShieldAlt,
  FaSignInAlt,
  FaTimes,
  FaUserGraduate,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';

const navItems = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Login', href: '/login' },
];

const features = [
  {
    icon: FaFileAlt,
    title: 'Digital Requests',
    description: 'Students can submit permission requests online without paperwork.',
  },
  {
    icon: FaCheckCircle,
    title: 'Easy Approval',
    description: 'Authorized staff can review, approve, or reject requests digitally.',
  },
  {
    icon: FaClock,
    title: 'Track Status',
    description: 'Students can easily track the current status of their requests.',
  },
  {
    icon: FaUsers,
    title: 'Centralized Management',
    description: 'Manage permission workflows across different departments and roles.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Submit Request',
    description: 'Students submit their permission request through the portal.',
  },
  {
    number: '02',
    title: 'Review & Approve',
    description: 'The appropriate authority reviews the request.',
  },
  {
    number: '03',
    title: 'Track Status',
    description: 'Students can track the request until the process is completed.',
  },
];

const roles = [
  {
    icon: FaUserGraduate,
    name: 'Student',
    description: 'Submit and track permission requests.',
  },
  {
    icon: FaClipboardList,
    name: 'CTPO',
    description: 'Review and manage permission requests.',
  },
  {
    icon: FaUserTie,
    name: 'HOD',
    description: 'Review department-level requests.',
  },
  {
    icon: FaShieldAlt,
    name: 'Admin',
    description: 'Manage the overall platform.',
  },
  {
    icon: FaBuilding,
    name: 'Hostel Incharge',
    description: 'Review hostel-related requests.',
  },
  {
    icon: FaBriefcase,
    name: 'Placement Officer',
    description: 'Manage internship-related requests.',
  },
  {
    icon: FaLock,
    name: 'Security',
    description: 'Verify approved permissions.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (href) => {
    if (href.startsWith('/')) {
      navigate(href);
      return;
    }

    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white shadow-sm">
              <FaSchool className="text-lg" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">Digital Permission</p>
              <p className="text-[11px] font-medium text-slate-500">College Approval Platform</p>
            </div>
          </button>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) =>
              item.href.startsWith('/') ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                >
                  {item.label}
                </button>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className="text-sm font-medium text-slate-600 transition hover:text-indigo-600"
                >
                  {item.label}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Login
            </button>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4">
              {navItems.map((item) =>
                item.href.startsWith('/') ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      navigate(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <span>{item.label}</span>
                    {item.label === 'Login' ? <FaSignInAlt /> : item.label === 'Home' ? <FaHome /> : <FaInfoCircle />}
                  </button>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleNavClick(item.href)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <span>{item.label}</span>
                    {item.label === 'Features' ? <FaListAlt /> : <FaInfoCircle />}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                Secure. Simple. Digital.
              </span>
              <h1 className="mt-6 max-w-xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                College Permissions, Simplified.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                Submit, review, approve, and track permission requests through one secure digital platform.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Get Started
                  <FaArrowDown className="rotate-[-90deg]" />
                </button>

                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  Learn More
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Secure workflow
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  Multi-role access
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Permission Request</p>
                    <p className="text-xs text-slate-500">Status overview</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Live
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    { label: 'Student', icon: FaUserGraduate, tone: 'bg-indigo-50 text-indigo-700' },
                    { label: 'Submitted', icon: FaFileAlt, tone: 'bg-sky-50 text-sky-700' },
                    { label: 'Under Review', icon: FaClipboardList, tone: 'bg-amber-50 text-amber-700' },
                    { label: 'Approved', icon: FaCheckCircle, tone: 'bg-emerald-50 text-emerald-700' },
                  ].map((step, index) => (
                    <div key={step.label}>
                      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.tone}`}>
                          <step.icon className="text-sm" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-700">{step.label}</p>
                        </div>
                        {index < 3 && <FaArrowDown className="text-slate-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Features</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Everything in One Place</h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="text-xl" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">How It Works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">How It Works</h2>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="text-sm font-bold tracking-[0.18em] text-indigo-600">{step.number}</div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Access</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Built for Every Role</h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {roles.map(({ icon: Icon, name, description }) => (
              <div
                key={name}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon className="text-lg" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-indigo-100 bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-white shadow-[0_20px_50px_rgba(79,70,229,0.22)] sm:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold tracking-tight">Ready to manage permissions digitally?</h2>
                <p className="mt-3 text-base text-indigo-100">
                  Access the College Digital Permission Portal and manage your requests in one place.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-slate-100"
              >
                Login to Portal
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900">Digital Permission</p>
            <p className="text-sm text-slate-500">College Approval Platform</p>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-600">
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="transition hover:text-indigo-600">
              Home
            </button>
            <button type="button" onClick={() => navigate('/login')} className="transition hover:text-indigo-600">
              Login
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
            © 2026 College Digital Permission Portal
          </div>
        </div>
      </footer>
    </div>
  );
}
