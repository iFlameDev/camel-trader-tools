import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { supabase } from '../../lib/supabase';
import type { MethodFormData } from '../../types/database';
import { Sparkles, ChevronRight } from 'lucide-react';

type StepMethodologyProps = {
  onComplete: (methodId: string) => void;
};

const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];
const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
  'XAUUSD', 'XAGUSD', 'US30', 'NAS100', 'SPX500', 'BTCUSD', 'ETHUSD',
];

export const StepMethodology: React.FC<StepMethodologyProps> = ({ onComplete }) => {
  const [form, setForm] = useState<MethodFormData>({
    name: '',
    timeframe: 'H1',
    pair: 'EURUSD',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError('Method name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('methods')
        .insert({
          name: form.name.trim(),
          timeframe: form.timeframe,
          pair: form.pair,
          description: form.description?.trim() || null,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;
      if (data) onComplete(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save method');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up max-w-2xl mx-auto">
      <Card gradient padding="lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
            <Sparkles size={20} className="text-brand-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-surface-100">Define Methodology</h3>
            <p className="text-xs text-surface-400">
              Create a new trading research method to begin backtesting
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Method Name */}
          <div>
            <Tooltip text="Nama unik untuk metode trading Anda. Gunakan nama yang deskriptif agar mudah diidentifikasi di database. Contoh: 'SMC Asia Session Sweep', 'Bollinger Breakout H1'.">
              <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                Method Name *
              </label>
            </Tooltip>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., SMC Asia Session Sweep"
              className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm"
            />
          </div>

          {/* Timeframe & Pair */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Tooltip text="Period chart yang digunakan untuk analisis. Timeframe lebih kecil (M1-M15) menghasilkan lebih banyak sinyal tapi noise lebih tinggi. Timeframe lebih besar (H4-D1) memberikan sinyal yang lebih bersih tapi trade lebih sedikit.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Timeframe
                </label>
              </Tooltip>
              <select
                value={form.timeframe || ''}
                onChange={(e) => setForm({ ...form, timeframe: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm cursor-pointer"
              >
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Tooltip text="Instrumen yang diperdagangkan. Pilih sesuai pair yang digunakan di backtest. Setiap pair memiliki volatilitas dan spread yang berbeda, yang mempengaruhi hasil simulasi.">
                <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                  Trading Pair
                </label>
              </Tooltip>
              <select
                value={form.pair || ''}
                onChange={(e) => setForm({ ...form, pair: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm cursor-pointer"
              >
                {PAIRS.map((pair) => (
                  <option key={pair} value={pair}>
                    {pair}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Tooltip text="Deskripsi aturan entry, exit, dan filter dari metode trading. Berguna untuk dokumentasi riset dan referensi di kemudian hari. Tuliskan secara detail agar bisa direplikasi.">
              <label className="block text-xs font-semibold text-surface-300 mb-2 uppercase tracking-wider">
                Description
              </label>
            </Tooltip>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your trading methodology, entry/exit rules, filters..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-600 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all text-sm resize-none"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-loss/10 border border-loss/20 text-loss text-xs font-medium">
              {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            size="lg"
            className="w-full"
            icon={<ChevronRight size={18} />}
          >
            Create Method & Continue
          </Button>
        </form>
      </Card>
    </div>
  );
};
