import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "../pages/home/Home";
import EventDetails from "../pages/event-details/EventDetails";
import Checkout from "../pages/checkout/Checkout";
import PaymentVerification from "../pages/checkout/PaymentVerification";
import PaymentSuccess from "../pages/checkout/PaymentSuccess";
import PendingApproval from "../pages/checkout/PendingApproval";
import Ticket from "../pages/checkout/Ticket";
import AdminDashboard from "../pages/admin/AdminDashboard";
import OperationsDashboard from "../pages/admin/OperationsDashboard";
import AdminLogin from "../pages/admin/AdminLogin";
import Scanner from "../pages/admin/Scanner";
import AdminLayout from "../components/layout/AdminLayout";
import Navbar from "../components/layout/navbar/Navbar";
import Footer from "../components/layout/footer/Footer";
import ProtectedRoute from "./ProtectedRoute";

function AppContent() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-verification" element={<PaymentVerification />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/ticket" element={<Ticket />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<OperationsDashboard />} />
          <Route path="requests" element={<AdminDashboard />} />
          <Route path="scanner" element={<Scanner />} />
        </Route>
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  );
}

function AppRoutes() {
  return <BrowserRouter><AppContent /></BrowserRouter>;
}

export default AppRoutes;
