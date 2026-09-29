import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, MapPin, Filter, ShieldCheck, ChevronDown, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { ngoService, citiesService } from '../services/api';

const SERVICE_KEYS = [
  'FOOD', 'SHELTER', 'MEDICAL', 'EMPLOYMENT', 'EDUCATION', 'LEGAL',
  'GUIDANCE', 'OTHER', 'SKILL_DEVELOPMENT', 'FINANCIAL_ASSISTANCE',
  'WOMEN_SUPPORT', 'CHILD_SUPPORT', 'ELDERLY_SUPPORT', 'DISABILITY_SUPPORT',
  'MIGRANT_SUPPORT', 'DOCUMENTATION', 'EMERGENCY'
];

export const NgoDirectoryPage: React.FC = () => {
  const { t } = useTranslation();
  const [ngos, setNgos] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchNgos = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (serviceFilter) params.service = serviceFilter;
      if (cityFilter) params.city_id = parseInt(cityFilter);
      if (verifiedOnly) params.verified = true;
      const data = await ngoService.getNgos(params);
      setNgos(data.ngos || []);
    } catch (err: any) {
      setError(t('errors.failedToLoad', 'Failed to load NGOs. Please try again.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    citiesService.getCities().then(setCities).catch(console.error);
  }, []);

  useEffect(() => {
    fetchNgos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceFilter, cityFilter, verifiedOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNgos();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <h1 className="font-display font-extrabold text-4xl md:text-5xl text-forest-dark">
          {t('ngo.findNgoTitle', 'Directory of Verified NGOs')}
        </h1>
        <p className="text-emerald-950/70 text-lg max-w-2xl mx-auto">
          {t(
            'ngo.findNgoSubtitle',
            'Discover verified organizations near you providing food, shelter, medical, employment, and other vital services.'
          )}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm border border-primary/10 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-forest-dark/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ngo.searchPlaceholder', 'Search NGOs by name, description, or location...')}
              className="w-full pl-11 pr-4 py-3 bg-white/70 rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
              aria-label="Search NGOs"
            />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-forest-dark text-white font-medium px-6 py-3 rounded-xl shadow-sm transition-all duration-300 text-sm cursor-pointer"
          >
            {t('common.search', 'Search')}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-forest-light/40 hover:bg-white/60 transition-all text-forest-dark font-medium text-sm cursor-pointer"
            aria-label="Toggle filters"
          >
            <Filter className="w-4 h-4" />
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </form>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
          >
            <div>
              <label className="text-xs font-semibold text-forest-dark/70 block mb-1">
                {t('ngo.filterByService', 'Service Category')}
              </label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-forest-light/40 bg-white/70 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                aria-label="Filter by service"
              >
                <option value="">{t('ngo.allServices', 'All Categories')}</option>
                {SERVICE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`categories.${key}`, key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-forest-dark/70 block mb-1">
                {t('ngo.filterByCity', 'City')}
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-forest-light/40 bg-white/70 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                aria-label="Filter by city"
              >
                <option value="">{t('ngo.allCities', 'All Cities')}</option>
                {cities.map((city: any) => (
                  <option key={city.city_id} value={city.city_id}>
                    {city.city_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm font-medium text-forest-dark/80 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-primary" /> {t('ngo.verifiedOnly', 'Verified NGOs Only')}
                </span>
              </label>
            </div>
          </motion.div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-emerald-950/60 mt-3">{t('common.loading', 'Loading NGOs...')}</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-medium">{error}</p>
          <button
            onClick={fetchNgos}
            className="text-primary hover:underline text-sm font-semibold"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      ) : ngos.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Building2 className="w-12 h-12 text-forest-dark/30 mx-auto" />
          <h3 className="font-display font-semibold text-lg text-forest-dark">
            {t('ngo.noFeedRequests', 'No NGOs found matching your criteria.')}
          </h3>
          <p className="text-emerald-950/60 text-sm">
            Try adjusting your search terms or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ngos.map((ngo) => {
            const isVerified = ngo.verification_status && ngo.verification_status !== 'PENDING';
            return (
              <motion.div
                key={ngo.ngo_id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-forest-light/20 shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left"
              >
                <div className="space-y-4">
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-bold text-lg text-forest-dark line-clamp-1">
                        {ngo.ngo_name}
                      </h3>
                      {ngo.city && (
                        <p className="text-xs text-forest-dark/60 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{ngo.city.city_name}, {ngo.city.state}</span>
                        </p>
                      )}
                    </div>
                    {isVerified ? (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {t('ngo.verifiedBadge', 'Govt Verified')}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 bg-amber-100 text-amber-800 border-amber-200">
                        {t('ngo.unverified', 'Pending Review')}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-emerald-950/75 leading-relaxed line-clamp-3">
                    {ngo.description || t('common.notSpecified', 'Dedicated community organization serving vulnerable populations.')}
                  </p>

                  {/* Service tags */}
                  {ngo.services && ngo.services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ngo.services.slice(0, 4).map((s: string) => (
                        <span
                          key={s}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/15 text-forest-dark font-medium"
                        >
                          {t(`categories.${s}`, s)}
                        </span>
                      ))}
                      {ngo.services.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-light/20 text-forest-dark/60 font-medium">
                          +{ngo.services.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="pt-5 mt-5 border-t border-forest-light/15 flex items-center justify-between">
                  <span className="text-xs text-forest-dark/50">
                    {ngo.contact_person ? `${t('ngo.contactPerson', 'Contact')}: ${ngo.contact_person}` : ''}
                  </span>
                  <Link
                    to={`/ngos/${ngo.ngo_id}`}
                    className="text-xs font-semibold text-primary hover:text-forest-dark transition-colors flex items-center gap-1"
                  >
                    {t('ngo.viewProfile', 'View Profile')} →
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
