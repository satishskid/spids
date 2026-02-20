import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SkidsWebsite } from "./SkidsWebsite";
import "./styles.css";

const path = window.location.pathname.toLowerCase();
const showParentApp =
  path === "/parent" ||
  path.startsWith("/parent/") ||
  path === "/app" ||
  path.startsWith("/app/");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {showParentApp ? <App /> : <SkidsWebsite />}
  </StrictMode>
);
