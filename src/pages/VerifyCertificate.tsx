import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { verifyCertificate } from '@/lib/api';

const VerifyCertificate = () => {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const data = await verifyCertificate(code.trim());
      setResult(data);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

  // Auto-verify if code in URL
  useEffect(() => {
    const initialCode = searchParams.get('code');
    if (initialCode) {
      setLoading(true);
      verifyCertificate(initialCode)
        .then(setResult)
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-accent" />
          <h1 className="text-2xl font-display font-bold text-foreground">Certificate Verification</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the verification code found on the certificate to verify its authenticity.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex gap-3 mb-6">
            <Input
              placeholder="Enter verification code"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              className="font-mono"
            />
            <Button onClick={handleVerify} disabled={loading} className="bg-primary text-primary-foreground gap-1 whitespace-nowrap">
              <Search className="w-4 h-4" /> {loading ? 'Checking...' : 'Verify'}
            </Button>
          </div>

          {result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <h3 className="font-display font-bold text-green-800 dark:text-green-300">Certificate Verified ✓</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium text-foreground">Name:</span> <span className="text-muted-foreground">{result.participant_name}</span></p>
                <p><span className="font-medium text-foreground">Workshop:</span> <span className="text-muted-foreground">{result.workshop_title}</span></p>
                <p><span className="font-medium text-foreground">Date:</span> <span className="text-muted-foreground">{new Date(result.workshop_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                <p><span className="font-medium text-foreground">Type:</span> <span className="text-muted-foreground capitalize">{result.certificate_type}</span></p>
                <p><span className="font-medium text-foreground">Issued by:</span> <span className="text-muted-foreground">{result.company_name}</span></p>
                <p><span className="font-medium text-foreground">Issued on:</span> <span className="text-muted-foreground">{new Date(result.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
              </div>
            </motion.div>
          )}

          {notFound && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-5">
              <div className="flex items-center gap-2">
                <ShieldX className="w-5 h-5 text-red-600" />
                <h3 className="font-display font-bold text-red-800 dark:text-red-300">Certificate Not Found</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-2">The verification code you entered does not match any certificate in our records. Please check the code and try again.</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyCertificate;