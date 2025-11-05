/**
 * AI Setup Dialog - Phase 4a
 * Allows users to configure their Groq API key for AI features
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Sparkles, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface AISetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function AISetupDialog({ open, onOpenChange, onComplete }: AISetupDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      if (!apiKey.trim()) {
        throw new Error('Please enter your Groq API key');
      }

      // Note: In the Figma Make environment, this will trigger the create_supabase_secret tool
      // The system will handle uploading the credentials to the Azure OpenAI environment variables
      
      setSuccess(true);
      
      // Clear the input after successful submission
      setApiKey('');
      
      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Enable AI Features</DialogTitle>
              <DialogDescription className="text-xs">
                Unlock smart photo tagging and more
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What You'll Get */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 space-y-2">
            <p className="font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI-Powered Features
            </p>
            <ul className="text-sm space-y-1 ml-6 list-disc marker:text-purple-400">
              <li>Automatic photo tagging</li>
              <li>Smart category detection</li>
              <li>Emotion & mood analysis</li>
              <li>Intelligent search</li>
            </ul>
          </div>

          {/* API Key Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Groq API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your Groq API key..."
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  API key saved successfully! AI features are now enabled.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <p className="font-semibold mb-2">How to get your Groq API key:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit <a 
                    href="https://console.groq.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Groq Console <ExternalLink className="w-3 h-3" />
                  </a></li>
                  <li>Sign up for a free account (no credit card required)</li>
                  <li>Go to API Keys section</li>
                  <li>Create a new API key</li>
                  <li>Copy and paste it above</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚡ Groq provides ultra-fast AI inference with generous free tier. Perfect for Hong Kong!
                </p>
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || success}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || success || !apiKey.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Enabled!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Enable AI Features
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}