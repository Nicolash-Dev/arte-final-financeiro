"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, LockKeyhole, User } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      setError("Digite o usuário.");
      setLoading(false);
      return;
    }

    const emailTecnico = `${cleanUsername}@artefinal.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: emailTecnico,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setError("Usuário ou senha incorretos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />

      <section className="login-card">
        <div className="logo-real-login">
          <Image
            src="/arte-final-logo.png"
            alt="Arte Final Comunicação Visual"
            width={110}
            height={110}
            priority
          />
        </div>

        <div className="login-heading">
          <span className="eyebrow">
            ARTE FINAL • COMUNICAÇÃO VISUAL
          </span>

          <h1>
            Gestão da gráfica,
            <br />
            <strong>sem complicação.</strong>
          </h1>

          <p>
            Acesse o painel para acompanhar entradas, saídas,
            recebimentos e produção.
          </p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <label>
            <span>Usuário</span>

            <div className="input-wrap">
              <User size={18} />

              <input
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label>
            <span>Senha</span>

            <div className="input-wrap">
              <LockKeyhole size={18} />

              <input
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar no painel"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-footer">
          Sistema interno • Arte Final
        </div>
      </section>
    </main>
  );
}