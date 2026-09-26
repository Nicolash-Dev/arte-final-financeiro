"use client";

import "./pagar.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Search,
  WalletCards,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StatusSaida =
  | "pago"
  | "a_pagar";

type Saida = {
  id: string;
  descricao: string;
  para_quem: string;
  valor: number;
  data_vencimento: string;
  status: StatusSaida;
  data_pagamento: string | null;
  categoria: string | null;
  observacoes: string | null;
  created_at: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T12:00:00`)
  );
}

export default function PagarPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [saidas, setSaidas] =
    useState<Saida[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [busca, setBusca] =
    useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");

    const { data, error } = await supabase
      .from("saidas")
      .select("*")
      .order("data_vencimento", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao carregar contas a pagar:",
        error
      );

      setErro(
        "Não foi possível carregar as contas a pagar."
      );

      setLoading(false);
      return;
    }

    setSaidas(
      (data ?? []) as Saida[]
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      const { data, error } =
        await supabase
          .from("saidas")
          .select("*")
          .order("data_vencimento", {
            ascending: true,
          });

      if (!ativo) {
        return;
      }

      if (error) {
        console.error(
          "Erro ao carregar contas a pagar:",
          error
        );

        setErro(
          "Não foi possível carregar as contas a pagar."
        );

        setLoading(false);
        return;
      }

      setSaidas(
        (data ?? []) as Saida[]
      );

      setLoading(false);
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  async function marcarComoPago(
  saida: Saida
) {
  const confirmou =
    window.confirm(
      `Confirmar pagamento de ${formatMoney(
        Number(saida.valor)
      )}?\n\n${saida.descricao}`
    );

  if (!confirmou) {
    return;
  }

  const hoje = new Date()
    .toISOString()
    .split("T")[0];

  const { error } = await supabase
    .from("saidas")
    .update({
      status: "pago",
      data_pagamento: hoje,
    })
    .eq("id", saida.id);

  if (error) {
    console.error(
      "Erro ao marcar como pago:",
      error
    );

    alert(
      "Não foi possível marcar essa conta como paga."
    );

    return;
  }

  await carregar();
}

  const filtradas = useMemo(() => {
    const termo = busca
      .trim()
      .toLowerCase();

    if (!termo) {
      return saidas;
    }

    return saidas.filter(
      (item) => {
        const texto = [
          item.descricao,
          item.para_quem,
          item.categoria ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return texto.includes(termo);
      }
    );
  }, [saidas, busca]);

  const resumo = useMemo(() => {
    const aPagar = saidas
      .filter(
        (item) =>
          item.status === "a_pagar"
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    const pago = saidas
      .filter(
        (item) =>
          item.status === "pago"
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    const vencidas = saidas
      .filter((item) => {
        if (
          item.status !== "a_pagar"
        ) {
          return false;
        }

        return (
          new Date(
            `${item.data_vencimento}T23:59:59`
          ) < new Date()
        );
      })
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    return {
      aPagar,
      pago,
      vencidas,
    };
  }, [saidas]);

  return (
    <main className="pagar-page">
      <header className="pagar-topbar">
        <button
          className="back-button"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>
      </header>

      <section className="pagar-container">
        <div className="page-title">
          <span className="eyebrow">
            FINANCEIRO
          </span>

          <h1>
            Contas a pagar
          </h1>

          <p>
            Acompanhe despesas,
            vencimentos e pagamentos
            da Arte Final.
          </p>
        </div>

        <section className="pagar-metrics">
          <article className="pagar-card">
            <div className="pagar-icon yellow">
              <Clock3 size={22} />
            </div>

            <span>
              Total a pagar
            </span>

            <strong>
              {formatMoney(
                resumo.aPagar
              )}
            </strong>

            <small>
              contas em aberto
            </small>
          </article>

          <article className="pagar-card">
            <div className="pagar-icon green">
              <CheckCircle2
                size={22}
              />
            </div>

            <span>
              Pago
            </span>

            <strong>
              {formatMoney(
                resumo.pago
              )}
            </strong>

            <small>
              despesas quitadas
            </small>
          </article>

          <article className="pagar-card">
            <div className="pagar-icon pink">
              <WalletCards
                size={22}
              />
            </div>

            <span>
              Vencido
            </span>

            <strong>
              {formatMoney(
                resumo.vencidas
              )}
            </strong>

            <small>
              valores atrasados
            </small>
          </article>
        </section>

        <section className="pagar-panel">
          <div className="pagar-toolbar">
            <div className="search-box">
              <Search size={18} />

              <input
                value={busca}
                onChange={(event) =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar por descrição ou fornecedor..."
              />
            </div>
          </div>

          {erro && (
            <div className="pagar-error">
              {erro}
            </div>
          )}

          <div className="pagar-table-wrap">
            <table className="pagar-table">
              <thead>
                <tr>
                  <th>
                    Descrição
                  </th>

                  <th>
                    Para quem
                  </th>

                  <th>
                    Categoria
                  </th>

                  <th>
                    Valor
                  </th>

                  <th>
                    Vencimento
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="table-empty"
                    >
                      Carregando...
                    </td>
                  </tr>
                ) : filtradas.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="table-empty"
                    >
                      Nenhuma conta a pagar.
                    </td>
                  </tr>
                ) : (
                  filtradas.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >
                        <td>
                          <div className="pagar-description">
                            <strong>
                              {
                                item.descricao
                              }
                            </strong>

                            {item.observacoes && (
                              <span>
                                {
                                  item.observacoes
                                }
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {
                            item.para_quem
                          }
                        </td>

                        <td>
                          {item.categoria ||
                            "—"}
                        </td>

                        <td className="pagar-value">
                          {formatMoney(
                            Number(
                              item.valor
                            )
                          )}
                        </td>

                        <td>
                          {formatDate(
                            item.data_vencimento
                          )}
                        </td>

                        <td>
                          <span
                            className={`pagar-status ${item.status}`}
                          >
                            {item.status ===
                            "pago"
                              ? "Pago"
                              : "A pagar"}
                          </span>
                        </td>

                        <td>
                          {item.status ===
                          "a_pagar" ? (
                            <button
                              className="pagar-button"
                              onClick={() =>
                                marcarComoPago(
                                  item
                                )
                              }
                            >
                              <CheckCircle2
                                size={16}
                              />

                              Pagar
                            </button>
                          ) : (
                            <span className="pago-date">
                              {item.data_pagamento
                                ? formatDate(
                                    item.data_pagamento
                                  )
                                : "Pago"}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}