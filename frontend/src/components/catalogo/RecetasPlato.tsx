/**
 * Pestaña «Recetas de platos» del Catálogo (HU-46 · RF-54).
 *
 * A la izquierda, los platos (alimentos del catálogo) con el estado de su receta; a la derecha, el editor: la lista
 * de ingredientes de UN plato con la cantidad que consume una persona, su unidad (gramos, kilos, libras o arrobas)
 * y cómo se compra el ingrediente en el mercado. Guardar reemplaza la receta completa. Las recetas de ejemplo se
 * marcan como «datos de prueba» hasta que se guarda la receta real.
 */
import {
  ChefHat,
  LoaderCircle,
  Plus,
  Save,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatearNumero, normalizar } from "@/lib/formato";
import {
  claveNombre,
  erroresLinea,
  errorReceta,
  etiquetaUnidad,
  gramosDe,
  INGREDIENTES_MAX,
  leerCantidad,
  NOMBRE_MAX,
  UNIDADES_RECETA,
  type LineaEditable,
} from "@/lib/reglasReceta";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api";
import { recetasService } from "@/services/recetasService";
import type {
  IngredienteMaestro,
  RecetaPlato,
  ResumenReceta,
  UnidadReceta,
} from "@/types/recetas";

const lineaVacia = (): LineaEditable => ({
  id: crypto.randomUUID(),
  nombre: "",
  cantidad: "",
  unidadPorcion: "gramo",
  unidadCompra: "kilo",
});

const aLineas = (receta: RecetaPlato): LineaEditable[] =>
  receta.receta.length === 0
    ? [lineaVacia()]
    : receta.receta.map((r) => ({
        id: crypto.randomUUID(),
        nombre: r.ingrediente,
        cantidad: String(r.cantidad_porcion).replace(".", ","),
        unidadPorcion: r.unidad_porcion,
        unidadCompra: r.unidad_compra,
      }));

// Para saber si hay cambios sin guardar
const huella = (lineas: LineaEditable[]) =>
  JSON.stringify(
    lineas.map(({ nombre, cantidad, unidadPorcion, unidadCompra }) => [
      nombre.trim(),
      cantidad.trim(),
      unidadPorcion,
      unidadCompra,
    ]),
  );

export function RecetasPlato() {
  const [resumen, setResumen] = useState<ResumenReceta[]>([]);
  const [maestro, setMaestro] = useState<IngredienteMaestro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const [busqueda, setBusqueda] = useState("");
  const [platoId, setPlatoId] = useState<number | null>(null);
  const [receta, setReceta] = useState<RecetaPlato | null>(null);
  const [cargandoReceta, setCargandoReceta] = useState(false);
  const [lineas, setLineas] = useState<LineaEditable[]>([]);
  const [original, setOriginal] = useState("");
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{
    tipo: "success" | "error";
    texto: string;
  } | null>(null);

  // Lista de platos y maestro de ingredientes (patrón de SIGEV: promesas con bandera «activo»)
  useEffect(() => {
    let activo = true;
    Promise.all([recetasService.resumen(), recetasService.ingredientes()])
      .then(([platos, ingredientes]) => {
        if (!activo) return;
        setResumen(platos);
        setMaestro(ingredientes);
        setError(null);
        setCargando(false);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No fue posible cargar las recetas.",
        );
        setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [version]);

  // Receta del plato elegido
  useEffect(() => {
    if (platoId === null) return;
    let activo = true;
    recetasService
      .obtener(platoId)
      .then((r) => {
        if (!activo) return;
        const filas = aLineas(r);
        setReceta(r);
        setLineas(filas);
        setOriginal(huella(filas));
        setCargandoReceta(false);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setAviso({
          tipo: "error",
          texto:
            err instanceof ApiError
              ? err.message
              : "No fue posible cargar la receta del plato.",
        });
        setCargandoReceta(false);
      });
    return () => {
      activo = false;
    };
  }, [platoId, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  function elegir(id: number) {
    if (id === platoId) return;
    setAviso(null);
    setIntento(false);
    setReceta(null);
    setCargandoReceta(true);
    setPlatoId(id);
  }

  const termino = normalizar(busqueda.trim());
  const platosVisibles = resumen.filter(
    (p) => termino === "" || normalizar(p.plato).includes(termino),
  );
  const hayCambios = receta !== null && huella(lineas) !== original;
  const maestroPorClave = useMemo(
    () => new Map(maestro.map((m) => [claveNombre(m.nombre), m])),
    [maestro],
  );
  // Ingredientes que ya tenía ESTE plato guardados: para no contarlo como «otra receta» al bloquear la unidad de compra
  const delPlato = useMemo(
    () =>
      new Set((receta?.receta ?? []).map((r) => claveNombre(r.ingrediente))),
    [receta],
  );

  const cambiar = (id: string, cambios: Partial<LineaEditable>) => {
    setAviso(null);
    setLineas((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...cambios } : l)),
    );
  };

  // Al escribir un ingrediente que ya existe en el maestro se usa la unidad de compra que tiene
  function cambiarNombre(id: string, nombre: string) {
    const conocido = maestroPorClave.get(claveNombre(nombre));
    cambiar(
      id,
      conocido ? { nombre, unidadCompra: conocido.unidad_compra } : { nombre },
    );
  }

  // Si otras recetas ya compran el ingrediente de cierta forma, esa unidad no se cambia desde aquí (evita contradicciones)
  function bloqueo(
    linea: LineaEditable,
  ): { otras: number; unidad: UnidadReceta } | null {
    const m = maestroPorClave.get(claveNombre(linea.nombre));
    if (!m) return null;
    const otras = m.platos - (delPlato.has(claveNombre(m.nombre)) ? 1 : 0);
    return otras > 0 ? { otras, unidad: m.unidad_compra } : null;
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (platoId === null || guardando) return;
    setIntento(true);
    if (errorReceta(lineas)) return;
    setGuardando(true);
    setAviso(null);
    try {
      const guardada = await recetasService.guardar(
        platoId,
        lineas.map((l) => ({
          nombre_ingrediente: l.nombre.replace(/\s+/g, " ").trim(),
          unidad_compra: l.unidadCompra,
          cantidad_porcion: leerCantidad(l.cantidad) as number,
          unidad_porcion: l.unidadPorcion,
        })),
      );
      const filas = aLineas(guardada);
      setReceta(guardada);
      setLineas(filas);
      setOriginal(huella(filas));
      setIntento(false);
      setAviso({
        tipo: "success",
        texto: `Receta de «${guardada.plato}» guardada: ${guardada.receta.length} ${guardada.receta.length === 1 ? "ingrediente" : "ingredientes"}.`,
      });
      recargar();
    } catch (err) {
      setAviso({
        tipo: "error",
        texto:
          err instanceof ApiError
            ? err.message
            : "No fue posible guardar la receta.",
      });
    } finally {
      setGuardando(false);
    }
  }

  function descartar() {
    if (!receta) return;
    const filas = aLineas(receta);
    setLineas(filas);
    setOriginal(huella(filas));
    setIntento(false);
    setAviso(null);
  }

  if (cargando) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    );
  }
  if (error) return <Alert variant="error">{error}</Alert>;

  const mensajeGuardar = intento ? errorReceta(lineas) : undefined;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ChefHat aria-hidden="true" className="size-5 text-primary" />
            Platos
          </h2>
          <p className="text-[13.5px] text-subtle">
            Elige un plato para ver o registrar los ingredientes de su receta.
          </p>
        </div>
        {resumen.length === 0 ? (
          <p className="text-sm text-subtle">
            Todavía no hay platos (alimentos) en el catálogo.
          </p>
        ) : (
          <>
            <div className="relative">
              <label htmlFor="buscar-plato" className="sr-only">
                Buscar plato
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
              />
              <Input
                id="buscar-plato"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar plato por nombre"
                className="h-10 pl-9 text-[14px]"
              />
            </div>
            {platosVisibles.length === 0 && (
              <p className="text-sm text-subtle">
                Ningún plato coincide con la búsqueda.
              </p>
            )}
            <ul
              aria-label="Platos del catálogo"
              className="flex max-h-[34rem] flex-col gap-2 overflow-y-auto pr-1"
            >
              {platosVisibles.map((p) => (
                <li key={p.plato_id}>
                  <button
                    type="button"
                    onClick={() => elegir(p.plato_id)}
                    aria-pressed={p.plato_id === platoId}
                    className={cn(
                      "flex w-full cursor-pointer flex-col gap-1.5 rounded-[10px] border px-3.5 py-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                      p.plato_id === platoId
                        ? "border-primary bg-accent"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    <span className="text-[14.5px] font-bold">
                      {p.plato}
                      {!p.activo && (
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          (desactivado)
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-semibold",
                          p.ingredientes > 0
                            ? "bg-success-soft text-success-foreground"
                            : "bg-chip text-subtle",
                        )}
                      >
                        {p.ingredientes > 0
                          ? `${p.ingredientes} ${p.ingredientes === 1 ? "ingrediente" : "ingredientes"}`
                          : "Sin receta"}
                      </span>
                      {p.es_dato_prueba && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 font-semibold text-warning-foreground">
                          Datos de prueba
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card className="flex min-w-0 flex-col gap-5 p-6">
        {platoId === null ? (
          <p className="py-8 text-center text-sm text-subtle">
            Selecciona un plato de la lista para ver o editar su receta.
          </p>
        ) : cargandoReceta || !receta ? (
          aviso ? (
            <Alert variant={aviso.tipo}>{aviso.texto}</Alert>
          ) : (
            <Skeleton className="h-40 w-full" />
          )
        ) : (
          <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold">
                  Receta de «{receta.plato}»
                </h2>
                <p className="text-[13.5px] text-subtle">
                  Cantidad que consume <strong>una persona</strong> de cada
                  ingrediente y cómo se compra en el mercado.
                </p>
              </div>
              {hayCambios && (
                <span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground">
                  Cambios sin guardar
                </span>
              )}
            </div>

            {receta.es_dato_prueba && (
              <Alert variant="warning">
                Esta receta es un <strong>dato de prueba</strong> (un ejemplo).
                Cuando guardes la receta real de este plato dejará de serlo.
              </Alert>
            )}

            <ol
              aria-label="Ingredientes de la receta"
              className="flex flex-col gap-3"
            >
              {lineas.map((linea, i) => {
                const errores =
                  intento || linea.nombre !== "" || linea.cantidad !== ""
                    ? erroresLinea(linea, lineas)
                    : {};
                const mostrar = {
                  nombre:
                    (intento || linea.nombre.trim() !== "") && errores.nombre,
                  cantidad:
                    (intento || linea.cantidad.trim() !== "") &&
                    errores.cantidad,
                };
                const cantidad = leerCantidad(linea.cantidad);
                const bloqueada = bloqueo(linea);
                return (
                  <li
                    key={linea.id}
                    className="grid items-start gap-3 rounded-[12px] border border-border bg-background p-3.5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`rec-nombre-${i}`}
                        className="text-xs font-semibold text-muted-foreground md:flex md:min-h-8 md:items-end"
                      >
                        Ingrediente {i + 1}
                      </label>
                      <Input
                        id={`rec-nombre-${i}`}
                        value={linea.nombre}
                        list="ingredientes-conocidos"
                        maxLength={NOMBRE_MAX}
                        placeholder="Ej. Arroz"
                        onChange={(e) =>
                          cambiarNombre(linea.id, e.target.value)
                        }
                        aria-invalid={Boolean(mostrar.nombre)}
                        className="h-11"
                      />
                      {mostrar.nombre && (
                        <p className="text-[12.5px] font-medium text-destructive">
                          {mostrar.nombre}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`rec-cantidad-${i}`}
                        className="text-xs font-semibold text-muted-foreground md:flex md:min-h-8 md:items-end"
                      >
                        Cantidad por porción
                      </label>
                      <Input
                        id={`rec-cantidad-${i}`}
                        type="text"
                        inputMode="decimal"
                        maxLength={10}
                        value={linea.cantidad}
                        placeholder="Ej. 80"
                        onChange={(e) =>
                          cambiar(linea.id, { cantidad: e.target.value })
                        }
                        aria-invalid={Boolean(mostrar.cantidad)}
                        className="h-11"
                      />
                      {mostrar.cantidad ? (
                        <p className="text-[12.5px] font-medium text-destructive">
                          {mostrar.cantidad}
                        </p>
                      ) : (
                        cantidad !== null &&
                        cantidad > 0 &&
                        linea.unidadPorcion !== "gramo" && (
                          <p className="text-[12.5px] text-muted-foreground">
                            ={" "}
                            {formatearNumero(
                              gramosDe(cantidad, linea.unidadPorcion),
                            )}{" "}
                            g
                          </p>
                        )
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`rec-unidad-${i}`}
                        className="text-xs font-semibold text-muted-foreground md:flex md:min-h-8 md:items-end"
                      >
                        Unidad
                      </label>
                      <Select
                        id={`rec-unidad-${i}`}
                        value={linea.unidadPorcion}
                        onChange={(e) =>
                          cambiar(linea.id, {
                            unidadPorcion: e.target.value as UnidadReceta,
                          })
                        }
                        className="h-11"
                      >
                        {UNIDADES_RECETA.map((u) => (
                          <option key={u.valor} value={u.valor}>
                            {u.etiqueta}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`rec-compra-${i}`}
                        className="text-xs font-semibold text-muted-foreground md:flex md:min-h-8 md:items-end"
                      >
                        Se compra por
                      </label>
                      <Select
                        id={`rec-compra-${i}`}
                        value={linea.unidadCompra}
                        disabled={Boolean(bloqueada)}
                        onChange={(e) =>
                          cambiar(linea.id, {
                            unidadCompra: e.target.value as UnidadReceta,
                          })
                        }
                        className="h-11"
                      >
                        {UNIDADES_RECETA.map((u) => (
                          <option key={u.valor} value={u.valor}>
                            {u.etiqueta}
                          </option>
                        ))}
                      </Select>
                      {bloqueada && (
                        <p className="text-[12.5px] text-muted-foreground">
                          Ya se compra por {etiquetaUnidad(bloqueada.unidad)} en{" "}
                          {bloqueada.otras === 1
                            ? "otra receta"
                            : `${bloqueada.otras} recetas más`}
                          .
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 justify-self-end text-muted-foreground md:mt-[42px] md:justify-self-auto"
                      disabled={lineas.length === 1}
                      onClick={() =>
                        setLineas((prev) =>
                          prev.filter((l) => l.id !== linea.id),
                        )
                      }
                      aria-label={`Quitar el ingrediente ${i + 1}${linea.nombre.trim() ? `: ${linea.nombre.trim()}` : ""}`}
                    >
                      <Trash2 className="!size-4" />
                    </Button>
                  </li>
                );
              })}
            </ol>

            <datalist id="ingredientes-conocidos">
              {maestro.map((m) => (
                <option key={m.id} value={m.nombre} />
              ))}
            </datalist>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={lineas.length >= INGREDIENTES_MAX}
                onClick={() => setLineas((prev) => [...prev, lineaVacia()])}
              >
                <Plus aria-hidden="true" />
                Agregar ingrediente
              </Button>
              <span className="text-[12.5px] text-muted-foreground">
                {lineas.length} de {INGREDIENTES_MAX}
              </span>
            </div>

            {mensajeGuardar && <Alert variant="error">{mensajeGuardar}</Alert>}
            {aviso && <Alert variant={aviso.tipo}>{aviso.texto}</Alert>}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={guardando}>
                {guardando ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Guardar receta
              </Button>
              {hayCambios && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={descartar}
                  disabled={guardando}
                >
                  <Undo2 aria-hidden="true" />
                  Descartar cambios
                </Button>
              )}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
