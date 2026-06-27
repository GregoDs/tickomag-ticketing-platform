import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import SiteIntro from "./components/intro/SiteIntro";

function App() {
  return (
    <AuthProvider>
      <SiteIntro />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
