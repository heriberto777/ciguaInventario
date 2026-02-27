import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const { mutate: login, isLoading } = useLogin();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; opacity: number; delay: number }>>([]);

  // Generar partículas de fondo
  useEffect(() => {
    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.4 + 0.1,
        delay: Math.random() * 5,
      }))
    );
  }, []);

  const onSubmit = (data: LoginForm) => {
    setApiError('');
    login(data, {
      onSuccess: (response) => {
        setAuth(response.user, response.accessToken, response.refreshToken);
        navigate('/');
      },
      onError: (err: any) => {
        const msg = err.response?.data?.error?.message
          || err.response?.data?.error?.code
          || 'Credenciales incorrectas';
        setApiError(msg === 'INVALID_CREDENTIALS' ? 'Correo o contraseña incorrectos' : msg);
      },
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Fondo degradado oscuro */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        }}
      />

      {/* Orbes de luz de fondo */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: '500px', height: '500px',
          top: '-150px', left: '-150px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: '400px', height: '400px',
          bottom: '-100px', right: '-100px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)',
        }}
      />

      {/* Partículas flotantes */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'rgba(167, 139, 250, 0.6)',
            opacity: p.opacity,
            animation: `float ${4 + p.delay}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) translateX(0px); }
          to   { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .login-card { animation: fadeIn 0.6s ease-out; }
        .input-field {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          color: #f1f5f9;
          border-radius: 10px;
          padding: 12px 16px;
          width: 100%;
          font-size: 0.95rem;
          transition: all 0.2s;
          outline: none;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.35); }
        .input-field:focus {
          border-color: rgba(167,139,250,0.7);
          background: rgba(255,255,255,0.1);
          box-shadow: 0 0 0 3px rgba(167,139,250,0.2);
        }
        .input-field.error-input {
          border-color: rgba(248, 113, 113, 0.7);
        }
        .btn-login {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          letter-spacing: 0.5px;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.2s;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }
        .btn-login:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(99,102,241,0.5);
        }
        .btn-login:active:not(:disabled) { transform: translateY(0); }
        .btn-login:disabled { opacity: 0.65; cursor: not-allowed; }
        .btn-login-loading::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* Tarjeta glassmorphism */}
      <div
        className="login-card relative w-full max-w-md mx-4"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '40px 36px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: '1.7rem', fontWeight: 700, marginBottom: '4px' }}>
            Cigua Inventory
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
            Sistema de Gestión de Inventario
          </p>
        </div>

        {/* Error global */}
        {apiError && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-3"
            style={{
              background: 'rgba(248,113,113,0.15)',
              border: '1px solid rgba(248,113,113,0.4)',
              color: '#fca5a5',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {apiError}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="usuario@empresa.com"
                className={`input-field ${errors.email ? 'error-input' : ''}`}
                style={{ paddingLeft: '42px' }}
                autoComplete="email"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: '5px' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`input-field ${errors.password ? 'error-input' : ''}`}
                style={{ paddingLeft: '42px', paddingRight: '44px' }}
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute"
                style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: '5px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={isLoading || isSubmitting}
            className={`btn-login ${(isLoading || isSubmitting) ? 'btn-login-loading' : ''}`}
            style={{ marginTop: '8px' }}
          >
            {(isLoading || isSubmitting) ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <p
          className="text-center mt-6"
          style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}
        >
          © {new Date().getFullYear()} CIGUA DR · v2.0
        </p>
      </div>
    </div>
  );
}
