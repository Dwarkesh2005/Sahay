import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Filter, ShieldCheck, ChevronDown, Briefcase, Heart, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { ngoService, citiesService } from '../services/api';

const SERVICE_LABELS: Record<string, string> = {
  FOOD: '🍲 Food',
  SHELTER: '🏠 Shelter',
  MEDICAL: '🏥 Medical',
  EMPLOYMENT: '💼 Employment',
  EDUCATION: '📚 Education',
  LEGAL: '⚖️ Legal',
  GUIDANCE: '🧭 Guidance',
  OTHER: '📋 Other',
  SKILL_DEVELOPMENT: '🛠️ Skill Development',
  FINANCIAL_ASSISTANCE: '💰 Financial Assistance',
  WOMEN_SUPPORT: '👩 Women Support',
  CHILD_SUPPORT: '👶 Child Support',
  ELDERLY_SUPPORT: '👴 Elderly Support',
  DISABILITY_SUPPORT: '♿ Disability Support',
  MIGRANT_SUPPORT: '🚶 Migrant Support',
  DOCUMENTATION: '📄 Documentation',
  EMERGENCY: '🚨 Emergency'
};

const VERIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  GOVERNMENT_VERIFIED: { label: 'Govt Verified', color: 'bg-emerald-100 text-emerald-800' },
  CONTACT_VERIFIED: { label: 'Contact Verified', color: 'bg-blue-100 text-blue-800' },
  MANUALLY_VERIFIED: { label: 'Verified', color: 'bg-teal-100 text-teal-800' },
  PENDING: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800' }
};

export const NgoDirectoryPage: React.FC = () => {
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
      setError('Failed to load NGOs. Please try again.');
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
          Find <span className="text-primary">Trusted NGOs</span>
        </h1>
        <p className="text-emerald-950/70 text-lg max-w-2xl mx-auto">
          Discover verified organizations near you providing food, shelter, medical, employment, and other vital services.
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
              placeholder="Search NGOs by name, description, or location..."
              className="w-full pl-11 pr-4 py-3 bg-white/70 rounded-xl border border-forest-light/40 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              aria-label="Search NGOs"
            />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-forest-dark text-white font-medium px-6 py-3 rounded-xl shadow-sm transition-all duration-300"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-forest-light/40 hover:bg-white/60 transition-all text-forest-dark font-medium"
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
              <label className="text-xs font-semibold text-forest-dark/70 block mb-1">Service Category</label>
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-forest-light/40 bg-white/70 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                aria-label="Filter by service"
              >
                <option value="">All Categories</option>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-forest-dark/70 block mb-1">City</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-forest-light/40 bg-white/70 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                aria-label="Filter by city"
              >
                <option value="">All Cities</option>
                {cities.map((city: any) => (
                  <option key={city.city_id} value={city.city_id}>{city.city_name}, {city.state}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-sm font-medium text-forest-dark/80 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Verified Only
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
          <p className="text-emerald-950/60 mt-3">Loading NGOs...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-medium">{error}</p>
          <button onClick={fetchNgos} className="text-primary hover:underline font-medium text-sm">Try Again</button>
        </div>
      ) : ngos.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Building2 className="w-12 h-12 text-forest-dark/20 mx-auto" />
          <h3 className="font-display font-semibold text-xl text-forest-dark/60">No NGOs Found</h3>
          <p className="text-emerald-950/50 text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ngos.map((ngo: any) => {
            const vBadge = VERIFICATION_BADGE[ngo.verification_status] || VERIFICATION_BADGE.PENDING;
            return (
              <motion.div
                key={ngo.ngo_id}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <Link
                  to={`/ngos/${ngo.ngo_id}`}
                  className="block bg-white rounded-2xl p-6 border border-forest-light/20 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 h-full"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-bold text-lg text-forest-dark truncate">{ngo.ngo_name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-emerald-950/60 text-xs">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {ngo.cities?.city_name || 'Unknown'}, {ngo.cities?.state || ''}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${vBadge.color}`}>
                        {vBadge.label}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-emerald-950/70 line-clamp-2 leading-relaxed">
                      {ngo.description || 'No description available.'}
                    </p>

                    {/* Services */}
                    <div className="flex flex-wrap gap-1.5">
                      {ngo.ngo_services?.map((s: any) => (
                        <span key={s.service_id} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-nature border border-forest-light/20 text-forest-dark/80 font-medium">
                          {SERVICE_LABELS[s.service] || s.service}
                        </span>
                      ))}
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-4 text-xs text-emerald-950/50 pt-1 border-t border-forest-light/10">
                      {ngo.contact_person && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {ngo.contact_person}
                        </span>
                      )}
                      {ngo.phone_number && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> {ngo.phone_number}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
