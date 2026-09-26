"use client";

import "./dashboard.css";

import Image from "next/image";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Entrada = {
  id: string;
  produto_servico: string;
  cliente: string | null;
  valor_total: number;
  data_venda: string;

  status_produto:
    | "producao"
    | "acabamento"
    | "pronto"
    | "entregue";

  status_pagamento:
    | "pago"
    | "a_receber";
};

type Saida = {
  id: string;
  descricao: string;
  para_quem: string;
  valor: number;
  data_vencimento: string;

  status:
    | "pago"
    | "a_pagar";

  data_pagamento: string | null;
};

type ParcelaReceber = {
  id: string;
  entrada_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  vencimento: string;

  status:
    | "em_aberto"
    | "recebido";

  data_recebimento: string | null;
};

type Movimentacao = {
  id: string;

  tipo:
    | "entrada"
    | "saida";

  descricao: string;
  valor: number;
  data_movimentacao: string;
  status: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    menuAberto,
    setMenuAberto,
  ] = useState(false);

  const [
    entradas,
    setEntradas,
  ] = useState<Entrada[]>([]);

  const [
    saidas,
    setSaidas,
  ] = useState<Saida[]>([]);

  const [
    parcelas,
    setParcelas,
  ] = useState<
    ParcelaReceber[]
  >([]);

  const [
    movimentacoes,
    setMovimentacoes,
  ] = useState<
    Movimentacao[]
  >([]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const [
        entradasResult,
        saidasResult,
        parcelasResult,
        movimentacoesResult,
      ] = await Promise.all([
        supabase
          .from("entradas")
          .select("*"),

        supabase
          .from("saidas")
          .select("*"),

        supabase
          .from(
            "parcelas_receber"
          )
          .select("*"),

        supabase
          .from(
            "movimentacoes"
          )
          .select("*")
          .order(
            "data_movimentacao",
            {
              ascending: false,
            }
          )
          .limit(8),
      ]);

      if (!ativo) {
        return;
      }

      const temErro =
        entradasResult.error ||
        saidasResult.error ||
        parcelasResult.error ||
        movimentacoesResult.error;

      if (temErro) {
        console.error({
          entradas:
            entradasResult.error,

          saidas:
            saidasResult.error,

          parcelas:
            parcelasResult.error,

          movimentacoes:
            movimentacoesResult.error,
        });

        setErro(
          "Não foi possível carregar os dados do dashboard."
        );

        setLoading(false);

        return;
      }

      setEntradas(
        (
          entradasResult.data ??
          []
        ) as Entrada[]
      );

      setSaidas(
        (
          saidasResult.data ??
          []
        ) as Saida[]
      );

      setParcelas(
        (
          parcelasResult.data ??
          []
        ) as ParcelaReceber[]
      );

      setMovimentacoes(
        (
          movimentacoesResult.data ??
          []
        ) as Movimentacao[]
      );

      setErro("");

      setLoading(false);
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  async function logout() {
    setMenuAberto(false);

    await supabase.auth.signOut();

    router.push("/login");

    router.refresh();
  }

  function navegar(
    rota: string
  ) {
    setMenuAberto(false);

    router.push(rota);
  }

  const resumo = useMemo(() => {
    const agora =
      new Date();

    const anoAtual =
      agora.getFullYear();

    const mesAtual =
      String(
        agora.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const mesReferencia =
      `${anoAtual}-${mesAtual}`;

    const entradasDoMes =
      entradas.filter(
        (item) =>
          item.data_venda.startsWith(
            mesReferencia
          )
      );

    const totalEntradas =
      entradasDoMes.reduce(
        (total, item) =>
          total +
          Number(
            item.valor_total
          ),
        0
      );

    const saidasDoMes =
      saidas.filter(
        (item) =>
          item.data_vencimento.startsWith(
            mesReferencia
          )
      );

    const totalSaidas =
      saidasDoMes.reduce(
        (total, item) =>
          total +
          Number(
            item.valor
          ),
        0
      );

    const parcelasAbertas =
      parcelas.filter(
        (item) =>
          item.status ===
          "em_aberto"
      );

    const aReceber =
      parcelasAbertas.reduce(
        (total, item) =>
          total +
          Number(
            item.valor
          ),
        0
      );

    const contasAPagar =
      saidas.filter(
        (item) =>
          item.status ===
          "a_pagar"
      );

    const aPagar =
      contasAPagar.reduce(
        (total, item) =>
          total +
          Number(
            item.valor
          ),
        0
      );

    const recebidoParcelas =
      parcelas
        .filter(
          (item) =>
            item.status ===
              "recebido" &&
            item.data_recebimento?.startsWith(
              mesReferencia
            )
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor
            ),
          0
        );

    const idsComParcelas =
      new Set(
        parcelas.map(
          (item) =>
            item.entrada_id
        )
      );

    const recebidoAVista =
      entradas
        .filter(
          (item) =>
            item.status_pagamento ===
              "pago" &&
            !idsComParcelas.has(
              item.id
            ) &&
            item.data_venda.startsWith(
              mesReferencia
            )
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor_total
            ),
          0
        );

    const recebidoNoMes =
      recebidoParcelas +
      recebidoAVista;

    const pagoNoMes =
      saidas
        .filter(
          (item) =>
            item.status ===
              "pago" &&
            item.data_pagamento?.startsWith(
              mesReferencia
            )
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.valor
            ),
          0
        );

    const saldo =
      recebidoNoMes -
      pagoNoMes;

    const producao =
      entradasDoMes.filter(
        (item) =>
          item.status_produto ===
          "producao"
      ).length;

    const acabamento =
      entradasDoMes.filter(
        (item) =>
          item.status_produto ===
          "acabamento"
      ).length;

    const pronto =
      entradasDoMes.filter(
        (item) =>
          item.status_produto ===
          "pronto"
      ).length;

    const entregue =
      entradasDoMes.filter(
        (item) =>
          item.status_produto ===
          "entregue"
      ).length;

    return {
      totalEntradas,
      totalSaidas,

      quantidadeEntradas:
        entradasDoMes.length,

      quantidadeSaidas:
        saidasDoMes.length,

      aReceber,
      aPagar,

      quantidadeAReceber:
        parcelasAbertas.length,

      quantidadeAPagar:
        contasAPagar.length,

      saldo,

      producao,
      acabamento,
      pronto,
      entregue,
    };
  }, [
    entradas,
    saidas,
    parcelas,
  ]);

  return (
    <main className="app-shell">

      <button
        className="mobile-menu-button"
        onClick={() =>
          setMenuAberto(true)
        }
        aria-label="Abrir menu"
      >
        <Menu size={22} />

        <span>
          Menu
        </span>
      </button>

      {menuAberto && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() =>
            setMenuAberto(false)
          }
        />
      )}

      <aside
        className={`sidebar ${
          menuAberto
            ? "sidebar-mobile-open"
            : ""
        }`}
      >

        <button
          className="mobile-sidebar-close"
          onClick={() =>
            setMenuAberto(false)
          }
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>

        <div className="sidebar-brand">

          <div className="brand-logo">
            <Image
              src="/arte-final-logo.png"
              alt="Arte Final Comunicação Visual"
              width={48}
              height={48}
              priority
            />
          </div>

          <div>
            <strong>
              Arte Final
            </strong>

            <span>
              Comunicação Visual
            </span>
          </div>

        </div>

        <nav className="sidebar-nav">

          <button
            className="active"
            onClick={() =>
              setMenuAberto(false)
            }
          >
            <LayoutDashboard
              size={19}
            />

            Dashboard
          </button>

          <button
            onClick={() =>
              navegar(
                "/entradas"
              )
            }
          >
            <ArrowUpRight
              size={19}
            />

            Entradas
          </button>

          <button
            onClick={() =>
              navegar(
                "/saidas"
              )
            }
          >
            <ArrowDownRight
              size={19}
            />

            Saídas
          </button>

          <button
            onClick={() =>
              navegar(
                "/receber"
              )
            }
          >
            <ReceiptText
              size={19}
            />

            A Receber
          </button>

          <button
            onClick={() =>
              navegar(
                "/pagar"
              )
            }
          >
            <ReceiptText
              size={19}
            />

            A Pagar
          </button>

          <button
            onClick={() =>
              navegar(
                "/balanco"
              )
            }
          >
            <WalletCards
              size={19}
            />

            Balanço Mensal
          </button>

        </nav>

        <div className="developer-credit">
          <span>
            Desenvolvido por
          </span>

          <a
            href="https://wa.me/5562981848223"
            target="_blank"
            rel="noopener noreferrer"
          >
            Nicolas.Dev
          </a>
        </div>

        <button
          className="logout"
          onClick={logout}
        >
          <LogOut
            size={18}
          />

          Sair
        </button>

      </aside>

      <section className="dashboard">

        <header className="dashboard-header">

          <div>

            <span className="eyebrow">
              PAINEL ADMINISTRATIVO
            </span>

            <h1>
              Visão geral
            </h1>

            <p>
              Acompanhe o desempenho
              financeiro e o andamento
              da produção da Arte Final.
            </p>

          </div>

        </header>

        {erro && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,

              borderRadius: 12,

              background:
                "rgba(255,92,168,.08)",

              color:
                "#ff91c5",

              border:
                "1px solid rgba(255,92,168,.16)",
            }}
          >
            {erro}
          </div>
        )}

        <section className="metric-grid">

          <article className="metric-card">

            <div className="metric-icon green">
              <ArrowUpRight
                size={21}
              />
            </div>

            <span>
              Entradas do mês
            </span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.totalEntradas
                  )}
            </strong>

            <small>
              {
                resumo.quantidadeEntradas
              }{" "}
              lançamento
              {
                resumo.quantidadeEntradas ===
                1
                  ? ""
                  : "s"
              }
            </small>

          </article>

          <article className="metric-card">

            <div className="metric-icon pink">
              <ArrowDownRight
                size={21}
              />
            </div>

            <span>
              Saídas do mês
            </span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.totalSaidas
                  )}
            </strong>

            <small>
              {
                resumo.quantidadeSaidas
              }{" "}
              lançamento
              {
                resumo.quantidadeSaidas ===
                1
                  ? ""
                  : "s"
              }
            </small>

          </article>

          <article className="metric-card">

            <div className="metric-icon yellow">
              <ReceiptText
                size={21}
              />
            </div>

            <span>
              A receber
            </span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.aReceber
                  )}
            </strong>

            <small>
              {
                resumo.quantidadeAReceber
              }{" "}
              título(s)
            </small>

          </article>

          <article className="metric-card">

            <div className="metric-icon magenta">
              <ReceiptText
                size={21}
              />
            </div>

            <span>
              A pagar
            </span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.aPagar
                  )}
            </strong>

            <small>
              {
                resumo.quantidadeAPagar
              }{" "}
              título(s)
            </small>

          </article>

          <article className="metric-card">

            <div className="metric-icon cyan">
              <BadgeDollarSign
                size={21}
              />
            </div>

            <span>
              Saldo do mês
            </span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.saldo
                  )}
            </strong>

            <small>
              Recebido - pago
            </small>

          </article>

        </section>

        <section className="panel production-panel">

          <div className="panel-head">

            <div>

              <span className="eyebrow">
                PRODUÇÃO
              </span>

              <h2>
                Produção em andamento
              </h2>

            </div>

          </div>

          <div className="production-grid">

            <div>
              <span>
                Produção
              </span>

              <strong>
                {loading
                  ? "..."
                  : resumo.producao}
              </strong>
            </div>

            <div>
              <span>
                Acabamento
              </span>

              <strong>
                {loading
                  ? "..."
                  : resumo.acabamento}
              </strong>
            </div>

            <div>
              <span>
                Pronto
              </span>

              <strong>
                {loading
                  ? "..."
                  : resumo.pronto}
              </strong>
            </div>

            <div>
              <span>
                Entregue
              </span>

              <strong>
                {loading
                  ? "..."
                  : resumo.entregue}
              </strong>
            </div>

          </div>

        </section>

        <section className="panel recent-panel">

          <div className="panel-head">

            <div>

              <span className="eyebrow">
                MOVIMENTAÇÕES
              </span>

              <h2>
                Movimentações recentes
              </h2>

            </div>

          </div>

          {loading ? (

            <div className="empty-state">
              Carregando movimentações...
            </div>

          ) : movimentacoes.length ===
            0 ? (

            <div className="empty-state">
              Nenhuma movimentação
              registrada ainda.
            </div>

          ) : (

            <div className="movements-table-wrap">

              <table className="movements-table">

                <thead>
                  <tr>
                    <th>
                      Tipo
                    </th>

                    <th>
                      Descrição
                    </th>

                    <th>
                      Valor
                    </th>

                    <th>
                      Data
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {movimentacoes.map(
                    (item) => (

                      <tr
                        key={
                          `${item.tipo}-${item.id}`
                        }
                      >

                        <td>

                          <span
                            className={
                              `movement-type ${item.tipo}`
                            }
                          >
                            {item.tipo ===
                            "entrada"
                              ? "Entrada"
                              : "Saída"}
                          </span>

                        </td>

                        <td>
                          {
                            item.descricao
                          }
                        </td>

                        <td
                          className={
                            item.tipo ===
                            "entrada"
                              ? "value-positive"
                              : "value-negative"
                          }
                        >
                          {formatMoney(
                            Number(
                              item.valor
                            )
                          )}
                        </td>

                        <td>
                          {formatDate(
                            item.data_movimentacao
                          )}
                        </td>

                        <td>

                          <span className="movement-status">

                            {item.status
                              .replaceAll(
                                "_",
                                " "
                              )
                              .replace(
                                /\b\w/g,
                                (letra) =>
                                  letra.toUpperCase()
                              )}

                          </span>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </section>

    </main>
  );
}