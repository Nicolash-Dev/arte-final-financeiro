"use client";

import "./entradas.css";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  Check,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";


type StatusProduto =
  | "producao"
  | "acabamento"
  | "pronto"
  | "entregue";

type StatusPagamento =
  | "pago"
  | "a_receber";

type Entrada = {
  id: string;
  produto_servico: string;
  cliente: string | null;
  valor_total: number;
  data_venda: string;
  status_produto: StatusProduto;
  status_pagamento: StatusPagamento;
  parcelado: boolean;
  observacoes: string | null;
  created_at: string;
};

type ParcelaReceber = {
  id: string;
  entrada_id: string;
  numero_parcela: number;
  total_parcelas: number;
  valor: number;
  vencimento: string;
  status: "em_aberto" | "recebido";
  data_recebimento: string | null;
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


function statusPagamentoLabel(
  status: StatusPagamento
) {
  return status === "pago"
    ? "Pago"
    : "A receber";
}


export default function EntradasPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    entradas,
    setEntradas,
  ] = useState<Entrada[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    salvando,
    setSalvando,
  ] = useState(false);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    modalAberto,
    setModalAberto,
  ] = useState(false);

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    entradaEditando,
    setEntradaEditando,
  ] = useState<Entrada | null>(
    null
  );

  const [
    financeiroBloqueado,
    setFinanceiroBloqueado,
  ] = useState(false);

  const [
    produtoServico,
    setProdutoServico,
  ] = useState("");

  const [
    cliente,
    setCliente,
  ] = useState("");

  const [
    valor,
    setValor,
  ] = useState("");

  const [
    dataVenda,
    setDataVenda,
  ] = useState(
    new Date()
      .toISOString()
      .split("T")[0]
  );

  const [
    statusProduto,
    setStatusProduto,
  ] =
    useState<StatusProduto>(
      "producao"
    );

  const [
    statusPagamento,
    setStatusPagamento,
  ] =
    useState<StatusPagamento>(
      "a_receber"
    );

  const [
    parcelado,
    setParcelado,
  ] = useState(false);

  const [
    quantidadeParcelas,
    setQuantidadeParcelas,
  ] = useState("2");

  const [
    primeiroVencimento,
    setPrimeiroVencimento,
  ] = useState(
    new Date()
      .toISOString()
      .split("T")[0]
  );

  const [
    observacoes,
    setObservacoes,
  ] = useState("");


  async function carregarEntradas() {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("entradas")
      .select("*")
      .order(
        "data_venda",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Erro ao carregar entradas:",
        error
      );

      setErro(
        "Não foi possível carregar as entradas."
      );

      setLoading(false);

      return;
    }

    setEntradas(
      (data ?? []) as Entrada[]
    );

    setLoading(false);
  }


  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      const {
        data,
        error,
      } = await supabase
        .from("entradas")
        .select("*")
        .order(
          "data_venda",
          {
            ascending: false,
          }
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (!ativo) {
        return;
      }

      if (error) {
        console.error(
          "Erro ao carregar entradas:",
          error
        );

        setErro(
          "Não foi possível carregar as entradas."
        );

        setLoading(false);

        return;
      }

      setEntradas(
        (data ?? []) as Entrada[]
      );

      setLoading(false);
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, [supabase]);


  function limparFormulario() {
    setEntradaEditando(null);

    setFinanceiroBloqueado(
      false
    );

    setProdutoServico("");
    setCliente("");
    setValor("");

    setDataVenda(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setStatusProduto(
      "producao"
    );

    setStatusPagamento(
      "a_receber"
    );

    setParcelado(false);

    setQuantidadeParcelas(
      "2"
    );

    setPrimeiroVencimento(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setObservacoes("");
  }


  function abrirNovaEntrada() {
    limparFormulario();

    setErro("");

    setModalAberto(true);
  }


  function fecharModal() {
    if (salvando) {
      return;
    }

    setModalAberto(false);

    setErro("");

    limparFormulario();
  }


  async function abrirEdicao(
    entrada: Entrada
  ) {
    setErro("");

    const {
      data: parcelasData,
      error,
    } = await supabase
      .from(
        "parcelas_receber"
      )
      .select("*")
      .eq(
        "entrada_id",
        entrada.id
      )
      .order(
        "numero_parcela",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        "Erro ao carregar parcelas:",
        error
      );

      alert(
        "Não foi possível abrir essa entrada para edição."
      );

      return;
    }

    const parcelas =
      (parcelasData ??
        []) as ParcelaReceber[];

    const temRecebimento =
      parcelas.some(
        (item) =>
          item.status ===
          "recebido"
      );

    setEntradaEditando(
      entrada
    );

    setFinanceiroBloqueado(
      temRecebimento
    );

    setProdutoServico(
      entrada.produto_servico
    );

    setCliente(
      entrada.cliente ?? ""
    );

    setValor(
      String(
        Number(
          entrada.valor_total
        )
      ).replace(".", ",")
    );

    setDataVenda(
      entrada.data_venda
    );

    setStatusProduto(
      entrada.status_produto
    );

    setStatusPagamento(
      entrada.status_pagamento
    );

    setObservacoes(
      entrada.observacoes ?? ""
    );

    if (
      parcelas.length > 0
    ) {
      setParcelado(
        parcelas.length > 1
      );

      setQuantidadeParcelas(
        String(
          parcelas.length
        )
      );

      setPrimeiroVencimento(
        parcelas[0].vencimento
      );
    } else {
      setParcelado(false);

      setQuantidadeParcelas(
        "2"
      );

      setPrimeiroVencimento(
        entrada.data_venda
      );
    }

    setModalAberto(true);
  }


  function adicionarMes(
    data: string,
    meses: number
  ) {
    const [
      ano,
      mes,
      dia,
    ] = data
      .split("-")
      .map(Number);

    const ultimoDiaDestino =
      new Date(
        ano,
        mes + meses,
        0
      ).getDate();

    const diaSeguro =
      Math.min(
        dia,
        ultimoDiaDestino
      );

    const novaData =
      new Date(
        ano,
        mes - 1 + meses,
        diaSeguro
      );

    const novoAno =
      novaData.getFullYear();

    const novoMes =
      String(
        novaData.getMonth() +
          1
      ).padStart(
        2,
        "0"
      );

    const novoDia =
      String(
        novaData.getDate()
      ).padStart(
        2,
        "0"
      );

    return `${novoAno}-${novoMes}-${novoDia}`;
  }


  function gerarParcelas(
    entradaId: string,
    valorNumero: number
  ) {
    const qtd =
      parcelado
        ? Number(
            quantidadeParcelas
          )
        : 1;

    const valorParcela =
      Math.floor(
        (valorNumero / qtd) *
          100
      ) / 100;

    const novasParcelas = [];

    for (
      let numero = 1;
      numero <= qtd;
      numero++
    ) {
      const valorDaParcela =
        numero === qtd
          ? Math.round(
              (
                valorNumero -
                valorParcela *
                  (qtd - 1)
              ) *
                100
            ) / 100
          : valorParcela;

      novasParcelas.push({
        entrada_id:
          entradaId,

        numero_parcela:
          numero,

        total_parcelas:
          qtd,

        valor:
          valorDaParcela,

        vencimento:
          adicionarMes(
            primeiroVencimento,
            numero - 1
          ),

        status:
          "em_aberto",
      });
    }

    return novasParcelas;
  }


  async function criarEntrada(
    valorNumero: number
  ) {
    const {
      data: entradaCriada,
      error: entradaError,
    } = await supabase
      .from("entradas")
      .insert({
        produto_servico:
          produtoServico.trim(),

        cliente:
          cliente.trim() ||
          null,

        valor_total:
          valorNumero,

        data_venda:
          dataVenda,

        status_produto:
          statusProduto,

        status_pagamento:
          statusPagamento,

        parcelado:
          statusPagamento ===
            "a_receber"
            ? parcelado
            : false,

        observacoes:
          observacoes.trim() ||
          null,
      })
      .select()
      .single();

    if (
      entradaError ||
      !entradaCriada
    ) {
      throw entradaError ??
        new Error(
          "Entrada não criada."
        );
    }

    if (
      statusPagamento ===
      "a_receber"
    ) {
      const novasParcelas =
        gerarParcelas(
          entradaCriada.id,
          valorNumero
        );

      const {
        error:
          parcelasError,
      } = await supabase
        .from(
          "parcelas_receber"
        )
        .insert(
          novasParcelas
        );

      if (parcelasError) {
        throw parcelasError;
      }
    }
  }


  async function editarEntrada(
    entrada: Entrada,
    valorNumero: number
  ) {
    /*
      Se já houve recebimento,
      não alteramos valor,
      pagamento ou parcelamento.

      Isso protege o histórico.
    */

    if (
      financeiroBloqueado
    ) {
      const { error } =
        await supabase
          .from("entradas")
          .update({
            produto_servico:
              produtoServico.trim(),

            cliente:
              cliente.trim() ||
              null,

            data_venda:
              dataVenda,

            status_produto:
              statusProduto,

            observacoes:
              observacoes.trim() ||
              null,
          })
          .eq(
            "id",
            entrada.id
          );

      if (error) {
        throw error;
      }

      return;
    }


    /*
      Sem recebimentos:
      podemos refazer a parte
      financeira com segurança.
    */

    const { error } =
      await supabase
        .from("entradas")
        .update({
          produto_servico:
            produtoServico.trim(),

          cliente:
            cliente.trim() ||
            null,

          valor_total:
            valorNumero,

          data_venda:
            dataVenda,

          status_produto:
            statusProduto,

          status_pagamento:
            statusPagamento,

          parcelado:
            statusPagamento ===
              "a_receber"
              ? parcelado
              : false,

          observacoes:
            observacoes.trim() ||
            null,
        })
        .eq(
          "id",
          entrada.id
        );

    if (error) {
      throw error;
    }


    const {
      error:
        deleteParcelasError,
    } = await supabase
      .from(
        "parcelas_receber"
      )
      .delete()
      .eq(
        "entrada_id",
        entrada.id
      );

    if (
      deleteParcelasError
    ) {
      throw deleteParcelasError;
    }


    if (
      statusPagamento ===
      "a_receber"
    ) {
      const novasParcelas =
        gerarParcelas(
          entrada.id,
          valorNumero
        );

      const {
        error:
          parcelasError,
      } = await supabase
        .from(
          "parcelas_receber"
        )
        .insert(
          novasParcelas
        );

      if (parcelasError) {
        throw parcelasError;
      }
    }
  }


  async function handleSalvarEntrada(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErro("");

    const valorNumero =
      Number(
        valor
          .replace(/\./g, "")
          .replace(",", ".")
      );

    if (
      !produtoServico.trim() ||
      !Number.isFinite(
        valorNumero
      ) ||
      valorNumero <= 0
    ) {
      setErro(
        "Preencha o produto/serviço e um valor válido."
      );

      return;
    }

    if (
      !financeiroBloqueado &&
      statusPagamento ===
        "a_receber" &&
      parcelado &&
      Number(
        quantidadeParcelas
      ) < 2
    ) {
      setErro(
        "Informe pelo menos 2 parcelas."
      );

      return;
    }

    setSalvando(true);

    try {
      if (
        entradaEditando
      ) {
        await editarEntrada(
          entradaEditando,
          valorNumero
        );
      } else {
        await criarEntrada(
          valorNumero
        );
      }

      setModalAberto(false);

      limparFormulario();

      await carregarEntradas();
    } catch (error) {
      console.error(
        "Erro ao salvar entrada:",
        error
      );

      setErro(
        entradaEditando
          ? "Não foi possível atualizar a entrada."
          : "Não foi possível salvar a entrada."
      );
    } finally {
      setSalvando(false);
    }
  }


  async function excluirEntrada(
    entrada: Entrada
  ) {
    const confirmou =
      window.confirm(
        `Excluir "${entrada.produto_servico}"?\n\nAs parcelas vinculadas a essa venda também serão excluídas.`
      );

    if (!confirmou) {
      return;
    }

    const {
      data: parcelasData,
      error:
        parcelasError,
    } = await supabase
      .from(
        "parcelas_receber"
      )
      .select(
        "id, status"
      )
      .eq(
        "entrada_id",
        entrada.id
      );

    if (parcelasError) {
      console.error(
        parcelasError
      );

      alert(
        "Não foi possível verificar os recebimentos dessa entrada."
      );

      return;
    }

    const temRecebidos =
      (
        parcelasData ?? []
      ).some(
        (item) =>
          item.status ===
          "recebido"
      );

    if (
      temRecebidos
    ) {
      const confirmouHistorico =
        window.confirm(
          "ATENÇÃO: essa venda possui valores já recebidos.\n\nExcluir apagará também esse histórico financeiro.\n\nDeseja realmente continuar?"
        );

      if (
        !confirmouHistorico
      ) {
        return;
      }
    }

    const {
      error,
    } = await supabase
      .from("entradas")
      .delete()
      .eq(
        "id",
        entrada.id
      );

    if (error) {
      console.error(
        "Erro ao excluir:",
        error
      );

      alert(
        "Não foi possível excluir a entrada."
      );

      return;
    }

    await carregarEntradas();
  }


  async function atualizarStatusProduto(
    id: string,
    novoStatus: StatusProduto
  ) {
    const { error } =
      await supabase
        .from("entradas")
        .update({
          status_produto:
            novoStatus,
        })
        .eq(
          "id",
          id
        );

    if (error) {
      console.error(
        "Erro ao atualizar status:",
        error
      );

      alert(
        "Não foi possível atualizar o status."
      );

      return;
    }

    setEntradas(
      (atual) =>
        atual.map(
          (item) =>
            item.id === id
              ? {
                  ...item,

                  status_produto:
                    novoStatus,
                }
              : item
        )
    );
  }


  const entradasFiltradas =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      if (!termo) {
        return entradas;
      }

      return entradas.filter(
        (item) => {
          const produto =
            item.produto_servico.toLowerCase();

          const nomeCliente =
            item.cliente
              ?.toLowerCase() ??
            "";

          return (
            produto.includes(
              termo
            ) ||
            nomeCliente.includes(
              termo
            )
          );
        }
      );
    }, [
      entradas,
      busca,
    ]);


  const resumo =
    useMemo(() => {
      const recebido =
        entradas
          .filter(
            (item) =>
              item.status_pagamento ===
              "pago"
          )
          .reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.valor_total
              ),
            0
          );

      const aReceber =
        entradas
          .filter(
            (item) =>
              item.status_pagamento ===
              "a_receber"
          )
          .reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.valor_total
              ),
            0
          );

      const total =
        entradas.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.valor_total
            ),
          0
        );

      const entregues =
        entradas.filter(
          (item) =>
            item.status_produto ===
            "entregue"
        ).length;

      return {
        recebido,
        aReceber,
        total,
        entregues,
      };
    }, [entradas]);


  return (
    <main className="entradas-page">

      <header className="entradas-topbar">

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

        <button
          className="nova-entrada-top"
          onClick={
            abrirNovaEntrada
          }
        >
          <Plus size={18} />
          Nova entrada
        </button>

      </header>


      <section className="entradas-container">

        <div className="page-title">

          <span className="eyebrow">
            LANÇAMENTOS
          </span>

          <h1>
            Entradas
          </h1>

          <p>
            Gerencie as vendas e os
            recebimentos da Arte Final.
          </p>

        </div>


        <section className="entrada-metrics">

          <article className="entrada-metric-card green-card">

            <div className="entrada-metric-icon green">
              <CircleDollarSign
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
              vendas pagas
            </small>

          </article>


          <article className="entrada-metric-card yellow-card">

            <div className="entrada-metric-icon yellow">
              <Clock3 size={22} />
            </div>

            <span>
              A receber
            </span>

            <strong>
              {formatMoney(
                resumo.aReceber
              )}
            </strong>

            <small>
              pagamentos pendentes
            </small>

          </article>


          <article className="entrada-metric-card cyan-card">

            <div className="entrada-metric-icon cyan">
              <ReceiptText
                size={22}
              />
            </div>

            <span>
              Total lançado
            </span>

            <strong>
              {formatMoney(
                resumo.total
              )}
            </strong>

            <small>
              {entradas.length} venda(s)
            </small>

          </article>


          <article className="entrada-metric-card magenta-card">

            <div className="entrada-metric-icon magenta">
              <PackageCheck
                size={22}
              />
            </div>

            <span>
              Entregues
            </span>

            <strong>
              {resumo.entregues}
            </strong>

            <small>
              serviços finalizados
            </small>

          </article>

        </section>


        <section className="entradas-panel">

          <div className="entradas-toolbar">

            <div className="search-box">

              <Search size={18} />

              <input
                value={busca}
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar por cliente ou serviço..."
              />

            </div>


            <button
              className="nova-entrada-button"
              onClick={
                abrirNovaEntrada
              }
            >
              <Plus size={18} />
              Nova entrada
            </button>

          </div>


          {erro &&
            !modalAberto && (
              <div className="entrada-error">
                {erro}
              </div>
            )}


          <div className="entradas-table-wrap">

            <table className="entradas-table">

              <thead>
                <tr>
                  <th>
                    Produto / Serviço
                  </th>

                  <th>
                    Cliente
                  </th>

                  <th>
                    Valor
                  </th>

                  <th>
                    Data
                  </th>

                  <th>
                    Status do produto
                  </th>

                  <th>
                    Pagamento
                  </th>

                  <th>
                    Ações
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

                ) :
                entradasFiltradas.length ===
                0 ? (

                  <tr>
                    <td
                      colSpan={7}
                      className="table-empty"
                    >
                      Nenhuma entrada cadastrada.
                    </td>
                  </tr>

                ) : (

                  entradasFiltradas.map(
                    (entrada) => (

                      <tr
                        key={
                          entrada.id
                        }
                      >

                        <td>
                          <div className="produto-cell">

                            <strong>
                              {
                                entrada.produto_servico
                              }
                            </strong>

                            {entrada.observacoes && (
                              <span>
                                {
                                  entrada.observacoes
                                }
                              </span>
                            )}

                          </div>
                        </td>


                        <td>
                          {entrada.cliente ||
                            "—"}
                        </td>


                        <td className="entrada-value">
                          {formatMoney(
                            Number(
                              entrada.valor_total
                            )
                          )}
                        </td>


                        <td>
                          {formatDate(
                            entrada.data_venda
                          )}
                        </td>


                        <td>

                          <select
                            className={`status-select ${entrada.status_produto}`}
                            value={
                              entrada.status_produto
                            }
                            onChange={(
                              event
                            ) =>
                              atualizarStatusProduto(
                                entrada.id,
                                event
                                  .target
                                  .value as StatusProduto
                              )
                            }
                          >

                            <option value="producao">
                              Produção
                            </option>

                            <option value="acabamento">
                              Acabamento
                            </option>

                            <option value="pronto">
                              Pronto
                            </option>

                            <option value="entregue">
                              Entregue
                            </option>

                          </select>

                        </td>


                        <td>

                          <span
                            className={`payment-status ${entrada.status_pagamento}`}
                          >
                            {statusPagamentoLabel(
                              entrada.status_pagamento
                            )}
                          </span>

                        </td>


                        <td>

                          <div className="entrada-actions">

                            <button
                              type="button"
                              className="entrada-action-button edit"
                              title="Editar entrada"
                              onClick={() =>
                                abrirEdicao(
                                  entrada
                                )
                              }
                            >
                              <Pencil
                                size={16}
                              />
                            </button>


                            <button
                              type="button"
                              className="entrada-action-button delete"
                              title="Excluir entrada"
                              onClick={() =>
                                excluirEntrada(
                                  entrada
                                )
                              }
                            >
                              <Trash2
                                size={16}
                              />
                            </button>

                          </div>

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


      {modalAberto && (
        <>

          <div
            className="modal-overlay"
            onClick={
              fecharModal
            }
          />


          <aside className="entrada-drawer">

            <div className="drawer-head">

              <div>

                <span className="eyebrow">
                  {entradaEditando
                    ? "EDITAR LANÇAMENTO"
                    : "NOVO LANÇAMENTO"}
                </span>

                <h2>
                  {entradaEditando
                    ? "Editar entrada"
                    : "Nova entrada"}
                </h2>

              </div>


              <button
                type="button"
                className="drawer-close"
                onClick={
                  fecharModal
                }
              >
                <X size={20} />
              </button>

            </div>


            {financeiroBloqueado && (
              <div className="financial-lock-warning">
                <strong>
                  Dados financeiros protegidos
                </strong>

                <span>
                  Esta venda já possui
                  recebimento registrado.
                  Valor, pagamento e
                  parcelamento não podem ser
                  alterados.
                </span>
              </div>
            )}


            <form
              className="entrada-form"
              onSubmit={
                handleSalvarEntrada
              }
            >

              <label>

                <span>
                  Produto / Serviço *
                </span>

                <input
                  value={
                    produtoServico
                  }
                  onChange={(
                    event
                  ) =>
                    setProdutoServico(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Fachada em ACM"
                  required
                />

              </label>


              <label>

                <span>
                  Cliente
                </span>

                <input
                  value={cliente}
                  onChange={(
                    event
                  ) =>
                    setCliente(
                      event.target.value
                    )
                  }
                  placeholder="Nome do cliente"
                />

              </label>


              <div className="form-row">

                <label>

                  <span>
                    Valor *
                  </span>

                  <input
                    value={valor}
                    onChange={(
                      event
                    ) =>
                      setValor(
                        event.target.value
                      )
                    }
                    inputMode="decimal"
                    placeholder="0,00"
                    required
                    disabled={
                      financeiroBloqueado
                    }
                  />

                </label>


                <label>

                  <span>
                    Data *
                  </span>

                  <input
                    type="date"
                    value={
                      dataVenda
                    }
                    onChange={(
                      event
                    ) =>
                      setDataVenda(
                        event.target.value
                      )
                    }
                    required
                  />

                </label>

              </div>


              <label>

                <span>
                  Status do produto
                </span>

                <select
                  value={
                    statusProduto
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusProduto(
                      event
                        .target
                        .value as StatusProduto
                    )
                  }
                >

                  <option value="producao">
                    Produção
                  </option>

                  <option value="acabamento">
                    Acabamento
                  </option>

                  <option value="pronto">
                    Pronto
                  </option>

                  <option value="entregue">
                    Entregue
                  </option>

                </select>

              </label>


              <label>

                <span>
                  Status do pagamento
                </span>

                <select
                  value={
                    statusPagamento
                  }
                  disabled={
                    financeiroBloqueado
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusPagamento(
                      event
                        .target
                        .value as StatusPagamento
                    )
                  }
                >

                  <option value="pago">
                    Pago
                  </option>

                  <option value="a_receber">
                    A receber
                  </option>

                </select>

              </label>


              {statusPagamento ===
                "a_receber" && (
                <>

                  <label className="toggle-row">

                    <div>
                      <strong>
                        Parcelado
                      </strong>

                      <span>
                        Gerar parcelas futuras
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        parcelado
                      }
                      disabled={
                        financeiroBloqueado
                      }
                      onChange={(
                        event
                      ) =>
                        setParcelado(
                          event
                            .target
                            .checked
                        )
                      }
                    />

                  </label>


                  {parcelado ? (

                    <div className="form-row">

                      <label>

                        <span>
                          Nº de parcelas
                        </span>

                        <input
                          type="number"
                          min="2"
                          max="60"
                          value={
                            quantidadeParcelas
                          }
                          disabled={
                            financeiroBloqueado
                          }
                          onChange={(
                            event
                          ) =>
                            setQuantidadeParcelas(
                              event
                                .target
                                .value
                            )
                          }
                          required
                        />

                      </label>


                      <label>

                        <span>
                          1º vencimento
                        </span>

                        <input
                          type="date"
                          value={
                            primeiroVencimento
                          }
                          disabled={
                            financeiroBloqueado
                          }
                          onChange={(
                            event
                          ) =>
                            setPrimeiroVencimento(
                              event
                                .target
                                .value
                            )
                          }
                          required
                        />

                      </label>

                    </div>

                  ) : (

                    <label>

                      <span>
                        Vencimento
                      </span>

                      <input
                        type="date"
                        value={
                          primeiroVencimento
                        }
                        disabled={
                          financeiroBloqueado
                        }
                        onChange={(
                          event
                        ) =>
                          setPrimeiroVencimento(
                            event
                              .target
                              .value
                          )
                        }
                        required
                      />

                    </label>

                  )}

                </>
              )}


              <label>

                <span>
                  Observações
                </span>

                <textarea
                  value={
                    observacoes
                  }
                  onChange={(
                    event
                  ) =>
                    setObservacoes(
                      event.target.value
                    )
                  }
                  placeholder="Informações adicionais..."
                  rows={4}
                />

              </label>


              {erro && (
                <div className="entrada-error">
                  {erro}
                </div>
              )}


              <div className="drawer-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    fecharModal
                  }
                >
                  Cancelar
                </button>


                <button
                  type="submit"
                  className="save-button"
                  disabled={
                    salvando
                  }
                >
                  <Check
                    size={18}
                  />

                  {salvando
                    ? "Salvando..."
                    : entradaEditando
                    ? "Salvar alterações"
                    : "Salvar entrada"}
                </button>

              </div>

            </form>

          </aside>

        </>
      )}

    </main>
  );
}