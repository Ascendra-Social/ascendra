import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Upload, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from 'framer-motion';

export default function VerificationFlow({ isOpen, onClose, user, onVerified }) {
  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState('drivers_license');
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    
    switch(type) {
      case 'front':
        setFrontFile(file);
        setFrontPreview(preview);
        break;
      case 'back':
        setBackFile(file);
        setBackPreview(preview);
        break;
      case 'selfie':
        setSelfieFile(file);
        setSelfiePreview(preview);
        break;
    }
  };

  const handleSubmit = async () => {
    if (!frontFile || !selfieFile) {
      setError('Please upload all required documents');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Upload documents
      const { file_url: frontUrl } = await base44.integrations.Core.UploadFile({ file: frontFile });
      let backUrl = null;
      if (backFile) {
        const result = await base44.integrations.Core.UploadFile({ file: backFile });
        backUrl = result.file_url;
      }
      const { file_url: selfieUrl } = await base44.integrations.Core.UploadFile({ file: selfieFile });

      // Create verification request
      await base44.entities.IDVerification.create({
        user_id: user.id,
        user_name: user.full_name,
        user_email: user.email,
        document_type: documentType,
        document_front_url: frontUrl,
        document_back_url: backUrl,
        selfie_url: selfieUrl,
        status: 'pending'
      });

      setStep(3); // Success step
      
      // Update user to mark verification as submitted
      await base44.auth.updateMe({ verification_submitted: true });

    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      title: 'Choose Document Type',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Select the type of government-issued ID you'll use
          </p>
          <RadioGroup value={documentType} onValueChange={setDocumentType}>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-violet-300 transition-all">
                <RadioGroupItem value="drivers_license" id="dl" />
                <div>
                  <p className="font-medium text-slate-800">Driver's License</p>
                  <p className="text-xs text-slate-500">Valid government driver's license</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-violet-300 transition-all">
                <RadioGroupItem value="passport" id="passport" />
                <div>
                  <p className="font-medium text-slate-800">Passport</p>
                  <p className="text-xs text-slate-500">Valid passport</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer hover:border-violet-300 transition-all">
                <RadioGroupItem value="national_id" id="national" />
                <div>
                  <p className="font-medium text-slate-800">National ID Card</p>
                  <p className="text-xs text-slate-500">Government-issued ID card</p>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>
      )
    },
    {
      title: 'Upload ID Document',
      content: (
        <div className="space-y-4">
          <Alert className="rounded-xl border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Your documents are encrypted and stored securely. We never share your information.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Front of Document *
            </Label>
            {frontPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={frontPreview} alt="" className="w-full h-48 object-cover" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setFrontFile(null);
                    setFrontPreview(null);
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-all">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Click to upload front</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'front')}
                />
              </label>
            )}
          </div>

          {documentType !== 'passport' && (
            <div>
              <Label className="text-sm font-medium text-slate-700 mb-2 block">
                Back of Document
              </Label>
              {backPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={backPreview} alt="" className="w-full h-48 object-cover" />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setBackFile(null);
                      setBackPreview(null);
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">Click to upload back</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, 'back')}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Take a Selfie',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Take a clear selfie to verify your identity
          </p>
          {selfiePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={selfiePreview} alt="" className="w-full h-64 object-cover" />
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => {
                  setSelfieFile(null);
                  setSelfiePreview(null);
                }}
              >
                Retake
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-violet-300 hover:bg-violet-50 transition-all">
              <Camera className="w-12 h-12 text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Click to take selfie</p>
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'selfie')}
              />
            </label>
          )}
        </div>
      )
    },
    {
      title: 'Verification Submitted',
      content: (
        <div className="text-center space-y-4 py-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Verification Submitted!
            </h3>
            <p className="text-slate-600">
              Our team will review your documents within 24-48 hours. You'll receive an email once verified.
            </p>
          </div>
        </div>
      )
    }
  ];

  const canProceed = () => {
    if (step === 1) return frontFile && (documentType === 'passport' || backFile);
    if (step === 2) return selfieFile;
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" />
            Identity Verification
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {error && (
            <Alert variant="destructive" className="rounded-xl mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-800">{steps[step].title}</h3>
              <span className="text-xs text-slate-500">Step {step + 1} of 4</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                style={{ width: `${((step + 1) / 4) * 100}%` }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {steps[step].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {step < 3 && (
          <div className="flex justify-between p-6 pt-0 border-t border-slate-100">
            <Button
              variant="ghost"
              onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            >
              {step === 0 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              onClick={() => {
                if (step === 2) {
                  handleSubmit();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={!canProceed() || isSubmitting}
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === 2 ? (
                'Submit'
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="p-6 pt-0">
            <Button
              onClick={() => {
                onClose();
                if (onVerified) onVerified();
              }}
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-xl"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}