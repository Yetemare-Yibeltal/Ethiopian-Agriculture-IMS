'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  MapPin,
  Wheat,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { farmerSchema, type FarmerFormData } from '@/lib/validators';
import { useToast } from '@/providers/ToastProvider';
import { cn } from '@/lib/utils';

interface Region { id: string; name: string; amharicName?: string }
interface Zone { id: string; name: string; amharicName?: string }
interface Woreda { id: string; name: string; amharicName?: string }
interface Kebele { id: string; name: string; amharicName?: string }
interface Crop { id: string; name: string; amharicName?: string; category: string }

interface DuplicateCheckResult {
  hasDuplicates: boolean;
  duplicates: Array<{
    id: string;
    farmerId: string;
    firstName: string;
    lastName: string;
    phone?: string;
    kebele: { name: string };
    createdAt: string;
  }>;
}

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Farm Details', icon: Wheat },
];

export default function RegisterFarmerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [duplicates, setDuplicates] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedWoredaId, setSelectedWoredaId] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<FarmerFormData>({
    resolver: zodResolver(farmerSchema),
    defaultValues: {
      secondaryCropIds: [],
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: queryKeys.regions.list(),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Region[] }>('/regions');
      return res.data.data;
    },
  });

  const { data: zones = [] } = useQuery({
    queryKey: queryKeys.regions.zones(selectedRegionId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Zone[] }>(
        `/regions/${selectedRegionId}/zones`,
      );
      return res.data.data;
    },
    enabled: !!selectedRegionId,
  });

  const { data: woredas = [] } = useQuery({
    queryKey: queryKeys.regions.woredas(selectedZoneId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Woreda[] }>(
        `/regions/zones/${selectedZoneId}/woredas`,
      );
      return res.data.data;
    },
    enabled: !!selectedZoneId,
  });

  const { data: kebeles = [] } = useQuery({
    queryKey: queryKeys.regions.kebeles(selectedWoredaId),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Kebele[] }>(
        `/regions/woredas/${selectedWoredaId}/kebeles`,
      );
      return res.data.data;
    },
    enabled: !!selectedWoredaId,
  });

  const { data: crops = [] } = useQuery({
    queryKey: ['crops'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Crop[] }>('/yields/crops');
      return res.data.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: FarmerFormData) => {
      const res = await apiClient.post('/farmers', {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender || undefined,
        kebeleId: data.kebeleId,
        landSizeHectare: data.landSizeHectare || undefined,
        landSizeTimad: data.landSizeTimad || undefined,
        gpsLat: data.gpsLat || undefined,
        gpsLng: data.gpsLng || undefined,
        primaryCropId: data.primaryCropId || undefined,
        notes: data.notes || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        'Farmer registered!',
        `${getValues('firstName')} ${getValues('lastName')} has been registered successfully.`,
      );
      router.push(`/farmers/${data.data.id}`);
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error?.statusCode === 409) {
        toast.error('Duplicate detected', 'A farmer with similar details already exists.');
      } else {
        toast.error('Registration failed', error?.message || 'Please try again.');
      }
    },
  });

  const checkDuplicates = async () => {
    const { firstName, lastName, phone, kebeleId } = getValues();
    if (!firstName || !lastName || !kebeleId) return;

    setIsCheckingDuplicate(true);
    try {
      const res = await apiClient.post<{ data: DuplicateCheckResult }>(
        '/farmers/check-duplicate',
        { firstName, lastName, phone, kebeleId },
      );
      setDuplicates(res.data.data);
    } catch {
      setDuplicates(null);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof FarmerFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['regionId', 'zoneId', 'woredaId', 'kebeleId'];
      await checkDuplicates();
    }

    const valid = await trigger(fieldsToValidate);
    if (valid) setCurrentStep((s) => Math.min(3, s + 1));
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
    setDuplicates(null);
  };

  const onSubmit = (data: FarmerFormData) => {
    registerMutation.mutate(data);
  };

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
    fontWeight: 500,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
    display: 'block',
  };

  const errorStyle = {
    fontSize: '12px',
    color: '#f87171',
    marginTop: '4px',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/farmers"
          className="p-2 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Register New Farmer
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Complete all steps to register a farmer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2 flex-1">
            <div
              className="flex items-center gap-2 flex-1 p-3 rounded-xl transition-all duration-300"
              style={{
                background: currentStep >= step.id ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.04)',
                border: currentStep >= step.id ? '1px solid rgba(0,255,136,0.2)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: currentStep > step.id ? '#00ff88' : currentStep === step.id ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.06)',
                  color: currentStep > step.id ? '#001a0e' : currentStep === step.id ? '#00ff88' : 'rgba(255,255,255,0.3)',
                }}
              >
                {currentStep > step.id ? <CheckCircle size={14} /> : <step.icon size={14} />}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: currentStep >= step.id ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="w-4 h-px shrink-0"
                style={{ background: currentStep > step.id ? '#00ff88' : 'rgba(255,255,255,0.1)' }}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div
          className="p-6 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold mb-6" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Personal Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input {...register('firstName')} placeholder="e.g. Abebe" style={inputStyle} />
                    {errors.firstName && <p style={errorStyle}>{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input {...register('lastName')} placeholder="e.g. Girma" style={inputStyle} />
                    {errors.lastName && <p style={errorStyle}>{errors.lastName.message}</p>}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input {...register('phone')} placeholder="+251XXXXXXXXX or 09XXXXXXXX" style={inputStyle} />
                  {errors.phone && <p style={errorStyle}>{errors.phone.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select {...register('gender')} style={inputStyle}>
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Birth</label>
                    <input {...register('dateOfBirth')} type="date" style={inputStyle} />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold mb-6" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Location Details
                </h2>
                <div>
                  <label style={labelStyle}>Region *</label>
                  <select
                    {...register('regionId')}
                    style={inputStyle}
                    onChange={(e) => {
                      setValue('regionId', e.target.value);
                      setValue('zoneId', '');
                      setValue('woredaId', '');
                      setValue('kebeleId', '');
                      setSelectedRegionId(e.target.value);
                      setSelectedZoneId('');
                      setSelectedWoredaId('');
                    }}
                  >
                    <option value="">Select region</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {errors.regionId && <p style={errorStyle}>{errors.regionId.message}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Zone *</label>
                  <select
                    {...register('zoneId')}
                    style={inputStyle}
                    disabled={!selectedRegionId}
                    onChange={(e) => {
                      setValue('zoneId', e.target.value);
                      setValue('woredaId', '');
                      setValue('kebeleId', '');
                      setSelectedZoneId(e.target.value);
                      setSelectedWoredaId('');
                    }}
                  >
                    <option value="">Select zone</option>
                    {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                  {errors.zoneId && <p style={errorStyle}>{errors.zoneId.message}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Woreda *</label>
                  <select
                    {...register('woredaId')}
                    style={inputStyle}
                    disabled={!selectedZoneId}
                    onChange={(e) => {
                      setValue('woredaId', e.target.value);
                      setValue('kebeleId', '');
                      setSelectedWoredaId(e.target.value);
                    }}
                  >
                    <option value="">Select woreda</option>
                    {woredas.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                  {errors.woredaId && <p style={errorStyle}>{errors.woredaId.message}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Kebele *</label>
                  <select {...register('kebeleId')} style={inputStyle} disabled={!selectedWoredaId}>
                    <option value="">Select kebele</option>
                    {kebeles.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                  {errors.kebeleId && <p style={errorStyle}>{errors.kebeleId.message}</p>}
                </div>

                {isCheckingDuplicate && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                  >
                    <Loader2 size={14} className="animate-spin" style={{ color: '#fbbf24' }} />
                    <p className="text-xs" style={{ color: '#fbbf24' }}>Checking for duplicates...</p>
                  </div>
                )}

                {duplicates?.hasDuplicates && (
                  <div
                    className="p-4 rounded-xl"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} style={{ color: '#f87171' }} />
                      <p className="text-sm font-semibold" style={{ color: '#f87171' }}>
                        {duplicates.duplicates.length} potential duplicate(s) found
                      </p>
                    </div>
                    {duplicates.duplicates.map((dup) => (
                      <div
                        key={dup.id}
                        className="flex items-center justify-between p-2 rounded-lg mb-2"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                            {dup.firstName} {dup.lastName}
                          </p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {dup.farmerId} — {dup.kebele.name}
                          </p>
                        </div>
                        <Link
                          href={`/farmers/${dup.id}`}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}
                        >
                          View
                        </Link>
                      </div>
                    ))}
                    <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      You can still proceed if you are sure this is a new farmer.
                    </p>
                  </div>
                )}

                {duplicates && !duplicates.hasDuplicates && (
                  <div
                    className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}
                  >
                    <CheckCircle size={14} style={{ color: '#4ade80' }} />
                    <p className="text-xs" style={{ color: '#4ade80' }}>No duplicates found — safe to proceed</p>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-bold mb-6" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  Farm Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Land Size (Hectares)</label>
                    <input {...register('landSizeHectare')} type="number" step="0.01" placeholder="e.g. 1.5" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Land Size (Timad)</label>
                    <input {...register('landSizeTimad')} type="number" step="0.01" placeholder="e.g. 3.75" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Primary Crop</label>
                  <select {...register('primaryCropId')} style={inputStyle}>
                    <option value="">Select primary crop</option>
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.amharicName ? `(${c.amharicName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>GPS Latitude</label>
                    <input {...register('gpsLat')} type="number" step="0.000001" placeholder="e.g. 9.024580" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>GPS Longitude</label>
                    <input {...register('gpsLng')} type="number" step="0.000001" placeholder="e.g. 38.747482" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Notes</label>
                  <textarea
                    {...register('notes')}
                    placeholder="Any additional notes about this farmer..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'none' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="flex items-center justify-between mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              type="button"
              onClick={prevStep}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                currentStep === 1 && 'opacity-0 pointer-events-none',
              )}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={isCheckingDuplicate}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  color: '#001a0e',
                }}
              >
                {isCheckingDuplicate ? (
                  <><Loader2 size={15} className="animate-spin" /> Checking...</>
                ) : (
                  <>Next <ChevronRight size={16} /></>
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: registerMutation.isPending ? 'rgba(0,255,136,0.5)' : 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  color: '#001a0e',
                  cursor: registerMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {registerMutation.isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Registering...</>
                ) : (
                  <><CheckCircle size={15} /> Register Farmer</>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
