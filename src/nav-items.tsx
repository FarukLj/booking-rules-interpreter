
import { ReactElement } from "react";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import CategoryPage from "./pages/CategoryPage";
import NotFound from "./pages/NotFound";

export interface NavItem {
  to: string;
  page: ReactElement;
}

export const navItems: NavItem[] = [
  {
    to: "/",
    page: <Index />,
  },
  {
    to: "/admin",
    page: <Admin />,
  },
  {
    to: "/auth",
    page: <Auth />,
  },
  {
    to: "/category/:category",
    page: <CategoryPage />,
  },
  {
    to: "*",
    page: <NotFound />,
  },
];
