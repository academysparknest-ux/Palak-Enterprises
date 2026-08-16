import { useState, useEffect } from "react";
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

// Core Pages
import { HomePage } from "./pages/HomePage";
import { PrintingPage } from "./pages/PrintingPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { OnlineServicesPage } from "./pages/OnlineServicesPage";
import { DigitalServiceDetailPage } from "./pages/DigitalServiceDetailPage";
import { BusinessPage } from "./pages/BusinessPage";
import { WeddingEventsPage } from "./pages/WeddingEventsPage";
import { DesignServicesPage } from "./pages/DesignServicesPage";
import { RequestQuotePage } from "./pages/RequestQuotePage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { TrackOrderPage } from "./pages/TrackOrderPage";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { FAQPage } from "./pages/FAQPage";
import { WorkPage } from "./pages/WorkPage";
import { WebsiteDevPage } from "./pages/WebsiteDevPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";
import { PrivacyPage, TermsPage, RefundPolicyPage } from "./pages/LegalPages";

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
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] font-sans selection:bg-[#123B70] selection:text-white pb-16 md:pb-0">
      <StructuredData />
      <ScrollToTop />

      {/* Global Header Navigation */}
      <Header onOpenRequestModal={handleOpenRequestModal} />

      {/* Dynamic Page Routes */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />

          {/* Printing Catalog & Product Details */}
          <Route path="/printing" element={<PrintingPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
          <Route path="/printing/:slug" element={<ProductDetailPage />} />
          <Route path="/products" element={<PrintingPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />

          {/* Digital & Online Services */}
          <Route path="/digital-services" element={<OnlineServicesPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
          <Route path="/digital-services/:slug" element={<DigitalServiceDetailPage />} />
          <Route path="/online-services" element={<OnlineServicesPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
          <Route path="/online-services/:slug" element={<DigitalServiceDetailPage />} />

          {/* Business & Bulk Printing Solutions */}
          <Route path="/business" element={<BusinessPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
          <Route path="/business/:slug" element={<BusinessPage onOpenRequestModal={() => handleOpenRequestModal()} />} />
          <Route path="/website-development" element={<WebsiteDevPage onOpenRequestModal={() => handleOpenRequestModal()} />} />

          {/* Wedding & Ceremony Cards */}
          <Route path="/wedding-events" element={<WeddingEventsPage />} />

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

          {/* Customer Portal & Admin ERP */}
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/orders" element={<AccountPage />} />
          <Route path="/account/requests" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* Compatible Informational Pages */}
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

          {/* Catch-all fallback */}
          <Route path="*" element={<HomePage onOpenRequestModal={handleOpenRequestModal} onSelectService={handleSelectServiceCard} />} />
        </Routes>
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
