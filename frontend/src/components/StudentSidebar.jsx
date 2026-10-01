import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  LogOut,
  X,
} from "lucide-react";

const STUDENT_NAV = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    path: "/student/dashboard",
  },
  {
    label: "New Permission",
    icon: FileText,
    path: "/student/new-permission",
  },
  {
    label: "My Requests",
    icon: ClipboardList,
    path: "/student/my-request",
  },
  {
    label: "My Profile",
    icon: Users,
    path: "/student/profile",
  },
];

export default function StudentSidebar({ isOpen = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.name
    ? user.name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    : "U";

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`s-sidebar-backdrop${isOpen ? " open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`s-sidebar${isOpen ? " open" : ""}`}>

        {/* =========================
            KIET BRAND
        ========================== */}
        <div className="s-sidebar-brand">
          <div className="s-brand-inner">

            <img
              src="/kiet_logo.jpg"
              alt="KIET"
              className="s-brand-logo-img"
              style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

          </div>

          <button
            className="s-sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>


        {/* =========================
            NAVIGATION
        ========================== */}
        <nav className="s-sidebar-nav">

          {STUDENT_NAV.map((item) => {
            const Icon = item.icon;

            const isActive =
              location.pathname === item.path ||
              (
                item.path === "/student/dashboard" &&
                location.pathname === "/student/dashboard/"
              );

            return (
              <button
                key={item.path}
                type="button"
                className={`s-nav-item${isActive ? " active" : ""}`}
                onClick={() => handleNav(item.path)}
              >
                <span className="s-nav-icon">
                  <Icon size={16} strokeWidth={2} />
                </span>

                <span className="s-nav-text">
                  {item.label}
                </span>
              </button>
            );
          })}

        </nav>


        {/* =========================
            USER
        ========================== */}
        <div className="s-sidebar-user">

          <div className="s-user-avatar">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name || "Student"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="s-user-info">

            <div
              className="s-user-name"
              title={user?.name || "Student"}
            >
              {user?.name || "Student"}
            </div>

            <div className="s-user-role">
              Student
            </div>

          </div>

          <button
            type="button"
            className="s-logout-btn"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={15} />
          </button>

        </div>

      </aside>
    </>
  );
}