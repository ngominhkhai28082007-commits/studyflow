
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router";
  import { Toaster } from "sonner";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <App />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  );
  
