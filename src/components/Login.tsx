"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Modo = "entrar" | "criar" | "esqueci";

const TRADUCAO: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  "User already registered": "Este e-mail já tem conta. Use Entrar.",
  "Password should be at least 6 characters.": "A senha precisa ter pelo menos 6 caracteres.",
  "Signups not allowed for this instance": "A criação de contas está desativada.",
};

export default function Login() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setEnviando(true);
    const redirectTo = window.location.origin;
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (!data.session) setMsg("Conta criada. Enviamos um link de confirmação para o seu e-mail; clique nele e depois entre aqui.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setMsg("Se o e-mail tiver conta, você vai receber um link para criar uma nova senha.");
      }
    } catch (e) {
      const m = e instanceof Error ? e.message : "Erro inesperado";
      setErro(TRADUCAO[m] ?? m);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-fundo">
      <section className="login-lado" aria-hidden={false}>
        <div className="marca">
          <div className="marca-sinal" aria-hidden>M</div>
          <div>
            <b>Mindstrat</b>
            <small>Prospector</small>
          </div>
        </div>
        <h2 className="login-frase">Sua prospecção do dia, pronta para enviar.</h2>
        <ul className="login-pontos">
          <li>Empresas sem site no Maps</li>
          <li>Mensagem pronta no WhatsApp</li>
          <li>Reuniões, fechamentos e faturamento</li>
        </ul>
      </section>
      <form className="login" onSubmit={enviar}>
        <h1 className="login-titulo">
          {modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Recuperar senha"}
        </h1>
        <p className="dica" style={{ margin: "0 0 18px" }}>
          {modo === "esqueci" ? "Enviamos um link para o seu e-mail." : modo === "criar" ? "Leva 10 segundos." : "Bom te ver de novo."}
        </p>
        <div className="grade">
          <label className="campo">
            <span>E-mail</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {modo !== "esqueci" && (
            <label className="campo">
              <span>Senha</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={modo === "criar" ? "new-password" : "current-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </label>
          )}
          <button className="btn prim grande" type="submit" disabled={enviando}>
            {enviando ? "Aguarde..." : modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar conta" : "Enviar link"}
          </button>
          {erro && <div className="erro" style={{ margin: 0 }}>{erro}</div>}
          {msg && <div className="aviso" style={{ margin: 0 }}>{msg}</div>}
        </div>
        <div className="login-links">
          {modo !== "entrar" && <button type="button" onClick={() => setModo("entrar")}>Já tenho conta</button>}
          {modo !== "criar" && <button type="button" onClick={() => setModo("criar")}>Criar conta</button>}
          {modo === "entrar" && <button type="button" onClick={() => setModo("esqueci")}>Esqueci a senha</button>}
        </div>
      </form>
    </div>
  );
}

/** Tela para definir nova senha depois de clicar no link de recuperação. */
export function NovaSenha({ onPronto }: { onPronto: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  return (
    <div className="login-fundo">
      <form
        className="card pad login"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.auth.updateUser({ password: senha });
          if (error) setErro(TRADUCAO[error.message] ?? error.message);
          else onPronto();
        }}
      >
        <h1 style={{ fontSize: 20, marginTop: 0 }}>Criar nova senha</h1>
        <div className="grade">
          <label className="campo">
            <span>Nova senha</span>
            <input type="password" required minLength={6} autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          <button className="btn prim" type="submit" style={{ justifyContent: "center", padding: 10 }}>Salvar senha</button>
          {erro && <div className="erro">{erro}</div>}
        </div>
      </form>
    </div>
  );
}
