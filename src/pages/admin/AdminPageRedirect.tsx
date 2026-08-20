import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Legacy AdminPage redirect.
 * The original monolithic admin page has been replaced by the new
 * route-based admin layout at /admin/*.
 * 
 * This component redirects legacy /admin?tab=xxx URLs to the new routes.
 */
export const AdminPageRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  const tabRouteMap: Record<string, string> = {
    orders: "/admin/orders",
    payments: "/admin/payments",
    pricing: "/admin/pricing",
    services: "/admin/services-requests",
    quotes: "/admin/quotes",
    designs: "/admin/designs",
  };

  if (tab && tabRouteMap[tab]) {
    return <Navigate to={tabRouteMap[tab]} replace />;
  }

  return <Navigate to="/admin" replace />;
};
