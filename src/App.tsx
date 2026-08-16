import { useState } from "react";
import { LanguageProvider } from "./context/LanguageContext";
import { AccessibilityProvider } from "./context/AccessibilityContext";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ServiceSearch } from "./components/ServiceSearch";
import { FeaturedServices } from "./components/FeaturedServices";
import { ServiceCategories } from "./components/ServiceCategories";
import { HowItWorks } from "./components/HowItWorks";
import { TrustFeatures } from "./components/TrustFeatures";
import { BusinessPrintingSection } from "./components/BusinessPrintingSection";
import { WebsiteDevSection } from "./components/WebsiteDevSection";
import { About } from "./components/About";
import { Gallery } from "./components/Gallery";
import { HomepageShowcase } from "./components/HomepageShowcase";
import { FAQSection } from "./components/FAQSection";
import { LocationSection } from "./components/LocationSection";
import { ContactCTA } from "./components/ContactCTA";
import { Footer } from "./components/Footer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { FloatingActions } from "./components/FloatingActions";
import { ServiceRequestModal } from "./components/ServiceRequestModal";
import { StructuredData } from "./components/StructuredData";
import { servicesData, type ServiceItem } from "./config/services";

export function AppContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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

  const handleResetSearch = () => {
    setSearchQuery("");
    setSelectedCategory("all");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-blue-900 selection:text-white pb-16 md:pb-0">
      <StructuredData />

      {/* Header Navigation */}
      <Header onOpenRequestModal={() => handleOpenRequestModal()} />

      {/* Main Content Sections */}
      <main className="flex-grow">
        {/* Hero Section */}
        <Hero onOpenRequestModal={() => handleOpenRequestModal()} />

        {/* Quick Search & Category Bar */}
        <ServiceSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />

        {/* Most Requested / Featured Services */}
        {searchQuery === "" && selectedCategory === "all" && (
          <FeaturedServices onSelectService={handleSelectServiceCard} />
        )}

        {/* All Service Categories & Search Results */}
        <ServiceCategories
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSelectService={handleSelectServiceCard}
          onResetSearch={handleResetSearch}
        />

        {/* How It Works Guide */}
        <HowItWorks />

        {/* Trust & Quality Features */}
        <TrustFeatures />

        {/* Commercial Business Printing Spotlight */}
        <BusinessPrintingSection onOpenRequestModal={handleOpenRequestModal} />

        {/* Custom Website Development Spotlight */}
        <WebsiteDevSection onOpenRequestModal={handleOpenRequestModal} />

        {/* Compact Homepage Samples Showcase */}
        <HomepageShowcase />

        {/* Full Interactive Portfolio & Samples Gallery */}
        <Gallery onOpenRequestModal={handleOpenRequestModal} />

        {/* About Business Narrative */}
        <About />

        {/* Frequently Asked Questions */}
        <FAQSection />

        {/* Location & Map */}
        <LocationSection />

        {/* Bottom Contact CTA */}
        <ContactCTA onOpenRequestModal={() => handleOpenRequestModal()} />
      </main>

      {/* Footer */}
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
    <LanguageProvider>
      <AccessibilityProvider>
        <AppContent />
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
