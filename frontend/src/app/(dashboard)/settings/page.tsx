'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  Bell,
  Shield,
  Globe,
  Save,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { usePermissions } from '@/hooks/usePermissions';
import {
  profileSchema,
  changePasswordSchema,
  type ProfileFormData,
  type ChangePasswordFormData,
} from '@/lib/validators';
import { formatDate, getRoleColor, formatRole } from '@/lib/utils';

// ─── Tab Type ─────────────────────────────────────────────
type SettingsTab = 'profile' | 'security' | 'notifications' | 'system';

// ─── Settings Page ────────────────────────────────────────
export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      language: (user?.language as 'en' | 'am') || 'en',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  // ── Update Profile Mutation ──────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      await apiClient.patch('/auth/profile', data);
    },
    onSuccess: async () => {
      await refreshUser();
      toast.success('Profile updated', 'Your profile has been updated successfully.');
    },
    onError: () => {
      toast.error('Update failed', 'Could not update your profile. Please try again.');
    },
  });

  // ── Change Password Mutation ─────────────────────────
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      await apiClient.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast.success('Password changed', 'Your password has been changed successfully.');
      resetPassword();
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error?.statusCode === 401) {
        toast.error('Wrong password', 'Your current password is incorrect.');
      } else {
        toast.error('Change failed', error?.message || 'Please try again.');
      }
    },
  });

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(permissions.canViewSystemSettings
      ? [{ id: 'system' as SettingsTab, label: 'System', icon: Settings }]
      : []),
  ];

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '12px',
    color: 'rgba(255,255,255,0.9)',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 500 as const,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
    display: 'block' as const,
  };

  if (!user) return null;

  const roleColor = getRoleColor(user.role);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          Settings
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Manage your account and system preferences
        </p>
      </div>

      {/* User Summary Card */}
      <div
        className="p-5 rounded-2xl flex items-center gap-4"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
          style={{ background: roleColor.bg, color: roleColor.text }}
        >
          {user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2)}
        </div>
        <div className="flex-1">
          <p
            className="text-base font-bold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {user.name}
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {user.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: roleColor.bg, color: roleColor.text }}
            >
              {formatRole(user.role)}
            </span>
            {user.language && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <Globe size={10} />
                {user.language === 'am' ? 'አማርኛ' : 'English'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center"
            style={{
              background:
                activeTab === tab.id
                  ? 'rgba(0,255,136,0.1)'
                  : 'transparent',
              color:
                activeTab === tab.id
                  ? '#00ff88'
                  : 'rgba(255,255,255,0.45)',
              border:
                activeTab === tab.id
                  ? '1px solid rgba(0,255,136,0.2)'
                  : '1px solid transparent',
            }}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h2
              className="text-base font-bold mb-6"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Profile Information
            </h2>
            <form
              onSubmit={handleProfileSubmit((data) =>
                updateProfileMutation.mutate(data),
              )}
              className="space-y-5"
            >
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  {...registerProfile('name')}
                  style={inputStyle}
                  placeholder="Your full name"
                />
                {profileErrors.name && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {profileErrors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  value={user.email}
                  disabled
                  style={{
                    ...inputStyle,
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  }}
                />
                <p
                  className="text-xs mt-1"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Email address cannot be changed. Contact your administrator.
                </p>
              </div>

              <div>
                <label style={labelStyle}>Preferred Language</label>
                <select {...registerProfile('language')} style={inputStyle}>
                  <option value="en">English</option>
                  <option value="am">አማርኛ (Amharic)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Role</label>
                <input
                  value={formatRole(user.role)}
                  disabled
                  style={{
                    ...inputStyle,
                    opacity: 0.5,
                    cursor: 'not-allowed',
                  }}
                />
              </div>

              {user.organization && (
                <div>
                  <label style={labelStyle}>Organization</label>
                  <input
                    value={user.organization.name}
                    disabled
                    style={{
                      ...inputStyle,
                      opacity: 0.5,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              )}

              <div
                className="pt-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                    color: '#001a0e',
                  }}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : updateProfileMutation.isSuccess ? (
                    <>
                      <CheckCircle size={14} />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h2
              className="text-base font-bold mb-6"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Change Password
            </h2>
            <form
              onSubmit={handlePasswordSubmit((data) =>
                changePasswordMutation.mutate(data),
              )}
              className="space-y-5"
            >
              <div>
                <label style={labelStyle}>Current Password</label>
                <div className="relative">
                  <input
                    {...registerPassword('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>New Password</label>
                <div className="relative">
                  <input
                    {...registerPassword('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters with uppercase, lowercase, number"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <div className="relative">
                  <input
                    {...registerPassword('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div
                className="pt-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #f87171, #fbbf24)',
                    color: '#fff',
                  }}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Shield size={14} />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Session Info */}
            <div
              className="mt-6 pt-6"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h3
                className="text-sm font-semibold mb-4"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Account Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    Account Created
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {user.createdAt ? formatDate(user.createdAt) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    Last Login
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'First login'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h2
              className="text-base font-bold mb-6"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Notification Preferences
            </h2>
            <div className="space-y-4">
              {[
                {
                  label: 'Food Security Alerts',
                  desc: 'Get notified when food security risk is detected in a region',
                  defaultChecked: true,
                },
                {
                  label: 'New Farmer Registrations',
                  desc: 'Get notified when new farmers are registered in your area',
                  defaultChecked: false,
                },
                {
                  label: 'Duplicate Detection Alerts',
                  desc: 'Get notified when a duplicate aid distribution is blocked',
                  defaultChecked: true,
                },
                {
                  label: 'Export Ready Notifications',
                  desc: 'Get notified when your data export is ready to download',
                  defaultChecked: true,
                },
                {
                  label: 'System Announcements',
                  desc: 'Receive important system-wide announcements from administrators',
                  defaultChecked: true,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex-1 pr-4">
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'rgba(255,255,255,0.8)' }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <div
                    className="relative w-10 h-6 rounded-full cursor-pointer transition-colors"
                    style={{
                      background: item.defaultChecked
                        ? 'rgba(0,255,136,0.3)'
                        : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <div
                      className="absolute top-1 w-4 h-4 rounded-full transition-all"
                      style={{
                        background: item.defaultChecked ? '#00ff88' : 'rgba(255,255,255,0.4)',
                        left: item.defaultChecked ? '22px' : '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="pt-5 mt-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <button
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  color: '#001a0e',
                }}
                onClick={() =>
                  toast.success(
                    'Preferences saved',
                    'Notification preferences updated.',
                  )
                }
              >
                <Save size={14} />
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && permissions.canViewSystemSettings && (
          <div
            className="p-6 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h2
              className="text-base font-bold mb-6"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              System Information
            </h2>
            <div className="space-y-4">
              {[
                { label: 'System Version', value: 'AgroEthiopia MIS v1.0.0' },
                { label: 'Environment', value: process.env.NODE_ENV || 'production' },
                { label: 'Database', value: 'PostgreSQL (Neon Cloud)' },
                { label: 'Cache', value: 'Redis (Upstash)' },
                { label: 'Storage', value: 'Local / Cloud Storage' },
                { label: 'API Version', value: 'v1' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span
                    className="text-sm"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-sm font-medium font-mono"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
