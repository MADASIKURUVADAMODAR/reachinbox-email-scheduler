import React, { useState } from 'react';
import { Search, RefreshCw, Calendar, AlertCircle, Inbox } from 'lucide-react';
import type { EmailRecord } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

interface ScheduledEmailsTableProps {
  emails: EmailRecord[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  onComposeClick: () => void;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  emails,
  isLoading,
  isError,
  onRefresh,
  onComposeClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmails = emails.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.recipientEmail.toLowerCase().includes(term) ||
      item.subject.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email or subject..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                </div>
                <div className="h-6 w-20 bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">Failed to load scheduled emails</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              We encountered an issue connecting to the email scheduler service.
            </p>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              Try Again
            </Button>
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400">
              <Inbox className="w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">No scheduled emails found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchTerm
                  ? 'No scheduled emails match your search query.'
                  : 'Get started by creating your first automated email campaign.'}
              </p>
            </div>
            {!searchTerm && (
              <Button variant="primary" size="sm" onClick={onComposeClick}>
                Compose New Email
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800/80">
                <tr>
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Scheduled Time</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmails.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                          {item.recipientEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[220px]">{item.recipientEmail}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      <div className="truncate max-w-[280px] font-medium" title={item.subject}>
                        {item.subject}
                      </div>
                      <div className="truncate max-w-[280px] text-[11px] text-slate-500 mt-0.5">
                        {item.body}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{formatDate(item.scheduledAt)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
