import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useLogin, usePublicAppConfig } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { data: config } = usePublicAppConfig();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const { mutate: login, isPending } = useLogin();
  const loginUser = useAuthStore((state) => state.login);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (config?.appTitle) {
      document.title = `${config.appTitle} - Acceso`;
    }
  }, [config]);

  const onSubmit = (data: LoginForm) => {
    setApiError('');
    login(data, {
      onSuccess: (response) => {
        loginUser(response.user, response.accessToken, response.refreshToken);

        // Redirigir a la página guardada o al dashboard
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath);
        } else {
          navigate('/');
        }
      },
      onError: (err: any) => {
        const msg = err.response?.data?.error?.message
          || err.response?.data?.error?.code
          || 'Credenciales incorrectas';
        setApiError(msg === 'INVALID_CREDENTIALS' ? 'Correo o contraseña incorrectos' : msg);
      },
    });
  };

  const primaryColor = config?.primaryColor || '#6366f1';
  const secondaryColor = config?.secondaryColor || '#8b5cf6';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-app relative overflow-hidden font-sans selection:bg-accent-primary/30 p-6">
      {/* Background Dynamic Orbs */}
      <div
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 animate-pulse"
        style={{ backgroundColor: primaryColor }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 animate-pulse delay-700"
        style={{ backgroundColor: secondaryColor }}
      />

      <div className="container max-w-6xl mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

        {/* Visual Branding Section */}
        <div className="flex-1 space-y-8 text-center lg:text-left animate-in slide-in-from-left duration-1000 hidden lg:block">
          <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-card border border-border-default shadow-sm backdrop-blur-md">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-black uppercase tracking-[0.2em] text-secondary">Sistema de Inventario V2.0</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start gap-6">
              {config?.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="h-20 w-auto object-contain drop-shadow-2xl" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl">
                  C
                </div>
              )}
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-primary">
                {config?.appTitle || 'Cigua Inv'}
              </h1>
            </div>
            <p className="text-xl lg:text-2xl text-secondary font-medium max-w-xl leading-relaxed">
              {config?.loginMessage || 'Gestión inteligente de inventarios con trazabilidad en tiempo real.'}
            </p>
          </div>

          {/* Stats - Premium detail */}
          <div className="pt-8 flex flex-wrap justify-center lg:justify-start gap-12 opacity-80">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-primary">100%</span>
              <span className="text-xs uppercase tracking-widest text-muted font-black">Precisión</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-primary">Real-time</span>
              <span className="text-xs uppercase tracking-widest text-muted font-black">Sincronía</span>
            </div>
          </div>
        </div>

        {/* Glassmorphism Login Card */}
        <div className="w-full max-w-[480px] animate-in slide-in-from-bottom duration-1000">
          {/* Mobile Branding (Small screens only) */}
          <div className="lg:hidden text-center mb-10 space-y-4">
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="h-16 w-auto mx-auto object-contain drop-shadow-xl" />
            ) : (
              <div className="h-16 w-16 mx-auto rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl">
                C
              </div>
            )}
            <h1 className="text-4xl font-black tracking-tight text-primary">
              {config?.appTitle || 'Cigua Inv'}
            </h1>
          </div>

          <div className="bg-card/70 dark:bg-card/40 backdrop-blur-3xl p-10 lg:p-12 rounded-3xl border border-white/20 dark:border-white/5 shadow-lg lg:shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_128px_-16px_rgba(0,0,0,0.4)] relative overflow-hidden group">
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

            <div className="relative mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-primary">Acceso Seguro</h2>
              <p className="text-secondary mt-2 font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative">
              {apiError && (
                <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-bold animate-shake text-center">
                  {apiError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted ml-1">Institución / Email</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent-primary transition-colors z-10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="correo@ejemplo.com"
                    className={`w-full pl-12 pr-4 h-14 rounded-2xl bg-input/50 dark:bg-white/5 text-primary dark:text-white border ${errors.email ? 'border-danger' : 'border-border-default dark:border-white/10'} focus:border-accent-primary focus:bg-white/10 focus:ring-4 focus:ring-accent-primary/10 transition-all outline-none font-medium placeholder:text-muted/50 dark:placeholder:text-white/20`}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-danger font-bold ml-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black uppercase tracking-widest text-muted">Contraseña</label>
                  <button type="button" className="text-[10px] uppercase tracking-widest font-black text-muted hover:text-accent-primary transition-colors">Olvidé mi clave</button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent-primary transition-colors z-10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-12 h-14 rounded-2xl bg-input/50 dark:bg-white/5 text-primary dark:text-white border ${errors.password ? 'border-danger' : 'border-border-default dark:border-white/10'} focus:border-accent-primary focus:bg-white/10 focus:ring-4 focus:ring-accent-primary/10 transition-all outline-none font-medium placeholder:text-muted/50 dark:placeholder:text-white/20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary dark:hover:text-white transition-colors z-10"
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-danger font-bold ml-1">{errors.password.message}</p>}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isPending || isSubmitting}
                className="w-full h-14 rounded-2xl text-lg relative overflow-hidden shadow-2xl group active:scale-95 transition-transform text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isPending || isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    'Entrar al Dashboard'
                  )}
                </span>
              </Button>
            </form>

            <div className="mt-10 pt-10 border-t border-border-default/50 dark:border-white/5 text-center">
              <p className="text-xs text-muted font-black uppercase tracking-widest">
                {config?.footerText || `© ${new Date().getFullYear()} Cigua Inventory · v2.0`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
