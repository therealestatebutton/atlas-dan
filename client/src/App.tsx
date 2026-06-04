// Atlas App — Main routing and auth
// CLIENT_CONFIG is injected per-client at build time
import { useState, useEffect } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import CountyScraper from "./pages/CountyScraper";
import PropertyCondition from "./pages/PropertyCondition";
import Settings from "./pages/Settings";

// ─── CLIENT CONFIG (Dan Button — The Real Estate Button) ─────────────────────
export const CLIENT_CONFIG = {
  companyName: "The Real Estate Button",
  userEmail: "dan@therealestatebutton.com",
  userPassword: "Dan1074$",
  accentColor: "#D4AF37",
  counties: [
  {
    "name": "Horry",
    "state": "SC",
    "leadTypes": [
      "Pre-Foreclosure",
      "Foreclosure",
      "Tax Delinquent",
      "Probate",
      "Sheriff Sale",
      "Bankruptcy",
      "Obituary",
      "FSBO",
      "Code Violation",
      "Divorce",
      "Vacant/Abandoned"
    ]
  },
  {
    "name": "Georgetown",
    "state": "SC",
    "leadTypes": [
      "Pre-Foreclosure",
      "Foreclosure",
      "Tax Delinquent",
      "Probate",
      "Bankruptcy",
      "Obituary"
    ]
  },
  {
    "name": "Marion",
    "state": "SC",
    "leadTypes": [
      "Pre-Foreclosure",
      "Foreclosure",
      "Tax Delinquent",
      "Probate"
    ]
  }
],
};

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem("atlas_auth"));
  const [apiKeys, setApiKeys] = useState<{ googleMaps: string; openAi: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem("atlas_api_keys") || "{}");
    } catch {
      return { googleMaps: "", openAi: "" };
    }
  });
  const [location] = useLocation();

  const handleLogin = () => {
    localStorage.setItem("atlas_auth", "1");
    setIsAuth(true);
  };

  const handleSaveKeys = (keys: { googleMaps: string; openAi: string }) => {
    localStorage.setItem("atlas_api_keys", JSON.stringify(keys));
    setApiKeys(keys);
  };

  if (!isAuth) {
    return (
      <Login
        companyName={CLIENT_CONFIG.companyName}
        userEmail={CLIENT_CONFIG.userEmail}
        userPassword={CLIENT_CONFIG.userPassword}
        accentColor={CLIENT_CONFIG.accentColor}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <AppLayout
      companyName={CLIENT_CONFIG.companyName}
      userEmail={CLIENT_CONFIG.userEmail}
      accentColor={CLIENT_CONFIG.accentColor}
    >
      <Switch>
        <Route path="/">
          <Redirect to="/county-scraper" />
        </Route>
        <Route path="/county-scraper">
          <CountyScraper
            counties={CLIENT_CONFIG.counties}
            accentColor={CLIENT_CONFIG.accentColor}
          />
        </Route>
        <Route path="/property-condition">
          <PropertyCondition
            googleMapsConfigured={!!apiKeys.googleMaps}
            openAiConfigured={!!apiKeys.openAi}
            accentColor={CLIENT_CONFIG.accentColor}
          />
        </Route>
        <Route path="/settings">
          <Settings />
        </Route>
        <Route>
          <Redirect to="/county-scraper" />
        </Route>
      </Switch>
    </AppLayout>
  );
}
