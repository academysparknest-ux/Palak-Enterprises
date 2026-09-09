import React from "react";
import ServicesPageContent from "../components/ServicesPageContent";

export interface ServicesPageProps {
  onOpenRequestModal?: (serviceId?: string) => void;
  onSelectService?: (service: any) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenRequestModal, onSelectService }) => {
  return <ServicesPageContent onOpenRequestModal={onOpenRequestModal} onSelectService={onSelectService} />;
};

export default ServicesPage;
