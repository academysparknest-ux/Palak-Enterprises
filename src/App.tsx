import { useState, useEffect, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { FloatingActions } from "./components/FloatingActions";
import { StructuredData } from "./components/StructuredData";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageTransition } from "./components/ui/motion/PageTransition";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { servicesData, type ServiceItem } from "./config/services";
import { PalakDataStore } from "./lib/storage/store";
import { getProducts, getServices, getCategories } from "./lib/supabase/database";
import { supabase, isSupabaseConfigured } from "./lib/supabase/client";
import { cn } from "./lib/utils";
import { AdminRouteGuard } from "./components/admin/AdminRouteGuard";

const ServiceRequestModal = lazyWithRetry(() => import("./components/ServiceRequestModal").then((m) => ({ default: m.ServiceRequestModal })));


// Lazy Loaded Pages with Auto-Retry and Seamless Cache Recovery
const HomePage = lazyWithRetry(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const PrintingPage = lazyWithRetry(() => import("./pages/PrintingPage").then((m) => ({ default: m.PrintingPage })));
const ProductDetailPage = lazyWithRetry(() => import("./pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));

// ⚡ Instant Online Services Pages
const OnlineServicesPage = lazyWithRetry(() => import("./pages/OnlineServicesPage").then((m) => ({ default: m.OnlineServicesPage })));
const DocumentPrintingPage = lazyWithRetry(() => import("./pages/online-services/DocumentPrintingPage").then((m) => ({ default: m.DocumentPrintingPage })));
const PassportPhotoPage = lazyWithRetry(() => import("./pages/online-services/PassportPhotoPage").then((m) => ({ default: m.PassportPhotoPage })));
const VisitingCardsPage = lazyWithRetry(() => import("./pages/online-services/VisitingCardsPage").then((m) => ({ default: m.VisitingCardsPage })));
const InvitationCardsPage = lazyWithRetry(() => import("./pages/online-services/InvitationCardsPage").then((m) => ({ default: m.InvitationCardsPage })));
const IdCardsPage = lazyWithRetry(() => import("./pages/online-services/IdCardsPage").then((m) => ({ default: m.IdCardsPage })));
const PosterBannerPage = lazyWithRetry(() => import("./pages/online-services/PosterBannerPage").then((m) => ({ default: m.PosterBannerPage })));
const CustomPrintPage = lazyWithRetry(() => import("./pages/online-services/CustomPrintPage").then((m) => ({ default: m.CustomPrintPage })));

// Digital & CSC Citizen Services
const DigitalServicesPage = lazyWithRetry(() => import("./pages/DigitalServicesPage").then((m) => ({ default: m.DigitalServicesPage })));
const DigitalServiceDetailPage = lazyWithRetry(() => import("./pages/DigitalServiceDetailPage").then((m) => ({ default: m.DigitalServiceDetailPage })));

// Other Core Pages
const BusinessPage = lazyWithRetry(() => import("./pages/BusinessPage").then((m) => ({ default: m.BusinessPage })));
const WeddingEventsPage = lazyWithRetry(() => import("./pages/WeddingEventsPage").then((m) => ({ default: m.WeddingEventsPage })));
const WeddingCardDetailPage = lazyWithRetry(() => import("./pages/WeddingCardDetailPage").then((m) => ({ default: m.WeddingCardDetailPage })));
const DesignServicesPage = lazyWithRetry(() => import("./pages/DesignServicesPage").then((m) => ({ default: m.DesignServicesPage })));
const RequestQuotePage = lazyWithRetry(() => import("./pages/RequestQuotePage").then((m) => ({ default: m.RequestQuotePage })));
const CartPage = lazyWithRetry(() => import("./pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazyWithRetry(() => import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const TrackOrderPage = lazyWithRetry(() => import("./pages/TrackOrderPage").then((m) => ({ default: m.TrackOrderPage })));
const VerifyInvoicePage = lazyWithRetry(() => import("./pages/VerifyInvoicePage").then((m) => ({ default: m.VerifyInvoicePage })));
const AccountPage = lazyWithRetry(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
// Admin Panel — Route-based layout with nested pages
const AdminLayout = lazyWithRetry(() => import("./components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazyWithRetry(() => import("./pages/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminLegacyPage = lazyWithRetry(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminQuickServicesPage = lazyWithRetry(() => import("./pages/admin/AdminQuickServicesPage").then((m) => ({ default: m.AdminQuickServicesPage })));
const AdminChargesPage = lazyWithRetry(() => import("./pages/admin/AdminChargesPage").then((m) => ({ default: m.AdminChargesPage })));
const AdminSettingsPage = lazyWithRetry(() => import("./pages/admin/AdminSettingsPage").then((m) => ({ default: m.AdminSettingsPage })));
const WebsiteManagementPage = lazyWithRetry(() => import("./pages/admin/WebsiteManagementPage").then((m) => ({ default: m.WebsiteManagementPage })));
const WebsiteServicesPage = lazyWithRetry(() => import("./pages/admin/WebsiteServicesPage").then((m) => ({ default: m.WebsiteServicesPage })));
const WebsitePricingPage = lazyWithRetry(() => import("./pages/admin/WebsitePricingPage").then((m) => ({ default: m.WebsitePricingPage })));
const WebsitePhotosPage = lazyWithRetry(() => import("./pages/admin/WebsitePhotosPage").then((m) => ({ default: m.WebsitePhotosPage })));
const WebsiteCategoriesPage = lazyWithRetry(() => import("./pages/admin/WebsiteCategoriesPage").then((m) => ({ default: m.WebsiteCategoriesPage })));
const WebsiteContentPage = lazyWithRetry(() => import("./pages/admin/WebsiteContentPage").then((m) => ({ default: m.WebsiteContentPage })));
const WebsiteAnalyticsPage = lazyWithRetry(() => import("./pages/admin/WebsiteAnalyticsPage").then((m) => ({ default: m.WebsiteAnalyticsPage })));
const WebsiteActivityPage = lazyWithRetry(() => import("./pages/admin/WebsiteActivityPage").then((m) => ({ default: m.WebsiteActivityPage })));

// ID Card Studio — Project management, CSV roster import, designer, and batch PDF generator
const IdCardProjectsPage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardProjectsPage").then((m) => ({ default: m.default })));
const IdCardProjectPage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardProjectPage").then((m) => ({ default: m.default })));
const IdCardOverviewPage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardOverviewPage").then((m) => ({ default: m.default })));
const IdCardPersonsPage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardPersonsPage").then((m) => ({ default: m.default })));
const IdCardTemplatePage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardTemplatePage").then((m) => ({ default: m.default })));
const IdCardPreviewPage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardPreviewPage").then((m) => ({ default: m.default })));
const IdCardGeneratePage = lazyWithRetry(() => import("./pages/admin/idcard/IdCardGeneratePage").then((m) => ({ default: m.default })));

const LoginPage = lazyWithRetry(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const SignupPage = lazyWithRetry(() => import("./pages/SignupPage").then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazyWithRetry(() => import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazyWithRetry(() => import("./pages/AuthCallbackPage").then((m) => ({ default: m.AuthCallbackPage })));
const AboutPage = lazyWithRetry(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const ContactPage = lazyWithRetry(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const FAQPage = lazyWithRetry(() => import("./pages/FAQPage").then((m) => ({ default: m.FAQPage })));
const WorkPage = lazyWithRetry(() => import("./pages/WorkPage").then((m) => ({ default: m.WorkPage })));
const WebsiteDevPage = lazyWithRetry(() => import("./pages/WebsiteDevPage").then((m) => ({ default: m.WebsiteDevPage })));
const ServicesPage = lazyWithRetry(() => import("./pages/ServicesPage").then((m) => ({ default: m.ServicesPage })));
const ServiceDetailPage = lazyWithRetry(() => import("./pages/ServiceDetailPage").then((m) => ({ default: m.ServiceDetailPage })));
const PrivacyPage = lazyWithRetry(() => import("./pages/LegalPages").then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazyWithRetry(() => import("./pages/LegalPages").then((m) => ({ default: m.TermsPage })));
const RefundPolicyPage = lazyWithRetry(() => import("./pages/LegalPages").then((m) => ({ default: m.RefundPolicyPage })));

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
  const { loading: authLoading } = useAuth();
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [modalService, setModalService] = useState<ServiceItem | null>(null);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Catalog synchronization from Supabase: Gated strictly behind auth initialization
  useEffect(() => {
    if (authLoading) return;
    if (!isSupabaseConfigured || !supabase) return;

    let isSubscribed = true;
    let lastSync = 0;
    const SYNC_THROTTLE_MS = 60000; // 1 minute throttle

    const syncCatalog = async () => {
      const now = Date.now();
      if (now - lastSync < SYNC_THROTTLE_MS) return;
      lastSync = now;

      try {
        const [prods, servs, cats] = await Promise.all([
          getProducts(),
          getServices(),
          getCategories(),
        ]);
        if (!isSubscribed) return;
        if (prods && prods.length > 0) PalakDataStore.setProducts(prods);
        if (servs && servs.length > 0) PalakDataStore.setDigitalServices(servs);
        if (cats && cats.length > 0) PalakDataStore.setCategories(cats);
      } catch (err) {
        console.warn("[CatalogSync] Background sync notice:", err);
      }
    };

    syncCatalog();

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        syncCatalog();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", syncCatalog);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      isSubscribed = false;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", syncCatalog);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [authLoading]);

  const handleOpenRequestModal = (serviceId?: string) => {
    if (serviceId) {
      const s = servicesData.find((item) => item.id === serviceId);
      setModalService(s || null);
    } else {
      setModalService(null);
    }
    setRequestModalOpen(true);
  };

  const handleSelectServiceCard = (service: ServiceItem) => {
    setModalService(service);
    setRequestModalOpen(true);
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-[#FAF8F5] font-sans selection:bg-[#123B70] selection:text-white",
      !isAdminRoute && "pb-16 md:pb-0"
    )}>
      <StructuredData />
      <ScrollToTop />

      {/* Global Header Navigation — Hidden on Admin Control Center Routes */}
      {!isAdminRoute && <Header onOpenRequestModal={() => handleOpenRequestModal()} />}

      {/* Dynamic Page Routes with ErrorBoundary and Suspense */}
      <main className="flex-grow">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <PageTransition>
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
                <Route path="/graphic-design" element={<DesignServicesPage />} />

                {/* Quotation Calculator */}
                <Route path="/request-quote" element={<RequestQuotePage />} />
                <Route path="/quote" element={<RequestQuotePage />} />

                {/* Cart & Checkout */}
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />

                {/* Order Tracking & Status */}
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/track" element={<TrackOrderPage />} />

                {/* Public Invoice Authenticity Verification */}
                <Route path="/verify-invoice/:invoiceNumber" element={<VerifyInvoicePage />} />
                <Route path="/verify-invoice" element={<VerifyInvoicePage />} />
                <Route path="/invoice/verify/:invoiceNumber" element={<VerifyInvoicePage />} />
                <Route path="/verify" element={<VerifyInvoicePage />} />

                {/* User Account & History */}
                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/orders" element={<AccountPage />} />
                <Route path="/account/requests" element={<AccountPage />} />

                {/* Auth */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signin" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/register" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* Admin ERP — Nested Route-Based Layout with Role-Based Route Guards */}
                <Route path="/admin" element={
                  <ErrorBoundary fallback={
                    <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
                      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-lg space-y-5">
                        <div className="h-14 w-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50">
                          <span className="text-2xl">⚠</span>
                        </div>
                        <div className="space-y-1.5">
                          <h2 className="text-xl font-extrabold text-slate-900">Admin Panel Error</h2>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            An error occurred in the admin panel. This may be caused by a network update or a temporary issue. Please reload to try again.
                          </p>
                        </div>
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                          <button type="button" onClick={() => window.location.reload()} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c] shadow-xs cursor-pointer">
                            Reload Admin Panel
                          </button>
                          <a href="/" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer">
                            Back to Website
                          </a>
                        </div>
                      </div>
                    </div>
                  }>
                    <AdminLayout />
                  </ErrorBoundary>
                }>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="orders" element={<AdminLegacyPage />} />
                  <Route path="orders/:orderCode" element={<AdminLegacyPage />} />
                  <Route path="notifications" element={<Navigate to="/admin/orders" replace />} />
                  <Route path="payments" element={<AdminLegacyPage />} />
                  <Route path="pricing" element={<AdminLegacyPage />} />
                  <Route path="services-requests" element={<AdminLegacyPage />} />
                  <Route path="quotes" element={<AdminLegacyPage />} />
                  <Route path="designs" element={<AdminLegacyPage />} />
                  <Route path="quick-services" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <AdminQuickServicesPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="charges" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <AdminChargesPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsiteManagementPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/services" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsiteServicesPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/pricing" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsitePricingPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/photos" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsitePhotosPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/categories" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsiteCategoriesPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/content" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsiteContentPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/analytics" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsiteAnalyticsPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="website/activity" element={
                    <AdminRouteGuard requiredRole="MANAGER">
                      <WebsiteActivityPage />
                    </AdminRouteGuard>
                  } />

                  {/* ID Card Studio — Project management, CSV roster, designer, preview, batch PDF */}
                  <Route path="id-cards" element={
                    <AdminRouteGuard requiredRole="STAFF">
                      <IdCardProjectsPage />
                    </AdminRouteGuard>
                  } />
                  <Route path="id-cards/:projectId" element={
                    <AdminRouteGuard requiredRole="STAFF">
                      <IdCardProjectPage />
                    </AdminRouteGuard>
                  }>
                    <Route index element={<IdCardOverviewPage />} />
                    <Route path="persons" element={<IdCardPersonsPage />} />
                    <Route path="template" element={<IdCardTemplatePage />} />
                    <Route path="preview" element={<IdCardPreviewPage />} />
                    <Route path="generate" element={<IdCardGeneratePage />} />
                  </Route>

                  <Route path="settings" element={
                    <AdminRouteGuard requiredRole="ADMIN">
                      <AdminSettingsPage />
                    </AdminRouteGuard>
                  } />
                </Route>

                {/* Information, Brand & Policy Pages */}
                <Route path="/services" element={<ServicesPage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
                <Route path="/services/:slug" element={<ServiceDetailPage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
                <Route path="/work" element={<WorkPage onOpenRequestModal={handleOpenRequestModal} />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FAQPage />} />

                {/* Legal & Policy Pages */}
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />
                <Route path="/cancellation-policy" element={<RefundPolicyPage />} />

                {/* Catch-all fallback */}
                <Route path="*" element={<HomePage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Customer Footer, Floating Actions & Bottom Nav — Hidden on Admin Routes */}
      {!isAdminRoute && (
        <>
          <Footer />
          <FloatingActions />
          <MobileBottomNav onOpenRequestModal={() => handleOpenRequestModal()} />
        </>
      )}

      {/* Interactive Service Request & Upload Modal */}
      {requestModalOpen && (
        <Suspense fallback={null}>
          <ServiceRequestModal
            isOpen={requestModalOpen}
            onClose={() => setRequestModalOpen(false)}
            selectedService={modalService}
          />
        </Suspense>
      )}
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
