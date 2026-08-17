import { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { FloatingActions } from "./components/FloatingActions";
import { ServiceRequestModal } from "./components/ServiceRequestModal";
import { StructuredData } from "./components/StructuredData";
import { servicesData, type ServiceItem } from "./config/services";

// Lazy Loaded Pages for Instant Initial Render & Fast Performance
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const PrintingPage = lazy(() => import("./pages/PrintingPage").then((m) => ({ default: m.PrintingPage })));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));

// ⚡ Instant Online Services Pages
const OnlineServicesPage = lazy(() => import("./pages/OnlineServicesPage").then((m) => ({ default: m.OnlineServicesPage })));
const DocumentPrintingPage = lazy(() => import("./pages/online-services/DocumentPrintingPage").then((m) => ({ default: m.DocumentPrintingPage })));
const PassportPhotoPage = lazy(() => import("./pages/online-services/PassportPhotoPage").then((m) => ({ default: m.PassportPhotoPage })));
const VisitingCardsPage = lazy(() => import("./pages/online-services/VisitingCardsPage").then((m) => ({ default: m.VisitingCardsPage })));
const InvitationCardsPage = lazy(() => import("./pages/online-services/InvitationCardsPage").then((m) => ({ default: m.InvitationCardsPage })));
const IdCardsPage = lazy(() => import("./pages/online-services/IdCardsPage").then((m) => ({ default: m.IdCardsPage })));
const PosterBannerPage = lazy(() => import("./pages/online-services/PosterBannerPage").then((m) => ({ default: m.PosterBannerPage })));
const CustomPrintPage = lazy(() => import("./pages/online-services/CustomPrintPage").then((m) => ({ default: m.CustomPrintPage })));

// Digital & CSC Citizen Services
const DigitalServicesPage = lazy(() => import("./pages/DigitalServicesPage").then((m) => ({ default: m.DigitalServicesPage })));
const DigitalServiceDetailPage = lazy(() => import("./pages/DigitalServiceDetailPage").then((m) => ({ default: m.DigitalServiceDetailPage })));

// Other Core Pages
const BusinessPage = lazy(() => import("./pages/BusinessPage").then((m) => ({ default: m.BusinessPage })));
const WeddingEventsPage = lazy(() => import("./pages/WeddingEventsPage").then((m) => ({ default: m.WeddingEventsPage })));
const WeddingCardDetailPage = lazy(() => import("./pages/WeddingCardDetailPage").then((m) => ({ default: m.WeddingCardDetailPage })));
const DesignServicesPage = lazy(() => import("./pages/DesignServicesPage").then((m) => ({ default: m.DesignServicesPage })));
const RequestQuotePage = lazy(() => import("./pages/RequestQuotePage").then((m) => ({ default: m.RequestQuotePage })));
const CartPage = lazy(() => import("./pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage").then((m) => ({ default: m.TrackOrderPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage").then((m) => ({ default: m.AuthCallbackPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const FAQPage = lazy(() => import("./pages/FAQPage").then((m) => ({ default: m.FAQPage })));
const WorkPage = lazy(() => import("./pages/WorkPage").then((m) => ({ default: m.WorkPage })));
const WebsiteDevPage = lazy(() => import("./pages/WebsiteDevPage").then((m) => ({ default: m.WebsiteDevPage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazy(() => import("./pages/ServiceDetailPage").then((m) => ({ default: m.ServiceDetailPage })));
const PrivacyPage = lazy(() => import("./pages/LegalPages").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("./pages/LegalPages").then((m) => ({ default: m.TermsPage })));
const RefundPolicyPage = lazy(() => import("./pages/LegalPages").then((m) => ({ default: m.RefundPolicyPage })));

// Loading spinner component
const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#123B70] border-t-transparent" />
      <span className="text-xs font-semibold text-slate-500">Loading Palak Enterprises...</span>
    </div>
  </div>
);

// Scroll to top on route change
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      const element = document.getElementById(hash.replace("#", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [pathname, hash]);

  return null;
}

export function AppContent() {
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [modalService, setModalService] = useState<ServiceItem | null>(null);
  const [modalPaymentMethod, setModalPaymentMethod] = useState<"pay_online" | "pay_at_shop" | undefined>(undefined);

  const handleOpenRequestModal = (serviceId?: string, paymentMethod?: "pay_online" | "pay_at_shop") => {
    if (serviceId) {
      const s = servicesData.find((item) => item.id === serviceId);
      setModalService(s || null);
    } else {
      setModalService(null);
    }
    setModalPaymentMethod(paymentMethod);
    setRequestModalOpen(true);
  };

  const handleSelectServiceCard = (service: ServiceItem) => {
    setModalService(service);
    setModalPaymentMethod(undefined);
    setRequestModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] font-sans selection:bg-[#123B70] selection:text-white pb-16 md:pb-0">
      <StructuredData />
      <ScrollToTop />

      {/* Global Header Navigation */}
      <Header onOpenRequestModal={() => handleOpenRequestModal()} />

      {/* Dynamic Page Routes with Suspense */}
      <main className="flex-grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />

            {/* ⚡ 7 Instant Online Services Routes */}
            <Route path="/online-services" element={<OnlineServicesPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
            <Route path="/online-services/document-printing" element={<DocumentPrintingPage />} />
            <Route path="/online-services/passport-photo" element={<PassportPhotoPage />} />
            <Route path="/online-services/visiting-cards" element={<VisitingCardsPage />} />
            <Route path="/online-services/invitation-cards" element={<InvitationCardsPage />} />
            <Route path="/online-services/id-cards" element={<IdCardsPage />} />
            <Route path="/online-services/poster-banner" element={<PosterBannerPage />} />
            <Route path="/online-services/custom-print" element={<CustomPrintPage />} />

            {/* Printing Catalog & Product Details */}
            <Route path="/printing" element={<PrintingPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
            <Route path="/printing/:slug" element={<ProductDetailPage />} />
            <Route path="/products" element={<PrintingPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />

            {/* Digital & CSC Services */}
            <Route path="/digital-services" element={<DigitalServicesPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
            <Route path="/digital-services/:slug" element={<DigitalServiceDetailPage />} />

            {/* Business & Bulk Printing Solutions */}
            <Route path="/business" element={<BusinessPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
            <Route path="/business/:slug" element={<BusinessPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
            <Route path="/website-development" element={<WebsiteDevPage onOpenRequestModal={() => handleOpenRequestModal()} />} />

            {/* Wedding & Ceremony Cards */}
            <Route path="/wedding-events" element={<WeddingEventsPage />} />
            <Route path="/wedding-events/:slug" element={<WeddingCardDetailPage />} />
            <Route path="/wedding-events/wedding-cards/:slug" element={<WeddingCardDetailPage />} />

            {/* Graphic Design Studio */}
            <Route path="/design-services" element={<DesignServicesPage />} />

            {/* Quote Requests */}
            <Route path="/request-quote" element={<RequestQuotePage />} />
            <Route path="/request" element={<RequestQuotePage />} />

            {/* Shopping Cart & Checkout */}
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* Universal Tracking */}
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/order-status" element={<TrackOrderPage />} />

            {/* Customer Portal, Authentication & Admin ERP */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signin" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/register" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/account/orders" element={<AccountPage />} />
            <Route path="/account/requests" element={<AccountPage />} />
            <Route path="/admin" element={<AdminPage />} />

            {/* Compatible Informational Pages */}
            <Route path="/services" element={<ServicesPage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
            <Route path="/services/:category/:serviceSlug" element={<ServiceDetailPage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
            <Route path="/services/:slug" element={<ServiceDetailPage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
            <Route path="/work" element={<WorkPage onOpenRequestModal={handleOpenRequestModal} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />

            {/* Legal & Policy Pages */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<HomePage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Floating Action Buttons */}
      <FloatingActions />

      {/* Mobile Bottom Fixed Bar */}
      <MobileBottomNav onOpenRequestModal={() => handleOpenRequestModal()} />

      {/* Interactive Service Request & Upload Modal */}
      <ServiceRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        selectedService={modalService}
        initialPaymentMethod={modalPaymentMethod}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AccessibilityProvider>
          <AuthProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </AuthProvider>
        </AccessibilityProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
