import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Package,
  Globe,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  Building,
  Key,
  Printer,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { PalakDataStore } from "../lib/storage/store";
import { SEO } from "../components/SEO";

export const AccountPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user, isAuthenticated, isStaff, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"orders" | "services" | "profile">("orders");

  // If loading session, show clean skeleton/spinner
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#123B70] border-t-transparent" />
          <span className="text-xs font-semibold text-slate-500">
            {currentLang === "hi" ? "अकाउंट लोड हो रहा है..." : "Loading account..."}
          </span>
        </div>
      </div>
    );
  }

  // If not authenticated, show welcoming login CTA
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F8FA] py-16 px-4 sm:px-6 flex items-center justify-center">
        <SEO
          title={{
            en: "Customer Account | Palak Enterprises",
            hi: "ग्राहक अकाउंट | पालक इंटरप्राइजेज",
          }}
          description={{
            en: "Access your printing orders, invoices, proofs, and citizen service requests.",
            hi: "अपने प्रिंटिंग ऑर्डर, इनवॉइस, डिज़ाइन प्रूफ और नागरिक सेवा अनुरोध देखें।",
          }}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-8 max-w-md w-full shadow-card text-center space-y-6">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#123B70] flex items-center justify-center mx-auto ring-8 ring-blue-50/50">
            <User className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {currentLang === "hi" ? "अकाउंट में साइन इन करें" : "Sign In to Your Account"}
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              {currentLang === "hi"
                ? "अपने ऑर्डर, इनवॉइस और डिज़ाइन प्रूफ देखने के लिए कृपया लॉगिन करें।"
                : "Sign in to manage your orders, check proof status, and view invoices."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/login?returnTo=/account"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#123B70] hover:bg-[#0c274c] py-3 text-xs sm:text-sm font-bold text-white shadow-card transition-all"
            >
              <span>{currentLang === "hi" ? "लॉगिन करें" : "Sign In with Email or Google"}</span>
              <ChevronRight className="h-4 w-4" />
            </Link>

            <Link
              to="/signup?returnTo=/account"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 py-3 text-xs sm:text-sm font-bold text-slate-700 transition-colors"
            >
              <span>{currentLang === "hi" ? "नया अकाउंट बनाएं" : "Create New Account"}</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{currentLang === "hi" ? "ऑर्डर बिना लॉगिन ट्रैक करें:" : "Track without login:"}</span>
            <Link to="/track-order" className="font-bold text-[#123B70] hover:underline">
              {currentLang === "hi" ? "ट्रैक ऑर्डर →" : "Track Order →"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch relevant orders and services
  const userPhone = user?.phone?.trim();
  const customerOrders = userPhone
    ? PalakDataStore.getOrdersByPhone(userPhone)
    : PalakDataStore.getOrders().slice(0, 5);

  const customerServices = userPhone
    ? PalakDataStore.getServiceRequests().filter((s) => s.customerPhone.includes(userPhone))
    : PalakDataStore.getServiceRequests().slice(0, 5);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const userInitial = (user?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <SEO
        title={{
          en: `My Account (${user?.name || "Customer"}) | Palak Enterprises`,
          hi: `मेरा अकाउंट (${user?.name || "ग्राहक"}) | पालक इंटरप्राइजेज`,
        }}
        description={{
          en: "Manage your Palak Enterprises profile, orders, design requests, and CSC services.",
          hi: "पालक इंटरप्राइजेज प्रोफाइल, ऑर्डर, डिज़ाइन रिक्वेस्ट और सीएससी सेवाओं का प्रबंधन करें।",
        }}
      />

      {/* Header Banner */}
      <div className="bg-[#123B70] text-white py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* User Avatar */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white/20 shadow-md shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center ring-4 ring-white/20 shadow-md shrink-0">
                {userInitial}
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                  {user?.name || "Customer"}
                </h1>
                {isStaff ? (
                  <span className="rounded-full bg-amber-400 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    {isAdmin ? "Admin ERP" : "Staff Member"}
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold">
                    {currentLang === "hi" ? "सत्यापित ग्राहक" : "Verified Customer"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200">
                {user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-amber-300" />
                    <span>{user.email}</span>
                  </span>
                )}
                {user?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>+91 {user.phone}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isStaff && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-xs font-black shadow-md transition-all cursor-pointer"
              >
                <Building className="h-4 w-4" />
                <span>{currentLang === "hi" ? "स्टाफ ERP डैशबोर्ड →" : "Staff ERP Board →"}</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{currentLang === "hi" ? "लॉगआउट" : "Log Out"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs and Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4 space-y-6">
        {/* Navigation Tabs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs flex items-center gap-1 max-w-lg">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "orders" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "प्रिंट ऑर्डर्स" : "Print Orders"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white">
              {customerOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "services" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "डिजिटल सेवाएँ" : "Services"}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white">
              {customerServices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "profile" ? "bg-[#123B70] text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>{currentLang === "hi" ? "प्रोफाइल विवरण" : "Profile"}</span>
          </button>
        </div>

        {/* Tab 1: Orders */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {customerOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {order.orderCode}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#123B70] border border-blue-200">
                          {order.orderStatus}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                        {order.items.map((i) => i.productName).join(", ")}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <span>Total: <strong className="text-slate-900">₹{order.totalAmount}</strong></span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 capitalize">
                        Payment: {order.paymentMethod.replace(/_/g, " ")}
                      </span>
                      <Link
                        to={`/track-order?code=${order.orderCode}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                      >
                        <span>Track Status →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#123B70] flex items-center justify-center mx-auto">
                  <Printer className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLang === "hi" ? "अभी तक कोई प्रिंट ऑर्डर नहीं है" : "No Print Orders Yet"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {currentLang === "hi"
                      ? "दस्तावेज, फोटो, विजिटिंग कार्ड या बैनर का त्वरित ऑनलाइन ऑर्डर दें।"
                      : "Start an instant online printing order for documents, photos, or business cards."}
                  </p>
                </div>
                <Link
                  to="/online-services"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c]"
                >
                  <span>{currentLang === "hi" ? "तुरंत प्रिंट ऑर्डर करें" : "Start Online Print Job"}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Digital Services */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {customerServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customerServices.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {req.requestCode}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {req.requestStatus}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{req.serviceName}</h3>
                      <p className="text-xs text-slate-500">Applicant: {req.customerName}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                      <Link
                        to={`/track-order?code=${req.requestCode}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                      >
                        <span>View Progress →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto">
                  <Globe className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {currentLang === "hi" ? "कोई सक्रिय डिजिटल सेवा अनुरोध नहीं" : "No Digital Service Requests Found"}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {currentLang === "hi"
                      ? "पैन कार्ड, जाति/आय प्रमाण पत्र, परीक्षा फॉर्म और सरकारी योजनाओं का आवेदन करें।"
                      : "Apply for PAN cards, RTPS certificates, scholarship forms, and government schemes."}
                  </p>
                </div>
                <Link
                  to="/services"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#123B70] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0c274c]"
                >
                  <span>{currentLang === "hi" ? "सभी सेवाएँ देखें" : "Explore Services Catalog"}</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Profile Info */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                {currentLang === "hi" ? "व्यक्तिगत व संपर्क जानकारी" : "Personal & Contact Details"}
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Full Name</span>
                  <span className="text-sm font-bold text-slate-900">{user?.name || "Not provided"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <span className="text-sm font-bold text-slate-900">{user?.email || "Not linked"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Mobile Number</span>
                  <span className="text-sm font-bold text-slate-900">
                    {user?.phone ? `+91 ${user.phone}` : "Not linked"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Account Role</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {user?.role || "CUSTOMER"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                {currentLang === "hi" ? "सुरक्षा एवं सेटिंग्स" : "Security & Settings"}
              </h3>

              <div className="space-y-4 text-xs">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Key className="h-4 w-4 text-[#123B70]" />
                    <span>{currentLang === "hi" ? "पासवर्ड सुरक्षा" : "Password Management"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {currentLang === "hi"
                      ? "पासवर्ड बदलने के लिए रीसेट लिंक अपने ईमेल पर प्राप्त करें।"
                      : "Receive a secure recovery link at your email to update your account password."}
                  </p>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline pt-1"
                  >
                    <span>{currentLang === "hi" ? "पासवर्ड रीसेट लिंक भेजें →" : "Send Password Reset Link →"}</span>
                  </Link>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>{currentLang === "hi" ? "स्थानीय केंद्र का पता" : "Local Service Center"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Palak Enterprises, Near Block Gate, Ward No. 7, Saniganj Mohalla, Chakia, East Champaran, Bihar – 845412 (CSC ID: 634165120013)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
