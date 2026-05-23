import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentWeek, getTrimester } from '../lib/pregnancy';
import type { AppUser, BabyGender, Household, Stage } from '../types';

interface HouseholdState {
  household:   Household | null;
  currentUser: AppUser | null;
  partnerUser: AppUser | null;
  currentWeek: number;
  setHousehold:   (h: Household) => void;
  setCurrentUser: (u: AppUser) => void;
  setPartnerUser: (u: AppUser | null) => void;
  setStage:       (stage: Stage) => void;
  setBabyName:    (name: string) => void;
  setBabyGender:  (gender: BabyGender) => void;
  setBabyDob:     (dob: string) => void;
  clearAll:       () => void;
}

export const useHouseholdStore = create<HouseholdState>()(
  persist(
    (set) => ({
      household:   null,
      currentUser: null,
      partnerUser: null,
      currentWeek: 0,
      setHousehold: (h) => set({ household: h, currentWeek: h.due_date ? getCurrentWeek(h.due_date) : 0 }),
      setCurrentUser: (u) => set({ currentUser: u }),
      setPartnerUser: (u) => set({ partnerUser: u }),
      setStage: (stage) => set((s) => ({ household: s.household ? { ...s.household, stage } : null })),
      setBabyName: (baby_name) => set((s) => ({ household: s.household ? { ...s.household, baby_name } : null })),
      setBabyGender: (baby_gender) => set((s) => ({ household: s.household ? { ...s.household, baby_gender } : null })),
      setBabyDob: (baby_dob) => set((s) => ({ household: s.household ? { ...s.household, baby_dob, stage: 'postpartum' } : null })),
      clearAll: () => set({ household: null, currentUser: null, partnerUser: null, currentWeek: 0 }),
    }),
    { name: 'blueberry-household', storage: createJSONStorage(() => AsyncStorage) }
  )
);

export const useCurrentWeek = () => useHouseholdStore((s) => s.currentWeek);
export const useTrimester = () => { const w = useHouseholdStore((s) => s.currentWeek); return getTrimester(w); };
export const useCurrentUser = () => useHouseholdStore((s) => s.currentUser);
export const usePartnerUser = () => useHouseholdStore((s) => s.partnerUser);
