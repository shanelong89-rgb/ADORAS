/**
 * Twilio SMS Test Component
 * Quick test interface for sending SMS invitations
 * 
 * To use: Add <TwilioSMSTest /> to your dashboard during testing
 */

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TwilioSMSTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tellerName, setTellerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSendSMS = async () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    // Validate E.164 format
    if (!phoneNumber.startsWith('+')) {
      toast.error('Phone number must start with + and country code (e.g., +15551234567)');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Get access token from localStorage
      const accessToken = localStorage.getItem('adoras-access-token');
      if (!accessToken) {
        toast.error('Not logged in');
        return;
      }

      // Get Supabase info
      const { projectId } = await import('../utils/supabase/info');

      // Send invitation
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/invitations/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tellerPhoneNumber: phoneNumber,
            tellerName: tellerName || undefined,
          }),
        }
      );

      const data = await response.json();
      setResult(data);

      if (data.success) {
        if (data.smsSent) {
          toast.success('SMS sent successfully! 🎉');
        } else {
          toast.warning('Invitation created, but SMS failed to send', {
            description: data.smsError || 'SMS service may not be configured',
          });
        }
      } else {
        toast.error('Failed to create invitation', {
          description: data.error,
        });
      }
    } catch (error) {
      console.error('SMS test error:', error);
      toast.error('Test failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setResult({ success: false, error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h3 
            className="mb-2"
            style={{ fontFamily: 'Archivo', letterSpacing: '0.05em' }}
          >
            Twilio SMS Test
          </h3>
          <p 
            className="text-sm text-muted-foreground"
            style={{ fontFamily: 'Inter' }}
          >
            Test sending SMS invitations
          </p>
        </div>

        {/* Phone Number Input */}
        <div>
          <label 
            className="text-sm mb-2 block"
            style={{ fontFamily: 'Inter' }}
          >
            Phone Number (E.164 format)
          </label>
          <Input
            type="tel"
            placeholder="+15551234567"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={loading}
            style={{ fontFamily: 'Inter' }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Include + and country code
          </p>
        </div>

        {/* Teller Name Input */}
        <div>
          <label 
            className="text-sm mb-2 block"
            style={{ fontFamily: 'Inter' }}
          >
            Recipient Name (optional)
          </label>
          <Input
            type="text"
            placeholder="Mom"
            value={tellerName}
            onChange={(e) => setTellerName(e.target.value)}
            disabled={loading}
            style={{ fontFamily: 'Inter' }}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendSMS}
          disabled={loading || !phoneNumber}
          className="w-full"
          style={{ fontFamily: 'Inter', letterSpacing: '0.025em' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test SMS
            </>
          )}
        </Button>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2 mb-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p 
                  className={`mb-2 ${
                    result.success 
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}
                  style={{ fontFamily: 'Inter' }}
                >
                  {result.success ? 'Success!' : 'Failed'}
                </p>

                {result.success && (
                  <div className="text-xs space-y-1">
                    <p>
                      <strong>Invitation Code:</strong> {result.invitation?.code}
                    </p>
                    <p>
                      <strong>SMS Sent:</strong> {result.smsSent ? '✅ Yes' : '❌ No'}
                    </p>
                    {result.smsSent && result.messageId && (
                      <p>
                        <strong>Message ID:</strong> {result.messageId}
                      </p>
                    )}
                    {!result.smsSent && result.smsError && (
                      <p className="text-orange-600 dark:text-orange-400">
                        <strong>SMS Error:</strong> {result.smsError}
                      </p>
                    )}
                    <p>
                      <strong>Expires:</strong> {new Date(result.invitation?.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {!result.success && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {result.error}
                  </p>
                )}
              </div>
            </div>

            {/* View JSON */}
            <details className="text-xs">
              <summary className="cursor-pointer hover:underline mb-2">
                View full response
              </summary>
              <pre className="overflow-auto p-2 bg-background rounded text-xs">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 bg-muted rounded-lg text-xs space-y-2">
          <p style={{ fontFamily: 'Inter' }}>
            <strong>Setup Required:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Get Twilio credentials from console</li>
            <li>Upload TWILIO_ACCOUNT_SID</li>
            <li>Upload TWILIO_AUTH_TOKEN</li>
            <li>Upload TWILIO_PHONE_NUMBER</li>
            <li>Enter test phone number above</li>
          </ol>
          <p className="text-muted-foreground">
            See <code>TWILIO_SMS_SETUP.md</code> for detailed instructions.
          </p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Hook to programmatically send invitations
 */
export function useSendInvitation() {
  const [loading, setLoading] = useState(false);

  const sendInvitation = async (params: {
    tellerPhoneNumber: string;
    tellerName?: string;
  }) => {
    setLoading(true);

    try {
      const accessToken = localStorage.getItem('adoras-access-token');
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const { projectId } = await import('../utils/supabase/info');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-deded1eb/invitations/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      return result;
    } finally {
      setLoading(false);
    }
  };

  return { sendInvitation, loading };
}
