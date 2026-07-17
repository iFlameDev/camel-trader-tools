import React from 'react';
import { Card } from '../components/ui/Card';
import { Clock, Activity, Wifi, Database } from 'lucide-react';

export const MonitorPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto mt-12">
      <Card className="text-center py-20 px-8 relative overflow-hidden border-brand-500/20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50" />
        
        <div className="flex justify-center mb-8 relative">
          <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 rounded-3xl bg-surface-900 border border-surface-700/50 flex items-center justify-center shadow-2xl">
            <Clock size={40} className="text-brand-400" />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-surface-800 border border-surface-600 flex items-center justify-center">
              <Activity size={20} className="text-profit" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-surface-100 mb-4 tracking-tight">
          Live Monitor <span className="text-brand-400">is Upcoming</span>
        </h2>
        
        <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          We are currently developing a deep integration system to sync seamlessly with <strong className="text-surface-200">MQL5</strong>. 
          Soon, you will be able to monitor live MetaTrader accounts executing strategies directly from your Research Database.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="bg-surface-950 p-5 rounded-2xl border border-surface-800/50">
            <Database size={20} className="text-brand-500 mb-3" />
            <h4 className="text-sm font-semibold text-surface-200 mb-1">Database Sync</h4>
            <p className="text-xs text-surface-500">Attach trading methods straight from your research.</p>
          </div>
          <div className="bg-surface-950 p-5 rounded-2xl border border-surface-800/50">
            <Wifi size={20} className="text-brand-500 mb-3" />
            <h4 className="text-sm font-semibold text-surface-200 mb-1">Real-time MQL5</h4>
            <p className="text-xs text-surface-500">Live tick data and trade execution updates.</p>
          </div>
          <div className="bg-surface-950 p-5 rounded-2xl border border-surface-800/50">
            <Activity size={20} className="text-brand-500 mb-3" />
            <h4 className="text-sm font-semibold text-surface-200 mb-1">Performance Tracking</h4>
            <p className="text-xs text-surface-500">Compare live results vs backtest projections.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
