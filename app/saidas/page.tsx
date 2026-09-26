"use client";

import "./saidas.css";

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
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
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


function hoje() {
  return new Date()
    .toISOString()
    .split("T")[0];
}


export default function SaidasPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    saidas,
    setSaidas,
  ] = useState<Saida[]>([]);

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
    saidaEditando,
    setSaidaEditando,
  ] = useState<Saida | null>(
    null
  );

  const [
    financeiroBloqueado,
    setFinanceiroBloqueado,
  ] = useState(false);

  const [
    descricao,
    setDescricao,
  ] = useState("");

  const [
    paraQuem,
    setParaQuem,
  ] = useState("");

  const [
    valor,
    setValor,
  ] = useState("");

  const [
    dataVencimento,
    setDataVencimento,
  ] = useState(
    hoje()
  );

  const [
    status,
    setStatus,
  ] =
    useState<StatusSaida>(
      "a_pagar"
    );

  const [
    categoria,
    setCategoria,
  ] = useState("");

  const [
    observacoes,
    setObservacoes,
  ] = useState("");


  async function carregarSaidas() {
    setLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("saidas")
      .select("*")
      .order(
        "data_vencimento",
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
        "Erro ao carregar saídas:",
        error
      );

      setErro(
        "Não foi possível carregar as saídas."
      );

      setLoading(false);

      return;
    }

    setSaidas(
      (data ?? []) as Saida[]
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
        .from("saidas")
        .select("*")
        .order(
          "data_vencimento",
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
          "Erro ao carregar saídas:",
          error
        );

        setErro(
          "Não foi possível carregar as saídas."
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


  function limparFormulario() {
    setSaidaEditando(null);

    setFinanceiroBloqueado(
      false
    );

    setDescricao("");
    setParaQuem("");
    setValor("");

    setDataVencimento(
      hoje()
    );

    setStatus(
      "a_pagar"
    );

    setCategoria("");
    setObservacoes("");
  }


  function abrirNovaSaida() {
    limparFormulario();

    setErro("");

    setModalAberto(true);
  }


  function abrirEdicao(
    saida: Saida
  ) {
    setErro("");

    setSaidaEditando(
      saida
    );

    /*
      Se já foi paga, protegemos
      os dados financeiros.
    */

    setFinanceiroBloqueado(
      saida.status === "pago"
    );

    setDescricao(
      saida.descricao
    );

    setParaQuem(
      saida.para_quem
    );

    setValor(
      String(
        Number(
          saida.valor
        )
      ).replace(
        ".",
        ","
      )
    );

    setDataVencimento(
      saida.data_vencimento
    );

    setStatus(
      saida.status
    );

    setCategoria(
      saida.categoria ?? ""
    );

    setObservacoes(
      saida.observacoes ?? ""
    );

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


  async function handleSalvarSaida(
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
      !descricao.trim() ||
      !paraQuem.trim() ||
      !Number.isFinite(
        valorNumero
      ) ||
      valorNumero <= 0
    ) {
      setErro(
        "Preencha descrição, para quem e um valor válido."
      );

      return;
    }

    setSalvando(true);

    try {
      if (saidaEditando) {
        /*
          DESPESA JÁ PAGA

          Podemos editar apenas
          informações descritivas.
        */

        if (
          financeiroBloqueado
        ) {
          const {
            error,
          } = await supabase
            .from("saidas")
            .update({
              descricao:
                descricao.trim(),

              para_quem:
                paraQuem.trim(),

              categoria:
                categoria.trim() ||
                null,

              observacoes:
                observacoes.trim() ||
                null,
            })
            .eq(
              "id",
              saidaEditando.id
            );

          if (error) {
            throw error;
          }
        } else {
          /*
            DESPESA AINDA ABERTA

            Pode editar valor,
            vencimento e status.
          */

          const {
            error,
          } = await supabase
            .from("saidas")
            .update({
              descricao:
                descricao.trim(),

              para_quem:
                paraQuem.trim(),

              valor:
                valorNumero,

              data_vencimento:
                dataVencimento,

              status,

              data_pagamento:
                status === "pago"
                  ? hoje()
                  : null,

              categoria:
                categoria.trim() ||
                null,

              observacoes:
                observacoes.trim() ||
                null,
            })
            .eq(
              "id",
              saidaEditando.id
            );

          if (error) {
            throw error;
          }
        }
      } else {
        /*
          NOVA SAÍDA
        */

        const {
          error,
        } = await supabase
          .from("saidas")
          .insert({
            descricao:
              descricao.trim(),

            para_quem:
              paraQuem.trim(),

            valor:
              valorNumero,

            data_vencimento:
              dataVencimento,

            status,

            data_pagamento:
              status === "pago"
                ? hoje()
                : null,

            categoria:
              categoria.trim() ||
              null,

            observacoes:
              observacoes.trim() ||
              null,
          });

        if (error) {
          throw error;
        }
      }

      setModalAberto(false);

      limparFormulario();

      await carregarSaidas();
    } catch (error) {
      console.error(
        "Erro ao salvar saída:",
        error
      );

      setErro(
        saidaEditando
          ? "Não foi possível atualizar a saída."
          : "Não foi possível salvar a saída."
      );
    } finally {
      setSalvando(false);
    }
  }


  async function excluirSaida(
    saida: Saida
  ) {
    const confirmou =
      window.confirm(
        `Excluir "${saida.descricao}" no valor de ${formatMoney(
          Number(
            saida.valor
          )
        )}?`
      );

    if (!confirmou) {
      return;
    }


    /*
      Se já foi paga, exigimos
      uma segunda confirmação.
    */

    if (
      saida.status === "pago"
    ) {
      const confirmouPago =
        window.confirm(
          "ATENÇÃO: essa despesa já foi marcada como paga.\n\nExcluir também removerá esse pagamento do histórico financeiro.\n\nDeseja realmente continuar?"
        );

      if (
        !confirmouPago
      ) {
        return;
      }
    }


    const {
      error,
    } = await supabase
      .from("saidas")
      .delete()
      .eq(
        "id",
        saida.id
      );

    if (error) {
      console.error(
        "Erro ao excluir saída:",
        error
      );

      alert(
        "Não foi possível excluir a saída."
      );

      return;
    }

    await carregarSaidas();
  }


  async function atualizarStatus(
    saida: Saida,
    novoStatus: StatusSaida
  ) {
    if (
      novoStatus ===
      saida.status
    ) {
      return;
    }


    /*
      MARCAR COMO PAGO
    */

    if (
      novoStatus === "pago"
    ) {
      const confirmou =
        window.confirm(
          `Confirmar pagamento de ${formatMoney(
            Number(
              saida.valor
            )
          )} para ${saida.para_quem}?`
        );

      if (!confirmou) {
        return;
      }
    }


    /*
      REABRIR UMA CONTA PAGA
    */

    if (
      saida.status === "pago" &&
      novoStatus === "a_pagar"
    ) {
      const confirmou =
        window.confirm(
          "Essa despesa já estava marcada como paga.\n\nDeseja realmente voltar para A pagar?"
        );

      if (!confirmou) {
        return;
      }
    }


    const dataPagamento =
      novoStatus === "pago"
        ? hoje()
        : null;


    const {
      error,
    } = await supabase
      .from("saidas")
      .update({
        status:
          novoStatus,

        data_pagamento:
          dataPagamento,
      })
      .eq(
        "id",
        saida.id
      );

    if (error) {
      console.error(
        "Erro ao atualizar saída:",
        error
      );

      alert(
        "Não foi possível atualizar o status."
      );

      return;
    }


    setSaidas(
      (atual) =>
        atual.map(
          (item) =>
            item.id ===
            saida.id
              ? {
                  ...item,

                  status:
                    novoStatus,

                  data_pagamento:
                    dataPagamento,
                }
              : item
        )
    );
  }


  const saidasFiltradas =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      if (!termo) {
        return saidas;
      }

      return saidas.filter(
        (item) => {
          const texto =
            `${item.descricao} ${item.para_quem} ${item.categoria ?? ""}`
              .toLowerCase();

          return texto.includes(
            termo
          );
        }
      );
    }, [
      saidas,
      busca,
    ]);


  const resumo =
    useMemo(() => {
      const pago =
        saidas
          .filter(
            (item) =>
              item.status ===
              "pago"
          )
          .reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.valor
              ),
            0
          );

      const aPagar =
        saidas
          .filter(
            (item) =>
              item.status ===
              "a_pagar"
          )
          .reduce(
            (
              total,
              item
            ) =>
              total +
              Number(
                item.valor
              ),
            0
          );

      const total =
        saidas.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.valor
            ),
          0
        );

      return {
        pago,
        aPagar,
        total,
      };
    }, [saidas]);


  return (
    <main className="saidas-page">

      <header className="saidas-topbar">

        <button
          className="back-button"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
        >
          <ArrowLeft
            size={18}
          />

          Dashboard
        </button>


        <button
          className="nova-saida-top"
          onClick={
            abrirNovaSaida
          }
        >
          <Plus
            size={18}
          />

          Nova saída
        </button>

      </header>


      <section className="saidas-container">

        <div className="page-title">

          <span className="eyebrow">
            LANÇAMENTOS
          </span>

          <h1>
            Saídas
          </h1>

          <p>
            Controle despesas,
            vencimentos e pagamentos
            da Arte Final.
          </p>

        </div>


        <section className="saida-metrics">

          <article className="saida-metric-card">

            <div className="saida-metric-icon pink">
              <CircleDollarSign
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


          <article className="saida-metric-card">

            <div className="saida-metric-icon yellow">
              <Clock3
                size={22}
              />
            </div>

            <span>
              A pagar
            </span>

            <strong>
              {formatMoney(
                resumo.aPagar
              )}
            </strong>

            <small>
              contas pendentes
            </small>

          </article>


          <article className="saida-metric-card">

            <div className="saida-metric-icon cyan">
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
              {saidas.length} despesa(s)
            </small>

          </article>

        </section>


        <section className="saidas-panel">

          <div className="saidas-toolbar">

            <div className="search-box">

              <Search
                size={18}
              />

              <input
                value={
                  busca
                }
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target.value
                  )
                }
                placeholder="Buscar por descrição ou fornecedor..."
              />

            </div>


            <button
              className="nova-saida-button"
              onClick={
                abrirNovaSaida
              }
            >
              <Plus
                size={18}
              />

              Nova saída
            </button>

          </div>


          {erro &&
            !modalAberto && (
              <div className="saida-error">
                {erro}
              </div>
            )}


          <div className="saidas-table-wrap">

            <table className="saidas-table">

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
                saidasFiltradas.length ===
                0 ? (

                  <tr>
                    <td
                      colSpan={7}
                      className="table-empty"
                    >
                      Nenhuma saída cadastrada.
                    </td>
                  </tr>

                ) : (

                  saidasFiltradas.map(
                    (saida) => (

                      <tr
                        key={
                          saida.id
                        }
                      >

                        <td>

                          <div className="descricao-cell">

                            <strong>
                              {
                                saida.descricao
                              }
                            </strong>

                            {saida.observacoes && (
                              <span>
                                {
                                  saida.observacoes
                                }
                              </span>
                            )}

                          </div>

                        </td>


                        <td>
                          {
                            saida.para_quem
                          }
                        </td>


                        <td>
                          {
                            saida.categoria ||
                            "—"
                          }
                        </td>


                        <td className="saida-value">

                          {formatMoney(
                            Number(
                              saida.valor
                            )
                          )}

                        </td>


                        <td>

                          {formatDate(
                            saida.data_vencimento
                          )}

                        </td>


                        <td>

                          <select
                            className={`saida-status ${saida.status}`}
                            value={
                              saida.status
                            }
                            onChange={(
                              event
                            ) =>
                              atualizarStatus(
                                saida,
                                event
                                  .target
                                  .value as StatusSaida
                              )
                            }
                          >

                            <option value="a_pagar">
                              A pagar
                            </option>

                            <option value="pago">
                              Pago
                            </option>

                          </select>

                        </td>


                        <td>

                          <div className="saida-actions">

                            <button
                              type="button"
                              className="saida-action-button edit"
                              title="Editar saída"
                              onClick={() =>
                                abrirEdicao(
                                  saida
                                )
                              }
                            >
                              <Pencil
                                size={16}
                              />
                            </button>


                            <button
                              type="button"
                              className="saida-action-button delete"
                              title="Excluir saída"
                              onClick={() =>
                                excluirSaida(
                                  saida
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


          <aside className="saida-drawer">

            <div className="drawer-head">

              <div>

                <span className="eyebrow">
                  {saidaEditando
                    ? "EDITAR LANÇAMENTO"
                    : "NOVO LANÇAMENTO"}
                </span>

                <h2>
                  {saidaEditando
                    ? "Editar saída"
                    : "Nova saída"}
                </h2>

              </div>


              <button
                type="button"
                className="drawer-close"
                onClick={
                  fecharModal
                }
              >
                <X
                  size={20}
                />
              </button>

            </div>


            {financeiroBloqueado && (
              <div className="financial-lock-warning">

                <strong>
                  Dados financeiros protegidos
                </strong>

                <span>
                  Esta despesa já foi
                  marcada como paga. Valor,
                  vencimento e status ficam
                  bloqueados para preservar
                  o histórico financeiro.
                </span>

              </div>
            )}


            <form
              className="saida-form"
              onSubmit={
                handleSalvarSaida
              }
            >

              <label>

                <span>
                  Descrição *
                </span>

                <input
                  value={
                    descricao
                  }
                  onChange={(
                    event
                  ) =>
                    setDescricao(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Compra de lona"
                  required
                />

              </label>


              <label>

                <span>
                  Para quem *
                </span>

                <input
                  value={
                    paraQuem
                  }
                  onChange={(
                    event
                  ) =>
                    setParaQuem(
                      event.target.value
                    )
                  }
                  placeholder="Fornecedor ou pessoa"
                  required
                />

              </label>


              <div className="form-row">

                <label>

                  <span>
                    Valor *
                  </span>

                  <input
                    value={
                      valor
                    }
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
                    Vencimento *
                  </span>

                  <input
                    type="date"
                    value={
                      dataVencimento
                    }
                    onChange={(
                      event
                    ) =>
                      setDataVencimento(
                        event.target.value
                      )
                    }
                    required
                    disabled={
                      financeiroBloqueado
                    }
                  />

                </label>

              </div>


              <label>

                <span>
                  Status
                </span>

                <select
                  value={
                    status
                  }
                  disabled={
                    financeiroBloqueado
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event
                        .target
                        .value as StatusSaida
                    )
                  }
                >

                  <option value="a_pagar">
                    A pagar
                  </option>

                  <option value="pago">
                    Pago
                  </option>

                </select>

              </label>


              <label>

                <span>
                  Categoria
                </span>

                <input
                  value={
                    categoria
                  }
                  onChange={(
                    event
                  ) =>
                    setCategoria(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Material, Energia, Serviço..."
                />

              </label>


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
                <div className="saida-error">
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
                    : saidaEditando
                    ? "Salvar alterações"
                    : "Salvar saída"}
                </button>

              </div>

            </form>

          </aside>

        </>
      )}

    </main>
  );
}