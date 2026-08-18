import React, { useState, useRef } from 'react';
import { Upload, Mail, Clock, Zap, Users, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultStartTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    // Format to YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState(user?.email || 'sender@reachinbox.ai');
  const [recipientsText, setRecipientsText] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(defaultStartTime());
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper to extract clean unique emails
  const extractEmails = (text: string): string[] => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));
  };

  const handleRecipientsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRecipientsText(val);
    const extracted = extractEmails(val);
    setParsedRecipients(extracted);
    if (errors.recipients) {
      setErrors((prev) => ({ ...prev, recipients: '' }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        complete: (results) => {
          const text = JSON.stringify(results.data);
          const extracted = extractEmails(text);
          setParsedRecipients((prev) => Array.from(new Set([...prev, ...extracted])));
          setRecipientsText((prev) => (prev ? prev + '\n' + extracted.join('\n') : extracted.join('\n')));
          setIsUploading(false);
          addToast('success', 'CSV Parsed', `Extracted ${extracted.length} valid email addresses.`);
        },
        error: (err) => {
          setIsUploading(false);
          addToast('error', 'Parse Failed', err.message);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        const extracted = extractEmails(text);
        setParsedRecipients((prev) => Array.from(new Set([...prev, ...extracted])));
        setRecipientsText((prev) => (prev ? prev + '\n' + extracted.join('\n') : extracted.join('\n')));
        setIsUploading(false);
        addToast('success', 'File Parsed', `Extracted ${extracted.length} valid email addresses.`);
      };
      reader.onerror = () => {
        setIsUploading(false);
        addToast('error', 'File Read Error', 'Could not read file.');
      };
      reader.readAsText(file);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!subject.trim()) errs.subject = 'Subject is required';
    if (!body.trim()) errs.body = 'Email body is required';
    if (!senderEmail.trim()) errs.senderEmail = 'Sender email is required';

    if (parsedRecipients.length === 0) {
      errs.recipients = 'At least one valid recipient email is required';
    }

    if (!startTime) {
      errs.startTime = 'Start time is required';
    } else {
      const selectedMs = new Date(startTime).getTime();
      if (Number.isNaN(selectedMs) || selectedMs <= Date.now()) {
        errs.startTime = 'Start time must be in the future';
      }
    }

    if (delaySeconds < 0) {
      errs.delaySeconds = 'Delay cannot be negative';
    }

    if (hourlyLimit <= 0) {
      errs.hourlyLimit = 'Hourly limit must be greater than 0';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      const scheduledAtIso = new Date(startTime).toISOString();

      await api.scheduleEmail({
        senderEmail,
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt: scheduledAtIso,
        recipients: parsedRecipients,
      });

      addToast(
        'success',
        'Campaign Scheduled!',
        `Successfully queued ${parsedRecipients.length} email(s) for delivery.`
      );

      // Reset form
      setSubject('');
      setBody('');
      setRecipientsText('');
      setParsedRecipients([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to schedule campaign';
      addToast('error', 'Scheduling Error', msg);

      if (err.errors) {
        const fieldErrs: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.errors)) {
          fieldErrs[key] = (msgs as string[]).join(', ');
        }
        setErrors(fieldErrs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Email Campaign"
      subtitle="Schedule automated asynchronous emails with rate limits"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Sender & Subject */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Sender Email"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="you@reachinbox.ai"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.senderEmail}
          />
          <Input
            label="Hourly Rate Limit"
            type="number"
            min={1}
            max={5000}
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(Number(e.target.value))}
            leftIcon={<Zap className="w-4 h-4 text-amber-400" />}
            error={errors.hourlyLimit}
          />
        </div>

        <Input
          label="Subject Line"
          type="text"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            if (errors.subject) setErrors((prev) => ({ ...prev, subject: '' }));
          }}
          placeholder="e.g. Accelerate your outbound email campaigns"
          error={errors.subject}
        />

        {/* Recipients & CSV Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Recipients
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isUploading}
                leftIcon={<Upload className="w-3.5 h-3.5 text-blue-400" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload CSV / File
              </Button>
            </div>
          </div>

          <Textarea
            rows={3}
            value={recipientsText}
            onChange={handleRecipientsTextChange}
            placeholder="Paste recipient email addresses separated by commas, spaces or newlines..."
            error={errors.recipients}
          />

          {/* Detected Emails Counter Banner */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Users className="w-4 h-4 text-blue-400" />
              <span>
                Detected Email Addresses:{' '}
                <strong className="text-blue-400 font-bold">{parsedRecipients.length}</strong>
              </span>
            </div>
            {parsedRecipients.length > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Validated
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <Textarea
          label="Email Content (Body)"
          rows={5}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (errors.body) setErrors((prev) => ({ ...prev, body: '' }));
          }}
          placeholder="Type your email message body here..."
          error={errors.body}
        />

        {/* Schedule Timing & Delay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <Input
            label="Start Scheduled Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: '' }));
            }}
            leftIcon={<Clock className="w-4 h-4 text-blue-400" />}
            error={errors.startTime}
          />

          <Input
            label="Delay Between Emails (seconds)"
            type="number"
            min={0}
            step={1}
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Number(e.target.value))}
            leftIcon={<Zap className="w-4 h-4 text-indigo-400" />}
            helperText="Minimum spacing between queued recipient jobs"
            error={errors.delaySeconds}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} leftIcon={<Mail className="w-4 h-4" />}>
            Schedule Campaign
          </Button>
        </div>
      </form>
    </Modal>
  );
};
