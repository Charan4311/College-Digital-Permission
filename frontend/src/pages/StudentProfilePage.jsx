import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import {
  LuCamera as Camera,
  LuUser as User,
  LuBuilding2 as Building2,
  LuGraduationCap as GraduationCap,
  LuLock as Lock,
  LuCloudUpload as UploadCloud,
  LuCircleAlert as AlertCircle,
  LuCircleCheck as CheckCircle2,
  LuSave as Save,
  LuTrash2 as Trash2,
  LuPencil as Pencil,
  LuShieldCheck as ShieldCheck,
  LuIdCard as IdCard
} from 'react-icons/lu';

const COLLEGE_NAME = 'Kakinada Institute of Engineering and Technology';

const buildImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  return `${base}${path}`;
};

export default function StudentProfilePage() {
  const { user, refreshUser, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localProfileImage, setLocalProfileImage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showImageMenu, setShowImageMenu] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    studentType: 'DAY_SCHOLAR',
    year: '',
    yearTier: 'TIER_4TH'
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const profileImage = useMemo(() => {
    if (localProfileImage) return localProfileImage;
    return buildImageUrl(user?.profileImage || '');
  }, [localProfileImage, user?.profileImage]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        studentType: user.studentType || 'DAY_SCHOLAR',
        year: user.year || '',
        yearTier: user.yearTier || 'TIER_4TH'
      });
      setLocalProfileImage(buildImageUrl(user.profileImage || ''));
    }
    setLoading(false);
  }, [user]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    setSavingPassword(true);

    try {
      await api.patch('/auth/password', passwordForm);
      setPasswordMessage('Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingImage(true);
    setProfileError('');
    setProfileMessage('');

    try {
      const res = await api.post('/auth/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      setLocalProfileImage(buildImageUrl(res.data.fileUrl || user?.profileImage || ''));
      setProfileMessage('Profile image updated successfully.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async () => {
    try {
      setLocalProfileImage('');
      updateUser((currentUser) => currentUser ? { ...currentUser, profileImage: '' } : currentUser);
      setProfileMessage('Profile image deleted successfully.');
      setProfileError('');
      await api.delete('/auth/profile-image');
      await refreshUser();
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to delete profile image.');
      setProfileMessage('');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
        </div>
        <div className="loading-screen"><div className="spinner spinner-lg" /></div>
      </DashboardLayout>
    );
  }

  const initials = user?.name ? user.name.split(' ').filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase() : 'U';
  const displayStudentType = user?.studentType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar';
  const displayBranch = user?.branchName || user?.branchId?.name || 'N/A';
  const rollNumber = user?.rollNo || user?.username || 'N/A';

  return (
    <DashboardLayout>
      <header className="page-header" style={{ marginBottom: '18px' }}>
        <div className="eyebrow">Student Profile</div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Student account and profile details</p>
      </header>

      <Card className="student-profile-card" style={{ maxWidth: '1180px', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 18px 45px rgba(15, 23, 42, 0.05)', overflow: 'hidden' }}>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,320px)_1fr] gap-0">
          <aside style={{ background: 'linear-gradient(rgb(243, 255, 255) 0%, rgb(243, 255, 255) 100%)', borderRight: '1px solid rgb(233, 213, 255)', padding: '22px 18px 18px' }}>
            <div style={{ background: 'linear-gradient(135deg, #6D28D9 0%, #60a5fa 100%)', borderRadius: '18px 18px 0 0', padding: '20px 16px 18px', minHeight: '220px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div onClick={() => setShowImageMenu(!showImageMenu)} style={{ cursor: 'pointer', position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: '#e5e7eb', border: '4px solid rgba(255,255,255,0.75)', boxShadow: '0 6px 20px rgba(109,94,252,0.18)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '34px', fontWeight: 800, color: '#475569' }}>{initials}</span>
                  )}
                  <div style={{ position: 'absolute', right: '6px', bottom: '6px', width: '30px', height: '30px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(148,163,184,0.8)', boxShadow: '0 2px 10px rgba(15, 23, 42, 0.1)' }}>
                    <Camera size={16} color="#6D28D9" />
                  </div>
                </div>

                {showImageMenu && (
                  <div style={{ position: 'absolute', top: '130px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '160px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer', borderRadius: '8px' }}>
                      <UploadCloud size={15} /> Upload Image
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { setShowImageMenu(false); handleImageUpload(e); }} />
                    </label>
                    {profileImage && (
                      <div onClick={() => { setShowImageMenu(false); handleDeleteImage(); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: 'pointer', borderRadius: '8px', marginTop: '4px' }}>
                        <Trash2 size={15} /> Delete Image
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '18px', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: '20px', lineHeight: 1.25, letterSpacing: '-0.3px', textTransform: 'uppercase' }}>
                {user?.name || 'Student Name'}
              </div>
              <div style={{ marginTop: '8px', color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: 600 }}>{rollNumber}</div>
            </div>

            <div style={{ padding: '18px 16px 8px' }}>
              <div style={{ display: 'grid', gap: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#334155', borderBottom: '1px solid #edf2f7' }}>
                  <User size={16} color="#6D28D9" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Student</span>
                    <span style={{ fontWeight: 700 }}>{displayStudentType}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#334155', borderBottom: '1px solid #edf2f7' }}>
                  <IdCard size={16} color="#6D28D9" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Roll Number</span>
                    <span style={{ fontWeight: 700 }}>{rollNumber}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#334155', borderBottom: '1px solid #edf2f7' }}>
                  <Building2 size={16} color="#6D28D9" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Branch</span>
                    <span style={{ fontWeight: 700 }}>{displayBranch}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#334155', borderBottom: '1px solid #edf2f7' }}>
                  <GraduationCap size={16} color="#6D28D9" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>College</span>
                    <span style={{ fontWeight: 700 }}>{COLLEGE_NAME}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', color: '#334155' }}>
                  <ShieldCheck size={16} color="#6D28D9" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Year (Department)</span>
                    <span style={{ fontWeight: 700 }}>{profileForm.year ? `${profileForm.year} Year` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main style={{ background: '#f8fafc', padding: '22px 22px 18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <section style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  <User size={18} color="#6D28D9" />
                  <span>Personal Information</span>
                </div>
              </div>

              {profileError && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{profileError}</span></div>}
              {profileMessage && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle2 size={16} /><span>{profileMessage}</span></div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[18px] gap-y-[16px]">
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Full Name *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={profileForm.name} readOnly />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Student Category *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={displayStudentType} readOnly />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Roll Number *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={rollNumber} readOnly />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>College *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={COLLEGE_NAME} readOnly />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Username *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={rollNumber} readOnly />
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>Username is your roll number and cannot be changed.</div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Year (Department) *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={profileForm.year ? `${profileForm.year} Year` : 'N/A'} readOnly />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Branch *</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={displayBranch} readOnly />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Username</label>
                  <Input className="bg-slate-50 text-slate-700 cursor-not-allowed" value={rollNumber} readOnly />
                </div>
              </div>
            </section>

            <section style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                <Lock size={18} color="#6D28D9" />
                <span>Change Password</span>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                {passwordError && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{passwordError}</span></div>}
                {passwordMessage && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle2 size={16} /><span>{passwordMessage}</span></div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-[18px] gap-y-[16px]">
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Current Password *</label>
                    <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))} className="bg-white" />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>New Password *</label>
                    <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))} className="bg-white" />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Confirm New Password *</label>
                    <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))} className="bg-white" />
                  </div>
                </div>

                <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '12px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#7C3AED', fontSize: '13px', lineHeight: '1.5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '8px' }}>
                    <ShieldCheck size={15} />
                    <span>Password Requirements:</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px' }}>
                    <li>At least 6 characters long</li>
                    <li>Include letters and numbers</li>
                    <li>Use a strong and unique password</li>
                  </ul>
                </div>

                <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" disabled={savingPassword} className="bg-violet-600 hover:bg-violet-700 text-white shadow-md">
                    <Lock size={15} />
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </section>
          </main>
        </div>
      </Card>
    </DashboardLayout>
  );
}
