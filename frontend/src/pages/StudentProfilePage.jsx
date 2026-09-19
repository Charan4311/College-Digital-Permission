import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import api from '../lib/api';
import {
  Camera,
  User,
  BadgeCheck,
  Building2,
  GraduationCap,
  Lock,
  UploadCloud,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const buildImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
  return `${base}${path}`;
};

export default function StudentProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  const profileImage = useMemo(() => buildImageUrl(user?.profileImage || ''), [user?.profileImage]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        studentType: user.studentType || 'DAY_SCHOLAR',
        year: user.year || '',
        yearTier: user.yearTier || 'TIER_4TH'
      });
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
      setProfileMessage('Profile image updated successfully.');
      if (res.data.fileUrl) {
        const updatedPath = buildImageUrl(res.data.fileUrl);
        if (updatedPath) {
          // no-op, refreshUser updates the state anyway.
        }
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
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

  return (
    <DashboardLayout>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Student account and profile details</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '1100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '30px' }}>
                {profileImage ? <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{initials}</span>}
                <label style={{ position: 'absolute', right: '4px', bottom: '4px', width: '36px', height: '36px', borderRadius: '50%', background: '#fff', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <Camera size={18} color="var(--accent)" />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{user?.rollNo || user?.username}</div>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div className="card-title" style={{ marginBottom: '14px' }}>Student Details</div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Student ID</span><span style={{ fontWeight: 600 }}>{user?.rollNo || 'Not available'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Username</span><span style={{ fontWeight: 600 }}>{user?.username || 'Not available'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Branch</span><span style={{ fontWeight: 600 }}>{user?.branchId?.name || user?.branchName || 'N/A'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Student Type</span><span style={{ fontWeight: 600 }}>{user?.studentType?.replace('_', ' ') || 'N/A'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}><span style={{ color: 'var(--text-muted)' }}>Year</span><span style={{ fontWeight: 600 }}>{user?.year || 'N/A'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><span style={{ color: 'var(--text-muted)' }}>Year Tier</span><span style={{ fontWeight: 600 }}>{user?.yearTier || 'N/A'}</span></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={18} color="var(--accent)" /> Edit Profile</div>
              {profileError && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{profileError}</span></div>}
              {profileMessage && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle2 size={16} /><span>{profileMessage}</span></div>}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={profileForm.name} readOnly onFocus={e => e.target.blur()} />
              </div>

              <div className="form-grid" style={{ marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Student Category</label>
                  <select className="form-input" value={profileForm.studentType} disabled>
                    <option value="DAY_SCHOLAR">Day Scholar</option>
                    <option value="HOSTELER">Hosteler</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input className="form-input" type="number" min="1" max="8" value={profileForm.year} readOnly onFocus={e => e.target.blur()} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label className="form-label">Year Tier</label>
                <select className="form-input" value={profileForm.yearTier} disabled>
                  <option value="TIER_1">TIER_1</option>
                  <option value="TIER_2">TIER_2</option>
                  <option value="TIER_3">TIER_3</option>
                  <option value="TIER_4TH">TIER_4TH</option>
                </select>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div className="card-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={18} color="var(--accent)" /> Change Password</div>
              {passwordError && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><AlertCircle size={16} /><span>{passwordError}</span></div>}
              {passwordMessage && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}><CheckCircle2 size={16} /><span>{passwordMessage}</span></div>}

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Current Password</label>
                <input type="password" className="form-input" value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Confirm New Password</label>
                <input type="password" className="form-input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>

              <button type="submit" className="btn btn-primary" disabled={savingPassword} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={16} />
                {savingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
