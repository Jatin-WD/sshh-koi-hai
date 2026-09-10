import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import AuthLayout from "./components/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriptionGuard from "./components/SubscriptionGuard";
import PublicLayout from "./components/PublicLayout";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./components/AdminLayout";
import SettingsLayout from "./components/SettingsLayout";
import { ForgotPassword, Login, ResetPassword, VerificationRequired, VerifyEmail } from "./pages/AuthPages";
import ProgressiveRegister from "./pages/ProgressiveRegister";
import { About, Contact, HowItWorks } from "./pages/PublicPages";
import Membership from "./pages/MembershipPage";
import SafetyPage from "./pages/SafetyPage";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Discover from "./pages/Discover";
import ProfilePage from "./pages/ProfilePage";
import Account from "./pages/Account";
import Likes from "./pages/Likes";
import Matches from "./pages/Matches";
import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import { AdminDashboard, AdminList, AdminPlans, AdminSettings, AdminUserDetail, AdminUsers } from "./pages/AdminPages";
import { AccountSettings, MembershipSettings, SecuritySettings } from "./pages/SettingsPages";
import { CommunityGuidelines, CookiePolicy, PrivacyPolicy, RefundCancellationPolicy, SafetyGuidelines, TermsOfService } from "./pages/LegalPages";
import PrivacySettingsPage from "./pages/PrivacySettingsPage";
import MemberProfilePage from "./pages/MemberProfilePage";
import Seo from "./components/Seo";
import MemberLayout from "./components/MemberLayout";
import AdminConversations from "./pages/AdminConversations";

function LegacyConversationRedirect() {
  const { conversationId } = useParams();
  return <Navigate to={conversationId ? `/app/messages/${conversationId}` : "/app/messages"} replace />;
}

function LegacyMessagesRedirect() {
  const location = useLocation();
  return <Navigate to={`/app/messages${location.search}`} replace />;
}

export default function App() {
  return <div className="min-h-screen bg-cream text-charcoal"><Seo /><Routes>
    <Route element={<PublicLayout />}><Route path="/" element={<Home />} /><Route path="/about" element={<About />} /><Route path="/how-it-works" element={<HowItWorks />} /><Route path="/membership" element={<Membership />} /><Route path="/safety" element={<SafetyGuidelines />} /><Route path="/privacy" element={<PrivacyPolicy />} /><Route path="/terms" element={<TermsOfService />} /><Route path="/community-guidelines" element={<CommunityGuidelines />} /><Route path="/refunds" element={<RefundCancellationPolicy />} /><Route path="/cookies" element={<CookiePolicy />} /><Route path="/contact" element={<Contact />} /><Route path="/discover" element={<Navigate to="/app/discover" replace />} /><Route path="/likes" element={<Navigate to="/app/likes" replace />} /><Route path="/matches" element={<Navigate to="/app/matches" replace />} /><Route path="/messages" element={<LegacyMessagesRedirect />} /><Route path="/messages/:conversationId" element={<LegacyConversationRedirect />} /></Route>
    <Route element={<AuthLayout />}><Route path="/register" element={<ProgressiveRegister />} /><Route path="/onboarding" element={<ProgressiveRegister />} /><Route path="/login" element={<Login />} /><Route path="/verify-email" element={<VerifyEmail />} /><Route path="/email-verification-required" element={<VerificationRequired />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} /></Route>
    <Route element={<AdminRoute />}><Route element={<AdminLayout />}><Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/users" element={<AdminUsers />} /><Route path="/admin/users/:userId" element={<AdminUserDetail />} /><Route path="/admin/subscriptions" element={<AdminList kind="subscriptions" />} /><Route path="/admin/payments" element={<AdminList kind="payments" />} /><Route path="/admin/plans" element={<AdminPlans />} /><Route path="/admin/reports" element={<AdminList kind="reports" />} /><Route path="/admin/conversations" element={<AdminConversations />} /><Route path="/admin/settings" element={<AdminSettings />} /></Route></Route>
    <Route element={<ProtectedRoute />}><Route element={<MemberLayout />}><Route element={<SettingsLayout />}><Route path="/settings/account" element={<AccountSettings />} /><Route path="/settings/preferences" element={<Navigate to="/profile" replace />} /><Route path="/settings/privacy" element={<PrivacySettingsPage />} /><Route path="/settings/notifications" element={<Notifications />} /><Route path="/settings/security" element={<SecuritySettings />} /><Route path="/settings/membership" element={<MembershipSettings />} /></Route><Route path="/notifications" element={<Notifications />} /><Route path="/account" element={<Account />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/app" element={<Navigate to="/app/discover" replace />} /><Route path="/app/profile" element={<ProfilePage />} /><Route path="/app/notifications" element={<Notifications />} /></Route></Route>
    <Route element={<ProtectedRoute />}><Route element={<MemberLayout />}><Route element={<SubscriptionGuard />}><Route path="/app/discover" element={<Discover />} /><Route path="/app/profile/:userId" element={<MemberProfilePage />} /><Route path="/app/likes" element={<Likes />} /><Route path="/app/matches" element={<Matches />} /><Route path="/app/messages" element={<Messages />} /><Route path="/app/messages/:conversationId" element={<Messages />} /></Route></Route></Route>
    <Route path="*" element={<NotFound />} />
  </Routes></div>;
}
