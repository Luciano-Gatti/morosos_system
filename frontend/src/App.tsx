import { routePermissions } from "@/auth/routePermissions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/context/AuthContext";
import { lazy, Suspense } from "react";
import { PlaceholderPage } from "./pages/PlaceholderPage";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inmuebles = lazy(() => import("./pages/Inmuebles"));
const InmuebleDetalle = lazy(() => import("./pages/InmuebleDetalle"));
const HistorialSeguimiento = lazy(() => import("./pages/HistorialSeguimiento"));
const HistorialDeudaInmueble = lazy(() => import("./pages/HistorialDeudaInmueble"));
const ObservacionesExpedienteInmueble = lazy(() => import("./pages/ObservacionesExpedienteInmueble"));
const GestionDeuda = lazy(() => import("./pages/GestionDeuda"));
const CargaDetalle = lazy(() => import("./pages/CargaDetalle"));
const GestionEtapas = lazy(() => import("./pages/GestionEtapas"));
const FacturacionRecaudacion = lazy(() => import("./pages/FacturacionRecaudacion"));
const Reportes = lazy(() => import("./pages/Reportes"));
const ConfiguracionGrupos = lazy(() => import("./pages/ConfiguracionGrupos"));
const ConfiguracionSeguimiento = lazy(() => import("./pages/ConfiguracionSeguimiento"));
const ConfiguracionEtapas = lazy(() => import("./pages/ConfiguracionEtapas"));
const ConfiguracionMotivosCierre = lazy(() => import("./pages/ConfiguracionMotivosCierre"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Registro = lazy(() => import("./pages/Registro"));
const OlvideContrasena = lazy(() => import("./pages/OlvideContrasena"));
const RestablecerContrasena = lazy(() => import("./pages/RestablecerContrasena"));
const AdminUsuarios = lazy(() => import("./pages/AdminUsuarios"));
const AdminRolesPermisos = lazy(() => import("./pages/AdminRolesPermisos"));
const AuthAudit = lazy(() => import("./pages/AuthAudit"));
const GestionCargas = lazy(() => import("./pages/GestionCargas"));
const CargaProcesoDetalle = lazy(() => import("./pages/CargaProcesoDetalle"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route element={<ProtectedRoute {...routePermissions.dashboard} />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.inmuebles} />}>
                  <Route path="/inmuebles" element={<Inmuebles />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.inmuebleDetalle} />}>
                  <Route path="/inmuebles/:id" element={<InmuebleDetalle />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.historialSeguimiento} />}>
                  <Route path="/inmuebles/:id/seguimiento" element={<HistorialSeguimiento />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.historialDeuda} />}>
                  <Route path="/inmuebles/:id/historial-deuda" element={<HistorialDeudaInmueble />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.observacionesExpediente} />}>
                  <Route path="/inmuebles/:id/observaciones-expediente" element={<ObservacionesExpedienteInmueble />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.cargas} />}>
                  <Route path="/cargas" element={<GestionCargas />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.cargaProcesoDetalle} />}>
                  <Route path="/cargas/:id" element={<CargaProcesoDetalle />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.deuda} />}>
                  <Route path="/deuda" element={<GestionDeuda />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.cargaDetalle} />}>
                  <Route path="/deuda/:id" element={<CargaDetalle />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.etapas} />}>
                  <Route path="/etapas" element={<GestionEtapas />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.facturacionRecaudacion} />}>
                  <Route path="/reportes/facturacion-recaudacion" element={<FacturacionRecaudacion />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.reportes} />}>
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/reportes/:reporteId" element={<Reportes />} />
                </Route>
                <Route path="/administracion" element={<Navigate to="/administracion/usuarios" replace />} />
                <Route element={<ProtectedRoute {...routePermissions.adminUsuarios} />}>
                  <Route path="/administracion/usuarios" element={<AdminUsuarios />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.adminRolesPermisos} />}>
                  <Route path="/administracion/roles-permisos" element={<AdminRolesPermisos />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.authAudit} />}>
                  <Route path="/administracion/auth-audit" element={<AuthAudit />} />
                </Route>
                <Route
                  path="/configuracion"
                  element={
                    <PlaceholderPage
                      title="Configuración"
                      description="Parámetros generales del sistema."
                      breadcrumb={[{ label: "Configuración" }]}
                    />
                  }
                />
                <Route element={<ProtectedRoute {...routePermissions.configuracionGrupos} />}>
                  <Route path="/configuracion/grupos" element={<ConfiguracionGrupos />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.configuracionSeguimiento} />}>
                  <Route path="/configuracion/seguimiento" element={<ConfiguracionSeguimiento />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.configuracionEtapas} />}>
                  <Route path="/configuracion/etapas" element={<ConfiguracionEtapas />} />
                </Route>
                <Route element={<ProtectedRoute {...routePermissions.configuracionMotivosCierre} />}>
                  <Route path="/configuracion/motivos-cierre" element={<ConfiguracionMotivosCierre />} />
                </Route>
                <Route path="/configuracion/usuarios" element={<Navigate to="/administracion/usuarios" replace />} />
              </Route>
            </Route>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
              <Route path="/forgot-password" element={<OlvideContrasena />} />
              <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
              <Route path="/reset-password" element={<RestablecerContrasena />} />
            </Route>
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

function RouteLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-muted-foreground">
      Cargando módulo...
    </div>
  );
}
