import { Navigate, type RouteObject } from "react-router-dom";
import { RootLayout } from "@/components/layout/RootLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ErrorPage } from "@/pages/ErrorPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProjectPage } from "@/pages/ProjectPage";
import { SignupPage } from "@/pages/SignupPage";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Navigate to="/login" replace /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/projects/:id", element: <ProjectPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
