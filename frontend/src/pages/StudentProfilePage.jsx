import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import StudentLayout from "../components/StudentLayout";
import api from "../lib/api";
import {
  Camera, User, Building2, GraduationCap, Lock,
  UploadCloud, AlertCircle, CheckCircle2, Trash2, ShieldCheck, IdCard
} from "lucide-react";

const COLLEGE_NAME = "Kakinada Institute of Engineering and Technology";

const buildImageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api$/, "");
  return base + path;
};

export default function StudentProfilePage() {
  const { user, refreshUser, updateUser } = useAuth();
  const [loading,          setLoading]          = useState(true);
  const [savingPassword,   setSavingPassword]   = useState(false);
  const [uploadingImage,   setUploadingImage]   = useState(false);
  const [localProfileImage,setLocalProfileImage]= useState("");
  const [profileMessage,   setProfileMessage]   = useState("");
  const [profileError,     setProfileError]     = useState("");
  const [passwordMessage,  setPasswordMessage]  = useState("");
  const [passwordError,    setPasswordError]    = useState("");
  const [showImageMenu,    setShowImageMenu]    = useState(false);

  const [profileForm,  setProfileForm]  = useState({ name:"", year:"", yearTier:"TIER_4TH" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });

  const profileImage = useMemo(() => {
    if (localProfileImage) return localProfileImage;
    return buildImageUrl(user?.profileImage || "");
  }, [localProfileImage, user?.profileImage]);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || "", year: user.year || "", yearTier: user.yearTier || "TIER_4TH" });
      setLocalProfileImage(buildImageUrl(user.profileImage || ""));
    }
    setLoading(false);
  }, [user]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(""); setPasswordMessage(""); setSavingPassword(true);
    try {
      await api.patch("/auth/password", passwordForm);
      setPasswordMessage("Password updated successfully.");
      setPasswordForm({ currentPassword:"", newPassword:"", confirmPassword:"" });
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to update password.");
    } finally { setSavingPassword(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    setUploadingImage(true); setProfileError(""); setProfileMessage("");
    try {
      const res = await api.post("/auth/profile-image", fd, { headers: { "Content-Type":"multipart/form-data" } });
      await refreshUser();
      setLocalProfileImage(buildImageUrl(res.data.fileUrl || user?.profileImage || ""));
      setProfileMessage("Profile image updated successfully.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Image upload failed.");
    } finally { setUploadingImage(false); e.target.value = ""; }
  };

  const handleDeleteImage = async () => {
    try {
      setLocalProfileImage("");
      updateUser(cu => cu ? { ...cu, profileImage:"" } : cu);
      setProfileMessage("Profile image deleted successfully."); setProfileError("");
      await api.delete("/auth/profile-image");
      await refreshUser();
    } catch (err) {
      setProfileError(err.response?.data?.message || "Failed to delete profile image.");
      setProfileMessage("");
    }
  };

  if (loading) {
    return (
      <StudentLayout pageTitle="My Profile" pageSubtitle="Student account and profile details">
        <div className="s-loading"><div className="s-spinner" /></div>
      </StudentLayout>
    );
  }

  const initials          = user?.name ? user.name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0,2).toUpperCase() : "U";
  const displayBranch     = user?.branchName || user?.branchId?.name || "N/A";
  const rollNumber        = user?.rollNo || user?.username || "N/A";

  return (
    <StudentLayout pageTitle="My Profile" pageSubtitle="Student account and profile details">
      <div className="s-profile-grid">

        {/* ── LEFT CARD ── */}
        <div className="s-profile-left-card">

          {/* Blue gradient hero */}
          <div className="s-profile-hero">
            <div className="s-avatar-wrap" onClick={() => setShowImageMenu(!showImageMenu)}>
              <div className="s-avatar-circle">
                {profileImage
                  ? <img src={profileImage} alt="Profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <span>{initials}</span>}
              </div>
              <div className="s-avatar-cam"><Camera size={13} color="#10b981" /></div>

              {showImageMenu && (
                <div style={{ position:"absolute", top:"96px", left:"50%", transform:"translateX(-50%)", background:"#fff", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"8px", boxShadow:"0 12px 28px rgba(0,0,0,.12)", zIndex:20, minWidth:"160px", whiteSpace:"nowrap" }}>
                  <label style={{ display:"flex", alignItems:"center", gap:"8px", padding:"9px 12px", fontSize:"13px", fontWeight:600, color:"#334155", cursor:"pointer", borderRadius:"8px" }}>
                    <UploadCloud size={14} /> Upload Image
                    <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => { setShowImageMenu(false); handleImageUpload(e); }} />
                  </label>
                  {profileImage && (
                    <div onClick={() => { setShowImageMenu(false); handleDeleteImage(); }} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"9px 12px", fontSize:"13px", fontWeight:600, color:"#dc2626", cursor:"pointer", borderRadius:"8px" }}>
                      <Trash2 size={14} /> Delete Image
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="s-profile-name">{user?.name || "Student"}</div>
            <div className="s-profile-roll">{rollNumber}</div>
          </div>

          {/* Info list */}
          <div className="s-profile-info-list">
            {[
              { icon:<IdCard    size={14} color="#10b981" />, label:"Roll Number", value:rollNumber         },
              { icon:<Building2 size={14} color="#10b981" />, label:"Branch",      value:displayBranch      },
              { icon:<GraduationCap size={14} color="#10b981" />, label:"College", value:COLLEGE_NAME       },
            ].map(item => (
              <div key={item.label} className="s-profile-info-item">
                <span className="s-profile-info-icon">{item.icon}</span>
                <div>
                  <div className="s-profile-info-label">{item.label}</div>
                  <div className="s-profile-info-value">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT STACK ── */}
        <div className="s-profile-right-stack">

          {/* Personal Information */}
          <div className="s-section-card">
            <div className="s-section-card-head">
              <User size={16} color="#10b981" /> Personal Information
            </div>

            {profileError   && <div className="s-alert s-alert-error">  <AlertCircle  size={14}/><span>{profileError}</span></div>}
            {profileMessage && <div className="s-alert s-alert-success"><CheckCircle2 size={14}/><span>{profileMessage}</span></div>}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 18px" }}>
              {[
                { label:"Full Name *",              value:profileForm.name },
                { label:"Roll Number / Username *",  value:rollNumber, note:"Username is your roll number and cannot be changed." },
                { label:"College *",                value:COLLEGE_NAME },
                { label:"Year (Department) *",      value:profileForm.year ? profileForm.year + " Year" : "N/A" },
                { label:"Branch *",                 value:displayBranch },
              ].map(f => (
                <div key={f.label}>
                  <label className="s-form-label">{f.label}</label>
                  <input className="s-form-input" value={f.value} readOnly />
                  {f.note && <div style={{ marginTop:"5px", fontSize:"12px", color:"#64748b" }}>{f.note}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="s-section-card">
            <div className="s-section-card-head">
              <Lock size={16} color="#10b981" /> Change Password
            </div>

            <form onSubmit={handlePasswordSubmit}>
              {passwordError   && <div className="s-alert s-alert-error">  <AlertCircle  size={14}/><span>{passwordError}</span></div>}
              {passwordMessage && <div className="s-alert s-alert-success"><CheckCircle2 size={14}/><span>{passwordMessage}</span></div>}

              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px 18px" }}>
                <div>
                  <label className="s-form-label">Current Password *</label>
                  <input type="password" className="s-form-input" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword:e.target.value }))} />
                </div>
                <div>
                  <label className="s-form-label">New Password *</label>
                  <input type="password" className="s-form-input" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword:e.target.value }))} />
                </div>
                <div>
                  <label className="s-form-label">Confirm New Password *</label>
                  <input type="password" className="s-form-input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword:e.target.value }))} />
                </div>
              </div>

              <div className="s-password-req" style={{ marginTop:"14px" }}>
                <div className="s-password-req-head"><ShieldCheck size={13}/><span>Password Requirements:</span></div>
                <ul style={{ margin:0, paddingLeft:"16px" }}>
                  <li>At least 6 characters long</li>
                  <li>Include letters and numbers</li>
                  <li>Use a strong and unique password</li>
                </ul>
              </div>

              <div style={{ marginTop:"16px", display:"flex", justifyContent:"flex-end" }}>
                <button type="submit" disabled={savingPassword} className="s-btn-primary">
                  <Lock size={14} />
                  {savingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </StudentLayout>
  );
}

