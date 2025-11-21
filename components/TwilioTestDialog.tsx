/**
 * Twilio SMS Test Dialog
 * Allows testing Twilio SMS integration for invitations
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { MessageSquare, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../utils/api/client';

interface TwilioTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TwilioTestDialog({ isOpen, onClose }: TwilioTestDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    troubleshooting?: string[];
  } | null>(null);

  const handleTestSMS = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    // Clean the phone number - remove all non-digits
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Format phone number - if it already starts with country code, use as-is
    // Otherwise assume US (+1)
    let formattedPhone: string;
    if (phoneNumber.trim().startsWith('+')) {
      // User already provided country code
      formattedPhone = `+${cleanPhone}`;
    } else if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
      // US number starting with 1
      formattedPhone = `+${cleanPhone}`;
    } else if (cleanPhone.length === 10) {
      // 10 digit number, assume US
      formattedPhone = `+1${cleanPhone}`;
    } else {
      // International number without + prefix - use as entered
      formattedPhone = `+${cleanPhone}`;
    }
    
    const message = testMessage.trim() || 'Test message from Adoras! Your Twilio SMS integration is working correctly. 🎉';

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await apiClient.testSMS(formattedPhone, message);

      if (result.success) {
        setTestResult({
          success: true,
          message: 'SMS sent successfully!',
          details: `Message ID: ${result.messageId || 'N/A'}`,
        });
        toast.success('Test SMS sent successfully!');
      } else {
        setTestResult({
          success: false,
          message: 'SMS sending failed',
          details: result.error || 'Unknown error',
          troubleshooting: result.troubleshooting,
        });
        toast.error('Failed to send test SMS');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
      toast.error('Network error while testing SMS');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPhoneNumber('');
      setTestMessage('');
      setTestResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Archivo', letterSpacing: '-0.05em' }}>
            Test Twilio SMS Integration
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter' }}>
            Send a test SMS to verify your Twilio configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Configuration Status */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 mb-1" style={{ fontFamily: 'Archivo' }}>
                  Twilio Configuration
                </h4>
                <p className="text-xs text-blue-700" style={{ fontFamily: 'Inter' }}>
                  Make sure you have configured the following environment variables in your Supabase project:
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside" style={{ fontFamily: 'Inter' }}>
                  <li>TWILIO_ACCOUNT_SID</li>
                  <li>TWILIO_AUTH_TOKEN</li>
                  <li>TWILIO_PHONE_NUMBER</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${ 
              testResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold mb-1 ${
                    testResult.success ? 'text-green-900' : 'text-red-900'
                  }`} style={{ fontFamily: 'Archivo' }}>
                    {testResult.message}
                  </h4>
                  {testResult.details && (
                    <p className={`text-xs mb-2 ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`} style={{ fontFamily: 'Inter' }}>
                      {testResult.details}
                    </p>
                  )}
                  {testResult.troubleshooting && testResult.troubleshooting.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="text-xs font-semibold text-red-900 mb-2" style={{ fontFamily: 'Archivo' }}>
                        How to fix:
                      </p>
                      <ul className="text-xs text-red-700 space-y-1.5" style={{ fontFamily: 'Inter' }}>
                        {testResult.troubleshooting.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="test-phone" style={{ fontFamily: 'Inter' }}>
              Test Phone Number *
            </Label>
            <Input
              id="test-phone"
              type="tel"
              placeholder="+852 6794 1695 or +1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              style={{ fontFamily: 'Inter' }}
            />
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
              Include country code (e.g., +852 for Hong Kong, +1 for US)
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200" style={{ fontFamily: 'Inter' }}>
              💡 <strong>Troubleshooting tip:</strong> If international SMS fails, try a US number first (+1...) to verify Twilio is working.
            </p>
          </div>

          {/* Custom Message (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="test-message" style={{ fontFamily: 'Inter' }}>
              Custom Message (Optional)
            </Label>
            <Input
              id="test-message"
              placeholder="Test message from Adoras"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              disabled={isLoading}
              style={{ fontFamily: 'Inter' }}
            />
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>
              Leave blank to use default test message
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
              style={{ fontFamily: 'Inter' }}
            >
              Close
            </Button>
            <Button
              onClick={handleTestSMS}
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-primary/90"
              style={{ fontFamily: 'Inter' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Test SMS
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
