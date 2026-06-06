import { useState } from 'react';
import { Copy, X, Share2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function ShareCodeButton() {
  const session = useAuthStore((s) => s.session);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = session?.inviteCode;

  if (!code) return null;

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-cream-dark transition-colors"
        aria-label="Share invite code"
        title="Share invite code"
      >
        <Share2 size={18} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div
            className="bg-cream border border-border rounded-2xl p-6 mx-6 max-w-sm w-full shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-text-primary text-lg font-semibold">Invite your partner</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-text-secondary text-sm leading-relaxed mb-6">
              Share this code with your partner. They enter it when they open the app, and your kitchens link up instantly.
            </p>

            <div className="bg-white border border-border rounded-xl py-6 px-4 text-center mb-6">
              <p className="font-mono text-text-primary text-4xl md:text-5xl font-semibold tracking-[0.4em]">
                {code}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`w-full font-medium py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-sage text-white'
                  : 'bg-white border border-border text-text-primary hover:bg-cream-dark'
              }`}
            >
              {copied ? (
                <>Copied!</>
              ) : (
                <>
                  <Copy size={16} />
                  Copy code
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
