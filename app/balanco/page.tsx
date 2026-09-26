"use client";

import "./balanco.css";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  WalletCards,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Entrada = {
  id: string;
  produto_servico: string;
  cliente: string | null;
  valor_total: number;
  data_venda: string;
  status_pagamento: "pago" | "a_receber";
};

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

type Saida = {
  id: string;
  descricao: string;
  para_quem: string;
  valor: number;
  data_vencimento: string;
  status: "pago" | "a_pagar";
  data_pagamento: string | null;
};

type Movimentacao = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  data: string;
  status: string;
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

function getMesAtual() {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}`;
}

function pertenceAoMes(
  data: string | null,
  mes: string
) {
  if (!data) {
    return false;
  }

  return data.startsWith(mes);
}

export default function BalancoPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [mesSelecionado, setMesSelecionado] =
    useState(getMesAtual());

  const [entradas, setEntradas] =
    useState<Entrada[]>([]);

  const [parcelas, setParcelas] =
    useState<Parcela[]>([]);

  const [saidas, setSaidas] =
    useState<Saida[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [erro, setErro] =
    useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      const [
        entradasResult,
        parcelasResult,
        saidasResult,
      ] = await Promise.all([
        supabase
          .from("entradas")
          .select(
            "id, produto_servico, cliente, valor_total, data_venda, status_pagamento"
          ),

        supabase
          .from("parcelas_receber")
          .select(
            "id, entrada_id, numero_parcela, total_parcelas, valor, vencimento, status, data_recebimento"
          ),

        supabase
          .from("saidas")
          .select(
            "id, descricao, para_quem, valor, data_vencimento, status, data_pagamento"
          ),
      ]);

      if (!ativo) {
        return;
      }

      if (
        entradasResult.error ||
        parcelasResult.error ||
        saidasResult.error
      ) {
        console.error({
          entradas: entradasResult.error,
          parcelas: parcelasResult.error,
          saidas: saidasResult.error,
        });

        setErro(
          "Não foi possível carregar o balanço mensal."
        );

        setLoading(false);

        return;
      }

      setEntradas(
        (entradasResult.data ?? []) as Entrada[]
      );

      setParcelas(
        (parcelasResult.data ?? []) as Parcela[]
      );

      setSaidas(
        (saidasResult.data ?? []) as Saida[]
      );

      setErro("");
      setLoading(false);
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [supabase]);

  const idsComParcelas = useMemo(() => {
    return new Set(
      parcelas.map(
        (parcela) => parcela.entrada_id
      )
    );
  }, [parcelas]);

  const resumo = useMemo(() => {
    /*
      RECEBIDO

      1. Parcelas efetivamente recebidas
         no mês escolhido.

      2. Vendas pagas à vista que não
         possuem parcelas.
    */

    const recebidoParcelas = parcelas
      .filter(
        (item) =>
          item.status === "recebido" &&
          pertenceAoMes(
            item.data_recebimento,
            mesSelecionado
          )
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    const recebidoAVista = entradas
      .filter(
        (item) =>
          item.status_pagamento === "pago" &&
          !idsComParcelas.has(item.id) &&
          pertenceAoMes(
            item.data_venda,
            mesSelecionado
          )
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor_total),
        0
      );

    const recebido =
      recebidoParcelas + recebidoAVista;

    /*
      A RECEBER

      Somente parcelas ainda abertas
      com vencimento no mês escolhido.
    */

    const aReceber = parcelas
      .filter(
        (item) =>
          item.status === "em_aberto" &&
          pertenceAoMes(
            item.vencimento,
            mesSelecionado
          )
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    /*
      PAGO

      Usa a data real do pagamento.
    */

    const pago = saidas
      .filter(
        (item) =>
          item.status === "pago" &&
          pertenceAoMes(
            item.data_pagamento,
            mesSelecionado
          )
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    /*
      A PAGAR

      Usa o vencimento da conta.
    */

    const aPagar = saidas
      .filter(
        (item) =>
          item.status === "a_pagar" &&
          pertenceAoMes(
            item.data_vencimento,
            mesSelecionado
          )
      )
      .reduce(
        (total, item) =>
          total + Number(item.valor),
        0
      );

    const saldo =
      recebido - pago;

    return {
      recebido,
      aReceber,
      pago,
      aPagar,
      saldo,
    };
  }, [
    entradas,
    parcelas,
    saidas,
    mesSelecionado,
    idsComParcelas,
  ]);

  const movimentacoes =
    useMemo(() => {
      const lista: Movimentacao[] = [];

      const entradaPorId =
        new Map(
          entradas.map((item) => [
            item.id,
            item,
          ])
        );

      /*
        PARCELAS RECEBIDAS NO MÊS
      */

      for (const parcela of parcelas) {
        if (
          parcela.status === "recebido" &&
          pertenceAoMes(
            parcela.data_recebimento,
            mesSelecionado
          ) &&
          parcela.data_recebimento
        ) {
          const entrada =
            entradaPorId.get(
              parcela.entrada_id
            );

          lista.push({
            id: `parcela-recebida-${parcela.id}`,
            tipo: "entrada",

            descricao:
              parcela.total_parcelas > 1
                ? `${
                    entrada?.produto_servico ??
                    "Recebimento"
                  } • ${parcela.numero_parcela}/${parcela.total_parcelas}`
                : entrada?.produto_servico ??
                  "Recebimento",

            valor: Number(
              parcela.valor
            ),

            data:
              parcela.data_recebimento,

            status: "Recebido",
          });
        }
      }

      /*
        VENDAS PAGAS À VISTA
      */

      for (const entrada of entradas) {
        if (
          entrada.status_pagamento ===
            "pago" &&
          !idsComParcelas.has(
            entrada.id
          ) &&
          pertenceAoMes(
            entrada.data_venda,
            mesSelecionado
          )
        ) {
          lista.push({
            id: `entrada-vista-${entrada.id}`,

            tipo: "entrada",

            descricao:
              entrada.produto_servico,

            valor: Number(
              entrada.valor_total
            ),

            data:
              entrada.data_venda,

            status: "Recebido",
          });
        }
      }

      /*
        PARCELAS PENDENTES DO MÊS
      */

      for (const parcela of parcelas) {
        if (
          parcela.status ===
            "em_aberto" &&
          pertenceAoMes(
            parcela.vencimento,
            mesSelecionado
          )
        ) {
          const entrada =
            entradaPorId.get(
              parcela.entrada_id
            );

          lista.push({
            id: `parcela-aberta-${parcela.id}`,

            tipo: "entrada",

            descricao:
              parcela.total_parcelas > 1
                ? `${
                    entrada?.produto_servico ??
                    "Recebimento"
                  } • ${parcela.numero_parcela}/${parcela.total_parcelas}`
                : entrada?.produto_servico ??
                  "Recebimento",

            valor: Number(
              parcela.valor
            ),

            data:
              parcela.vencimento,

            status: "A receber",
          });
        }
      }

      /*
        SAÍDAS
      */

      for (const saida of saidas) {
        if (
          saida.status === "pago" &&
          pertenceAoMes(
            saida.data_pagamento,
            mesSelecionado
          ) &&
          saida.data_pagamento
        ) {
          lista.push({
            id: `saida-paga-${saida.id}`,

            tipo: "saida",

            descricao:
              saida.descricao,

            valor: Number(
              saida.valor
            ),

            data:
              saida.data_pagamento,

            status: "Pago",
          });
        }

        if (
          saida.status === "a_pagar" &&
          pertenceAoMes(
            saida.data_vencimento,
            mesSelecionado
          )
        ) {
          lista.push({
            id: `saida-aberta-${saida.id}`,

            tipo: "saida",

            descricao:
              saida.descricao,

            valor: Number(
              saida.valor
            ),

            data:
              saida.data_vencimento,

            status: "A pagar",
          });
        }
      }

      return lista.sort(
        (a, b) =>
          new Date(
            b.data
          ).getTime() -
          new Date(
            a.data
          ).getTime()
      );
    }, [
      entradas,
      parcelas,
      saidas,
      mesSelecionado,
      idsComParcelas,
    ]);

  const proximosVencimentos =
    useMemo(() => {
      const itens: {
        id: string;
        tipo: "A receber" | "A pagar";
        valor: number;
        data: string;
      }[] = [];

      for (const parcela of parcelas) {
        if (
          parcela.status ===
            "em_aberto" &&
          pertenceAoMes(
            parcela.vencimento,
            mesSelecionado
          )
        ) {
          itens.push({
            id: `receber-${parcela.id}`,
            tipo: "A receber",
            valor: Number(
              parcela.valor
            ),
            data: parcela.vencimento,
          });
        }
      }

      for (const saida of saidas) {
        if (
          saida.status ===
            "a_pagar" &&
          pertenceAoMes(
            saida.data_vencimento,
            mesSelecionado
          )
        ) {
          itens.push({
            id: `pagar-${saida.id}`,
            tipo: "A pagar",
            valor: Number(
              saida.valor
            ),
            data:
              saida.data_vencimento,
          });
        }
      }

      return itens.sort(
        (a, b) =>
          new Date(
            a.data
          ).getTime() -
          new Date(
            b.data
          ).getTime()
      );
    }, [
      parcelas,
      saidas,
      mesSelecionado,
    ]);

  return (
    <main className="balanco-page">
      <header className="balanco-topbar">
        <button
          className="back-button"
          onClick={() =>
            router.push("/dashboard")
          }
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <div className="mes-selector">
          <CalendarDays size={18} />

          <input
            type="month"
            value={mesSelecionado}
            onChange={(event) => {
              setLoading(true);

              setMesSelecionado(
                event.target.value
              );
            }}
          />
        </div>
      </header>

      <section className="balanco-container">
        <div className="page-title">
          <span className="eyebrow">
            RELATÓRIO
          </span>

          <h1>Balanço mensal</h1>

          <p>
            Visão consolidada das
            entradas, saídas e
            compromissos financeiros
            do mês.
          </p>
        </div>

        {erro && (
          <div className="balanco-error">
            {erro}
          </div>
        )}

        <section className="balanco-metrics">
          <article className="balanco-card">
            <div className="balanco-icon green">
              <ArrowUpRight size={22} />
            </div>

            <span>Recebido</span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.recebido
                  )}
            </strong>

            <small>
              valores recebidos
            </small>
          </article>

          <article className="balanco-card">
            <div className="balanco-icon yellow">
              <Clock3 size={22} />
            </div>

            <span>A receber</span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.aReceber
                  )}
            </strong>

            <small>
              pendências do mês
            </small>
          </article>

          <article className="balanco-card">
            <div className="balanco-icon pink">
              <ArrowDownRight
                size={22}
              />
            </div>

            <span>Pago</span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.pago
                  )}
            </strong>

            <small>
              despesas quitadas
            </small>
          </article>

          <article className="balanco-card">
            <div className="balanco-icon magenta">
              <ReceiptText size={22} />
            </div>

            <span>A pagar</span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.aPagar
                  )}
            </strong>

            <small>
              compromissos pendentes
            </small>
          </article>

          <article className="balanco-card saldo-card">
            <div className="balanco-icon cyan">
              <CircleDollarSign
                size={22}
              />
            </div>

            <span>Saldo do mês</span>

            <strong>
              {loading
                ? "..."
                : formatMoney(
                    resumo.saldo
                  )}
            </strong>

            <small>
              recebido - pago
            </small>
          </article>
        </section>

        <section className="balanco-grid">
          <article className="balanco-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">
                  MOVIMENTAÇÕES
                </span>

                <h2>
                  Movimentações do mês
                </h2>
              </div>

              <WalletCards size={22} />
            </div>

            <div className="balanco-table-wrap">
              <table className="balanco-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Data</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="table-empty"
                      >
                        Carregando...
                      </td>
                    </tr>
                  ) : movimentacoes.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="table-empty"
                      >
                        Nenhuma movimentação
                        neste mês.
                      </td>
                    </tr>
                  ) : (
                    movimentacoes.map(
                      (item) => (
                        <tr key={item.id}>
                          <td>
                            <span
                              className={`mov-type ${item.tipo}`}
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
                                ? "money-green"
                                : "money-pink"
                            }
                          >
                            {formatMoney(
                              item.valor
                            )}
                          </td>

                          <td>
                            {formatDate(
                              item.data
                            )}
                          </td>

                          <td>
                            {item.status}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="balanco-panel vencimentos-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">
                  AGENDA
                </span>

                <h2>
                  Próximos vencimentos
                </h2>
              </div>

              <CalendarDays size={22} />
            </div>

            <div className="vencimentos-list">
              {loading ? (
                <div className="empty-state-balanco">
                  Carregando...
                </div>
              ) : proximosVencimentos.length ===
                0 ? (
                <div className="empty-state-balanco">
                  Nenhum vencimento
                  pendente neste mês.
                </div>
              ) : (
                proximosVencimentos.map(
                  (item) => (
                    <div
                      className="vencimento-item"
                      key={item.id}
                    >
                      <div>
                        <span
                          className={
                            item.tipo ===
                            "A receber"
                              ? "badge-receber"
                              : "badge-pagar"
                          }
                        >
                          {item.tipo}
                        </span>

                        <strong>
                          {formatMoney(
                            item.valor
                          )}
                        </strong>
                      </div>

                      <span>
                        {formatDate(
                          item.data
                        )}
                      </span>
                    </div>
                  )
                )
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}