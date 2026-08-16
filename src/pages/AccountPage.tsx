import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Package, Globe, LogOut, Lock } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { PalakDataStore } from "../lib/storage/store";

export const AccountPage: React.FC = () => {
  const { lang, language } = useLanguage();
  const currentLang = (lang || language || "en") as "en" | "hi";
  const { user, isAuthenticated, isStaff, loginCustomer, loginStaff, logout } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [staffPasscode, setStaffPasscode] = useState("");
  const [activeTab, setActiveTab] = useState<"customer" | "staff">("customer");
  const [error, setError] = useState<string | null>(null);

  // Customer portal active tab
  const [portalSection, setPortalSection] = useState<"orders" | "services" | "profile">("orders");

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError(currentLang === "hi" ? "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें" : "Please enter a valid 10-digit phone number");
      return;
    }
    await loginCustomer(phone, name);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await loginStaff(staffPasscode);
    if (success) {
      navigate("/admin");
    } else {
      setError(currentLang === "hi" ? "गलत पासकोड (Chakia Pincode: 845412 या palak2026 दर्ज करें)" : "Invalid staff passcode (Try 845412 or palak2026)");
    }
  };

  // If not logged in, show Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] py-16 px-4 sm:px-6 flex items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 max-w-md w-full shadow-card space-y-6">
          <div className="text-center space-y-1">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-[#123B70] flex items-center justify-center mx-auto mb-2">
              <User className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {currentLang === "hi" ? "ग्राहक लॉगिन / स्टाफ पोर्टल" : "Account Access & Staff Portal"}
            </h1>
            <p className="text-xs text-slate-500">
              Track your past orders or manage printing queue
            </p>
          </div>

          {/* Toggle Tab */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab("customer");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "customer" ? "bg-white text-[#123B70] shadow-xs" : "text-slate-600"
              }`}
            >
              {currentLang === "hi" ? "ग्राहक लॉगिन" : "Customer Login"}
            </button>
            <button
              onClick={() => {
                setActiveTab("staff");
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "staff" ? "bg-white text-[#123B70] shadow-xs" : "text-slate-600"
              }`}
            >
              {currentLang === "hi" ? "स्टाफ / ERP लॉगिन" : "Staff ERP Login"}
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {activeTab === "customer" ? (
            <form onSubmit={handleCustomerLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "मोबाइल नंबर *" : "Mobile Number *"}
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9905238015"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {currentLang === "hi" ? "आपका नाम (वैकल्पिक)" : "Your Name (Optional)"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kumar Pankaj"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#123B70] py-3 text-xs font-bold text-white hover:bg-[#0c274c] shadow-card transition-all cursor-pointer"
              >
                <span>{currentLang === "hi" ? "लॉगिन करें" : "Access My Account"}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Staff Passcode / PIN *
                </label>
                <input
                  type="password"
                  required
                  value={staffPasscode}
                  onChange={(e) => setStaffPasscode(e.target.value)}
                  placeholder="Enter 845412 or palak2026"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#123B70] focus:outline-hidden font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Demo Passcode: <code className="bg-slate-100 px-1 py-0.5 rounded">845412</code> (Chakia PIN)
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 shadow-card transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Login to Staff ERP Dashboard</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Customer Portal (If authenticated)
  const customerOrders = user?.phone ? PalakDataStore.getOrdersByPhone(user.phone) : PalakDataStore.getOrders().slice(0, 3);
  const customerServices = PalakDataStore.getServiceRequests().filter((s) => s.customerPhone.includes(user?.phone || ""));

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <div className="bg-[#123B70] text-white py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-300">
              <Link to="/" className="hover:underline">Home</Link> / <span className="text-amber-300">Customer Account</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              Welcome, {user?.name || "Customer"}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Phone: {user?.phone} {isStaff && <span className="text-amber-300 font-bold ml-2">• Staff Member</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isStaff && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold hover:bg-amber-400"
              >
                <span>Open ERP Dashboard →</span>
              </Link>
            )}
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-4 space-y-6">
        {/* Navigation Tabs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm flex items-center gap-2 max-w-md">
          <button
            onClick={() => setPortalSection("orders")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              portalSection === "orders" ? "bg-[#123B70] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            My Orders ({customerOrders.length})
          </button>
          <button
            onClick={() => setPortalSection("services")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              portalSection === "services" ? "bg-[#123B70] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Service Requests ({customerServices.length})
          </button>
          <button
            onClick={() => setPortalSection("profile")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              portalSection === "profile" ? "bg-[#123B70] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Profile Info
          </button>
        </div>

        {/* Content */}
        {portalSection === "orders" && (
          <div className="space-y-4">
            {customerOrders.length > 0 ? (
              customerOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400">{order.orderCode}</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {order.items.map((i) => i.productName).join(", ")}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Total: <span className="font-bold text-slate-800">₹{order.totalAmount}</span> • Status: <span className="text-[#123B70] font-semibold">{order.orderStatus}</span>
                    </div>
                  </div>

                  <Link
                    to={`/track-order?code=${order.orderCode}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                  >
                    <span>Track Milestone Details →</span>
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2">
                <Package className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Orders Yet</h3>
                <Link to="/printing" className="text-xs font-bold text-[#123B70] hover:underline">
                  Browse Printing Catalog →
                </Link>
              </div>
            )}
          </div>
        )}

        {portalSection === "services" && (
          <div className="space-y-4">
            {customerServices.length > 0 ? (
              customerServices.map((req) => (
                <div key={req.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-amber-600">{req.requestCode}</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{req.serviceName}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Status: <span className="font-semibold text-slate-800">{req.requestStatus}</span>
                    </div>
                  </div>
                  <Link
                    to={`/track-order?code=${req.requestCode}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#123B70] hover:underline"
                  >
                    <span>Track Request Status →</span>
                  </Link>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2">
                <Globe className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">No Digital Service Requests Found</h3>
                <Link to="/digital-services" className="text-xs font-bold text-[#123B70] hover:underline">
                  Explore Digital Services Directory →
                </Link>
              </div>
            )}
          </div>
        )}

        {portalSection === "profile" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-lg space-y-4">
            <h3 className="text-base font-bold text-slate-900">Your Account Details</h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div><span className="text-slate-400">Name:</span> <span className="font-bold text-slate-800">{user?.name}</span></div>
              <div><span className="text-slate-400">Mobile Number:</span> <span className="font-bold text-slate-800">{user?.phone}</span></div>
              <div><span className="text-slate-400">Primary Hub:</span> <span className="font-bold text-slate-800">Chakia Store, East Champaran, Bihar - 845412</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
