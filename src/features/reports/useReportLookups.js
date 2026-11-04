/* ===== useReportLookups — dropdown data for report filters =====
 * Everything comes from existing sources (nothing hardcoded):
 *   parties / products / categories / brands → appStore (already bootstrapped)
 *   users                                    → fetchCompanyUsersAPI (same call UsersReport used)
 *   payment modes                            → settings (acceptedPaymentMethods) + modes seen in report data
 *   tax rates                                → distinct product tax rates
 */
import { useEffect, useMemo, useState } from 'react';
import useAppStore from '../../store/appStore';
import useSettingsStore from '../../store/settingsStore';
import { fetchCompanyUsersAPI } from '../../api';

const idOf = (o) => String(o.id ?? o._id);

export function useReportLookups({ needUsers = false, seenPaymentModes = [] } = {}) {
  const parties = useAppStore((s) => s.parties);
  const products = useAppStore((s) => s.products);
  const categories = useAppStore((s) => s.categories);
  const brands = useAppStore((s) => s.brands);
  const accepted = useSettingsStore((s) => s.acceptedPaymentMethods);

  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!needUsers) return undefined;
    let alive = true;
    fetchCompanyUsersAPI(1)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data;
        if (alive && Array.isArray(list)) setUsers(list);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [needUsers]);

  return useMemo(() => {
    const byName = (a, b) => a.label.localeCompare(b.label);
    const taxRates = [...new Set(products.map((p) => p.taxRate).filter((v) => v !== undefined && v !== null && v !== ''))]
      .map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    const modes = [...new Set([...(accepted || []), ...seenPaymentModes])].filter(Boolean);
    return {
      parties: parties.map((p) => ({ value: idOf(p), label: p.name || `Party ${idOf(p)}` })).sort(byName),
      products: products.map((p) => ({ value: idOf(p), label: p.name || `Product ${idOf(p)}` })).sort(byName),
      categories: categories.map((c) => ({ value: idOf(c), label: c.category || c.name || `Category ${idOf(c)}` })).sort(byName),
      brands: brands.map((b) => ({ value: idOf(b), label: b.name || `Brand ${idOf(b)}` })).sort(byName),
      users: users.map((u) => ({ value: idOf(u), label: u.name || u.email || `User ${idOf(u)}` })).sort(byName),
      paymentModes: modes.map((m) => ({ value: m, label: m })),
      taxRates: taxRates.map((r) => ({ value: String(r), label: `${r}%` })),
    };
  }, [parties, products, categories, brands, users, accepted, seenPaymentModes]);
}
