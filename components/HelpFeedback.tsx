import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { HelpCircle, MessageSquare, Book, Mail, ExternalLink, Star, Bug, Lightbulb, Send, FileQuestion, LifeBuoy } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

interface HelpFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpFeedback({ isOpen, onClose }: HelpFeedbackProps) {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback');
      return;
    }
    // In a real app, this would send to an API
    toast.success('Thank you for your feedback!');
    setFeedbackText('');
    setEmail('');
  };

  const faqs = [
    {
      question: 'How do I invite a storyteller?',
      answer: 'Go to Account Settings, then click "Invite Storyteller". You can send an invitation via email or share a QR code that they can scan to join your family memory network.'
    },
    {
      question: 'How are my memories organized?',
      answer: 'Memories are automatically organized by date, category (Photos, Videos, Voice, Chat), and tags. You can view them in the Media Library tab using calendar or grid view.'
    },
    {
      question: 'Can I edit photo dates and locations?',
      answer: 'Yes! As a Legacy Keeper, long-press any photo in the Media Library to edit its date, time, location, tags, and notes. The app automatically extracts EXIF data when available.'
    },
    {
      question: 'How does voice translation work?',
      answer: 'Voice notes are automatically transcribed and translated to English. You can toggle between the original language and translation by tapping the language icons.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes! All data is encrypted in transit and at rest. We follow industry-standard security practices and never share your personal information with third parties.'
    },
    {
      question: 'How much storage do I get?',
      answer: 'Free accounts include 15 GB of storage. You can upgrade to premium for unlimited storage and additional features.'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Archivo' }}>
            <HelpCircle className="w-5 h-5 text-primary" />
            Help & Feedback
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Inter' }}>
            Get help or share your thoughts about Adoras
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="help" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="help">Help Center</TabsTrigger>
            <TabsTrigger value="feedback">Send Feedback</TabsTrigger>
          </TabsList>

          {/* Help Center Tab */}
          <TabsContent value="help" className="space-y-6 py-4">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                QUICK HELP
              </h4>

              <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://adoras.app/docs', '_blank')}>
                <Book className="w-4 h-4 mr-2" />
                User Guide & Documentation
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>

              <Button variant="outline" className="w-full justify-start" onClick={() => window.open('https://adoras.app/tutorials', '_blank')}>
                <LifeBuoy className="w-4 h-4 mr-2" />
                Video Tutorials
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>

              <Button variant="outline" className="w-full justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>

            <Separator />

            {/* FAQs */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2" style={{ fontFamily: 'Inter' }}>
                <FileQuestion className="w-4 h-4" />
                FREQUENTLY ASKED QUESTIONS
              </h4>

              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm" style={{ fontFamily: 'Inter' }}>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter' }}>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <Separator />

            {/* App Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">App Version</span>
                <Badge variant="secondary">1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Build</span>
                <Badge variant="secondary">2025.01</Badge>
              </div>
            </div>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>Feedback Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    variant={feedbackType === 'bug' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setFeedbackType('bug')}
                  >
                    <Bug className="w-4 h-4 mr-1" />
                    Bug
                  </Button>
                  <Button
                    variant={feedbackType === 'feature' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setFeedbackType('feature')}
                  >
                    <Lightbulb className="w-4 h-4 mr-1" />
                    Feature
                  </Button>
                  <Button
                    variant={feedbackType === 'general' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setFeedbackType('general')}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    General
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="feedback" className="text-base font-medium" style={{ fontFamily: 'Inter' }}>
                  Your Feedback
                </Label>
                <Textarea
                  id="feedback"
                  placeholder={
                    feedbackType === 'bug'
                      ? 'Describe the issue you encountered...'
                      : feedbackType === 'feature'
                      ? 'Tell us about the feature you\'d like to see...'
                      : 'Share your thoughts with us...'
                  }
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[150px] mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-base font-medium" style={{ fontFamily: 'Inter' }}>
                  Email (optional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We'll only use this to follow up on your feedback
                </p>
              </div>

              <Separator />

              {/* Rate the App */}
              <div className="space-y-3">
                <Label className="text-base font-medium" style={{ fontFamily: 'Inter' }}>
                  How would you rate Adoras?
                </Label>
                <div className="flex gap-2 justify-center py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-8 h-8 cursor-pointer text-yellow-500 fill-yellow-500 hover:scale-110 transition-transform"
                      onClick={() => toast.success(`Thanks for rating us ${star} stars!`)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitFeedback} className="bg-primary">
                  <Send className="w-4 h-4 mr-2" />
                  Submit Feedback
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
