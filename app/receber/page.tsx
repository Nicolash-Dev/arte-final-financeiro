"use client";

import "./receber.css";

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

type Parcela = {
  id: string;
  entrada_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  vencimento: string;
  status: "em_aberto" | "recebido";
  data_recebimento: string | null;
};

type Entrada = {
  id: string;
  produto_servico: string;
  cliente: string | null;
  valor_total: number;
};

type ParcelaComEntrada = Parcela & {
  entrada?: Entrada | null;
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

export default function ReceberPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [parcelas, setParcelas] =
    useState<ParcelaComEntrada[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [busca, setBusca] =
    useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");

    const {
      data: parcelasData,
      error: parcelasError,
    } = await supabase
      .from("parcelas_receber")
      .select("*")
      .order("vencimento", {
        ascending: true,
      });

    if (parcelasError) {
      console.error(
        "Erro ao carregar parcelas:",
        parcelasError
      );

      setErro(
        "Não foi possível carregar as contas a receber."
      );

      setLoading(false);
      return;
    }

    const entradaIds = [
      ...new Set(
        (parcelasData ?? []).map(
          (item) => item.entrada_id
        )
      ),
    ];

    const entradasMap =
      new Map<string, Entrada>();

    if (entradaIds.length > 0) {
      const {
        data: entradasData,
        error: entradasError,
      } = await supabase
        .from("entradas")
        .select(
          "id, produto_servico, cliente, valor_total"
        )
        .in("id", entradaIds);

      if (entradasError) {
        console.error(
          "Erro ao carregar entradas:",
          entradasError
        );

        setErro(
          "Não foi possível carregar os dados das vendas."
        );

        setLoading(false);
        return;
      }

      for (
        const entrada of entradasData ?? []
      ) {
        entradasMap.set(
          entrada.id,
          entrada as Entrada
        );
      }
    }

    const combinado: ParcelaComEntrada[] =
      (parcelasData ?? []).map(
        (parcela) => ({
          ...(parcela as Parcela),

          entrada:
            entradasMap.get(
              parcela.entrada_id
            ) ?? null,
        })
      );

    setParcelas(combinado);
    setLoading(false);
  }, [supabase]);

 useEffect(() => {
  let ativo = true;

  async function carregarInicial() {
    const {
      data: parcelasData,
      error: parcelasError,
    } = await supabase
      .from("parcelas_receber")
      .select("*")
      .order("vencimento", {
        ascending: true,
      });

    if (!ativo) return;

    if (parcelasError) {
      console.error(
        "Erro ao carregar parcelas:",
        parcelasError
      );

      setErro(
        "Não foi possível carregar as contas a receber."
      );

      setLoading(false);
      return;
    }

    const entradaIds = [
      ...new Set(
        (parcelasData ?? []).map(
          (item) => item.entrada_id
        )
      ),
    ];

    const entradasMap =
      new Map<string, Entrada>();

    if (entradaIds.length > 0) {
      const {
        data: entradasData,
        error: entradasError,
      } = await supabase
        .from("entradas")
        .select(
          "id, produto_servico, cliente, valor_total"
        )
        .in("id", entradaIds);

      if (!ativo) return;

      if (entradasError) {
        console.error(
          "Erro ao carregar entradas:",
          entradasError
        );

        setErro(
          "Não foi possível carregar os dados das vendas."
        );

        setLoading(false);
        return;
      }

      for (
        const entrada of entradasData ?? []
      ) {
        entradasMap.set(
          entrada.id,
          entrada as Entrada
        );
      }
    }

    if (!ativo) return;

    const combinado: ParcelaComEntrada[] =
      (parcelasData ?? []).map(
        (parcela) => ({
          ...(parcela as Parcela),

          entrada:
            entradasMap.get(
              parcela.entrada_id
            ) ?? null,
        })
      );

    setParcelas(combinado);
    setLoading(false);
  }

  carregarInicial();

  return () => {
    ativo = false;
  };
}, [supabase]);

  async function marcarComoRecebido(
  parcela: Parcela
) {
  const confirmou =
    window.confirm(
      `Confirmar recebimento de ${formatMoney(
        Number(parcela.valor)
      )}?\n\nParcela ${parcela.numero_parcela}/${parcela.total_parcelas}`
    );

  if (!confirmou) {
    return;
  }

  const hoje = new Date()
    .toISOString()
    .split("T")[0];

  const { error } = await supabase
    .from("parcelas_receber")
    .update({
      status: "recebido",
      data_recebimento: hoje,
    })
    .eq("id", parcela.id);

  if (error) {
    console.error(
      "Erro ao receber parcela:",
      error
    );

    alert(
      "Não foi possível registrar o recebimento."
    );

    return;
  }

  const parcelasDaVenda =
    parcelas.filter(
      (item) =>
        item.entrada_id ===
        parcela.entrada_id
    );

  const todasRecebidas =
    parcelasDaVenda.every(
      (item) =>
        item.id === parcela.id
          ? true
          : item.status ===
            "recebido"
    );

  if (todasRecebidas) {
    const {
      error: entradaError,
    } = await supabase
      .from("entradas")
      .update({
        status_pagamento:
          "pago",
      })
      .eq(
        "id",
        parcela.entrada_id
      );

    if (entradaError) {
      console.error(
        "Erro ao atualizar entrada:",
        entradaError
      );
    }
  }

  await carregar();
}

  const filtradas =
    useMemo(() => {
      const termo = busca
        .trim()
        .toLowerCase();

      if (!termo) {
        return parcelas;
      }

      return parcelas.filter(
        (item) => {
          const cliente =
            item.entrada?.cliente
              ?.toLowerCase() ?? "";

          const produto =
            item.entrada
              ?.produto_servico
              ?.toLowerCase() ?? "";

          return (
            cliente.includes(termo) ||
            produto.includes(termo)
          );
        }
      );
    }, [parcelas, busca]);

  const resumo = useMemo(() => {
    const emAberto =
      parcelas
        .filter(
          (item) =>
            item.status ===
            "em_aberto"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.valor),
          0
        );

    const recebido =
      parcelas
        .filter(
          (item) =>
            item.status ===
            "recebido"
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.valor),
          0
        );

    const vencidas =
      parcelas
        .filter(
          (item) => {
            if (
              item.status !==
              "em_aberto"
            ) {
              return false;
            }

            return (
              new Date(
                `${item.vencimento}T23:59:59`
              ) < new Date()
            );
          }
        )
        .reduce(
          (total, item) =>
            total +
            Number(item.valor),
          0
        );

    return {
      emAberto,
      recebido,
      vencidas,
    };
  }, [parcelas]);

  return (
    <main className="receber-page">
      <header className="receber-topbar">
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

      <section className="receber-container">
        <div className="page-title">
          <span className="eyebrow">
            FINANCEIRO
          </span>

          <h1>
            Contas a receber
          </h1>

          <p>
            Acompanhe parcelas,
            vencimentos e recebimentos
            da Arte Final.
          </p>
        </div>

        <section className="receber-metrics">
          <article className="receber-card">
            <div className="receber-icon yellow">
              <Clock3 size={22} />
            </div>

            <span>
              Total a receber
            </span>

            <strong>
              {formatMoney(
                resumo.emAberto
              )}
            </strong>

            <small>
              valores em aberto
            </small>
          </article>

          <article className="receber-card">
            <div className="receber-icon green">
              <CheckCircle2
                size={22}
              />
            </div>

            <span>
              Recebido
            </span>

            <strong>
              {formatMoney(
                resumo.recebido
              )}
            </strong>

            <small>
              parcelas quitadas
            </small>
          </article>

          <article className="receber-card">
            <div className="receber-icon pink">
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

        <section className="receber-panel">
          <div className="receber-toolbar">
            <div className="search-box">
              <Search size={18} />

              <input
                value={busca}
                onChange={(event) =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar por cliente ou serviço..."
              />
            </div>
          </div>

          {erro && (
            <div className="receber-error">
              {erro}
            </div>
          )}

          <div className="receber-table-wrap">
            <table className="receber-table">
              <thead>
                <tr>
                  <th>
                    Cliente
                  </th>

                  <th>
                    Serviço
                  </th>

                  <th>
                    Parcela
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
                      Nenhuma conta a
                      receber.
                    </td>
                  </tr>
                ) : (
                  filtradas.map(
                    (item) => (
                      <tr
                        key={item.id}
                      >
                        <td>
                          {item.entrada
                            ?.cliente ||
                            "—"}
                        </td>

                        <td>
                          {item.entrada
                            ?.produto_servico ||
                            "—"}
                        </td>

                        <td>
                          {
                            item.numero_parcela
                          }
                          /
                          {
                            item.total_parcelas
                          }
                        </td>

                        <td className="receber-value">
                          {formatMoney(
                            Number(
                              item.valor
                            )
                          )}
                        </td>

                        <td>
                          {formatDate(
                            item.vencimento
                          )}
                        </td>

                        <td>
                          <span
                            className={`receber-status ${item.status}`}
                          >
                            {item.status ===
                            "recebido"
                              ? "Recebido"
                              : "Em aberto"}
                          </span>
                        </td>

                        <td>
                          {item.status ===
                          "em_aberto" ? (
                            <button
                              className="receber-button"
                              onClick={() =>
                                marcarComoRecebido(
                                  item
                                )
                              }
                            >
                              <CheckCircle2
                                size={16}
                              />

                              Receber
                            </button>
                          ) : (
                            <span className="recebido-date">
                              {item.data_recebimento
                                ? formatDate(
                                    item.data_recebimento
                                  )
                                : "Recebido"}
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