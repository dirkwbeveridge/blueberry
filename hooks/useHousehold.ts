import { useHouseholdStore } from '../store/household';
import { getTrimester } from '../lib/pregnancy';

export function useHousehold() {
  const household   = useHouseholdStore((s) => s.household);
  const currentUser = useHouseholdStore((s) => s.currentUser);
  const partnerUser = useHouseholdStore((s) => s.partnerUser);
  const currentWeek = useHouseholdStore((s) => s.currentWeek);

  const trimester     = currentWeek > 0 ? getTrimester(currentWeek) : null;
  const isMotherRole  = currentUser?.role === 'mother';
  const isPartnerRole = currentUser?.role === 'partner';
  const isPregnant    = household?.stage === 'pregnant';
  const isPostpartum  = household?.stage === 'postpartum';

  return { household, currentUser, partnerUser, currentWeek, trimester, isMotherRole, isPartnerRole, isPregnant, isPostpartum };
}
