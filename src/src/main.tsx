import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AuthScreen from "./components/AuthScreen";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthScreen
      login={() => ({ success: true })}
      registerWithInvite={() => ({ success: true })}
      sandboxLogin={() => {}}
      forceReset={() => {}}
    />
  </React.StrictMode>
);