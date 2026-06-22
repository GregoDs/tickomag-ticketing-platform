import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../pages/home/Home";
import EventDetails from "../pages/event-details/EventDetails";
import Checkout from "../pages/checkout/Checkout";
import PaymentVerification from "../pages/checkout/PaymentVerification";
import PendingApproval from "../pages/checkout/PendingApproval";
import Navbar from "../components/layout/navbar/Navbar";
import Footer from "../components/layout/footer/Footer";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route
            path="/payment-verification"
            element={<PaymentVerification />}
          />
          <Route
            path="/pending-approval"
            element={<PendingApproval />}
          />
        </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default AppRoutes;
