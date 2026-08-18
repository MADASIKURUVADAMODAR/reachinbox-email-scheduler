import React, { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle2, Plus, Server, Send, Sparkles, TrendingUp } from 'lucide-react';
import type { EmailRecord } from '../types';
import { api } from '../services/api';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ScheduledEmailsTable } from './ScheduledEmailsTable';
import { SentEmailsTable } from './SentEmailsTable';
import type { TabType } from './Navbar';

interface DashboardViewProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenCompose: () => void;
  onCountsUpdate: (scheduledCount: number, sentCount: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeTab,
  setActiveTab,
  onOpenCompose,
  onCountsUpdate,
}) => {
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);

  const [isLoadingScheduled, setIsLoadingScheduled] = useState(true);
  const [isLoadingSent, setIsLoadingSent] = useState(true);

  const [isErrorScheduled, setIsErrorScheduled] = useState(false);
  const [isErrorSent, setIsErrorSent] = useState(false);

  const [backendHealth, setBackendHealth] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');

  const loadScheduled = useCallback(async () => {
    setIsLoadingScheduled(true);
    setIsErrorScheduled(false);
    try {
      const res = await api.fetchScheduledEmails();
      setScheduledEmails(res.emails || []);
    } catch (err) {
      console.error('Failed to load scheduled emails:', err);
      setIsErrorScheduled(true);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  const loadSent = useCallback(async () => {
    setIsLoadingSent(true);
    setIsErrorSent(false);
    try {
      const res = await api.fetchSentEmails();
      setSentEmails(res.emails || []);
    } catch (err) {
      console.error('Failed to load sent emails:', err);
      setIsErrorSent(true);
    } finally {
      setIsLoadingSent(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      await api.checkHealth();
      setBackendHealth('healthy');
    } catch {
      setBackendHealth('unhealthy');
    }
  }, []);

  const loadAll = useCallback(() => {
    loadScheduled();
    loadSent();
    checkHealth();
  }, [loadScheduled, loadSent, checkHealth]);

  useEffect(() => {
    loadAll();
    // Auto-poll every 8 seconds for live email delivery queue updates
    const interval = setInterval(() => {
      loadScheduled();
      loadSent();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadAll, loadScheduled, loadSent]);

  useEffect(() => {
    onCountsUpdate(scheduledEmails.length, sentEmails.length);
  }, [scheduledEmails.length, sentEmails.length, onCountsUpdate]);

  const totalSentCount = sentEmails.filter((e) => e.status === 'sent').length;
  const totalFailedCount = sentEmails.filter((e) => e.status === 'failed').length;
  const totalProcessed = totalSentCount + totalFailedCount;
  const deliveryRate = totalProcessed > 0 ? Math.round((totalSentCount / totalProcessed) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ReachInbox Email Scheduler Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Email Campaign Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Schedule emails with delayed queues, rate limiting, and PostgreSQL persistence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={onOpenCompose}
            >
              Compose New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scheduled Stat */}
        <Card className="hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Queue</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-100">{scheduledEmails.length}</span>
            <p className="text-xs text-slate-400 mt-1">Pending delivery execution</p>
          </div>
        </Card>

        {/* Sent Stat */}
        <Card className="hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sent Emails</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-100">{totalSentCount}</span>
            <p className="text-xs text-slate-400 mt-1">Successfully delivered via SMTP</p>
          </div>
        </Card>

        {/* Delivery Rate */}
        <Card className="hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivery Rate</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-100">{deliveryRate}%</span>
            <p className="text-xs text-slate-400 mt-1">{totalProcessed} total jobs processed</p>
          </div>
        </Card>

        {/* Backend Health Stat */}
        <Card className="hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</span>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${backendHealth === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-lg font-bold text-slate-200 uppercase tracking-tight">
                {backendHealth === 'healthy' ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">PostgreSQL & BullMQ Redis</p>
          </div>
        </Card>
      </div>

      {/* View Tabs / Main Section */}
      <div className="space-y-4">
        {/* Navigation Section Title */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100">
              {activeTab === 'dashboard'
                ? 'Campaign Overview'
                : activeTab === 'scheduled'
                ? 'Scheduled Emails Queue'
                : 'Sent Email Logs'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'scheduled' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('scheduled')}
            >
              Scheduled ({scheduledEmails.length})
            </Button>
            <Button
              variant={activeTab === 'sent' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('sent')}
            >
              Sent ({sentEmails.length})
            </Button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>Upcoming Scheduled Queue</span>
                </h3>
                <button
                  onClick={() => setActiveTab('scheduled')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  View All &rarr;
                </button>
              </div>
              <ScheduledEmailsTable
                emails={scheduledEmails.slice(0, 5)}
                isLoading={isLoadingScheduled}
                isError={isErrorScheduled}
                onRefresh={loadScheduled}
                onComposeClick={onOpenCompose}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Recent Sent Delivery Logs</span>
                </h3>
                <button
                  onClick={() => setActiveTab('sent')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  View All &rarr;
                </button>
              </div>
              <SentEmailsTable
                emails={sentEmails.slice(0, 5)}
                isLoading={isLoadingSent}
                isError={isErrorSent}
                onRefresh={loadSent}
                onComposeClick={onOpenCompose}
              />
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <ScheduledEmailsTable
            emails={scheduledEmails}
            isLoading={isLoadingScheduled}
            isError={isErrorScheduled}
            onRefresh={loadScheduled}
            onComposeClick={onOpenCompose}
          />
        )}

        {activeTab === 'sent' && (
          <SentEmailsTable
            emails={sentEmails}
            isLoading={isLoadingSent}
            isError={isErrorSent}
            onRefresh={loadSent}
            onComposeClick={onOpenCompose}
          />
        )}
      </div>
    </div>
  );
};
