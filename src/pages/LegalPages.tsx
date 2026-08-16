import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { business } from "../config/business";

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">Palak Enterprises Policies</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Privacy & Data Security Policy</h1>
          <p className="text-xs text-slate-400 mt-0.5">Last updated: August 2026</p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          <p>
            At <strong>Palak Enterprises</strong> (CSC Center ID: {business.registrations.cscId}), protecting your personal identity documents, certificates, and printing artwork is our highest priority.
          </p>

          <h3 className="font-bold text-slate-900 text-base">1. Information We Collect</h3>
          <p>
            We collect personal details (such as Name, Mobile number, Address, and uploaded files/certificates) strictly for fulfilling your printing orders, submitting government RTPS/PAN applications, or delivering completed jobs.
          </p>

          <h3 className="font-bold text-slate-900 text-base">2. Handling of Government ID Documents</h3>
          <p>
            Customer documents (such as Aadhaar, Marksheets, Ration Cards) are processed through secure channels. We do not sell, distribute, or publicly expose your private files or biometric data to any unauthorized third parties.
          </p>

          <h3 className="font-bold text-slate-900 text-base">3. Data Retention & Erasure</h3>
          <p>
            You may request complete removal of your uploaded design files from our printing servers at any time by contacting our Chakia store.
          </p>
        </div>
      </div>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">Palak Enterprises Policies</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Terms of Service & Usage</h1>
          <p className="text-xs text-slate-400 mt-0.5">Last updated: August 2026</p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          <h3 className="font-bold text-slate-900 text-base">1. Order Confirmation & Proof Approval</h3>
          <p>
            For customized printing (such as Visiting Cards, Wedding Cards, Flex Banners), our graphic designer shares a digital proof. Once approved by the customer, production begins. Customers are responsible for verifying spellings, phone numbers, and dates on proofs.
          </p>

          <h3 className="font-bold text-slate-900 text-base">2. Digital & Online Applications</h3>
          <p>
            Palak Enterprises functions as an assisted Common Service Center (CSC). We assist citizens in filling forms accurately. Approval or rejection of government benefits is governed solely by statutory government departments.
          </p>
        </div>
      </div>
    </div>
  );
};

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F8FA] py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#123B70]">Palak Enterprises Policies</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Reprint & Refund Policy</h1>
          <p className="text-xs text-slate-400 mt-0.5">Last updated: August 2026</p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          <h3 className="font-bold text-slate-900 text-base">1. Printing Quality Guarantee</h3>
          <p>
            If any physical product exhibits machine manufacturing defects, misaligned cuts, or ink smudging caused on our end, Palak Enterprises will reprint your order free of charge or issue a full refund within 48 hours.
          </p>

          <h3 className="font-bold text-slate-900 text-base">2. Order Cancellations</h3>
          <p>
            Orders may be cancelled freely before file approval and machine production begins. Once customized printing is on press, paper costs cannot be recovered.
          </p>
        </div>
      </div>
    </div>
  );
};
