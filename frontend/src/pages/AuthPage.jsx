import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage';
import Field from '../components/Field';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const SLOW_SERVER_MESSAGE = 'O servidor estava dormindo e pode levar até 1 minuto para acordar.';

export default function AuthPage({ mode }) {
  const { login, register } = useAuth();
  const isSignup = mode === 'cadastro';
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    setError(null);
    setSlow(false);
  }, [mode]);

  useEffect(() => {
    if (!submitting) {
      return;
    }
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(timer);
  }, [submitting]);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    setError(null);
    if (!form.checkValidity()) {
      setError(new Error('Preencha todos os campos corretamente (e-mail válido, senha de 8 a 72 caracteres).'));
      return;
    }
    setSubmitting(true);
    try {
      const data = Object.fromEntries(new FormData(form));
      if (isSignup) {
        await register(data);
      } else {
        await login(data);
      }
    } catch (submitError) {
      setError(submitError);
      setSubmitting(false);
      setSlow(false);
    }
  }

  const submitLabel = isSignup ? 'Cadastre-se' : 'Entrar';

  return (
    <section className="auth-split">
      <div className="auth-brand">
        <span className="logo">
          <Icon name="bag" />
        </span>
        <h1>UP Shoop</h1>
        <p>Escolha, aplique o cupom e finalize a compra em poucos toques.</p>
      </div>
      <div className="auth">
        <h2>{isSignup ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
        <form key={mode} onSubmit={handleSubmit} noValidate>
          {isSignup && <Field label="Nome" name="nome" autoComplete="name" required minLength={2} maxLength={120} />}
          <Field label="E-mail" name="email" type="email" autoComplete="email" required />
          <Field
            label="Senha"
            name="senha"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={8}
            maxLength={72}
            hint={isSignup ? 'De 8 a 72 caracteres.' : undefined}
          />
          <ErrorMessage error={error} />
          {slow && <p className="hint">{SLOW_SERVER_MESSAGE}</p>}
          <button className="primary wide" type="submit" disabled={submitting}>
            {submitting ? 'Aguarde…' : submitLabel}
          </button>
        </form>
        <div className="alt">
          <span className="hint">ou</span>
          <Link className="button" to={isSignup ? '/login' : '/cadastro'}>
            {isSignup ? 'Já tenho conta' : 'Cadastre-se'}
          </Link>
        </div>
      </div>
    </section>
  );
}
