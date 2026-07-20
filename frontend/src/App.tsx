/**
 * App.tsx — Entry point của ứng dụng.
 * 
 * Chỉ setup providers và BrowserRouter.
 * Toàn bộ routing đã được tách ra AppRoutes.tsx.
 */
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { ToastContainer } from "./components/shared/ToastContainer";
import { AppRoutes } from "./router/AppRoutes";

function App() {
  return (
    <>
      {/* Global Toast — renders above everything, persists across routes */}
      <ToastContainer />
      <BrowserRouter>
        <AuthProvider>
          <ConfirmProvider>
            <AppRoutes />
          </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
