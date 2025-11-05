import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Copy, Check, AlertCircle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface GroqAPIKeySetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providedKey?: string;
}

export function GroqAPIKeySetup({ open, onOpenChange, providedKey }: GroqAPIKeySetupProps) {
  const [apiKey, setApiKey] = useState(providedKey || '');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    configured: boolean;
    valid: boolean;
    preview?: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      checkKeyStatus();
    }
  }, [open]);

  const checkKeyStatus = async () => {
    try {
      setTesting(true);
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/ai/status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKeyStatus({
          configured: data.configured,
          valid: data.keyFormat?.startsWithGsk || false,
          preview: data.keyFormat?.preview,
        });
      }
    } catch (error) {
      console.error('Failed to check key status:', error);
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    if (!navigator.clipboard) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = apiKey;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('API key copied to clipboard');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
        toast.error('Failed to copy. Please copy manually.');
      } finally {
        document.body.removeChild(textArea);
      }
      return;
    }

    navigator.clipboard.writeText(apiKey)
      .then(() => {
        setCopied(true);
        toast.success('API key copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Clipboard copy failed:', err);
        toast.error('Failed to copy. Please copy manually.');
      });
  };

  const validateKey = (key: string): boolean => {
    return key.startsWith('gsk_') && key.length > 20;
  };

  const isValidKey = validateKey(apiKey);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Groq API Key Setup</span>
            {keyStatus?.configured && keyStatus?.valid ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Set up your Groq API key to enable AI-powered features like document text extraction, photo tagging, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          {keyStatus && (
            <Alert className={keyStatus.configured && keyStatus.valid ? 'border-green-600 bg-green-50' : 'border-yellow-600 bg-yellow-50'}>
              <AlertDescription>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium mb-1">
                      {keyStatus.configured && keyStatus.valid
                        ? '✅ API key is configured and valid'
                        : keyStatus.configured
                        ? '⚠️ API key is configured but appears to be invalid or a hash'
                        : '⚠️ API key needs to be configured'}
                    </p>
                    {keyStatus.preview && (
                      <p className="text-xs text-muted-foreground">
                        Current key: {keyStatus.preview}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={checkKeyStatus}
                    disabled={testing}
                  >
                    <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium mb-2">Step 1: Get Your API Key</h4>
              <p className="text-sm text-muted-foreground mb-2">
                If you don't have a Groq API key, get one for free:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.groq.com/keys', '_blank')}
                className="w-full justify-start"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Groq Console (console.groq.com/keys)
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Step 2: Copy Your API Key</h4>
              <div className="space-y-2">
                <Label htmlFor="api-key">Groq API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className={`font-mono text-xs ${
                      apiKey && !isValidKey ? 'border-red-500' : ''
                    }`}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    disabled={!apiKey}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {apiKey && !isValidKey && (
                  <p className="text-xs text-red-600">
                    Invalid format. Groq API keys should start with "gsk_"
                  </p>
                )}
                {apiKey && isValidKey && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Valid format
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Step 3: Set Environment Variable</h4>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2">You need to set the environment variable in your deployment:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Look for a modal/popup that appeared when you requested API key setup</li>
                    <li>If no modal appeared, access your Supabase project settings</li>
                    <li>Navigate to Edge Functions → Environment Variables</li>
                    <li>Find <code className="bg-gray-100 px-1 rounded">GROQ_API_KEY</code></li>
                    <li>Paste your API key (click copy button above)</li>
                    <li>Save and redeploy the Edge Functions</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>

            {/* Manual Setup Code */}
            <div>
              <h4 className="text-sm font-medium mb-2">Alternative: Manual Setup</h4>
              <div className="bg-gray-50 p-3 rounded-md border">
                <p className="text-xs text-muted-foreground mb-2">
                  If you have access to Supabase CLI:
                </p>
                <code className="text-xs block bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
                  supabase secrets set GROQ_API_KEY={apiKey || 'your-key-here'}
                </code>
              </div>
            </div>
          </div>

          {/* Features that will be enabled */}
          <div>
            <h4 className="text-sm font-medium mb-2">Features Enabled:</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Document Text Extraction',
                'Photo Tagging',
                'Smart Search',
                'Memory Insights',
                'AI Chat Assistant',
                'Voice Translation',
              ].map((feature) => (
                <div
                  key={feature}
                  className="text-xs bg-gray-50 p-2 rounded border flex items-center gap-2"
                >
                  {keyStatus?.configured && keyStatus?.valid ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                  )}
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={checkKeyStatus} disabled={testing}>
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}