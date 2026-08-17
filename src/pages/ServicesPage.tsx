import React from "react";
import ServicesPageContent from "../components/ServicesPageContent";

export interface ServicesPageProps {
  onOpenRequestModal?: (serviceId?: string) => void;
  onSelectService?: (service: any) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = () => {
  return <ServicesPageContent />;
};

export default ServicesPage;
